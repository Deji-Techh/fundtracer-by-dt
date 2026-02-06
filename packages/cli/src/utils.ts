// ============================================================
// FundTracer CLI - Utilities
// ============================================================

import fs from 'fs';
import path from 'path';
import os from 'os';
import { ApiKeyConfig, ChainId } from '@fundtracer/core';

const CONFIG_FILE = path.join(os.homedir(), '.fundtracer', 'config.json');

export interface CliApiKeys extends ApiKeyConfig {
  // Sybil analysis keys (20 keys for parallel processing)
  sybilWalletKeys?: string[];
  sybilContractKeys?: string[];
}

export function getApiKeys(): CliApiKeys {
  let config: any = {};

  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      config = JSON.parse(data);
    }
  } catch {
    // Ignore
  }

  const keys = config.apiKeys || {};

  // Collect Sybil keys from environment or config
  const sybilWalletKeys: string[] = [];
  const sybilContractKeys: string[] = [];

  // Check environment variables first
  for (let i = 1; i <= 10; i++) {
    const walletKey = process.env[`SYBIL_WALLET_KEY_${i}`] || keys[`sybilWalletKey${i}`];
    const contractKey = process.env[`SYBIL_CONTRACT_KEY_${i}`] || keys[`sybilContractKey${i}`];
    if (walletKey) sybilWalletKeys.push(walletKey);
    if (contractKey) sybilContractKeys.push(contractKey);
  }

  // Merge config file keys with environment variables (env takes precedence)
  return {
    alchemy: process.env.ALCHEMY_API_KEY || keys.alchemy,
    moralis: process.env.MORALIS_API_KEY || keys.moralis,
    dune: process.env.DUNE_API_KEY || keys.dune,
    etherscan: process.env.ETHERSCAN_API_KEY || keys.etherscan,
    lineascan: process.env.LINEASCAN_API_KEY || keys.lineascan,
    arbiscan: process.env.ARBISCAN_API_KEY || keys.arbiscan,
    basescan: process.env.BASESCAN_API_KEY || keys.basescan,
    optimism: process.env.OPTIMISM_API_KEY || keys.optimism,
    polygonscan: process.env.POLYGONSCAN_API_KEY || keys.polygonscan,
    // Sybil analysis keys
    sybilWalletKeys: sybilWalletKeys.length > 0 ? sybilWalletKeys : undefined,
    sybilContractKeys: sybilContractKeys.length > 0 ? sybilContractKeys : undefined,
  };
}

export function getSybilApiKeys(): string[] {
  const keys = getApiKeys();
  const allKeys: string[] = [];

  // Combine wallet and contract keys
  if (keys.sybilWalletKeys) {
    allKeys.push(...keys.sybilWalletKeys);
  }
  if (keys.sybilContractKeys) {
    allKeys.push(...keys.sybilContractKeys);
  }

  // Fallback: if no specific sybil keys, use the main alchemy key replicated
  if (allKeys.length === 0 && keys.alchemy) {
    // Use the main key 20 times (not optimal but works)
    for (let i = 0; i < 20; i++) {
      allKeys.push(keys.alchemy);
    }
  }

  return allKeys;
}

export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatEth(value: number): string {
  if (value === 0) return '0';
  if (value < 0.0001) return '<0.0001';
  if (value < 1) return value.toFixed(4);
  if (value < 100) return value.toFixed(3);
  return value.toFixed(2);
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  } else if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  }
}

export function exportToCSV(data: any[], filename: string): void {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      // Escape values with commas or quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value ?? '';
    });
    csvRows.push(values.join(','));
  }

  fs.writeFileSync(filename, csvRows.join('\n'));
}

export function readAddressesFromFile(filepath: string): string[] {
  const content = fs.readFileSync(filepath, 'utf-8');
  const addresses = content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .filter(line => /^0x[a-fA-F0-9]{40}$/.test(line));
  
  return addresses;
}

export function validateAddresses(addresses: string[]): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const addr of addresses) {
    if (/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      valid.push(addr.toLowerCase());
    } else {
      invalid.push(addr);
    }
  }

  return { valid, invalid };
}
