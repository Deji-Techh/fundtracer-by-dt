import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '../providers/SolanaWalletProvider';
import { isValidSolanaAddress } from '../utils/addressDetection';
import { analyzeSolanaWallet, SolanaAnalysisResult } from '../api/solana';
import '@solana/wallet-adapter-react-ui/styles.css';
import './SolanaPage.css';

export function SolanaPage() {
  const navigate = useNavigate();
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

  const getRiskLevelClass = (level: string) => {
    switch (level) {
      case 'critical': return 'critical';
      case 'high': return 'high';
      case 'medium': return 'medium';
      default: return 'low';
    }
  };

  return (
    <div className="solana-page">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="solana-page__container"
      >
        {/* Header */}
        <div className="solana-page__header">
          <button className="solana-page__back-btn" onClick={() => navigate('/')}>
            ← Back
          </button>
          
          <div className="solana-page__badge">
            <span>BETA</span>
          </div>

          <h1 className="solana-page__title">Solana Wallet Analyzer</h1>

          <p className="solana-page__subtitle">
            Comprehensive wallet analysis with Sybil detection, funding trace, and risk scoring
          </p>

          <div className="solana-page__wallet-btn-wrapper">
            <WalletMultiButton />
          </div>

          <div className="solana-page__search">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter Solana address"
              className="solana-page__input"
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            />
            <button
              onClick={handleAnalyze}
              disabled={!address.trim() || isAnalyzing}
              className="solana-page__analyze-btn"
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>

          {error && (
            <div className="solana-page__error">{error}</div>
          )}
        </div>

        {/* Results */}
        {results && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Tab Navigation */}
            <div className="solana-page__tabs">
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
                  className={`solana-page__tab ${activeTab === tab.id ? 'solana-page__tab--active' : ''}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div>
                {/* Stats Grid */}
                <div className="solana-page__stats-grid">
                  <StatCard label="Balance" value={`${results.wallet.balance} SOL`} />
                  <StatCard 
                    label="Portfolio Value" 
                    value={`$${results.portfolio.totalValueUSD.toLocaleString()}`}
                    subValue={results.portfolio.tokens.length + ' tokens'}
                  />
                  <StatCard 
                    label="Risk Score" 
                    value={`${results.riskAnalysis.score}/100`}
                    colorClass={results.riskAnalysis.score > 50 ? 'negative' : results.riskAnalysis.score > 25 ? 'warning' : 'positive'}
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
                  <div className={`solana-page__risk-box solana-page__risk-box--${getRiskLevelClass(results.riskAnalysis.level)}`}>
                    <div className="solana-page__risk-header">
                      <span className={`solana-page__risk-badge solana-page__risk-badge--${getRiskLevelClass(results.riskAnalysis.level)}`}>
                        {results.riskAnalysis.level}
                      </span>
                      <span className="solana-page__risk-summary">
                        {results.riskAnalysis.summary}
                      </span>
                    </div>
                  </div>

                  {results.riskAnalysis.signals.filter((s: any) => s.detected).map((signal: any, i: number) => (
                    <div key={i} className="solana-page__signal">
                      <div>
                        <div className="solana-page__signal-name">{signal.name}</div>
                        {signal.details && (
                          <div className="solana-page__signal-details">{signal.details}</div>
                        )}
                      </div>
                      <span className={`solana-page__signal-weight solana-page__signal-weight--${signal.severity}`}>
                        +{signal.weight}
                      </span>
                    </div>
                  ))}
                </Section>

                {/* Transaction Summary */}
                <Section title="Transaction Summary">
                  <div className="solana-page__stats-grid solana-page__grid--small">
                    <StatCard label="Total Sent" value={results.transactions.summary.sent.toString()} subValue={`${results.transactions.summary.totalSent.toFixed(2)} SOL`} />
                    <StatCard label="Total Received" value={results.transactions.summary.received.toString()} subValue={`${results.transactions.summary.totalReceived.toFixed(2)} SOL`} />
                    <StatCard label="Failed" value={results.transactions.summary.failed.toString()} />
                    <StatCard label="Median Amount" value={`${results.transactions.summary.medianAmount.toFixed(4)} SOL`} />
                  </div>
                </Section>

                {/* Top Tokens */}
                <Section title="Top Holdings">
                  {results.portfolio.tokens.slice(0, 5).map((token: any, i: number) => (
                    <div key={i} className="solana-page__list-item">
                      <div>
                        <div className="solana-page__list-item-title">{token.symbol}</div>
                        <div className="solana-page__list-item-subtitle">{token.name}</div>
                      </div>
                      <div>
                        <div className="solana-page__list-item-value">${token.valueUSD.toFixed(2)}</div>
                        <div className="solana-page__list-item-subvalue">{token.balance.toFixed(4)} {token.symbol}</div>
                      </div>
                    </div>
                  ))}
                  {results.portfolio.tokens.length === 0 && (
                    <div className="solana-page__empty">No token holdings found</div>
                  )}
                </Section>
              </div>
            )}

            {/* Transactions Tab */}
            {activeTab === 'transactions' && (
              <Section title="Transaction History">
                <div className="solana-page__tx-list">
                  {results.transactions.list.slice(0, 50).map((tx: any, i: number) => (
                    <div key={i} className="solana-page__list-item">
                      <div>
                        <div className="solana-page__tx-hash">{formatAddress(tx.hash)}</div>
                        <div className="solana-page__tx-meta">
                          {formatDate(tx.timestamp)} • Fee: {tx.fee.toFixed(6)} SOL
                        </div>
                      </div>
                      <div>
                        <div className={`solana-page__tx-value ${tx.value > 0 ? 'solana-page__tx-value--positive' : ''}`}>
                          {tx.value > 0 ? '+' : ''}{tx.value.toFixed(4)} SOL
                        </div>
                        <div className={`solana-page__tx-status solana-page__tx-status--${tx.status === 'failed' ? 'failed' : 'success'}`}>
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
                <div className="solana-page__grid">
                  {results.portfolio.tokens.map((token: any, i: number) => (
                    <div key={i} className="solana-page__list-item">
                      <div>
                        <div className="solana-page__list-item-title">{token.symbol}</div>
                        <div className="solana-page__list-item-subtitle">{token.name}</div>
                      </div>
                      <div>
                        <div className="solana-page__list-item-value">${token.valueUSD.toLocaleString()}</div>
                        <div className="solana-page__list-item-subvalue">{token.balance.toFixed(4)} {token.symbol}</div>
                      </div>
                    </div>
                  ))}
                  {results.portfolio.tokens.length === 0 && (
                    <div className="solana-page__empty">No tokens found</div>
                  )}
                </div>
              </Section>
            )}

            {/* NFTs Tab */}
            {activeTab === 'nfts' && (
              <Section title="NFT Holdings">
                <div className="solana-page__nft-grid">
                  {results.nfts.holdings.slice(0, 20).map((nft: any, i: number) => (
                    <div key={i} className="solana-page__nft-card">
                      <div 
                        className="solana-page__nft-image"
                        style={{
                          backgroundImage: nft.content?.links?.image ? `url(${nft.content.links.image})` : undefined,
                        }}
                      />
                      <div className="solana-page__nft-name">
                        {nft.content?.metadata?.name || 'Unnamed NFT'}
                      </div>
                    </div>
                  ))}
                </div>
                {results.nfts.holdings.length === 0 && (
                  <div className="solana-page__empty">No NFTs found</div>
                )}
              </Section>
            )}

            {/* Programs Tab */}
            {activeTab === 'programs' && (
              <Section title="Program Interactions">
                <div className="solana-page__grid">
                  {results.programInteractions.map((prog: any, i: number) => (
                    <div key={i} className="solana-page__list-item">
                      <div>
                        <div className="solana-page__list-item-title">{prog.name}</div>
                        <div className="solana-page__list-item-subtitle">
                          {formatAddress(prog.programId)} • {prog.category}
                        </div>
                      </div>
                      <div>
                        <div className="solana-page__list-item-value">{prog.interactionCount}</div>
                        <div className="solana-page__list-item-subvalue">{prog.percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                  {results.programInteractions.length === 0 && (
                    <div className="solana-page__empty">No program interactions found</div>
                  )}
                </div>
              </Section>
            )}

            {/* Sybil Tab */}
            {activeTab === 'sybil' && (
              <Section title="Sybil Detection Analysis">
                <div className={`solana-page__sybil-status solana-page__sybil-status--${results.sybilDetection.detected ? 'detected' : 'clean'}`}>
                  <div className={`solana-page__sybil-title solana-page__sybil-title--${results.sybilDetection.detected ? 'detected' : 'clean'}`}>
                    {results.sybilDetection.detected ? 'Sybil Detected' : 'No Sybil Activity'}
                  </div>
                  <div className="solana-page__sybil-confidence">
                    Confidence: {results.sybilDetection.confidence}%
                  </div>
                </div>

                {results.sybilDetection.signals.map((signal: any, i: number) => (
                  <div key={i} className={`solana-page__sybil-signal ${signal.detected ? 'solana-page__sybil-signal--detected' : ''}`}>
                    <div className="solana-page__sybil-signal-header">
                      <span className="solana-page__sybil-signal-name">{signal.name}</span>
                      <span className={`solana-page__sybil-signal-status solana-page__sybil-signal-status--${signal.detected ? 'detected' : 'clean'}`}>
                        {signal.detected ? 'DETECTED' : 'Clean'}
                      </span>
                    </div>
                    {signal.details && (
                      <div className="solana-page__sybil-signal-details">{signal.details}</div>
                    )}
                  </div>
                ))}
              </Section>
            )}

            {/* Funding Tab */}
            {activeTab === 'funding' && (
              <Section title="Funding Trace">
                <div className={`solana-page__funding-source solana-page__funding-source--${results.fundingTrace.riskLevel}`}>
                  <div className="solana-page__funding-source-label">ULTIMATE SOURCE</div>
                  <div className="solana-page__funding-source-address">
                    {results.fundingTrace.ultimateSource ? formatAddress(results.fundingTrace.ultimateSource) : 'Unknown'}
                  </div>
                  <div className="solana-page__funding-source-type">
                    Type: {results.fundingTrace.sourceType || 'Unknown'}
                  </div>
                </div>

                <div className="solana-page__funding-hops-label">Recent funding hops:</div>

                {results.fundingTrace.hops.map((hop: any, i: number) => (
                  <div key={i} className="solana-page__funding-hop">
                    <div className="solana-page__funding-hop-addr">
                      <div className="solana-page__funding-hop-label">From</div>
                      <div className="solana-page__funding-hop-value">{formatAddress(hop.from)}</div>
                    </div>
                    <div className="solana-page__funding-hop-arrow">→</div>
                    <div className="solana-page__funding-hop-addr solana-page__funding-hop-addr--to" style={{ textAlign: 'right' }}>
                      <div className="solana-page__funding-hop-label">To</div>
                      <div className="solana-page__funding-hop-value">{formatAddress(hop.to)}</div>
                    </div>
                    <div className="solana-page__funding-hop-amount">
                      <div className="solana-page__funding-hop-label">Value</div>
                      <div className="solana-page__funding-hop-sol">{hop.value.toFixed(4)} SOL</div>
                    </div>
                  </div>
                ))}

                {results.fundingTrace.hops.length === 0 && (
                  <div className="solana-page__empty">No incoming transactions found</div>
                )}
              </Section>
            )}
          </motion.div>
        )}

        {/* Features Grid (when no results) */}
        {!results && (
          <div className="solana-page__features">
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
                className="solana-page__feature-card"
              >
                <h3 className="solana-page__feature-title">{feature.title}</h3>
                <p className="solana-page__feature-desc">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

function StatCard({ label, value, subValue, colorClass }: { label: string; value: string; subValue?: string; colorClass?: string }) {
  return (
    <div className="solana-page__stat-card">
      <div className="solana-page__stat-label">{label}</div>
      <div className={`solana-page__stat-value ${colorClass ? `solana-page__stat-value--${colorClass}` : ''}`}>
        {value}
      </div>
      {subValue && (
        <div className="solana-page__stat-subvalue">{subValue}</div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="solana-page__section">
      <h3 className="solana-page__section-title">{title}</h3>
      {children}
    </div>
  );
}

export default SolanaPage;
