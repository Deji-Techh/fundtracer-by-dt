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
    loginWithWallet,
    removeAuthToken,
    getAuthToken,
    UserProfile
} from '../api';
import { useNotify } from './ToastContext';
import { useIsMobile } from '../hooks/useIsMobile';
import MobileWalletSelector from '../components/MobileWalletSelector';

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
    const [showMobileSelector, setShowMobileSelector] = useState(false);
    const signInInProgress = useRef(false);
    const notify = useNotify();

    // Mobile detection
    const isMobile = useIsMobile();

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
    }, [walletProvider, address, notify]);

    // Auto sign-in when wallet is connected
    useEffect(() => {
        if (isConnected && address && !user && !signInInProgress.current && !loading) {
            console.log('[AuthContext] Wallet connected, auto-signing in...');
            completeSignIn();
        }
    }, [isConnected, address, user, completeSignIn, loading]);

    const signIn = async () => {
        if (user) return;

        if (isConnected && walletProvider && address) {
            await completeSignIn();
            return;
        }

        sessionStorage.setItem(AUTH_PENDING_KEY, 'true');
        
        if (isMobile) {
            setShowMobileSelector(true);
        } else {
            // For desktop, AppKit modal will open via ConnectButton
            console.log('[AuthContext] Desktop - using AppKit modal');
        }
    };

    const handleMobileConnect = () => {
        // Wallet connected via MobileWalletSelector
        setShowMobileSelector(false);
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
            loading,
            signIn,
            signOut,
            refreshProfile,
            getSigner,
            isWalletConnected: isConnected
        }}>
            {children}
            <MobileWalletSelector
                isOpen={showMobileSelector}
                onClose={() => setShowMobileSelector(false)}
                onConnect={handleMobileConnect}
            />
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
