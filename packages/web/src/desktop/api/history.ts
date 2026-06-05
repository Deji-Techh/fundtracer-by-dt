import { apiRequest } from './client';
import type { HistoryEntry } from '../types';

export async function fetchScanHistory(): Promise<HistoryEntry[]> {
  const data = await apiRequest<{ success: boolean; items: HistoryEntry[] }>('/api/scan-history');
  return (data.items || []).map(normalize);
}

export async function saveScanHistoryItem(entry: HistoryEntry): Promise<void> {
  await apiRequest('/api/scan-history', 'POST', {
    address: entry.address,
    chain: entry.chain,
    type: entry.type,
    timestamp: entry.timestamp,
    label: entry.label,
    riskScore: entry.riskScore,
    riskLevel: entry.riskLevel,
    totalTransactions: entry.totalTransactions,
    transactionHistoryLimited: entry.transactionHistoryLimited,
    totalValueSentEth: entry.totalValueSentEth,
    totalValueReceivedEth: entry.totalValueReceivedEth,
    activityPeriodDays: entry.activityPeriodDays,
    balanceInEth: entry.balanceInEth,
  });
}

export async function syncScanHistory(items: HistoryEntry[]): Promise<HistoryEntry[]> {
  const data = await apiRequest<{ success: boolean; items: HistoryEntry[] }>('/api/scan-history/sync', 'POST', { items });
  return (data.items || []).map(normalize);
}

export async function deleteScanHistoryItem(address: string): Promise<void> {
  await apiRequest(`/api/scan-history/${encodeURIComponent(address)}`, 'DELETE');
}

export async function clearScanHistory(): Promise<void> {
  await apiRequest('/api/scan-history', 'DELETE');
}

function normalize(item: any): HistoryEntry {
  return {
    address: item.address,
    chain: item.chain || 'ethereum',
    type: item.type || 'wallet',
    timestamp: item.timestamp || 0,
    label: item.label,
    riskScore: item.riskScore,
    riskLevel: item.riskLevel,
    totalTransactions: item.totalTransactions,
    transactionHistoryLimited: item.transactionHistoryLimited,
    totalValueSentEth: item.totalValueSentEth,
    totalValueReceivedEth: item.totalValueReceivedEth,
    activityPeriodDays: item.activityPeriodDays,
    balanceInEth: item.balanceInEth,
  };
}
