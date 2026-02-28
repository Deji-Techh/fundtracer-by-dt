import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '../providers/SolanaWalletProvider';
import { isValidSolanaAddress } from '../utils/addressDetection';
import { analyzeSolanaWallet, SolanaAnalysisResult } from '../api/solana';
import '@solana/wallet-adapter-react-ui/styles.css';

export function SolanaPage() {
  const { publicKey, connected } = useWallet();
  const [address, setAddress] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<SolanaAnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'tokens' | 'nfts' | 'programs' | 'sybil' | 'funding'>('overview');

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

  const formatAddress = (addr: string) => addr.slice(0, 6) + '...' + addr.slice(-4);
  const formatDate = (ts: number | null) => ts ? new Date(ts).toLocaleDateString() : 'N/A';
  const formatNumber = (num: number) => new Intl.NumberFormat().format(num);

  return (
    <div style={{
      minHeight: '100vh',
      padding: '100px 24px 40px',
      background: 'var(--color-bg)',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ maxWidth: '1200px', margin: '0 auto' }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
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
            marginBottom: '16px',
          }}>
            <span>BETA</span>
          </div>

          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            marginBottom: '12px',
          }}>
            Solana Wallet Analyzer
          </h1>

          <p style={{
            fontSize: '1.125rem',
            color: 'var(--color-text-secondary)',
            marginBottom: '24px',
          }}>
            Comprehensive wallet analysis with Sybil detection, funding trace, and risk scoring
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
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

          <div style={{ display: 'flex', gap: '12px', maxWidth: '500px', margin: '0 auto' }}>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter Solana address"
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
              }}
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>

          {error && (
            <div style={{
              padding: '12px 20px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              color: '#ef4444',
              marginTop: '16px',
              maxWidth: '500px',
              margin: '16px auto 0',
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Results */}
        {results && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Tab Navigation */}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '24px',
              overflowX: 'auto',
              paddingBottom: '8px',
            }}>
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'transactions', label: 'Transactions' },
                { id: 'tokens', label: 'Tokens' },
                { id: 'nfts', label: 'NFTs' },
                { id: 'programs', label: 'Programs' },
                { id: 'sybil', label: 'Sybil Detection' },
                { id: 'funding', label: 'Funding Trace' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    padding: '10px 20px',
                    background: activeTab === tab.id ? 'linear-gradient(135deg, #9945FF 0%, #14F195 100%)' : 'var(--color-bg-elevated)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    color: activeTab === tab.id ? 'white' : 'var(--color-text-secondary)',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div>
                {/* Stats Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px',
                  marginBottom: '24px',
                }}>
                  <StatCard label="Balance" value={`${results.wallet.balance} SOL`} />
                  <StatCard 
                    label="Portfolio Value" 
                    value={`$${results.portfolio.totalValueUSD.toLocaleString()}`}
                    subValue={results.portfolio.tokens.length + ' tokens'}
                  />
                  <StatCard 
                    label="Risk Score" 
                    value={`${results.riskAnalysis.score}/100`}
                    color={results.riskAnalysis.score > 50 ? '#ef4444' : results.riskAnalysis.score > 25 ? '#f59e0b' : '#22c55e'}
                  />
                  <StatCard label="Transactions" value={results.transactions.summary.total.toString()} />
                  <StatCard label="NFTs" value={results.nfts.holdings.length.toString()} />
                  <StatCard 
                    label="Wallet Age" 
                    value={results.wallet.firstSeen ? formatDate(results.wallet.firstSeen) : 'Unknown'}
                  />
                </div>

                {/* Risk Analysis Summary */}
                <Section title="Risk Analysis">
                  <div style={{
                    padding: '16px',
                    background: results.riskAnalysis.level === 'critical' ? 'rgba(239, 68, 68, 0.1)' :
                               results.riskAnalysis.level === 'high' ? 'rgba(245, 158, 11, 0.1)' :
                               results.riskAnalysis.level === 'medium' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                    border: `1px solid ${results.riskAnalysis.level === 'critical' ? 'rgba(239, 68, 68, 0.3)' :
                                              results.riskAnalysis.level === 'high' ? 'rgba(245, 158, 11, 0.3)' :
                                              results.riskAnalysis.level === 'medium' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
                    borderRadius: '12px',
                    marginBottom: '16px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '100px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        background: results.riskAnalysis.level === 'critical' ? '#ef4444' :
                                   results.riskAnalysis.level === 'high' ? '#f59e0b' :
                                   results.riskAnalysis.level === 'medium' ? '#3b82f6' : '#22c55e',
                        color: 'white',
                      }}>
                        {results.riskAnalysis.level}
                      </span>
                      <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                        {results.riskAnalysis.summary}
                      </span>
                    </div>
                  </div>

                  {results.riskAnalysis.signals.filter((s: any) => s.detected).map((signal: any, i: number) => (
                    <div key={i} style={{
                      padding: '12px 16px',
                      background: 'var(--color-bg-elevated)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ color: 'var(--color-text-primary)', fontSize: '0.875rem', fontWeight: 500 }}>
                          {signal.name}
                        </div>
                        {signal.details && (
                          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '2px' }}>
                            {signal.details}
                          </div>
                        )}
                      </div>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.625rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        background: signal.severity === 'critical' ? 'rgba(239, 68, 68, 0.2)' :
                                   signal.severity === 'high' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                        color: signal.severity === 'critical' ? '#ef4444' :
                               signal.severity === 'high' ? '#f59e0b' : '#3b82f6',
                      }}>
                        +{signal.weight}
                      </span>
                    </div>
                  ))}
                </Section>

                {/* Transaction Summary */}
                <Section title="Transaction Summary">
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '12px',
                  }}>
                    <StatCard label="Total Sent" value={results.transactions.summary.sent.toString()} subValue={`${results.transactions.summary.totalSent.toFixed(2)} SOL`} />
                    <StatCard label="Total Received" value={results.transactions.summary.received.toString()} subValue={`${results.transactions.summary.totalReceived.toFixed(2)} SOL`} />
                    <StatCard label="Failed" value={results.transactions.summary.failed.toString()} />
                    <StatCard label="Median Amount" value={`${results.transactions.summary.medianAmount.toFixed(4)} SOL`} />
                  </div>
                </Section>

                {/* Top Tokens */}
                <Section title="Top Holdings">
                  {results.portfolio.tokens.slice(0, 5).map((token: any, i: number) => (
                    <div key={i} style={{
                      padding: '12px 16px',
                      background: 'var(--color-bg-elevated)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{token.symbol}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{token.name}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>${token.valueUSD.toFixed(2)}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{token.balance.toFixed(4)} {token.symbol}</div>
                      </div>
                    </div>
                  ))}
                  {results.portfolio.tokens.length === 0 && (
                    <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px' }}>
                      No token holdings found
                    </div>
                  )}
                </Section>
              </div>
            )}

            {/* Transactions Tab */}
            {activeTab === 'transactions' && (
              <Section title="Transaction History">
                <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  {results.transactions.list.slice(0, 50).map((tx: any, i: number) => (
                    <div key={i} style={{
                      padding: '12px 16px',
                      background: 'var(--color-bg-elevated)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontFamily: 'monospace', color: 'var(--color-text-primary)', fontSize: '0.875rem' }}>
                          {formatAddress(tx.hash)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {formatDate(tx.timestamp)} • Fee: {tx.fee.toFixed(6)} SOL
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ 
                          color: tx.value > 0 ? '#22c55e' : 'var(--color-text-primary)',
                          fontWeight: 500 
                        }}>
                          {tx.value > 0 ? '+' : ''}{tx.value.toFixed(4)} SOL
                        </div>
                        <div style={{ 
                          fontSize: '0.75rem',
                          color: tx.status === 'failed' ? '#ef4444' : '#22c55e'
                        }}>
                          {tx.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Tokens Tab */}
            {activeTab === 'tokens' && (
              <Section title="Token Holdings">
                <div style={{ display: 'grid', gap: '8px' }}>
                  {results.portfolio.tokens.map((token: any, i: number) => (
                    <div key={i} style={{
                      padding: '16px',
                      background: 'var(--color-bg-elevated)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{token.symbol}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{token.name}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          ${token.valueUSD.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {token.balance.toFixed(4)} {token.symbol}
                        </div>
                      </div>
                    </div>
                  ))}
                  {results.portfolio.tokens.length === 0 && (
                    <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '40px' }}>
                      No tokens found
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* NFTs Tab */}
            {activeTab === 'nfts' && (
              <Section title="NFT Holdings">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
                  {results.nfts.holdings.slice(0, 20).map((nft: any, i: number) => (
                    <div key={i} style={{
                      padding: '12px',
                      background: 'var(--color-bg-elevated)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      textAlign: 'center',
                    }}>
                      <div style={{
                        width: '100%',
                        height: '120px',
                        background: 'var(--color-bg)',
                        borderRadius: '8px',
                        marginBottom: '8px',
                        backgroundImage: nft.content?.links?.image ? `url(${nft.content.links.image})` : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }} />
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {nft.content?.metadata?.name || 'Unnamed NFT'}
                      </div>
                    </div>
                  ))}
                </div>
                {results.nfts.holdings.length === 0 && (
                  <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '40px' }}>
                    No NFTs found
                  </div>
                )}
              </Section>
            )}

            {/* Programs Tab */}
            {activeTab === 'programs' && (
              <Section title="Program Interactions">
                <div style={{ display: 'grid', gap: '8px' }}>
                  {results.programInteractions.map((prog: any, i: number) => (
                    <div key={i} style={{
                      padding: '16px',
                      background: 'var(--color-bg-elevated)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {prog.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {formatAddress(prog.programId)} • {prog.category}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {prog.interactionCount}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {prog.percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                  {results.programInteractions.length === 0 && (
                    <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '40px' }}>
                      No program interactions found
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* Sybil Tab */}
            {activeTab === 'sybil' && (
              <Section title="Sybil Detection Analysis">
                <div style={{
                  padding: '20px',
                  background: results.sybilDetection.detected ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                  border: `1px solid ${results.sybilDetection.detected ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
                  borderRadius: '12px',
                  marginBottom: '20px',
                  textAlign: 'center',
                }}>
                  <div style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: 700,
                    color: results.sybilDetection.detected ? '#ef4444' : '#22c55e',
                    marginBottom: '8px',
                  }}>
                    {results.sybilDetection.detected ? 'Sybil Detected' : 'No Sybil Activity'}
                  </div>
                  <div style={{ color: 'var(--color-text-secondary)' }}>
                    Confidence: {results.sybilDetection.confidence}%
                  </div>
                </div>

                {results.sybilDetection.signals.map((signal: any, i: number) => (
                  <div key={i} style={{
                    padding: '12px 16px',
                    background: signal.detected ? 'rgba(239, 68, 68, 0.1)' : 'var(--color-bg-elevated)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    marginBottom: '8px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{signal.name}</span>
                      <span style={{ 
                        color: signal.detected ? '#ef4444' : '#22c55e',
                        fontWeight: 600,
                      }}>
                        {signal.detected ? 'DETECTED' : 'Clean'}
                      </span>
                    </div>
                    {signal.details && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                        {signal.details}
                      </div>
                    )}
                  </div>
                ))}
              </Section>
            )}

            {/* Funding Tab */}
            {activeTab === 'funding' && (
              <Section title="Funding Trace">
                <div style={{
                  padding: '20px',
                  background: results.fundingTrace.riskLevel === 'high' ? 'rgba(239, 68, 68, 0.1)' :
                             results.fundingTrace.riskLevel === 'medium' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                  border: `1px solid ${results.fundingTrace.riskLevel === 'high' ? 'rgba(239, 68, 68, 0.3)' :
                                              results.fundingTrace.riskLevel === 'medium' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
                  borderRadius: '12px',
                  marginBottom: '20px',
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                    ULTIMATE SOURCE
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {results.fundingTrace.ultimateSource ? formatAddress(results.fundingTrace.ultimateSource) : 'Unknown'}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    Type: {results.fundingTrace.sourceType || 'Unknown'}
                  </div>
                </div>

                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
                  Recent funding hops:
                </div>

                {results.fundingTrace.hops.map((hop: any, i: number) => (
                  <div key={i} style={{
                    padding: '12px 16px',
                    background: 'var(--color-bg-elevated)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>From</div>
                      <div style={{ fontFamily: 'monospace', color: 'var(--color-text-primary)' }}>
                        {formatAddress(hop.from)}
                      </div>
                    </div>
                    <div style={{ color: 'var(--color-text-muted)' }}>→</div>
                    <div style={{ flex: 1, textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>To</div>
                      <div style={{ fontFamily: 'monospace', color: 'var(--color-text-primary)' }}>
                        {formatAddress(hop.to)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Value</div>
                      <div style={{ color: '#22c55e', fontWeight: 500 }}>{hop.value.toFixed(4)} SOL</div>
                    </div>
                  </div>
                ))}

                {results.fundingTrace.hops.length === 0 && (
                  <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '40px' }}>
                    No incoming transactions found
                  </div>
                )}
              </Section>
            )}
          </motion.div>
        )}

        {/* Features Grid (when no results) */}
        {!results && (
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
              { title: 'Risk Scoring', desc: '15+ Solana-specific signals' },
              { title: 'NFT Analysis', desc: 'Spam NFT detection' },
              { title: 'Batch Detection', desc: 'Identify coordinated activity' },
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
        )}
      </motion.div>
    </div>
  );
}

function StatCard({ label, value, subValue, color }: { label: string; value: string; subValue?: string; color?: string }) {
  return (
    <div style={{
      padding: '16px',
      background: 'var(--color-bg-elevated)',
      border: '1px solid var(--color-border)',
      borderRadius: '12px',
    }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.125rem', fontWeight: 600, color: color || 'var(--color-text-primary)' }}>
        {value}
      </div>
      {subValue && (
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
          {subValue}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <h3 style={{
        fontSize: '1.125rem',
        fontWeight: 600,
        color: 'var(--color-text-primary)',
        marginBottom: '16px',
      }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

export default SolanaPage;
