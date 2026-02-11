import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ChainId, CHAINS, SybilAnalysisResult, SybilCluster } from '@fundtracer/core';
import { analyzeSybilAddresses, fetchDuneInteractors } from '../api';
import { addToHistory } from '../utils/history';
import { useNotify } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { ethers } from 'ethers';
import { useAppKitProvider } from '@reown/appkit/react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Database02Icon,
  Search01Icon,
  Search02Icon,
  Alert01Icon,
  Alert02Icon,
  CheckmarkCircle02Icon,
  User02Icon,
  GroupIcon,
  Download01Icon,
  ArrowDown01Icon,
  ArrowRight01Icon,
  ArrowLeft01Icon,
  Copy01Icon,
  FilterHorizontalIcon,
  Loading01Icon,
  Key01Icon,
  File01Icon,
  File02Icon,
  LayoutGridIcon,
  ListViewIcon,
  MaximizeIcon,
  MoreVerticalIcon,
  ChevronDown,
  ChevronRight,
  ArrowUpRight01Icon,
  Shield01Icon,
  ShieldCheck,
  Cancel01Icon,
  Settings01Icon,
  Share01Icon,
  Analytics01Icon,
  AiNetworkIcon,
  StarIcon,
  GasPipeIcon
} from '@hugeicons/core-free-icons';
import cytoscape from 'cytoscape';
// @ts-ignore - JSX modules without type declarations
import { UpgradeModal } from './sybil/UpgradeModal.jsx';
// @ts-ignore - JSX modules without type declarations

// @ts-ignore - JS modules without type declarations
import {
  SYBIL_TIERS,
  getSybilUsage,
  canPerformSybilOperation,
  getRemainingOperations,
  incrementSybilUsage,
  storePaymentVerification,
  getStoredPaymentVerification,
  clearPaymentVerification,
} from '../lib/sybilTier.js';
// @ts-ignore - JS modules without type declarations
import { verifySubscriptionPayment, sendGasPayment, verifyGasPayment } from '../services/paymentVerification.js';

interface SybilDetectorProps {
  onBack?: () => void;
}

type WizardStep = 'fetch' | 'analyze' | 'results';
type ViewMode = 'list' | 'graph';
type ExportFormat = 'csv' | 'json' | 'pdf';

// Risk level configuration
const RISK_LEVELS = {
  critical: { threshold: 80, label: 'Critical', color: '#dc2626', bgColor: 'rgba(220, 38, 38, 0.15)', icon: Alert02Icon },
  high: { threshold: 60, label: 'High Risk', color: '#ea580c', bgColor: 'rgba(234, 88, 12, 0.15)', icon: Alert01Icon },
  medium: { threshold: 40, label: 'Medium Risk', color: '#d97706', bgColor: 'rgba(217, 119, 6, 0.15)', icon: Alert01Icon },
  low: { threshold: 0, label: 'Low Risk', color: '#16a34a', bgColor: 'rgba(22, 163, 74, 0.15)', icon: ShieldCheck },
};

// Skeleton loading component
const Skeleton: React.FC<{ width?: string; height?: string; className?: string }> = ({ 
  width = '100%', 
  height = '20px', 
  className = '' 
}) => (
  <div
    className={`skeleton ${className}`}
    style={{
      width,
      height,
      borderRadius: '4px',
      background: 'linear-gradient(90deg, var(--color-bg-elevated) 0%, var(--color-bg-tertiary) 50%, var(--color-bg-elevated) 100%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s ease-in-out infinite',
    }}
  />
);

