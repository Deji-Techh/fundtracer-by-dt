import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { ChainId } from '../../types';
import { useIsMobile } from '../../../hooks/useIsMobile';

interface FundingNode {
  address: string;
  label?: string;
  depth: number;
  totalValue?: string;
  totalValueInEth?: number;
  txCount?: number;
  children?: FundingNode[];
  entityType?: string;
  suspiciousScore?: number;
}

interface FundingTreeProps {
  sources?: FundingNode[];
  destinations?: FundingNode[];
  targetAddress: string;
  chain?: ChainId;
  direction?: 'source' | 'destination' | 'both';
}

interface PositionedNode {
  id: string;
  node: FundingNode;
  x: number;
  y: number;
  depth: number;
  isTarget: boolean;
  collapsed: boolean;
  visible: boolean;
}

interface TreeEdge {
  id: string;
  fromId: string;
  toId: string;
  fromX: number; fromY: number;
  toX: number; toY: number;
  value: number;
  visible: boolean;
}

const ENTITY_COLORS: Record<string, string> = {
  cex: '#f59e0b', bridge: '#00d4ff', mixer: '#ff3366',
  dex: '#9966ff', contract: '#6366f1', wallet: '#888888',
};

const NODE_W = 240;
const NODE_H = 72;
const COL_GAP = 90;
const ROW_GAP = 12;
const PAD = 40;
const MIN_SCALE = 0.22;

interface TreeDims {
  nodeW: number;
  nodeH: number;
  colGap: number;
  rowGap: number;
  pad: number;
  minScale: number;
}

const DESKTOP_TREE_DIMS: TreeDims = { nodeW: NODE_W, nodeH: NODE_H, colGap: COL_GAP, rowGap: ROW_GAP, pad: PAD, minScale: MIN_SCALE };
const MOBILE_TREE_DIMS: TreeDims = { nodeW: 166, nodeH: 56, colGap: 42, rowGap: 8, pad: 18, minScale: 0.32 };

const CHAIN_EXPLORERS: Record<string, string> = {
  ethereum: 'https://etherscan.io/address',
  base: 'https://basescan.org/address',
  arbitrum: 'https://arbiscan.io/address',
  optimism: 'https://optimistic.etherscan.io/address',
  polygon: 'https://polygonscan.com/address',
  bsc: 'https://bscscan.com/address',
  linea: 'https://lineascan.build/address',
  solana: 'https://solscan.io/account',
};

function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.abs(x2 - x1) * 0.4;
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

