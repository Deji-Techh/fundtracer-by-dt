/**
 * SolanaWalletTrackerPage - Solana wallet analysis documentation
 * Documentation page for /docs/solana-wallet-tracker
 */

import React from 'react';
import { Clock, TrendingUp, DollarSign, Shield } from 'lucide-react';
import { DocsPage } from './DocsPage';

const sections = [
  { id: 'overview', title: 'Overview' },
  { id: 'features', title: 'Features' },
  { id: 'how-to-use', title: 'How to Use' },
  { id: 'response-format', title: 'Response Format' },
  { id: 'use-cases', title: 'Use Cases' },
];

export function SolanaWalletTrackerPage() {
  return (
    <DocsPage
      title="Solana Wallet Tracker"
      description="Learn how to analyze Solana wallet addresses, view transaction history, and track SPL token holdings."
      sections={sections}
    >
      <h2 id="overview">Overview</h2>
      <p>
        The Solana Wallet Tracker allows you to analyze any Solana wallet address and get 
        comprehensive insights into its transaction history, SPL token holdings, NFT collections, 
        and behavioral patterns on the Solana blockchain.
      </p>
      <div className="callout">
        <div className="callout-title">Availability</div>
        <p>Solana analysis is available for Pro and Max tier users.</p>
      </div>

      <h2 id="features">Features</h2>
      <div className="feature-grid">
        <div className="feature-card">
          <h4><Clock size={16} style={{marginRight: 8, verticalAlign: 'middle'}} />Transaction History</h4>
          <p>View complete transaction timeline including SPL transfers, NFT mints, and program interactions.</p>
        </div>
        <div className="feature-card">
          <h4><DollarSign size={16} style={{marginRight: 8, verticalAlign: 'middle'}} />SPL Token Holdings</h4>
          <p>See all SPL token holdings with current values in USD.</p>
        </div>
        <div className="feature-card">
          <h4><TrendingUp size={16} style={{marginRight: 8, verticalAlign: 'middle'}} />NFT Analysis</h4>
          <p>Track NFT holdings, mint history, and collection interactions.</p>
        </div>
        <div className="feature-card">
          <h4><Shield size={16} style={{marginRight: 8, verticalAlign: 'middle'}} />Risk Assessment</h4>
          <p>Get risk scores based on transaction patterns and program interactions.</p>
        </div>
      </div>

      <h2 id="how-to-use">How to Use</h2>
      <h3>Via Web Interface</h3>
      <ol>
        <li>Navigate to the <a href="/" style={{color: 'var(--intel-cyan)'}}>Intel page</a></li>
        <li>Paste a Solana wallet address into the search bar</li>
        <li>Select "Solana" as the blockchain</li>
        <li>Click "Analyze" to get wallet insights</li>
      </ol>

      <h3>Via API</h3>
      <pre><code>{`POST /api/analyze/wallet
{
  "address": "7xKXtg2CW87d97TXJSDpbD5jBkvT5zC6QviJNDmvb7q",
  "chain": "solana"
}`}</code></pre>

      <h2 id="response-format">Response Format</h2>
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>address</td>
            <td>string</td>
            <td>The analyzed wallet address</td>
          </tr>
          <tr>
            <td>balance</td>
            <td>string</td>
            <td>Native SOL balance</td>
          </tr>
          <tr>
            <td>balanceUSD</td>
            <td>number</td>
            <td>Balance in USD</td>
          </tr>
          <tr>
            <td>riskScore</td>
            <td>number</td>
            <td>Risk score 0-100</td>
          </tr>
          <tr>
            <td>tokens</td>
            <td>array</td>
            <td>SPL token holdings</td>
          </tr>
          <tr>
            <td>nfts</td>
            <td>array</td>
            <td>NFT holdings</td>
          </tr>
        </tbody>
      </table>

      <h2 id="use-cases">Use Cases</h2>
      <ul>
        <li><strong>NFT Research</strong> - Track whale NFT collectors and traders</li>
        <li><strong>DeFi Analysis</strong> - Monitor Solana DeFi protocol activity</li>
        <li><strong>Airdrop Tracking</strong> - Identify potential airdrop farmers</li>
        <li><strong>Security Research</strong> - Investigate suspicious wallet activity</li>
      </ul>
    </DocsPage>
  );
}

export default SolanaWalletTrackerPage;
