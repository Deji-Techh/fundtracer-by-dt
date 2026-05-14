/**
 * ForceGraph - Interactive force-directed graph visualization
 * Circular nodes, draggable/sticky, pan/zoom, fullscreen
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import './ForceGraph.css';

export interface FGNode {
  id: string;
  address: string;
  name?: string;
  category?: string;
  totalValueInEth: number;
  txCount: number;
  depth: number;
  direction: string;
}

export interface FGEdge {
  source: string;
  target: string;
  value: number;
}

interface ForceGraphProps {
  nodes: FGNode[];
  edges: FGEdge[];
  selectedNode: string | null;
  onNodeClick: (address: string) => void;
  categoryStyles: Record<string, { bg: string; border: string; text: string }>;
}

const DOT_COLORS: Record<string, string> = {
  cex:      '#f59e0b',
  dex:      '#9966ff',
  bridge:   '#00d4ff',
  mixer:    '#ff3366',
  lending:  '#00ff88',
  protocol: '#4488ff',
  wallet:   '#555566',
};
const FALLBACK_DOT = '#555566';

export function ForceGraph({ nodes, edges, selectedNode, onNodeClick, categoryStyles }: ForceGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [hoveredAddr, setHoveredAddr] = useState<string | null>(null);

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen();
      setFullscreen(true);
    } else {
      await document.exitFullscreen();
      setFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const container = containerRef.current;
    const svgEl = svgRef.current;
    const svg = d3.select(svgEl);

    // Dimensions
    const width = container?.clientWidth || 800;
    const height = fullscreen ? (container?.clientHeight || 600) : 600;

    svg.attr('width', width).attr('height', height);
    svg.selectAll('*').remove();

    // Main group for zoom/pan
    const g = svg.append('g').attr('class', 'fg-group');

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 5])
      .on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);
    // Center initial view
    svg.call(zoom.transform, d3.zoomIdentity.translate(40, 40));

    // Arrow marker
    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', 'fg-arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 22)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4')
      .attr('class', 'fg-arrow-path');

    // Prepare data references for simulation
    const simNodes: any[] = nodes.map(n => ({ ...n }));
    const nodeById = new Map(simNodes.map(n => [n.id, n]));

    const simEdges: any[] = edges
      .filter(e => nodeById.has(e.source) && nodeById.has(e.target))
      .map(e => ({ ...e }));

    // Force simulation
    const sim = d3.forceSimulation(simNodes)
      .force('link', d3.forceLink(simEdges).id((d: any) => d.id).distance(140))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(35))
      .alphaDecay(0.02);

    // Edges
    const link = g.append('g')
      .selectAll('line')
      .data(simEdges)
      .join('line')
      .attr('class', 'fg-link')
      .attr('marker-end', 'url(#fg-arrow)');

    // Edge labels (value)
    const linkLabel = g.append('g')
      .selectAll('text')
      .data(simEdges)
      .join('text')
      .text(d => d.value ? `${(d.value / 1000).toFixed(d.value >= 1000 ? 1 : 2)}k` : '')
      .attr('class', 'fg-link-label');

    // Node groups
    const nodeG = g.append('g')
      .selectAll('g')
      .data(simNodes)
      .join('g')
      .attr('cursor', 'grab')
      .call(d3.drag<SVGGElement, any>()
        .on('start', (event, d) => {
          if (!event.active) sim.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) sim.alphaTarget(0);
        })
      );

    // Outer ring (for selected pulse)
    nodeG.append('circle')
      .attr('class', 'fg-ring')
      .attr('r', 24)
      .attr('fill', 'none')
      .attr('stroke', 'transparent')
      .attr('stroke-width', 2);

    // Main circle
    nodeG.append('circle')
      .attr('class', 'fg-circle')
      .attr('r', 20)
      .attr('fill', d => {
        const c = categoryStyles[d.category || 'wallet'];
        return c?.bg || '#111118';
      })
      .attr('stroke', d => {
        const c = categoryStyles[d.category || 'wallet'];
        return c?.border || '#555566';
      })
      .attr('stroke-width', 2);

    // Small dot indicating category color
    nodeG.append('circle')
      .attr('r', 5)
      .attr('fill', d => DOT_COLORS[d.category || 'wallet'] || FALLBACK_DOT)
      .attr('class', 'fg-dot')
      .attr('cy', -2);

    // Name label
    nodeG.append('text')
      .attr('class', 'fg-label')
      .text(d => d.name || `${d.address.slice(0, 6)}...${d.address.slice(-3)}`)
      .attr('text-anchor', 'middle')
      .attr('dy', 34);

    // Value label (below name)
    nodeG.append('text')
      .attr('class', 'fg-valuelabel')
      .text(d => d.totalValueInEth ? `${d.totalValueInEth.toFixed(d.totalValueInEth < 0.01 ? 4 : 2)} ETH` : '')
      .attr('text-anchor', 'middle')
      .attr('dy', 46);

    // Hover events
    nodeG.on('mouseenter', function (event, d) {
      setHoveredAddr(d.address);
      d3.select(this).select('.fg-circle')
        .transition().duration(150)
        .attr('stroke-width', 3);
      // Highlight connected edges
      link
        .attr('class', (e: any) =>
          (e.source.id === d.id || e.target.id === d.id) ? 'fg-link fg-link-highlighted' : 'fg-link');
    });

    nodeG.on('mouseleave', function () {
      setHoveredAddr(null);
      d3.select(this).select('.fg-circle')
        .transition().duration(150)
        .attr('stroke-width', 2);
      link.attr('class', 'fg-link');
    });

    // Click to select
    nodeG.on('click', (event, d) => {
      event.stopPropagation();
      // Reset all rings
      nodeG.select('.fg-ring').attr('class', 'fg-ring');
      // Highlight selected
      d3.select(event.currentTarget).select('.fg-ring')
        .attr('class', 'fg-ring fg-ring-selected');
      onNodeClick(d.address);
    });

    // Double-click to unstick
    nodeG.on('dblclick', (event, d) => {
      event.stopPropagation();
      d.fx = null;
      d.fy = null;
      sim.alpha(0.3).restart();
    });

    // Click background to deselect
    svg.on('click', () => {
      nodeG.select('.fg-ring').attr('class', 'fg-ring');
    });

    // Tick simulation
    sim.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      linkLabel
        .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
        .attr('y', (d: any) => (d.source.y + d.target.y) / 2 - 6);

      nodeG.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    // Cleanup
    return () => { sim.stop(); };
  }, [nodes, edges, fullscreen, selectedNode, onNodeClick, categoryStyles]);

  const edgeCount = edges.length;

  return (
    <div ref={containerRef} className={`force-graph-wrapper${fullscreen ? ' is-fullscreen' : ''}`}>
      {/* Toolbar */}
      <div className="fg-toolbar">
        <div className="fg-toolbar-info">
          <span className="fg-stat">{nodes.length} wallets</span>
          <span className="fg-stat-divider" />
          <span className="fg-stat">{edgeCount} connections</span>
        </div>
        <div className="fg-toolbar-actions">
          <button
            className="fg-toolbar-btn"
            onClick={toggleFullscreen}
            title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {fullscreen ? (
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14 }}>
                <path d="M3 3h2v2H3zM9 3h2v2H9zM3 9h2v2H3zM9 9h2v2H9z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14 }}>
                <path d="M2 5V2h3M12 5V2H9M2 9v3h3M12 9v3H9"/>
              </svg>
            )}
          </button>
          <button className="fg-toolbar-btn" onClick={() => {
            if (svgRef.current) {
              d3.select(svgRef.current).transition().duration(500)
                .call(d3.zoom<SVGSVGElement, unknown>().transform, d3.zoomIdentity);
            }
          }} title="Reset view">
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14 }}>
              <circle cx="7" cy="7" r="5"/><path d="M7 4v6M4 7h6"/>
            </svg>
          </button>
        </div>
      </div>

      {/* SVG canvas */}
      <svg ref={svgRef} className="fg-svg" width="100%" height={fullscreen ? '100%' : 600}>
        <rect width="100%" height="100%" fill="transparent" />
      </svg>

      {/* Hover tooltip */}
      {hoveredAddr && (
        <div className="fg-tooltip">
          <span className="fg-tooltip-addr">{hoveredAddr}</span>
        </div>
      )}

      {/* Hint */}
      {!fullscreen && (
        <div className="fg-hint">
          <span>Drag nodes · Scroll to zoom · Double-click to release · Click to inspect</span>
        </div>
      )}
    </div>
  );
}

export default ForceGraph;
