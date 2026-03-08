import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FundingNode, CHAINS, ChainId } from '@fundtracer/core';
import * as d3 from 'd3';
import { useIsMobile } from '../hooks/useIsMobile';
import {
    Maximize2,
    Minimize2,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    ArrowLeft,
    ExternalLink,
    Copy,
    X,
} from 'lucide-react';

interface FundingTreeProps {
    node: FundingNode;
    direction: 'source' | 'destination';
    chain?: ChainId;
    title?: string;
}

// --- Entity type color helpers ---

const ENTITY_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
    cex:        { bg: '#1a1508', border: '#f59e0b', text: '#fbbf24', label: 'CEX' },
    bridge:     { bg: '#08151a', border: '#00d4ff', text: '#66e0ff', label: 'Bridge' },
    mixer:      { bg: '#1a0808', border: '#ff3366', text: '#ff6688', label: 'Mixer' },
    dex:        { bg: '#140a1a', border: '#9966ff', text: '#b388ff', label: 'DEX' },
    contract:   { bg: '#0a0a14', border: '#6366f1', text: '#818cf8', label: 'Contract' },
    wallet:     { bg: '#0a0d0a', border: '#00ff88', text: '#66ffaa', label: 'Wallet' },
};

// Light mode variants
const ENTITY_COLORS_LIGHT: Record<string, { bg: string; border: string; text: string; label: string }> = {
    cex:        { bg: '#fef7ed', border: '#f59e0b', text: '#92400e', label: 'CEX' },
    bridge:     { bg: '#e6f9ff', border: '#00b3d9', text: '#0077b3', label: 'Bridge' },
    mixer:      { bg: '#ffebef', border: '#dc2626', text: '#991b1b', label: 'Mixer' },
    dex:        { bg: '#f3edff', border: '#7c3aed', text: '#5b21b6', label: 'DEX' },
    contract:   { bg: '#eef2ff', border: '#4f46e5', text: '#3730a3', label: 'Contract' },
    wallet:     { bg: '#e6fff2', border: '#00cc6e', text: '#008f4d', label: 'Wallet' },
};

function getEntityStyle(entityType?: string) {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const colors = isLight ? ENTITY_COLORS_LIGHT : ENTITY_COLORS;
    return colors[entityType || 'wallet'] || colors.wallet;
}

function formatVal(v: number | string): string {
    const num = typeof v === 'string' ? parseFloat(v) || 0 : v;
    if (num === 0) return '0';
    if (num < 0.0001) return '<0.0001';
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(4);
}

function formatAddr(a: string): string {
    return `${a.slice(0, 6)}...${a.slice(-4)}`;
}

// --- Node Detail Panel ---