const SkeletonCard: React.FC = () => (
  <div style={{
    padding: '16px',
    backgroundColor: 'var(--color-bg-elevated)',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    marginBottom: '12px',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
      <Skeleton width="40px" height="40px" />
      <div style={{ flex: 1 }}>
        <Skeleton width="60%" height="16px" />
        <div style={{ marginTop: '8px' }}>
          <Skeleton width="40%" height="12px" />
        </div>
      </div>
      <Skeleton width="80px" height="24px" />
    </div>
    <Skeleton width="100%" height="60px" />
  </div>
);

// Address display with copy functionality
const AddressDisplay: React.FC<{
  address: string;
  truncate?: boolean;
  showCopy?: boolean;
  className?: string;
}> = ({ address, truncate = true, showCopy = true, className = '' }) => {
  const notify = useNotify();
  const [copied, setCopied] = useState(false);

  const displayText = truncate
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : address;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      notify.success('Address copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      notify.error('Failed to copy address');
    }
  };

  return (
    <span className={`address-display ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
        {displayText}
      </code>
      {showCopy && (
        <button
          onClick={handleCopy}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '10px',
            display: 'flex',
            alignItems: 'center',
            color: copied ? 'var(--color-positive)' : 'var(--color-text-muted)',
            transition: 'color 0.2s',
            minWidth: '44px',
            minHeight: '44px',
            justifyContent: 'center',
          }}
          title="Copy to clipboard"
        >
          <HugeiconsIcon 
            icon={copied ? CheckmarkCircle02Icon : Copy01Icon} 
            size={16} 
            strokeWidth={1.5} 
          />
        </button>
      )}
    </span>
  );
};

// Risk badge component
const RiskBadge: React.FC<{ score: number; showIcon?: boolean }> = ({ score, showIcon = true }) => {
  const getRiskLevel = (s: number) => {
    if (s >= 80) return RISK_LEVELS.critical;
    if (s >= 60) return RISK_LEVELS.high;
    if (s >= 40) return RISK_LEVELS.medium;
    return RISK_LEVELS.low;
  };

  const risk = getRiskLevel(score);

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 12px',
      borderRadius: '6px',
      backgroundColor: risk.bgColor,
      color: risk.color,
      fontSize: '0.875rem',
      fontWeight: 600,
    }}>
      {showIcon && <HugeiconsIcon icon={risk.icon} size={16} strokeWidth={1.5} />}
      <span>{risk.label}</span>
      <span style={{ opacity: 0.8 }}>({score}%)</span>
    </div>
  );
};

// Graph view component using Cytoscape - Complete Rewrite
// Features: Lazy loading, modern UI, wallet-to-wallet connections, exports, minimap

interface GraphNode {
  id: string;
  label: string;
  type: 'funding' | 'wallet';
  score: number;
  color: string;
  size: number;
  clusterSize: number;
  walletCount: number;
  totalValue: number;
  parent?: string;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'funding' | 'transaction';
  animated?: boolean;
}

const NetworkGraph: React.FC<{
  clusters: SybilCluster[];
  isMobile?: boolean;
}> = ({ clusters, isMobile = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [isGenerated, setIsGenerated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [zoom, setZoom] = useState(1);
  const [showMinimap, setShowMinimap] = useState(!isMobile);
  const [nodeLimit, setNodeLimit] = useState(100);
  const notify = useNotify();

  // Cleanup Cytoscape instance on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (cyRef.current) {
        cyRef.current.removeAllListeners();
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, []);

  // Build graph data
  const buildGraphData = useCallback((limit: number) => {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const addedNodes = new Set<string>();
    const walletToCluster = new Map<string, string>();

    // Sort clusters by score (highest first)
    const sortedClusters = [...clusters].sort((a, b) => b.sybilScore - a.sybilScore);
    
    let nodeCount = 0;

    sortedClusters.forEach((cluster) => {
      if (nodeCount >= limit) return;

      // Add funding source node
      if (!addedNodes.has(cluster.fundingSource)) {
        const riskLevel = cluster.sybilScore >= 80 ? 'critical' : 
                         cluster.sybilScore >= 60 ? 'high' : 
                         cluster.sybilScore >= 40 ? 'medium' : 'low';
        
        nodes.push({
          id: cluster.fundingSource,
          label: cluster.fundingSourceLabel || `${cluster.fundingSource.slice(0, 6)}...${cluster.fundingSource.slice(-4)}`,
          type: 'funding',
          score: cluster.sybilScore,
          color: RISK_LEVELS[riskLevel as keyof typeof RISK_LEVELS].color,
          size: Math.min(40 + cluster.wallets.length * 2, 80),
          clusterSize: cluster.wallets.length,
          walletCount: cluster.wallets.length,
          totalValue: cluster.averageFundingAmount * cluster.wallets.length,
        });
        addedNodes.add(cluster.fundingSource);
        nodeCount++;
      }

      // Add wallet nodes (limited per cluster)
      const walletsToShow = cluster.wallets.slice(0, Math.min(20, cluster.wallets.length));
      
      walletsToShow.forEach((wallet) => {
        if (nodeCount >= limit) return;
        
        if (!addedNodes.has(wallet.address)) {
          nodes.push({
            id: wallet.address,
            label: `${wallet.address.slice(0, 4)}...${wallet.address.slice(-4)}`,
            type: 'wallet',
            score: cluster.sybilScore,
            color: '#8b5cf6',
            size: 25,
            clusterSize: 1,
            walletCount: 1,
            totalValue: wallet.fundingAmount || 0,
            parent: cluster.fundingSource,
          });
          addedNodes.add(wallet.address);
          walletToCluster.set(wallet.address, cluster.fundingSource);
          nodeCount++;
        }

        // Add funding edge
        edges.push({
          id: `funding-${cluster.fundingSource}-${wallet.address}`,
          source: cluster.fundingSource,
          target: wallet.address,
          type: 'funding',
        });
      });
    });

    // Add wallet-to-wallet transaction connections (simplified)
    // In production, this would fetch actual transaction data
    const wallets = nodes.filter(n => n.type === 'wallet');
    let transactionEdges = 0;
    
    // Create some inter-wallet connections for visualization
    // (In real implementation, this would be based on actual transaction data)
    for (let i = 0; i < wallets.length && transactionEdges < 30; i++) {
      for (let j = i + 1; j < wallets.length && transactionEdges < 30; j++) {
        // Only connect if same cluster (simplified logic)
        if (wallets[i].parent === wallets[j].parent && Math.random() > 0.7) {
          edges.push({
            id: `tx-${wallets[i].id}-${wallets[j].id}`,
            source: wallets[i].id,
            target: wallets[j].id,
            type: 'transaction',
            animated: true,
          });
          transactionEdges++;
        }
      }
    }

    return { nodes, edges, totalNodes: nodes.length };
  }, [clusters]);

  // Generate graph
  const generateGraph = useCallback(() => {
    if (!containerRef.current || clusters.length === 0) return;
    
    setIsLoading(true);
    
    // Simulate loading for better UX
    setTimeout(() => {
      const { nodes, edges } = buildGraphData(nodeLimit);

      // Destroy existing graph
      cyRef.current?.destroy();

      // Initialize Cytoscape with modern styling
      cyRef.current = cytoscape({
        container: containerRef.current,
        elements: [
          ...nodes.map(n => ({ data: n })),
          ...edges.map(e => ({ data: e })),
        ],
        style: [
          {
            selector: 'node',
            style: {
              'background-color': 'data(color)',
              'background-gradient': 'linear-gradient(to bottom, rgba(255,255,255,0.2), transparent)',
              'label': 'data(label)',
              'width': 'data(size)',
              'height': 'data(size)',
              'font-size': '11px',
              'color': '#e5e5e5',
              'text-valign': 'bottom',
              'text-halign': 'center',
              'text-margin-y': 6,
              'border-width': 3,
              'border-color': '#1a1a1a',
              'border-opacity': 0.8,
              'shadow-blur': 10,
              'shadow-color': 'data(color)',
              'shadow-opacity': 0.5,
              'transition-property': 'background-color, border-width, border-color, width, height',
              'transition-duration': '0.3s',
            },
          },
          {
            selector: 'node[type="funding"]',
            style: {
              'font-size': '13px',
              'font-weight': 'bold',
              'text-background-color': 'rgba(0,0,0,0.7)',
              'text-background-padding': '4px 8px',
              'text-background-opacity': 0.8,
              'text-background-shape': 'roundrectangle',
            },
          },
          {
            selector: 'node[type="wallet"]',
            style: {
              'opacity': 0.9,
            },
          },
          {
            selector: 'node:selected',
            style: {
              'border-width': 4,
              'border-color': '#3b82f6',
              'shadow-blur': 20,
              'shadow-opacity': 0.8,
              'width': 'data(size) * 1.2',
              'height': 'data(size) * 1.2',
            },
          },
          {
            selector: 'node:highlighted',
            style: {
              'border-width': 4,
              'border-color': '#fbbf24',
            },
          },
          {
            selector: 'edge',
            style: {
              'width': 2,
              'line-color': 'rgba(107, 114, 128, 0.4)',
              'line-style': 'solid',
              'curve-style': 'bezier',
              'control-point-step-size': 40,
            },
          },
          {
            selector: 'edge[type="funding"]',
            style: {
              'line-color': 'rgba(139, 92, 246, 0.4)',
              'target-arrow-shape': 'triangle',
              'target-arrow-color': 'rgba(139, 92, 246, 0.4)',
              'arrow-scale': 1.5,
            },
          },
          {
            selector: 'edge[type="transaction"]',
            style: {
              'line-color': 'rgba(59, 130, 246, 0.3)',
              'line-style': 'dashed',
              'line-dash-pattern': [6, 3],
            },
          },
          {
            selector: '.hidden',
            style: {
              'display': 'none',
            },
          },
        ],
        layout: {
          name: 'cose',
          padding: 30,
          nodeRepulsion: 800000,
          edgeElasticity: 200,
          gravity: 100,
          numIter: 2000,
          initialTemp: 300,
          coolingFactor: 0.95,
          minTemp: 1.0,
          animate: true,
          animationDuration: 1000,
        },
        wheelSensitivity: 0.3,
        minZoom: 0.1,
        maxZoom: 5,
      });

      // Add click handler with selection
      cyRef.current.on('tap', 'node', (evt) => {
        const node = evt.target;
        const nodeData = node.data() as GraphNode;
        
        // Deselect others
        cyRef.current?.nodes().unselect();
        node.select();
        
        setSelectedNode(nodeData);
      });

      // Clear selection on background click
      cyRef.current.on('tap', (evt) => {
        if (evt.target === cyRef.current) {
          setSelectedNode(null);
        }
      });

      // Hover effects
      cyRef.current.on('mouseover', 'node', (evt) => {
        const node = evt.target;
        node.animate({
          style: { 'border-width': 4, 'border-color': '#fbbf24' },
        }, { duration: 200 });
      });

      cyRef.current.on('mouseout', 'node', (evt) => {
        const node = evt.target;
        if (!node.selected()) {
          node.animate({
            style: { 'border-width': 3, 'border-color': '#1a1a1a' },
          }, { duration: 200 });
        }
      });

      // Zoom tracking
      cyRef.current.on('zoom', () => {
        setZoom(cyRef.current?.zoom() || 1);
      });

      // Fit graph after layout
      cyRef.current.on('layoutstop', () => {
        cyRef.current?.fit();
        cyRef.current?.center();
      });

      setIsGenerated(true);
      setIsLoading(false);
      notify.success(`Graph generated with ${nodes.length} nodes and ${edges.length} connections`);
    }, 500);
  }, [clusters, buildGraphData, nodeLimit, notify]);

  // Search functionality
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    
    if (!cyRef.current || !query) {
      cyRef.current?.nodes().removeClass('hidden');
      return;
    }

    const searchLower = query.toLowerCase();
    
    cyRef.current.nodes().forEach((node) => {
      const nodeId = node.id().toLowerCase();
      const nodeLabel = node.data('label')?.toLowerCase() || '';
      
      if (nodeId.includes(searchLower) || nodeLabel.includes(searchLower)) {
        node.removeClass('hidden');
      } else {
        node.addClass('hidden');
      }
    });
  }, []);

  // Export functions
  const exportPNG = useCallback(() => {
    if (!cyRef.current) return;
    
    const png = cyRef.current.png({
      bg: 'transparent',
      full: true,
      scale: 2,
    });
    
    const link = document.createElement('a');
    link.download = `sybil-graph-${Date.now()}.png`;
    link.href = png;
    link.click();
    notify.success('Graph exported as PNG');
  }, [notify]);

  const exportSVG = useCallback(() => {
    if (!cyRef.current) return;
    
    const svg = cyRef.current.svg({
      bg: 'transparent',
      full: true,
    });
    
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `sybil-graph-${Date.now()}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    notify.success('Graph exported as SVG');
  }, [notify]);

  const exportJSON = useCallback(() => {
    if (!cyRef.current) return;
    
    const elements = cyRef.current.json().elements;
    const dataStr = JSON.stringify(elements, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `sybil-graph-${Date.now()}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    notify.success('Graph exported as JSON');
  }, [notify]);

  const exportCSV = useCallback(() => {
    if (!cyRef.current) return;
    
    const nodes = cyRef.current.nodes().map(n => ({
      id: n.id(),
      type: n.data('type'),
      label: n.data('label'),
      score: n.data('score'),
      clusterSize: n.data('clusterSize'),
    }));

    const headers = ['ID', 'Type', 'Label', 'Score', 'Cluster Size'];
    const rows = nodes.map(n => [n.id, n.type, n.label, n.score, n.clusterSize].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `sybil-nodes-${Date.now()}.csv`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    notify.success('Graph exported as CSV');
  }, [notify]);

  // Control handlers
  const handleZoomIn = () => {
    cyRef.current?.zoom(cyRef.current.zoom() * 1.2);
  };

  const handleZoomOut = () => {
    cyRef.current?.zoom(cyRef.current.zoom() * 0.8);
  };

  const handleFit = () => {
    cyRef.current?.fit();
    cyRef.current?.center();
  };

  const handleReset = () => {
    cyRef.current?.reset();
    cyRef.current?.fit();
  };

  // Node limit options
  const nodeLimitOptions = [50, 100, 200, 500, 1000, 2000];

  // If mobile, show simplified version
  if (isMobile) {
    return (
      <div style={{
        backgroundColor: 'var(--color-bg-elevated)',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid var(--color-border)',
        textAlign: 'center',
      }}>
        <HugeiconsIcon icon={AiNetworkIcon} size={48} strokeWidth={1.5} color="var(--color-text-muted)" />
        <h4 style={{ 
          fontSize: '1rem', 
          fontWeight: 600, 
          color: 'var(--color-text-primary)', 
          margin: '12px 0 8px',
        }}>
          Network Graph
        </h4>
        <p style={{ 
          fontSize: '0.875rem', 
          color: 'var(--color-text-secondary)', 
          marginBottom: '16px',
          lineHeight: 1.5,
        }}>
          The interactive network graph is optimized for desktop viewing. 
          Switch to a larger screen to explore cluster relationships visually.
        </p>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
          marginTop: '8px',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-accent)' }}>
              {clusters.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Clusters</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-accent)' }}>
              {clusters.reduce((sum, c) => sum + c.wallets.length, 0)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Wallets</div>
          </div>
        </div>
      </div>
    );
  }

  // Main desktop graph view
  return (
    <div style={{
      position: 'relative',
      height: '600px',
      backgroundColor: 'var(--color-bg)',
      borderRadius: '12px',
      border: '1px solid var(--color-border)',
      overflow: 'hidden',
    }}>
      {/* Generate Graph State */}
      {!isGenerated && !isLoading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
          background: 'linear-gradient(135deg, var(--color-bg) 0%, var(--color-bg-elevated) 100%)',
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--color-accent) 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
            boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3)',
          }}>
            <HugeiconsIcon icon={AiNetworkIcon} size={40} strokeWidth={1.5} color="white" />
          </div>
          
          <h3 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            marginBottom: '12px',
            textAlign: 'center',
          }}>
            Visualize Cluster Relationships
          </h3>
          
          <p style={{
            fontSize: '1rem',
            color: 'var(--color-text-secondary)',
            marginBottom: '24px',
            textAlign: 'center',
            maxWidth: '500px',
            lineHeight: 1.6,
          }}>
            Generate an interactive network graph to explore funding sources, 
            wallet connections, and sybil patterns with force-directed visualization.
          </p>

          {/* Node limit selector */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '24px',
          }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
              Max nodes:
            </span>
            <select
              value={nodeLimit}
              onChange={(e) => setNodeLimit(Number(e.target.value))}
              style={{
                padding: '8px 12px',
                backgroundColor: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                color: 'var(--color-text-primary)',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              {nodeLimitOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          
          <button
            onClick={generateGraph}
            style={{
              padding: '14px 32px',
              background: 'linear-gradient(135deg, var(--color-accent) 0%, #8b5cf6 100%)',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 24px rgba(59, 130, 246, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(59, 130, 246, 0.3)';
            }}
          >
            <HugeiconsIcon icon={AiNetworkIcon} size={20} strokeWidth={1.5} />
            Generate Graph
          </button>

          <div style={{
            display: 'flex',
            gap: '24px',
            marginTop: '32px',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {clusters.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Clusters</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {clusters.reduce((sum, c) => sum + c.wallets.length, 0)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Wallets</div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--color-bg)',
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '3px solid var(--color-bg-elevated)',
            borderTop: '3px solid var(--color-accent)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <p style={{
            marginTop: '20px',
            fontSize: '1rem',
            color: 'var(--color-text-secondary)',
          }}>
            Building network graph...
          </p>
        </div>
      )}

      {/* Graph Container */}
      <div 
        ref={containerRef} 
        style={{ 
          width: '100%', 
          height: '100%',
          display: isGenerated ? 'block' : 'none',
        }} 
      />

      {/* Top Controls Bar */}
      {isGenerated && (
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          right: '12px',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}>
          {/* Search */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--color-bg-elevated)',
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid var(--color-border)',
            flex: 1,
            minWidth: '200px',
            maxWidth: '400px',
          }}>
            <HugeiconsIcon icon={Search01Icon} size={18} strokeWidth={1.5} color="var(--color-text-muted)" />
            <input
              type="text"
              placeholder="Search nodes..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-text-primary)',
                fontSize: '0.875rem',
                outline: 'none',
                width: '100%',
              }}
            />
          </div>

          {/* Zoom Controls */}
          <div style={{
            display: 'flex',
            gap: '4px',
            backgroundColor: 'var(--color-bg-elevated)',
            padding: '4px',
            borderRadius: '8px',
            border: '1px solid var(--color-border)',
          }}>
            <button onClick={handleZoomIn} style={controlBtnStyle} title="Zoom in">
              <HugeiconsIcon icon={Search01Icon} size={18} strokeWidth={1.5} />
            </button>
            <button onClick={handleZoomOut} style={controlBtnStyle} title="Zoom out">
              <HugeiconsIcon icon={Search02Icon} size={18} strokeWidth={1.5} />
            </button>
            <button onClick={handleFit} style={controlBtnStyle} title="Fit to screen">
              <HugeiconsIcon icon={MaximizeIcon} size={18} strokeWidth={1.5} />
            </button>
            <button onClick={handleReset} style={controlBtnStyle} title="Reset view">
              <HugeiconsIcon icon={LayoutGridIcon} size={18} strokeWidth={1.5} />
            </button>
          </div>

          {/* Minimap Toggle */}
          <button
            onClick={() => setShowMinimap(!showMinimap)}
            style={{
              ...controlBtnStyle,
              backgroundColor: showMinimap ? 'var(--color-accent)' : 'var(--color-bg-elevated)',
              color: showMinimap ? 'white' : 'var(--color-text-secondary)',
            }}
            title="Toggle minimap"
          >
            <HugeiconsIcon icon={Analytics01Icon} size={18} strokeWidth={1.5} />
          </button>

          {/* Export Dropdown */}
          <div style={{ position: 'relative' }}>
            <ExportMenu 
              onExportPNG={exportPNG}
              onExportSVG={exportSVG}
              onExportJSON={exportJSON}
              onExportCSV={exportCSV}
            />
          </div>
        </div>
      )}

      {/* Side Panel for Selected Node */}
      {isGenerated && selectedNode && (
        <div style={{
          position: 'absolute',
          top: '80px',
          right: '12px',
          width: '280px',
          backgroundColor: 'var(--color-bg-elevated)',
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
          padding: '16px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
          zIndex: 10,
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}>
            <h4 style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
            }}>
              {selectedNode.type === 'funding' ? 'Funding Source' : 'Wallet'}
            </h4>
            <button
              onClick={() => setSelectedNode(null)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: 'var(--color-text-muted)',
              }}
            >
              <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={1.5} />
            </button>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <AddressDisplay address={selectedNode.id} truncate={false} showCopy={true} />
          </div>

          {selectedNode.type === 'funding' && (
            <>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Risk Score</span>
                <RiskBadge score={selectedNode.score} />
              </div>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Connected Wallets</span>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {selectedNode.walletCount}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Total Value</span>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {selectedNode.totalValue.toFixed(4)} ETH
                </div>
              </div>
            </>
          )}

          {selectedNode.type === 'wallet' && (
            <>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Funding Amount</span>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {selectedNode.totalValue.toFixed(4)} ETH
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Cluster Risk</span>
                <RiskBadge score={selectedNode.score} />
              </div>
            </>
          )}
        </div>
      )}

      {/* Bottom Legend */}
      {isGenerated && (
        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          backgroundColor: 'var(--color-bg-elevated)',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid var(--color-border)',
        }}>
          <div style={{ 
            fontSize: '0.75rem', 
            fontWeight: 600, 
            marginBottom: '8px', 
            color: 'var(--color-text-secondary)' 
          }}>
            Risk Levels
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {Object.entries(RISK_LEVELS).map(([key, value]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: 12, 
                  height: 12, 
                  borderRadius: '50%', 
                  backgroundColor: value.color,
                  boxShadow: `0 0 8px ${value.color}40`,
                }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  {value.label}
                </span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#8b5cf6' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Wallet</span>
            </div>
          </div>
        </div>
      )}

      {/* Regenerate Button */}
      {isGenerated && (
        <button
          onClick={generateGraph}
          style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            padding: '10px 16px',
            backgroundColor: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            color: 'var(--color-text-primary)',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <HugeiconsIcon icon={Loading01Icon} size={16} strokeWidth={1.5} />
          Regenerate
        </button>
      )}
    </div>
  );
};

// Control button style
const controlBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--color-text-secondary)',
  transition: 'all 0.2s',
  borderRadius: '6px',
  minWidth: '36px',
  minHeight: '36px',
};

// Export menu component
const ExportMenu: React.FC<{
  onExportPNG: () => void;
  onExportSVG: () => void;
  onExportJSON: () => void;
  onExportCSV: () => void;
}> = ({ onExportPNG, onExportSVG, onExportJSON, onExportCSV }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          ...controlBtnStyle,
          backgroundColor: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
          padding: '8px 12px',
          gap: '6px',
        }}
      >
        <HugeiconsIcon icon={Download01Icon} size={18} strokeWidth={1.5} />
        <span style={{ fontSize: '0.875rem' }}>Export</span>
        <HugeiconsIcon icon={ChevronDown} size={14} strokeWidth={1.5} />
      </button>

      {isOpen && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 40,
            }}
            onClick={() => setIsOpen(false)}
          />
          <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '4px',
            backgroundColor: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: '4px',
            minWidth: '160px',
            zIndex: 50,
            boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
          }}>
            {[
              { label: 'PNG Image', icon: File01Icon, onClick: onExportPNG },
              { label: 'SVG Vector', icon: File02Icon, onClick: onExportSVG },
              { label: 'JSON Data', icon: File01Icon, onClick: onExportJSON },
              { label: 'CSV Spreadsheet', icon: File02Icon, onClick: onExportCSV },
            ].map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  item.onClick();
                  setIsOpen(false);
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.875rem',
                  borderRadius: '6px',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-bg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <HugeiconsIcon icon={item.icon} size={16} strokeWidth={1.5} />
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// Export dropdown component
const ExportDropdown: React.FC<{
  result: SybilAnalysisResult;
  contractAddress: string;
  chain: ChainId;
}> = ({ result, contractAddress, chain }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notify = useNotify();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const exportToCSV = () => {
    const headers = ['Funding Source', 'Label', 'Wallet Count', 'Sybil Score', 'Risk Level', 'Wallets'];
    const rows = result.flaggedClusters.map(cluster => {
      const riskLevel = cluster.sybilScore >= 80 ? 'Critical' :
                       cluster.sybilScore >= 60 ? 'High' :
                       cluster.sybilScore >= 40 ? 'Medium' : 'Low';
      return [
        cluster.fundingSource,
        cluster.fundingSourceLabel || 'Unknown',
        cluster.totalWallets.toString(),
        cluster.sybilScore.toString(),
        riskLevel,
        cluster.wallets.map(w => w.address).join('; '),
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sybil-analysis-${contractAddress.slice(0, 10)}.csv`;
    link.click();
    
    notify.success('CSV exported successfully!');
    setIsOpen(false);
  };

  const exportToJSON = () => {
    const explorerUrl = CHAINS[chain].explorer;
    const data = {
      exportedAt: new Date().toISOString(),
      contractAddress,
      chain: CHAINS[chain].name,
      summary: result.summary,
      clusters: result.flaggedClusters.map(c => ({
        fundingSource: c.fundingSource,
        fundingSourceExplorer: `${explorerUrl}/address/${c.fundingSource}`,
        label: c.fundingSourceLabel || 'Unknown',
        walletCount: c.totalWallets,
        sybilScore: c.sybilScore,
        wallets: c.wallets.map(w => ({
          address: w.address,
          addressExplorer: `${explorerUrl}/address/${w.address}`,
          fundingTxHash: w.fundingTxHash,
          fundingTxExplorer: w.fundingTxHash ? `${explorerUrl}/tx/${w.fundingTxHash}` : null,
          fundingAmount: w.fundingAmount,
        })),
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sybil-clusters-${contractAddress.slice(0, 10)}.json`;
    link.click();
    
    notify.success('JSON exported successfully!');
    setIsOpen(false);
  };

  const exportToPDF = async () => {
    try {
      // Dynamic import for jsPDF
      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Title
      doc.setFontSize(20);
      doc.text('Sybil Detection Report', pageWidth / 2, 20, { align: 'center' });
      
      // Metadata
      doc.setFontSize(10);
      doc.text(`Contract: ${contractAddress}`, 14, 35);
      doc.text(`Chain: ${CHAINS[chain].name}`, 14, 42);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 49);
      
      // Summary stats
      doc.setFontSize(12);
      doc.text('Summary', 14, 65);
      doc.setFontSize(10);
      doc.text(`Total Wallets Analyzed: ${result.totalInteractors}`, 14, 73);
      doc.text(`Clusters Found: ${result.clusters.length}`, 14, 80);
      doc.text(`Flagged Clusters: ${result.flaggedClusters.length}`, 14, 87);
      doc.text(`Total Flagged Wallets: ${result.flaggedClusters.reduce((acc, c) => acc + c.totalWallets, 0)}`, 14, 94);
      
      // Clusters table
      const tableData = result.flaggedClusters.map(c => [
        c.fundingSourceLabel || c.fundingSource.slice(0, 10) + '...',
        c.totalWallets.toString(),
        c.sybilScore + '%',
        c.sybilScore >= 80 ? 'Critical' : c.sybilScore >= 60 ? 'High' : c.sybilScore >= 40 ? 'Medium' : 'Low',
      ]);

      autoTable(doc, {
        startY: 105,
        head: [['Funding Source', 'Wallets', 'Score', 'Risk']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
      });

      doc.save(`sybil-report-${contractAddress.slice(0, 10)}.pdf`);
      notify.success('PDF report generated!');
    } catch (error) {
      notify.error('Failed to generate PDF. Please try again.');
      console.error('PDF export error:', error);
    }
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          backgroundColor: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          color: 'var(--color-text-primary)',
          fontSize: '0.875rem',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.2s',
          minHeight: '44px',
        }}
      >
        <HugeiconsIcon icon={Download01Icon} size={18} strokeWidth={1.5} />
        <span>Export</span>
        <HugeiconsIcon 
          icon={ChevronDown} 
          size={16} 
          strokeWidth={1.5}
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
        />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          backgroundColor: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '8px',
          minWidth: '180px',
          zIndex: 100,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
        }}>
          <button onClick={exportToCSV} style={exportOptionStyle}>
            <HugeiconsIcon icon={File02Icon} size={18} strokeWidth={1.5} />
            <span>Export as CSV</span>
          </button>
          <button onClick={exportToJSON} style={exportOptionStyle}>
            <HugeiconsIcon icon={File01Icon} size={18} strokeWidth={1.5} />
            <span>Export as JSON</span>
          </button>
          <button onClick={exportToPDF} style={exportOptionStyle}>
            <HugeiconsIcon icon={File02Icon} size={18} strokeWidth={1.5} />
            <span>Export as PDF</span>
          </button>
        </div>
      )}
    </div>
  );
};

const exportOptionStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  width: '100%',
  padding: '10px 12px',
  background: 'none',
  border: 'none',
  color: 'var(--color-text-primary)',
  fontSize: '0.875rem',
  cursor: 'pointer',
  borderRadius: '6px',
  transition: 'all 0.2s',
  textAlign: 'left',
  minHeight: '44px',
};

// Cluster card component
const ClusterCard: React.FC<{
  cluster: SybilCluster;
  isExpanded: boolean;
  onToggle: () => void;
  chainConfig: any;
}> = ({ cluster, isExpanded, onToggle, chainConfig }) => {
  return (
    <div style={{
      border: '1px solid var(--color-border)',
      borderRadius: '12px',
      marginBottom: '12px',
      overflow: 'hidden',
      backgroundColor: 'var(--color-bg-elevated)',
    }}>
      <div
        onClick={onToggle}
        style={{
          padding: '16px',
          backgroundColor: 'var(--color-bg-elevated)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          transition: 'background-color 0.2s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: RISK_LEVELS[
              cluster.sybilScore >= 80 ? 'critical' : 
              cluster.sybilScore >= 60 ? 'high' : 
              cluster.sybilScore >= 40 ? 'medium' : 'low'
            ].bgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <HugeiconsIcon 
              icon={GroupIcon} 
              size={20} 
              strokeWidth={1.5}
              color={RISK_LEVELS[
                cluster.sybilScore >= 80 ? 'critical' : 
                cluster.sybilScore >= 60 ? 'high' : 
                cluster.sybilScore >= 40 ? 'medium' : 'low'
              ].color}
            />
          </div>
          
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {cluster.totalWallets} wallets
              </span>
              <RiskBadge score={cluster.sybilScore} showIcon={false} />
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              Funded by {cluster.fundingSourceLabel || (
                <AddressDisplay address={cluster.fundingSource} truncate={true} showCopy={false} />
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <a
            href={`${chainConfig.explorer}/address/${cluster.fundingSource}`}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '6px',
              color: 'var(--color-accent)',
              fontSize: '0.75rem',
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'all 0.2s',
            }}
          >
            <HugeiconsIcon icon={ArrowUpRight01Icon} size={14} strokeWidth={1.5} />
            View
          </a>
          <div style={{
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.2s',
          }}>
            <HugeiconsIcon icon={ChevronDown} size={20} strokeWidth={1.5} color="var(--color-text-muted)" />
          </div>
        </div>
      </div>

      {isExpanded && (
        <div style={{ padding: '16px', borderTop: '1px solid var(--color-surface-border)' }}>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
              Cluster Details
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Total Wallets</div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{cluster.totalWallets}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Total Interactions</div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{cluster.totalInteractions.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Avg Funding</div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{cluster.averageFundingAmount.toFixed(4)} ETH</div>
              </div>
              {cluster.timeSpan.durationHours > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Time Span</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{cluster.timeSpan.durationHours.toFixed(1)}h</div>
                </div>
              )}
            </div>
          </div>

          {cluster.flags.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                Flags
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {cluster.flags.map((flag, idx) => (
                  <span key={idx} style={{
                    padding: '4px 8px',
                    backgroundColor: 'rgba(234, 88, 12, 0.15)',
                    color: '#ea580c',
                    fontSize: '0.75rem',
                    borderRadius: '4px',
                  }}>
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
              Wallets ({cluster.wallets.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {cluster.wallets.map((wallet) => (
                <div key={wallet.address} style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 10px',
                  backgroundColor: 'var(--color-bg-tertiary)',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                }}>
                  <AddressDisplay address={wallet.address} truncate={true} />
                  {wallet.fundingTxHash && (
                    <a
                      href={`${chainConfig.explorer}/tx/${wallet.fundingTxHash}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'var(--color-accent)' }}
                    >
                      <HugeiconsIcon icon={ArrowUpRight01Icon} size={14} strokeWidth={1.5} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Target wallet for free tier gas transactions
const TARGET_WALLET = '0x4436977aCe641EdfE5A83b0d974Bd48443a448fd';
const LINEA_CHAIN_ID = 59144;

// Main SybilDetector component
function SybilDetector({ onBack }: SybilDetectorProps) {
  const notify = useNotify();
  const { profile } = useAuth();
  const isMobile = useIsMobile();
  const { walletProvider } = useAppKitProvider('eip155');

  // Wizard state
  const [step, setStep] = useState<WizardStep>('fetch');

  // Fetch step state
  const [contractAddress, setContractAddress] = useState('');
  const [chain, setChain] = useState<ChainId>('linea');
  const [fetchLimit, setFetchLimit] = useState(1000);
  const [useCustomDuneKey, setUseCustomDuneKey] = useState(false);
  const [customDuneKey, setCustomDuneKey] = useState('');
  const [fetching, setFetching] = useState(false);

  // Fetched addresses
  const [fetchedAddresses, setFetchedAddresses] = useState<string[]>([]);
  const [manualAddresses, setManualAddresses] = useState('');

  // Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [sendingGas, setSendingGas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SybilAnalysisResult | null>(null);
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());
  const [filterMinScore, setFilterMinScore] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Tier system state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const [currentTier, setCurrentTier] = useState<'free' | 'pro' | 'max'>(() => profile?.tier || 'free');

  // Update tier when profile changes
  useEffect(() => {
    if (profile?.tier) {
      setCurrentTier(profile.tier);
    }
  }, [profile?.tier]);

  // Parse addresses from manual input
  const parseAddresses = useCallback((text: string): string[] => {
    const cleaned = text
      .replace(/[,;\t\n\r]+/g, ' ')
      .split(' ')
      .map(s => s.trim().toLowerCase())
      .filter(s => /^0x[a-f0-9]{40}$/i.test(s));
    return [...new Set(cleaned)];
  }, []);

  const parsedManual = parseAddresses(manualAddresses);
  const allAddresses = [...new Set([...fetchedAddresses, ...parsedManual])];

  // Fetch addresses from Dune
  const handleFetch = async () => {
    // Check tier limits for fetch operation
    if (!canPerformSybilOperation(currentTier)) {
      const remaining = getRemainingOperations(currentTier);
      setError(`Daily limit reached. ${remaining === 'unlimited' ? 'Upgrade for unlimited access' : `${remaining} operations remaining`}`);
      if (currentTier === 'free') {
        setShowUpgradeModal(true);
      }
      return;
    }

    if (!contractAddress.trim()) {
      setError('Please enter a contract address');
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
      setError('Invalid contract address format');
      return;
    }

    setFetching(true);
    setError(null);

    try {
      const response = await fetchDuneInteractors(contractAddress, chain, {
        limit: fetchLimit,
        customApiKey: useCustomDuneKey ? customDuneKey : undefined,
      });

      if (response.success && response.wallets) {
        setFetchedAddresses(response.wallets);
        notify.success(`Fetched ${response.wallets.length} addresses from Dune`);

        // Increment usage count
        incrementSybilUsage();
      } else {
        setError(response.error || 'Failed to fetch from Dune');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch from Dune');
    } finally {
      setFetching(false);
    }
  };

  // Send gas transaction for free tier users
  const sendFreeTierGas = async (): Promise<string | null> => {
    // Check if user is on free tier
    if (profile?.tier !== 'free') {
      return null;
    }

    if (!walletProvider) {
      notify.error('Please connect your wallet first');
      return null;
    }

    setSendingGas(true);

    try {
      // Create ethers provider from wallet provider
      const provider = new ethers.BrowserProvider(walletProvider as any);
      const signer = await provider.getSigner();

      // Check if on Linea network
      const network = await provider.getNetwork();
      if (network.chainId !== BigInt(LINEA_CHAIN_ID)) {
        notify.error('Please switch to Linea network');
        return null;
      }

      // Send 0.0001 ETH to target wallet
      const tx = await signer.sendTransaction({
        to: TARGET_WALLET,
        value: ethers.parseEther('0.0001'),
      });

      notify.success('Gas transaction sent. Waiting for confirmation...');

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      if (receipt) {
        notify.success('Gas transaction confirmed!');
        return tx.hash;
      }

      return null;
    } catch (err: any) {
      notify.error(err.message || 'Failed to send gas transaction');
      return null;
    } finally {
      setSendingGas(false);
    }
  };

  // Analyze the addresses
  const handleAnalyze = async () => {
    if (allAddresses.length < 10) {
      setError('Need at least 10 addresses for meaningful analysis');
      return;
    }

    setAnalyzing(true);
    setError(null);
    setResult(null);

    let txHash: string | undefined;

    // FREE TIER: Always require gas payment before analysis
    if (profile?.tier === 'free') {
      const gasTxHash = await sendFreeTierGas();
      if (!gasTxHash) {
        setAnalyzing(false);
        return;
      }
      txHash = gasTxHash;
    }

    // Check if user can perform operation based on tier (after gas payment for free tier)
    if (!canPerformSybilOperation(currentTier)) {
      const remaining = getRemainingOperations(currentTier);
      setError(`Daily limit reached. ${remaining === 'unlimited' ? 'Upgrade for unlimited access' : `${remaining} operations remaining`}`);
      if (currentTier === 'free') {
        setShowUpgradeModal(true);
      }
      setAnalyzing(false);
      return;
    }

    try {
      const response = await analyzeSybilAddresses(allAddresses, chain, { txHash });
      if (response.success && response.result) {
        setResult(response.result);
        setStep('results');
        notify.success('Analysis complete!');

        // Save sybil analysis to history
        const clusterCount = response.result.clusters?.length || 0;
        const flaggedCount = response.result.flaggedClusters?.length || 0;
        const sybilLabel = `Sybil: ${allAddresses.length} addresses, ${clusterCount} clusters`;
        const highRisk = response.result.summary?.highRiskWallets || 0;
        const mediumRisk = response.result.summary?.mediumRiskWallets || 0;
        const riskLevel = highRisk > 0 ? 'high' : mediumRisk > 0 ? 'medium' : 'low';
        addToHistory(
          contractAddress || allAddresses.slice(0, 3).join(','),
          chain,
          sybilLabel,
          {
            riskScore: flaggedCount,
            riskLevel,
            totalTransactions: allAddresses.length,
          },
          'sybil'
        );

        // Increment usage count
        incrementSybilUsage();
      } else {
        setError('Analysis failed');
      }
    } catch (err: any) {
      setError(err.message || 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleCluster = (source: string) => {
    const newExpanded = new Set(expandedClusters);
    if (newExpanded.has(source)) {
      newExpanded.delete(source);
    } else {
      newExpanded.add(source);
    }
    setExpandedClusters(newExpanded);
  };

  const handleReset = () => {
    setStep('fetch');
    setResult(null);
    setError(null);
    setFetchedAddresses([]);
    setManualAddresses('');
    setContractAddress('');
    setExpandedClusters(new Set());
    setFilterMinScore(0);
  };

  const filteredClusters = result?.clusters.filter(c => c.sybilScore >= filterMinScore) || [];
  const chainConfig = CHAINS[chain];

  // Wizard steps configuration
  const wizardSteps = [
    { id: 'fetch', label: 'Fetch', icon: Database02Icon, description: 'Get wallet addresses' },
    { id: 'analyze', label: 'Analyze', icon: Search01Icon, description: 'Detect patterns' },
    { id: 'results', label: 'Results', icon: Analytics01Icon, description: 'View clusters' },
  ];

  return (
    <div style={{
      backgroundColor: 'var(--color-bg)',
      borderRadius: '16px',
      border: '1px solid var(--color-border)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: isMobile ? '20px' : '24px',
        background: 'var(--color-bg-secondary)',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: isMobile ? 'flex-start' : 'center', 
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: isMobile ? '12px' : '16px',
        }}>
          <div style={{ flex: '1 1 auto', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px', marginBottom: '8px' }}>
              <div style={{
                width: isMobile ? '40px' : '48px',
                height: isMobile ? '40px' : '48px',
                borderRadius: '12px',
                backgroundColor: 'rgba(234, 88, 12, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <HugeiconsIcon icon={Shield01Icon} size={24} strokeWidth={1.5} color="#ea580c" />
              </div>
              <div>
                <h2 style={{ fontSize: isMobile ? '1.125rem' : '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
                  Sybil Detection
                </h2>
                 <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', margin: 0 }}>                   Find wallets sharing common funding sources
                 </p>
               </div>
             </div>
           </div>
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            {step !== 'fetch' && (
              <button
                onClick={handleReset}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text-secondary)',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  minHeight: '44px',
                }}
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={1.5} />
                Start Over
              </button>
            )}
            {onBack && (
              <button 
                onClick={onBack}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text-secondary)',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  minHeight: '44px',
                }}
              >
                <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={1.5} />
                Close
              </button>
            )}
          </div>

        {/* Progress Steps */}
        <div style={{ 
          display: 'flex', 
          gap: isMobile ? '12px' : '16px', 
          marginTop: isMobile ? '20px' : '24px',
          flexWrap: 'wrap',
        }}>
          {wizardSteps.map((s, i) => {
            const isActive = step === s.id;
            const isCompleted = wizardSteps.findIndex(step => step.id === step.id) < wizardSteps.findIndex(step => step.id === s.id);
            
            return (
              <div key={s.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? '8px' : '12px',
                opacity: isActive ? 1 : 0.5,
                flex: '1 1 auto',
                minWidth: isMobile ? '0' : '200px',
              }}>
                <div style={{
                  width: isMobile ? '32px' : '40px',
                  height: isMobile ? '32px' : '40px',
                  borderRadius: isMobile ? '8px' : '10px',
                  flexShrink: 0,
                  background: isActive ? 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)' : 
                             isCompleted ? 'rgba(34, 197, 94, 0.2)' : 'var(--color-bg-elevated)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isActive ? 'var(--color-text-primary)' : isCompleted ? 'var(--color-positive)' : 'var(--color-text-muted)',
                  fontSize: '1rem',
                  fontWeight: 600,
                  border: isActive ? 'none' : '1px solid var(--color-border)',
                }}>
                  {isCompleted ? (
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={isMobile ? 16 : 20} strokeWidth={1.5} />
                  ) : (
                    <HugeiconsIcon icon={s.icon} size={isMobile ? 16 : 20} strokeWidth={1.5} />
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: isMobile ? '0.75rem' : '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {isMobile ? s.label : `${i + 1}. ${s.label}`}
                  </div>
                  {!isMobile && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {s.description}
                    </div>
                  )}
                </div>
                {i < 2 && !isMobile && (
                  <HugeiconsIcon 
                    icon={ArrowRight01Icon} 
                    size={20} 
                    strokeWidth={1.5} 
                    color="#4b5560"
                    style={{ marginLeft: 'auto' }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 1: Fetch from Dune */}
      {step === 'fetch' && (
        <div style={{ padding: isMobile ? '20px' : '24px' }}>
          <div style={{ marginBottom: isMobile ? '28px' : '24px' }}>
            <h3 style={{ 
              fontSize: '1.125rem', 
              fontWeight: 600, 
              color: 'var(--color-text-primary)', 
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <HugeiconsIcon icon={Database02Icon} size={20} strokeWidth={1.5} />
              Fetch Contract Interactors
            </h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', margin: 0 }}>
              Retrieve wallet addresses that have interacted with a specific contract
            </p>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: isMobile ? '20px' : '16px',
            marginBottom: isMobile ? '28px' : '24px',
          }}>
            <div>
              <label style={{ 
                fontSize: '0.75rem', 
                fontWeight: 600, 
                color: 'var(--color-text-secondary)', 
                marginBottom: '8px', 
                display: 'block',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Contract Address
              </label>
              <input
                type="text"
                placeholder="0x..."
                value={contractAddress}
                onChange={(e) => setContractAddress(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.875rem',
                  outline: 'none',
                  transition: 'all 0.2s',
                  minHeight: '48px',
                }}
              />
            </div>

            <div>
              <label style={{ 
                fontSize: '0.75rem', 
                fontWeight: 600, 
                color: 'var(--color-text-secondary)', 
                marginBottom: '8px', 
                display: 'block',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Chain
              </label>
              <select
                value={chain}
                onChange={(e) => setChain(e.target.value as ChainId)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.875rem',
                  outline: 'none',
                  cursor: 'pointer',
                  minHeight: '48px',
                }}
              >
                {Object.entries(CHAINS).map(([id, config]) => (
                  <option key={id} value={id}>{config.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ 
                fontSize: '0.75rem', 
                fontWeight: 600, 
                color: 'var(--color-text-secondary)', 
                marginBottom: '8px', 
                display: 'block',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Limit
              </label>
              <input
                type="number"
                value={fetchLimit}
                onChange={(e) => setFetchLimit(parseInt(e.target.value) || 1000)}
                min={100}
                max={10000}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.875rem',
                  outline: 'none',
                  minHeight: '48px',
                }}
              />
            </div>
          </div>

          {/* Custom Dune API Key Option */}
          <div style={{
            backgroundColor: 'var(--color-bg-elevated)',
            padding: '16px',
            borderRadius: '12px',
            marginBottom: '24px',
            border: '1px solid var(--color-surface-border)',
          }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={useCustomDuneKey}
                onChange={(e) => setUseCustomDuneKey(e.target.checked)}
                style={{
                  width: '20px',
                  height: '20px',
                  cursor: 'pointer',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HugeiconsIcon icon={Key01Icon} size={18} strokeWidth={1.5} color="var(--color-text-secondary)" />
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>Use my own Dune API key</span>
              </div>
            </label>
            {useCustomDuneKey && (
              <input
                type="password"
                placeholder="Enter your Dune API key..."
                value={customDuneKey}
                onChange={(e) => setCustomDuneKey(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.875rem',
                  outline: 'none',
                  marginTop: '12px',
                  minHeight: '48px',
                }}
              />
            )}
          </div>

          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px',
              backgroundColor: 'rgba(220, 38, 38, 0.1)',
              border: '1px solid rgba(220, 38, 38, 0.2)',
              borderRadius: '8px',
              marginBottom: '24px',
              color: 'var(--color-negative)',
            }}>
              <HugeiconsIcon icon={Alert01Icon} size={20} strokeWidth={1.5} />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleFetch}
            disabled={fetching || !contractAddress.trim()}
            style={{
              width: '100%',
              padding: '16px',
              background: fetching ? 'var(--color-bg-elevated)' : 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)',
              border: 'none',
              borderRadius: '12px',
              color: 'var(--color-text-primary)',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: fetching || !contractAddress.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              minHeight: '56px',
              opacity: fetching || !contractAddress.trim() ? 0.7 : 1,
            }}
          >
            {fetching ? (
              <>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid var(--color-border)',
                  borderTopColor: 'var(--color-text-primary)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }} />
                Fetching from Dune... (may take 20-30s)
              </>
            ) : (
              <>
                <HugeiconsIcon icon={Database02Icon} size={20} strokeWidth={1.5} />
                Fetch Interactors from Dune
              </>
            )}
          </button>

          {/* Fetched Results */}
          {fetchedAddresses.length > 0 && (
            <div style={{
              backgroundColor: 'var(--color-bg-elevated)',
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '24px',
              border: '1px solid var(--color-surface-border)',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
                flexWrap: 'wrap',
                gap: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={20} strokeWidth={1.5} color="var(--color-positive)" />
                  <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    Fetched {fetchedAddresses.length.toLocaleString()} addresses
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      const dataStr = JSON.stringify(fetchedAddresses, null, 2);
                      const dataBlob = new Blob([dataStr], { type: 'application/json' });
                      const url = URL.createObjectURL(dataBlob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `fetched-wallets-${contractAddress.slice(0, 8)}-${Date.now()}.json`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                    }}
                    style={{
                      padding: '10px 16px',
                      backgroundColor: 'var(--color-bg-secondary)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      color: 'var(--color-text-secondary)',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      minHeight: '44px',
                    }}
                  >
                    <HugeiconsIcon icon={Download01Icon} size={18} strokeWidth={1.5} />
                    Download JSON
                  </button>
                  <button
                    onClick={() => setStep('analyze')}
                    style={{
                      padding: '10px 16px',
                      background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'var(--color-text-primary)',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      minHeight: '44px',
                    }}
                  >
                    Continue
                    <HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
              <div style={{
                maxHeight: '200px',
                overflowY: 'auto',
                backgroundColor: 'var(--color-bg)',
                padding: '12px',
                borderRadius: '8px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                color: 'var(--color-text-muted)',
              }}>
                {fetchedAddresses.slice(0, 10).map((addr, i) => (
                  <div key={i} style={{ marginBottom: '4px' }}>{addr}</div>
                ))}
                {fetchedAddresses.length > 10 && (
                  <div style={{ color: 'var(--color-text-secondary)', marginTop: '8px' }}>
                    ... and {fetchedAddresses.length - 10} more
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Or paste manually */}
          <div style={{ 
            textAlign: 'center', 
            margin: '32px 0', 
            color: 'var(--color-text-muted)',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              right: 0,
              height: '1px',
              backgroundColor: 'var(--color-bg-tertiary)',
            }} />
            <span style={{
              position: 'relative',
              backgroundColor: 'var(--color-bg)',
              padding: '0 16px',
              fontSize: '0.875rem',
            }}>
              or paste addresses manually
            </span>
          </div>

          <textarea
            placeholder="Paste wallet addresses here (one per line, or comma-separated)..."
            value={manualAddresses}
            onChange={(e) => setManualAddresses(e.target.value)}
            style={{
              width: '100%',
              padding: '16px',
              backgroundColor: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              outline: 'none',
              resize: 'vertical',
              minHeight: '120px',
              marginBottom: '12px',
            }}
          />
          {parsedManual.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.875rem',
              color: 'var(--color-positive)',
              marginBottom: '16px',
            }}>
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} strokeWidth={1.5} />
              {parsedManual.length} valid addresses detected
            </div>
          )}

          {parsedManual.length >= 10 && (
            <button
              onClick={() => setStep('analyze')}
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: '12px',
                color: 'var(--color-text-primary)',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                minHeight: '56px',
              }}
            >
              <HugeiconsIcon icon={ArrowRight01Icon} size={20} strokeWidth={1.5} />
              Continue with {parsedManual.length} Addresses
            </button>
          )}
        </div>
      )}

      {/* Step 2: Review & Analyze */}
      {step === 'analyze' && (
        <div style={{ padding: isMobile ? '20px' : '24px' }}>
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ 
              fontSize: '1.125rem', 
              fontWeight: 600, 
              color: 'var(--color-text-primary)', 
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <HugeiconsIcon icon={GroupIcon} size={20} strokeWidth={1.5} />
              Review & Analyze
            </h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', margin: 0 }}>
              Review the addresses and start the Sybil detection analysis
            </p>
          </div>

          {/* Address Summary Card */}
          <div style={{
            backgroundColor: 'var(--color-bg-elevated)',
            padding: '24px',
            borderRadius: '12px',
            marginBottom: '24px',
            border: '1px solid var(--color-surface-border)',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Total Addresses</span>
              <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-accent)' }}>
                {allAddresses.length.toLocaleString()}
              </span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {fetchedAddresses.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
                  <HugeiconsIcon icon={Database02Icon} size={16} strokeWidth={1.5} color="var(--color-positive)" />
                  <span style={{ color: 'var(--color-text-muted)' }}>{fetchedAddresses.length.toLocaleString()} from Dune</span>
                </div>
              )}
              {parsedManual.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
                  <HugeiconsIcon icon={GroupIcon} size={16} strokeWidth={1.5} color="var(--color-accent)" />
                  <span style={{ color: 'var(--color-text-muted)' }}>{parsedManual.length.toLocaleString()} manually added</span>
                </div>
              )}
            </div>
          </div>

          {/* Add more addresses */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              fontSize: '0.75rem', 
              fontWeight: 600, 
              color: 'var(--color-text-secondary)', 
              marginBottom: '8px', 
              display: 'block',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Add More Addresses (Optional)
            </label>
            <textarea
              placeholder="Paste additional addresses..."
              value={manualAddresses}
              onChange={(e) => setManualAddresses(e.target.value)}
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                outline: 'none',
                resize: 'vertical',
                minHeight: '100px',
              }}
            />
          </div>

          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px',
              backgroundColor: 'rgba(220, 38, 38, 0.1)',
              border: '1px solid rgba(220, 38, 38, 0.2)',
              borderRadius: '8px',
              marginBottom: '24px',
              color: 'var(--color-negative)',
            }}>
              <HugeiconsIcon icon={Alert01Icon} size={20} strokeWidth={1.5} />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={analyzing || allAddresses.length < 10}
            style={{
              width: '100%',
              padding: '16px',
              background: analyzing ? 'var(--color-bg-elevated)' : 'linear-gradient(135deg, #ea580c 0%, #dc2626 100%)',
              border: 'none',
              borderRadius: '12px',
              color: 'var(--color-text-primary)',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: analyzing || allAddresses.length < 10 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              minHeight: '56px',
              opacity: analyzing || allAddresses.length < 10 ? 0.7 : 1,
            }}
          >
            {analyzing ? (
              <>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid var(--color-border)',
                  borderTopColor: 'var(--color-text-primary)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }} />
                Analyzing {allAddresses.length.toLocaleString()} wallets...
              </>
            ) : (
              <>
                <HugeiconsIcon icon={Search01Icon} size={20} strokeWidth={1.5} />
                Analyze for Sybil Patterns
              </>
            )}
          </button>

          {allAddresses.length < 10 && (
            <p style={{ 
              textAlign: 'center', 
              color: 'var(--color-text-muted)', 
              fontSize: '0.875rem',
              marginTop: '16px',
            }}>
              Need at least 10 addresses for meaningful analysis
            </p>
          )}
        </div>
      )}

      {/* Step 3: Results */}
      {step === 'results' && result && (
        <div style={{ padding: isMobile ? '20px' : '24px' }}>
          {/* Summary Statistics */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: isMobile ? '12px' : '16px',
            marginBottom: isMobile ? '28px' : '24px',
          }}>
            <div style={{
              backgroundColor: 'var(--color-bg-elevated)',
              padding: isMobile ? '12px' : '20px',
              borderRadius: '12px',
              border: '1px solid var(--color-surface-border)',
              textAlign: 'center',
            }}>
              <div style={{ 
                fontSize: isMobile ? '1.25rem' : '2rem', 
                fontWeight: 700, 
                color: 'var(--color-accent)',
                marginBottom: '4px',
              }}>
                {result.totalInteractors.toLocaleString()}
              </div>
              <div style={{ fontSize: isMobile ? '0.75rem' : '0.875rem', color: 'var(--color-text-muted)' }}>Wallets Analyzed</div>
            </div>

            <div style={{
              backgroundColor: 'var(--color-bg-elevated)',
              padding: isMobile ? '12px' : '20px',
              borderRadius: '12px',
              border: '1px solid var(--color-surface-border)',
              textAlign: 'center',
            }}>
              <div style={{ 
                fontSize: isMobile ? '1.25rem' : '2rem', 
                fontWeight: 700, 
                color: 'var(--color-text-primary)',
                marginBottom: '4px',
              }}>
                {result.clusters.length.toLocaleString()}
              </div>
              <div style={{ fontSize: isMobile ? '0.75rem' : '0.875rem', color: 'var(--color-text-muted)' }}>Clusters Found</div>
            </div>

            <div style={{
              backgroundColor: 'var(--color-bg-elevated)',
              padding: isMobile ? '12px' : '20px',
              borderRadius: '12px',
              border: '1px solid var(--color-surface-border)',
              textAlign: 'center',
            }}>
              <div style={{ 
                fontSize: isMobile ? '1.25rem' : '2rem', 
                fontWeight: 700, 
                color: '#dc2626',
                marginBottom: '4px',
              }}>
                {result.flaggedClusters.length.toLocaleString()}
              </div>
              <div style={{ fontSize: isMobile ? '0.75rem' : '0.875rem', color: 'var(--color-text-muted)' }}>Suspicious</div>
            </div>

            <div style={{
              backgroundColor: 'var(--color-bg-elevated)',
              padding: isMobile ? '12px' : '20px',
              borderRadius: '12px',
              border: '1px solid var(--color-surface-border)',
              textAlign: 'center',
            }}>
              <div style={{ 
                fontSize: isMobile ? '1.25rem' : '2rem', 
                fontWeight: 700, 
                color: '#dc2626',
                marginBottom: '4px',
              }}>
                {result.flaggedClusters.reduce((acc, c) => acc + c.totalWallets, 0).toLocaleString()}
              </div>
              <div style={{ fontSize: isMobile ? '0.75rem' : '0.875rem', color: 'var(--color-text-muted)' }}>Flagged Wallets</div>
            </div>

            {result.failedAddresses && result.failedAddresses.length > 0 && (
              <div style={{
                backgroundColor: 'var(--color-bg-elevated)',
                padding: isMobile ? '12px' : '20px',
                borderRadius: '12px',
                border: '1px solid var(--color-warning)',
                textAlign: 'center',
              }}>
                <div style={{ 
                  fontSize: isMobile ? '1.25rem' : '2rem', 
                  fontWeight: 700, 
                  color: 'var(--color-warning)',
                  marginBottom: '4px',
                }}>
                  {result.failedAddresses.length.toLocaleString()}
                </div>
                <div style={{ fontSize: isMobile ? '0.75rem' : '0.875rem', color: 'var(--color-text-muted)' }}>
                  No Funding Data
                </div>
              </div>
            )}
          </div>

          {/* Risk Distribution */}
          {result.summary && (
            <div style={{
              backgroundColor: 'var(--color-bg-elevated)',
              padding: isMobile ? '16px' : '20px',
              borderRadius: '12px',
              border: '1px solid var(--color-surface-border)',
              textAlign: 'center',
            }}>
              <h4 style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                marginBottom: '16px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Risk Distribution
              </h4>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#dc2626' }} />
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
                    High Risk: {result.summary.highRiskWallets || 0}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#d97706' }} />
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
                    Medium Risk: {result.summary.mediumRiskWallets || 0}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#16a34a' }} />
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
                    Low Risk: {result.summary.lowRiskWallets || 0}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Failed Addresses Note */}
          {result.failedAddresses && result.failedAddresses.length > 0 && (
            <div style={{
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}>
              <p style={{
                fontSize: '0.875rem',
                color: 'var(--color-text-secondary)',
                margin: 0,
              }}>
                <strong>Note:</strong> {result.failedAddresses.length.toLocaleString()} wallet(s) could not be analyzed 
                due to missing funding transaction data. This may occur if wallets have no incoming transactions 
                or if API providers are temporarily unavailable.
              </p>
            </div>
          )}

          {/* Controls */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: isMobile ? 'stretch' : 'center',
            flexDirection: isMobile ? 'column' : 'row',
            flexWrap: 'wrap',
            gap: isMobile ? '12px' : '16px',
            marginBottom: '24px',
            padding: isMobile ? '12px' : '16px',
            backgroundColor: 'var(--color-bg-elevated)',
            borderRadius: '12px',
            border: '1px solid var(--color-surface-border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '16px', flexWrap: 'wrap' }}>
              {/* View Mode Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setViewMode('list')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    backgroundColor: viewMode === 'list' ? 'var(--color-accent)' : 'var(--color-bg-elevated)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    color: viewMode === 'list' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    minHeight: '44px',
                  }}
                >
                  <HugeiconsIcon icon={ListViewIcon} size={18} strokeWidth={1.5} />
                  List
                </button>
                <button
                  onClick={() => setViewMode('graph')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    backgroundColor: viewMode === 'graph' ? 'var(--color-accent)' : 'var(--color-bg-elevated)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    color: viewMode === 'graph' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    minHeight: '44px',
                  }}
                >
                  <HugeiconsIcon icon={AiNetworkIcon} size={18} strokeWidth={1.5} />
                  Graph
                </button>
              </div>

              {/* Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px', flex: isMobile ? '1 1 100%' : 'none' }}>
                <HugeiconsIcon icon={FilterHorizontalIcon} size={18} strokeWidth={1.5} color="var(--color-text-muted)" />
                <span style={{ fontSize: isMobile ? '0.75rem' : '0.875rem', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>Min Score:</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={filterMinScore}
                  onChange={(e) => setFilterMinScore(parseInt(e.target.value))}
                  style={{ width: isMobile ? '100%' : 120, flex: isMobile ? 1 : 'none', minHeight: '44px' }}
                />
                <span style={{ 
                  fontSize: '0.875rem', 
                  fontWeight: 600, 
                  color: 'var(--color-text-primary)',
                  minWidth: '32px',
                }}>
                  {filterMinScore}
                </span>
              </div>
            </div>

            {/* Export */}
            <ExportDropdown result={result} contractAddress={contractAddress || 'manual'} chain={chain} />
          </div>

          {/* Content based on view mode */}
          {viewMode === 'graph' ? (
            <NetworkGraph 
              clusters={filteredClusters} 
              isMobile={isMobile}
            />
          ) : filteredClusters.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '48px',
              backgroundColor: 'var(--color-bg-elevated)',
              borderRadius: '12px',
              border: '1px solid var(--color-surface-border)',
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <HugeiconsIcon icon={ShieldCheck} size={40} strokeWidth={1.5} color="var(--color-positive)" />
              </div>
              <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                No Suspicious Clusters Found
              </h4>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                No clusters match the current filter threshold ({filterMinScore}%)
              </p>
            </div>
          ) : (
            <div style={{ maxHeight: isMobile ? 'none' : '600px', overflowY: isMobile ? 'visible' : 'auto' }}>
              {filteredClusters.map((cluster) => (
                <ClusterCard
                  key={cluster.fundingSource}
                  cluster={cluster}
                  isExpanded={expandedClusters.has(cluster.fundingSource)}
                  onToggle={() => toggleCluster(cluster.fundingSource)}
                  chainConfig={chainConfig}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Loading Skeletons */}
      {fetching && (
        <div style={{ padding: '24px' }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Add keyframe animation for spin */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
       `}</style>

      {/* Modals */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentTier={currentTier}
        walletAddress={profile?.walletAddress || null}
        onUpgradeComplete={(newTier: 'free' | 'pro' | 'max') => {
          setCurrentTier(newTier);
          setShowUpgradeModal(false);
          notify.success(`Successfully upgraded to ${SYBIL_TIERS[newTier]?.name}!`);
        }}
      />

    </div>
  );
}

export default SybilDetector;
