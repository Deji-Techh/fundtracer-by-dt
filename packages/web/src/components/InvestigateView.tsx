import React, { useState } from 'react';
import '../styles/AppShell.css';

interface Chain {
  id: string;
  name: string;
  color: string;
  tier?: string;
}

interface RecentItem {
  address: string;
  chain: string;
}

interface InvestigateViewProps {
  onAnalyze: (address: string, chain: string) => void;
  onSearch?: (query: string) => void;
}

export function InvestigateView({ onAnalyze, onSearch }: InvestigateViewProps) {
  const [activeTab, setActiveTab] = useState('wallet');
  const [activeChain, setActiveChain] = useState('ethereum');
  const [address, setAddress] = useState('');

  const chains: Chain[] = [
    { id: 'ethereum', name: 'Ethereum', color: '#627eea', tier: 'MAX' },
    { id: 'linea', name: 'Linea', color: '#00e676' },
    { id: 'arbitrum', name: 'Arbitrum', color: '#28a0f0', tier: 'PRO' },
    { id: 'base', name: 'Base', color: '#0052ff', tier: 'PRO' },
    { id: 'optimism', name: 'Optimism', color: '#ff0420', tier: 'MAX' },
    { id: 'polygon', name: 'Polygon', color: '#8247e5', tier: 'MAX' },
  ];

  const recentItems: RecentItem[] = [
    { address: '0x3fC9…a12E', chain: 'ETH' },
    { address: '0xdEaD…beef', chain: 'ARB' },
    { address: 'vitalik.eth', chain: 'BASE' },
    { address: '0x8f2C…3d91', chain: 'LINEA' },
  ];

  const handleAnalyze = () => {
    if (address.trim()) {
      onAnalyze(address.trim(), activeChain);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAnalyze();
    }
  };

  const handleRecentClick = (item: RecentItem) => {
    setAddress(item.address);
    const chain = chains.find(c => c.name.toLowerCase().startsWith(item.chain.toLowerCase()));
    if (chain) {
      setActiveChain(chain.id);
    }
  };

  const tabs = [
    { id: 'wallet', label: 'Wallet', icon: (
      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="1" width="10" height="10" rx="1"/>
        <path d="M3 4h6M3 6h6M3 8h3"/>
      </svg>
    )},
    { id: 'contract', label: 'Contract', icon: (
      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M1 11V4.5L6 1l5 3.5V11"/>
        <rect x="4" y="7" width="4" height="4"/>
      </svg>
    )},
    { id: 'compare', label: 'Compare', icon: (
      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="3.5" cy="6" r="2"/><circle cx="8.5" cy="6" r="2"/>
        <path d="M5.5 6h1M3.5 4V2M8.5 4V2"/>
      </svg>
    )},
    { id: 'sybil', label: 'Sybil', icon: (
      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M6 1l1.3 3H11l-2.7 2 1 3.3L6 7.5 3.7 9.3l1-3.3L2 4h3.7z"/>
      </svg>
    ), alert: '3 flags' },
  ];

  return (
    <>
      {/* Page Header */}
      <div className="ft-page-head">
        <div className="ft-page-title">Investigate</div>
        <div className="ft-page-desc">
          Analyze wallets, contracts, and detect Sybil patterns across multiple chains
        </div>
      </div>

      {/* Stats */}
      <div className="ft-stats">
        <div className="ft-stat">
          <div className="ft-stat-label">Chains indexed</div>
          <div className="ft-stat-val">6</div>
          <div className="ft-stat-note">+Linea recently</div>
        </div>
        <div className="ft-stat">
          <div className="ft-stat-label">Wallets traced</div>
          <div className="ft-stat-val">2.4M</div>
          <div className="ft-stat-note">+12k this week</div>
        </div>
        <div className="ft-stat">
          <div className="ft-stat-label">Sybil clusters</div>
          <div className="ft-stat-val">18.7K</div>
          <div className="ft-stat-note">3.2% flagged</div>
        </div>
        <div className="ft-stat">
          <div className="ft-stat-label">Avg response</div>
          <div className="ft-stat-val">0.4s</div>
          <div className="ft-stat-note">Indexer healthy</div>
        </div>
      </div>

      {/* Panel */}
      <div className="ft-panel">
        {/* Tabs */}
        <div className="ft-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`ft-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
              {tab.alert && <span className="ft-tab-alert">{tab.alert}</span>}
            </button>
          ))}
        </div>

        {/* Panel Body */}
        <div className="ft-panel-body">
          {/* Chains */}
          <div className="ft-field-label">Network</div>
          <div className="ft-chains">
            {chains.map(chain => (
              <div
                key={chain.id}
                className={`ft-chain ${activeChain === chain.id ? 'active' : ''}`}
                onClick={() => setActiveChain(chain.id)}
              >
                <div className="ft-chain-pip" style={{ background: chain.color }}></div>
                {chain.name}
                {chain.tier && <span className="ft-chain-tier">{chain.tier}</span>}
              </div>
            ))}
          </div>

          {/* Address Input */}
          <div className="ft-field-label">Wallet address</div>
          <div className="ft-addr-field">
            <div className="ft-addr-bar">
              <span className="ft-addr-label">{activeChain.toUpperCase()}</span>
              <div className="ft-addr-tools">
                <button className="ft-addr-tool" onClick={() => navigator.clipboard.readText().then(setAddress)}>
                  <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4">
                    <rect x="3" y="1" width="6" height="7" rx="0.5"/>
                    <path d="M1 3v6"/>
                  </svg>
                  Paste
                </button>
                <button className="ft-addr-tool">Recent</button>
                <button className="ft-addr-tool">Guide ↗</button>
              </div>
            </div>
            <input
              className="ft-addr-input"
              type="text"
              placeholder="0x… wallet address, ENS name, or contract"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyPress={handleKeyPress}
            />
          </div>

          <div className="ft-hint">
            Supports EVM addresses, ENS names, and transaction hashes. Separate multiple addresses with commas.
          </div>

          {/* Actions */}
          <div className="ft-actions">
            <button className="ft-btn-analyze" onClick={handleAnalyze}>
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="6" cy="6" r="4.5"/><path d="M9.5 9.5l3 3"/>
              </svg>
              Analyze Wallet
            </button>
            <button className="ft-btn-ghost">
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M1 6h10M7 2l4 4-4 4"/>
              </svg>
              Batch
            </button>
            <button className="ft-btn-ghost">
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 1v8M2 6l4 4 4-4M1 11h10"/>
              </svg>
              Export
            </button>
          </div>

          {/* Recent */}
          <div className="ft-recent">
            <div className="ft-recent-header">Recent</div>
            <div className="ft-recent-list">
              {recentItems.map((item, index) => (
                <div
                  key={index}
                  className="ft-recent-item"
                  onClick={() => handleRecentClick(item)}
                >
                  <span className="ft-recent-chain">{item.chain}</span>
                  {item.address}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default InvestigateView;