const NodeDetailPanel = ({
    node: detailNode,
    chainConfig,
    direction,
    onClose,
}: {
    node: FundingNode;
    chainConfig: any;
    direction: 'source' | 'destination';
    onClose: () => void;
}) => {
    const entityStyle = getEntityStyle(detailNode.entityType);
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(detailNode.address);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div
            style={{
                position: 'absolute',
                top: 12,
                right: 12,
                width: 280,
                background: 'var(--color-surface)',
                border: '1px solid var(--color-surface-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 16,
                zIndex: 20,
                boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-sm)',
                    background: entityStyle.bg,
                    border: `1px solid ${entityStyle.border}`,
                    color: entityStyle.text,
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.03em',
                }}>
                    {detailNode.isInfrastructure ? entityStyle.label : (detailNode.entityType ? entityStyle.label : 'Wallet')}
                </span>
                <button
                    onClick={onClose}
                    style={{
                        width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer',
                    }}
                >
                    <X size={14} />
                </button>
            </div>

            {/* Label */}
            {detailNode.label && (
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)', marginBottom: 4 }}>
                    {detailNode.label}
                </div>
            )}

            {/* Address */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-secondary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                }}>
                    {detailNode.address}
                </span>
                <button
                    onClick={handleCopy}
                    style={{
                        background: 'none', border: 'none', color: copied ? 'var(--color-success-text)' : 'var(--color-text-muted)',
                        cursor: 'pointer', padding: 2, flexShrink: 0,
                    }}
                    title="Copy address"
                >
                    <Copy size={12} />
                </button>
            </div>

            {/* Stats */}
            <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
                padding: 10, background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-surface-border)', marginBottom: 12,
            }}>
                <div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 2 }}>Value</div>
                    <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
                        {formatVal(detailNode.totalValueInEth || 0)} {chainConfig.symbol}
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 2 }}>Transactions</div>
                    <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
                        {detailNode.txCount || 0}
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 2 }}>Depth</div>
                    <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
                        {detailNode.depth ?? 0}
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 2 }}>Children</div>
                    <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
                        {detailNode.children?.length || 0}
                    </div>
                </div>
            </div>

            {/* Suspicious Score */}
            {(detailNode.suspiciousScore ?? 0) > 0 && (
                <div style={{
                    padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-danger-bg)', border: '1px solid rgba(239, 68, 68, 0.3)',
                    fontSize: 11, color: 'var(--color-danger-text)', marginBottom: 12,
                }}>
                    Suspicious Score: {detailNode.suspiciousScore}
                    {detailNode.suspiciousReasons?.length > 0 && (
                        <div style={{ marginTop: 4, fontSize: 10, opacity: 0.8 }}>
                            {detailNode.suspiciousReasons.join(', ')}
                        </div>
                    )}
                </div>
            )}

            {/* Explorer Link */}
            <a
                href={`${chainConfig.explorer}/address/${detailNode.address}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '8px 12px', borderRadius: 'var(--radius-md)',
                    background: 'var(--color-bg-elevated)', border: '1px solid var(--color-surface-border)',
                    color: 'var(--color-text-secondary)', fontSize: 12, fontWeight: 500,
                    textDecoration: 'none', transition: 'all 0.15s ease',
                }}
            >
                <ExternalLink size={12} />
                View on {chainConfig.name} Explorer
            </a>
        </div>
    );
};

// --- Mobile Components ---

const MobileTreeNode = ({
    treeNode,
    direction,
    chainConfig,
    onSelectNode,
    depth = 0
}: {
    treeNode: FundingNode;
    direction: 'source' | 'destination';
    chainConfig: any;
    onSelectNode: (node: FundingNode) => void;
    depth?: number;
}) => {
    const [expanded, setExpanded] = useState(depth < 1);
    const hasChildren = treeNode.children && treeNode.children.length > 0;
    const entityStyle = getEntityStyle(treeNode.entityType);

    return (
        <div style={{ marginLeft: depth * 12 }}>
            <div
                onClick={() => hasChildren ? setExpanded(!expanded) : onSelectNode(treeNode)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px 12px',
                    marginBottom: 4,
                    background: depth === 0
                        ? `rgba(${direction === 'source' ? '45, 90, 61' : '90, 45, 45'}, 0.2)`
                        : 'var(--color-bg-elevated)',
                    borderRadius: 8,
                    borderLeft: `3px solid ${entityStyle.border}`,
                    cursor: 'pointer',
                    gap: 8,
                }}
            >
                {hasChildren && (
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>
                        {expanded ? '\u25BC' : '\u25B6'}
                    </span>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                            fontFamily: 'var(--font-mono)', fontSize: 12,
                            color: 'var(--color-text-primary)', fontWeight: 500,
                            overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                            {treeNode.label || formatAddr(treeNode.address)}
                        </span>
                        {treeNode.entityType && treeNode.entityType !== 'wallet' && (
                            <span style={{
                                padding: '1px 5px', borderRadius: 3,
                                background: entityStyle.bg, border: `1px solid ${entityStyle.border}`,
                                color: entityStyle.text, fontSize: 9, fontWeight: 600,
                            }}>
                                {entityStyle.label}
                            </span>
                        )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                        {formatVal(treeNode.totalValueInEth || 0)} {chainConfig.symbol}
                        {hasChildren && ` \u2022 ${treeNode.children.length} connection${treeNode.children.length > 1 ? 's' : ''}`}
                    </div>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); onSelectNode(treeNode); }}
                    style={{
                        fontSize: 10, color: 'var(--color-text-muted)',
                        padding: '4px 8px', background: 'var(--color-bg-tertiary)',
                        borderRadius: 4, border: '1px solid var(--color-surface-border)', cursor: 'pointer',
                    }}
                >
                    Details
                </button>
            </div>
            {expanded && hasChildren && (
                <div>
                    {treeNode.children!.slice(0, 10).map((child, idx) => (
                        <MobileTreeNode
                            key={`${child.address}-${idx}`}
                            treeNode={child}
                            direction={direction}
                            chainConfig={chainConfig}
                            onSelectNode={onSelectNode}
                            depth={depth + 1}
                        />
                    ))}
                    {treeNode.children!.length > 10 && (
                        <div style={{
                            marginLeft: (depth + 1) * 12, padding: '8px 12px',
                            fontSize: 11, color: 'var(--color-text-muted)', fontStyle: 'italic',
                        }}>
                            +{treeNode.children!.length - 10} more...
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const MobileTreeView = ({
    node: mobileNode,
    direction,
    title,
    chainConfig,
    onShowGraph,
    onSelectNode,
}: {
    node: FundingNode;
    direction: 'source' | 'destination';
    title?: string;
    chainConfig: any;
    onShowGraph: () => void;
    onSelectNode: (node: FundingNode) => void;
}) => {
    return (
        <div style={{
            background: 'var(--color-bg-secondary)', borderRadius: 12, padding: 12,
            maxHeight: 500, overflowY: 'auto', border: '1px solid var(--color-surface-border)',
        }}>
            <div style={{
                fontSize: 14, fontWeight: 600,
                color: direction === 'source' ? 'var(--color-success-text)' : 'var(--color-danger-text)',
                marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <span>{title || (direction === 'source' ? 'Funding Sources' : 'Fund Destinations')}</span>
                <button
                    onClick={onShowGraph}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 12px', background: 'var(--color-bg-elevated)',
                        border: '1px solid var(--color-surface-border)', borderRadius: 6,
                        fontSize: 11, color: 'var(--color-text-primary)', cursor: 'pointer',
                    }}
                >
                    <Maximize2 size={12} />
                    View Graph
                </button>
            </div>
            <MobileTreeNode
                treeNode={mobileNode}
                direction={direction}
                chainConfig={chainConfig}
                onSelectNode={onSelectNode}
            />
        </div>
    );
};

// --- Main Component ---

function FundingTree({ node, direction, chain = 'ethereum', title }: FundingTreeProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
    const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);

    // State
    const [selectedNode, setSelectedNode] = useState<FundingNode | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [highlightedAddress, setHighlightedAddress] = useState<string | null>(null);
    const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
    const [zoomLevel, setZoomLevel] = useState(1);
    const [showLabels] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Mobile state
    const [showMobileGraph, setShowMobileGraph] = useState(false);

    const chainConfig = CHAINS[chain];
    const isMobile = useIsMobile();

    // Safety checks
    if (!chainConfig) {
        console.error('[FundingTree] Invalid chain config for chain:', chain);
        return null;
    }

    if (!node || !node.address) {
        return (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                No funding data available
            </div>
        );
    }

    // Toggle node collapse
    const toggleCollapse = useCallback((address: string) => {
        setCollapsedNodes(prev => {
            const next = new Set(prev);
            if (next.has(address)) next.delete(address);
            else next.add(address);
            return next;
        });
    }, []);

    // Zoom controls
    const handleZoom = useCallback((factor: number) => {
        if (svgRef.current && zoomRef.current) {
            const svg = d3.select(svgRef.current);
            svg.transition().duration(300).call(zoomRef.current.scaleBy, factor);
        }
    }, []);

    const handleResetZoom = useCallback(() => {
        if (svgRef.current && zoomRef.current) {
            const svg = d3.select(svgRef.current);
            svg.transition().duration(500).call(zoomRef.current.transform, d3.zoomIdentity);
            setZoomLevel(1);
        }
    }, []);

    // D3 Effect - Card-style nodes
    useEffect(() => {
        if (isMobile && !showMobileGraph) return;
        if (!svgRef.current || !containerRef.current || !node) return;

        try {
            setError(null);

            const container = containerRef.current;
            const isGraphFullscreen = isFullscreen || (isMobile && showMobileGraph);

            const width = container.clientWidth || (isGraphFullscreen ? window.innerWidth : 800);
            const height = isGraphFullscreen ? window.innerHeight : 450;

            const margin = isGraphFullscreen
                ? { top: 60, right: 60, bottom: 40, left: 60 }
                : { top: 40, right: 200, bottom: 40, left: 200 };

            // Clear previous
            d3.select(svgRef.current).selectAll('*').remove();

            const svg = d3.select(svgRef.current)
                .attr('width', width)
                .attr('height', height)
                .style('background', 'radial-gradient(ellipse at center, var(--color-bg-elevated) 0%, var(--color-bg-primary) 100%)');

            // Defs for arrow markers and gradients
            const defs = svg.append('defs');

            // Arrow marker
            defs.append('marker')
                .attr('id', `arrow-${direction}`)
                .attr('viewBox', '0 0 10 6')
                .attr('refX', 10)
                .attr('refY', 3)
                .attr('markerWidth', 8)
                .attr('markerHeight', 5)
                .attr('orient', 'auto')
                .append('path')
                .attr('d', 'M0,0 L10,3 L0,6 Z')
                .attr('fill', direction === 'source' ? '#00ff88' : '#ff3366');

            const g = svg.append('g')
                .attr('class', 'tree-container')
                .attr('transform', `translate(${margin.left}, ${margin.top})`);

            gRef.current = g;

            // Zoom behavior
            const zoom = d3.zoom<SVGSVGElement, unknown>()
                .scaleExtent([0.1, 4])
                .on('zoom', (event) => {
                    if (gRef.current) {
                        gRef.current.attr('transform', event.transform);
                        setZoomLevel(event.transform.k);
                    }
                });

            zoomRef.current = zoom;
            svg.call(zoom);

            // Filter collapsed nodes
            const filterCollapsed = (n: FundingNode): FundingNode => {
                if (!n) return { address: 'invalid', children: [], totalValue: 0, chain: 'ethereum' } as any;
                const children = n.children || [];
                if (collapsedNodes.has(n.address)) return { ...n, children: [] };
                return { ...n, children: children.map(filterCollapsed) };
            };

            const filteredNode = filterCollapsed(node);
            if (!filteredNode) throw new Error('Failed to process funding data structure');

            const root = d3.hierarchy(filteredNode);

            // Card dimensions
            const cardW = 140;
            const cardH = 48;
            const nodeSpacing = isMobile ? 65 : 58;
            const layoutHeight = Math.max(height - margin.top - margin.bottom, root.descendants().length * nodeSpacing);

            const treeLayout = d3.tree<FundingNode>()
                .size([layoutHeight, width - margin.left - margin.right])
                .separation((a, b) => (a.parent === b.parent ? 1.2 : 2.5));

            const treeData = treeLayout(root);

            // Compute max value for proportional link widths
            const allValues = treeData.descendants().map((d: any) => d.data.totalValueInEth || 0).filter((v: number) => v > 0);
            const maxValue = allValues.length > 0 ? Math.max(...allValues) : 1;

            // Links - curved with value-proportional width
            g.selectAll('.tree-link')
                .data(treeData.links())
                .join('path')
                .attr('class', 'tree-link')
                .attr('d', d3.linkHorizontal<any, any>()
                    .x(d => d.y)
                    .y(d => d.x))
                .style('fill', 'none')
                .style('stroke', (d: any) => {
                    if (highlightedAddress && (d.source.data.address === highlightedAddress || d.target.data.address === highlightedAddress)) {
                        return direction === 'source' ? '#00ff88' : '#ff6688';
                    }
                    const targetVal = d.target.data.totalValueInEth || 0;
                    const ratio = maxValue > 0 ? targetVal / maxValue : 0;
                    if (ratio > 0.5) return direction === 'source' ? '#00ff88' : '#ff3366';
                    return 'var(--color-surface-border)';
                })
                .style('stroke-width', (d: any) => {
                    const targetVal = d.target.data.totalValueInEth || 0;
                    const ratio = maxValue > 0 ? targetVal / maxValue : 0;
                    return Math.max(1, Math.min(5, 1 + ratio * 4));
                })
                .style('opacity', 0.5)
                .attr('marker-end', `url(#arrow-${direction})`);

            // Nodes
            const nodes = g.selectAll('.tree-node')
                .data(treeData.descendants())
                .join('g')
                .attr('class', 'tree-node')
                .attr('transform', d => `translate(${d.y}, ${d.x})`)
                .style('cursor', 'pointer');

            // Card background (rounded rect)
            nodes.append('rect')
                .attr('x', -cardW / 2)
                .attr('y', -cardH / 2)
                .attr('width', cardW)
                .attr('height', cardH)
                .attr('rx', 6)
                .attr('ry', 6)
                .style('fill', (d: any) => {
                    const style = getEntityStyle(d.data.entityType);
                    return d.depth === 0 ? (direction === 'source' ? '#051a0d' : '#1a0508') : style.bg;
                })
                .style('stroke', (d: any) => {
                    if (selectedNode?.address === d.data.address) return '#ffffff';
                    if (d.data.address === highlightedAddress) return '#ffffff';
                    const style = getEntityStyle(d.data.entityType);
                    return d.depth === 0
                        ? (direction === 'source' ? '#00ff88' : '#ff3366')
                        : style.border;
                })
                .style('stroke-width', (d: any) => {
                    if (selectedNode?.address === d.data.address) return 2;
                    return d.depth === 0 ? 1.5 : 1;
                })
                .style('filter', (d: any) => d.depth === 0 ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))' : 'none');

            // Entity type indicator dot (top-left of card)
            nodes.filter((d: any) => d.data.entityType && d.data.entityType !== 'wallet')
                .append('circle')
                .attr('cx', -cardW / 2 + 10)
                .attr('cy', -cardH / 2 + 10)
                .attr('r', 3)
                .style('fill', (d: any) => getEntityStyle(d.data.entityType).border);

            // Collapse indicator (right edge)
            nodes.filter((d: any) => d.data.children && d.data.children.length > 0)
                .append('text')
                .attr('x', cardW / 2 - 8)
                .attr('y', 0)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'central')
                .text((d: any) => collapsedNodes.has(d.data.address) ? '\u25B6' : '\u25BC')
                .style('font-size', '8px')
                .style('fill', 'var(--color-text-muted)')
                .style('pointer-events', 'none');

            // Address/Label text (primary line)
            nodes.append('text')
                .attr('y', -6)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'auto')
                .text((d: any) => d.data.label || formatAddr(d.data.address))
                .style('font-family', 'var(--font-mono)')
                .style('font-size', '10px')
                .style('font-weight', (d: any) => d.depth === 0 ? '600' : '500')
                .style('fill', (d: any) => {
                    if (d.depth === 0) return direction === 'source' ? '#00ff88' : '#ff6688';
                    const style = getEntityStyle(d.data.entityType);
                    return style.text;
                })
                .style('pointer-events', 'none');

            // Value text (secondary line)
            nodes.append('text')
                .attr('y', 10)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'auto')
                .text((d: any) => {
                    const val = formatVal(d.data.totalValueInEth || 0);
                    const txCount = d.data.txCount || 0;
                    return `${val} ${chainConfig.symbol}${txCount > 0 ? ` \u00B7 ${txCount} tx` : ''}`;
                })
                .style('font-family', 'var(--font-mono)')
                .style('font-size', '9px')
                .style('fill', 'var(--color-text-muted)')
                .style('pointer-events', 'none');

            // Interaction
            nodes.on('click', (e, d: any) => {
                e.stopPropagation();
                setSelectedNode(d.data);
            });

            nodes.on('dblclick', (e, d: any) => {
                e.stopPropagation();
                toggleCollapse(d.data.address);
            });

            // Click on background to deselect
            svg.on('click', () => {
                setSelectedNode(null);
            });

            // Initial alignment
            const initialTranslateX = isMobile ? margin.left + 20 : margin.left;
            const initialScale = isMobile ? 0.55 : 0.85;

            if (!zoomLevel || zoomLevel === 1) {
                svg.call(zoom.transform, d3.zoomIdentity.translate(initialTranslateX, margin.top).scale(initialScale));
            }

        } catch (err: any) {
            console.error('FundingTree D3 Error:', err);
            setError(err.message || 'Error visualizing funding tree');
        }
    }, [node, isFullscreen, showMobileGraph, isMobile, collapsedNodes, direction, highlightedAddress, showLabels, selectedNode]);

    // Render Logic

    // 1. Mobile list view
    if (isMobile && !showMobileGraph) {
        return (
            <div style={{ position: 'relative' }}>
                <MobileTreeView
                    node={node}
                    direction={direction}
                    title={title}
                    chainConfig={chainConfig}
                    onShowGraph={() => setShowMobileGraph(true)}
                    onSelectNode={(n) => setSelectedNode(n)}
                />
                {selectedNode && (
                    <NodeDetailPanel
                        node={selectedNode}
                        chainConfig={chainConfig}
                        direction={direction}
                        onClose={() => setSelectedNode(null)}
                    />
                )}
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div style={{
                padding: 40, textAlign: 'center', color: 'var(--color-danger-text)',
                background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-surface-border)',
            }}>
                <h3>Visualization Error</h3>
                <p style={{ margin: '10px 0' }}>{error}</p>
                <button onClick={() => setError(null)} className="btn btn-primary" style={{ marginTop: 10 }}>
                    Retry Visualization
                </button>
            </div>
        );
    }

    // 2. Graph View (Desktop OR Mobile Fullscreen)
    const wrapperStyle: React.CSSProperties = (isFullscreen || (isMobile && showMobileGraph)) ? {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 2000, background: 'var(--color-bg)', width: '100vw', height: '100vh',
    } : {
        position: 'relative', width: '100%', height: '450px',
        background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-surface-border)', overflow: 'hidden',
    };

    return (
        <div ref={containerRef} style={wrapperStyle}>
            {/* Toolbar Overlay */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, padding: 12,
                display: 'flex', justifyContent: 'space-between',
                pointerEvents: 'none', zIndex: 10,
            }}>
                <div style={{ pointerEvents: 'auto', display: 'flex', gap: 8 }}>
                    {isMobile && showMobileGraph && (
                        <button
                            onClick={() => setShowMobileGraph(false)}
                            className="btn btn-secondary btn-icon"
                            style={{ width: 'auto', padding: '0 12px' }}
                        >
                            <ArrowLeft size={16} /> Back
                        </button>
                    )}
                    <span style={{
                        background: 'rgba(0,0,0,0.6)', padding: '4px 10px', borderRadius: 4,
                        fontSize: 12, fontWeight: 500,
                        color: direction === 'source' ? '#00ff88' : '#ff6688',
                    }}>
                        {direction === 'source' ? 'Funding Sources' : 'Destinations'}
                    </span>
                    <span style={{
                        background: 'rgba(0,0,0,0.4)', padding: '4px 8px', borderRadius: 4,
                        fontSize: 10, color: 'var(--color-text-muted)',
                    }}>
                        Click node for details &middot; Double-click to collapse
                    </span>
                </div>

                <div style={{ pointerEvents: 'auto', display: 'flex', gap: 6 }}>
                    <button onClick={() => handleZoom(1.2)} className="btn btn-secondary btn-icon">
                        <ZoomIn size={16} />
                    </button>
                    <button onClick={() => handleZoom(0.8)} className="btn btn-secondary btn-icon">
                        <ZoomOut size={16} />
                    </button>
                    <button onClick={() => handleResetZoom()} className="btn btn-secondary btn-icon">
                        <RotateCcw size={16} />
                    </button>
                    {!isMobile && (
                        <button onClick={() => setIsFullscreen(!isFullscreen)} className="btn btn-secondary btn-icon">
                            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                        </button>
                    )}
                </div>
            </div>

            <svg ref={svgRef} style={{ width: '100%', height: '100%', display: 'block' }} />

            {/* Node Detail Panel */}
            {selectedNode && (
                <NodeDetailPanel
                    node={selectedNode}
                    chainConfig={chainConfig}
                    direction={direction}
                    onClose={() => setSelectedNode(null)}
                />
            )}

            {/* Entity Type Legend */}
            <div style={{
                position: 'absolute', bottom: 12, left: 12,
                display: 'flex', gap: 8, flexWrap: 'wrap',
                pointerEvents: 'none',
            }}>
                {Object.entries(ENTITY_COLORS).map(([key, val]) => (
                    <span key={key} style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '2px 6px', borderRadius: 3,
                        background: 'rgba(0,0,0,0.5)', fontSize: 9,
                        color: val.text,
                    }}>
                        <span style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: val.border, display: 'inline-block',
                        }} />
                        {val.label}
                    </span>
                ))}
            </div>
        </div>
    );
}

export default FundingTree;
