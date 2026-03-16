import React, { useState, useEffect, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useAuth } from '../contexts/AuthContext';
import { useNotify } from '../contexts/ToastContext';
import { Wallet, Copy, QrCode, ExternalLink, AlertCircle, RefreshCw, Smartphone } from 'lucide-react';

interface MobileWalletConnectProps {
  className?: string;
}

export const MobileWalletConnect: React.FC<MobileWalletConnectProps> = ({ className }) => {
  const { login: loginPrivy } = usePrivy();
  const { user, signOut } = useAuth();
  const notify = useNotify();
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [connectionTimeout, setConnectionTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [walletUrl, setWalletUrl] = useState('');

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor;
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      setIsMobile(isMobileDevice);
    };
    checkMobile();
  }, []);

  // Generate direct deeplinks for fallback (no WC URI needed — AppKit handles pairing)
  const generateWalletUrl = useCallback(() => {
    // Direct deeplink to open FundTracer in MetaMask's in-app browser
    const metamaskUrl = 'https://metamask.app.link/dapp/fundtracer.xyz';
    setWalletUrl(metamaskUrl);
  }, []);

  const clearConnectionTimeout = () => {
    if (connectionTimeout) {
      clearTimeout(connectionTimeout);
      setConnectionTimeout(null);
    }
  };

  const handleConnect = () => {
    // CRITICAL: Must be synchronous for mobile deep links
    console.log('[MobileWalletConnect] Opening wallet modal...');
    
    setIsConnecting(true);
    setShowFallback(false);
    
    // Set timeout to show fallback options if connection hangs
    const timeout = setTimeout(() => {
      console.log('[MobileWalletConnect] Connection timeout - showing fallback');
      setShowFallback(true);
      setIsConnecting(false);
      generateWalletUrl();
      notify.warning('Connection is taking longer than expected. Try the fallback options below.');
    }, 5000); // 5 second timeout
    
    setConnectionTimeout(timeout);
    
    try {
      // Open Privy - MUST be called synchronously
      loginPrivy();
    } catch (error) {
      console.error('[MobileWalletConnect] Error opening modal:', error);
      clearConnectionTimeout();
      setIsConnecting(false);
      setShowFallback(true);
      notify.error('Failed to open wallet connection. Please try the manual options.');
    }
  };

  const handleDisconnect = () => {
    clearConnectionTimeout();
    signOut();
    notify.success('Wallet disconnected');
  };

  const copyWalletLink = () => {
    navigator.clipboard.writeText('https://fundtracer.xyz');
    notify.success('Link copied! Open it in your wallet app\'s browser.');
  };

  const openMetaMask = () => {
    // Direct deeplink to open FundTracer in MetaMask's in-app browser
    window.location.href = 'https://metamask.app.link/dapp/fundtracer.xyz';
  };

  const openTrustWallet = () => {
    window.location.href = 'https://link.trustwallet.com/open_url?coin_id=60&url=https://fundtracer.xyz';
  };

  const openCoinbaseWallet = () => {
    window.location.href = 'https://go.cb-w.com/dapp?cb_url=https://fundtracer.xyz';
  };

  const retryConnection = () => {
    setShowFallback(false);
    handleConnect();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearConnectionTimeout();
    };
  }, []);

  // If user is connected, show disconnect button
  if (user) {
    return (
      <button
        onClick={handleDisconnect}
        className={`wallet-btn disconnect ${className}`}
        style={{
          padding: '10px 20px',
          backgroundColor: '#dc2626',
          color: 'white',
          borderRadius: '8px',
          border: 'none',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <Wallet size={18} />
        Disconnect {user.walletAddress ? `${user.walletAddress.slice(0, 6)}...` : 'Wallet'}
      </button>
    );
  }

  return (
    <div className={`mobile-wallet-connect ${className}`}>
      {/* Main Connect Button */}
      <button
        onClick={handleConnect}
        disabled={isConnecting}
        className="wallet-btn connect"
        style={{
          padding: '12px 24px',
          backgroundColor: isConnecting ? '#1f2937' : '#3b82f6',
          color: 'white',
          borderRadius: '8px',
          border: 'none',
          cursor: isConnecting ? 'not-allowed' : 'pointer',
          fontWeight: 600,
          fontSize: '15px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          width: '100%',
          justifyContent: 'center',
          transition: 'all 0.2s ease'
        }}
      >
        {isConnecting ? (
          <>
            <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
            Connecting...
          </>
        ) : (
          <>
            <Wallet size={20} />
            Connect Wallet
          </>
        )}
      </button>

      {/* Mobile-specific hint */}
      {isMobile && !showFallback && (
        <p style={{
          fontSize: '12px',
          color: '#6b7280',
          textAlign: 'center',
          marginTop: '8px'
        }}>
          <Smartphone size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
          Having trouble? Use the fallback options below.
        </p>
      )}

      {/* Fallback Options */}
      {showFallback && (
        <div style={{
          marginTop: '16px',
          padding: '16px',
          backgroundColor: '#1f2937',
          borderRadius: '8px',
          border: '1px solid #374151'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
            color: '#fbbf24'
          }}>
            <AlertCircle size={18} />
            <span style={{ fontWeight: 600, fontSize: '14px' }}>
              Connection timed out
            </span>
          </div>

          <p style={{
            fontSize: '13px',
            color: '#9ca3af',
            marginBottom: '16px',
            lineHeight: 1.5
          }}>
            Mobile browsers sometimes block automatic wallet connections. Try one of these options:
          </p>

          {/* Option 1: Direct Wallet Deeplinks */}
          <div style={{ marginBottom: '16px' }}>
            <p style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#d1d5db',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Open in Wallet App
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={openMetaMask}
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <span>Open MetaMask</span>
                <ExternalLink size={14} color="#6b7280" />
              </button>

              <button
                onClick={openTrustWallet}
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <span>Open Trust Wallet</span>
                <ExternalLink size={14} color="#6b7280" />
              </button>

              <button
                onClick={openCoinbaseWallet}
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <span>Open Coinbase Wallet</span>
                <ExternalLink size={14} color="#6b7280" />
              </button>
            </div>
          </div>

          {/* Option 2: Copy Link */}
          <div style={{ marginBottom: '16px' }}>
            <p style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#d1d5db',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Open in Wallet Browser
            </p>
            
            <button
              onClick={copyWalletLink}
              style={{
                width: '100%',
                padding: '10px 14px',
                backgroundColor: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Copy size={14} />
              Copy Link
            </button>
            
            <p style={{
              fontSize: '11px',
              color: '#6b7280',
              marginTop: '6px',
              textAlign: 'center'
            }}>
              Paste this link in your wallet app's browser
            </p>
          </div>

          {/* Retry Button */}
          <button
            onClick={retryConnection}
            style={{
              width: '100%',
              padding: '10px 14px',
              backgroundColor: '#374151',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <RefreshCw size={14} />
            Try Again
          </button>
        </div>
      )}

      {/* CSS Animation for spinner */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default MobileWalletConnect;
