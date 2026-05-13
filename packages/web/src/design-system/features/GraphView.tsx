/**
 * GraphView - Interactive Investigation Graph
 * Full-page Cytoscape.js-based graph exploration with entity labels, filters, and PNG export
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import cytoscape, { Core, EventObject } from 'cytoscape';
import { ChainId } from '@fundtracer/core';
import { getAuthToken } from '../../api';
import './GraphView.css';
import './InvestigateView.css';

interface GraphViewProps {
  selectedChain?: ChainId;
}

interface GraphNode {
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

interface GraphEdge {
  source: string;
  target: string;
  value: number;
}

// Entity category colors (matching AddressLabel/CATEGORY_STYLES)
const ENTITY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  cex:  { bg: '#1a1508', border: '#f59e0b', text: '#fbbf24' },
  dex:  { bg: '#140a1a', border: '#9966ff', text: '#b388ff' },
  bridge:  { bg: '#08151a', border: '#00d4ff', text: '#66e0ff' },
  mixer: { bg: '#1a0808', border: '#ff3366', text: '#ff6688' },
  lending: { bg: '#0a1a14', border: '#00ff88', text: '#66ffaa' },
  protocol: { bg: '#0a0a1a', border: '#4488ff', text: '#77aaff' },
  known_scammer: { bg: '#1a0000', border: '#ff0000', text: '#ff4444' },
  wallet: { bg: '#111118', border: '#555566', text: '#888899' },
};

const DEFAULT_COLOR = { bg: '#111118', border: '#555566', text: '#888899' };

export function GraphView({ selectedChain = 'linea' }: GraphViewProps) {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [showLegend, setShowLegend] = useState(true);

  const cyRef = useRef<Core | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Entity categories present in current graph
  const activeCategories = Array.from(new Set(nodes.map(n => n.category || 'wallet')));

  const handleLoadGraph = useCallback(async () => {
    if (!address.trim()) return;

    setLoading(true);
    setError('');
    setNodes([]);
    setEdges([]);

    try {
      const token = getAuthToken();
      const response = await fetch('/api/analyze/expand-node', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          address: address.trim(),
          chain: selectedChain,
          direction: 'both',
          depth: 2,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: 'Failed to load graph' }));
        throw new Error(err.message);
      }

      const data = await response.json();
      if (data?.result?.nodes) {
        setNodes(data.result.nodes);
      } else {
        setNodes(data.nodes || []);
      }
      if (data?.result?.edges) {
        setEdges(data.result.edges);
      } else {
        setEdges(data.edges || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load graph');
    } finally {
      setLoading(false);
    }
  }, [address, selectedChain]);

  // Build cytoscape instance when nodes/edges change
  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return;

    // Destroy previous instance
    if (cyRef.current) {
      cyRef.current.destroy();
      cyRef.current = null;
    }

    const filteredNodes = selectedFilter === 'all'
      ? nodes
      : nodes.filter(n => (n.category || 'wallet') === selectedFilter);

    const filteredIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = edges.filter(e => filteredIds.has(e.source) && filteredIds.has(e.target));

    // Map nodes to cytoscape format
    const cyNodes = filteredNodes.map(n => {
      const cat = n.category || 'wallet';
      const color = ENTITY_COLORS[cat] || DEFAULT_COLOR;
      const isRoot = n.depth === 0;
      return {
        data: {
          id: n.id,
          label: n.name || n.address.slice(0, 6) + '...' + n.address.slice(-4),
          address: n.address,
          fullLabel: n.name || '',
          category: cat,
          depth: n.depth,
          totalValue: n.totalValue,
          totalValueInEth: n.totalValueInEth,
          txCount: n.txCount,
          verified: n.verified,
          confidence: n.confidence,
        },
        classes: isRoot ? 'root' : cat === 'wallet' ? 'unknown' : cat,
        style: {
          'background-color': color.border,
          'border-color': color.border,
          'border-width': n.verified ? 2 : 1,
          width: Math.max(20, Math.min(60, (n.totalValueInEth || 0) / 10)),
          height: Math.max(20, Math.min(60, (n.totalValueInEth || 0) / 10)),
        },
      };
    });

    const cyEdges = filteredEdges.map(e => ({
      data: {
        id: `${e.source}-${e.target}`,
        source: e.source,
        target: e.target,
        value: e.value,
        label: e.value ? `${e.value.toFixed(2)} ETH` : '',
      },
      style: {
        width: Math.max(1, Math.min(6, (e.value || 0) / 50)),
        'line-color': '#444466',
        'target-arrow-color': '#666688',
        'target-arrow-shape': 'triangle',
      },
    }));

    const cy = cytoscape({
      container: containerRef.current,
      elements: [...cyNodes, ...cyEdges],
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            color: '#ccc',
            'font-size': '10px',
            'text-valign': 'bottom',
            'text-halign': 'center',
            'text-margin-y': 4,
            'overlay-padding': 6,
            'overlay-color': '#4488ff',
            'overlay-opacity': 0.15,
          },
        },
        {
          selector: 'node.root',
          style: {
            'border-width': 3,
            'border-color': '#ffffff',
            width: 36,
            height: 36,
          },
        },
        {
          selector: 'edge',
          style: {
            'curve-style': 'bezier',
            'opacity': 0.6,
            'label': 'data(label)',
            'font-size': '8px',
            'color': '#777',
            'text-background-color': '#0d0d1a',
            'text-background-opacity': 0.8,
            'text-background-padding': '2px',
          },
        },
        {
          selector: ':selected',
          style: {
            'border-width': 3,
            'border-color': '#61dfff',
          },
        },
      ],
      layout: {
        name: 'cose',
        animate: true,
        animationDuration: 500,
        gravity: 0.8,
        numIter: 1000,
        nodeRepulsion: () => 8000,
        idealEdgeLength: () => 120,
        padding: 40,
      },
      minZoom: 0.3,
      maxZoom: 4,
      wheelSensitivity: 0.3,
    });

    // Tooltip on hover
    cy.on('mouseover', 'node', (evt: EventObject) => {
      const node = evt.target;
      const d = node.data();
      const el = tooltipRef.current;
      if (!el) return;
      el.innerHTML = `
        <div class="graph-tip-addr">${d.address}</div>
        ${d.fullLabel ? `<div class="graph-tip-name">${d.fullLabel}</div>` : ''}
        <div class="graph-tip-row"><span>Category:</span> ${d.category}</div>
        <div class="graph-tip-row"><span>Value:</span> ${d.totalValueInEth?.toFixed(4) || '0'} ETH</div>
        <div class="graph-tip-row"><span>Tx count:</span> ${d.txCount || 0}</div>
        ${d.verified ? '<div class="graph-tip-verified">✓ Verified</div>' : ''}
      `;
      el.style.display = 'block';
    });

    cy.on('mouseout', 'node', () => {
      if (tooltipRef.current) tooltipRef.current.style.display = 'none';
    });

    // Track mouse for tooltip positioning
    cy.on('mousemove', (evt: EventObject) => {
      const el = tooltipRef.current;
      if (!el || el.style.display === 'none') return;
      const pos = evt.originalEvent || (evt as any).position;
      if (pos) {
        el.style.left = `${pos.clientX + 12}px`;
        el.style.top = `${pos.clientY - 10}px`;
      }
    });

    // Click node to expand
    cy.on('tap', 'node', async (evt: EventObject) => {
      const node = evt.target;
      const addr = node.data('address');

      // Don't re-expand root
      if (addr === address.trim().toLowerCase()) return;

      // Check if already expanded (has children)
      const hasChildren = edges.some(e => e.source === addr);
      if (hasChildren) return;

      // Expand this node
      try {
        const token = getAuthToken();
        const resp = await fetch('/api/analyze/expand-node', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ address: addr, chain: selectedChain, depth: 1 }),
        });
        if (!resp.ok) return;
        const data = await resp.json();
        const newNodes: GraphNode[] = data?.result?.nodes || data?.nodes || [];
        const newEdges: GraphEdge[] = data?.result?.edges || data?.edges || [];

        if (newNodes.length > 0) {
          setNodes(prev => {
            const existing = new Map(prev.map(n => [n.address, n]));
            for (const n of newNodes) existing.set(n.address, n);
            return Array.from(existing.values());
          });
          setEdges(prev => {
            const existing = new Map(prev.map(e => [`${e.source}-${e.target}`, e]));
            for (const e of newEdges) existing.set(`${e.source}-${e.target}`, e);
            return Array.from(existing.values());
          });
        }
      } catch {}
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [nodes, edges, selectedFilter, address]);

  const handleZoomIn = useCallback(() => {
    cyRef.current?.zoom(cyRef.current.zoom() * 1.3);
  }, []);

  const handleZoomOut = useCallback(() => {
    cyRef.current?.zoom(cyRef.current.zoom() / 1.3);
  }, []);

  const handleFit = useCallback(() => {
    cyRef.current?.fit(undefined, 40);
  }, []);

  const handleReset = useCallback(() => {
    if (!cyRef.current) return;
    cyRef.current.reset();
  }, []);

  const handleExportPng = useCallback(() => {
    if (!cyRef.current) return;
    const png = cyRef.current.png({ full: true, scale: 2 });
    const link = document.createElement('a');
    link.download = `fundtracer-graph-${address.slice(0, 8)}-${Date.now()}.png`;
    link.href = png;
    link.click();
  }, [address]);

  const hasGraph = nodes.length > 0;

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
          Investigation Graph
        </div>
        <div className="page-desc">Interactive funding flow visualization — click nodes to expand, drag to rearrange, zoom to explore</div>
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
              {loading ? 'Building...' : 'Build Graph'}
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
                <circle cx="40" cy="40" r="3"/><circle cx="80" cy="40" r="3"/><circle cx="10" cy="30" r="2"/><circle cx="110" cy="30" r="2"/>
                <line x1="60" y1="20" x2="20" y2="60"/><line x1="60" y1="20" x2="100" y2="60"/>
                <line x1="60" y1="20" x2="40" y2="40"/><line x1="60" y1="20" x2="80" y2="40"/>
                <line x1="20" y1="60" x2="10" y2="30"/><line x1="100" y1="60" x2="110" y2="30"/>
                <line x1="40" y1="40" x2="20" y2="60"/><line x1="80" y1="40" x2="100" y2="60"/>
              </svg>
              <p>Enter a wallet address and click "Build Graph" to visualize funding flows.</p>
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
              <p>Building graph from on-chain data...</p>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="panel-body">
            <div className="investigate-error">
              <div className="investigate-error__title">Error</div>
              <p className="investigate-error__message">{error}</p>
              <button className="btn-ghost" onClick={handleLoadGraph} style={{ marginTop: 8 }}>
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Graph panel */}
      {hasGraph && (
        <div className="panel graph-panel" style={{ marginTop: 16 }}>
          {/* Toolbar */}
          <div className="graph-toolbar">
            <div className="graph-toolbar-left">
              <span className="graph-toolbar-label">{nodes.length} nodes · {edges.length} edges</span>

              <div className="graph-toolbar-divider" />

              <label className="graph-filter-label">Filter:</label>
              <select
                className="graph-filter-select"
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
              >
                <option value="all">All entities</option>
                {activeCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="graph-toolbar-right">
              <button className="graph-tool-btn" onClick={handleZoomIn} title="Zoom in">
                <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="5" cy="5" r="4"/><path d="M9 9l2 2"/><line x1="3" y1="5" x2="7" y2="5"/>
                </svg>
              </button>
              <button className="graph-tool-btn" onClick={handleZoomOut} title="Zoom out">
                <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="5" cy="5" r="4"/><path d="M9 9l2 2"/><line x1="3" y1="5" x2="7" y2="5"/>
                </svg>
              </button>
              <button className="graph-tool-btn" onClick={handleFit} title="Fit to screen">
                <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M1 4V1h3M8 1h3v3M4 11H1V8M11 8v3H8"/>
                </svg>
              </button>
              <button className="graph-tool-btn" onClick={handleReset} title="Reset view">
                <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M1 6a5 5 0 119.9-1"/>
                  <path d="M11 3v3H8"/>
                </svg>
              </button>

              <div className="graph-toolbar-divider" />

              <button className="graph-tool-btn" onClick={() => setShowLegend(!showLegend)} title="Toggle legend">
                <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="1" y="2" width="3" height="3" rx="0.5"/>
                  <line x1="5" y1="3" x2="11" y2="3"/>
                  <rect x="1" y="7" width="3" height="3" rx="0.5"/>
                  <line x1="5" y1="8" x2="11" y2="8"/>
                </svg>
              </button>
              <button className="graph-tool-btn" onClick={handleExportPng} title="Export PNG">
                <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M6 1v8M2 6l4 4 4-4M1 11h10"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Cytoscape container */}
          <div className="graph-body">
            <div ref={containerRef} className="graph-canvas" />

            {/* Tooltip */}
            <div ref={tooltipRef} className="graph-tooltip" />

            {/* Legend */}
            {showLegend && (
              <div className="graph-legend">
                <div className="graph-legend-title">Legend</div>
                {Object.entries(ENTITY_COLORS).map(([cat, colors]) => {
                  if (!activeCategories.includes(cat) && cat !== 'wallet') return null;
                  return (
                    <div key={cat} className="graph-legend-item">
                      <span className="graph-legend-dot" style={{ background: colors.border }} />
                      <span className="graph-legend-label">{cat}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default GraphView;
