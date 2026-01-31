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
    register as apiRegister,
    login as apiLogin,
    linkWalletToAccount,
    unlinkWalletFromAccount,
    UserProfile
} from '../api';
import { useNotify } from './ToastContext';

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
    unlinkWallet: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    getSigner: () => Promise<ethers.Signer>;
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
        setUser(null);
        setProfile(null);
        setIsAuthenticated(false);
    }, []);

    // Check auth on mount
    useEffect(() => {
        const initAuth = async () => {
            const token = getAuthToken();
            if (token) {
                try {
                    const userProfile = await getProfile();
                    setProfile(userProfile);
                    
                    if (userProfile.uid) {
                        setUser({
                            uid: userProfile.uid,
                            email: userProfile.email || '',
                            username: userProfile.username || ''
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
                    // Only clear auth if token is invalid/expired (401)
                    // Keep auth for network errors (user might be offline)
                    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
                        clearAuthData();
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
        }
    }, [isConnected, address, wallet?.address]);

    // Register new user
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
            const response = await apiRegister(username, email, password, keepSignedIn);
            
            setTokenWithExpiry(response.token, keepSignedIn);
            setUser({
                uid: response.user.uid,
                email: response.user.email,
                username: response.user.username
            });
            setProfile(response.user);
            setIsAuthenticated(true);
            
            notify.success('Account created successfully!');
        } catch (error: any) {
            console.error('[AuthContext] Registration error:', error);
            notify.error(error.message || 'Registration failed');
            throw error;
        } finally {
            setLoading(false);
            operationInProgress.current = false;
        }
    }, [notify, setTokenWithExpiry]);

    // Login
    const login = useCallback(async (
        username: string,
        password: string,
        keepSignedIn: boolean
    ) => {
        if (operationInProgress.current) return;
        operationInProgress.current = true;
        setLoading(true);

        try {
            const response = await apiLogin(username, password, keepSignedIn);
            
            setTokenWithExpiry(response.token, keepSignedIn);
            setUser({
                uid: response.user.uid,
                email: response.user.email,
                username: response.user.username
            });
            setProfile(response.user);
            setIsAuthenticated(true);
            
            if (response.user.walletAddress) {
                setWallet({
                    address: response.user.walletAddress,
                    isConnected: true
                });
            }
            
            notify.success('Signed in successfully!');
        } catch (error: any) {
            console.error('[AuthContext] Login error:', error);
            notify.error(error.message || 'Login failed');
            throw error;
        } finally {
            setLoading(false);
            operationInProgress.current = false;
        }
    }, [notify, setTokenWithExpiry]);

    // Sign out
    const signOut = useCallback(async () => {
        try {
            disconnect();
            clearAuthData();
            notify.success('Signed out successfully');
        } catch (error) {
            console.error('Sign out error:', error);
        }
    }, [disconnect, clearAuthData, notify]);

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
            notify.error(error.message || 'Failed to connect wallet');
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
            disconnect();
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
