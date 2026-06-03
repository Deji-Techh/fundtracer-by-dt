import type { ChainId, AnalysisResult, FundingNode } from 'fundtracer-core';

export type { ChainId, AnalysisResult, FundingNode };

export interface AnalysisTab {
  id: string;
  address: string;
  chain: ChainId;
  type: 'wallet' | 'contract' | 'compare' | 'sybil';
  label?: string;
  loading: boolean;
  error?: string;
  progressiveStatus?: {
    wallet?: 'pending' | 'loading' | 'done' | 'error';
    timestamps?: 'pending' | 'loading' | 'done' | 'error';
    funding?: 'pending' | 'loading' | 'done' | 'error';
    message?: string;
  };
  result?: AnalysisResult;
  transactions?: unknown;
  fundingData?: unknown;
}

export interface AddressBookEntry {
  label: string;
  address: string;
  chain: string;
  tags: string[];
  createdAt: number;
}

export interface AddressBookFile {
  addresses: AddressBookEntry[];
}

export interface HistoryEntry {
  address: string;
  chain: string;
  timestamp: number;
  type: 'wallet' | 'contract' | 'compare' | 'sybil';
  riskLevel?: string;
  riskScore?: number;
  label?: string;
  totalTransactions?: number;
  totalValueSentEth?: number;
  totalValueReceivedEth?: number;
  activityPeriodDays?: number;
  balanceInEth?: number;
}

export interface HistoryFile {
  items: HistoryEntry[];
}

export interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  maximized: boolean;
  sidebarCollapsed: boolean;
  currentView?: string;
  openTabs: Array<{
    id: string;
    address: string;
    chain: string;
    type: string;
    label?: string;
  }>;
}

export type AppView =
  | 'analyze'
  | 'compare'
  | 'ai-chat'
  | 'rooms'
  | 'settings'
  | 'contract-scanner'
  | 'interactors'
  | 'sybil-detection'
  | 'cex-flow'
  | 'polymarket';
