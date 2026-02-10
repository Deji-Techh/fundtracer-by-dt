import React, { useState, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  GasPipeIcon,
  Cancel01Icon,
  Loading01Icon,
  CheckmarkCircle02Icon,
  Alert01Icon,
} from '@hugeicons/core-free-icons';
import { useNotify } from '../../contexts/ToastContext';
import { useIsMobile } from '../../hooks/useIsMobile';

// Config - Hardcoded values
const CONFIG = {
  RECEIVER: '0x4436977aCe641EdfE5A83b0d974Bd48443a448fd',
  FEE: '0.0001',
  CHAIN_ID: '0xE708',
  CHAIN_ID_DEC: 59144,
  RPC: 'https://rpc.linea.build',
  EXPLORER: 'https://lineascan.build',
  CHAIN_NAME: 'Linea',
  CONFIRMATIONS: 1,
};

export function PaymentGate({ isOpen, onClose, onPaymentSuccess, onCancel }) {
  const [status, setStatus] = useState('ready');
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState(null);
  const [walletAddr, setWalletAddr] = useState(null);
  const [balance, setBalance] = useState(null);

  const notify = useNotify();
  const isMobile = useIsMobile();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStatus('ready');
      setError('');
      setTxHash(null);
      initWallet();
    }
  }, [isOpen]);

  // Initialize wallet and check chain
  async function initWallet() {
    if (!window.ethereum) {
      setError('No wallet detected. Please install MetaMask or use a wallet browser.');
      setStatus('failed');
      return;
    }

    try {
      setStatus('connecting');
      
      // Request accounts
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (!accounts || accounts.length === 0) {
        setError('Please connect your wallet');
        setStatus('failed');
        return;
      }

      const address = accounts[0];
      setWalletAddr(address);

      // Force switch to Linea
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: CONFIG.CHAIN_ID }],
        });
      } catch (switchErr) {
        if (switchErr.code === 4902) {
          // Chain not added, add it
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: CONFIG.CHAIN_ID,
              chainName: CONFIG.CHAIN_NAME,
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: [CONFIG.RPC],
              blockExplorerUrls: [CONFIG.EXPLORER],
            }],
          });
        } else if (switchErr.code !== -32002) {
          // -32002 means already pending, ignore
          throw switchErr;
        }
      }

      // Get balance
      const balanceHex = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      });
      
      const balanceWei = parseInt(balanceHex, 16);
      const balanceEth = balanceWei / 1e18;
      setBalance(balanceEth.toFixed(5));

      setStatus('ready');
    } catch (err) {
      console.error('[PaymentGate] Init error:', err);
      setError('Wallet connection failed. Please try again.');
      setStatus('failed');
    }
  }

  // Handle send payment
  async function handleSend() {
    setError('');

    try {
      setStatus('awaiting');

      // Send transaction
      const valueHex = '0x' + (BigInt(CONFIG.FEE * 1e18)).toString(16);
      
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: walletAddr,
          to: CONFIG.RECEIVER,
          value: valueHex,
          gas: '0x5208', // 21,000 gas limit - standard for simple ETH transfers
        }],
      });

      setTxHash(txHash);
      setStatus('confirming');
      notify.success('Transaction sent! Waiting for confirmation...');

      // Wait for confirmation
      let confirmed = false;
      let attempts = 0;
      const maxAttempts = 30;

      while (!confirmed && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          const receipt = await window.ethereum.request({
            method: 'eth_getTransactionReceipt',
            params: [txHash],
          });

          if (receipt && receipt.blockNumber) {
            confirmed = true;
            break;
          }
        } catch (e) {
          // Continue polling
        }
        
        attempts++;
      }

      if (confirmed) {
        setStatus('verified');
        notify.success('Payment verified!');
        
        setTimeout(() => {
          onPaymentSuccess(txHash);
        }, 1000);
      } else {
        throw new Error('Transaction confirmation timeout');
      }

    } catch (err) {
      console.error('[PaymentGate] Send error:', err);
      
      if (err.code === 4001 || err.message?.includes('user rejected')) {
        setError('You rejected the transaction.');
        setStatus('ready');
      } else {
        setError(err.message || 'Transaction failed. Please try again.');
        setStatus('failed');
      }
    }
  }

  const insufficientBal = balance !== null && parseFloat(balance) < parseFloat(CONFIG.FEE);

  if (!isOpen) return null;

  const isMidTransaction = status === 'awaiting' || status === 'confirming' || status === 'verified';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: isMobile ? 0 : undefined,
      }}
      onClick={() => !isMidTransaction && onClose()}
    >
      <div
        style={{
          backgroundColor: 'var(--color-bg-elevated)',
          borderRadius: isMobile ? '16px 16px 0 0' : '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          maxWidth: isMobile ? '100%' : '420px',
          width: isMobile ? '100%' : '90%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          maxHeight: isMobile ? '85vh' : undefined,
          overflowY: isMobile ? 'auto' : undefined,
          color: 'var(--color-text-primary)',
          fontFamily: 'system-ui, sans-serif',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '24px' }}>
          {/* Header with close button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
              Analysis Fee
            </h2>
            {!isMidTransaction && (
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-secondary)',
                  padding: '8px',
                  borderRadius: '8px',
                  fontSize: '20px',
                }}
              >
                <HugeiconsIcon icon={Cancel01Icon} size={20} strokeWidth={2} />
              </button>
            )}
          </div>

          {/* READY / CONNECTING State */}
          {(status === 'ready' || status === 'connecting') && (
            <>
              {/* Fee Display */}
              <div
                style={{
                  backgroundColor: 'var(--color-bg)',
                  borderRadius: '14px',
                  padding: '20px',
                  marginBottom: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                  {CONFIG.FEE} ETH
                </div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
                  on {CONFIG.CHAIN_NAME}
                </div>
              </div>

              {/* Wallet Info */}
              {walletAddr && (
                <div style={{ marginBottom: '12px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '10px 0',
                      borderBottom: '1px solid var(--color-border)',
                      fontSize: '14px',
                    }}
                  >
                    <span style={{ color: 'var(--color-text-muted)' }}>Wallet</span>
                    <span style={{ color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
                      {walletAddr.slice(0, 6)}...{walletAddr.slice(-4)}
                    </span>
                  </div>
                </div>
              )}

              {/* Balance Info */}
              {balance !== null && (
                <div style={{ marginBottom: '16px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '10px 0',
                      borderBottom: '1px solid var(--color-border)',
                      fontSize: '14px',
                    }}
                  >
                    <span style={{ color: 'var(--color-text-muted)' }}>Balance</span>
                    <span
                      style={{
                        color: insufficientBal ? '#f87171' : '#4ade80',
                        fontFamily: 'monospace',
                      }}
                    >
                      {parseFloat(balance).toFixed(5)} ETH
                    </span>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div
                  style={{
                    backgroundColor: 'rgba(234, 88, 12, 0.1)',
                    border: '1px solid #ea580c',
                    borderRadius: '8px',
                    padding: '12px',
                    color: '#ea580c',
                    fontSize: '14px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <HugeiconsIcon icon={Alert01Icon} size={16} color="#ea580c" strokeWidth={2} />
                  {error}
                </div>
              )}

              {/* Action Button */}
              {insufficientBal ? (
                <button
                  disabled
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    border: 'none',
                    fontSize: '16px',
                    fontWeight: 700,
                    backgroundColor: 'var(--color-border)',
                    color: 'var(--color-text-muted)',
                    cursor: 'not-allowed',
                  }}
                >
                  Insufficient Balance
                </button>
              ) : status === 'connecting' ? (
                <button
                  disabled
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    border: 'none',
                    fontSize: '16px',
                    fontWeight: 700,
                    backgroundColor: 'var(--color-border)',
                    color: 'var(--color-text-muted)',
                    cursor: 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <HugeiconsIcon icon={Loading01Icon} size={18} className="animate-spin" />
                  Connecting...
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    border: 'none',
                    fontSize: '16px',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <HugeiconsIcon icon={GasPipeIcon} size={18} />
                  Send {CONFIG.FEE} ETH
                </button>
              )}
            </>
          )}

          {/* AWAITING - Waiting for wallet confirmation */}
          {status === 'awaiting' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  border: '3px solid var(--color-border)',
                  borderTopColor: '#a855f7',
                  borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                  margin: '0 auto 16px',
                }}
              />
              <h3 style={{ margin: '0 0 8px', fontSize: '18px' }}>Confirm in Wallet</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', margin: 0 }}>
                Please approve the transaction in MetaMask...
              </p>
            </div>
          )}

          {/* CONFIRMING - Waiting for blockchain confirmation */}
          {status === 'confirming' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  border: '3px solid var(--color-border)',
                  borderTopColor: '#a855f7',
                  borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                  margin: '0 auto 16px',
                }}
              />
              <h3 style={{ margin: '0 0 8px', fontSize: '18px' }}>Confirming...</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', margin: '0 0 12px' }}>
                Waiting for block confirmation
              </p>
              {txHash && (
                <a
                  href={`${CONFIG.EXPLORER}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#a855f7',
                    fontSize: '13px',
                    textDecoration: 'none',
                  }}
                >
                  View on Explorer ↗
                </a>
              )}
            </div>
          )}

          {/* VERIFIED - Success! */}
          {status === 'verified' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '52px', marginBottom: '8px' }}>✅</div>
              <h3 style={{ margin: '0 0 8px', fontSize: '18px' }}>Payment Verified!</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', margin: 0 }}>
                Starting analysis...
              </p>
            </div>
          )}

          {/* FAILED State */}
          {status === 'failed' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '52px', marginBottom: '8px' }}>❌</div>
              <h3 style={{ margin: '0 0 12px', fontSize: '18px' }}>Payment Failed</h3>
              <p style={{ color: '#f87171', fontSize: '14px', margin: '0 0 16px' }}>
                {error}
              </p>
              <button
                onClick={() => {
                  setStatus('ready');
                  setError('');
                  initWallet();
                }}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Inject spinner keyframes
if (typeof document !== 'undefined' && !document.getElementById('pg-spin')) {
  const style = document.createElement('style');
  style.id = 'pg-spin';
  style.textContent = `@keyframes spin { to { transform: rotate(360deg) } }`;
  document.head.appendChild(style);
}