export function FundingTree({ sources, destinations, targetAddress, chain = 'ethereum', direction = 'both' }: FundingTreeProps) {
  const isMobile = useIsMobile();
  const [activeDir, setActiveDir] = useState<'source' | 'destination'>('source');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [scale, setScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [nodeOffsets, setNodeOffsets] = useState<Record<string, { dx: number; dy: number }>>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const scaleRef = useRef(scale);
  const panRef = useRef({ x: panX, y: panY });
  const dragNodeRef = useRef<{ id: string; startX: number; startY: number; offsetX: number; offsetY: number } | null>(null);
  scaleRef.current = scale;
  panRef.current = { x: panX, y: panY };

  const targetId = targetAddress.toLowerCase();
  const nodes = activeDir === 'source' ? (sources || []) : (destinations || []);
  const explorer = CHAIN_EXPLORERS[chain] || 'https://etherscan.io/address';
  const dims = isMobile ? MOBILE_TREE_DIMS : DESKTOP_TREE_DIMS;

  const { positioned, edges, width, height } = useMemo(() => {
    const pNodes: PositionedNode[] = [];
    const tEdges: TreeEdge[] = [];
    const seen = new Set<string>();
    const depthColumns = new Map<number, number>(); // depth → current row count

    function walk(node: FundingNode, parentId: string | null, parentDepth: number) {
      const id = node.address.toLowerCase();
      if (seen.has(id)) return;
      seen.add(id);

      const depth = parentId ? parentDepth + 1 : 0;
      const col = depthColumns.get(depth) || 0;
      depthColumns.set(depth, col + 1);

      const isTarget = id === targetId;
      const collapsed = collapsedNodes.has(id);

	    pNodes.push({
        id,
        node,
	        x: dims.pad + depth * (dims.nodeW + dims.colGap),
	        y: dims.pad + col * (dims.nodeH + dims.rowGap),
        depth,
        isTarget,
        collapsed,
        visible: true,
      });

      if (parentId) {
        const parentNode = pNodes.find(n => n.id === parentId);
        if (parentNode) {
          tEdges.push({
            id: `${parentId}->${id}`,
            fromId: parentId,
            toId: id,
	            fromX: parentNode.x + dims.nodeW,
	            fromY: parentNode.y + dims.nodeH / 2,
	            toX: dims.pad + depth * (dims.nodeW + dims.colGap),
	            toY: dims.pad + col * (dims.nodeH + dims.rowGap) + dims.nodeH / 2,
            value: node.totalValueInEth || 0,
            visible: !collapsedNodes.has(parentId),
          });
        }
      }

      if (node.children && !collapsed) {
        for (const child of node.children) {
          walk(child, id, depth);
        }
      }
    }

    for (const root of nodes) {
      walk(root, null, -1);
    }

    const maxCol = Math.max(...Array.from(depthColumns.values()), 1);
    const maxDepth = depthColumns.size || 1;
	    const totalH = dims.pad + maxCol * (dims.nodeH + dims.rowGap) + dims.pad;
	    const totalW = dims.pad + maxDepth * (dims.nodeW + dims.colGap) + dims.nodeW + dims.pad;

	    return { positioned: pNodes, edges: tEdges, width: totalW, height: totalH };
	  }, [nodes, targetId, collapsedNodes, dims]);

  // Fit on data change — guard against zero dimensions (hidden tab / layout not settled)
  useEffect(() => {
    const c = containerRef.current;
    if (!c || positioned.length === 0) return;
    const cw = c.clientWidth;
    const ch = c.clientHeight;
    if (cw <= 0 || ch <= 0) return;
	    const fit = Math.max(dims.minScale, Math.min((cw - 24) / width, (ch - 24) / height, 1));
    setScale(fit);
    setPanX((cw - width * fit) / 2);
    setPanY(Math.max(0, (ch - height * fit) / 2));
    setNodeOffsets({});
	  }, [width, height, positioned.length, dims.minScale]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const c = containerRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.12 : 0.88;
	    const ns = Math.max(dims.minScale, Math.min(3, scaleRef.current * factor));
    const ratio = ns / scaleRef.current;
    setScale(ns);
    setPanX(mx - ratio * (mx - panRef.current.x));
    setPanY(my - ratio * (my - panRef.current.y));
	  }, [dims.minScale]);

	  const handlePointerDown = useCallback((e: React.PointerEvent) => {
	    const nodeEl = (e.target as HTMLElement).closest('[data-tnode-id]') as HTMLElement | null;
    if (nodeEl) {
      const nodeId = nodeEl.getAttribute('data-tnode-id');
      if (nodeId) {
	        const existing = nodeOffsets[nodeId] || { dx: 0, dy: 0 };
	        dragNodeRef.current = { id: nodeId, startX: e.clientX, startY: e.clientY, offsetX: existing.dx, offsetY: existing.dy };
	        e.currentTarget.setPointerCapture?.(e.pointerId);
	        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }
	    isDragging.current = true;
	    dragStart.current = { x: e.clientX, y: e.clientY, panX: panRef.current.x, panY: panRef.current.y };
	    e.currentTarget.setPointerCapture?.(e.pointerId);
	    e.preventDefault();
	  }, [nodeOffsets]);

	  useEffect(() => {
	    const mm = (e: PointerEvent) => {
      const dn = dragNodeRef.current;
      if (dn) {
        const dx = (e.clientX - dn.startX) / scaleRef.current;
        const dy = (e.clientY - dn.startY) / scaleRef.current;
        if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return;
        setNodeOffsets(prev => ({
          ...prev,
          [dn.id]: { dx: dn.offsetX + dx, dy: dn.offsetY + dy },
        }));
        return;
      }
      if (!isDragging.current) return;
      setPanX(dragStart.current.panX + e.clientX - dragStart.current.x);
      setPanY(dragStart.current.panY + e.clientY - dragStart.current.y);
	    };
	    const mu = () => { isDragging.current = false; dragNodeRef.current = null; };
	    window.addEventListener('pointermove', mm);
	    window.addEventListener('pointerup', mu);
	    window.addEventListener('pointercancel', mu);
	    return () => {
	      window.removeEventListener('pointermove', mm);
	      window.removeEventListener('pointerup', mu);
	      window.removeEventListener('pointercancel', mu);
	    };
	  }, []);

  const toggleCollapse = useCallback((nodeId: string) => {
    setCollapsedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  const fitToScreen = useCallback(() => {
    const c = containerRef.current;
    if (!c || c.clientWidth <= 0 || c.clientHeight <= 0) return;
	    const fit = Math.max(dims.minScale, Math.min((c.clientWidth - 24) / width, (c.clientHeight - 24) / height, 1));
    setScale(fit);
    setPanX((c.clientWidth - width * fit) / 2);
    setPanY((c.clientHeight - height * fit) / 2);
	  }, [width, height, dims.minScale]);

  const selected = positioned.find(n => n.id === selectedId);

  if (nodes.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-tertiary)', fontSize: 13, fontFamily: 'var(--font-sans)' }}>
        Run a full analysis to generate the funding tree visualization.
      </div>
    );
  }

  return (
	    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%', minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
      {/* Toolbar */}
	      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
	        <div style={{ display: 'flex', gap: 4, minWidth: 0, flexWrap: 'wrap' }}>
          <button onClick={() => { setActiveDir('source'); setSelectedId(null); }}
            style={dirBtnStyle(activeDir === 'source')}>
            Sources ({sources?.length || 0})
          </button>
          <button onClick={() => { setActiveDir('destination'); setSelectedId(null); }}
            style={dirBtnStyle(activeDir === 'destination')}>
            Destinations ({destinations?.length || 0})
          </button>
          {collapsedNodes.size > 0 && (
            <button onClick={() => setCollapsedNodes(new Set())}
              style={{ ...dirBtnStyle(false), fontSize: 10, color: 'var(--accent)' }}>
              Expand all
            </button>
          )}
        </div>
	        <div style={{ display: 'flex', gap: 4, alignItems: 'center', minWidth: 0 }}>
	          <span style={{ fontSize: 10, color: 'var(--fg-tertiary)', fontFamily: 'var(--font-mono)', marginRight: isMobile ? 2 : 8 }}>
            {positioned.length} nodes
          </span>
          <span style={{ fontSize: 9, color: 'var(--fg-tertiary)', fontFamily: 'var(--font-mono)', margin: '0 2px' }}>
            {Math.round(scale * 100)}%
          </span>
	          <TinyBtn onClick={() => setScale(s => Math.max(dims.minScale, s * 0.75))} label="−" />
          <TinyBtn onClick={fitToScreen} label="⊡" />
          <TinyBtn onClick={() => setScale(s => Math.min(3, s * 1.35))} label="+" />
        </div>
      </div>

      {/* Tree viewport */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
	        onPointerDown={handlePointerDown}
        style={{
	          flex: 1, position: 'relative', overflow: 'hidden', maxWidth: '100%',
	          borderRadius: 'var(--radius-xl)', border: '1px solid var(--hairline)',
	          background: 'var(--bg-secondary)', minHeight: 250,
	          cursor: isDragging.current ? 'grabbing' : 'grab',
	          touchAction: 'none',
        }}
      >
        <div style={{
          position: 'absolute', inset: 0,
          transform: `translate(${panX}px, ${panY}px) scale(${scale})`,
          transformOrigin: '0 0', width, height,
        }}>
          {/* SVG edges */}
          <svg width={width} height={height}
            style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}>
            <defs>
              <marker id="t-arrow" viewBox="0 0 10 7" refX="9" refY="3.5" markerWidth="6" markerHeight="4" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="var(--fg-tertiary)" />
              </marker>
              <marker id="t-arrow-hl" viewBox="0 0 10 7" refX="9" refY="3.5" markerWidth="6" markerHeight="4" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="var(--accent)" />
              </marker>
            </defs>
            {edges.map(e => {
              const isSelected = selectedId && (e.fromId === selectedId || e.toId === selectedId);
              if (!e.visible) return null;
              const offFrom = nodeOffsets[e.fromId] || { dx: 0, dy: 0 };
              const offTo = nodeOffsets[e.toId] || { dx: 0, dy: 0 };
              const ex1 = e.fromX + offFrom.dx;
              const ey1 = e.fromY + offFrom.dy;
              const ex2 = e.toX + offTo.dx;
              const ey2 = e.toY + offTo.dy;
              return (
                <g key={e.id}>
                  <path
                    d={bezierPath(ex1, ey1, ex2, ey2)}
                    fill="none"
                    stroke={isSelected ? 'var(--accent)' : 'var(--hairline)'}
                    strokeWidth={isSelected ? 1.5 : 1}
                    opacity={selectedId && !isSelected ? 0.12 : 0.6}
                    markerEnd={isSelected ? 'url(#t-arrow-hl)' : 'url(#t-arrow)'}
                    style={{ transition: 'stroke 200ms, opacity 200ms' }}
                  />
                  {e.value > 0 && (
                    <text
                      x={(ex1 + ex2) / 2}
                      y={(ey1 + ey2) / 2 - 6}
                      textAnchor="middle"
                      fill="var(--fg-tertiary)"
                      fontSize="9"
                      fontFamily="var(--font-mono)"
                      opacity={isSelected ? 1 : 0.7}
                    >
                      {e.value < 0.0001 ? '<0.0001' : e.value.toFixed(4)} ETH
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* HTML node cards */}
          {positioned.map(pn => {
            const isSelected = pn.id === selectedId;
            const isSelectedEdge = selectedId && edges.some(e =>
              (e.fromId === selectedId && e.toId === pn.id) || (e.toId === selectedId && e.fromId === pn.id)
            );
            const dimmed = selectedId && !isSelected && !isSelectedEdge;
            const eColor = ENTITY_COLORS[pn.node.entityType || ''] || ENTITY_COLORS.wallet;
            const hasKids = pn.node.children && pn.node.children.length > 0;
            const addr = pn.node.address;
            const off = nodeOffsets[pn.id] || { dx: 0, dy: 0 };

            return (
              <div
                key={pn.id}
                data-tnode-id={pn.id}
                onClick={(e) => { e.stopPropagation(); setSelectedId(isSelected ? null : pn.id); }}
                style={{
                  position: 'absolute', left: pn.x + off.dx, top: pn.y + off.dy,
	                  width: dims.nodeW, minHeight: dims.nodeH,
                  borderRadius: 'var(--radius-lg)',
                  border: pn.isTarget ? '2px solid var(--accent)' : isSelected ? '2px solid var(--fg)' : '1px solid var(--card-border)',
                  background: pn.isTarget ? 'rgba(0,230,122,0.05)' : 'var(--card)',
                  boxShadow: isSelected ? '0 4px 16px rgba(0,0,0,0.28)' : '0 1px 2px rgba(0,0,0,0.08)',
                  cursor: 'pointer', opacity: dimmed ? 0.35 : 1,
                  transition: 'opacity 200ms, border-color 200ms, box-shadow 200ms',
                  display: 'flex', fontFamily: 'var(--font-mono)', overflow: 'hidden',
                }}
                onMouseEnter={e => {
                  if (!isSelected) { e.currentTarget.style.borderColor = 'var(--fg-secondary)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)'; }
                }}
                onMouseLeave={e => {
                  if (!isSelected) { e.currentTarget.style.borderColor = pn.isTarget ? 'var(--accent)' : 'var(--card-border)'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.08)'; }
                }}
              >
                {/* Left accent strip */}
                <div style={{
                  width: 4, minHeight: '100%', flexShrink: 0,
                  background: pn.isTarget ? 'var(--accent)' : eColor,
                  borderRadius: 'var(--radius-lg) 0 0 var(--radius-lg)',
                }} />

                {/* Content */}
	                <div style={{ padding: isMobile ? '7px 8px' : '8px 10px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3, minWidth: 0 }}>
                  {/* Row 1: entity badge + address */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {pn.node.entityType && pn.node.entityType !== 'wallet' && (
                      <span style={{
	                        fontSize: 8, fontWeight: 600, padding: isMobile ? '1px 4px' : '1px 5px', borderRadius: 'var(--radius-full)',
                        background: `${eColor}20`, color: eColor, textTransform: 'uppercase',
                        letterSpacing: '0.05em', fontFamily: 'var(--font-sans)', flexShrink: 0,
                      }}>{pn.node.entityType}</span>
                    )}
                    {pn.isTarget && (
                      <span style={{
	                        fontSize: 8, fontWeight: 600, padding: isMobile ? '1px 4px' : '1px 5px', borderRadius: 'var(--radius-full)',
                        background: 'rgba(0,230,122,0.15)', color: 'var(--accent)',
                        fontFamily: 'var(--font-sans)', flexShrink: 0,
                      }}>TARGET</span>
                    )}
                    <span style={{
	                      fontSize: isMobile ? 10 : 11, fontWeight: 600, color: pn.isTarget ? 'var(--accent)' : 'var(--fg)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {pn.node.label || `${addr.slice(0, 6)}...${addr.slice(-4)}`}
                    </span>
                  </div>

                  {/* Row 2: value + tx count */}
	                  <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10, fontSize: isMobile ? 9 : 10, color: 'var(--fg-tertiary)' }}>
                    {pn.node.totalValueInEth != null && pn.node.totalValueInEth > 0 && (
                      <span style={{ color: 'var(--fg-secondary)' }}>
                        {pn.node.totalValueInEth < 0.0001 ? '<0.0001' : pn.node.totalValueInEth.toFixed(4)} ETH
                      </span>
                    )}
                    {pn.node.txCount != null && pn.node.txCount > 0 && (
                      <span>{pn.node.txCount} tx{pn.node.txCount !== 1 ? 's' : ''}</span>
                    )}
                    {pn.node.suspiciousScore != null && pn.node.suspiciousScore > 30 && (
                      <span style={{
                        color: 'var(--destructive)', fontSize: 9, fontWeight: 600,
                        background: 'rgba(255,69,58,0.1)', padding: '0px 5px', borderRadius: 'var(--radius-md)',
                      }}>{pn.node.suspiciousScore}</span>
                    )}
                  </div>

                  {/* Row 3: children indicator */}
                  {hasKids && (
	                    <div style={{ fontSize: 9, color: 'var(--fg-tertiary)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                      {pn.collapsed ? (
                        <span style={{ color: 'var(--accent)' }}>+ {pn.node.children!.length} hidden</span>
                      ) : (
                        <span>{pn.node.children!.length} destinations</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Expand/collapse button */}
                {hasKids && (
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleCollapse(pn.id); }}
                    style={{
                      position: 'absolute', top: -8, right: -8,
                      width: 22, height: 22, borderRadius: '50%',
                      border: '1px solid var(--card-border)', background: 'var(--card)',
                      color: 'var(--fg-tertiary)', fontSize: 12, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--fg)'; e.currentTarget.style.borderColor = 'var(--fg-secondary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--fg-tertiary)'; e.currentTarget.style.borderColor = 'var(--card-border)'; }}
                    title={pn.collapsed ? 'Expand' : 'Collapse'}
                  >
                    {pn.collapsed ? '+' : '−'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected node detail */}
      {selected && (
        <div style={{
          padding: '10px 14px', borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--hairline)', background: 'var(--card)',
          display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap',
          fontSize: 11, fontFamily: 'var(--font-mono)',
        }}>
          <a href={`${explorer}/${selected.node.address}`} target="_blank" rel="noreferrer"
            style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            {selected.node.address.slice(0, 12)}...{selected.node.address.slice(-8)}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
          {selected.node.entityType && selected.node.entityType !== 'wallet' && (
            <span style={{
              padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: 9, fontWeight: 600,
              background: `${ENTITY_COLORS[selected.node.entityType] || '#666'}20`,
              color: ENTITY_COLORS[selected.node.entityType] || '#666',
              textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-sans)',
            }}>{selected.node.entityType}</span>
          )}
          {selected.node.totalValueInEth != null && selected.node.totalValueInEth > 0 && (
            <span style={{ color: 'var(--accent)' }}>{selected.node.totalValueInEth < 0.0001 ? '<0.0001' : selected.node.totalValueInEth.toFixed(6)} ETH</span>
          )}
          {selected.node.txCount != null && <span style={{ color: 'var(--fg-tertiary)' }}>{selected.node.txCount} txs</span>}
          <span style={{ color: 'var(--fg-tertiary)' }}>depth {selected.depth}</span>
          {selected.node.suspiciousScore != null && selected.node.suspiciousScore > 30 && (
            <span style={{ color: 'var(--destructive)', background: 'rgba(255,69,58,0.1)', padding: '2px 6px', borderRadius: 'var(--radius-md)' }}>
              risk {selected.node.suspiciousScore}
            </span>
          )}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', paddingTop: 2 }}>
        <Legend color="var(--accent)" label="Target" />
        {Object.entries(ENTITY_COLORS).map(([type, color]) => (
          <Legend key={type} color={color} label={type} />
        ))}
      </div>
    </div>
  );
}

function dirBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: '5px 14px', borderRadius: 'var(--radius-md)', fontSize: 11, fontWeight: 500, cursor: 'pointer',
    border: active ? '1px solid var(--accent)' : '1px solid var(--hairline)',
    background: active ? 'rgba(0,230,122,0.08)' : 'var(--card)',
    color: active ? 'var(--accent)' : 'var(--fg-tertiary)',
    fontFamily: 'var(--font-sans)', transition: 'all 150ms',
  };
}

function TinyBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick}
      style={{
        width: 28, height: 28, borderRadius: 'var(--radius-md)', border: '1px solid var(--hairline)',
        background: 'var(--card)', color: 'var(--fg-tertiary)', fontSize: 14, fontFamily: 'var(--font-mono)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onMouseEnter={e => { e.currentTarget.style.color = 'var(--fg)'; e.currentTarget.style.borderColor = 'var(--fg-secondary)'; }}
      onMouseLeave={e => { e.currentTarget.style.color = 'var(--fg-tertiary)'; e.currentTarget.style.borderColor = 'var(--hairline)'; }}
    >{label}</button>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block' }} />
      <span style={{ fontSize: 9, color: 'var(--fg-tertiary)', fontFamily: 'var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </span>
    </div>
  );
}
