/**
 * GraphView - Wallet Connection Flow
 * Lightweight visual flow showing wallet connections with entity labels
 */

import React, { useState, useCallback } from 'react';
import { ChainId } from '@fundtracer/core';
import { getAuthToken, API_BASE } from '../../api';
import './GraphView.css';
import './InvestigateView.css';

interface GraphViewProps {
  selectedChain?: ChainId;
}

interface FlowNode {
  id: string;
  address: string;
  depth: number;
  direction: 'source' | 'destination' | 'both';
  totalValue: string;
  totalValueInEth: number;
  txCount: number;
  name?: string;
  category?: string;
  verified?: boolean;
  confidence?: number;
}

interface FlowEdge {
  source: string;
  target: string;
  value: number;
}

const CATEGORY_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  cex:     { bg: '#1a1508', border: '#f59e0b', text: '#fbbf24' },
  dex:     { bg: '#140a1a', border: '#9966ff', text: '#b388ff' },
  bridge:  { bg: '#08151a', border: '#00d4ff', text: '#66e0ff' },
  mixer:   { bg: '#1a0808', border: '#ff3366', text: '#ff6688' },
  lending: { bg: '#0a1a14', border: '#00ff88', text: '#66ffaa' },
  protocol:{ bg: '#0a0a1a', border: '#4488ff', text: '#77aaff' },
  wallet:  { bg: '#111118', border: '#555566', text: '#888899' },
};

const DEFAULT_STYLE = { bg: '#111118', border: '#555566', text: '#888899' };

