/**
 * MultiChainWalletTrackerPage - Multi-chain wallet analysis documentation
 * Documentation page for /docs/multi-chain-wallet-tracker
 */

import React from 'react';
import { DocsLayout } from './DocsLayout';
import { Wallet, Network, Search, TrendingUp, Shield } from 'lucide-react';

const sections = [
  { id: 'overview', title: 'Overview', icon: <Wallet size={16} /> },
  { id: 'supported-chains', title: 'Supported Chains', icon: <Network size={16} /> },
  { id: 'cross-chain', title: 'Cross-Chain Analysis', icon: <Search size={16} /> },
  { id: 'unified-view', title: 'Unified Portfolio View', icon: <TrendingUp size={16} /> },
];

export function MultiChainWalletTrackerPage() {
  return (
    <DocsLayout
      title="Multi-Chain Wallet Tracker"
      description="Analyze wallet addresses across multiple blockchains from a single interface."
      activeSection="overview"
      sections={sections}
    >
      <h2 id="overview">Overview</h2>
      <p>
        FundTracer supports wallet analysis across 8 major blockchain networks. The Multi-Chain 
        Wallet Tracker provides a unified interface to analyze, compare, and track wallets across 
        all supported chains.
      </p>

      <h2 id="supported-chains">Supported Chains</h2>
      <table>
        <thead>
          <tr>
            <th>Chain</th>
            <th>Token</th>
            <th>Tier</th>
            <th>Explorer</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Ethereum</td>
            <td>ETH</td>
            <td>Pro/Max</td>
            <td>etherscan.io</td>
          </tr>
          <tr>
            <td>Linea</td>
            <td>ETH</td>
            <td>Free</td>
            <td>lineascan.build</td>
          </tr>
          <tr>
            <td>Base</td>
            <td>ETH</td>
            <td>Pro/Max</td>
            <td>basescan.org</td>
          </tr>
          <tr>
            <td>Arbitrum</td>
            <td>ETH</td>
            <td>Pro/Max</td>
            <td>arbiscan.io</td>
          </tr>
          <tr>
            <td>Optimism</td>
            <td>ETH</td>
            <td>Pro/Max</td>
            <td>optimistic.etherscan.io</td>
          </tr>
          <tr>
            <td>Polygon</td>
            <td>MATIC</td>
            <td>Pro/Max</td>
            <td>polygonscan.com</td>
          </tr>
          <tr>
            <td>BSC</td>
            <td>BNB</td>
            <td>Pro/Max</td>
            <td>bscscan.com</td>
          </tr>
          <tr>
            <td>Sui</td>
            <td>SUI</td>
            <td>Pro/Max</td>
            <td>suiys.com</td>
          </tr>
        </tbody>
      </table>

      <h2 id="cross-chain">Cross-Chain Analysis</h2>
      <p>
        Enter any wallet address and FundTracer will automatically detect the blockchain 
        based on the address format. For EVM-compatible chains, the system analyzes:
      </p>
      <ul>
        <li>Transaction history and patterns</li>
        <li>Token holdings across chains</li>
        <li>Bridge interactions</li>
        <li>Contract deployments</li>
      </ul>

      <h2 id="unified-view">Unified Portfolio View</h2>
      <p>
        The Multi-Chain tracker provides a unified portfolio view showing:
      </p>
      <ul>
        <li>Total portfolio value across all chains</li>
        <li>Asset distribution by chain</li>
        <li>Cross-chain transfer history</li>
        <li>Combined risk score</li>
      </ul>
    </DocsLayout>
  );
}

export default MultiChainWalletTrackerPage;
