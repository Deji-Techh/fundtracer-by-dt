import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
    useCallback,
    useRef
} from 'react';
import { useAccount, useConnect, useDisconnect, useConnectorClient } from 'wagmi';
import { ethers } from 'ethers';
import {
    getProfile,
    loginWithWallet,
    removeAuthToken,
    getAuthToken,
    UserProfile
} from '../api';
import { useNotify } from './ToastContext';

const AUTH_PENDING_KEY = 'fundtracer_auth_pending';

interface AuthContextType {
    user: { address: string } | null;
    profile: UserProfile | null;
    loading: boolean;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    getSigner: () => Promise<ethers.Signer>;
    isWalletConnected: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<{ address: string } | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const signInInProgress = useRef(false);
    const notify = useNotify();

    // RainbowKit/Wagmi hooks
    const { address, isConnected } = useAccount();
    const { connect } = useConnect();
    const { disconnect } = useDisconnect();
    const { data: connectorClient } = useConnectorClient();

    // Check existing auth on mount
    useEffect(() => {
        const initAuth = async () => {
            const token = getAuthToken();
            if (token) {
                try {
                    const userProfile = await getProfile();
                    setProfile(userProfile);
                    setUser({ address: userProfile.uid });
                } catch {
                    removeAuthToken();
                }
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    const completeSignIn = useCallback(async () => {
        if (signInInProgress.current) return;
        signInInProgress.current = true;
        setLoading(true);

        try {
            if (!connectorClient || !address) {
                throw new Error('Wallet not connected');
            }

            // Get provider from connector client
            const provider = new ethers.BrowserProvider(connectorClient as any);
            const signer = await provider.getSigner();
            const walletAddress = await signer.getAddress();

            const timestamp = Date.now();
            const message = `Login to FundTracer\nTimestamp: ${timestamp}`;
            const signature = await signer.signMessage(message);

            const loginResponse = await loginWithWallet(walletAddress, signature, message);

            setUser({ address: walletAddress });
            const userProfile = await getProfile();
            setProfile({
                ...userProfile,
                isVerified: loginResponse.user.isVerified,
                tier: loginResponse.user.tier
            });

            notify.success('Successfully signed in!');
            sessionStorage.removeItem(AUTH_PENDING_KEY);
        } catch (error: any) {
            const isUserRejection =
                error.code === 4001 ||
                error.code === 'ACTION_REJECTED' ||
                error.message?.includes('rejected') ||
                error.message?.includes('cancelled') ||
                error.message?.includes('user denied');

            if (!isUserRejection) {
                notify.error(`Login failed: ${error.message || 'Unknown error'}`);
            }

            sessionStorage.removeItem(AUTH_PENDING_KEY);
        } finally {
            setLoading(false);
            signInInProgress.current = false;
        }
    }, [connectorClient, address, notify]);

    // Check for pending auth on mount (for mobile redirect recovery)
    useEffect(() => {
        const pendingAuth = sessionStorage.getItem(AUTH_PENDING_KEY);
        if (pendingAuth && isConnected && connectorClient && address && !signInInProgress.current && !user) {
            sessionStorage.removeItem(AUTH_PENDING_KEY);
            completeSignIn();
        }
    }, [isConnected, connectorClient, address, completeSignIn, user]);

    // Auto sign-in when wallet is connected but user is not authenticated
    useEffect(() => {
        if (isConnected && address && !user && !signInInProgress.current && !loading) {
            console.log('[AuthContext] Wallet connected but no user session, auto-signing in...');
            completeSignIn();
        }
    }, [isConnected, address, user, completeSignIn, loading]);

    const signIn = async () => {
        if (user) return;

        // Already connected - complete sign in immediately
        if (isConnected && connectorClient && address) {
            await completeSignIn();
            return;
        }

        // Mark as pending BEFORE opening modal (crucial for mobile)
        sessionStorage.setItem(AUTH_PENDING_KEY, 'true');
        setLoading(true);

        try {
            // RainbowKit handles both desktop and mobile automatically
            console.log('[AuthContext] Opening RainbowKit connect modal');
            // The modal will be triggered by RainbowKit's ConnectButton
            // or by calling connect() from useConnect
        } catch (error) {
            sessionStorage.removeItem(AUTH_PENDING_KEY);
            setLoading(false);
        }
    };

    const signOut = async () => {
        removeAuthToken();
        setUser(null);
        setProfile(null);
        signInInProgress.current = false;
        sessionStorage.removeItem(AUTH_PENDING_KEY);

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
    };

    const refreshProfile = async () => {
        if (!user) return;
        try {
            const userProfile = await getProfile();
            setProfile(userProfile);
        } catch { }
    };

    const getSigner = useCallback(async (): Promise<ethers.Signer> => {
        if (!connectorClient || !address) {
            throw new Error('Wallet not connected');
        }

        const provider = new ethers.BrowserProvider(connectorClient as any);
        return provider.getSigner();
    }, [connectorClient, address]);

    return (
        <AuthContext.Provider value={{
            user,
            profile,
            loading,
            signIn,
            signOut,
            refreshProfile,
            getSigner,
            isWalletConnected: isConnected
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
