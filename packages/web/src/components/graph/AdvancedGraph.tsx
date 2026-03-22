import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { useNotify } from '../../contexts/ToastContext';
import { CHAINS } from '@fundtracer/core';
import './AdvancedGraph.css';

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  address: string;
  label: string;
  type: 'wallet' | 'contract' | 'exchange' | 'mixer' | 'dao' | 'nft' | 'defi' | 'target' | 'oracle' | 'bridge';
  balance?: number;
  transactionCount?: number;
  totalVolume?: number;
  imageUrl?: string;
  entityLabel?: string;
  riskScore?: number;
  privacyScore?: number;
  firstTx?: number;
  lastTx?: number;
  gasUsed?: number;
  nftCount?: number;
  daoVotes?: number;
  defiPositions?: { protocol: string; amount: number; type: string; pool?: string; tvl?: number }[];
  isWhale?: boolean;
  isSuspicious?: boolean;
  suspiciousReason?: string;
  clusterId?: string;
  similarity?: number;
  socialLinks?: { platform: string; handle: string }[];
  x3d?: number;
  y3d?: number;
  z3d?: number;
}

interface GraphEdge {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  type: 'sent' | 'received' | 'swap' | 'call' | 'delegate' | 'bridge' | 'stake' | 'unstake' | 'mint' | 'burn' | 'claim';
  value: number;
  token?: string;
  timestamp?: number;
  txHash?: string;
  gasUsed?: number;
  method?: string;
  status?: 'success' | 'failed' | 'pending';
  blockNumber?: number;
  isFlashLoan?: boolean;
  isMEV?: boolean;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface Annotation {
  id: string;
  nodeId?: string;
  edgeId?: string;
  text: string;
  author: string;
  timestamp: number;
  color: string;
}

interface GraphSnapshot {
  id: string;
  name: string;
  timestamp: number;
  data: GraphData;
  annotations: Annotation[];
}

interface Filters {
  timeRange: [number, number];
  minValue: number;
  maxValue: number;
  tokenTypes: string[];
  txStatus: string[];
  hopLevels: number[];
  showWhales: boolean;
  showSuspicious: boolean;
  showDormant: boolean;
  minBalance: number;
  maxBalance: number;
}

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
  oracle: '#ebcb8b',
  bridge: '#a3be8c',
};

const Icon = ({ name, size = 20, className = '' }: { name: string; size?: number; className?: string }) => {
  const icons: Record<string, JSX.Element> = {
    search: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
    zoomIn: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6M8 11h6"/></svg>,
    zoomOut: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M8 11h6"/></svg>,
    maximize: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>,
    download: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>,
    chevronDown: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="m6 9 6 6 6-6"/></svg>,
    chevronUp: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="m18 15-6-6-6 6"/></svg>,
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
    lock: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    unlock: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>,
    message: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    share: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>,
    clock: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    calendar: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>,
    alert: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>,
    shield: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>,
    activity: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    trending: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    code: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
    sun: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>,
    moon: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
    layers: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
    zap: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    users: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    undo: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>,
    redo: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>,
    save: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
    cpu: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" x2="9" y1="1" y2="4"/><line x1="15" x2="15" y1="1" y2="4"/><line x1="9" x2="9" y1="20" y2="23"/><line x1="15" x2="15" y1="20" y2="23"/><line x1="20" x2="23" y1="9" y2="9"/><line x1="20" x2="23" y1="14" y2="14"/><line x1="1" x2="4" y1="9" y2="9"/><line x1="1" x2="4" y1="14" y2="14"/></svg>,
    brain: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M12 4.5a2.5 2.5 0 0 0-4.96-.46 2.5 2.5 0 0 0-1.98 3 2.5 2.5 0 0 0 1.32 4.24 3 3 0 0 0 .34 5.58 2.5 2.5 0 0 0 2.96 3.08A2.5 2.5 0 0 0 12 19.5a2.5 2.5 0 0 0 2.32.66 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0 1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 12 4.5"/><path d="m15.7 10.4-.9.4"/><path d="m9.2 13.2-.9.4"/><path d="m13.6 15.7-.4-.9"/><path d="m10.8 9.2-.4-.9"/><path d="m15.7 13.5-.9-.4"/><path d="m9.2 10.9-.9-.4"/><path d="m10.4 15.7.4-.9"/><path d="m13.1 9.2.4-.9"/></svg>,
    flame: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>,
    wifi: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" x2="12.01" y1="20" y2="20"/></svg>,
    wifiOff: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><line x1="1" x2="23" y1="1" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.58 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" x2="12.01" y1="20" y2="20"/></svg>,
    hash: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/></svg>,
    dollar: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    sliders: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="2" x2="6" y1="14" y2="14"/><line x1="10" x2="14" y1="8" y2="8"/><line x1="18" x2="22" y1="16" y2="16"/></svg>,
    fullscreen: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>,
    minimize: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>,
    keyboard: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><rect width="20" height="16" x="2" y="4" rx="2" ry="2"/><path d="M6 8h.001M10 8h.001M14 8h.001M18 8h.001M8 12h.001M12 12h.001M16 12h.001M7 16h10"/></svg>,
    microscope: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/></svg>,
    flask: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M9 3h6v8.5l4 5.5H5l4-5.5V3z"/><path d="M8 3h8"/></svg>,
    droplet: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/></svg>,
    rocket: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>,
    settings: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>,
    arrowUp: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>,
    arrowDown: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M12 5v14M19 12l-7 7-7-7"/></svg>,
    more: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>,
    link: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
    plus: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>,
    minus: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><line x1="5" x2="19" y1="12" y2="12"/></svg>,
    volume: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>,
    volumeOff: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" x2="17" y1="9" y2="15"/><line x1="17" x2="23" y1="9" y2="15"/></svg>,
    history: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>,
    image: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>,
  };
  return icons[name] || icons.search;
};

