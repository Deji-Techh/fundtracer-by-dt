import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { useNotify } from '../../contexts/ToastContext';
import { ChainId, CHAINS } from '@fundtracer/core';
import './AdvancedGraph.css';

interface GraphNode {
  id: string;
  address: string;
  label: string;
  type: 'wallet' | 'contract' | 'exchange' | 'mixer' | 'dao' | 'nft' | 'defi' | 'target';
  balance?: number;
  transactionCount?: number;
  totalVolume?: number;
  imageUrl?: string;
  entityLabel?: string;
  riskScore?: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphEdge {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  type: 'sent' | 'received' | 'swap' | 'call';
  value: number;
  timestamp?: number;
  txHash?: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface AdvancedGraphProps {
  targetAddress?: string;
  chain?: ChainId;
  onClose?: () => void;
}

type LayoutMode = 'force' | 'tree' | 'radial' | 'grid';
type ViewMode = 'full' | 'received' | 'sent' | 'both';

const NODE_COLORS: Record<string, string> = {
  wallet: '#3b4252',
  contract: '#8b5cf6',
  exchange: '#5e81ac',
  mixer: '#d08770',
  dao: '#a3be8c',
  nft: '#b48ead',
  defi: '#88c0d0',
  target: '#81a1c1',
  suspicious: '#bf616a',
};

const ENTITY_LOGOS: Record<string, string> = {
  binance: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
  coinbase: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
  kraken: 'https://assets.coingecko.com/coins/images/4711/small/mark_eth.png',
  uniswap: 'https://assets.coingecko.com/coins/images/12504/small/uniswap-uni.png',
  compound: 'https://assets.coingecko.com/coins/images/10775/small/COMP.png',
};

const Icon = ({ name, size = 20, className = '' }: { name: string; size?: number; className?: string }) => {
  const icons: Record<string, JSX.Element> = {
    search: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
    zoomIn: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6M8 11h6"/></svg>,
    zoomOut: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M8 11h6"/></svg>,
    maximize: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>,
    download: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>,
    chevronDown: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="m6 9 6 6 6-6"/></svg>,
    copy: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>,
    eye: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>,
    eyeOff: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20"/></svg>,
    filter: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
    grid: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>,
    refresh: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>,
    pause: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><rect width="4" height="16" x="6" y="4"/><rect width="4" height="16" x="14" y="4"/></svg>,
    play: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><polygon points="6 3 20 12 6 21 6 3"/></svg>,
    close: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M18 6 6 18M6 6l12 12"/></svg>,
    star: <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" className={className}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    starOutline: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    arrowRight: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M5 12h14M12 5l7 7-7 7"/></svg>,
    network: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><circle cx="12" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/><path d="M12 8v4M7.5 15.5 12 12m4.5 3.5L12 12"/></svg>,
    chevronRight: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="m9 18 6-6-6-6"/></svg>,
  };
  return icons[name] || icons.search;
};

const AdvancedGraph: React.FC<AdvancedGraphProps> = ({ targetAddress, chain = 'ethereum', onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(null);
  const notify = useNotify();

  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('both');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('force');
  const [maxHops, setMaxHops] = useState(3);
  const [minValue, setMinValue] = useState(0);
  const [showLabels, setShowLabels] = useState(true);
  const [showMinimap, setShowMinimap] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredNodes, setFilteredNodes] = useState<Set<string>>(new Set());
  const [pinnedNodes, setPinnedNodes] = useState<Set<string>>(new Set());
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());

  const chainConfig = CHAINS[chain as keyof typeof CHAINS] || CHAINS.ethereum;

  useEffect(() => {
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, []);

  const generateMockData = useCallback((): GraphData => {
    const address = targetAddress || '0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1';
    const targetLabel = `${address.slice(0, 6)}...${address.slice(-4)}`;

    const nodes: GraphNode[] = [
      {
        id: 'target',
        address: address,
        label: targetLabel,
        type: 'target',
        balance: 1.234,
        transactionCount: 847,
        totalVolume: 456.78,
      },
    ];

    const edges: GraphEdge[] = [];

    const receivedWallets = [
      { label: 'Binance 8', type: 'exchange' as const, entity: 'binance' },
      { label: 'Coinbase 3', type: 'exchange' as const, entity: 'coinbase' },
      { label: '0x8a2...', type: 'wallet' as const },
      { label: '0x3f9...', type: 'wallet' as const },
      { label: '0x1c4...', type: 'wallet' as const },
      { label: 'Uniswap V3', type: 'defi' as const, entity: 'uniswap' },
      { label: '0x7b2...', type: 'wallet' as const },
      { label: '0x9d1...', type: 'contract' as const },
    ];

    receivedWallets.forEach((w, i) => {
      const nodeId = `recv_${i}`;
      nodes.push({
        id: nodeId,
        address: `0x${Math.random().toString(16).slice(2, 42)}`,
        label: w.label,
        type: w.type,
        entityLabel: w.entity,
        imageUrl: w.entity ? ENTITY_LOGOS[w.entity] : undefined,
        balance: Math.random() * 10,
        transactionCount: Math.floor(Math.random() * 500),
        totalVolume: Math.random() * 100,
      });

      edges.push({
        id: `recv_edge_${i}`,
        source: nodeId,
        target: 'target',
        type: 'received',
        value: Math.random() * 50,
        timestamp: Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
      });
    });

    const sentWallets = [
      { label: 'Kraken 2', type: 'exchange' as const, entity: 'kraken' },
      { label: '0x4a8...', type: 'wallet' as const },
      { label: '0x2c9...', type: 'wallet' as const },
      { label: 'Compound', type: 'defi' as const, entity: 'compound' },
      { label: '0x5f1...', type: 'wallet' as const },
      { label: '0x8e3...', type: 'wallet' as const },
      { label: '0x6d7...', type: 'contract' as const },
      { label: '0x1a2...', type: 'nft' as const },
    ];

    sentWallets.forEach((w, i) => {
      const nodeId = `sent_${i}`;
      nodes.push({
        id: nodeId,
        address: `0x${Math.random().toString(16).slice(2, 42)}`,
        label: w.label,
        type: w.type,
        entityLabel: w.entity,
        imageUrl: w.entity ? ENTITY_LOGOS[w.entity] : undefined,
        balance: Math.random() * 5,
        transactionCount: Math.floor(Math.random() * 300),
        totalVolume: Math.random() * 80,
      });

      edges.push({
        id: `sent_edge_${i}`,
        source: 'target',
        target: nodeId,
        type: 'sent',
        value: Math.random() * 30,
        timestamp: Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
      });
    });

    const secondaryNodes = [
      { label: '0x9c8...', type: 'wallet' as const },
      { label: '0x3b7...', type: 'wallet' as const },
      { label: '0x5e2...', type: 'mixer' as const },
      { label: 'DAO Maker', type: 'dao' as const },
      { label: '0x8a1...', type: 'wallet' as const },
    ];

    secondaryNodes.forEach((w, i) => {
      const nodeId = `sec_${i}`;
      nodes.push({
        id: nodeId,
        address: `0x${Math.random().toString(16).slice(2, 42)}`,
        label: w.label,
        type: w.type,
        balance: Math.random() * 2,
        transactionCount: Math.floor(Math.random() * 100),
        totalVolume: Math.random() * 20,
      });

      const parentId = Math.random() > 0.5 ? `recv_${Math.floor(Math.random() * 5)}` : `sent_${Math.floor(Math.random() * 5)}`;
      edges.push({
        id: `sec_edge_${i}`,
        source: parentId,
        target: nodeId,
        type: Math.random() > 0.5 ? 'sent' : 'call',
        value: Math.random() * 10,
        timestamp: Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000,
      });
    });

    return { nodes, edges };
  }, [targetAddress]);

  const renderGraph = useCallback(() => {
    if (!svgRef.current || !containerRef.current || graphData.nodes.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    const defs = svg.append('defs');

    defs.append('marker')
      .attr('id', 'arrow-sent')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 38)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('fill', '#81a1c1')
      .attr('d', 'M0,-5L10,0L0,5');

    defs.append('marker')
      .attr('id', 'arrow-received')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 38)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('fill', '#88c0d0')
      .attr('d', 'M0,-5L10,0L0,5');

    const g = svg.append('g');

    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoom(event.transform.k);
      });

    svg.call(zoomBehavior);

    const filteredEdges = graphData.edges.filter(edge => {
      const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
      if (filteredNodes.size > 0 && !filteredNodes.has(sourceId) && !filteredNodes.has(targetId)) {
        return false;
      }
      if (edge.value < minValue) return false;
      return true;
    });

    const filteredNodesList = graphData.nodes.filter(node => filteredNodes.size === 0 || filteredNodes.has(node.id));

    const simulation = d3.forceSimulation<GraphNode>(filteredNodesList)
      .force('link', d3.forceLink<GraphNode, GraphEdge>(filteredEdges)
        .id(d => d.id)
        .distance(150)
        .strength(0.5))
      .force('charge', d3.forceManyBody().strength(-500))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(60))
      .alphaDecay(0.02);

