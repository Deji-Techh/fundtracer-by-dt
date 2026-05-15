import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Shield, ShieldAlert, ShieldCheck, ChevronDown, ChevronUp, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export interface AnalysisTableData {
  address: string;
  chain: string;
  type: 'wallet' | 'contract';
  label?: string;
  riskScore?: number;
  riskLevel?: string;
  totalTransactions?: number;
  totalValueSent?: number;
  totalValueReceived?: number;
  activityPeriodDays?: number;
  balance?: number;
  firstSeen?: string;
  lastSeen?: string;
  flags?: string[];
  topInteractions?: Array<{ address: string; label: string; count: number }>;
  fundingSources?: string[];
  tokenHoldings?: Array<{ symbol: string; balance: string; value: string }>;
  sybilCluster?: { detected: boolean; clusterSize: number; similarityScore?: number };
  contractName?: string;
  contractType?: string;
  contractVerified?: boolean;
  deployer?: string;
  holders?: number;
  isHoneypot?: boolean;
  isMintable?: boolean;
  isPaused?: boolean;
  securityFindings?: string[];
  externalTransfers?: Array<{
    hash: string;
    from: string;
    to: string;
    value: string;
    asset: string;
    category: string;
    timestamp?: string;
    blockNum?: string;
  }>;
  externalBalance?: number;
}

function AnimatedSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <motion.div 
      className="ai-skeleton-table"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {Array.from({ length: rows }).map((_, i) => (
        <motion.div
          key={i}
          className="ai-skeleton-row"
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.08, ease: "easeInOut" }}
        >
          <div className="ai-skeleton-cell ai-skeleton-label" />
          <div className="ai-skeleton-cell ai-skeleton-value" />
        </motion.div>
      ))}
    </motion.div>
  );
}

function RiskBadge({ score, level }: { score?: number; level?: string }) {
  if (score === undefined && !level) return <span className="ai-badge ai-badge-muted">N/A</span>;

  const numericScore = typeof score === 'number' ? score : 0;
  let color = 'ai-badge-safe';
  let Icon = ShieldCheck;
  let label = level || 'Unknown';

  if (numericScore >= 70 || level === 'critical') {
    color = 'ai-badge-critical';
    Icon = AlertTriangle;
  } else if (numericScore >= 40 || level === 'high') {
    color = 'ai-badge-warning';
    Icon = ShieldAlert;
  } else if (numericScore >= 15 || level === 'medium') {
    color = 'ai-badge-medium';
    Icon = Shield;
  } else {
    color = 'ai-badge-safe';
    Icon = ShieldCheck;
  }

  return (
    <span className={`ai-badge ${color}`}>
      <Icon size={12} />
      <span>{label}</span>
      <span className="ai-badge-score">{numericScore}/100</span>
    </span>
  );
}

function TableRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="ai-table-row">
      <div className="ai-table-label">{label}</div>
      <div className={`ai-table-value ${mono ? 'mono' : ''}`}>{value}</div>
    </div>
  );
}

