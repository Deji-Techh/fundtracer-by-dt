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
    removeAuthToken,
    getAuthToken,
    setAuthToken,
    UserProfile
} from '../api';
import { useNotify } from './ToastContext';
import {
    registerWithEmail as firebaseRegister,
    signInWithEmail as firebaseSignIn,
    sendVerificationEmail as firebaseSendVerification,
    logOut as firebaseLogout,
    getCurrentUser,
    getIdToken,
    onAuthChange,
    isEmailVerified
} from '../firebase';

const AUTH_PENDING_KEY = 'fundtracer_auth_pending';
const TOKEN_EXPIRY_KEY = 'fundtracer_token_expiry';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Auth User type
interface AuthUser {
    uid: string;
    email: string;
    emailVerified: boolean;
    displayName: string | null;
    username?: string;
    photoURL: string | null;
}

// Wallet type
interface WalletInfo {
    address: string;
    isConnected: boolean;
}

interface AuthContextType {
    // Auth
    user: AuthUser | null;
    isAuthenticated: boolean;
    isEmailVerified: boolean;
    
    // Wallet
    wallet: WalletInfo | null;
    isWalletConnected: boolean;
    
    // Profile
    profile: UserProfile | null;
    
    // State
    loading: boolean;
    
    // Actions
    registerWithEmail: (email: string, password: string) => Promise<void>;
    sendEmailVerification: () => Promise<void>;
    completeRegistration: (uid: string, username: string, password: string, keepSignedIn: boolean) => Promise<void>;
    loginWithUsername: (username: string, password: string, keepSignedIn: boolean) => Promise<void>;
    connectWallet: () => Promise<void>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    getSigner: () => Promise<ethers.Signer>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    // Auth State
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isEmailVerifiedState, setIsEmailVerifiedState] = useState(false);
    
    // Wallet State
    const [wallet, setWallet] = useState<WalletInfo | null>(null);
    
    // Profile
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    
    const operationInProgress = useRef(false);
    const notify = useNotify();

    // AppKit hooks
    const { address, isConnected } = useAppKitAccount();
    const { walletProvider } = useAppKitProvider('eip155');
    const { disconnect } = useDisconnect();

    // Check token expiry
    const isTokenValid = useCallback(() => {
        const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
        if (!expiry) return true; // No expiry set means session-only (already expired on page close)
        return Date.now() < parseInt(expiry, 10);
    }, []);

    // Set token with expiry
    const setTokenWithExpiry = useCallback((token: string, keepSignedIn: boolean) => {
        setAuthToken(token);
        if (keepSignedIn) {
            localStorage.setItem(TOKEN_EXPIRY_KEY, (Date.now() + THIRTY_DAYS_MS).toString());
        } else {
            localStorage.removeItem(TOKEN_EXPIRY_KEY);
        }
    }, []);

    // Clear all auth data
    const clearAuthData = useCallback(() => {
        removeAuthToken();
        localStorage.removeItem(TOKEN_EXPIRY_KEY);
        sessionStorage.removeItem(AUTH_PENDING_KEY);
    }, []);

    // Initialize auth on mount
    useEffect(() => {
        const initAuth = async () => {
            const token = getAuthToken();
            
            // Check if token is expired
            if (token && !isTokenValid()) {
                clearAuthData();
                setLoading(false);
                return;
            }
            
            if (token) {
                try {
                    const userProfile = await getProfile();
                    setProfile(userProfile);
                    
                    // Restore user state from profile
                    if (userProfile.uid) {
                        setUser({
                            uid: userProfile.uid,
                            email: userProfile.email || '',
                            emailVerified: userProfile.isVerified || false,
                            displayName: userProfile.displayName || userProfile.name || null,
                            username: userProfile.username,
                            photoURL: userProfile.profilePicture || userProfile.photoURL || null
                        });
                        setIsAuthenticated(true);
                        setIsEmailVerifiedState(userProfile.isVerified || false);
                    }
                    
                    // Restore wallet state from profile
                    if (userProfile.walletAddress) {
                        setWallet({
                            address: userProfile.walletAddress,
                            isConnected: true
                        });
                    }
                } catch (error) {
                    console.error('Auth init error:', error);
                    clearAuthData();
                }
            }
            setLoading(false);
        };
        initAuth();
    }, [clearAuthData, isTokenValid]);

    // Listen to Firebase auth state changes
    useEffect(() => {
        const unsubscribe = onAuthChange((firebaseUser) => {
            if (firebaseUser) {
                // Update email verification status
                setIsEmailVerifiedState(firebaseUser.emailVerified);
                
                // Update user state if we have a profile
                setUser(prev => prev ? {
                    ...prev,
                    emailVerified: firebaseUser.emailVerified
                } : null);
            }
        });
        
        return () => unsubscribe();
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

    // Register with email
    const registerWithEmail = useCallback(async (email: string, password: string) => {
        if (operationInProgress.current) return;
        operationInProgress.current = true;
        setLoading(true);

        try {
            // Create user in Firebase
            const firebaseUser = await firebaseRegister(email, password);
            
            if (!firebaseUser) {
                throw new Error('Registration failed');
            }

            // Send verification email
            await firebaseSendVerification(firebaseUser);

            // Set temporary user state (not fully registered yet)
            setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                emailVerified: false,
                displayName: null,
                username: undefined,
                photoURL: null
            });
            
            setIsEmailVerifiedState(false);

            notify.success('Registration initiated! Please check your email to verify.');
            sessionStorage.setItem(AUTH_PENDING_KEY, 'verification_pending');
        } catch (error: any) {
            console.error('[AuthContext] Registration error:', error);
            notify.error(`Registration failed: ${error.message || 'Unknown error'}`);
            sessionStorage.removeItem(AUTH_PENDING_KEY);
        } finally {
            setLoading(false);
            operationInProgress.current = false;
        }
    }, [notify]);

    // Send email verification
    const sendEmailVerification = useCallback(async () => {
        const currentUser = getCurrentUser();
        if (!currentUser) {
            notify.error('No user to verify');
            return;
        }

        try {
            await firebaseSendVerification(currentUser);
            notify.success('Verification email sent! Please check your inbox.');
        } catch (error: any) {
            console.error('[AuthContext] Send verification error:', error);
            notify.error(`Failed to send verification: ${error.message || 'Unknown error'}`);
        }
    }, [notify]);

    // Complete registration (after email verification)
    const completeRegistration = useCallback(async (
        uid: string,
        username: string,
        password: string,
        keepSignedIn: boolean
    ) => {
        if (operationInProgress.current) return;
        operationInProgress.current = true;
        setLoading(true);

        try {
            // Get Firebase ID token
            const idToken = await getIdToken();
            if (!idToken) {
                throw new Error('Not authenticated');
            }

            // Call backend to complete registration
            const response = await fetch('/api/auth/complete-registration', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    uid,
                    username,
                    password,
                    keepSignedIn
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to complete registration');
            }

            const data = await response.json();

            // Store token with expiry
            setTokenWithExpiry(data.token, keepSignedIn);

            // Set user state
            setUser({
                uid: data.user.uid,
                email: data.user.email,
                emailVerified: true,
                displayName: data.user.displayName,
                username: data.user.username,
                photoURL: data.user.photoURL
            });
            setIsAuthenticated(true);
            setIsEmailVerifiedState(true);

            // Set profile
            setProfile(data.user);

            notify.success('Registration completed! Welcome!');
            sessionStorage.removeItem(AUTH_PENDING_KEY);
        } catch (error: any) {
            console.error('[AuthContext] Complete registration error:', error);
            notify.error(`Failed to complete registration: ${error.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
            operationInProgress.current = false;
        }
    }, [notify, setTokenWithExpiry]);

    // Login with username and password
    const loginWithUsername = useCallback(async (
        username: string,
        password: string,
        keepSignedIn: boolean
    ) => {
        if (operationInProgress.current) return;
        operationInProgress.current = true;
        setLoading(true);

        try {
            // First, get email from username via backend
            const lookupResponse = await fetch('/api/auth/lookup-username', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });

            if (!lookupResponse.ok) {
                throw new Error('Username not found');
            }

            const { email } = await lookupResponse.json();

            // Sign in with Firebase
            const firebaseUser = await firebaseSignIn(email, password);
            
            if (!firebaseUser) {
                throw new Error('Login failed');
            }

            // Check if email is verified
            if (!firebaseUser.emailVerified) {
                throw new Error('Please verify your email before logging in');
            }

            // Get Firebase ID token
            const idToken = await firebaseUser.getIdToken();

            // Login to backend
            const loginResponse = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idToken,
                    username,
                    keepSignedIn
                })
            });

            if (!loginResponse.ok) {
                const error = await loginResponse.json();
                throw new Error(error.message || 'Login failed');
            }

            const data = await loginResponse.json();

            // Store token with expiry
            setTokenWithExpiry(data.token, keepSignedIn);

            // Set user state
            setUser({
                uid: data.user.uid,
                email: data.user.email,
                emailVerified: true,
                displayName: data.user.displayName,
                username: data.user.username,
                photoURL: data.user.photoURL
            });
            setIsAuthenticated(true);
            setIsEmailVerifiedState(true);

            // Set profile
            setProfile(data.user);

            // Restore wallet if exists
            if (data.user.walletAddress) {
                setWallet({
                    address: data.user.walletAddress,
                    isConnected: true
                });
            }

            notify.success('Successfully logged in!');
            sessionStorage.removeItem(AUTH_PENDING_KEY);
        } catch (error: any) {
            console.error('[AuthContext] Login error:', error);
            notify.error(`Login failed: ${error.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
            operationInProgress.current = false;
        }
    }, [notify, setTokenWithExpiry]);

    // Connect wallet (separate from auth)
    const connectWallet = useCallback(async () => {
        if (!isAuthenticated) {
            notify.error('Please log in first');
            return;
        }

        if (!walletProvider || !address) {
            notify.error('Please connect a wallet using the wallet modal');
            return;
        }

        setLoading(true);

        try {
            const provider = new ethers.BrowserProvider(walletProvider as any);
            const signer = await provider.getSigner();
            const walletAddress = await signer.getAddress();

            const timestamp = Date.now();
            const message = `Link wallet to FundTracer account\nTimestamp: ${timestamp}\nUser: ${user?.uid || ''}`;
            const signature = await signer.signMessage(message);

            // Get Firebase ID token
            const idToken = await getIdToken();
            if (!idToken) {
                throw new Error('Authentication required');
            }

            // Link wallet to account on backend
            const response = await fetch('/api/auth/link-wallet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    address: walletAddress,
                    signature,
                    message
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to connect wallet');
            }

            const data = await response.json();

            // Update wallet state
            setWallet({
                address: walletAddress,
                isConnected: true
            });

            // Update profile with new wallet info
            setProfile(prev => prev ? {
                ...prev,
                walletAddress: walletAddress,
                isVerified: data.isVerified
            } : null);

            notify.success('Wallet connected successfully!');
        } catch (error: any) {
            console.error('[AuthContext] Connect wallet error:', error);
            
            const isUserRejection =
                error.code === 4001 ||
                error.code === 'ACTION_REJECTED' ||
                error.message?.includes('rejected') ||
                error.message?.includes('cancelled');

            if (!isUserRejection) {
                notify.error(`Failed to connect wallet: ${error.message || 'Unknown error'}`);
            }
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, walletProvider, address, user?.uid, notify]);

    // Sign Out
    const signOut = useCallback(async () => {
        // Clear all auth state
        clearAuthData();
        setUser(null);
        setIsAuthenticated(false);
        setIsEmailVerifiedState(false);
        setProfile(null);
        operationInProgress.current = false;

        // Disconnect wallet
        try {
            disconnect();
            setWallet(null);

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

        // Sign out from Firebase
        try {
            await firebaseLogout();
        } catch (error) {
            console.error('Firebase logout error:', error);
        }

        notify.success('Signed out successfully');
    }, [disconnect, clearAuthData, notify]);

    // Refresh Profile
    const refreshProfile = useCallback(async () => {
        if (!isAuthenticated) return;
        
        try {
            const userProfile = await getProfile();
            setProfile(userProfile);
            
            // Update user state with latest profile data
            if (userProfile) {
                setUser(prev => prev ? {
                    ...prev,
                    displayName: userProfile.displayName || userProfile.name || prev.displayName,
                    username: userProfile.username || prev.username,
                    photoURL: userProfile.profilePicture || userProfile.photoURL || prev.photoURL,
                    emailVerified: userProfile.isVerified || prev.emailVerified
                } : null);
                setIsEmailVerifiedState(userProfile.isVerified || false);
            }
            
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
            isEmailVerified: isEmailVerifiedState,
            wallet,
            isWalletConnected: wallet?.isConnected || false,
            profile,
            loading,
            registerWithEmail,
            sendEmailVerification,
            completeRegistration,
            loginWithUsername,
            connectWallet,
            signOut,
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
