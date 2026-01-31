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
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    getAuth
} from 'firebase/auth';

const TOKEN_EXPIRY_KEY = 'fundtracer_token_expiry';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

interface AuthUser {
    uid: string;
    email: string;
    username: string;
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
    register: (username: string, email: string, password: string, keepSignedIn: boolean) => Promise<void>;
    login: (username: string, password: string, keepSignedIn: boolean) => Promise<void>;
    signOut: () => Promise<void>;
    connectWallet: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [wallet, setWallet] = useState<WalletInfo | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    const operationInProgress = useRef(false);
    const notify = useNotify();

    const { address, isConnected } = useAppKitAccount();
    const { walletProvider } = useAppKitProvider('eip155');
    const { disconnect } = useDisconnect();

    const setTokenWithExpiry = useCallback((token: string, keepSignedIn: boolean) => {
        setAuthToken(token);
        if (keepSignedIn) {
            localStorage.setItem(TOKEN_EXPIRY_KEY, (Date.now() + THIRTY_DAYS_MS).toString());
        } else {
            localStorage.removeItem(TOKEN_EXPIRY_KEY);
        }
    }, []);

    const clearAuthData = useCallback(() => {
        removeAuthToken();
        localStorage.removeItem(TOKEN_EXPIRY_KEY);
    }, []);

    const setUserFromProfile = useCallback((userProfile: UserProfile, token?: string) => {
        if (token) {
            setAuthToken(token);
        }

        setUser({
            uid: userProfile.uid,
            email: userProfile.email,
            username: userProfile.username || ''
        });
        setIsAuthenticated(true);
        setProfile(userProfile);

        if (userProfile.walletAddress) {
            setWallet({
                address: userProfile.walletAddress,
                isConnected: true
            });
        }
    }, []);

    useEffect(() => {
        const initAuth = async () => {
            const token = getAuthToken();
            const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);

            if (!token || (expiry && Date.now() > parseInt(expiry, 10))) {
                clearAuthData();
                setLoading(false);
                return;
            }

            try {
                const userProfile = await getProfile();
                setUserFromProfile(userProfile);
            } catch (error) {
                console.error('Auth init error:', error);
                clearAuthData();
            } finally {
                setLoading(false);
            }
        };

        initAuth();
    }, [clearAuthData, setUserFromProfile]);

    useEffect(() => {
        if (isConnected && address) {
            setWallet({ address, isConnected: true });
        } else if (!isConnected) {
            setWallet(null);
        }
    }, [isConnected, address]);

    const register = useCallback(async (
        username: string,
        email: string,
        password: string,
        keepSignedIn: boolean
    ) => {
        if (operationInProgress.current) return;
        operationInProgress.current = true;
        setLoading(true);

        try {
            const auth = getAuth();
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const firebaseUser = userCredential.user;

            const idToken = await firebaseUser.getIdToken();

            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    uid: firebaseUser.uid,
                    email,
                    username,
                    keepSignedIn
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Registration failed');
            }

            const data = await response.json();
            setTokenWithExpiry(data.token, keepSignedIn);
            setUserFromProfile(data.user, data.token);

            notify.success('Registration successful! Welcome!');
        } catch (error: any) {
            console.error('[AuthContext] Registration error:', error);
            notify.error(`Registration failed: ${error.message || 'Unknown error'}`);

            try {
                const auth = getAuth();
                if (auth.currentUser) {
                    await firebaseSignOut(auth);
                }
            } catch {}
        } finally {
            setLoading(false);
            operationInProgress.current = false;
        }
    }, [notify, setTokenWithExpiry, setUserFromProfile]);

    const login = useCallback(async (
        username: string,
        password: string,
        keepSignedIn: boolean
    ) => {
        if (operationInProgress.current) return;
        operationInProgress.current = true;
        setLoading(true);

        try {
            const lookupResponse = await fetch('/api/auth/lookup-username', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });

            if (!lookupResponse.ok) {
                throw new Error('Username not found');
            }

            const { email } = await lookupResponse.json();

            const auth = getAuth();
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const firebaseUser = userCredential.user;

            const idToken = await firebaseUser.getIdToken();

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
            setTokenWithExpiry(data.token, keepSignedIn);
            setUserFromProfile(data.user, data.token);

            notify.success('Successfully logged in!');
        } catch (error: any) {
            console.error('[AuthContext] Login error:', error);
            notify.error(`Login failed: ${error.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
            operationInProgress.current = false;
        }
    }, [notify, setTokenWithExpiry, setUserFromProfile]);

    const signOut = useCallback(async () => {
        clearAuthData();
        setUser(null);
        setIsAuthenticated(false);
        setProfile(null);
        operationInProgress.current = false;

        try {
            disconnect();
            setWallet(null);

            if (typeof window !== 'undefined') {
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('wc@2:') || key.startsWith('wagmi') || key.includes('walletconnect')) {
                        localStorage.removeItem(key);
                    }
                });
            }
        } catch {}

        try {
            const auth = getAuth();
            await firebaseSignOut(auth);
        } catch (error) {
            console.error('Firebase logout error:', error);
        }

        notify.success('Signed out successfully');
    }, [disconnect, clearAuthData, notify]);

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

            const auth = getAuth();
            const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;

            if (!idToken) {
                throw new Error('Authentication required');
            }

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

            setWallet({
                address: walletAddress,
                isConnected: true
            });

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

    const refreshProfile = useCallback(async () => {
        if (!isAuthenticated) return;

        try {
            const userProfile = await getProfile();
            setProfile(userProfile);

            if (userProfile) {
                setUser(prev => prev ? {
                    ...prev,
                    email: userProfile.email || prev.email,
                    username: userProfile.username || prev.username
                } : null);
            }

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

    return (
        <AuthContext.Provider value={{
            user,
            profile,
            wallet,
            isAuthenticated,
            isWalletConnected: wallet?.isConnected || false,
            loading,
            register,
            login,
            signOut,
            connectWallet,
            refreshProfile
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
