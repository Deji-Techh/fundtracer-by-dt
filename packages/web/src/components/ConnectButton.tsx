// Use RainbowKit's built-in ConnectButton
// This handles wallet connection, display, and mobile support automatically
import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit';

export function ConnectButton() {
    return (
        <RainbowConnectButton 
            accountStatus="address"
            chainStatus="icon"
            showBalance={false}
        />
    );
}