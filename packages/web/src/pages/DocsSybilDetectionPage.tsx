/**
 * SybilDetectionPage - Sybil detection documentation
 * Documentation page for /docs/sybil-detection
 */

import React from 'react';
import { DocsLayout } from './DocsLayout';
import { Shield, Search, Network, Users, AlertTriangle } from 'lucide-react';

const sections = [
  { id: 'overview', title: 'Overview', icon: <Shield size={16} /> },
  { id: 'how-it-works', title: 'How It Works', icon: <Search size={16} /> },
  { id: 'detection-methods', title: 'Detection Methods', icon: <Network size={16} /> },
  { id: 'interpretation', title: 'Interpreting Results', icon: <Users size={16} /> },
];

export function SybilDetectionPage() {
  return (
    <DocsLayout
      title="Sybil Detection"
      description="Identify coordinated bot networks and fake accounts using advanced clustering algorithms."
      activeSection="overview"
      sections={sections}
    >
      <h2 id="overview">Overview</h2>
      <p>
        Sybil detection identifies coordinated bot networks and fake accounts by analyzing 
        transaction patterns, funding sources, and behavioral similarities across multiple 
        wallet addresses. This is critical for airdrop hunting, governance voting analysis, 
        and fraud detection.
      </p>
      <div className="callout">
        <div className="callout-title">Use Cases</div>
        <p>Detect airdrop farmers, identify fake volume, and analyze governance manipulation.</p>
      </div>

      <h2 id="how-it-works">How It Works</h2>
      <p>
        FundTracer uses multiple detection methods to identify Sybil wallets:
      </p>
      <ol>
        <li>Collect a list of wallet addresses to analyze</li>
        <li>Fetch transaction history for each address</li>
        <li>Apply clustering algorithms to find related wallets</li>
        <li>Score each cluster based on suspicious patterns</li>
        <li>Generate a detailed report with findings</li>
      </ol>

      <h2 id="detection-methods">Detection Methods</h2>
      <div className="feature-grid">
        <div className="feature-card">
          <h4><AlertTriangle size={16} style={{marginRight: 8, verticalAlign: 'middle'}} />Same-Block Detection</h4>
          <p>Identifies wallets that execute transactions in the same block, often indicating bots.</p>
        </div>
        <div className="feature-card">
          <h4><Network size={16} style={{marginRight: 8, verticalAlign: 'middle'}} />Funding Clustering</h4>
          <p>Groups wallets that share common funding sources.</p>
        </div>
        <div className="feature-card">
          <h4><Users size={16} style={{marginRight: 8, verticalAlign: 'middle'}} />Behavior Analysis</h4>
          <p>Identifies similar behavioral patterns across multiple wallets.</p>
        </div>
        <div className="feature-card">
          <h4><Shield size={16} style={{marginRight: 8, verticalAlign: 'middle'}} />Similarity Scoring</h4>
          <p>Calculates similarity scores based on multiple factors.</p>
        </div>
      </div>

      <h2 id="interpretation">Interpreting Results</h2>
      <p>Each wallet receives a risk score based on the analysis:</p>
      <table>
        <thead>
          <tr>
            <th>Score Range</th>
            <th>Risk Level</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>80-100</td>
            <td>Critical</td>
            <td>High likelihood of Sybil activity</td>
          </tr>
          <tr>
            <td>60-79</td>
            <td>High Risk</td>
            <td>Multiple suspicious indicators</td>
          </tr>
          <tr>
            <td>40-59</td>
            <td>Medium Risk</td>
            <td>Some suspicious patterns detected</td>
          </tr>
          <tr>
            <td>0-39</td>
            <td>Low Risk</td>
            <td>Minimal indicators of Sybil activity</td>
          </tr>
        </tbody>
      </table>
    </DocsLayout>
  );
}

export default SybilDetectionPage;
