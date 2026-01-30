// Use AppKit's built-in button or open modal programmatically
import { useAppKit } from '@reown/appkit/react';
import { useAuth } from '../contexts/AuthContext';

export function ConnectButton() {
    const { open } = useAppKit();
    const { user, signOut, loading } = useAuth();

    if (loading) {
        return <button disabled className="px-4 py-2 bg-gray-700 rounded">Loading...</button>
    }

    if (user) {
        return (
            <button
                onClick={() => signOut()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white"
            >
                Disconnect {user.address.slice(0, 6)}...
            </button>
        )
    }

    return (
        <button
            onClick={() => open()}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white"
        >
            Connect Wallet
        </button>
    )
}