const AdvancedGraph: React.FC<{ targetAddress?: string; chain?: string; onClose?: () => void }> = ({ targetAddress, chain = 'ethereum', onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(null);
  const notify = useNotify();

  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'force' | 'radial' | 'tree' | 'grid'>('force');
  const [showLabels, setShowLabels] = useState(true);
  const [showMinimap, setShowMinimap] = useState(true);
  const [showParticleFlow, setShowParticleFlow] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [isStealth, setIsStealth] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredNodes, setFilteredNodes] = useState<Set<string>>(new Set());
  const [pinnedNodes, setPinnedNodes] = useState<Set<string>>(new Set());
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [snapshots, setSnapshots] = useState<GraphSnapshot[]>([]);
  const [undoStack, setUndoStack] = useState<GraphData[]>([]);
  const [redoStack, setRedoStack] = useState<GraphData[]>([]);
  const [activePanel, setActivePanel] = useState<'filters' | 'analytics' | 'timeline' | 'annotations' | 'defi' | 'history' | 'advanced' | 'query' | 'costbasis' | 'audit'>('filters');
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');
  const [presentationMode, setPresentationMode] = useState<'normal' | 'presentation'>('normal');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [viewAngle, setViewAngle] = useState({ x: -20, y: 45 });
  const [timeSliderValue, setTimeSliderValue] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);
  const [streamEnabled, setStreamEnabled] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [defiIntelligence, setDefiIntelligence] = useState<{
    dexPaths: { from: string; to: string; pools: string[]; volume: number }[];
    liquidityPools: { protocol: string; pool: string; tvl: number; apr: number }[];
    estimatedTaxLiability: number;
    mixerScore: number;
    mixingIndicators: { type: string; score: number }[];
  } | null>(null);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [queryBuilder, setQueryBuilder] = useState<{ field: string; operator: string; value: string }[]>([{ field: 'type', operator: 'equals', value: 'wallet' }]);
  const [queryOperator, setQueryOperator] = useState<'AND' | 'OR'>('AND');
  const [particleFlowEnabled, setParticleFlowEnabled] = useState(true);
  const [showHeatMap, setShowHeatMap] = useState(false);
  const [heatMapData, setHeatMapData] = useState<{ region: string; intensity: number }[]>([]);
  const [walletSimilarity, setWalletSimilarity] = useState<{ wallet: string; score: number; reason: string }[]>([]);
  const [ensLookup, setEnsLookup] = useState<Record<string, string>>({});
  const [costBasis, setCostBasis] = useState<{ method: 'FIFO' | 'LIFO' | 'HIFO'; gains: number; losses: number; lots: { amount: number; price: number; date: number }[] } | null>(null);
  const [monitoredWallets, setMonitoredWallets] = useState<string[]>([]);
  const [behavioralFingerprint, setBehavioralFingerprint] = useState<{ trait: string; score: number; description: string }[]>([]);
  const [teamWorkspace, setTeamWorkspace] = useState<{ users: { name: string; role: string; avatar: string }[]; sharedNotes: { author: string; text: string; timestamp: number }[] }>({ users: [], sharedNotes: [] });
  const [auditLog, setAuditLog] = useState<{ action: string; user: string; timestamp: number; details: string }[]>([]);
  const [methodFilters, setMethodFilters] = useState<Set<string>>(new Set(['transfer', 'swap', 'approve', 'mint', 'burn']));
  const [gasAnalysis, setGasAnalysis] = useState<{ avgGas: number; optimalTime: string; savings: number; recommendations: string[] } | null>(null);
  const [dormantAlerts, setDormantAlerts] = useState<{ wallet: string; lastActive: number; alert: string }[]>([]);
  const [whistleblowerModal, setWhistleblowerModal] = useState(false);
  const [whistleblowerReport, setWhistleblowerReport] = useState({ subject: '', evidence: '', contact: '' });
  const [encryptedExportPassword, setEncryptedExportPassword] = useState('');
  const [mevOpportunities, setMevOpportunities] = useState<{ type: string; profit: number; likelihood: number }[]>([]);
  const [showGeographicOverlay, setShowGeographicOverlay] = useState(false);

  const [filters, setFilters] = useState<Filters>({
    timeRange: [Date.now() - 30 * 24 * 60 * 60 * 1000, Date.now()],
    minValue: 0,
    maxValue: Infinity,
    tokenTypes: ['all'],
    txStatus: ['success'],
    hopLevels: [1, 2, 3, 4, 5],
    showWhales: true,
    showSuspicious: true,
    showDormant: false,
    minBalance: 0,
    maxBalance: Infinity,
  });

  const [aiAnalysis, setAiAnalysis] = useState<{
    anomalies: { nodeId: string; reason: string; confidence: number }[];
    patterns: { type: string; description: string; nodes: string[] }[];
    predictions: { wallet: string; likelyAction: string; confidence: number }[];
    narrative: string;
  } | null>(null);

  const ENTITY_LOGOS: Record<string, string> = {
    binance: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
    coinbase: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
    kraken: 'https://assets.coingecko.com/coins/images/4711/small/mark_eth.png',
    uniswap: 'https://assets.coingecko.com/coins/images/12504/small/uniswap-uni.png',
    compound: 'https://assets.coingecko.com/coins/images/10775/small/COMP.png',
    aave: 'https://assets.coingecko.com/coins/images/12645/small/AAVE.png',
    curve: 'https://assets.coingecko.com/coins/images/12124/small/Curve.png',
    balancer: 'https://assets.coingecko.com/coins/images/11683/small/Balancer.png',
    'lido-dao': 'https://assets.coingecko.com/coins/images/13573/small/Lido_DAO.png',
    'rocket-pool': 'https://assets.coingecko.com/coins/images/2090/small/rocket-pool.png',
  };

  useEffect(() => {
    return () => { if (simulationRef.current) simulationRef.current.stop(); };
  }, []);

  const generateMockData = useCallback((): GraphData => {
    const address = targetAddress || '0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1';
    const nodes: GraphNode[] = [{
      id: 'target', address, label: `${address.slice(0, 6)}...${address.slice(-4)}`,
      type: 'target', balance: 1.234, transactionCount: 847, totalVolume: 456.78,
      firstTx: Date.now() - 365 * 24 * 60 * 60 * 1000, lastTx: Date.now() - 2 * 60 * 60 * 1000,
      gasUsed: 1245000, riskScore: 15, privacyScore: 72, isWhale: true, clusterId: 'main',
    }];
    const edges: GraphEdge[] = [];

    const receivedData = [
      { label: 'Binance 8', type: 'exchange' as const, entity: 'binance', volume: 45.2, txs: 23 },
      { label: 'Coinbase 3', type: 'exchange' as const, entity: 'coinbase', volume: 12.8, txs: 8 },
      { label: '0x8a2...', type: 'wallet' as const, volume: 5.4, txs: 2 },
      { label: '0x3f9...', type: 'wallet' as const, volume: 3.2, txs: 1 },
      { label: '0x1c4...', type: 'mixer' as const, volume: 8.9, txs: 15 },
      { label: 'Uniswap V3', type: 'defi' as const, entity: 'uniswap', volume: 22.1, txs: 45 },
      { label: '0x7b2...', type: 'wallet' as const, volume: 1.2, txs: 1 },
      { label: '0x9d1...', type: 'contract' as const, volume: 6.7, txs: 12 },
      { label: 'Lido DAO', type: 'defi' as const, entity: 'lido-dao', volume: 18.4, txs: 6 },
      { label: 'Aave V3', type: 'defi' as const, entity: 'aave', volume: 9.3, txs: 4 },
      { label: 'Rocket Pool', type: 'defi' as const, entity: 'rocket-pool', volume: 4.5, txs: 2 },
      { label: '0xAb1...', type: 'nft' as const, volume: 2.1, txs: 8, nftCount: 15 },
      { label: 'Curve DAO', type: 'defi' as const, entity: 'curve', volume: 7.8, txs: 11 },
      { label: '0xDe2...', type: 'bridge' as const, volume: 15.6, txs: 3 },
      { label: 'DAO Maker', type: 'dao' as const, volume: 0.8, txs: 2, daoVotes: 5 },
    ];

    receivedData.forEach((w, i) => {
      const nodeId = `recv_${i}`;
      const isSuspicious = w.type === 'mixer';
      nodes.push({
        id: nodeId, address: `0x${Math.random().toString(16).slice(2, 42)}`,
        label: w.label, type: w.type, entityLabel: w.entity,
        imageUrl: w.entity ? ENTITY_LOGOS[w.entity] : undefined,
        balance: Math.random() * 10, transactionCount: w.txs, totalVolume: w.volume,
        riskScore: isSuspicious ? 85 : Math.floor(Math.random() * 30),
        privacyScore: isSuspicious ? 20 : Math.floor(Math.random() * 60 + 40),
        firstTx: Date.now() - Math.random() * 500 * 24 * 60 * 60 * 1000,
        lastTx: Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
        gasUsed: Math.floor(Math.random() * 500000), isSuspicious,
        suspiciousReason: isSuspicious ? 'High frequency from mixing service' : undefined,
        isWhale: w.volume > 10, clusterId: isSuspicious ? 'suspicious' : 'received',
        ...(w.nftCount && { nftCount: w.nftCount }),
        ...(w.daoVotes && { daoVotes: w.daoVotes }),
      });
      edges.push({
        id: `recv_edge_${i}`, source: nodeId, target: 'target', type: 'received',
        value: w.volume, token: 'ETH',
        timestamp: Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
        txHash: `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`,
        gasUsed: Math.floor(Math.random() * 100000) + 21000,
        status: Math.random() > 0.05 ? 'success' : 'failed',
        blockNumber: 18000000 + Math.floor(Math.random() * 1000000),
      });
    });

    const sentData = [
      { label: 'Kraken 2', type: 'exchange' as const, entity: 'kraken', volume: 28.4, txs: 12 },
      { label: '0x4a8...', type: 'wallet' as const, volume: 4.2, txs: 2 },
      { label: '0x2c9...', type: 'wallet' as const, volume: 2.8, txs: 1 },
      { label: 'Compound', type: 'defi' as const, entity: 'compound', volume: 15.0, txs: 8 },
      { label: '0x5f1...', type: 'wallet' as const, volume: 1.5, txs: 1 },
      { label: '0x8e3...', type: 'wallet' as const, volume: 3.9, txs: 3 },
      { label: '0x6d7...', type: 'contract' as const, volume: 5.2, txs: 6 },
      { label: '0x1a2...', type: 'nft' as const, volume: 8.5, txs: 4, nftCount: 3 },
      { label: 'Balancer', type: 'defi' as const, entity: 'balancer', volume: 11.3, txs: 5 },
      { label: '0xC4a...', type: 'oracle' as const, volume: 0.2, txs: 1 },
      { label: 'Across Bridge', type: 'bridge' as const, volume: 20.0, txs: 2 },
    ];

    sentData.forEach((w, i) => {
      const nodeId = `sent_${i}`;
      nodes.push({
        id: nodeId, address: `0x${Math.random().toString(16).slice(2, 42)}`,
        label: w.label, type: w.type, entityLabel: w.entity,
        imageUrl: w.entity ? ENTITY_LOGOS[w.entity] : undefined,
        balance: Math.random() * 5, transactionCount: w.txs, totalVolume: w.volume,
        riskScore: Math.floor(Math.random() * 25), privacyScore: Math.floor(Math.random() * 50 + 50),
        firstTx: Date.now() - Math.random() * 400 * 24 * 60 * 60 * 1000,
        lastTx: Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000,
        isWhale: w.volume > 8, clusterId: 'sent',
        ...(w.nftCount && { nftCount: w.nftCount }),
      });
      edges.push({
        id: `sent_edge_${i}`, source: 'target', target: nodeId, type: 'sent',
        value: w.volume, token: 'ETH',
        timestamp: Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
        txHash: `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`,
        gasUsed: Math.floor(Math.random() * 100000) + 21000, status: 'success',
        blockNumber: 18000000 + Math.floor(Math.random() * 1000000),
      });
    });

    const swapData = [
      { label: 'Uniswap Router', type: 'defi' as const, entity: 'uniswap' },
      { label: 'SushiSwap', type: 'defi' as const },
      { label: '1inch', type: 'defi' as const },
    ];

    swapData.forEach((w, i) => {
      const nodeId = `swap_${i}`;
      nodes.push({
        id: nodeId, address: `0x${Math.random().toString(16).slice(2, 42)}`,
        label: w.label, type: 'defi', entityLabel: w.entity,
        imageUrl: w.entity ? ENTITY_LOGOS[w.entity] : undefined,
        balance: 0, transactionCount: Math.floor(Math.random() * 1000) + 100,
        totalVolume: Math.random() * 100, riskScore: 10, privacyScore: 65, clusterId: 'defi',
      });
      edges.push({
        id: `swap_edge_${i}`, source: 'target', target: nodeId, type: 'swap',
        value: Math.random() * 5, token: 'USDC',
        timestamp: Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000,
        txHash: `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`,
        status: 'success', isFlashLoan: Math.random() > 0.8,
      });
    });

    const secondaryNodes = [
      { label: '0x9c8...', type: 'wallet' as const, hops: 2 },
      { label: '0x3b7...', type: 'wallet' as const, hops: 2 },
      { label: 'Tornado Cash', type: 'mixer' as const, hops: 3 },
      { label: 'DAO Maker', type: 'dao' as const, hops: 2 },
      { label: '0x8a1...', type: 'wallet' as const, hops: 2 },
      { label: '0xF2a...', type: 'exchange' as const, entity: 'binance', hops: 3 },
      { label: 'Gitcoin Grants', type: 'dao' as const, hops: 2 },
      { label: '0x1D2...', type: 'nft' as const, hops: 3, nftCount: 42 },
    ];

    secondaryNodes.forEach((w, i) => {
      const nodeId = `sec_${i}`;
      const isSuspicious = w.type === 'mixer';
      nodes.push({
        id: nodeId, address: `0x${Math.random().toString(16).slice(2, 42)}`,
        label: w.label, type: w.type, entityLabel: w.entity,
        imageUrl: w.entity ? ENTITY_LOGOS[w.entity] : undefined,
        balance: Math.random() * 2, transactionCount: Math.floor(Math.random() * 100),
        totalVolume: Math.random() * 20,
        riskScore: isSuspicious ? 92 : Math.floor(Math.random() * 20),
        privacyScore: isSuspicious ? 5 : Math.floor(Math.random() * 40 + 60),
        firstTx: Date.now() - Math.random() * 600 * 24 * 60 * 60 * 1000,
        isSuspicious: isSuspicious, isWhale: Math.random() > 0.7,
        clusterId: isSuspicious ? 'suspicious' : 'secondary',
        ...(w.nftCount && { nftCount: w.nftCount }),
      });
      const parentId = Math.random() > 0.5
        ? (Math.random() > 0.5 ? `recv_${Math.floor(Math.random() * 5)}` : `sent_${Math.floor(Math.random() * 5)}`)
        : `swap_${Math.floor(Math.random() * 3)}`;
      edges.push({
        id: `sec_edge_${i}`, source: parentId, target: nodeId,
        type: Math.random() > 0.5 ? 'sent' : Math.random() > 0.5 ? 'call' : 'stake',
        value: Math.random() * 10,
        timestamp: Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000,
        txHash: `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`,
        status: Math.random() > 0.1 ? 'success' : 'failed', isMEV: Math.random() > 0.9,
      });
    });

    return { nodes, edges };
  }, [targetAddress]);

  const performAIAnalysis = useCallback((data: GraphData) => {
    const anomalies: { nodeId: string; reason: string; confidence: number }[] = [];
    const patterns: { type: string; description: string; nodes: string[] }[] = [];
    const predictions: { wallet: string; likelyAction: string; confidence: number }[] = [];

    data.nodes.forEach(node => {
      if (node.type === 'mixer' && node.totalVolume && node.totalVolume > 5) {
        anomalies.push({ nodeId: node.id, reason: 'High-volume mixer interaction detected', confidence: 0.95 });
      }
      if (node.transactionCount && node.transactionCount > 100 && node.totalVolume && node.totalVolume < 1) {
        anomalies.push({ nodeId: node.id, reason: 'High tx count with low volume - potential sybil', confidence: 0.78 });
      }
      if (node.riskScore && node.riskScore > 70) {
        anomalies.push({ nodeId: node.id, reason: 'High risk score detected', confidence: node.riskScore / 100 });
      }
    });

    const mixerNodes = data.nodes.filter(n => n.type === 'mixer');
    if (mixerNodes.length > 0) {
      patterns.push({ type: 'Money Laundering', description: 'Detected fund flow through mixing services', nodes: mixerNodes.map(n => n.id) });
    }

    const exchangeNodes = data.nodes.filter(n => n.type === 'exchange');
    const defiNodes = data.nodes.filter(n => n.type === 'defi');
    if (exchangeNodes.length > 2 && defiNodes.length > 2) {
      patterns.push({ type: 'DeFi Arbitrage', description: 'Multi-protocol interaction pattern detected', nodes: [...exchangeNodes, ...defiNodes].map(n => n.id) });
    }

    data.nodes.filter(n => n.type === 'wallet' && n.isWhale).forEach(whale => {
      predictions.push({ wallet: whale.id, likelyAction: 'Large transfer to exchange expected within 7 days', confidence: 0.72 });
    });

    const narrative = `Based on analysis of ${data.nodes.length} wallets and ${data.edges.length} transactions:\n\n1. **Primary Activity**: The target wallet shows ${exchangeNodes.length} exchange interactions with a total volume of ${data.nodes.reduce((sum, n) => sum + (n.totalVolume || 0), 0).toFixed(2)} ETH.\n\n2. **Suspicious Patterns**: ${anomalies.length} anomalies detected, including ${anomalies.filter(a => a.reason.includes('mixer')).length} mixer-related activities.\n\n3. **DeFi Usage**: Active usage across ${defiNodes.length} DeFi protocols suggests sophisticated trading strategies.\n\n4. **Risk Assessment**: Overall privacy score of ${data.nodes.find(n => n.id === 'target')?.privacyScore || 'N/A'}/100 indicates ${(data.nodes.find(n => n.id === 'target')?.privacyScore || 0) > 50 ? 'moderate' : 'low'} privacy practices.\n\n5. **Recommendations**: ${anomalies.length > 0 ? 'Investigate flagged wallets for compliance review.' : 'No immediate concerns detected.'}`;

    return { anomalies, patterns, predictions, narrative };
  }, []);

  const renderGraph = useCallback(() => {
    if (!svgRef.current || !containerRef.current || graphData.nodes.length === 0) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height).attr('viewBox', [0, 0, width, height]);

    const defs = svg.append('defs');

    const glowFilter = defs.append('filter').attr('id', 'glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    glowFilter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const glowMerge = glowFilter.append('feMerge');
    glowMerge.append('feMergeNode').attr('in', 'coloredBlur');
    glowMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const markerSent = defs.append('marker').attr('id', 'arrow-sent').attr('viewBox', '0 -5 10 10').attr('refX', 42).attr('refY', 0).attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto');
    markerSent.append('path').attr('fill', themeMode === 'dark' ? '#81a1c1' : '#3b82f6').attr('d', 'M0,-5L10,0L0,5');

    const markerReceived = defs.append('marker').attr('id', 'arrow-received').attr('viewBox', '0 -5 10 10').attr('refX', 42).attr('refY', 0).attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto');
    markerReceived.append('path').attr('fill', themeMode === 'dark' ? '#88c0d0' : '#06b6d4').attr('d', 'M0,-5L10,0L0,5');

    const g = svg.append('g');
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.05, 10]).on('zoom', (event) => {
      g.attr('transform', event.transform);
      setZoom(event.transform.k);
    });
    svg.call(zoomBehavior);

    let filteredEdges = graphData.edges.filter(edge => {
      const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
      if (filteredNodes.size > 0 && !filteredNodes.has(sourceId) && !filteredNodes.has(targetId)) return false;
      if (edge.value < filters.minValue) return false;
      if (filters.maxValue !== Infinity && edge.value > filters.maxValue) return false;
      if (edge.timestamp && (edge.timestamp < filters.timeRange[0] || edge.timestamp > filters.timeRange[1])) return false;
      if (filters.txStatus.length > 0 && !filters.txStatus.includes(edge.status || 'success')) return false;
      return true;
    });

    const filteredNodeIds = new Set(['target', ...filteredEdges.map(e => typeof e.source === 'string' ? e.source : e.source.id), ...filteredEdges.map(e => typeof e.target === 'string' ? e.target : e.target.id)]);
    const filteredNodesList = graphData.nodes.filter(node => {
      if (node.id === 'target') return true;
      if (!filteredNodeIds.has(node.id)) return false;
      if (!filters.showSuspicious && node.isSuspicious) return false;
      if (!filters.showWhales && node.isWhale) return false;
      if (filters.minBalance > 0 && (node.balance || 0) < filters.minBalance) return false;
      return true;
    });

    let simulation;
    if (layoutMode === 'force') {
      simulation = d3.forceSimulation<GraphNode>(filteredNodesList)
        .force('link', d3.forceLink<GraphNode, GraphEdge>(filteredEdges).id(d => d.id).distance(d => 150 - ((d.target as GraphNode).type === 'target' ? 50 : 0)).strength(0.5))
        .force('charge', d3.forceManyBody<GraphNode>().strength(d => (d as GraphNode).type === 'target' ? -800 : -400))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(60))
        .force('x', d3.forceX(width / 2).strength(0.05))
        .force('y', d3.forceY(height / 2).strength(0.05))
        .alphaDecay(0.02);
    } else if (layoutMode === 'radial') {
      simulation = d3.forceSimulation<GraphNode>(filteredNodesList)
        .force('link', d3.forceLink<GraphNode, GraphEdge>(filteredEdges).id(d => d.id).distance(200).strength(0.3))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('collision', d3.forceCollide().radius(50))
        .force('r', d3.forceRadial<GraphNode>(d => (d as GraphNode).id === 'target' ? 0 : 150 + filteredNodesList.indexOf(d) * 20, width / 2, height / 2).strength(0.8))
        .alphaDecay(0.05);
    } else if (layoutMode === 'tree') {
      simulation = d3.forceSimulation<GraphNode>(filteredNodesList)
        .force('link', d3.forceLink<GraphNode, GraphEdge>(filteredEdges).id(d => d.id).distance(100).strength(0.9))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, 50))
        .force('collision', d3.forceCollide().radius(40))
        .force('y', d3.forceY((d: GraphNode) => {
          const hopLevel = d.id === 'target' ? 0 : d.id.includes('recv') ? 1 : d.id.includes('sent') ? 2 : 3;
          return 100 + hopLevel * 150;
        }).strength(0.9))
        .alphaDecay(0.05);
    } else {
      const gridSize = Math.ceil(Math.sqrt(filteredNodesList.length));
      simulation = d3.forceSimulation<GraphNode>(filteredNodesList)
        .force('link', d3.forceLink<GraphNode, GraphEdge>(filteredEdges).id(d => d.id).distance(80).strength(0.2))
        .force('charge', d3.forceManyBody().strength(-100))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(35))
        .force('x', d3.forceX((d: GraphNode, i: number) => (i % gridSize) * 80 + 50).strength(0.8))
        .force('y', d3.forceY((d: GraphNode, i: number) => Math.floor(i / gridSize) * 80 + 50).strength(0.8))
        .alphaDecay(0.1);
    }

    simulationRef.current = simulation;
    const linkGroup = g.append('g').attr('class', 'links');
    const nodeGroup = g.append('g').attr('class', 'nodes');
    const labelGroup = g.append('g').attr('class', 'labels');
    const particleGroup = g.append('g').attr('class', 'particles');

    const links = linkGroup.selectAll('line')
      .data(filteredEdges).enter().append('line')
      .attr('class', d => `edge edge-${d.type} ${d.isMEV ? 'edge-mev' : ''} ${d.isFlashLoan ? 'edge-flash' : ''}`)
      .attr('stroke', d => themeMode === 'dark' ? (d.type === 'sent' ? '#81a1c1' : d.type === 'received' ? '#88c0d0' : d.type === 'swap' ? '#a3be8c' : '#b48ead') : (d.type === 'sent' ? '#3b82f6' : d.type === 'received' ? '#06b6d4' : d.type === 'swap' ? '#10b981' : '#ec4899'))
      .attr('stroke-width', d => Math.max(1, Math.sqrt(d.value) * 0.8))
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', d => d.type === 'sent' ? 'url(#arrow-sent)' : d.type === 'received' ? 'url(#arrow-received)' : null)
      .attr('stroke-dasharray', d => d.type === 'swap' ? '5,5' : d.type === 'call' ? '2,2' : null);

    const nodeRadius = 40;
    const nodes = nodeGroup.selectAll('.node-group')
      .data(filteredNodesList).enter().append('g')
      .attr('class', d => `node-group ${d.isSuspicious ? 'node-suspicious' : ''} ${d.isWhale ? 'node-whale' : ''}`)
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
          d.fx = event.x; 
          d.fy = event.y; 
        }) as any);

    nodes.append('circle')
      .attr('class', d => `node-circle node-${d.type} ${d.type === 'target' ? 'node-target' : ''}`)
      .attr('r', d => d.type === 'target' ? nodeRadius * 1.2 : nodeRadius)
      .attr('fill', d => {
        if (d.isSuspicious) return NODE_COLORS.suspicious;
        return NODE_COLORS[d.type] || NODE_COLORS.wallet;
      })
      .attr('stroke', d => {
        if (d.type === 'target') return themeMode === 'dark' ? '#81a1c1' : '#3b82f6';
        if (pinnedNodes.has(d.id)) return '#fbbf24';
        if (watchlist.has(d.id)) return '#f59e0b';
        return themeMode === 'dark' ? '#1a1d28' : '#e5e7eb';
      })
      .attr('stroke-width', d => d.type === 'target' ? 4 : pinnedNodes.has(d.id) || watchlist.has(d.id) ? 3 : 2)
      .attr('filter', d => d.type === 'target' || d.isSuspicious ? 'url(#glow)' : null);

    nodes.filter((d): d is GraphNode & { imageUrl: string } => Boolean(d.imageUrl))
      .append('clipPath').attr('id', d => `clip-${d.id.replace(/[^a-zA-Z0-9]/g, '')}`)
      .append('circle').attr('r', nodeRadius - 4);

    nodes.filter((d): d is GraphNode & { imageUrl: string } => Boolean(d.imageUrl))
      .append('image').attr('href', (d) => d.imageUrl || '')
      .attr('x', -nodeRadius + 4).attr('y', -nodeRadius + 4)
      .attr('width', (nodeRadius - 4) * 2).attr('height', (nodeRadius - 4) * 2)
      .attr('clip-path', d => `url(#clip-${d.id.replace(/[^a-zA-Z0-9]/g, '')})`);

    nodes.filter((d): d is GraphNode => !d.imageUrl)
      .append('text').attr('class', 'node-text')
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .attr('fill', themeMode === 'dark' ? '#eceff4' : '#1f2937')
      .attr('font-size', d => d.type === 'target' ? '12px' : '10px')
      .attr('font-weight', d => d.type === 'target' ? 'bold' : 'normal')
      .attr('pointer-events', 'none')
      .text(d => d.label);

    nodes.append('text').attr('class', 'node-type-badge')
      .attr('text-anchor', 'middle').attr('y', nodeRadius + 14)
      .attr('fill', themeMode === 'dark' ? '#9ca3af' : '#6b7280')
      .attr('font-size', '9px')
      .attr('opacity', d => d.type === 'target' || d.isSuspicious ? 1 : 0.7)
      .text(d => d.isSuspicious ? 'SUSPICIOUS' : d.type.toUpperCase());

    nodes.filter((d): d is GraphNode => Boolean(d.isWhale)).append('text').attr('class', 'whale-badge')
      .attr('x', nodeRadius - 5).attr('y', -nodeRadius + 5)
      .attr('text-anchor', 'middle').attr('fill', '#fbbf24').attr('font-size', '12px').text('🐋');

    nodes.filter((d): d is GraphNode => Boolean(d.isSuspicious)).append('text').attr('class', 'suspicious-badge')
      .attr('x', -nodeRadius + 5).attr('y', -nodeRadius + 5)
      .attr('text-anchor', 'middle').attr('fill', '#ef4444').attr('font-size', '14px').text('⚠');

    nodes.on('click', (event, d) => { event.stopPropagation(); setSelectedNode(d); });

    nodes.on('mouseenter', (event, d) => {
      d3.select(event.currentTarget).select('circle').transition().duration(200)
        .attr('stroke', '#fbbf24').attr('stroke-width', 4);
      links.transition().duration(200).attr('stroke-opacity', l => {
        const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
        const targetId = typeof l.target === 'string' ? l.target : l.target.id;
        return (sourceId === d.id || targetId === d.id) ? 1 : 0.2;
      });
    });

    nodes.on('mouseleave', (event, d) => {
      if (selectedNode?.id !== d.id) {
        d3.select(event.currentTarget).select('circle').transition().duration(200)
          .attr('stroke', d.type === 'target' ? (themeMode === 'dark' ? '#81a1c1' : '#3b82f6') : pinnedNodes.has(d.id) ? '#fbbf24' : watchlist.has(d.id) ? '#f59e0b' : (themeMode === 'dark' ? '#1a1d28' : '#e5e7eb'))
          .attr('stroke-width', d.type === 'target' ? 4 : pinnedNodes.has(d.id) || watchlist.has(d.id) ? 3 : 2);
      }
      links.transition().duration(200).attr('stroke-opacity', 0.6);
    });

    nodes.on('dblclick', (event, d) => { event.stopPropagation(); handleTogglePin(d.id); });

    const labels = labelGroup.selectAll('text').data(filteredNodesList).enter().append('text')
      .attr('class', 'node-label').attr('text-anchor', 'middle')
      .attr('fill', themeMode === 'dark' ? '#d8dee9' : '#374151')
      .attr('font-size', '10px')
      .attr('opacity', showLabels ? (d: GraphNode) => d.type === 'target' || d.isSuspicious ? 1 : 0.5 : 0)
      .text(d => d.entityLabel || d.address.slice(0, 8) + '...');

    if (showHeatMap && heatMapData.length > 0) {
      const heatGroup = g.append('g').attr('class', 'heatmap-overlay');
      heatMapData.forEach((h, i) => {
        const x = (i % 10) * (width / 10) + Math.random() * 50;
        const y = Math.floor(i / 10) * (height / 10) + Math.random() * 50;
        heatGroup.append('circle')
          .attr('cx', x).attr('cy', y).attr('r', 30 + h.intensity * 20)
          .attr('fill', `rgba(255, 0, 0, ${h.intensity * 0.3})`)
          .attr('class', 'heat-region');
      });
    }

    const particles: { x: number; y: number; progress: number; edgeId: string }[] = [];
    let particleIndex = 0;

    simulation.on('tick', () => {
      links.attr('x1', d => (d.source as GraphNode).x || 0).attr('y1', d => (d.source as GraphNode).y || 0)
        .attr('x2', d => (d.target as GraphNode).x || 0).attr('y2', d => (d.target as GraphNode).y || 0);
      nodes.attr('transform', d => {
        const x = d.x || 0;
        const y = d.y || 0;
        if (viewMode === '3d') {
          const z = (d as any).z3d || 0;
          return `translate3d(${x}px, ${y}px, ${z}px)`;
        }
        return `translate(${x}, ${y})`;
      });
      labels.attr('x', d => d.x || 0).attr('y', d => (d.y || 0) + nodeRadius + 25);
    });

    svg.on('click', () => setSelectedNode(null));

  }, [graphData, filteredNodes, filters, showLabels, pinnedNodes, watchlist, themeMode, layoutMode, viewMode, viewAngle]);

  const handleGenerate = useCallback(() => {
    setIsLoading(true);
    setUndoStack(prev => [...prev, graphData]);
    setRedoStack([]);
    setTimeout(() => {
      const data = generateMockData();
      setGraphData(data);
      setFilteredNodes(new Set());
      setIsGenerated(true);
      setIsLoading(false);
      const ai = performAIAnalysis(data);
      setAiAnalysis(ai);
      notify.success(`Graph generated with ${data.nodes.length} nodes and ${data.edges.length} connections`);
    }, 800);
  }, [generateMockData, performAIAnalysis, notify, graphData]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prevState = undoStack[undoStack.length - 1];
    setRedoStack(prev => [...prev, graphData]);
    setUndoStack(prev => prev.slice(0, -1));
    setGraphData(prevState);
  }, [undoStack, graphData]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const nextState = redoStack[redoStack.length - 1];
    setUndoStack(prev => [...prev, graphData]);
    setRedoStack(prev => prev.slice(0, -1));
    setGraphData(nextState);
  }, [redoStack, graphData]);

  const handleSaveSnapshot = useCallback(() => {
    const snapshot: GraphSnapshot = { id: `snapshot_${Date.now()}`, name: `Snapshot ${snapshots.length + 1}`, timestamp: Date.now(), data: graphData, annotations };
    setSnapshots(prev => [...prev, snapshot]);
    notify.success('Snapshot saved!');
  }, [graphData, annotations, snapshots.length, notify]);

  const handleAddAnnotation = useCallback((nodeId: string, text: string) => {
    const annotation: Annotation = { id: `ann_${Date.now()}`, nodeId, text, author: 'You', timestamp: Date.now(), color: '#fbbf24' };
    setAnnotations(prev => [...prev, annotation]);
    notify.success('Annotation added');
  }, [notify]);

  const handleNaturalLanguageSearch = useCallback((query: string) => {
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes('suspicious') || lowerQuery.includes('scam')) {
      const nodes = new Set(graphData.nodes.filter(n => n.isSuspicious).map(n => n.id));
      setFilteredNodes(nodes);
      notify.info(`Found ${nodes.size} suspicious nodes`);
    } else if (lowerQuery.includes('whale') || lowerQuery.includes('large')) {
      const nodes = new Set(graphData.nodes.filter(n => n.isWhale).map(n => n.id));
      setFilteredNodes(nodes);
      notify.info(`Found ${nodes.size} whale wallets`);
    } else if (lowerQuery.includes('exchange') || lowerQuery.includes('cex')) {
      const nodes = new Set(graphData.nodes.filter(n => n.type === 'exchange').map(n => n.id));
      setFilteredNodes(nodes);
      notify.info(`Found ${nodes.size} exchange nodes`);
    } else if (lowerQuery.includes('defi')) {
      const nodes = new Set(graphData.nodes.filter(n => n.type === 'defi').map(n => n.id));
      setFilteredNodes(nodes);
      notify.info(`Found ${nodes.size} DeFi nodes`);
    } else if (lowerQuery.includes('mixer')) {
      const nodes = new Set(graphData.nodes.filter(n => n.type === 'mixer').map(n => n.id));
      setFilteredNodes(nodes);
      notify.info(`Found ${nodes.size} mixer-related nodes`);
    } else if (lowerQuery.includes('all') || lowerQuery.includes('clear')) {
      setFilteredNodes(new Set());
      notify.info('Showing all nodes');
    } else {
      const q = query.toLowerCase();
      const matches = new Set(graphData.nodes.filter(n => n.label.toLowerCase().includes(q) || n.address.toLowerCase().includes(q) || (n.entityLabel && n.entityLabel.toLowerCase().includes(q))).map(n => n.id));
      setFilteredNodes(matches);
      notify.info(`Found ${matches.size} matching nodes`);
    }
  }, [graphData, notify]);

  useEffect(() => { if (isGenerated && graphData.nodes.length > 0) renderGraph(); }, [isGenerated, renderGraph]);
  useEffect(() => {
    const handleResize = () => { if (isGenerated) renderGraph(); };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isGenerated, renderGraph]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && timeSliderValue < 100) {
      interval = setInterval(() => {
        setTimeSliderValue(prev => {
          if (prev >= 100) { setIsPlaying(false); return 100; }
          return prev + 1;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, timeSliderValue]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (streamEnabled && isGenerated) {
      interval = setInterval(() => {
        setLastUpdate(new Date());
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [streamEnabled, isGenerated]);

  useEffect(() => {
    if (isGenerated && graphData.nodes.length > 0) {
      const mixerNodes = graphData.nodes.filter(n => n.type === 'mixer');
      const mixerScore = mixerNodes.length > 0 ? Math.min(100, mixerNodes.reduce((sum, n) => sum + (n.totalVolume || 0) * 10, 0)) : 0;
      const defiNodes = graphData.nodes.filter(n => n.type === 'defi');
      const dexPaths: { from: string; to: string; pools: string[]; volume: number }[] = defiNodes.slice(0, 3).map((n, i) => ({
        from: ['ETH', 'USDC', 'WBTC'][i % 3],
        to: ['USDT', 'DAI', 'LINK'][i % 3],
        pools: [n.entityLabel || n.label, 'Uniswap V3', 'SushiSwap'][i % 3] ? [[n.entityLabel || n.label, 'Uniswap V3', 'SushiSwap'][i]] : [],
        volume: Math.random() * 100 + 10,
      }));
      const liquidityPools: { protocol: string; pool: string; tvl: number; apr: number }[] = defiNodes.slice(0, 5).map(n => ({
        protocol: n.entityLabel || n.label,
        pool: `${['ETH/USDC', 'WBTC/ETH', 'DAI/USDT'][Math.floor(Math.random() * 3)]}`,
        tvl: Math.random() * 1000000 + 100000,
        apr: Math.random() * 50 + 5,
      }));
      const estimatedTaxLiability = graphData.edges.reduce((sum, e) => sum + (e.type === 'sent' ? e.value * 0.2 : 0), 0);
      const mixingIndicators = [
        { type: 'Rapid splitting', score: Math.floor(Math.random() * 30 + 70) },
        { type: 'Round number amounts', score: Math.floor(Math.random() * 20 + 50) },
        { type: 'Timing patterns', score: Math.floor(Math.random() * 40 + 40) },
        { type: 'Cross-chain bridges', score: mixerNodes.length > 0 ? 85 : 20 },
      ];
      setDefiIntelligence({ dexPaths, liquidityPools, estimatedTaxLiability, mixerScore, mixingIndicators });
    }
  }, [isGenerated, graphData]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;
      if (modKey && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      if (modKey && e.key === 'z' && e.shiftKey) { e.preventDefault(); handleRedo(); }
      if (e.key === 'Escape') { setSelectedNode(null); setShowKeyboardHelp(false); }
      if (e.key === 'l' || e.key === 'L') setShowLabels(!showLabels);
      if (e.key === 'p' || e.key === 'P') setShowParticleFlow(!showParticleFlow);
      if (e.key === ' ') { e.preventDefault(); setIsPaused(!isPaused); }
      if (e.key === 'f' || e.key === 'F') { (document.querySelector('.search-box input') as HTMLInputElement)?.focus(); }
      if (modKey && e.key === 's') { e.preventDefault(); handleSaveSnapshot(); }
      if (modKey && e.key === 'r') { e.preventDefault(); handleGenerate(); }
      if (e.key === '3') setViewMode(m => m === '2d' ? '3d' : '2d');
      if (e.key === '?' || (modKey && e.key === '/')) { e.preventDefault(); setShowKeyboardHelp(v => !v); }
      if (e.key === 'w' || e.key === 'W') setStreamEnabled(v => !v);
      if (e.key === 'n' || e.key === 'N') setShowMinimap(v => !v);
      if (e.key === 't' || e.key === 'T') setActivePanel(p => p === 'timeline' ? 'filters' : 'timeline');
      if (e.key === 'ArrowLeft') setViewAngle(a => ({ ...a, x: a.x - 5 }));
      if (e.key === 'ArrowRight') setViewAngle(a => ({ ...a, x: a.x + 5 }));
      if (e.key === 'ArrowUp') setViewAngle(a => ({ ...a, y: Math.max(0, a.y - 5) }));
      if (e.key === 'ArrowDown') setViewAngle(a => ({ ...a, y: Math.min(90, a.y + 5) }));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleSaveSnapshot, handleGenerate, showLabels, showParticleFlow, isPaused]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query.trim()) { setFilteredNodes(new Set()); return; }
    const q = query.toLowerCase();
    const matches = new Set(graphData.nodes.filter(n => n.label.toLowerCase().includes(q) || n.address.toLowerCase().includes(q) || (n.entityLabel && n.entityLabel.toLowerCase().includes(q))).map(n => n.id));
    setFilteredNodes(matches);
  }, [graphData]);

  const handleCopyAddress = useCallback((address: string) => { navigator.clipboard.writeText(address); notify.success('Address copied!'); }, [notify]);
  const handleTogglePin = useCallback((nodeId: string) => { setPinnedNodes(prev => { const next = new Set(prev); next.has(nodeId) ? next.delete(nodeId) : next.add(nodeId); return next; }); }, []);
  const handleToggleWatchlist = useCallback((nodeId: string) => { setWatchlist(prev => { const next = new Set(prev); next.has(nodeId) ? next.delete(nodeId) : next.add(nodeId); return next; }); }, []);

  const handleZoomIn = useCallback(() => { if (svgRef.current) d3.select(svgRef.current).transition().duration(300).call(d3.zoom<SVGSVGElement, unknown>().scaleBy as any, 1.3); }, []);
  const handleZoomOut = useCallback(() => { if (svgRef.current) d3.select(svgRef.current).transition().duration(300).call(d3.zoom<SVGSVGElement, unknown>().scaleBy as any, 0.7); }, []);
  const handleFit = useCallback(() => { if (svgRef.current) d3.select(svgRef.current).transition().duration(500).call(d3.zoom<SVGSVGElement, unknown>().transform as any, d3.zoomIdentity); }, []);

  const handleExportPNG = useCallback(() => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    canvas.width = containerRef.current?.clientWidth || 1200;
    canvas.height = containerRef.current?.clientHeight || 800;
    img.onload = () => { ctx?.drawImage(img, 0, 0); const link = document.createElement('a'); link.download = `fundtracer-graph-${Date.now()}.png`; link.href = canvas.toDataURL('image/png'); link.click(); notify.success('Graph exported as PNG'); };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }, [notify]);

  const handleExportSVG = useCallback(() => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `fundtracer-graph-${Date.now()}.svg`; link.href = url; link.click();
    notify.success('Graph exported as SVG');
  }, [notify]);

  const handleExportCSV = useCallback(() => {
    const rows = graphData.nodes.map(n => [n.id, n.address, n.label, n.type, n.entityLabel || '', n.balance?.toString() || '', n.transactionCount?.toString() || '', n.totalVolume?.toString() || '', n.riskScore?.toString() || '', n.isSuspicious ? 'Yes' : 'No', n.isWhale ? 'Yes' : 'No']);
    const csv = ['ID,Address,Label,Type,Entity,Balance,Tx Count,Volume,Risk Score,Suspicious,Whale'].concat(rows.map(r => r.join(','))).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a'); link.download = `fundtracer-nodes-${Date.now()}.csv`; link.href = URL.createObjectURL(blob); link.click();
    notify.success('Nodes exported as CSV');
  }, [graphData.nodes, notify]);

  const handleExportJSON = useCallback(() => {
    const data = { exportedAt: new Date().toISOString(), targetAddress, chain, nodes: graphData.nodes, edges: graphData.edges.map(e => ({ ...e, source: typeof e.source === 'string' ? e.source : e.source.id, target: typeof e.target === 'string' ? e.target : e.target.id })), annotations, aiAnalysis };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a'); link.download = `fundtracer-investigation-${Date.now()}.json`; link.href = URL.createObjectURL(blob); link.click();
    notify.success('Investigation exported as JSON');
  }, [graphData, annotations, aiAnalysis, targetAddress, chain, notify]);

  const handleExportGEXF = useCallback(() => {
    const gexfHeader = `<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://www.gexf.net/1.3" version="1.3">
  <graph mode="static" defaultedgetype="directed">
    <attributes class="node">
      <attribute id="0" title="type" type="string"/>
      <attribute id="1" title="balance" type="float"/>
      <attribute id="2" title="riskScore" type="integer"/>
    </attributes>
    <nodes>`;
    const gexfNodes = graphData.nodes.map(n => `      <node id="${n.id}" label="${n.label}">
        <attvalues>
          <attvalue for="0" value="${n.type}"/>
          <attvalue for="1" value="${n.balance || 0}"/>
          <attvalue for="2" value="${n.riskScore || 0}"/>
        </attvalues>
      </node>`).join('\n');
    const gexfEdges = graphData.edges.map((e, i) => {
      const source = typeof e.source === 'string' ? e.source : e.source.id;
      const target = typeof e.target === 'string' ? e.target : e.target.id;
      return `      <edge id="${i}" source="${source}" target="${target}" weight="${e.value}"/>`;
    }).join('\n');
    const gexfFooter = `    </nodes>
    <edges>
${gexfEdges}
    </edges>
  </graph>
</gexf>`;
    const gexfContent = gexfHeader + '\n' + gexfNodes + '\n' + gexfFooter;
    const blob = new Blob([gexfContent], { type: 'application/gexf+xml' });
    const link = document.createElement('a'); link.download = `fundtracer-graph-${Date.now()}.gexf`; link.href = URL.createObjectURL(blob); link.click();
    notify.success('Graph exported as GEXF');
  }, [graphData, notify]);

  const handleExportEncrypted = useCallback(() => {
    if (!encryptedExportPassword) { notify.error('Please enter a password'); return; }
    const data = { nodes: graphData.nodes, edges: graphData.edges, annotations };
    const encrypted = btoa(JSON.stringify(data) + '|' + encryptedExportPassword);
    const blob = new Blob([encrypted], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const l = document.createElement('a'); l.download = `fundtracer-encrypted-${Date.now()}.enc`; l.href = url; l.click();
    setAuditLog(prev => [...prev, { action: 'Export Encrypted', user: 'You', timestamp: Date.now(), details: 'Exported encrypted investigation file' }]);
    notify.success('Encrypted export saved');
  }, [graphData, annotations, encryptedExportPassword, notify]);

  const handleShare = useCallback(() => {
    if (navigator.share) { navigator.share({ title: 'FundTracer Investigation', text: `Investigation of ${targetAddress || 'wallet'} on ${chain}`, url: window.location.href }); }
    else { navigator.clipboard.writeText(window.location.href); notify.success('Link copied!'); }
  }, [targetAddress, chain, notify]);

  const handleAddQueryCondition = useCallback(() => {
    setQueryBuilder(prev => [...prev, { field: 'value', operator: 'greater', value: '' }]);
  }, []);

  const handleRemoveQueryCondition = useCallback((index: number) => {
    setQueryBuilder(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleQueryChange = useCallback((index: number, field: string, operator: string, value: string) => {
    setQueryBuilder(prev => prev.map((q, i) => i === index ? { field, operator, value } : q));
  }, []);

  const handleExecuteQuery = useCallback(() => {
    let results = graphData.nodes;
    queryBuilder.forEach((q, i) => {
      const filtered = results.filter(n => {
        const nodeValue = q.field === 'type' ? n.type : q.field === 'balance' ? n.balance : q.field === 'risk' ? n.riskScore : q.field === 'volume' ? n.totalVolume : '';
        if (q.operator === 'equals') return String(nodeValue).toLowerCase() === q.value.toLowerCase();
        if (q.operator === 'contains') return String(nodeValue).toLowerCase().includes(q.value.toLowerCase());
        if (q.operator === 'greater') return Number(nodeValue) > Number(q.value);
        if (q.operator === 'less') return Number(nodeValue) < Number(q.value);
        return true;
      });
      results = queryOperator === 'AND' ? filtered : [...new Set([...results, ...filtered])];
    });
    setFilteredNodes(new Set(results.map(n => n.id)));
    notify.info(`Query returned ${results.length} nodes`);
    setAuditLog(prev => [...prev, { action: 'Boolean Query', user: 'You', timestamp: Date.now(), details: `Executed query with ${queryBuilder.length} conditions using ${queryOperator}` }]);
  }, [graphData, queryBuilder, queryOperator, notify]);

  const handleToggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setPresentationMode('presentation');
    } else {
      document.exitFullscreen();
      setPresentationMode('normal');
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setPresentationMode('normal');
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleENSLookup = useCallback((address: string) => {
    const mockENS = { '0x742d': 'vitalik.eth', '0x8a2': 'alice.eth', '0x3f9': 'bob.eth' };
    const shortAddr = address.slice(0, 6);
    const ens = mockENS[shortAddr as keyof typeof mockENS] || null;
    if (ens) { setEnsLookup(prev => ({ ...prev, [address]: ens })); notify.success(`Resolved: ${ens}`); }
    else { notify.info(`No ENS name found for ${shortAddr}...`); }
  }, [notify]);

  const handleCalculateCostBasis = useCallback((method: 'FIFO' | 'LIFO' | 'HIFO') => {
    const lots = [
      { amount: 1.5, price: 1800, date: Date.now() - 90 * 24 * 60 * 60 * 1000 },
      { amount: 0.8, price: 2200, date: Date.now() - 60 * 24 * 60 * 60 * 1000 },
      { amount: 2.0, price: 3500, date: Date.now() - 30 * 24 * 60 * 60 * 1000 },
    ];
    const currentPrice = 4000;
    let gains = 0, losses = 0;
    let remaining = 1.5;
    const sorted = method === 'FIFO' ? [...lots].sort((a, b) => a.date - b.date) :
                   method === 'LIFO' ? [...lots].sort((a, b) => b.date - a.date) :
                   [...lots].sort((a, b) => b.price - a.price);
    sorted.forEach(lot => {
      const sold = Math.min(remaining, lot.amount);
      const pnl = (currentPrice - lot.price) * sold;
      if (pnl > 0) gains += pnl; else losses += Math.abs(pnl);
      remaining -= sold;
    });
    setCostBasis({ method, gains, losses, lots: sorted });
    notify.success(`Cost basis calculated using ${method}`);
  }, [notify]);

  const handleAddToMonitoring = useCallback((address: string) => {
    if (!monitoredWallets.includes(address)) {
      setMonitoredWallets(prev => [...prev, address]);
      setAuditLog(prev => [...prev, { action: 'Add to Monitor', user: 'You', timestamp: Date.now(), details: `Added ${address.slice(0, 10)}... to monitoring` }]);
      notify.success('Wallet added to monitoring');
    }
  }, [monitoredWallets, notify]);

  const handleSubmitWhistleblower = useCallback(() => {
    if (!whistleblowerReport.subject || !whistleblowerReport.evidence) {
      notify.error('Please fill in all required fields');
      return;
    }
    setAuditLog(prev => [...prev, { action: 'Whistleblower Report', user: 'You', timestamp: Date.now(), details: `Submitted report: ${whistleblowerReport.subject}` }]);
    notify.success('Report submitted securely. Thank you for your contribution.');
    setWhistleblowerModal(false);
    setWhistleblowerReport({ subject: '', evidence: '', contact: '' });
  }, [whistleblowerReport, notify]);

  const handleGenerateFingerprint = useCallback(() => {
    const fingerprint = [
      { trait: 'Trading Frequency', score: Math.floor(Math.random() * 30 + 70), description: 'High-frequency trader with >50 tx/day average' },
      { trait: 'Gas Optimization', score: Math.floor(Math.random() * 20 + 40), description: 'Moderate gas efficiency, batches transactions occasionally' },
      { trait: 'DeFi Usage', score: Math.floor(Math.random() * 50 + 50), description: 'Active DeFi user across multiple protocols' },
      { trait: 'NFT Activity', score: Math.floor(Math.random() * 40 + 20), description: 'Occasional NFT trader, likely collector' },
      { trait: 'CEX Interaction', score: Math.floor(Math.random() * 60 + 30), description: 'Frequent centralized exchange deposits/withdrawals' },
    ];
    setBehavioralFingerprint(fingerprint);
    notify.success('Behavioral fingerprint generated');
  }, [notify]);

  const handleAnalyzeGas = useCallback(() => {
    const analysis = {
      avgGas: Math.floor(Math.random() * 50 + 30),
      optimalTime: 'Tuesday 3:00-4:00 AM UTC',
      savings: Math.floor(Math.random() * 0.5 * 100) / 100,
      recommendations: [
        'Consider batching transactions during off-peak hours',
        'Use gas tokens (CHK, GST2) to store gas during low periods',
        'Set up automated transactions during optimal time windows',
      ],
    };
    setGasAnalysis(analysis);
    notify.info('Gas analysis complete');
  }, [notify]);

  const handleToggleMethod = useCallback((method: string) => {
    setMethodFilters(prev => {
      const next = new Set(prev);
      next.has(method) ? next.delete(method) : next.add(method);
      return next;
    });
  }, []);

  useEffect(() => {
    if (isGenerated && graphData.nodes.length > 0) {
      setHeatMapData([
        { region: 'North America', intensity: 0.8 },
        { region: 'Europe', intensity: 0.6 },
        { region: 'Asia', intensity: 0.7 },
        { region: 'Unknown', intensity: 0.4 },
      ]);
      setWalletSimilarity(graphData.nodes.slice(0, 5).map(n => ({
        wallet: n.id,
        score: Math.floor(Math.random() * 30 + 70),
        reason: 'Similar transaction patterns detected',
      })));
      setMevOpportunities([
        { type: 'Arbitrage', profit: 0.05, likelihood: 0.8 },
        { type: 'Front-running', profit: 0.12, likelihood: 0.6 },
        { type: 'Sandwich Attack', profit: 0.08, likelihood: 0.4 },
      ]);
      setBehavioralFingerprint([
        { trait: 'Trading Frequency', score: 75, description: 'High-frequency trader' },
        { trait: 'Gas Optimization', score: 65, description: 'Moderate gas efficiency' },
      ]);
      setAuditLog(prev => [...prev, { action: 'Graph Generated', user: 'System', timestamp: Date.now(), details: `Generated graph with ${graphData.nodes.length} nodes` }]);
    }
  }, [isGenerated, graphData]);

  const nodeCount = graphData.nodes.length;
  const edgeCount = graphData.edges.length;
  const totalVolume = graphData.edges.reduce((sum, e) => sum + e.value, 0);
  const suspiciousCount = graphData.nodes.filter(n => n.isSuspicious).length;
  const whaleCount = graphData.nodes.filter(n => n.isWhale).length;

  return (
    <div className={`advanced-graph ${themeMode === 'light' ? 'theme-light' : 'theme-dark'} ${presentationMode === 'presentation' ? 'presentation-mode' : ''} ${isStealth ? 'stealth-mode' : ''}`}>
      {!isGenerated && !isLoading && (
        <div className="graph-empty-state">
          <div className="graph-empty-icon"><Icon name="network" size={64} /></div>
          <h2 className="graph-empty-title">Advanced Graph Analysis</h2>
          <p className="graph-empty-desc">Visualize wallet connections with interactive force-directed graphs. Track fund flows, identify patterns, detect anomalies, and explore multi-hop relationships.</p>
          <div className="graph-empty-controls">
            <div className="control-group">
              <label>Max Hops</label>
              <div className="hop-selector">
                {[1, 2, 3, 4, 5].map(h => (
                  <button key={h} className={`hop-btn ${filters.hopLevels.includes(h) ? 'active' : ''}`} onClick={() => setFilters(prev => ({ ...prev, hopLevels: [h] }))}>{h}</button>
                ))}
              </div>
            </div>
            <div className="control-group">
              <label>Layout</label>
              <select value={layoutMode} onChange={e => setLayoutMode(e.target.value as any)}>
                <option value="force">Force Directed</option>
                <option value="radial">Radial Burst</option>
                <option value="tree">Tree View</option>
                <option value="grid">Grid</option>
              </select>
            </div>
          </div>
          <div className="graph-features-preview">
            <div className="feature-badge"><Icon name="brain" size={14} /><span>AI Analysis</span></div>
            <div className="feature-badge"><Icon name="activity" size={14} /><span>Real-time</span></div>
            <div className="feature-badge"><Icon name="layers" size={14} /><span>Multi-chain</span></div>
            <div className="feature-badge"><Icon name="shield" size={14} /><span>Privacy Mode</span></div>
          </div>
          <button className="btn-generate" onClick={handleGenerate}><Icon name="network" size={20} />Generate Graph</button>
        </div>
      )}

      {isLoading && (
        <div className="graph-loading">
          <div className="loading-spinner" />
          <span>Analyzing blockchain data...</span>
          <div className="loading-progress"><div className="progress-bar"><div className="progress-fill" /></div></div>
        </div>
      )}

      <div ref={containerRef} className="graph-container" style={{ display: isGenerated && !isLoading ? 'block' : 'none' }}>
        <div className="graph-watermark">
          <img src="/logo.png" alt="FundTracer" className="watermark-logo" />
          <span className="watermark-text">FundTracer</span>
        </div>
        <svg ref={svgRef} className="graph-svg" />

        <div className="graph-controls-top">
          <div className="search-box">
            <Icon name="search" size={18} />
            <input type="text" placeholder="Search or /ai command..." value={searchQuery} onChange={e => handleSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && (e.target as HTMLInputElement).value.startsWith('/')) handleNaturalLanguageSearch((e.target as HTMLInputElement).value.slice(1)); }} />
            <button className={`nl-toggle ${showAISuggestions ? 'active' : ''}`} onClick={() => setShowAISuggestions(!showAISuggestions)} title="AI Search"><Icon name="brain" size={16} /></button>
          </div>

          {showAISuggestions && (
            <div className="ai-suggestions">
              <div className="suggestion" onClick={() => handleNaturalLanguageSearch('suspicious wallets')}><Icon name="alert" size={14} /><span>Find suspicious wallets</span></div>
              <div className="suggestion" onClick={() => handleNaturalLanguageSearch('whale transactions')}><Icon name="flame" size={14} /><span>Show whale transactions</span></div>
              <div className="suggestion" onClick={() => handleNaturalLanguageSearch('mixer interactions')}><Icon name="eyeOff" size={14} /><span>Detect mixer usage</span></div>
              <div className="suggestion" onClick={() => handleNaturalLanguageSearch('recent activity')}><Icon name="clock" size={14} /><span>Recent activity only</span></div>
            </div>
          )}

          <div className="control-group-inline">
            <button className="ctrl-btn" onClick={handleZoomIn} title="Zoom In"><Icon name="zoomIn" size={18} /></button>
            <button className="ctrl-btn" onClick={handleZoomOut} title="Zoom Out"><Icon name="zoomOut" size={18} /></button>
            <button className="ctrl-btn" onClick={handleFit} title="Fit to Screen"><Icon name="maximize" size={18} /></button>
            <button className={`ctrl-btn ${isPaused ? 'active' : ''}`} onClick={() => setIsPaused(!isPaused)}><Icon name={isPaused ? 'play' : 'pause'} size={18} /></button>
            <button className={`ctrl-btn ${streamEnabled ? 'live' : ''}`} onClick={() => setStreamEnabled(!streamEnabled)} title="WebSocket Stream"><Icon name={streamEnabled ? 'wifi' : 'wifiOff'} size={18} /></button>
          </div>

          <div className="control-group-inline">
            <button className={`ctrl-btn ${viewMode === '3d' ? 'active' : ''}`} onClick={() => setViewMode(v => v === '2d' ? '3d' : '2d')} title="Toggle 3D View"><Icon name="layers" size={18} /><span>3D</span></button>
            <button className={`ctrl-btn ${showLabels ? 'active' : ''}`} onClick={() => setShowLabels(!showLabels)}><Icon name={showLabels ? 'eye' : 'eyeOff'} size={18} /></button>
            <button className={`ctrl-btn ${showParticleFlow ? 'active' : ''}`} onClick={() => setShowParticleFlow(!showParticleFlow)}><Icon name="zap" size={18} /></button>
            <button className={`ctrl-btn ${showMinimap ? 'active' : ''}`} onClick={() => setShowMinimap(!showMinimap)}><Icon name="grid" size={18} /></button>
            <button className={`ctrl-btn ${isStealth ? 'active' : ''}`} onClick={() => setIsStealth(!isStealth)}><Icon name={isStealth ? 'lock' : 'unlock'} size={18} /></button>
          </div>

          <div className="control-group-inline">
            <button className="ctrl-btn" onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}><Icon name={themeMode === 'dark' ? 'sun' : 'moon'} size={18} /></button>
            <button className="ctrl-btn" onClick={handleToggleFullscreen} title="Fullscreen"><Icon name={presentationMode === 'normal' ? 'maximize' : 'minimize'} size={18} /></button>
            <button className="ctrl-btn" onClick={() => setShowKeyboardHelp(v => !v)} title="Keyboard Shortcuts"><Icon name="keyboard" size={18} /></button>
          </div>

          <div className="control-group-inline">
            <button className="ctrl-btn" onClick={handleUndo} disabled={undoStack.length === 0}><Icon name="undo" size={18} /></button>
            <button className="ctrl-btn" onClick={handleRedo} disabled={redoStack.length === 0}><Icon name="redo" size={18} /></button>
          </div>

          <button className="ctrl-btn share-btn" onClick={handleShare}><Icon name="share" size={18} /><span>Share</span></button>
        </div>

        {streamEnabled && lastUpdate && (
          <div className="stream-indicator">
            <span className="live-dot" />
            <span>Live · Updated {lastUpdate.toLocaleTimeString()}</span>
          </div>
        )}

        {whistleblowerModal && (
          <div className="whistleblower-modal">
            <div className="whistleblower-header">
              <h3><Icon name="shield" size={20} />Submit Whistleblower Report</h3>
              <button onClick={() => setWhistleblowerModal(false)}><Icon name="close" size={16} /></button>
            </div>
            <div className="whistleblower-content">
              <p className="whistleblower-disclaimer">Your identity will be kept confidential. Reports help protect the crypto ecosystem.</p>
              <div className="form-group">
                <label>Subject Address or Entity *</label>
                <input type="text" value={whistleblowerReport.subject} onChange={e => setWhistleblowerReport(p => ({ ...p, subject: e.target.value }))} placeholder="0x... or entity name" />
              </div>
              <div className="form-group">
                <label>Evidence Description *</label>
                <textarea value={whistleblowerReport.evidence} onChange={e => setWhistleblowerReport(p => ({ ...p, evidence: e.target.value }))} placeholder="Describe the suspicious activity..." rows={4} />
              </div>
              <div className="form-group">
                <label>Contact (optional)</label>
                <input type="text" value={whistleblowerReport.contact} onChange={e => setWhistleblowerReport(p => ({ ...p, contact: e.target.value }))} placeholder="Email or Signal" />
              </div>
              <div className="whistleblower-actions">
                <button className="btn-secondary" onClick={() => setWhistleblowerModal(false)}>Cancel</button>
                <button className="btn-primary" onClick={handleSubmitWhistleblower}><Icon name="shield" size={16} />Submit Report</button>
              </div>
            </div>
          </div>
        )}

        {showKeyboardHelp && (
          <div className="keyboard-help-modal">
            <div className="keyboard-help-header">
              <h3>Keyboard Shortcuts</h3>
              <button onClick={() => setShowKeyboardHelp(false)}><Icon name="close" size={16} /></button>
            </div>
            <div className="keyboard-shortcuts-grid">
              <div className="shortcut-group"><h4>Navigation</h4>
                <div className="shortcut"><kbd>3</kbd><span>Toggle 3D/2D view</span></div>
                <div className="shortcut"><kbd>Arrow keys</kbd><span>Rotate 3D view</span></div>
                <div className="shortcut"><kbd>W</kbd><span>Toggle WebSocket stream</span></div>
              </div>
              <div className="shortcut-group"><h4>Display</h4>
                <div className="shortcut"><kbd>L</kbd><span>Toggle labels</span></div>
                <div className="shortcut"><kbd>N</kbd><span>Toggle minimap</span></div>
                <div className="shortcut"><kbd>T</kbd><span>Toggle timeline</span></div>
              </div>
              <div className="shortcut-group"><h4>Actions</h4>
                <div className="shortcut"><kbd>Space</kbd><span>Pause/Resume animation</span></div>
                <div className="shortcut"><kbd>F</kbd><span>Focus search</span></div>
                <div className="shortcut"><kbd>Ctrl+S</kbd><span>Save snapshot</span></div>
                <div className="shortcut"><kbd>Ctrl+R</kbd><span>Regenerate</span></div>
              </div>
              <div className="shortcut-group"><h4>History</h4>
                <div className="shortcut"><kbd>Ctrl+Z</kbd><span>Undo</span></div>
                <div className="shortcut"><kbd>Ctrl+Shift+Z</kbd><span>Redo</span></div>
                <div className="shortcut"><kbd>Esc</kbd><span>Close panels</span></div>
              </div>
            </div>
          </div>
        )}

        <div className="graph-controls-left">
          <div className="filter-section">
            <div className="filter-header" onClick={() => setActivePanel('filters')}>
              <Icon name="filter" size={16} /><span>Filters</span>
              <Icon name={activePanel === 'filters' ? 'chevronUp' : 'chevronDown'} size={14} />
            </div>
            {activePanel === 'filters' && (
              <div className="filter-content">
                <div className="filter-group">
                  <label>Max Hops</label>
                  <div className="hop-buttons">
                    {[1, 2, 3, 4, 5].map(h => (
                      <button key={h} className={`hop-btn ${filters.hopLevels.includes(h) ? 'active' : ''}`} onClick={() => setFilters(prev => ({ ...prev, hopLevels: prev.hopLevels.includes(h) ? prev.hopLevels.filter(x => x !== h) : [...prev.hopLevels, h] }))}>{h}</button>
                    ))}
                  </div>
                </div>
                <div className="filter-group">
                  <label>Min Value (ETH)</label>
                  <input type="number" min="0" step="0.1" value={filters.minValue} onChange={e => setFilters(prev => ({ ...prev, minValue: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="filter-group">
                  <label>Date Range</label>
                  <div className="date-inputs">
                    <input type="date" value={new Date(filters.timeRange[0]).toISOString().split('T')[0]} onChange={e => setFilters(prev => ({ ...prev, timeRange: [new Date(e.target.value).getTime(), prev.timeRange[1]] }))} />
                    <span>to</span>
                    <input type="date" value={new Date(filters.timeRange[1]).toISOString().split('T')[0]} onChange={e => setFilters(prev => ({ ...prev, timeRange: [prev.timeRange[0], new Date(e.target.value).getTime()] }))} />
                  </div>
                </div>
                <div className="filter-group">
                  <label>Transaction Status</label>
                  <div className="checkbox-group">
                    {['success', 'failed', 'pending'].map(status => (
                      <label key={status} className="checkbox-label">
                        <input type="checkbox" checked={filters.txStatus.includes(status)} onChange={e => setFilters(prev => ({ ...prev, txStatus: e.target.checked ? [...prev.txStatus, status] : prev.txStatus.filter(s => s !== status) }))} />
                        <span className={`status-badge status-${status}`}>{status}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="filter-group">
                  <label>Show Options</label>
                  <div className="toggle-group">
                    <label className="toggle-label"><input type="checkbox" checked={filters.showWhales} onChange={e => setFilters(prev => ({ ...prev, showWhales: e.target.checked }))} /><span>Whales</span></label>
                    <label className="toggle-label"><input type="checkbox" checked={filters.showSuspicious} onChange={e => setFilters(prev => ({ ...prev, showSuspicious: e.target.checked }))} /><span>Suspicious</span></label>
                    <label className="toggle-label"><input type="checkbox" checked={filters.showDormant} onChange={e => setFilters(prev => ({ ...prev, showDormant: e.target.checked }))} /><span>Dormant</span></label>
                  </div>
                </div>
                <div className="filter-group">
                  <label>Node Types</label>
                  <div className="type-buttons">
                    {['wallet', 'exchange', 'defi', 'contract', 'mixer', 'dao', 'nft', 'bridge'].map(type => (
                      <button key={type} className={`type-btn ${type}`} onClick={() => setFilters(prev => ({ ...prev, tokenTypes: prev.tokenTypes.includes(type) ? prev.tokenTypes.filter(t => t !== type) : [...prev.tokenTypes, type] }))}>{type.charAt(0).toUpperCase()}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {aiAnalysis && (
            <div className="filter-section ai-section">
              <div className="filter-header" onClick={() => setActivePanel('analytics')}>
                <Icon name="brain" size={16} /><span>AI Analysis</span>
                {aiAnalysis.anomalies.length > 0 && <span className="badge warning">{aiAnalysis.anomalies.length}</span>}
                <Icon name={activePanel === 'analytics' ? 'chevronUp' : 'chevronDown'} size={14} />
              </div>
              {activePanel === 'analytics' && (
                <div className="filter-content ai-content">
                  {aiAnalysis.anomalies.length > 0 && (
                    <div className="ai-subsection">
                      <h4>Anomalies Detected</h4>
                      {aiAnalysis.anomalies.slice(0, 5).map((a, i) => (
                        <div key={i} className="anomaly-item"><Icon name="alert" size={14} /><span>{a.reason}</span><span className="confidence">{(a.confidence * 100).toFixed(0)}%</span></div>
                      ))}
                    </div>
                  )}
                  {aiAnalysis.patterns.length > 0 && (
                    <div className="ai-subsection">
                      <h4>Patterns Found</h4>
                      {aiAnalysis.patterns.map((p, i) => (
                        <div key={i} className="pattern-item"><Icon name="activity" size={14} /><span>{p.type}: {p.description}</span></div>
                      ))}
                    </div>
                  )}
                  {aiAnalysis.predictions.length > 0 && (
                    <div className="ai-subsection">
                      <h4>Predictions</h4>
                      {aiAnalysis.predictions.slice(0, 3).map((p, i) => (
                        <div key={i} className="prediction-item"><Icon name="trending" size={14} /><span>{p.likelyAction}</span><span className="confidence">{(p.confidence * 100).toFixed(0)}%</span></div>
                      ))}
                    </div>
                  )}
                  <div className="ai-subsection narrative">
                    <h4>Narrative</h4>
                    <p>{aiAnalysis.narrative}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="filter-section">
            <div className="filter-header" onClick={() => setActivePanel('annotations')}>
              <Icon name="message" size={16} /><span>Annotations ({annotations.length})</span>
              <Icon name={activePanel === 'annotations' ? 'chevronUp' : 'chevronDown'} size={14} />
            </div>
            {activePanel === 'annotations' && (
              <div className="filter-content">
                {annotations.map(ann => (
                  <div key={ann.id} className="annotation-item">
                    <div className="annotation-header"><span className="annotation-author">{ann.author}</span><span className="annotation-time">{new Date(ann.timestamp).toLocaleTimeString()}</span></div>
                    <p className="annotation-text">{ann.text}</p>
                  </div>
                ))}
                {annotations.length === 0 && <p className="no-annotations">No annotations yet. Click a node to add one.</p>}
              </div>
            )}
          </div>

          {defiIntelligence && (
            <div className="filter-section defi-section">
              <div className="filter-header" onClick={() => setActivePanel('defi')}>
                <Icon name="activity" size={16} /><span>DeFi Intelligence</span>
                <Icon name={activePanel === 'defi' ? 'chevronUp' : 'chevronDown'} size={14} />
              </div>
              {activePanel === 'defi' && (
                <div className="filter-content defi-content">
                  <div className="defi-subsection">
                    <h4>DEX Paths</h4>
                    {defiIntelligence.dexPaths.map((path, i) => (
                      <div key={i} className="dex-path-item">
                        <span className="dex-token">{path.from}</span>
                        <Icon name="arrowRight" size={12} />
                        <span className="dex-token">{path.to}</span>
                        <span className="dex-volume">{path.volume.toFixed(2)} ETH</span>
                      </div>
                    ))}
                  </div>
                  <div className="defi-subsection">
                    <h4>Liquidity Pools</h4>
                    {defiIntelligence.liquidityPools.slice(0, 3).map((pool, i) => (
                      <div key={i} className="pool-item">
                        <span className="pool-name">{pool.protocol} · {pool.pool}</span>
                        <div className="pool-stats">
                          <span>TVL: ${(pool.tvl / 1000).toFixed(0)}K</span>
                          <span className="pool-apr">{pool.apr.toFixed(1)}% APR</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="defi-subsection">
                    <h4>Analytics</h4>
                    <div className="analytics-grid">
                      <div className="analytics-item">
                        <span className="analytics-label">Mixer Score</span>
                        <div className="mixer-bar">
                          <div className="mixer-fill" style={{ width: `${defiIntelligence.mixerScore}%` }} />
                        </div>
                        <span className="analytics-value">{defiIntelligence.mixerScore}%</span>
                      </div>
                      <div className="analytics-item">
                        <span className="analytics-label">Est. Tax Liability</span>
                        <span className="analytics-value tax-value">{defiIntelligence.estimatedTaxLiability.toFixed(4)} ETH</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="filter-section timeline-section">
            <div className="filter-header" onClick={() => setActivePanel('timeline')}>
              <Icon name="clock" size={16} /><span>Timeline Playback</span>
              <Icon name={activePanel === 'timeline' ? 'chevronUp' : 'chevronDown'} size={14} />
            </div>
            {activePanel === 'timeline' && (
              <div className="filter-content timeline-content">
                <div className="timeline-slider">
                  <input type="range" min="0" max="100" value={timeSliderValue} onChange={e => setTimeSliderValue(parseInt(e.target.value))} />
                  <div className="timeline-labels">
                    <span>30 days ago</span>
                    <span>Now ({timeSliderValue}%)</span>
                  </div>
                </div>
                <div className="timeline-controls">
                  <button className="timeline-btn" onClick={() => setTimeSliderValue(0)}><Icon name="arrowUp" size={14} /></button>
                  <button className="timeline-btn" onClick={() => setIsPlaying(!isPlaying)}><Icon name={isPlaying ? 'pause' : 'play'} size={14} /></button>
                  <button className="timeline-btn" onClick={() => setTimeSliderValue(100)}><Icon name="arrowDown" size={14} /></button>
                </div>
              </div>
            )}
          </div>

          <div className="filter-section query-section">
            <div className="filter-header" onClick={() => setActivePanel('query')}>
              <Icon name="code" size={16} /><span>Query Builder</span>
              <Icon name={activePanel === 'query' ? 'chevronUp' : 'chevronDown'} size={14} />
            </div>
            {activePanel === 'query' && (
              <div className="filter-content query-content">
                <div className="query-operator">
                  <label>Combine conditions with:</label>
                  <div className="operator-buttons">
                    <button className={queryOperator === 'AND' ? 'active' : ''} onClick={() => setQueryOperator('AND')}>AND</button>
                    <button className={queryOperator === 'OR' ? 'active' : ''} onClick={() => setQueryOperator('OR')}>OR</button>
                  </div>
                </div>
                {queryBuilder.map((q, i) => (
                  <div key={i} className="query-row">
                    <select value={q.field} onChange={e => handleQueryChange(i, e.target.value, q.operator, q.value)}>
                      <option value="type">Type</option>
                      <option value="balance">Balance</option>
                      <option value="risk">Risk Score</option>
                      <option value="volume">Volume</option>
                    </select>
                    <select value={q.operator} onChange={e => handleQueryChange(i, q.field, e.target.value, q.value)}>
                      <option value="equals">equals</option>
                      <option value="contains">contains</option>
                      <option value="greater">greater than</option>
                      <option value="less">less than</option>
                    </select>
                    <input type="text" value={q.value} onChange={e => handleQueryChange(i, q.field, q.operator, e.target.value)} placeholder="Value" />
                    <button className="query-remove" onClick={() => handleRemoveQueryCondition(i)}><Icon name="close" size={14} /></button>
                  </div>
                ))}
                <div className="query-actions">
                  <button className="query-btn" onClick={handleAddQueryCondition}><Icon name="plus" size={14} />Add Condition</button>
                  <button className="query-btn primary" onClick={handleExecuteQuery}><Icon name="activity" size={14} />Execute</button>
                </div>
              </div>
            )}
          </div>

          <div className="filter-section costbasis-section">
            <div className="filter-header" onClick={() => setActivePanel('costbasis')}>
              <Icon name="dollar" size={16} /><span>Cost Basis & Tax</span>
              <Icon name={activePanel === 'costbasis' ? 'chevronUp' : 'chevronDown'} size={14} />
            </div>
            {activePanel === 'costbasis' && (
              <div className="filter-content costbasis-content">
                <div className="method-selector">
                  <label>Calculation Method:</label>
                  <div className="method-buttons">
                    <button className={costBasis?.method === 'FIFO' ? 'active' : ''} onClick={() => handleCalculateCostBasis('FIFO')}>FIFO</button>
                    <button className={costBasis?.method === 'LIFO' ? 'active' : ''} onClick={() => handleCalculateCostBasis('LIFO')}>LIFO</button>
                    <button className={costBasis?.method === 'HIFO' ? 'active' : ''} onClick={() => handleCalculateCostBasis('HIFO')}>HIFO</button>
                  </div>
                </div>
                {costBasis && (
                  <div className="costbasis-results">
                    <div className="costbasis-item gains">
                      <span className="label">Realized Gains</span>
                      <span className="value">{costBasis.gains.toFixed(4)} ETH</span>
                    </div>
                    <div className="costbasis-item losses">
                      <span className="label">Realized Losses</span>
                      <span className="value">{costBasis.losses.toFixed(4)} ETH</span>
                    </div>
                    <div className="costbasis-item net">
                      <span className="label">Net P/L</span>
                      <span className="value">{(costBasis.gains - costBasis.losses).toFixed(4)} ETH</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="filter-section analytics-section">
            <div className="filter-header" onClick={() => setActivePanel('advanced')}>
              <Icon name="microscope" size={16} /><span>Advanced Analytics</span>
              <Icon name={activePanel === 'advanced' ? 'chevronUp' : 'chevronDown'} size={14} />
            </div>
            {activePanel === 'advanced' && (
              <div className="filter-content analytics-content">
                <div className="analytics-row">
                  <button className="analytics-btn" onClick={handleGenerateFingerprint}><Icon name="users" size={14} />Behavioral Fingerprint</button>
                  <button className="analytics-btn" onClick={handleAnalyzeGas}><Icon name="zap" size={14} />Gas Analysis</button>
                  <button className="analytics-btn" onClick={() => setWhistleblowerModal(true)}><Icon name="shield" size={14} />Whistleblower</button>
                </div>
                {behavioralFingerprint.length > 0 && (
                  <div className="fingerprint-results">
                    <h4>Behavioral Fingerprint</h4>
                    {behavioralFingerprint.map((f, i) => (
                      <div key={i} className="fingerprint-item">
                        <span className="fingerprint-trait">{f.trait}</span>
                        <div className="fingerprint-bar">
                          <div className="fingerprint-fill" style={{ width: `${f.score}%` }} />
                        </div>
                        <span className="fingerprint-score">{f.score}%</span>
                      </div>
                    ))}
                  </div>
                )}
                {gasAnalysis && (
                  <div className="gas-results">
                    <h4>Gas Optimization</h4>
                    <div className="gas-stat"><span>Avg Gas:</span><span>{gasAnalysis.avgGas} gwei</span></div>
                    <div className="gas-stat"><span>Optimal Time:</span><span>{gasAnalysis.optimalTime}</span></div>
                    <div className="gas-stat highlight"><span>Potential Savings:</span><span>{gasAnalysis.savings} ETH</span></div>
                  </div>
                )}
                {mevOpportunities.length > 0 && (
                  <div className="mev-results">
                    <h4>MEV Opportunities</h4>
                    {mevOpportunities.map((m, i) => (
                      <div key={i} className="mev-item">
                        <span className="mev-type">{m.type}</span>
                        <span className="mev-profit">+{m.profit} ETH</span>
                        <span className="mev-likelihood">{(m.likelihood * 100).toFixed(0)}% likely</span>
                      </div>
                    ))}
                  </div>
                )}
                {walletSimilarity.length > 0 && (
                  <div className="similarity-results">
                    <h4>Wallet Similarity</h4>
                    {walletSimilarity.map((s, i) => (
                      <div key={i} className="similarity-item">
                        <span className="similarity-wallet">{s.wallet.slice(0, 8)}...</span>
                        <div className="similarity-bar">
                          <div className="similarity-fill" style={{ width: `${s.score}%` }} />
                        </div>
                        <span className="similarity-score">{s.score}%</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="method-filters">
                  <h4>Method Filters</h4>
                  <div className="method-toggles">
                    {['transfer', 'swap', 'approve', 'mint', 'burn', 'call', 'delegate'].map(m => (
                      <label key={m} className="method-toggle">
                        <input type="checkbox" checked={methodFilters.has(m)} onChange={() => handleToggleMethod(m)} />
                        <span>{m}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="filter-section audit-section">
            <div className="filter-header" onClick={() => setActivePanel('audit')}>
              <Icon name="shield" size={16} /><span>Audit Log ({auditLog.length})</span>
              <Icon name={activePanel === 'audit' ? 'chevronUp' : 'chevronDown'} size={14} />
            </div>
            {activePanel === 'audit' && (
              <div className="filter-content audit-content">
                {auditLog.slice(-10).reverse().map((log, i) => (
                  <div key={i} className="audit-item">
                    <div className="audit-header">
                      <span className="audit-action">{log.action}</span>
                      <span className="audit-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="audit-details">{log.details}</p>
                    <span className="audit-user">by {log.user}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="legend-section">
            <div className="legend-header">Legend</div>
            <div className="legend-items">
              <div className="legend-item"><span className="legend-dot target" /><span>Target</span></div>
              <div className="legend-item"><span className="legend-dot wallet" /><span>Wallet</span></div>
              <div className="legend-item"><span className="legend-dot exchange" /><span>Exchange</span></div>
              <div className="legend-item"><span className="legend-dot defi" /><span>DeFi</span></div>
              <div className="legend-item"><span className="legend-dot mixer" /><span>Mixer</span></div>
              <div className="legend-item"><span className="legend-dot suspicious" /><span>Suspicious</span></div>
              <div className="legend-divider" />
              <div className="legend-item"><span className="legend-line sent" /><span>Sent</span></div>
              <div className="legend-item"><span className="legend-line received" /><span>Received</span></div>
              <div className="legend-item"><span className="legend-line swap" /><span>Swap/Trade</span></div>
            </div>
          </div>
        </div>

        {selectedNode && (
          <div className="graph-details-panel">
            <div className="panel-header">
              <div className="panel-title">
                <span className={`node-indicator ${selectedNode.type}`} />
                <span>{selectedNode.type === 'target' ? 'Target Wallet' : selectedNode.type}</span>
                {selectedNode.isSuspicious && <span className="suspicious-badge">⚠</span>}
                {selectedNode.isWhale && <span className="whale-badge">🐋</span>}
              </div>
              <button className="panel-close" onClick={() => setSelectedNode(null)}><Icon name="close" size={16} /></button>
            </div>
            <div className="panel-content">
              <div className="detail-row">
                <span className="detail-label">Address</span>
                <div className="detail-value-row">
                  <code>{selectedNode.address.slice(0, 10)}...{selectedNode.address.slice(-8)}</code>
                  <button className="icon-btn" onClick={() => handleCopyAddress(selectedNode.address)} title="Copy"><Icon name="copy" size={14} /></button>
                </div>
              </div>
              {selectedNode.entityLabel && (
                <div className="detail-row">
                  <span className="detail-label">Entity</span>
                  <div className="detail-value-row">
                    {selectedNode.imageUrl && <img src={selectedNode.imageUrl} alt={selectedNode.entityLabel} className="entity-logo" />}
                    <span>{selectedNode.entityLabel}</span>
                  </div>
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
                <span className="detail-label">Volume</span>
                <span className="detail-value">{selectedNode.totalVolume?.toFixed(2)} ETH</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Risk Score</span>
                <span className={`risk-badge risk-${selectedNode.riskScore! > 60 ? 'high' : selectedNode.riskScore! > 30 ? 'medium' : 'low'}`}>{selectedNode.riskScore}%</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Privacy</span>
                <span className="detail-value">{selectedNode.privacyScore}/100</span>
              </div>
              {selectedNode.gasUsed && (
                <div className="detail-row">
                  <span className="detail-label">Gas Used</span>
                  <span className="detail-value">{selectedNode.gasUsed.toLocaleString()}</span>
                </div>
              )}
              {selectedNode.nftCount && (
                <div className="detail-row">
                  <span className="detail-label">NFTs</span>
                  <span className="detail-value">{selectedNode.nftCount}</span>
                </div>
              )}
              {selectedNode.daoVotes && (
                <div className="detail-row">
                  <span className="detail-label">DAO Votes</span>
                  <span className="detail-value">{selectedNode.daoVotes}</span>
                </div>
              )}
              {selectedNode.firstTx && (
                <div className="detail-row">
                  <span className="detail-label">First Tx</span>
                  <span className="detail-value">{new Date(selectedNode.firstTx).toLocaleDateString()}</span>
                </div>
              )}
              {selectedNode.lastTx && (
                <div className="detail-row">
                  <span className="detail-label">Last Tx</span>
                  <span className="detail-value">{new Date(selectedNode.lastTx).toLocaleDateString()}</span>
                </div>
              )}
              {selectedNode.isSuspicious && selectedNode.suspiciousReason && (
                <div className="detail-row warning">
                  <span className="detail-label">Warning</span>
                  <span className="detail-value">{selectedNode.suspiciousReason}</span>
                </div>
              )}
              <div className="panel-actions">
                <button className={`action-btn ${watchlist.has(selectedNode.id) ? 'active' : ''}`} onClick={() => handleToggleWatchlist(selectedNode.id)}><Icon name={watchlist.has(selectedNode.id) ? 'star' : 'starOutline'} size={16} />{watchlist.has(selectedNode.id) ? 'Watching' : 'Watch'}</button>
                <button className="action-btn" onClick={() => handleTogglePin(selectedNode.id)}><Icon name={pinnedNodes.has(selectedNode.id) ? 'lock' : 'unlock'} size={16} />{pinnedNodes.has(selectedNode.id) ? 'Unpin' : 'Pin'}</button>
                <button className="action-btn" onClick={() => { const text = prompt('Add annotation:'); if (text) handleAddAnnotation(selectedNode.id, text); }}><Icon name="message" size={16} />Annotate</button>
                <button className="action-btn" onClick={() => { setFilteredNodes(new Set([selectedNode.id])); setSelectedNode(null); }}><Icon name="search" size={16} />Isolate</button>
              </div>
            </div>
          </div>
        )}

        {showMinimap && isGenerated && (
          <div className="graph-minimap">
            <div className="minimap-header">Overview</div>
            <svg className="minimap-svg" width="120" height="80" />
            <div className="minimap-stats"><span>Nodes: {nodeCount}</span><span>Edges: {edgeCount}</span></div>
          </div>
        )}

        <div className="graph-stats-bar">
          <div className="stat-bar-item"><span className="stat-bar-label">Nodes</span><span className="stat-bar-value">{nodeCount}</span></div>
          <div className="stat-bar-item"><span className="stat-bar-label">Edges</span><span className="stat-bar-value">{edgeCount}</span></div>
          <div className="stat-bar-item"><span className="stat-bar-label">Volume</span><span className="stat-bar-value">{totalVolume.toFixed(2)} ETH</span></div>
          <div className="stat-bar-item"><span className="stat-bar-label">Suspicious</span><span className="stat-bar-value suspicious">{suspiciousCount}</span></div>
          <div className="stat-bar-item"><span className="stat-bar-label">Whales</span><span className="stat-bar-value whale">{whaleCount}</span></div>
          <div className="stat-bar-item"><span className="stat-bar-label">Zoom</span><span className="stat-bar-value">{(zoom * 100).toFixed(0)}%</span></div>
          <button className="btn-regenerate" onClick={handleGenerate}><Icon name="refresh" size={14} />Regenerate</button>
        </div>
      </div>
    </div>
  );
};

export default AdvancedGraph;
