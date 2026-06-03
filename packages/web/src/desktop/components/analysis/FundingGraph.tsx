import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useIsMobile } from '../../../hooks/useIsMobile';

interface FNode {
  address: string;
  label?: string;
  depth?: number;
  totalValueInEth?: number;
  txCount?: number;
  entityType?: string;
  suspiciousScore?: number;
  children?: FNode[];
}

interface GraphProps {
  sources?: FNode[];
  destinations?: FNode[];
  targetAddress: string;
  chain?: string;
}

const NATIVE_TICKER: Record<string, string> = {
  ethereum: 'ETH', base: 'ETH', arbitrum: 'ETH', optimism: 'ETH',
  polygon: 'POL', bsc: 'BNB', linea: 'ETH', solana: 'SOL',
};

interface PositionedNode {
  id: string;
  address: string;
  label: string;
  x: number;
  y: number;
  value: number;
  txCount: number;
  entityType: string;
  suspiciousScore: number;
  isTarget: boolean;
  depth: number;
}

interface EdgeDef {
  id: string;
  from: string;
  to: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const ENTITY_COLORS: Record<string, string> = {
  cex: '#f59e0b', bridge: '#00d4ff', mixer: '#ff3366',
  dex: '#9966ff', contract: '#6366f1', wallet: '#888888',
};

const NODE_W = 210;
const NODE_H = 64;
const H_GAP = 100;
const V_GAP = 16;
const PAD = 60;
const MIN_SCALE = 0.2;

interface GraphDims {
  nodeW: number;
  nodeH: number;
  hGap: number;
  vGap: number;
  pad: number;
  minScale: number;
}

const DESKTOP_DIMS: GraphDims = { nodeW: NODE_W, nodeH: NODE_H, hGap: H_GAP, vGap: V_GAP, pad: PAD, minScale: MIN_SCALE };
const MOBILE_DIMS: GraphDims = { nodeW: 156, nodeH: 52, hGap: 42, vGap: 10, pad: 18, minScale: 0.32 };

function computeLayout(nodes: FNode[], targetAddr: string, dims: GraphDims): {
  positioned: PositionedNode[];
  edges: EdgeDef[];
  width: number;
  height: number;
} {
  const { nodeW, nodeH, hGap, vGap, pad } = dims;
  const targetId = targetAddr.toLowerCase();
  const addrMap = new Map<string, { minDepth: number; node: FNode; parents: string[] }>();

  // First pass: collect all unique addresses and their minimum depth
  function walk(node: FNode, parentId?: string) {
    const id = node.address.toLowerCase();
    const existing = addrMap.get(id);
    const depth = node.depth ?? 0;

    if (existing) {
      if (depth < existing.minDepth) existing.minDepth = depth;
      if (parentId && !existing.parents.includes(parentId)) existing.parents.push(parentId);
      // update node with richer data
      if (node.totalValueInEth && !existing.node.totalValueInEth) existing.node = node;
      if (node.entityType && existing.node.entityType === 'wallet') existing.node = node;
    } else {
      addrMap.set(id, {
        minDepth: depth,
        node: { ...node },
        parents: parentId ? [parentId] : [],
      });
    }

    if (node.children) {
      for (const child of node.children) {
        walk(child, id);
      }
    }
  }

  for (const root of nodes) {
    walk(root);
  }

  // Determine if target address is in the tree
  const targetEntry = addrMap.get(targetId);

  // Compute max depth (excluding target at very end)
  let maxDepth = 0;
  for (const [, entry] of addrMap) {
    if (entry.node.address.toLowerCase() !== targetId && entry.minDepth > maxDepth) {
      maxDepth = entry.minDepth;
    }
  }

  // Place target at maxDepth + 1 (rightmost column)
  const targetDepth = maxDepth + 1;

  // Group non-target nodes by depth
  const depthBuckets = new Map<number, string[]>();
  for (const [id, entry] of addrMap) {
    if (id === targetId) continue;
    const d = entry.minDepth;
    if (!depthBuckets.has(d)) depthBuckets.set(d, []);
    depthBuckets.get(d)!.push(id);
  }

  // Sort nodes within each depth to minimize edge crossings (barycenter heuristic)
  const depthLevels = Array.from(depthBuckets.keys()).sort((a, b) => a - b);
  for (let i = 1; i < depthLevels.length; i++) {
    const prevBucket = depthBuckets.get(depthLevels[i - 1]) || [];
    const currBucket = depthBuckets.get(depthLevels[i])!;
    const prevPositions = new Map<string, number>();
    prevBucket.forEach((id, idx) => prevPositions.set(id, idx));

    currBucket.sort((a, b) => {
      const entryA = addrMap.get(a)!;
      const entryB = addrMap.get(b)!;
      const avgPosA = entryA.parents.reduce((sum, p) => sum + (prevPositions.get(p) ?? prevBucket.length / 2), 0) / (entryA.parents.length || 1);
      const avgPosB = entryB.parents.reduce((sum, p) => sum + (prevPositions.get(p) ?? prevBucket.length / 2), 0) / (entryB.parents.length || 1);
      return avgPosA - avgPosB;
    });
  }

  // Assign positions
  const positions = new Map<string, { x: number; y: number }>();
  const depthCounts = new Map<number, number>();

  for (const depth of depthLevels) {
    const bucket = depthBuckets.get(depth)!;
    const x = pad + depth * (nodeW + hGap);
    for (const id of bucket) {
      const idx = depthCounts.get(depth) || 0;
      const y = pad + idx * (nodeH + vGap);
      positions.set(id, { x, y });
      depthCounts.set(depth, idx + 1);
    }
  }

  // Place target node
  const targetX = pad + targetDepth * (nodeW + hGap);
  const maxNodesInCol = Math.max(...Array.from(depthCounts.values()), 1);
  const targetY = pad + (maxNodesInCol * (nodeH + vGap) - vGap) / 2 - nodeH / 2;
  positions.set(targetId, { x: targetX, y: targetY });

  // Build positioned nodes
  const positioned: PositionedNode[] = [];
  for (const [id, entry] of addrMap) {
    const pos = positions.get(id) || positions.get(targetId)!;
    const isTarget = id === targetId;
    positioned.push({
      id,
      address: entry.node.address,
      label: entry.node.label || `${entry.node.address.slice(0, 8)}...${entry.node.address.slice(-4)}`,
      x: pos.x,
      y: pos.y,
      value: entry.node.totalValueInEth || 0,
      txCount: entry.node.txCount || 0,
      entityType: entry.node.entityType || 'wallet',
      suspiciousScore: entry.node.suspiciousScore || 0,
      isTarget,
      depth: isTarget ? targetDepth : entry.minDepth,
    });
  }

  // Build edges (parent → child relationships)
  const edges: EdgeDef[] = [];
  for (const [id, entry] of addrMap) {
    if (entry.node.children) {
      for (const child of entry.node.children) {
        const childId = child.address.toLowerCase();
        const fromPos = positions.get(id);
        const toPos = positions.get(childId);
        if (fromPos && toPos) {
          edges.push({
            id: `${id}->${childId}`,
            from: id,
            to: childId,
            x1: fromPos.x + nodeW,
            y1: fromPos.y + nodeH / 2,
            x2: toPos.x,
            y2: toPos.y + nodeH / 2,
          });
        }
      }
    }
  }

  // Compute total dimensions
  const totalWidth = targetX + nodeW + pad;
  const totalHeight = pad + maxNodesInCol * (nodeH + vGap) + pad;

  return { positioned, edges, width: totalWidth, height: totalHeight };
}

function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.abs(x2 - x1) * 0.45;
  const cp1x = x1 + dx;
  const cp2x = x2 - dx;
  return `M ${x1} ${y1} C ${cp1x} ${y1}, ${cp2x} ${y2}, ${x2} ${y2}`;
}

