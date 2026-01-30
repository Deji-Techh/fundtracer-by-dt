import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
    useCallback,
    useRef
} from 'react';
import { useAppKitAccount, useAppKitProvider, useDisconnect } from '@reown/appkit/react';
import { ethers } from 'ethers';
import {
    getProfile,
    loginWithGoogle,
    linkWalletToGoogle,
    unlinkWalletFromGoogle,
    removeAuthToken,
    getAuthToken,
    UserProfile
} from '../api';
import { useNotify } from './ToastContext';
import { signInWithGoogle, signOutFromGoogle } from '../firebase';

const AUTH_PENDING_KEY = 'fundtracer_auth_pending';

// Google User type
interface GoogleUser {
    uid: string;
    email: string;
    displayName: string | null;
    photoURL: string | null;
}

// Wallet type
interface WalletInfo {
    address: string;
    isConnected: boolean;
}

interface AuthContextType {
    // Google Auth
    user: GoogleUser | null;
    isAuthenticated: boolean;
    
    // Wallet
    wallet: WalletInfo | null;
    isWalletConnected: boolean;
    
    // Profile
    profile: UserProfile | null;
    
    // State
    loading: boolean;
    
    // Actions
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    linkWallet: () => Promise<void>;
    unlinkWallet: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    getSigner: () => Promise<ethers.Signer>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    // Google Auth State
    const [user, setUser] = useState<GoogleUser | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    
    // Wallet State
    const [wallet, setWallet] = useState<WalletInfo | null>(null);
    
    // Profile
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    
    const signInInProgress = useRef(false);
    const notify = useNotify();

    // AppKit hooks
    const { address, isConnected } = useAppKitAccount();
    const { walletProvider } = useAppKitProvider('eip155');
    const { disconnect } = useDisconnect();