interface ExpandableSectionProps {
  title: string;
  count?: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function ExpandableSection({ title, count, children, defaultOpen = false }: ExpandableSectionProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="ai-expandable-section">
      <button className="ai-expandable-header" onClick={() => setOpen(!open)}>
        <span className="ai-expandable-title">
          {title}
          {count !== undefined && <span className="ai-expandable-count">{count}</span>}
        </span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="ai-expandable-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AiAnalysisTableSkeleton() {
  return (
    <motion.div
      className="ai-message ai-message-assistant"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="ai-message-avatar">
        <Shield size={14} />
      </div>
      <div className="ai-message-body" style={{ width: '100%' }}>
        <div className="ai-analysis-header-skeleton">
          <div className="ai-skeleton-bar" style={{ width: '60%', height: 14 }} />
          <div className="ai-skeleton-bar" style={{ width: '40%', height: 10, marginTop: 6 }} />
        </div>
        <AnimatedSkeleton rows={8} />
      </div>
    </motion.div>
  );
}

export function AiAnalysisTable({ data }: { data: AnalysisTableData }) {
  const isWallet = data.type === 'wallet';
  const chainLabel = data.chain.toUpperCase();

  return (
    <motion.div
      className="ai-message ai-message-assistant ai-analysis-message"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="ai-message-avatar">
        <Shield size={14} />
      </div>
      <div className="ai-message-body" style={{ width: '100%', maxWidth: '100%' }}>
        <motion.div 
          className="ai-analysis-table-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          {/* Header */}
          <div className="ai-analysis-header">
            <div className="ai-analysis-header-top">
              <h3 className="ai-analysis-title">
                {isWallet ? 'Wallet Analysis' : 'Contract Analysis'}
              </h3>
              <span className="ai-analysis-chain-badge" style={{
                borderColor: getChainColor(data.chain),
                background: `${getChainColor(data.chain)}15`,
                color: getChainColor(data.chain)
              }}>
                {chainLabel}
              </span>
            </div>
            <code className="ai-analysis-address">{data.address}</code>
          </div>

          {/* Primary Data Table */}
          <div className="ai-table">
            {isWallet ? (
              <>
                <TableRow label="Risk Level" value={<RiskBadge score={data.riskScore} level={data.riskLevel} />} />
                <TableRow label="Total Transactions" value={data.totalTransactions?.toLocaleString() ?? 'N/A'} />
                <TableRow label="Total Value Sent" value={data.totalValueSent !== undefined ? `${Number(data.totalValueSent).toFixed(4)} ETH` : 'N/A'} />
                <TableRow label="Total Value Received" value={data.totalValueReceived !== undefined ? `${Number(data.totalValueReceived).toFixed(4)} ETH` : 'N/A'} />
                <TableRow label="Balance" value={data.balance !== undefined ? `${Number(data.balance).toFixed(4)} ETH` : 'N/A'} />
                <TableRow label="First Seen" value={data.firstSeen || 'N/A'} />
                <TableRow label="Last Active" value={data.lastSeen || 'N/A'} />
              </>
            ) : (
              <>
                <TableRow label="Contract Name" value={data.contractName || 'N/A'} />
                <TableRow label="Contract Type" value={data.contractType || 'N/A'} />
                <TableRow label="Verified" value={data.contractVerified ? 'Yes' : 'No'} />
                <TableRow label="Risk Level" value={<RiskBadge score={data.riskScore} level={data.riskLevel} />} />
                <TableRow label="Deployer" value={data.deployer ? <code>{data.deployer.slice(0, 10)}...{data.deployer.slice(-4)}</code> : 'N/A'} mono />
                <TableRow label="Holders" value={data.holders?.toLocaleString() ?? 'N/A'} />
                {data.isHoneypot && <TableRow label="Honeypot Risk" value={<span className="ai-badge ai-badge-critical">DETECTED</span>} />}
                {data.isMintable && <TableRow label="Mintable" value={<span className="ai-badge ai-badge-warning">Yes — potential risk</span>} />}
                {data.isPaused && <TableRow label="Status" value={<span className="ai-badge ai-badge-warning">Paused</span>} />}
              </>
            )}
          </div>

          {/* Flags */}
          {data.flags && data.flags.length > 0 && (
            <ExpandableSection title="Risk Flags" count={data.flags.length}>
              <ul className="ai-flags-list">
                {data.flags.map((flag, i) => (
                  <li key={i} className="ai-flag-item">
                    <AlertTriangle size={12} className="ai-flag-icon" />
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            </ExpandableSection>
          )}

          {/* Recent Transfers (from external API) */}
          {isWallet && data.externalTransfers && data.externalTransfers.length > 0 && (
            <ExpandableSection title="Recent Transfers" count={data.externalTransfers.length}>
              <div className="ai-table">
                <div className="ai-table-row ai-table-header">
                  <div className="ai-table-label">Type</div>
                  <div className="ai-table-value mono">Value</div>
                  <div className="ai-table-value">Asset</div>
                </div>
                {data.externalTransfers.slice(0, 20).map((tx, i) => {
                  const isOutgoing = tx.from.toLowerCase() === data.address.toLowerCase();
                  return (
                    <div className="ai-table-row" key={i} style={{ opacity: 0.85 }}>
                      <div className="ai-table-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {isOutgoing ? <ArrowUpRight size={10} color="#f97316" /> : <ArrowDownLeft size={10} color="#4ade80" />}
                        <span>{isOutgoing ? 'Out' : 'In'}</span>
                      </div>
                      <div className="ai-table-value mono" style={{ fontSize: 11 }}>
                        {parseFloat(tx.value).toFixed(4)}
                      </div>
                      <div className="ai-table-value" style={{ fontSize: 11 }}>
                        {tx.asset === 'ETH' ? 'ETH' : (tx.asset?.length > 8 ? tx.asset.slice(0, 6) + '...' : tx.asset)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ExpandableSection>
          )}

          {/* Token Holdings */}
          {isWallet && data.tokenHoldings && data.tokenHoldings.length > 0 && (
            <ExpandableSection title="Token Holdings" count={data.tokenHoldings.length}>
              <div className="ai-table">
                <div className="ai-table-row ai-table-header">
                  <div className="ai-table-label">Token</div>
                  <div className="ai-table-value">Balance</div>
                  <div className="ai-table-value">Value</div>
                </div>
                {data.tokenHoldings.map((token, i) => (
                  <div className="ai-table-row" key={i}>
                    <div className="ai-table-label">{token.symbol}</div>
                    <div className="ai-table-value mono">{token.balance}</div>
                    <div className="ai-table-value">{token.value}</div>
                  </div>
                ))}
              </div>
            </ExpandableSection>
          )}

          {/* Top Interactions */}
          {isWallet && data.topInteractions && data.topInteractions.length > 0 && (
            <ExpandableSection title="Top Interactions" count={data.topInteractions.length}>
              <div className="ai-table">
                <div className="ai-table-row ai-table-header">
                  <div className="ai-table-label">Project</div>
                  <div className="ai-table-value mono">Address</div>
                  <div className="ai-table-value">Count</div>
                </div>
                {data.topInteractions.map((interaction, i) => (
                  <div className="ai-table-row" key={i}>
                    <div className="ai-table-label">{interaction.label || 'Unknown'}</div>
                    <div className="ai-table-value mono">{interaction.address.slice(0, 6)}...{interaction.address.slice(-4)}</div>
                    <div className="ai-table-value">{interaction.count.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </ExpandableSection>
          )}

          {/* Funding Sources */}
          {isWallet && data.fundingSources && data.fundingSources.length > 0 && (
            <ExpandableSection title="Funding Sources" count={data.fundingSources.length}>
              <div className="ai-address-list">
                {data.fundingSources.map((source, i) => (
                  <code key={i} className="ai-address-chip">{source}</code>
                ))}
              </div>
            </ExpandableSection>
          )}

          {/* Sybil Cluster */}
          {isWallet && data.sybilCluster?.detected && (
            <ExpandableSection title="Sybil Cluster Detected" defaultOpen>
              <div className="ai-table">
                <TableRow label="Cluster Size" value={`${data.sybilCluster.clusterSize} wallets`} />
                <TableRow label="Similarity" value={data.sybilCluster.similarityScore !== undefined ? `${(data.sybilCluster.similarityScore * 100).toFixed(1)}%` : 'N/A'} />
              </div>
            </ExpandableSection>
          )}

          {/* Contract Security Findings */}
          {!isWallet && data.securityFindings && data.securityFindings.length > 0 && (
            <ExpandableSection title="Security Findings" count={data.securityFindings.length} defaultOpen>
              <ul className="ai-flags-list">
                {data.securityFindings.map((finding, i) => (
                  <li key={i} className="ai-flag-item">
                    <AlertTriangle size={12} className="ai-flag-icon" />
                    <span>{finding}</span>
                  </li>
                ))}
              </ul>
            </ExpandableSection>
          )}

          {/* Context hint */}
          <div className="ai-analysis-context-hint">
            This {isWallet ? 'wallet' : 'contract'} is loaded in context. Ask me anything about it!
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function getChainColor(chain: string): string {
  const colors: Record<string, string> = {
    ethereum: '#627eea',
    linea: '#61dfff',
    arbitrum: '#28a0f0',
    base: '#0052ff',
    optimism: '#ff0420',
    polygon: '#8247e5',
    bsc: '#f3ba2f',
    solana: '#9945ff',
  };
  return colors[chain.toLowerCase()] || '#7F77DD';
}

export default AiAnalysisTable;
