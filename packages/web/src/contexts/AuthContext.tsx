import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
    useCallback,
    useRef
} from 'react';
import {
    useAppKit,
    useAppKitAccount,
    useAppKitProvider,
    useDisconnect
} from '@reown/appkit/react';
import { ethers } from 'ethers';
import {
    getProfile,
    loginWithWallet,
    removeAuthToken,
    getAuthToken,
    UserProfile
} from '../api';

const AUTH_PENDING_KEY = 'fundtracer_auth_pending';

interface AuthContextType {
    user: { address: string } | null;
    profile: UserProfile | null;
    loading: boolean;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    getSigner: () => Promise<ethers.Signer>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<{ address: string } | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const signInInProgress = useRef(false);

    // Reown AppKit hooks
    const { open } = useAppKit();
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
                    // Use uid or walletAddress from profile (both are the wallet address)
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
            if (!walletProvider || !address) {
                throw new Error('Wallet not connected');
            }

            // Use Ethers v6 with the wallet provider
            const provider = new ethers.BrowserProvider(walletProvider as any);
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

            sessionStorage.removeItem(AUTH_PENDING_KEY);
        } catch (error: any) {
            const isUserRejection =
                error.code === 4001 ||
                error.code === 'ACTION_REJECTED' ||
                error.message?.includes('rejected') ||
                error.message?.includes('cancelled') ||
                error.message?.includes('user denied');

            if (!isUserRejection) {
                alert(`Login failed: ${error.message || 'Unknown error'}`);
            }

            sessionStorage.removeItem(AUTH_PENDING_KEY);
        } finally {
            setLoading(false);
            signInInProgress.current = false;
        }
    }, [walletProvider, address]);

    // Check for pending auth on mount (for mobile redirect recovery)
    // Also handle automatic sign-in when wallet connects
    useEffect(() => {
        const pendingAuth = sessionStorage.getItem(AUTH_PENDING_KEY);
        if (pendingAuth && isConnected && walletProvider && address && !signInInProgress.current && !user) {
            sessionStorage.removeItem(AUTH_PENDING_KEY);
            completeSignIn();
        }
    }, [isConnected, walletProvider, address, completeSignIn, user]);

    // Auto sign-in when wallet is connected but user is not authenticated
    useEffect(() => {
        // Only proceed if wallet is connected, we have an address, and no user is logged in
        if (isConnected && address && !user && !signInInProgress.current && !loading) {
            console.log('[AuthContext] Wallet connected but no user session, auto-signing in...');
            completeSignIn();
        }
    }, [isConnected, address, user, completeSignIn, loading]);

    const signIn = async () => {
        if (user) return;

        // Already connected - complete sign in immediately
        if (isConnected && walletProvider && address) {
            await completeSignIn();
            return;
        }

        // Mark as pending BEFORE opening modal (crucial for mobile)
        sessionStorage.setItem(AUTH_PENDING_KEY, 'true');
        setLoading(true);

        try {
            // Open Reown AppKit modal - it will show all available wallets
            await open();
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
                        key.startsWith('W3M_') ||
                        key.startsWith('@w3m/') ||
                        key.startsWith('@appkit/') ||
                        key.startsWith('wagmi') ||
                        key.includes('walletconnect')
                    ) {
                        localStorage.removeItem(key);
                    }
                });
            }
        } catch { }
    };

    const refreshProfile = async () => {
        if (!user) return;
        try {
            const userProfile = await getProfile();
            setProfile(userProfile);
        } catch { }
    };

    const getSigner = useCallback(async (): Promise<ethers.Signer> => {
        if (!walletProvider || !address) {
            throw new Error('Wallet not connected');
        }

        // Use Ethers v6 with the wallet provider
        const provider = new ethers.BrowserProvider(walletProvider as any);
        return provider.getSigner();
    }, [walletProvider, address]);

    return (
        <AuthContext.Provider value={{
            user,
            profile,
            loading,
            signIn,
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