import { useAppKit, useAppKitState } from '@reown/appkit/react';
import { useAuth } from '../contexts/AuthContext';

export function ConnectButton() {
    const { open } = useAppKit();
    const { initialized, loading: appKitLoading } = useAppKitState();
    const { user, signOut, loading: authLoading } = useAuth();

    const isLoading = authLoading || appKitLoading;

    if (user) {
        return (
            <button
                onClick={() => signOut()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white font-medium transition-colors"
            >
                Disconnect {user.address.slice(0, 6)}...
            </button>
        );
    }

    const handleClick = () => {
        console.log('[ConnectButton] Clicked!');
        console.log('[ConnectButton] AppKit initialized:', initialized);
        
        if (!initialized) {
            console.warn('[ConnectButton] AppKit not initialized yet!');
            return;
        }

        try {
            console.log('[ConnectButton] Opening AppKit modal...');
            open();
            console.log('[ConnectButton] open() called successfully');
        } catch (error) {
            console.error('[ConnectButton] Error opening modal:', error);
            alert('Error opening wallet modal. Please try again.');
        }
    };

    return (
        <button
            onClick={handleClick}
            disabled={isLoading || !initialized}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isLoading ? 'Loading...' : !initialized ? 'Initializing...' : 'Connect Wallet'}
        </button>
    );
}