export function FundingGraph({ sources, destinations, targetAddress, chain = 'ethereum' }: GraphProps) {
  const isMobile = useIsMobile();
  const ticker = NATIVE_TICKER[chain] || 'ETH';
  const [mode, setMode] = useState<'sources' | 'destinations'>('sources');
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  const dims = isMobile ? MOBILE_DIMS : DESKTOP_DIMS;
  const nodesList = mode === 'sources' ? (sources || []) : (destinations || []);

  const { positioned, edges, width, height } = useMemo(
    () => computeLayout(nodesList, targetAddress, dims),
    [nodesList, targetAddress, dims],
  );

  // Compute initial fit on mount and when data changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container || positioned.length === 0) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    if (cw <= 0 || ch <= 0) return;
    const baseFit = Math.max(dims.minScale, Math.min((cw - 24) / width, (ch - 24) / height));
    const fitScale = Math.max(dims.minScale, Math.min(3, baseFit));
    const cx = (cw - width * fitScale) / 2;
    const cy = (ch - height * fitScale) / 2;

    setScale(fitScale);
    setPanX(cx);
    setPanY(cy);
    setSelectedId(null);
    setNodeOffsets({});
  }, [width, height, positioned.length, dims.minScale]);

  // Wheel zoom (centered on cursor)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.12 : 0.88;
    const newScale = Math.max(dims.minScale, Math.min(3, scaleRef.current * factor));
    const ratio = newScale / scaleRef.current;

    setScale(newScale);
    setPanX(mx - ratio * (mx - panRef.current.x));
    setPanY(my - ratio * (my - panRef.current.y));
  }, [dims.minScale]);

  // Pan via background drag, or drag individual nodes
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const nodeEl = (e.target as HTMLElement).closest('[data-node-id]') as HTMLElement | null;
    if (nodeEl) {
      const nodeId = nodeEl.getAttribute('data-node-id');
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
    const onMove = (e: PointerEvent) => {
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
    const onUp = () => { isDragging.current = false; dragNodeRef.current = null; };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, []);

  const fitToScreen = useCallback(() => {
    const container = containerRef.current;
    if (!container || container.clientWidth <= 0 || container.clientHeight <= 0) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const baseFit = Math.max(dims.minScale, Math.min((cw - 24) / width, (ch - 24) / height));
    const fitScale = Math.max(dims.minScale, Math.min(3, baseFit));
    setScale(fitScale);
    setPanX((cw - width * fitScale) / 2);
    setPanY((ch - height * fitScale) / 2);
  }, [width, height, dims.minScale]);

  const centerOnTarget = useCallback(() => {
    const targetNode = positioned.find(n => n.isTarget);
    if (!targetNode) return;
    const container = containerRef.current;
    if (!container) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    setPanX(cw / 2 - (targetNode.x + dims.nodeW / 2) * scale);
    setPanY(ch / 2 - (targetNode.y + dims.nodeH / 2) * scale);
  }, [positioned, scale, dims.nodeW, dims.nodeH]);

  const selected = positioned.find(n => n.id === selectedId);
  const highlightIds = useMemo(() => {
    if (!selectedId) return new Set<string>();
    const ids = new Set<string>();
    for (const edge of edges) {
      if (edge.from === selectedId) ids.add(edge.to);
      if (edge.to === selectedId) ids.add(edge.from);
    }
    ids.add(selectedId);
    return ids;
  }, [selectedId, edges]);

  if (positioned.length === 0) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: 400, color: 'var(--fg-tertiary)', fontSize: 13, fontFamily: 'var(--font-sans)',
      }}>
        No graph data available for this {mode === 'sources' ? 'funding source' : 'destination'} view.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%', minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          flexWrap: isMobile ? 'wrap' : 'nowrap',
      }}>
        <div style={{ display: 'flex', gap: 4, minWidth: 0, flexWrap: 'wrap' }}>
          <button
            onClick={() => { setMode('sources'); setSelectedId(null); }}
            style={toggleBtnStyle(mode === 'sources')}>
            Sources ({sources?.length || 0})
          </button>
          <button
            onClick={() => { setMode('destinations'); setSelectedId(null); }}
            style={toggleBtnStyle(mode === 'destinations')}>
            Destinations ({destinations?.length || 0})
          </button>
        </div>

        <div style={{ display: 'flex', gap: 4, alignItems: 'center', minWidth: 0 }}>
          <span style={{ fontSize: 10, color: 'var(--fg-tertiary)', fontFamily: 'var(--font-mono)', marginRight: isMobile ? 2 : 8 }}>
            {positioned.length} nodes · {edges.length} edges
          </span>
          <span style={{ fontSize: 9, color: 'var(--fg-tertiary)', fontFamily: 'var(--font-mono)', margin: '0 2px' }}>
            {Math.round(scale * 100)}%
          </span>
          <ToolBtn onClick={() => setScale(s => Math.max(dims.minScale, s * 0.75))} label="−" />
          <ToolBtn onClick={fitToScreen} label="⊡" />
          <ToolBtn onClick={() => setScale(s => Math.min(3, s * 1.35))} label="+" />
          <ToolBtn onClick={centerOnTarget} label="⊙" />
        </div>
      </div>

      {/* Graph viewport */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          maxWidth: '100%',
          touchAction: 'none',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--hairline)',
          background: 'var(--bg-secondary)',
          minHeight: 250,
          cursor: isDragging.current ? 'grabbing' : 'grab',
        }}
      >
        <div style={{
          position: 'absolute',
          inset: 0,
          transform: `translate(${panX}px, ${panY}px) scale(${scale})`,
          transformOrigin: '0 0',
          width, height,
        }}>
          {/* SVG edge layer */}
          <svg
            width={width}
            height={height}
            style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}
          >
            <defs>
              <marker id="arrowhead" viewBox="0 0 10 7" refX="9" refY="3.5" markerWidth="7" markerHeight="5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="var(--fg-tertiary)" />
              </marker>
              <marker id="arrowhead-highlight" viewBox="0 0 10 7" refX="9" refY="3.5" markerWidth="7" markerHeight="5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="var(--accent)" />
              </marker>
            </defs>
            {edges.map(e => {
              const hl = highlightIds.has(e.from) && highlightIds.has(e.to);
              const offFrom = nodeOffsets[e.from] || { dx: 0, dy: 0 };
              const offTo = nodeOffsets[e.to] || { dx: 0, dy: 0 };
              return (
                <path
                  key={e.id}
                  d={bezierPath(e.x1 + offFrom.dx, e.y1 + offFrom.dy, e.x2 + offTo.dx, e.y2 + offTo.dy)}
                  fill="none"
                  stroke={hl ? 'var(--accent)' : 'var(--hairline)'}
                  strokeWidth={hl ? 2 : 1}
                  opacity={selectedId && !hl ? 0.15 : 0.7}
                  markerEnd={hl ? 'url(#arrowhead-highlight)' : 'url(#arrowhead)'}
                  style={{ transition: 'stroke 200ms, opacity 200ms, stroke-width 200ms' }}
                />
              );
            })}
          </svg>

          {/* HTML node layer */}
          {positioned.map(n => {
            const isSelected = n.id === selectedId;
            const isHighlighted = highlightIds.has(n.id);
            const opacity = selectedId && !isHighlighted ? 0.3 : 1;
            const eColor = ENTITY_COLORS[n.entityType] || ENTITY_COLORS.wallet;
            const off = nodeOffsets[n.id] || { dx: 0, dy: 0 };
            const nx = n.x + off.dx;
            const ny = n.y + off.dy;

            return (
              <div
                key={n.id}
                data-node-id={n.id}
                onClick={(e) => { e.stopPropagation(); setSelectedId(isSelected ? null : n.id); }}
                style={{
                  position: 'absolute',
                  left: nx,
                  top: ny,
                  width: dims.nodeW,
                  height: dims.nodeH,
                  borderRadius: 'var(--radius-lg)',
                  border: n.isTarget
                    ? '2px solid var(--accent)'
                    : isSelected
                      ? '2px solid var(--fg)'
                      : '1px solid var(--card-border)',
                  background: n.isTarget ? 'rgba(0,230,122,0.06)' : 'var(--card)',
                  boxShadow: isSelected ? '0 4px 20px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.12)',
                  cursor: 'pointer',
                  opacity,
                  transition: 'opacity 200ms, border-color 200ms, box-shadow 200ms',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  padding: isMobile ? '0 8px' : '0 10px 0 12px',
                  fontFamily: 'var(--font-mono)',
                  overflow: 'hidden',
                }}
                onMouseEnter={e => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = 'var(--fg-secondary)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.25)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = n.isTarget ? 'var(--accent)' : 'var(--card-border)';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)';
                  }
                }}
              >
                {/* Row 1: address + entity badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: n.isTarget ? 'var(--accent)' : eColor,
                  }} />
	                  <span style={{
	                    fontSize: isMobile ? 10 : 11, fontWeight: 600, color: n.isTarget ? 'var(--accent)' : 'var(--fg)',
                    flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {n.label}
                  </span>
                  {n.entityType && n.entityType !== 'wallet' && (
                    <span style={{
	                      fontSize: 8, fontWeight: 600, padding: isMobile ? '1px 4px' : '2px 5px', borderRadius: 'var(--radius-full)',
                      background: `${eColor}20`, color: eColor, textTransform: 'uppercase',
                      letterSpacing: '0.05em', fontFamily: 'var(--font-sans)', flexShrink: 0,
                    }}>
                      {n.entityType}
                    </span>
                  )}
                </div>

                {/* Row 2: value + tx count */}
	                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10, fontSize: isMobile ? 9 : 10, color: 'var(--fg-tertiary)' }}>
                  {n.value > 0 && (
                    <span style={{ color: 'var(--fg-secondary)' }}>
                      {n.value < 0.0001 ? '<0.0001' : n.value.toFixed(4)} {ticker}
                    </span>
                  )}
                  {n.txCount > 0 && <span>{n.txCount} tx{n.txCount !== 1 ? 's' : ''}</span>}
                  {n.suspiciousScore > 30 && (
                    <span style={{
                      color: 'var(--destructive)', fontSize: 9, fontWeight: 600,
                      background: 'rgba(255,69,58,0.1)', padding: '1px 5px', borderRadius: 'var(--radius-md)',
                    }}>
                      {n.suspiciousScore}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected node detail panel */}
      {selected && (
        <div style={{
          padding: '10px 14px', borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--hairline)', background: 'var(--card)',
          display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap',
          fontSize: 11, fontFamily: 'var(--font-mono)',
        }}>
          <span style={{ color: 'var(--fg)', fontWeight: 600 }}>
            {selected.address.slice(0, 12)}...{selected.address.slice(-8)}
          </span>
          {selected.entityType !== 'wallet' && (
            <span style={{
              padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: 9, fontWeight: 600,
              background: `${ENTITY_COLORS[selected.entityType] || '#666'}20`,
              color: ENTITY_COLORS[selected.entityType] || '#666',
              textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-sans)',
            }}>
              {selected.entityType}
            </span>
          )}
          {selected.value > 0 && (
            <span style={{ color: 'var(--accent)' }}>{selected.value < 0.0001 ? '<0.0001' : selected.value.toFixed(6)} {ticker}</span>
          )}
          <span style={{ color: 'var(--fg-tertiary)' }}>{selected.txCount} txs</span>
          <span style={{ color: 'var(--fg-tertiary)' }}>depth {selected.depth}</span>
          {selected.suspiciousScore > 30 && (
            <span style={{ color: 'var(--destructive)', background: 'rgba(255,69,58,0.1)', padding: '2px 6px', borderRadius: 'var(--radius-md)' }}>
              risk {selected.suspiciousScore}
            </span>
          )}
          {selected.isTarget && (
            <span style={{ color: 'var(--accent)', fontSize: 9, fontWeight: 600, fontFamily: 'var(--font-sans)' }}>
              TARGET
            </span>
          )}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', paddingTop: 2 }}>
        <LegendDot color="var(--accent)" label="Target" />
        {Object.entries(ENTITY_COLORS).map(([type, color]) => (
          <LegendDot key={type} color={color} label={type} />
        ))}
      </div>
    </div>
  );
}

function toggleBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: '5px 14px', borderRadius: 'var(--radius-md)', fontSize: 11, fontWeight: 500, cursor: 'pointer',
    border: active ? '1px solid var(--accent)' : '1px solid var(--hairline)',
    background: active ? 'rgba(0,230,122,0.08)' : 'var(--card)',
    color: active ? 'var(--accent)' : 'var(--fg-tertiary)',
    fontFamily: 'var(--font-sans)',
    transition: 'all 150ms',
  };
}

function ToolBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 28, height: 28, borderRadius: 'var(--radius-md)', border: '1px solid var(--hairline)',
        background: 'var(--card)', color: 'var(--fg-tertiary)', fontSize: 14, fontFamily: 'var(--font-mono)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onMouseEnter={e => { e.currentTarget.style.color = 'var(--fg)'; e.currentTarget.style.borderColor = 'var(--fg-secondary)'; }}
      onMouseLeave={e => { e.currentTarget.style.color = 'var(--fg-tertiary)'; e.currentTarget.style.borderColor = 'var(--hairline)'; }}
    >
      {label}
    </button>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block' }} />
      <span style={{ fontSize: 9, color: 'var(--fg-tertiary)', fontFamily: 'var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </span>
    </div>
  );
}