    simulationRef.current = simulation;

    const linkGroup = g.append('g').attr('class', 'links');
    const nodeGroup = g.append('g').attr('class', 'nodes');
    const labelGroup = g.append('g').attr('class', 'labels');

    const links = linkGroup.selectAll('line')
      .data(filteredEdges)
      .enter()
      .append('line')
      .attr('class', d => `edge edge-${d.type}`)
      .attr('stroke', d => d.type === 'sent' ? '#81a1c1' : d.type === 'received' ? '#88c0d0' : '#a3be8c')
      .attr('stroke-width', d => Math.max(1, Math.sqrt(d.value) * 0.5))
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', d => d.type === 'sent' ? 'url(#arrow-sent)' : d.type === 'received' ? 'url(#arrow-received)' : undefined);

    const nodeRadius = 40;
    const nodes = nodeGroup.selectAll('.node-group')
      .data(filteredNodesList)
      .enter()
      .append('g')
      .attr('class', 'node-group')
      .attr('transform', d => `translate(${d.x || width / 2}, ${d.y || height / 2})`)
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          if (!pinnedNodes.has(d.id)) {
            d.fx = null;
            d.fy = null;
          }
        }) as any);

    nodes.append('circle')
      .attr('class', d => `node-circle node-${d.type} ${d.type === 'target' ? 'node-target' : ''}`)
      .attr('r', d => d.type === 'target' ? nodeRadius * 1.15 : nodeRadius)
      .attr('fill', d => NODE_COLORS[d.type] || NODE_COLORS.wallet)
      .attr('stroke', d => d.type === 'target' ? '#81a1c1' : '#1a1d28')
      .attr('stroke-width', d => d.type === 'target' ? 3 : 2);

    nodes.filter(d => d.imageUrl)
      .append('clipPath')
      .attr('id', d => `clip-${d.id.replace(/[^a-zA-Z0-9]/g, '')}`)
      .append('circle')
      .attr('r', nodeRadius - 4);

    nodes.filter(d => d.imageUrl)
      .append('image')
      .attr('href', d => d.imageUrl!)
      .attr('x', -nodeRadius + 4)
      .attr('y', -nodeRadius + 4)
      .attr('width', (nodeRadius - 4) * 2)
      .attr('height', (nodeRadius - 4) * 2)
      .attr('clip-path', d => `url(#clip-${d.id.replace(/[^a-zA-Z0-9]/g, '')})`);

    nodes.filter(d => !d.imageUrl)
      .append('text')
      .attr('class', 'node-text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', '#eceff4')
      .attr('font-size', '11px')
      .attr('font-weight', d => d.type === 'target' ? 'bold' : 'normal')
      .attr('pointer-events', 'none')
      .text(d => d.label);

    nodes.on('click', (event, d) => {
      event.stopPropagation();
      setSelectedNode(d);
    });

    nodes.on('mouseenter', (event, d) => {
      setHoveredNode(d);
      d3.select(event.currentTarget).select('circle')
        .transition()
        .duration(200)
        .attr('stroke', '#fbbf24')
        .attr('stroke-width', 4);
    });

    nodes.on('mouseleave', (event, d) => {
      setHoveredNode(null);
      if (selectedNode?.id !== d.id) {
        d3.select(event.currentTarget).select('circle')
          .transition()
          .duration(200)
          .attr('stroke', d.type === 'target' ? '#81a1c1' : '#1a1d28')
          .attr('stroke-width', d.type === 'target' ? 3 : 2);
      }
    });

    const labels = labelGroup.selectAll('text')
      .data(filteredNodesList)
      .enter()
      .append('text')
      .attr('class', 'node-label')
      .attr('text-anchor', 'middle')
      .attr('fill', '#d8dee9')
      .attr('font-size', '10px')
      .attr('opacity', showLabels ? 1 : 0)
      .text(d => d.entityLabel || d.address.slice(0, 8) + '...');

    simulation.on('tick', () => {
      links
        .attr('x1', d => (d.source as GraphNode).x || 0)
        .attr('y1', d => (d.source as GraphNode).y || 0)
        .attr('x2', d => (d.target as GraphNode).x || 0)
        .attr('y2', d => (d.target as GraphNode).y || 0);

      nodes.attr('transform', d => `translate(${d.x || 0}, ${d.y || 0})`);

      labels
        .attr('x', d => d.x || 0)
        .attr('y', d => (d.y || 0) + nodeRadius + 15);
    });

    svg.on('click', () => {
      setSelectedNode(null);
    });

  }, [graphData, filteredNodes, minValue, showLabels, pinnedNodes, selectedNode]);

  const handleGenerate = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => {
      const data = generateMockData();
      setGraphData(data);
      setFilteredNodes(new Set());
      setIsGenerated(true);
      setIsLoading(false);
      notify.success(`Graph generated with ${data.nodes.length} nodes`);
    }, 500);
  }, [generateMockData, notify]);

  useEffect(() => {
    if (isGenerated && graphData.nodes.length > 0) {
      renderGraph();
    }
  }, [isGenerated, renderGraph]);

  useEffect(() => {
    const handleResize = () => {
      if (isGenerated) {
        renderGraph();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isGenerated, renderGraph]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredNodes(new Set());
      return;
    }
    const q = query.toLowerCase();
    const matches = new Set(
      graphData.nodes
        .filter(n => 
          n.label.toLowerCase().includes(q) || 
          n.address.toLowerCase().includes(q) ||
          (n.entityLabel && n.entityLabel.toLowerCase().includes(q))
        )
        .map(n => n.id)
    );
    setFilteredNodes(matches);
  }, [graphData]);

  const handleCopyAddress = useCallback((address: string) => {
    navigator.clipboard.writeText(address);
    notify.success('Address copied!');
  }, [notify]);

  const handleTogglePin = useCallback((nodeId: string) => {
    setPinnedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const handleToggleWatchlist = useCallback((nodeId: string) => {
    setWatchlist(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const handleZoomIn = useCallback(() => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().duration(300).call(
        d3.zoom<SVGSVGElement, unknown>().scaleBy as any,
        1.3
      );
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().duration(300).call(
        d3.zoom<SVGSVGElement, unknown>().scaleBy as any,
        0.7
      );
    }
  }, []);

  const handleFit = useCallback(() => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().duration(500).call(
        d3.zoom<SVGSVGElement, unknown>().transform as any,
        d3.zoomIdentity
      );
    }
  }, []);

  const handleExportPNG = useCallback(() => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    canvas.width = containerRef.current?.clientWidth || 1200;
    canvas.height = containerRef.current?.clientHeight || 800;
    img.onload = () => {
      ctx?.drawImage(img, 0, 0);
      const link = document.createElement('a');
      link.download = `fundtracer-graph-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      notify.success('Graph exported as PNG');
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }, [notify]);

  const handleExportSVG = useCallback(() => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `fundtracer-graph-${Date.now()}.svg`;
    link.href = url;
    link.click();
    notify.success('Graph exported as SVG');
  }, [notify]);

  const nodeCount = graphData.nodes.length;
  const edgeCount = graphData.edges.length;
  const totalVolume = graphData.edges.reduce((sum, e) => sum + e.value, 0);

  return (
    <div className="advanced-graph">
      {!isGenerated && !isLoading && (
        <div className="graph-empty-state">
          <div className="graph-empty-icon">
            <Icon name="network" size={64} />
          </div>
          <h2 className="graph-empty-title">Advanced Graph Analysis</h2>
          <p className="graph-empty-desc">
            Visualize wallet connections with interactive force-directed graphs.
            Track fund flows, identify patterns, and explore multi-hop relationships.
          </p>
          <div className="graph-empty-controls">
            <div className="control-group">
              <label>Max Hops</label>
              <div className="hop-selector">
                {[1, 2, 3, 4, 5].map(h => (
                  <button
                    key={h}
                    className={`hop-btn ${maxHops === h ? 'active' : ''}`}
                    onClick={() => setMaxHops(h)}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
            <div className="control-group">
              <label>View Mode</label>
              <select value={viewMode} onChange={e => setViewMode(e.target.value as ViewMode)}>
                <option value="both">Both Directions</option>
                <option value="received">Received Only</option>
                <option value="sent">Sent Only</option>
              </select>
            </div>
          </div>
          <button className="btn-generate" onClick={handleGenerate}>
            <Icon name="network" size={20} />
            Generate Graph
          </button>
          <div className="graph-stats-preview">
            <div className="stat-item">
              <span className="stat-num">{graphData.nodes.length || '—'}</span>
              <span className="stat-label">Nodes</span>
            </div>
            <div className="stat-item">
              <span className="stat-num">{graphData.edges.length || '—'}</span>
              <span className="stat-label">Edges</span>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="graph-loading">
          <div className="loading-spinner" />
          <span>Building graph...</span>
        </div>
      )}

      <div 
        ref={containerRef} 
        className="graph-container"
        style={{ display: isGenerated && !isLoading ? 'block' : 'none' }}
      >
        <svg ref={svgRef} className="graph-svg" />

        <div className="graph-controls-top">
          <div className="search-box">
            <Icon name="search" size={18} />
            <input
              type="text"
              placeholder="Search nodes..."
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
            />
          </div>

          <div className="control-group-inline">
            <button className="ctrl-btn" onClick={handleZoomIn} title="Zoom In">
              <Icon name="zoomIn" size={18} />
            </button>
            <button className="ctrl-btn" onClick={handleZoomOut} title="Zoom Out">
              <Icon name="zoomOut" size={18} />
            </button>
            <button className="ctrl-btn" onClick={handleFit} title="Fit to Screen">
              <Icon name="maximize" size={18} />
            </button>
            <button 
              className={`ctrl-btn ${isPaused ? 'active' : ''}`} 
              onClick={() => setIsPaused(!isPaused)}
              title={isPaused ? 'Resume' : 'Pause'}
            >
              <Icon name={isPaused ? 'play' : 'pause'} size={18} />
            </button>
          </div>

          <div className="control-group-inline">
            <button 
              className={`ctrl-btn ${showLabels ? 'active' : ''}`}
              onClick={() => setShowLabels(!showLabels)}
              title="Toggle Labels"
            >
              <Icon name={showLabels ? 'eye' : 'eyeOff'} size={18} />
            </button>
            <button 
              className={`ctrl-btn ${showMinimap ? 'active' : ''}`}
              onClick={() => setShowMinimap(!showMinimap)}
              title="Toggle Minimap"
            >
              <Icon name="grid" size={18} />
            </button>
          </div>

          <div className="export-dropdown">
            <button className="ctrl-btn">
              <Icon name="download" size={18} />
              <span>Export</span>
              <Icon name="chevronDown" size={14} />
            </button>
            <div className="export-menu">
              <button onClick={handleExportPNG}>PNG Image</button>
              <button onClick={handleExportSVG}>SVG Vector</button>
            </div>
          </div>
        </div>

        <div className="graph-controls-left">
          <div className="filter-section">
            <div className="filter-header">
              <Icon name="filter" size={16} />
              <span>Filters</span>
            </div>
            
            <div className="filter-group">
              <label>Max Hops</label>
              <div className="hop-buttons">
                {[1, 2, 3, 4, 5].map(h => (
                  <button
                    key={h}
                    className={`hop-btn ${maxHops === h ? 'active' : ''}`}
                    onClick={() => setMaxHops(h)}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <label>Min Value (ETH)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={minValue}
                onChange={e => setMinValue(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="filter-group">
              <label>View Mode</label>
              <select value={viewMode} onChange={e => setViewMode(e.target.value as ViewMode)}>
                <option value="both">Both</option>
                <option value="received">Received</option>
                <option value="sent">Sent</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Layout</label>
              <div className="layout-buttons">
                <button 
                  className={`layout-btn ${layoutMode === 'force' ? 'active' : ''}`}
                  onClick={() => setLayoutMode('force')}
                  title="Force Directed"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="3"/></svg>
                </button>
                <button 
                  className={`layout-btn ${layoutMode === 'tree' ? 'active' : ''}`}
                  onClick={() => setLayoutMode('tree')}
                  title="Tree"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 2v12M4 10l4-4 4 4"/></svg>
                </button>
                <button 
                  className={`layout-btn ${layoutMode === 'radial' ? 'active' : ''}`}
                  onClick={() => setLayoutMode('radial')}
                  title="Radial"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="2" fill="currentColor"/><circle cx="8" cy="2" r="1.5"/><circle cx="13" cy="11" r="1.5"/><circle cx="3" cy="11" r="1.5"/></svg>
                </button>
              </div>
            </div>
          </div>

          <div className="legend-section">
            <div className="legend-header">Legend</div>
            <div className="legend-items">
              <div className="legend-item">
                <span className="legend-dot" style={{ backgroundColor: NODE_COLORS.target }} />
                <span>Target</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot" style={{ backgroundColor: NODE_COLORS.wallet }} />
                <span>Wallet</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot" style={{ backgroundColor: NODE_COLORS.exchange }} />
                <span>Exchange</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot" style={{ backgroundColor: NODE_COLORS.defi }} />
                <span>DeFi</span>
              </div>
              <div className="legend-item">
                <span className="legend-line sent" />
                <span>Sent</span>
              </div>
              <div className="legend-item">
                <span className="legend-line received" />
                <span>Received</span>
              </div>
            </div>
          </div>
        </div>

        {selectedNode && (
          <div className="graph-details-panel">
            <div className="panel-header">
              <div className="panel-title">
                <span className={`node-indicator ${selectedNode.type}`} />
                <span>{selectedNode.type === 'target' ? 'Target Wallet' : selectedNode.type}</span>
              </div>
              <button className="panel-close" onClick={() => setSelectedNode(null)}>
                <Icon name="close" size={16} />
              </button>
            </div>

            <div className="panel-content">
              <div className="detail-row">
                <span className="detail-label">Address</span>
                <div className="detail-value address-value">
                  <code>{selectedNode.address.slice(0, 10)}...{selectedNode.address.slice(-8)}</code>
                  <button onClick={() => handleCopyAddress(selectedNode.address)}>
                    <Icon name="copy" size={14} />
                  </button>
                </div>
              </div>

              {selectedNode.entityLabel && (
                <div className="detail-row">
                  <span className="detail-label">Entity</span>
                  <span className="detail-value">{selectedNode.entityLabel}</span>
                </div>
              )}

              <div className="detail-row">
                <span className="detail-label">Balance</span>
                <span className="detail-value">{selectedNode.balance?.toFixed(4)} ETH</span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Transactions</span>
                <span className="detail-value">{selectedNode.transactionCount?.toLocaleString()}</span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Total Volume</span>
                <span className="detail-value">{selectedNode.totalVolume?.toFixed(2)} ETH</span>
              </div>

              {selectedNode.riskScore !== undefined && (
                <div className="detail-row">
                  <span className="detail-label">Risk Score</span>
                  <span className={`risk-badge risk-${selectedNode.riskScore! > 60 ? 'high' : selectedNode.riskScore! > 30 ? 'medium' : 'low'}`}>
                    {selectedNode.riskScore}%
                  </span>
                </div>
              )}

              <div className="panel-actions">
                <a
                  href={`${chainConfig.explorer}/address/${selectedNode.address}`}
                  target="_blank"
                  rel="noreferrer"
                  className="action-btn primary"
                >
                  <Icon name="arrowRight" size={16} />
                  View on Explorer
                </a>
                <button 
                  className={`action-btn ${watchlist.has(selectedNode.id) ? 'active' : ''}`}
                  onClick={() => handleToggleWatchlist(selectedNode.id)}
                >
                  <Icon name={watchlist.has(selectedNode.id) ? 'star' : 'starOutline'} size={16} />
                  {watchlist.has(selectedNode.id) ? 'Watching' : 'Watch'}
                </button>
                <button 
                  className="action-btn"
                  onClick={() => handleTogglePin(selectedNode.id)}
                >
                  <Icon name={pinnedNodes.has(selectedNode.id) ? 'eye' : 'eyeOff'} size={16} />
                  {pinnedNodes.has(selectedNode.id) ? 'Unpin' : 'Pin'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showMinimap && isGenerated && (
          <div className="graph-minimap">
            <div className="minimap-header">Overview</div>
            <svg className="minimap-svg" width="120" height="80" />
            <div className="minimap-stats">
              <span>Nodes: {nodeCount}</span>
              <span>Edges: {edgeCount}</span>
            </div>
          </div>
        )}

        <div className="graph-stats-bar">
          <div className="stat-bar-item">
            <span className="stat-bar-label">Nodes</span>
            <span className="stat-bar-value">{nodeCount}</span>
          </div>
          <div className="stat-bar-item">
            <span className="stat-bar-label">Edges</span>
            <span className="stat-bar-value">{edgeCount}</span>
          </div>
          <div className="stat-bar-item">
            <span className="stat-bar-label">Volume</span>
            <span className="stat-bar-value">{totalVolume.toFixed(2)} ETH</span>
          </div>
          <div className="stat-bar-item">
            <span className="stat-bar-label">Zoom</span>
            <span className="stat-bar-value">{(zoom * 100).toFixed(0)}%</span>
          </div>
          <button className="btn-regenerate" onClick={handleGenerate}>
            <Icon name="refresh" size={14} />
            Regenerate
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdvancedGraph;
