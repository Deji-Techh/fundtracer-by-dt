import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '../providers/SolanaWalletProvider';
import { isValidSolanaAddress } from '../utils/addressDetection';
import { analyzeSolanaWallet, getSolanaFundingTree, detectSolanaSybil } from '../api/solana';
import '@solana/wallet-adapter-react-ui/styles.css';

export function SolanaPage() {
  const { publicKey, connected } = useWallet();
  const [address, setAddress] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<any>(null);

  useEffect(() => {
    if (connected && publicKey) {
      setAddress(publicKey.toString());
    }
  }, [connected, publicKey]);

  const handleAnalyze = async () => {
    if (!address.trim()) return;
    
    if (!isValidSolanaAddress(address.trim())) {
      setError('Please enter a valid Solana address');
      return;
    }

    setError('');
    setIsAnalyzing(true);
    setResults(null);

    try {
      const data = await analyzeSolanaWallet(address.trim());
      setResults(data);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze wallet');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      padding: '100px 24px 40px',
      background: 'var(--color-bg)',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}
      >
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          background: 'linear-gradient(135deg, #9945FF 0%, #14F195 100%)',
          borderRadius: '100px',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'white',
          marginBottom: '24px',
        }}>
          <span>BETA</span>
        </div>

        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          marginBottom: '16px',
        }}>
          Solana Wallet Analyzer
        </h1>

        <p style={{
          fontSize: '1.125rem',
          color: 'var(--color-text-secondary)',
          marginBottom: '24px',
          lineHeight: 1.6,
        }}>
          Analyze Solana wallets, detect Sybil patterns, and trace funding sources 
          using our advanced fee payer analysis and program interaction fingerprinting.
        </p>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '32px',
        }}>
          <WalletMultiButton style={{
            background: 'linear-gradient(135deg, #9945FF 0%, #14F195 100%)',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 24px',
            fontSize: '0.9375rem',
            fontWeight: 600,
            color: 'white',
            cursor: 'pointer',
          }} />
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          maxWidth: '500px',
          margin: '0 auto 40px',
        }}>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter Solana address (e.g., 7xKXtg...)"
            style={{
              flex: 1,
              padding: '14px 18px',
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              color: 'var(--color-text-primary)',
              fontSize: '0.9375rem',
              outline: 'none',
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
          />
          <button
            onClick={handleAnalyze}
            disabled={!address.trim() || isAnalyzing}
            style={{
              padding: '14px 28px',
              background: 'linear-gradient(135deg, #9945FF 0%, #14F195 100%)',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              fontSize: '0.9375rem',
              fontWeight: 600,
              cursor: address.trim() && !isAnalyzing ? 'pointer' : 'not-allowed',
              opacity: address.trim() && !isAnalyzing ? 1 : 0.6,
              transition: 'all 0.2s ease',
            }}
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              padding: '12px 20px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              color: '#ef4444',
              marginBottom: '24px',
              maxWidth: '500px',
              margin: '0 auto 24px',
            }}
          >
            {error}
          </motion.div>
        )}

        {results && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              maxWidth: '800px',
              margin: '0 auto',
            }}
          >
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '32px',
            }}>
              <div style={{
                padding: '20px',
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: '12px',
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                  Balance
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {results.walletInfo?.balance || '0'} SOL
                </div>
              </div>

              <div style={{
                padding: '20px',
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: '12px',
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                  Risk Score
                </div>
                <div style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: 600, 
                  color: results.riskScore?.score > 50 ? '#ef4444' : results.riskScore?.score > 25 ? '#f59e0b' : '#22c55e' 
                }}>
                  {results.riskScore?.score || 0}/100
                </div>
              </div>

              <div style={{
                padding: '20px',
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: '12px',
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                  Transactions
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {results.transactions?.length || 0}
                </div>
              </div>

              <div style={{
                padding: '20px',
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: '12px',
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                  Tokens
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {results.tokenBalances?.length || 0}
                </div>
              </div>
            </div>

            {results.walletInfo?.labels && results.walletInfo.labels.length > 0 && (
              <div style={{
                padding: '16px 20px',
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '8px',
                marginBottom: '24px',
              }}>
                <div style={{ fontSize: '0.75rem', color: '#22c55e', marginBottom: '4px' }}>
                  KNOWN ENTITY
                </div>
                <div style={{ fontWeight: 600, color: '#22c55e' }}>
                  {results.walletInfo.labels.join(', ')}
                </div>
              </div>
            )}

            {results.riskScore?.signals && results.riskScore.signals.filter((s: any) => s.detected).length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text-primary)' }}>
                  Risk Signals
                </h3>
                {results.riskScore.signals.filter((s: any) => s.detected).map((signal: any, i: number) => (
                  <div key={i} style={{
                    padding: '12px 16px',
                    background: signal.severity === 'critical' || signal.severity === 'high' 
                      ? 'rgba(239, 68, 68, 0.1)' 
                      : 'var(--color-bg-elevated)',
                    border: `1px solid ${signal.severity === 'critical' || signal.severity === 'high' ? 'rgba(239, 68, 68, 0.3)' : 'var(--color-border)'}`,
                    borderRadius: '8px',
                    marginBottom: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <span style={{ color: 'var(--color-text-primary)', fontSize: '0.875rem' }}>
                      {signal.name}
                    </span>
                    <span style={{ 
                      color: signal.severity === 'critical' ? '#ef4444' : signal.severity === 'high' ? '#f59e0b' : '#22c55e',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}>
                      {signal.severity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginTop: '60px',
        }}>
          {[
            { title: 'Fee Payer Analysis', desc: 'Detect sybils via shared fee payers' },
            { title: 'Funding Tracing', desc: 'Trace SOL origin from exchanges' },
            { title: 'Program Fingerprints', desc: 'Identify airdrop farmers' },
            { title: 'Risk Scoring', desc: '10+ Solana-specific signals' },
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              style={{
                padding: '24px',
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: '16px',
                textAlign: 'left',
              }}
            >
              <h3 style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                marginBottom: '8px',
              }}>
                {feature.title}
              </h3>
              <p style={{
                fontSize: '0.875rem',
                color: 'var(--color-text-secondary)',
              }}>
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export default SolanaPage;
