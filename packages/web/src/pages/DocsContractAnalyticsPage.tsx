/**
 * ContractAnalyticsPage - Smart contract analysis documentation
 * Documentation page for /docs/contract-analytics
 */

import React from 'react';
import { DocsPage } from './DocsPage';

const sections = [
  { id: 'overview', title: 'Overview' },
  { id: 'features', title: 'Features' },
  { id: 'how-to-use', title: 'How to Use' },
  { id: 'analysis-metrics', title: 'Analysis Metrics' },
  { id: 'use-cases', title: 'Use Cases' },
];

export function ContractAnalyticsPage() {
  return (
    <DocsPage
      title="Contract Analytics"
      description="Analyze smart contracts to understand their behavior, security, and interaction patterns."
      sections={sections}
    >
      <h2 id="overview">Overview</h2>
      <p>
        The Contract Analytics feature allows you to analyze any smart contract address and 
        understand its behavior, security profile, holder distribution, and interaction patterns. 
        This is essential for due diligence, security audits, and research.
      </p>
      <div className="callout">
        <div className="callout-title">Use Cases</div>
        <p>Research new token launches, verify contract security before interacting, and identify potential scams.</p>
      </div>

      <h2 id="features">Features</h2>
      <div className="feature-grid">
        <div className="feature-card">
          <h4><FileText size={16} style={{marginRight: 8, verticalAlign: 'middle'}} />Contract Overview</h4>
          <p>View contract creation details, contract type, and verification status.</p>
        </div>
        <div className="feature-card">
          <h4><Users size={16} style={{marginRight: 8, verticalAlign: 'middle'}} />Holder Distribution</h4>
          <p>See how tokens are distributed across wallets with rich list analysis.</p>
        </div>
        <div className="feature-card">
          <h4><TrendingUp size={16} style={{marginRight: 8, verticalAlign: 'middle'}} />Transaction Patterns</h4>
          <p>Analyze transaction patterns including buy/sell ratios and volume.</p>
        </div>
        <div className="feature-card">
          <h4><Shield size={16} style={{marginRight: 8, verticalAlign: 'middle'}} />Security Checks</h4>
          <p>Identify common security issues and contract risks.</p>
        </div>
      </div>

      <h2 id="how-to-use">How to Use</h2>
      <ol>
        <li>Navigate to the <a href="/" style={{color: 'var(--intel-cyan)'}}>Intel page</a></li>
        <li>Paste a contract address into the search bar</li>
        <li>Select "Contract Analytics" mode</li>
        <li>View detailed analysis results</li>
      </ol>

      <h3>Via API</h3>
      <pre><code>{`POST /api/analyze/contract
{
  "address": "0xA0b86a33E6441C4C4A0C6e4e3e3C3C4C4C4C4C4",
  "chain": "ethereum"
}`}</code></pre>

      <h2 id="analysis-metrics">Analysis Metrics</h2>
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Holder Count</td>
            <td>Total number of token holders</td>
          </tr>
          <tr>
            <td>Top Holders</td>
            <td>Largest wallets holding the token</td>
          </tr>
          <tr>
            <td>Concentration</td>
            <td>Percentage held by top 10 wallets</td>
          </tr>
          <tr>
            <td>Transfer Volume</td>
            <td>24h/7d/30d transfer volumes</td>
          </tr>
          <tr>
            <td>Contract Age</td>
            <td>Time since contract creation</td>
          </tr>
          <tr>
            <td>Interaction Count</td>
            <td>Total number of contract interactions</td>
          </tr>
        </tbody>
      </table>

      <h2 id="use-cases">Use Cases</h2>
      <ul>
        <li><strong>Token Research</strong> - Analyze new token before buying</li>
        <li><strong>Security Audits</strong> - Identify suspicious contract behavior</li>
        <li><strong>Whale Tracking</strong> - Monitor large holder movements</li>
        <li><strong>Market Analysis</strong> - Understand token distribution and liquidity</li>
      </ul>
    </DocsPage>
  );
}

export default ContractAnalyticsPage;
