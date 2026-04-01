/**
 * EthereumWalletTrackerPage - Ethereum wallet analysis documentation
 * Documentation page for /docs/ethereum-wallet-tracker
 */

import React from 'react';
import { DocsLayout } from './DocsLayout';
import { Wallet, Search, TrendingUp, Shield, Clock, DollarSign } from 'lucide-react';

const sections = [
  { id: 'overview', title: 'Overview', icon: <Wallet size={16} /> },
  { id: 'features', title: 'Features', icon: <Search size={16} /> },
  { id: 'how-to-use', title: 'How to Use', icon: <Search size={16} /> },
  { id: 'response-format', title: 'Response Format', icon: <TrendingUp size={16} /> },
  { id: 'use-cases', title: 'Use Cases', icon: <Shield size={16} /> },
];

export function EthereumWalletTrackerPage() {
  return (
    <DocsLayout
      title="Ethereum Wallet Tracker"
      description="Learn how to analyze Ethereum wallet addresses, view transaction history, and assess wallet behavior."
      activeSection="overview"
      sections={sections}
    >
      <h2 id="overview">Overview</h2>
      <p>
        The Ethereum Wallet Tracker allows you to analyze any Ethereum wallet address and 
        get comprehensive insights into its transaction history, token holdings, funding sources, 
        and behavioral patterns.
      </p>
      <div className="callout">
        <div className="callout-title">Availability</div>
        <p>Ethereum analysis is available for Pro and Max tier users. Free tier users can analyze Linea.</p>
      </div>

      <h2 id="features">Features</h2>
      <div className="feature-grid">
        <div className="feature-card">
          <h4><Clock size={16} style={{marginRight: 8, verticalAlign: 'middle'}} />Transaction History</h4>
          <p>View complete transaction timeline with details including amounts, timestamps, and counterparties.</p>
        </div>
        <div className="feature-card">
          <h4><DollarSign size={16} style={{marginRight: 8, verticalAlign: 'middle'}} />Token Holdings</h4>
          <p>See all ERC-20 token holdings with current values in USD.</p>
        </div>
        <div className="feature-card">
          <h4><TrendingUp size={16} style={{marginRight: 8, verticalAlign: 'middle'}} />Portfolio Analysis</h4>
          <p>Understand portfolio composition, including DeFi positions and NFT holdings.</p>
        </div>
        <div className="feature-card">
          <h4><Shield size={16} style={{marginRight: 8, verticalAlign: 'middle'}} />Risk Assessment</h4>
          <p>Get risk scores based on transaction patterns and interaction history.</p>
        </div>
      </div>

      <h2 id="how-to-use">How to Use</h2>
      <h3>Via Web Interface</h3>
      <ol>
        <li>Navigate to the <a href="/" style={{color: 'var(--intel-cyan)'}}>Intel page</a></li>
        <li>Paste an Ethereum wallet address (0x...) into the search bar</li>
        <li>Select "Ethereum" as the blockchain</li>
        <li>Click "Analyze" to get wallet insights</li>
      </ol>

      <h3>Via API</h3>
      <pre><code>{`POST /api/analyze/wallet
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1",
  "chain": "ethereum"
}`}</code></pre>

      <h2 id="response-format">Response Format</h2>
      <p>The wallet analysis returns comprehensive data including:</p>
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
            <td>Native ETH balance</td>
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
            <td>labels</td>
            <td>string[]</td>
            <td>Wallet labels (whale, early-adopter, etc.)</td>
          </tr>
          <tr>
            <td>transactions</td>
            <td>array</td>
            <td>Recent transactions</td>
          </tr>
        </tbody>
      </table>

      <h2 id="use-cases">Use Cases</h2>
      <ul>
        <li><strong>Due Diligence</strong> - Research wallet addresses before transactions</li>
        <li><strong>Investment Research</strong> - Follow whale wallet movements</li>
        <li><strong>Compliance</strong> - Verify source of funds</li>
        <li><strong>Competitive Intelligence</strong> - Track competitor wallet activity</li>
      </ul>

      <h2 id="use-cases">Related Documentation</h2>
      <ul>
        <li><a href="/docs/multi-chain-wallet-tracker" style={{color: 'var(--intel-cyan)'}}>Multi-Chain Wallet Tracker</a> - Analyze across all chains</li>
        <li><a href="/docs/wallet-risk-score" style={{color: 'var(--intel-cyan)'}}>Wallet Risk Score</a> - Understand risk scoring</li>
        <li><a href="/docs/funding-tree-analysis" style={{color: 'var(--intel-cyan)'}}>Funding Tree Analysis</a> - Trace fund sources</li>
      </ul>
    </DocsLayout>
  );
}

export default EthereumWalletTrackerPage;
