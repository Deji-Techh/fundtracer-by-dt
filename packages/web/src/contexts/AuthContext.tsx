import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
    useCallback,
    useRef
} from 'react';
import { useNavigate } from 'react-router-dom';
import { usePrivy } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import {
    getProfile,
    removeAuthToken,
    getAuthToken,
    setAuthToken,
    loginWithWallet as apiLoginWithWallet,
    loginWithGoogle as apiLoginWithGoogle,
    linkWalletToAccount,
    unlinkWalletFromAccount,
    UserProfile
} from '../api';
import { auth as firebaseAuth } from '../firebase';
import { useNotify } from './ToastContext';
import { syncHistoryWithServer } from '../utils/history';

const TOKEN_EXPIRY_KEY = 'fundtracer_token_expiry';
const PROFILE_PICTURE_KEY = 'fundtracer_profile_picture';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Helper to get profile picture from localStorage
const getStoredProfilePicture = (): string | null => {
    try {
        return localStorage.getItem(PROFILE_PICTURE_KEY);
    } catch {
        return null;
    }
};

// Helper to save profile picture to localStorage
const saveProfilePicture = (picture: string | null): void => {
    try {
        if (picture) {
            localStorage.setItem(PROFILE_PICTURE_KEY, picture);
        } else {
            localStorage.removeItem(PROFILE_PICTURE_KEY);
        }
    } catch {
        // Ignore storage errors
    }
};

interface AuthUser {
    uid: string;
    walletAddress: string;
}

interface WalletInfo {
    address: string;
    isConnected: boolean;
}

interface AuthContextType {
    user: AuthUser | null;
    profile: UserProfile | null;
    wallet: WalletInfo | null;
    isAuthenticated: boolean;
    isWalletConnected: boolean;
    loading: boolean;
    signOut: () => Promise<void>;
    signOutAccount: () => Promise<void>;
    connectWallet: () => Promise<void>;
    unlinkWallet: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    getSigner: () => Promise<ethers.Signer>;
    loginWithWallet: () => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    setTokenFromExternal: (token: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [wallet, setWallet] = useState<WalletInfo | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    const operationInProgress = useRef(false);
    const walletAuthAttempted = useRef(false);
    const welcomeToastShown = useRef(false);
    const notify = useNotify();
    const navigate = useNavigate();

    // Privy hooks
    const { user: privyUser } = usePrivy();
    
    // Privy logout
    const { logout: privyLogout } = usePrivy();

    // Use Privy address 
    const address = privyUser?.wallet?.address || null;
    const isConnected = !!address;
    
    // Disconnect from Privy
    const disconnect = useCallback(async () => {
        try {
            await privyLogout();
        } catch (e) {
            // Silent fail
        }
    }, [privyLogout]);

    const setTokenWithExpiry = useCallback((token: string, keepSignedIn: boolean) => {
        setAuthToken(token);
        if (keepSignedIn) {
            localStorage.setItem(TOKEN_EXPIRY_KEY, (Date.now() + THIRTY_DAYS_MS).toString());
        } else {
            localStorage.removeItem(TOKEN_EXPIRY_KEY);
        }
    }, []);

    // Set token from external OAuth (backend redirects with token in URL)
    const setTokenFromExternal = useCallback((token: string) => {
        setTokenWithExpiry(token, true);
        // Fetch user profile with the new token
        getProfile().then(userProfile => {
            const profilePic = userProfile.profilePicture || getStoredProfilePicture();
            setProfile({ ...userProfile, profilePicture: profilePic, isVerified: userProfile.isVerified ?? false });
            if (userProfile.uid) {
                setUser({
                    uid: userProfile.uid,
                    walletAddress: userProfile.walletAddress || '',
                });
                setIsAuthenticated(true);
                syncHistoryWithServer();
                if (userProfile.walletAddress) {
                    setWallet({
                        address: userProfile.walletAddress,
                        isConnected: true
                    });
                }
                // Only show welcome toast once per session
                if (!welcomeToastShown.current) {
                    welcomeToastShown.current = true;
                    notify.success('Welcome to FundTracer!');
                }
            }
        }).catch(err => {
            console.error('[AuthContext] Failed to fetch profile:', err);
            notify.error('Failed to load profile');
        });
    }, [setTokenWithExpiry, notify]);

    const clearAuthData = useCallback(() => {
        // Clear ALL FundTracer localStorage data
        const keysToRemove = [
            'fundtracer_token',
            TOKEN_EXPIRY_KEY,
            'fundtracer_search_history',
            'fundtracer_sybil_usage',
            'fundtracer_sybil_payment',
            'fundtracer_history_last_sync',
            'fundtracer_address_book',
        ];
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Also remove any keys starting with fundtracer_
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('fundtracer_')) {
                localStorage.removeItem(key);
            }
        });
        