function shortenAddress(addr: string) {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatValue(eth: number): string {
  if (eth >= 1000) return `${(eth / 1000).toFixed(1)}k ETH`;
  return `${eth.toFixed(eth < 0.01 ? 6 : 4)} ETH`;
}

export function GraphView({ selectedChain = 'linea' }: GraphViewProps) {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<FlowEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const handleLoadGraph = useCallback(async () => {
    if (!address.trim()) return;

    setLoading(true);
    setError('');
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Authentication required. Please log in to use the graph view.');
      }

      const response = await fetch(`${API_BASE}/api/analyze/expand-node`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          address: address.trim(),
          chain: selectedChain,
          direction: 'both',
          depth: 2,
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Failed to load graph' }));
        throw new Error(err.error || err.message || 'Failed to load graph');
      }

      const data = await response.json();
      const resultNodes: FlowNode[] = data?.result?.nodes || data?.nodes || [];
      const resultEdges: FlowEdge[] = data?.result?.edges || data?.edges || [];

      setNodes(resultNodes);
      setEdges(resultEdges);
    } catch (err: any) {
      setError(err.message || 'Failed to load graph');
    } finally {
      setLoading(false);
    }
  }, [address, selectedChain]);

  // Get node by address
  const getNode = (addr: string) => nodes.find(n => n.address === addr);
  const rootNode = nodes.find(n => n.depth === 0);

  // Group connected nodes
  const sourceNodes = nodes.filter(n => n.depth > 0 && n.direction === 'source')
    .sort((a, b) => (b.totalValueInEth || 0) - (a.totalValueInEth || 0));
  const destNodes = nodes.filter(n => n.depth > 0 && n.direction === 'destination')
    .sort((a, b) => (b.totalValueInEth || 0) - (a.totalValueInEth || 0));
  const connectedNodes = nodes.filter(n => n.depth > 0 && n.direction === 'both')
    .sort((a, b) => (b.totalValueInEth || 0) - (a.totalValueInEth || 0));

  // Active categories for filter
  const activeCategories = Array.from(new Set(nodes.map(n => n.category || 'wallet')));

  const hasGraph = nodes.length > 0;

  const handleNodeClick = (addr: string) => {
    setSelectedNode(prev => prev === addr ? null : addr);
  };

  const rootStyle = rootNode ? (CATEGORY_STYLES[rootNode.category || 'wallet'] || DEFAULT_STYLE) : DEFAULT_STYLE;

  return (
    <div className="graph-view">
      <div className="page-head">
        <div className="page-title">
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 18, height: 18 }}>
            <circle cx="7" cy="3" r="2"/>
            <circle cx="3" cy="11" r="2"/>
            <circle cx="11" cy="11" r="2"/>
            <path d="M7 5v1M4 9l2 1M10 9l-2 1"/>
          </svg>
          Wallet Connections
        </div>
        <div className="page-desc">Visualize funding flows and connected wallets — click cards to inspect</div>
      </div>

      {/* Input panel */}
      <div className="panel">
        <div className="panel-body">
          <div className="field-label">Root Wallet Address</div>
          <div className="addr-field">
            <div className="addr-bar">
              <span className="addr-label">{selectedChain.toUpperCase()}</span>
            </div>
            <input
              className="ft-addr-input"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x… wallet address"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) handleLoadGraph();
              }}
              disabled={loading}
            />
          </div>

          <div className="actions">
            <button className="btn-analyze" onClick={handleLoadGraph} disabled={loading || !address.trim()}>
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="6" cy="6" r="4.5"/><path d="M9.5 9.5l3 3"/>
              </svg>
              {loading ? 'Analyzing...' : 'Explore Connections'}
            </button>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {!hasGraph && !loading && !error && (
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="panel-body">
            <div className="graph-placeholder">
              <svg viewBox="0 0 120 80" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.15" style={{ width: 240, height: 160 }}>
                <circle cx="60" cy="20" r="6"/><circle cx="20" cy="60" r="4"/><circle cx="100" cy="60" r="4"/>
                <line x1="60" y1="20" x2="20" y2="60"/><line x1="60" y1="20" x2="100" y2="60"/>
              </svg>
              <p>Enter a wallet address and click "Explore Connections" to visualize funding flows.</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="panel-body">
            <div className="graph-loading">
              <div className="graph-loading-spinner" />
              <p>Tracing wallet connections on-chain...</p>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="panel-body">
            <div className="investigate-error">
              <div className="investigate-error__title">Connection Error</div>
              <p className="investigate-error__message">{error}</p>
              <button className="btn-ghost" onClick={handleLoadGraph} style={{ marginTop: 8 }}>
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flow visualization */}
      {hasGraph && (
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="panel-body">
            {/* Stats bar */}
            <div className="flow-stats">
              <span className="flow-stat">
                <span className="flow-stat-value">{nodes.length}</span>
                <span className="flow-stat-label">wallets</span>
              </span>
              <span className="flow-stat-divider" />
              <span className="flow-stat">
                <span className="flow-stat-value">{edges.length}</span>
                <span className="flow-stat-label">connections</span>
              </span>
              <span className="flow-stat-divider" />
              <span className="flow-stat">
                <span className="flow-stat-value">{activeCategories.length}</span>
                <span className="flow-stat-label">entity types</span>
              </span>
            </div>

            {/* Legend */}
            <div className="flow-legend">
              {activeCategories.map(cat => {
                const style = CATEGORY_STYLES[cat] || DEFAULT_STYLE;
                return (
                  <span key={cat} className="flow-legend-item" style={{ '--dot-color': style.border } as React.CSSProperties}>
                    <span className="flow-legend-dot" />
                    {cat}
                  </span>
                );
              })}
            </div>

            {/* Flow diagram */}
            <div className="flow-diagram">
              {/* Source wallets (funding sources) */}
              {sourceNodes.length > 0 && (
                <div className="flow-section">
                  <div className="flow-section-label">Funding Sources</div>
                  <div className="flow-nodes-row">
                    {sourceNodes.slice(0, 8).map(node => {
                      const style_ = CATEGORY_STYLES[node.category || 'wallet'] || DEFAULT_STYLE;
                      const isSelected = selectedNode === node.address;
                      return (
                        <div
                          key={node.address}
                          className={`flow-card${isSelected ? ' selected' : ''}`}
                          style={{ '--card-bg': style_.bg, '--card-border': style_.border, '--card-text': style_.text } as React.CSSProperties}
                          onClick={() => handleNodeClick(node.address)}
                        >
                          <div className="flow-card-header">
                            <span className="flow-card-type">{node.category || 'wallet'}</span>
                            <span className="flow-card-value">{formatValue(node.totalValueInEth || 0)}</span>
                          </div>
                          <div className="flow-card-address">{node.name || shortenAddress(node.address)}</div>
                          {node.name && <div className="flow-card-sub">{shortenAddress(node.address)}</div>}
                          <div className="flow-card-footer">
                            <span>{node.txCount} tx</span>
                            <span className="flow-card-direction">incoming</span>
                          </div>
                          {isSelected && (
                            <div className="flow-card-expand">
                              <div className="flow-expand-row">Address: {node.address}</div>
                              <div className="flow-expand-row">
                                Value: {node.totalValue} ({node.totalValueInEth?.toFixed(4)} ETH)
                              </div>
                              {node.confidence !== undefined && (
                                <div className="flow-expand-row">
                                  Confidence: {(node.confidence * 100).toFixed(0)}%
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {sourceNodes.length > 8 && (
                      <div className="flow-card flow-card-more">+{sourceNodes.length - 8} more</div>
                    )}
                  </div>
                  {/* Connection arrows */}
                  <svg className="flow-arrows" viewBox="0 0 100 20" preserveAspectRatio="none">
                    <line x1="0" y1="10" x2="100" y2="10" stroke="var(--border-subtle, #2a2a3e)" strokeWidth="1" strokeDasharray="3 2"/>
                    <polygon points="98,6 100,10 98,14" fill="var(--border-subtle, #2a2a3e)"/>
                  </svg>
                </div>
              )}

              {/* Root wallet */}
              {rootNode && (
                <div className="flow-section flow-section-root">
                  <div className="flow-root-card" style={{ '--card-bg': rootStyle.bg, '--card-border': rootStyle.border, '--card-text': rootStyle.text } as React.CSSProperties}>
                    <div className="flow-root-badge">ROOT</div>
                    <div className="flow-root-address">{rootNode.name || shortenAddress(rootNode.address)}</div>
                    {rootNode.name && <div className="flow-root-sub">{shortenAddress(rootNode.address)}</div>}
                    <div className="flow-root-stats">
                      <span>Value: {formatValue(rootNode.totalValueInEth || 0)}</span>
                      <span>{rootNode.txCount} transactions</span>
                    </div>
                    {selectedNode === rootNode.address && (
                      <div className="flow-card-expand">
                        <div className="flow-expand-row">Address: {rootNode.address}</div>
                        <div className="flow-expand-row">Category: {rootNode.category || 'wallet'}</div>
                      </div>
                    )}
                    <button className="flow-root-click" onClick={() => handleNodeClick(rootNode.address)}>
                      {selectedNode === rootNode.address ? 'Less' : 'Details'}
                    </button>
                  </div>
                </div>
              )}

              {/* Destination wallets */}
              {destNodes.length > 0 && (
                <div className="flow-section">
                  <svg className="flow-arrows flow-arrows-down" viewBox="0 0 100 20" preserveAspectRatio="none">
                    <line x1="0" y1="10" x2="100" y2="10" stroke="var(--border-subtle, #2a2a3e)" strokeWidth="1" strokeDasharray="3 2"/>
                    <polygon points="98,6 100,10 98,14" fill="var(--border-subtle, #2a2a3e)"/>
                  </svg>
                  <div className="flow-section-label">Fund Destinations</div>
                  <div className="flow-nodes-row">
                    {destNodes.slice(0, 8).map(node => {
                      const style_ = CATEGORY_STYLES[node.category || 'wallet'] || DEFAULT_STYLE;
                      const isSelected = selectedNode === node.address;
                      return (
                        <div
                          key={node.address}
                          className={`flow-card${isSelected ? ' selected' : ''}`}
                          style={{ '--card-bg': style_.bg, '--card-border': style_.border, '--card-text': style_.text } as React.CSSProperties}
                          onClick={() => handleNodeClick(node.address)}
                        >
                          <div className="flow-card-header">
                            <span className="flow-card-type">{node.category || 'wallet'}</span>
                            <span className="flow-card-value">{formatValue(node.totalValueInEth || 0)}</span>
                          </div>
                          <div className="flow-card-address">{node.name || shortenAddress(node.address)}</div>
                          {node.name && <div className="flow-card-sub">{shortenAddress(node.address)}</div>}
                          <div className="flow-card-footer">
                            <span>{node.txCount} tx</span>
                            <span className="flow-card-direction outgoing">outgoing</span>
                          </div>
                          {isSelected && (
                            <div className="flow-card-expand">
                              <div className="flow-expand-row">Address: {node.address}</div>
                              <div className="flow-expand-row">
                                Value: {node.totalValue} ({node.totalValueInEth?.toFixed(4)} ETH)
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {destNodes.length > 8 && (
                      <div className="flow-card flow-card-more">+{destNodes.length - 8} more</div>
                    )}
                  </div>
                </div>
              )}

              {/* Connected (both directions) */}
              {connectedNodes.length > 0 && (
                <div className="flow-section">
                  <svg className="flow-arrows flow-arrows-down" viewBox="0 0 100 20" preserveAspectRatio="none">
                    <line x1="0" y1="10" x2="100" y2="10" stroke="var(--border-subtle, #2a2a3e)" strokeWidth="1" strokeDasharray="3 2"/>
                    <polygon points="0,6 2,10 0,14" fill="var(--border-subtle, #2a2a3e)"/>
                    <polygon points="98,6 100,10 98,14" fill="var(--border-subtle, #2a2a3e)"/>
                  </svg>
                  <div className="flow-section-label">Mutual Connections</div>
                  <div className="flow-nodes-row">
                    {connectedNodes.slice(0, 8).map(node => {
                      const style_ = CATEGORY_STYLES[node.category || 'wallet'] || DEFAULT_STYLE;
                      const isSelected = selectedNode === node.address;
                      return (
                        <div
                          key={node.address}
                          className={`flow-card${isSelected ? ' selected' : ''}`}
                          style={{ '--card-bg': style_.bg, '--card-border': style_.border, '--card-text': style_.text } as React.CSSProperties}
                          onClick={() => handleNodeClick(node.address)}
                        >
                          <div className="flow-card-header">
                            <span className="flow-card-type">{node.category || 'wallet'}</span>
                            <span className="flow-card-value">{formatValue(node.totalValueInEth || 0)}</span>
                          </div>
                          <div className="flow-card-address">{node.name || shortenAddress(node.address)}</div>
                          {node.name && <div className="flow-card-sub">{shortenAddress(node.address)}</div>}
                          <div className="flow-card-footer">
                            <span>{node.txCount} tx</span>
                            <span className="flow-card-direction both">both</span>
                          </div>
                          {isSelected && (
                            <div className="flow-card-expand">
                              <div className="flow-expand-row">Address: {node.address}</div>
                              <div className="flow-expand-row">
                                Value: {node.totalValue} ({node.totalValueInEth?.toFixed(4)} ETH)
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {connectedNodes.length > 8 && (
                      <div className="flow-card flow-card-more">+{connectedNodes.length - 8} more</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Empty connections note */}
            {sourceNodes.length === 0 && destNodes.length === 0 && connectedNodes.length === 0 && (
              <div className="flow-empty">
                <p>No wallet connections found. The analyzed wallet may have no direct funding flows on this chain.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default GraphView;
