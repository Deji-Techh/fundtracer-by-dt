import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FundingNode, CHAINS, ChainId } from '@fundtracer/core';
import * as d3 from 'd3';
import { useIsMobile } from '../hooks/useIsMobile';
import {
    Search,
    Maximize2,
    Minimize2,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    Download,
    Copy,
    ChevronDown,
    ChevronRight,
    Target,
    Layers,
    Eye,
    EyeOff,
    Move,
    MousePointer2,
    ArrowLeft,
    Smartphone
} from 'lucide-react';

interface FundingTreeProps {
    node: FundingNode;
    direction: 'source' | 'destination';
    chain?: ChainId;
    title?: string;
}

interface TreeNode extends d3.HierarchyPointNode<FundingNode> {
    _collapsed?: boolean;
    _highlighted?: boolean;
    _filtered?: boolean;
}

// --- Mobile Components ---

const MobileTreeNode = ({
    treeNode,
    direction,
    chainConfig,
    depth = 0
}: {
    treeNode: FundingNode;
    direction: 'source' | 'destination';
    chainConfig: any;
    depth?: number;
}) => {
    const [expanded, setExpanded] = useState(depth < 1); // Auto-expand first level
    const hasChildren = treeNode.children && treeNode.children.length > 0;
    const formatAddr = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;
    const formatVal = (v: number | string) => {
        const num = typeof v === 'string' ? parseFloat(v) || 0 : v;
        return num < 0.0001 ? '<0.0001' : num.toFixed(4);
    };

    return (
        <div style={{ marginLeft: depth * 12 }}>
            <div
                onClick={() => hasChildren && setExpanded(!expanded)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px 12px',
                    marginBottom: 4,
                    background: depth === 0
                        ? `rgba(${direction === 'source' ? '45, 90, 61' : '90, 45, 45'}, 0.2)`
                        : 'var(--color-bg-elevated)',
                    borderRadius: 8,
                    borderLeft: `3px solid ${direction === 'source' ? 'var(--color-success-text)' : 'var(--color-danger-text)'}`,
                    cursor: hasChildren ? 'pointer' : 'default',
                    gap: 8,
                }}
            >
                {hasChildren && (
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>
                        {expanded ? '▼' : '▶'}
                    </span>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12,
                        color: 'var(--color-text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        fontWeight: 500
                    }}>
                        {treeNode.label || formatAddr(treeNode.address)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                        {formatVal(treeNode.totalValue)} {chainConfig.symbol}
                        {hasChildren && ` • ${treeNode.children.length} connection${treeNode.children.length > 1 ? 's' : ''}`}
                    </div>
                </div>
                <a
                    href={`${chainConfig.explorer}/address/${treeNode.address}`} // Corrected explorer prop
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        fontSize: 10,
                        color: 'var(--color-text-muted)',
                        padding: '4px 8px',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: 4,
                    }}
                >
                    View ↗
                </a>
            </div>
            {expanded && hasChildren && (
                <div>
                    {treeNode.children!.slice(0, 10).map((child, idx) => (
                        <MobileTreeNode
                            key={`${child.address}-${idx}`}
                            treeNode={child}
                            direction={direction}
                            chainConfig={chainConfig}
                            depth={depth + 1}
                        />
                    ))}
                    {treeNode.children!.length > 10 && (
                        <div style={{
                            marginLeft: (depth + 1) * 12,
                            padding: '8px 12px',
                            fontSize: 11,
                            color: 'var(--color-text-muted)',
                            fontStyle: 'italic',
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
    node,
    direction,
    title,
    chainConfig,
    onShowGraph
}: {
    node: FundingNode;
    direction: 'source' | 'destination';
    title?: string;
    chainConfig: any;
    onShowGraph: () => void;
}) => {
    return (
        <div style={{
            background: 'var(--color-bg-secondary)',
            borderRadius: 12,
            padding: 12,
            maxHeight: 500,
            overflowY: 'auto',
            border: '1px solid var(--color-surface-border)'
        }}>
            <div style={{
                fontSize: 14,
                fontWeight: 600,
                color: direction === 'source' ? 'var(--color-success-text)' : 'var(--color-danger-text)',
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {direction === 'source' ? '📥' : '📤'} {title || (direction === 'source' ? 'Funding Sources' : 'Fund Destinations')}
                </div>

                {/* Mobile Fullscreen Graph Button */}
                <button
                    onClick={onShowGraph}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 12px',
                        background: 'var(--color-bg-elevated)',
                        border: '1px solid var(--color-surface-border)',
                        borderRadius: 6,
                        fontSize: 11,
                        color: 'var(--color-text-primary)'
                    }}
                >
                    <Maximize2 size={12} />
                    View Graph
                </button>
            </div>

            <MobileTreeNode
                treeNode={node}
                direction={direction}
                chainConfig={chainConfig}
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
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<FundingNode[]>([]);
    const [highlightedAddress, setHighlightedAddress] = useState<string | null>(null);
    const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
    const [zoomLevel, setZoomLevel] = useState(1);
    const [showLabels, setShowLabels] = useState(true);
    const [showValues, setShowValues] = useState(true);
    const [filterMinValue, setFilterMinValue] = useState(0);
    const [hoveredNode, setHoveredNode] = useState<FundingNode | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Mobile state
    const [showMobileGraph, setShowMobileGraph] = useState(false);

    const chainConfig = CHAINS[chain];
    const isMobile = useIsMobile();

    // Safety checks - be more specific
    if (!chainConfig) {
        console.error('[FundingTree] Invalid chain config for chain:', chain);
        return null;
    }

    if (!node || !node.address) {
        console.warn('[FundingTree] No node or invalid node structure:', node);
        // Return empty state instead of null
        return (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                No funding data available
            </div>
        );
    }

    // Flatten tree for searching (memoized)
    const flattenTree = useCallback((n: FundingNode, depth = 0): FundingNode[] => {
        const result: FundingNode[] = [{ ...n, depth }];
        if (n.children) {
            for (const child of n.children) {
                result.push(...flattenTree(child, depth + 1));
            }
        }
        return result;
    }, []);

    const allNodesList = useRef<FundingNode[]>([]);
    useEffect(() => {
        allNodesList.current = flattenTree(node);
    }, [node, flattenTree]);

    // Search handler
    const handleSearch = useCallback((query: string) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setSearchResults([]);
            setHighlightedAddress(null);
            return;
        }

        const matches = allNodesList.current.filter(n =>
            n.address.toLowerCase().includes(query.toLowerCase()) ||
            (n.label && n.label.toLowerCase().includes(query.toLowerCase()))
        );
        setSearchResults(matches);
    }, []);

    // Find path to address
    const findPathToAddress = useCallback((target: string, current: FundingNode, path: FundingNode[] = []): FundingNode[] | null => {
        const currentPath = [...path, current];
        if (current.address.toLowerCase() === target.toLowerCase()) {
            return currentPath;
        }
        if (current.children) {
            for (const child of current.children) {
                const found = findPathToAddress(target, child, currentPath);
                if (found) return found;
            }
        }
        return null;
    }, []);

    // Toggle node collapse
    const toggleCollapse = useCallback((address: string) => {
        setCollapsedNodes(prev => {
            const next = new Set(prev);
            if (next.has(address)) {
                next.delete(address);
            } else {
                next.add(address);
            }
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

    // D3 Effect
    useEffect(() => {
        // Only run D3 logic if NOT mobile, OR if mobile AND graph is shown
        if (isMobile && !showMobileGraph) return;

        if (!svgRef.current || !containerRef.current || !node) return;

        try {
            setError(null); // Clear previous errors

            const container = containerRef.current;
            // Fullscreen check logic: if global fullscreen OR mobile graph mode
            const isGraphFullscreen = isFullscreen || (isMobile && showMobileGraph);

            const width = container.clientWidth || (isGraphFullscreen ? window.innerWidth : 800);
            const height = isGraphFullscreen ? window.innerHeight : 450;

            const margin = isGraphFullscreen
                ? { top: 60, right: 40, bottom: 40, left: 40 }
                : { top: 40, right: 180, bottom: 40, left: 180 };

            // Clear previous
            d3.select(svgRef.current).selectAll('*').remove();

            const svg = d3.select(svgRef.current)
                .attr('width', width)
                .attr('height', height)
                .style('background', 'radial-gradient(ellipse at center, var(--color-bg-elevated) 0%, var(--color-bg) 100%)');

            // Create container for zoom
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

            // Filter collapsed nodes (validation added)
            const filterCollapsed = (n: FundingNode): FundingNode => {
                if (!n) return { address: 'invalid', children: [], totalValue: 0, chain: 'ethereum' } as any;
                const children = n.children || [];
                if (collapsedNodes.has(n.address)) {
                    return { ...n, children: [] };
                }
                return { ...n, children: children.map(filterCollapsed) };
            };

            const filteredNode = filterCollapsed(node);

            // Validate filtered node
            if (!filteredNode) {
                throw new Error('Failed to process funding data structure');
            }

            // Hierarchy
            const root = d3.hierarchy(filteredNode);

            // Layout
            const nodeHeight = isMobile ? 60 : 40;
            const layoutHeight = Math.max(height - margin.top - margin.bottom, root.descendants().length * nodeHeight);

            const treeLayout = d3.tree<FundingNode>()
                .size([layoutHeight, width - margin.left - margin.right])
                .separation((a, b) => (a.parent === b.parent ? 1.2 : 2.5));

            const treeData = treeLayout(root);

            // Links
            g.selectAll('.tree-link')
                .data(treeData.links())
                .join('path')
                .attr('class', 'tree-link')
                .attr('d', d3.linkHorizontal<any, any>()
                    .x(d => d.y)
                    .y(d => d.x))
                .style('fill', 'none')
                .style('stroke', (d: any) => {
                    // Simplified stroke logic for brevity/performance
                    if (highlightedAddress && (d.source.data.address === highlightedAddress || d.target.data.address === highlightedAddress)) {
                        return direction === 'source' ? 'var(--color-success-text)' : 'var(--color-danger-text)';
                    }
                    return 'var(--color-border)';
                })
                .style('stroke-width', 1.5)
                .style('opacity', 0.6);

            // Nodes
            const nodes = g.selectAll('.tree-node')
                .data(treeData.descendants())
                .join('g')
                .attr('class', 'tree-node')
                .attr('transform', d => `translate(${d.y}, ${d.x})`)
                .style('cursor', 'pointer');

            // Node Circles
            nodes.append('circle')
                .attr('r', d => d.depth === 0 ? 12 : 8)
                .style('fill', 'var(--color-bg-elevated)')
                .style('stroke', (d: any) => {
                    if (d.data.address === highlightedAddress) return 'var(--color-text-primary)';
                    if (d.data.suspiciousScore > 50) return 'var(--color-danger-text)';
                    return 'var(--color-text-muted)';
                })
                .style('stroke-width', 2);

            // Node Labels (Desktop only or zoomed in)
            if (showLabels || isMobile) {
                nodes.append('text')
                    .attr('dy', -15)
                    .attr('x', d => d.children ? -10 : 10)
                    .attr('text-anchor', d => d.children ? 'end' : 'start')
                    .text((d: any) => d.data.label || `${d.data.address.slice(0, 6)}...`)
                    .style('font-family', 'var(--font-mono)')
                    .style('font-size', '10px')
                    .style('fill', '#aaa')
                    .style('pointer-events', 'none')
                    .style('text-shadow', '0 1px 3px rgba(0,0,0,0.8)');
            }

            // Interaction
            nodes.on('click', (e, d: any) => {
                e.stopPropagation();
                toggleCollapse(d.data.address);
                setSelectedNode(d.data);
            });

            // Initial alignment
            const initialTranslateX = isMobile ? margin.left + 20 : margin.left;
            const initialScale = isMobile ? 0.6 : 1;

            // Only update transform if needed - check current transform
            if (!zoomLevel || zoomLevel === 1) {
                svg.call(zoom.transform, d3.zoomIdentity.translate(initialTranslateX, margin.top).scale(initialScale));
            }

        } catch (err: any) {
            console.error('FundingTree D3 Error:', err);
            setError(err.message || 'Error visualizing funding tree');
        }
    }, [node, isFullscreen, showMobileGraph, isMobile, collapsedNodes, direction, highlightedAddress, showLabels]);

    // Render Logic

    // 1. Mobile - Show MobileTreeView with option to view graph fullscreen
    if (isMobile && !showMobileGraph) {
        return (
            <MobileTreeView
                node={node}
                direction={direction}
                title={title}
                chainConfig={chainConfig}
                onShowGraph={() => setShowMobileGraph(true)}
            />
        );
    }

    // 2. Graph View (Desktop OR Mobile Fullscreen)
    const containerClasses = `tree-wrapper ${isFullscreen || (isMobile && showMobileGraph) ? 'fullscreen-mode' : ''}`;

    if (error) {
        return (
            <div style={{
                padding: 40,
                textAlign: 'center',
                color: 'var(--color-danger-text)',
                background: 'var(--color-bg-secondary)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-surface-border)'
            }}>
                <h3>Visualization Error</h3>
                <p style={{ margin: '10px 0' }}>{error}</p>
                <button
                    onClick={() => setError(null)}
                    className="btn btn-primary"
                    style={{ marginTop: 10 }}
                >
                    Retry Visualization
                </button>
            </div>
        );
    }

    // Inline styles for fixed positioning when fullscreen
    const wrapperStyle: React.CSSProperties = (isFullscreen || (isMobile && showMobileGraph)) ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 2000,
        background: 'var(--color-bg)',
        width: '100vw',
        height: '100vh',
    } : {
        position: 'relative',
        width: '100%',
        height: '450px', // Standard desktop height
        background: 'var(--color-bg-secondary)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-surface-border)',
        overflow: 'hidden'
    };

    return (
        <div
            ref={containerRef}
            className={containerClasses}
            style={wrapperStyle}
        >
            {/* Toolbar Overlay */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                padding: 12,
                display: 'flex',
                justifyContent: 'space-between',
                pointerEvents: 'none', // Let clicks pass through to canvas where possible
                zIndex: 10
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
                        background: 'rgba(0,0,0,0.6)',
                        padding: '4px 8px',
                        borderRadius: 4,
                        fontSize: 12,
                        color: direction === 'source' ? 'var(--color-success-text)' : 'var(--color-danger-text)'
                    }}>
                        {direction === 'source' ? 'Funding Sources' : 'Destinations'}
                    </span>
                </div>

                <div style={{ pointerEvents: 'auto', display: 'flex', gap: 8 }}>
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

            <svg ref={svgRef} style={{ width: '100%', height: '100%', display: 'block' }}></svg>

            {/* Mobile Rotate Hint if needed
            {isMobile && showMobileGraph && (
                <div style={{
                    position: 'absolute',
                    bottom: 20,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.7)',
                    padding: '8px 16px',
                    borderRadius: 20,
                    color: 'var(--color-text-primary)',
                    fontSize: 11,
                    pointerEvents: 'none'
                }}>
                    <Smartphone size={12} style={{ display: 'inline', marginRight: 6 }} />
                    Rotate for better view
                </div>
            )}
            */}
        </div>
    );
}

export default FundingTree;
