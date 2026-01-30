import { useAppKit } from '@reown/appkit/react';
import { useAuth } from '../contexts/AuthContext';

export function ConnectButton() {
    const { open } = useAppKit();
    const { user, signOut } = useAuth();

    if (user) {
        return (
            <button
                onClick={() => signOut()}
                style={{
                    padding: '8px 16px',
                    backgroundColor: '#dc2626',
                    color: 'white',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 500
                }}
            >
                Disconnect {user.address.slice(0, 6)}...
            </button>
        );
    }

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('[ConnectButton] CLICKED!');
        
        try {
            open();
            console.log('[ConnectButton] open() called');
        } catch (error) {
            console.error('[ConnectButton] Error:', error);
        }
    };

    return (
        <button
            onClick={handleClick}
            style={{
                padding: '8px 16px',
                backgroundColor: '#16a34a',
                color: 'white',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 500,
                pointerEvents: 'auto',
                position: 'relative',
                zIndex: 100
            }}
        >
            Connect Wallet
        </button>
    );
}