    // Check existing auth on mount
    useEffect(() => {
        const initAuth = async () => {
            const token = getAuthToken();
            if (token) {
                try {
                    const userProfile = await getProfile();
                    setProfile(userProfile);
                    
                    // Restore user state from profile
                    if (userProfile.uid) {
                        setUser({
                            uid: userProfile.uid,
                            email: userProfile.email || '',
                            displayName: userProfile.name || null,
                            photoURL: userProfile.profilePicture || null
                        });
                        setIsAuthenticated(true);
                    }
                    
                    // Restore wallet state
                    if (userProfile.walletAddress) {
                        setWallet({
                            address: userProfile.walletAddress,
                            isConnected: true
                        });
                    }
                } catch (error) {
                    console.error('Auth init error:', error);
                    removeAuthToken();
                }
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    // Update wallet state when AppKit connection changes
    useEffect(() => {
        if (isConnected && address) {
            setWallet({
                address: address,
                isConnected: true
            });
        } else if (!isConnected && wallet?.address) {
            // Wallet disconnected from AppKit
            setWallet(null);
        }
    }, [isConnected, address, wallet?.address]);

    // Google Sign-In
    const signInWithGoogle = useCallback(async () => {
        if (signInInProgress.current) return;
        signInInProgress.current = true;
        setLoading(true);

        try {
            // Sign in with Firebase Google Auth
            const googleUser = await signInWithGoogle();
            
            if (!googleUser) {
                throw new Error('Google sign-in failed');
            }

            // Get Firebase ID token
            const idToken = await googleUser.getIdToken();

            // Login to backend
            const loginResponse = await loginWithGoogle(idToken);

            // Set user state
            setUser({
                uid: loginResponse.user.uid,
                email: loginResponse.user.email,
                displayName: loginResponse.user.displayName,
                photoURL: loginResponse.user.photoURL
            });
            setIsAuthenticated(true);

            // Set profile
            setProfile({
                ...loginResponse.user,
                uid: loginResponse.user.uid,
                email: loginResponse.user.email,
                name: loginResponse.user.displayName,
                isVerified: loginResponse.user.isVerified,
                tier: loginResponse.user.tier,
                walletAddress: loginResponse.user.walletAddress
            });

            // If user already has a linked wallet, set it
            if (loginResponse.user.walletAddress) {
                setWallet({
                    address: loginResponse.user.walletAddress,
                    isConnected: true
                });
            }

            notify.success('Successfully signed in with Google!');
            sessionStorage.removeItem(AUTH_PENDING_KEY);
        } catch (error: any) {
            console.error('Google sign-in error:', error);
            
            const isUserRejection =
                error.code === 'auth/popup-closed-by-user' ||
                error.code === 'auth/cancelled-popup-request' ||
                error.message?.includes('cancelled') ||
                error.message?.includes('closed');

            if (!isUserRejection) {
                notify.error(`Sign-in failed: ${error.message || 'Unknown error'}`);
            }

            sessionStorage.removeItem(AUTH_PENDING_KEY);
        } finally {
            setLoading(false);
            signInInProgress.current = false;
        }
    }, [notify]);

    // Link Wallet to Google Account
    const linkWallet = useCallback(async () => {
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

            // Get fresh Google ID token
            const googleUser = await signInWithGoogle();
            if (!googleUser) {
                throw new Error('Google authentication required');
            }
            const idToken = await googleUser.getIdToken();

            // Link wallet to Google account on backend
            const linkResponse = await linkWalletToGoogle(
                idToken,
                walletAddress,
                signature,
                message
            );

            // Update wallet state
            setWallet({
                address: walletAddress,
                isConnected: true
            });

            // Update profile with new wallet info
            setProfile(prev => prev ? {
                ...prev,
                walletAddress: walletAddress,
                isVerified: linkResponse.isVerified
            } : null);

            notify.success('Wallet linked successfully!');
        } catch (error: any) {
            console.error('Link wallet error:', error);
            
            const isUserRejection =
                error.code === 4001 ||
                error.code === 'ACTION_REJECTED' ||
                error.message?.includes('rejected') ||
                error.message?.includes('cancelled');

            if (!isUserRejection) {
                notify.error(`Failed to link wallet: ${error.message || 'Unknown error'}`);
            }
        } finally {
            setLoading(false);
        }
    }, [user, walletProvider, address, notify]);

    // Unlink Wallet
    const unlinkWallet = useCallback(async () => {
        if (!user) {
            notify.error('Not authenticated');
            return;
        }

        setLoading(true);

        try {
            // Disconnect from AppKit
            disconnect();

            // Get fresh Google ID token
            const googleUser = await signInWithGoogle();
            if (!googleUser) {
                throw new Error('Google authentication required');
            }
            const idToken = await googleUser.getIdToken();

            // Unlink wallet on backend
            await unlinkWalletFromGoogle(idToken);

            // Clear wallet state
            setWallet(null);

            // Update profile
            setProfile(prev => prev ? {
                ...prev,
                walletAddress: null,
                isVerified: false
            } : null);

            notify.success('Wallet unlinked successfully');
        } catch (error: any) {
            console.error('Unlink wallet error:', error);
            notify.error(`Failed to unlink wallet: ${error.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    }, [user, disconnect, notify]);

    // Sign Out
    const signOut = useCallback(async () => {
        // Clear all auth state
        removeAuthToken();
        setUser(null);
        setIsAuthenticated(false);
        setProfile(null);
        setWallet(null);
        signInInProgress.current = false;
        sessionStorage.removeItem(AUTH_PENDING_KEY);

        // Sign out from Firebase
        await signOutFromGoogle();

        // Disconnect wallet
        try {
            disconnect();

            if (typeof window !== 'undefined') {
                Object.keys(localStorage).forEach(key => {
                    if (
                        key.startsWith('wc@2:') ||
                        key.startsWith('wagmi') ||
                        key.includes('walletconnect')
                    ) {
                        localStorage.removeItem(key);
                    }
                });
            }
        } catch { }

        notify.success('Signed out successfully');
    }, [disconnect, notify]);

    // Refresh Profile
    const refreshProfile = useCallback(async () => {
        if (!isAuthenticated) return;
        
        try {
            const userProfile = await getProfile();
            setProfile(userProfile);
            
            // Update wallet state if changed
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

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated,
            wallet,
            isWalletConnected: wallet?.isConnected || false,
            profile,
            loading,
            signInWithGoogle,
            signOut,
            linkWallet,
            unlinkWallet,
            refreshProfile,
            getSigner
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
