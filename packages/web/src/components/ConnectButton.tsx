// Use AppKit's built-in button component
import { AppKitButton } from '@reown/appkit/react';
import { useAuth } from '../contexts/AuthContext';

export function ConnectButton() {
    const { user, signOut } = useAuth();

    if (user) {
        return (
            <button
                onClick={() => signOut()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white font-medium transition-colors"
            >
                Disconnect {user.address.slice(0, 6)}...
            </button>
        )
    }

    // Use AppKit's built-in button for connection
    return <AppKitButton />
}