        setUser(null);
        setProfile(null);
        setIsAuthenticated(false);
        setWallet(null);
    }, []);

    // Check auth on mount
    useEffect(() => {
        const initAuth = async () => {
            const token = getAuthToken();
            if (token) {
                try {
                    const userProfile = await getProfile();
                    // Use server profile picture or fallback to localStorage
                    const profilePic = userProfile.profilePicture || getStoredProfilePicture();
                    setProfile({ ...userProfile, profilePicture: profilePic, isVerified: userProfile.isVerified ?? false });
                    
                    if (userProfile.uid) {
                        setUser({
                            uid: userProfile.uid,
                            walletAddress: userProfile.walletAddress || '',
                        });
                        setIsAuthenticated(true);
                        syncHistoryWithServer();
                        
                        if (userProfile.walletAddress) {
                            setWallet({
                                address: userProfile.walletAddress,
                                isConnected: true
                            });
                        }
                    } else {
                        // No user data returned, clear auth
                        clearAuthData();
                    }
                } catch (error: any) {
                    console.error('Auth init error:', error);
                    // Clear auth if token is invalid/expired
                    // Check both the HTTP status (added by apiRequest) and known error strings
                    const status = error.status;
                    const msg = error.message || '';
                    if (
                        status === 401 ||
                        msg.includes('Invalid authentication token') ||
                        msg.includes('Token expired') ||
                        msg.includes('Unauthorized') ||
                        msg.includes('Not authenticated')
                    ) {
                        clearAuthData();
                        // Don't notify on initial load — user will see the sign-in UI
                    }
                }
            }
            setLoading(false);
        };
        initAuth();
    }, [clearAuthData]);

    // Update wallet state when AppKit connection changes
    useEffect(() => {
        if (isConnected && address) {
            setWallet({
                address: address,
                isConnected: true
            });
        } else if (!isConnected && wallet?.address) {
            setWallet(null);
            // Reset auth attempt flag when wallet disconnects
            walletAuthAttempted.current = false;
        }
    }, [isConnected, address, wallet?.address]);

    // Auto-authenticate wallet when connected but not authenticated
    // Note: Privy handles wallet auth internally via its login flow
    // This effect is disabled for now as we rely on Privy's built-in auth
    useEffect(() => {
        // Wallet authentication is now handled by Privy
        // This effect kept for potential future implementation
    }, [isConnected, address]);

    // Sign out - disconnects wallet and clears all local data
    const signOut = useCallback(async () => {
        try {
            await disconnect();
            clearAuthData();
            // Reset auth attempt flag so auto-auth works on next connection
            walletAuthAttempted.current = false;
            notify.success('Signed out successfully');
        } catch (error) {
            console.error('Sign out error:', error);
        }
    }, [disconnect, clearAuthData, notify]);

    // Sign out account - signs out of Google/X and returns to landing page
    const signOutAccount = useCallback(async () => {
        try {
            // Sign out from Firebase (Google/X)
            if (firebaseAuth) {
                await firebaseAuth.signOut();
            }
            // Clear all auth data (includes disconnect)
            await disconnect();
            clearAuthData();
            walletAuthAttempted.current = false;
            notify.success('Signed out of account');
            // Navigate to landing page
            navigate('/');
        } catch (error) {
            console.error('Sign out account error:', error);
            // Still clear local data even if Firebase signout fails
            await disconnect();
            clearAuthData();
            walletAuthAttempted.current = false;
            navigate('/');
        }
    }, [disconnect, clearAuthData, notify, navigate]);

    // Unlink wallet
    const unlinkWallet = useCallback(async () => {
        if (!user) {
            notify.error('Not authenticated');
            return;
        }

        setLoading(true);

        try {
            await disconnect();
            await unlinkWalletFromAccount(user.uid);

            setWallet(null);

            setProfile(prev => prev ? {
                ...prev,
                walletAddress: null,
                isVerified: false
            } : null);

            notify.success('Wallet unlinked successfully');
        } catch (error: any) {
            console.error('[AuthContext] Unlink wallet error:', error);
            notify.error(error.message || 'Failed to unlink wallet');
        } finally {
            setLoading(false);
        }
    }, [user, disconnect, notify]);

    // Connect wallet - using Privy
    const connectWallet = useCallback(async () => {
        // Wallet connection is handled via Privy's login flow
        notify.info('Please use the Connect Wallet button');
    }, [notify]);

    // Refresh profile
    const refreshProfile = useCallback(async () => {
        if (!isAuthenticated) return;
        
        try {
            const userProfile = await getProfile();
            // Save profile picture to localStorage as backup
            if (userProfile.profilePicture) {
                saveProfilePicture(userProfile.profilePicture);
            }
            setProfile(userProfile);
            
            if (userProfile.walletAddress !== wallet?.address) {
                if (userProfile.walletAddress) {
                    setWallet({
                        address: userProfile.walletAddress,
                        isConnected: true
                    });
                } else {
                    setWallet(null);
                }
            }
        } catch (error) {
            console.error('Profile refresh error:', error);
        }
    }, [isAuthenticated, wallet?.address]);

    // Get Signer - using Privy
    const getSigner = useCallback(async () => {
        // With Privy, signers are handled internally via the wallet
        // This is a placeholder for API compatibility
        throw new Error('Please use Privy to authenticate');
    }, [address]);

    // Manual wallet login (for retry or explicit auth)
    const loginWithWallet = useCallback(async () => {
        // Wallet auth is now handled by Privy login
        notify.info('Please use the Connect Wallet button to authenticate');
    }, [notify]);

    // OAuth login with Google - uses backend redirect
    const loginWithGoogle = useCallback(async () => {
        if (operationInProgress.current) return;
        operationInProgress.current = true;
        setLoading(true);

        try {
            // Check for stored referral ref
            const refParam = localStorage.getItem('referral_ref');
            const oauthUrl = refParam 
                ? `/api/auth/google/start?ref=${encodeURIComponent(refParam)}`
                : '/api/auth/google/start';
            // Redirect to backend OAuth
            window.location.href = oauthUrl;
        } catch (error: any) {
            console.error('[AuthContext] Google login error:', error);
            notify.error(error.message || 'Google sign in failed');
            setLoading(false);
            operationInProgress.current = false;
            throw error;
        }
    }, [notify]);

    return (
        <AuthContext.Provider value={{
            user,
            profile,
            wallet,
            isAuthenticated,
            isWalletConnected: wallet?.isConnected || false,
            loading,
            signOut,
            signOutAccount,
            connectWallet,
            unlinkWallet,
            refreshProfile,
            getSigner,
            loginWithWallet,
            loginWithGoogle,
            setTokenFromExternal
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
