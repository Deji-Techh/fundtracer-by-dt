import { useAppKit } from '@reown/appkit/react';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect, useCallback } from 'react';
import { useNotify } from '../contexts/ToastContext';
import { Wallet, AlertCircle, ExternalLink, Copy, RefreshCw } from 'lucide-react';

export function ConnectButton() {
    const { open } = useAppKit();
    const { user, signOut } = useAuth();
    const notify = useNotify();
    
    const [isConnecting, setIsConnecting] = useState(false);
    const [showFallback, setShowFallback] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Detect mobile device
    useEffect(() => {
        const checkMobile = () => {
            const userAgent = navigator.userAgent || navigator.vendor;
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
        };
        setIsMobile(checkMobile());
    }, []);

    const handleConnect = useCallback(() => {
        console.log('[ConnectButton] Connecting...');
        setIsConnecting(true);
        setShowFallback(false);
        
        // Set timeout for mobile fallback
        const timeout = setTimeout(() => {
            if (isMobile) {
                console.log('[ConnectButton] Timeout - showing fallback');
                setShowFallback(true);
                setIsConnecting(false);
                notify.warning('Connection timed out. Try the options below.');
            }
        }, 5000);

        try {
            // CRITICAL: Must be synchronous for mobile deep links
            open();
            
            // Clear timeout if connection succeeds quickly
            setTimeout(() => {
                clearTimeout(timeout);
                setIsConnecting(false);
            }, 1000);
        } catch (error) {
            console.error('[ConnectButton] Error:', error);
            clearTimeout(timeout);
            setIsConnecting(false);
            if (isMobile) {
                setShowFallback(true);
            }
        }
    }, [open, isMobile, notify]);

    const openMetaMask = () => {
        window.location.href = 'https://metamask.app.link/dapp/fundtracer.xyz';
    };

    const copyDappLink = () => {
        navigator.clipboard.writeText('https://fundtracer.xyz');
        notify.success('Link copied! Open MetaMask browser and paste this URL.');
    };

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
                Disconnect {user.email?.split('@')[0] || user.address?.slice(0, 6)}...
            </button>
        );
    }

    return (
        <div style={{ position: 'relative' }}>
            <button
                onClick={handleConnect}
                disabled={isConnecting}
                style={{
                    padding: '8px 16px',
                    backgroundColor: isConnecting ? '#1f2937' : '#16a34a',
                    color: 'white',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: isConnecting ? 'not-allowed' : 'pointer',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}
            >
                {isConnecting ? (
                    <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                    <Wallet size={16} />
                )}
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>

            {/* Mobile Fallback Options */}
            {showFallback && isMobile && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    padding: '12px',
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    minWidth: '250px',
                    zIndex: 1000
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginBottom: '8px',
                        color: '#fbbf24',
                        fontSize: '13px',
                        fontWeight: 600
                    }}>
                        <AlertCircle size={14} />
                        Connection Issue
                    </div>

                    <p style={{
                        fontSize: '12px',
                        color: '#9ca3af',
                        marginBottom: '10px'
                    }}>
                        Try these options:
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <button
                            onClick={openMetaMask}
                            style={{
                                padding: '8px 12px',
                                backgroundColor: '#1a1a1a',
                                border: '1px solid #333',
                                borderRadius: '6px',
                                color: '#fff',
                                fontSize: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}
                        >
                            <span>Open MetaMask</span>
                            <ExternalLink size={12} />
                        </button>

                        <button
                            onClick={copyDappLink}
                            style={{
                                padding: '8px 12px',
                                backgroundColor: '#1a1a1a',
                                border: '1px solid #333',
                                borderRadius: '6px',
                                color: '#fff',
                                fontSize: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}
                        >
                            <span>Copy Link</span>
                            <Copy size={12} />
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

export default ConnectButton;
