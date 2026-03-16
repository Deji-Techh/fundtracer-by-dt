import { usePrivy } from '@privy-io/react-auth';
import { useAppKitAccount, useDisconnect as useAppKitDisconnect } from '@reown/appkit/react';
import { useIsMobile } from './useIsMobile';

interface UnifiedWallet {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  provider: 'privy' | 'appkit' | null;
}

export function useUnifiedWallet(): UnifiedWallet {
  const isMobile = useIsMobile();
  
  // Privy hooks (mobile)
  const { 
    login: privyLogin, 
    logout: privyLogout, 
    user: privyUser,
    ready: privyReady 
  } = usePrivy();
  
  // AppKit hooks (desktop)
  const { address: appKitAddress, isConnected: appKitIsConnected } = useAppKitAccount();
  const { disconnect: appKitDisconnect } = useAppKitDisconnect();

  // Determine which provider to use based on device
  const isMobileDevice = isMobile;

  if (isMobileDevice) {
    // Mobile: Use Privy
    const privyAddress = privyUser?.wallet?.address || null;
    const privyConnected = !!privyAddress;
    
    return {
      address: privyAddress,
      isConnected: privyConnected,
      isConnecting: !privyReady,
      connect: async () => {
        try {
          await privyLogin();
        } catch (error) {
          console.error('[useUnifiedWallet] Privy connect error:', error);
          throw error;
        }
      },
      disconnect: async () => {
        try {
          await privyLogout();
        } catch (error) {
          console.error('[useUnifiedWallet] Privy disconnect error:', error);
          throw error;
        }
      },
      provider: 'privy',
    };
  } else {
    // Desktop: Use AppKit
    return {
      address: appKitAddress || null,
      isConnected: appKitIsConnected,
      isConnecting: false,
      connect: async () => {
        // AppKit uses the AppKit modal, trigger it via the button
        // The actual connection is handled by the AppKitButton
        console.log('[useUnifiedWallet] AppKit - use the AppKit modal to connect');
      },
      disconnect: async () => {
        try {
          await appKitDisconnect();
        } catch (error) {
          console.error('[useUnifiedWallet] AppKit disconnect error:', error);
          throw error;
        }
      },
      provider: 'appkit',
    };
  }
}

export default useUnifiedWallet;
