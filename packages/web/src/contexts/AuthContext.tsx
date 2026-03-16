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
import { useAppKitAccount, useAppKitProvider, useDisconnect } from '@reown/appkit/react';
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
    
    // AppKit hooks (fallback)
    const { address: appKitAddress, isConnected: appKitIsConnected } = useAppKitAccount();
    const { walletProvider } = useAppKitProvider('eip155');
    const { disconnect: appKitDisconnect } = useDisconnect();
    
    // Privy logout
    const { logout: privyLogout } = usePrivy();

    // Use Privy address if available, otherwise fall back to AppKit
    const address = privyUser?.wallet?.address || appKitAddress;
    const isConnected = !!address;
    
    // Unified disconnect - handles both Privy (mobile) and AppKit (desktop)
    const disconnect = useCallback(async () => {
        // Disconnect from AppKit
        try {
            await appKitDisconnect();
        } catch (e) {
            console.log('[AuthContext] AppKit disconnect error:', e);
        }
        // Disconnect from Privy (if logged in)
        try {
            await privyLogout();
        } catch (e) {
            console.log('[AuthContext] Privy logout error:', e);
        }
    }, [appKitDisconnect, privyLogout]);

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
    useEffect(() => {
        const authenticateWallet = async () => {
            // Only proceed if:
            // 1. Wallet is connected and has an address
            // 2. No JWT token exists (not already authenticated)
            // 3. Provider is available
            // 4. We haven't already attempted authentication
            if (!isConnected || !address || !walletProvider || walletAuthAttempted.current) return;

            const existingToken = getAuthToken();
            if (existingToken) return; // Already authenticated

            // Mark as attempted to prevent loops
            walletAuthAttempted.current = true;

            try {
                setLoading(true);

                const provider = new ethers.BrowserProvider(walletProvider as any);
                const signer = await provider.getSigner();
                const walletAddress = await signer.getAddress();

                // Create message for signing
                const timestamp = Date.now();
                const message = `FundTracer Wallet Login\nAddress: ${walletAddress}\nTimestamp: ${timestamp}`;

                // Sign the message
                const signature = await signer.signMessage(message);

                // Call wallet login endpoint
                const response = await apiLoginWithWallet(walletAddress, signature, message);

                // Set auth token and user state
                setTokenWithExpiry(response.token, true);
                setUser({
                    uid: response.user.address,
                    walletAddress: walletAddress,
                });
                const userTier = response.user.tier || 'free';
                const tierLimit = userTier === 'max' ? 'unlimited' : userTier === 'pro' ? 25 : 7;
                const profilePic = response.user.profilePicture || getStoredProfilePicture();
                // Save profile picture to localStorage as backup
                if (profilePic) {
                    saveProfilePicture(profilePic);
                }
                setProfile({
                    uid: response.user.address,
                    hasCustomApiKey: false,
                    usage: { today: 0, limit: tierLimit, remaining: tierLimit },
                    walletAddress: walletAddress,
                    isVerified: response.user.isVerified,
                    tier: userTier,
                    authProvider: 'wallet',
                    profilePicture: profilePic,
                    photoURL: response.user.photoURL || null
                });
                setIsAuthenticated(true);

                notify.success('Wallet authenticated successfully!');
            } catch (error: any) {
                console.error('[AuthContext] Wallet auto-auth error:', error);
                // Don't show error notification on auto-auth failure
                // This prevents annoying popups on every connection
                // User can manually authenticate if needed
            } finally {
                setLoading(false);
            }
        };
 
        authenticateWallet();
    }, [isConnected, address, walletProvider, notify, setTokenWithExpiry]);

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

    // Connect wallet
    const connectWallet = useCallback(async () => {
        if (!user || !walletProvider || !address) {
            notify.error('Please connect a wallet first');
            return;
        }

        setLoading(true);

        try {
            const provider = new ethers.BrowserProvider(walletProvider as any);
            const signer = await provider.getSigner();
            const walletAddress = await signer.getAddress();

            const timestamp = Date.now();
            const message = `Link wallet to FundTracer account\nTimestamp: ${timestamp}`;
            const signature = await signer.signMessage(message);

            const response = await linkWalletToAccount(
                user.uid,
                walletAddress,
                signature,
                message
            );

            setWallet({
                address: walletAddress,
                isConnected: true
            });

            setProfile(prev => prev ? {
                ...prev,
                walletAddress: walletAddress,
                isVerified: response.isVerified
            } : null);

            notify.success('Wallet connected successfully!');
        } catch (error: any) {
            console.error('[AuthContext] Connect wallet error:', error);
            
            // Detect wallet provider conflicts
            const errorMessage = error.message || '';
            if (errorMessage.includes('ethereum') && errorMessage.includes('read-only')) {
                notify.error('Wallet conflict: Please disable other wallet extensions (Coinbase, Phantom) and use only MetaMask');
            } else if (errorMessage.includes('user rejected') || errorMessage.includes('User rejected')) {
                notify.error('Connection cancelled');
            } else if (errorMessage.includes('already pending')) {
                notify.error('Check your wallet - connection request pending');
            } else {
                notify.error(errorMessage || 'Failed to connect wallet');
            }
        } finally {
            setLoading(false);
        }
    }, [user, walletProvider, address, notify]);

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

    // Get Signer
    const getSigner = useCallback(async (): Promise<ethers.Signer> => {
        if (!walletProvider || !address) {
            throw new Error('Wallet not connected');
        }

        const provider = new ethers.BrowserProvider(walletProvider as any);
        return provider.getSigner();
    }, [walletProvider, address]);

    // Manual wallet login (for retry or explicit auth)
    const loginWithWallet = useCallback(async () => {
        if (!isConnected || !address || !walletProvider) {
            notify.error('Please connect a wallet first');
            throw new Error('Wallet not connected');
        }

        if (operationInProgress.current) return;
        operationInProgress.current = true;
        setLoading(true);

        try {
            const provider = new ethers.BrowserProvider(walletProvider as any);
            const signer = await provider.getSigner();
            const walletAddress = await signer.getAddress();

            const timestamp = Date.now();
            const message = `FundTracer Wallet Login\nAddress: ${walletAddress}\nTimestamp: ${timestamp}`;
            const signature = await signer.signMessage(message);

            const response = await apiLoginWithWallet(walletAddress, signature, message);

            setTokenWithExpiry(response.token, true);
            setUser({
                uid: response.user.address,
                walletAddress: walletAddress,
            });
            const userTier = response.user.tier || 'free';
            const tierLimit = userTier === 'max' ? 'unlimited' : userTier === 'pro' ? 25 : 7;
            setProfile({
                uid: response.user.address,
                hasCustomApiKey: false,
                usage: { today: 0, limit: tierLimit, remaining: tierLimit },
                walletAddress: walletAddress,
                isVerified: response.user.isVerified,
                tier: userTier,
                authProvider: 'wallet',
                displayName: response.user.displayName || ''
            });
            setIsAuthenticated(true);

            notify.success('Wallet authenticated successfully!');
        } catch (error: any) {
            console.error('[AuthContext] Manual wallet login error:', error);
            notify.error(error.message || 'Wallet authentication failed');
            throw error;
        } finally {
            setLoading(false);
            operationInProgress.current = false;
        }
    }, [isConnected, address, walletProvider, notify, setTokenWithExpiry]);

    // OAuth login with Google - uses backend redirect
    const loginWithGoogle = useCallback(async () => {
        if (operationInProgress.current) return;
        operationInProgress.current = true;
        setLoading(true);

        try {
            // Redirect to backend OAuth
            window.location.href = '/api/auth/google/start';
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
