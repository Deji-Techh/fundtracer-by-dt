/**
 * FundingTreeAnalysisPage - Funding tree documentation
 * Documentation page for /docs/funding-tree-analysis
 */

import React from 'react';
import { DocsPage } from './DocsPage';

const sections = [
  { id: 'overview', title: 'Overview' },
  { id: 'how-it-works', title: 'How It Works' },
  { id: 'visualization', title: 'Visualization' },
  { id: 'interpretation', title: 'Interpreting Results' },
];

export function FundingTreeAnalysisPage() {
  return (
    <DocsPage
      title="Funding Tree Analysis"
      description="Visualize and trace fund flows between wallets with interactive tree visualization."
      sections={sections}
    >
      <h2 id="overview">Overview</h2>
      <p>
        The Funding Tree feature visualizes the flow of funds into and out of a wallet. 
        It shows where funds came from (sources) and where they went (destinations), helping 
        you trace the origin of assets and understand transaction patterns.
      </p>
      <div className="callout">
        <div className="callout-title">Key Features</div>
        <p>Interactive D3-powered visualization with entity type detection and suspicious activity flags.</p>
      </div>

      <h2 id="how-it-works">How It Works</h2>
      <p>
        The Funding Tree analysis works by:
      </p>
      <ol>
        <li>Starting from a target wallet address</li>
        <li>Fetching incoming transactions (sources) and outgoing transactions (destinations)</li>
        <li>Categorizing each entity by type (CEX, DEX, Bridge, Wallet, Contract, Mixer)</li>
        <li>Building a tree visualization showing fund flow</li>
        <li>Calculating suspicious scores based on patterns</li>
      </ol>

      <h2 id="visualization">Visualization</h2>
      <p>
        The Funding Tree uses D3.js to render an interactive visualization with the following features:
      </p>
      <ul>
        <li><strong>Zoom and Pan</strong> - Navigate large fund flows easily</li>
        <li><strong>Entity Colors</strong> - Different colors for CEX, DEX, Bridges, Mixers, Contracts, and Wallets</li>
        <li><strong>Depth Control</strong> - Configure how many levels deep to trace</li>
        <li><strong>Click to Expand</strong> - Click any node to see more details</li>
      </ul>

      <h2 id="interpretation">Interpreting Results</h2>
      <table>
        <thead>
          <tr>
            <th>Entity Type</th>
            <th>Color</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>CEX (Centralized Exchange)</td>
            <td>Amber/Orange</td>
            <td>Known exchange addresses</td>
          </tr>
          <tr>
            <td>DEX (Decentralized Exchange)</td>
            <td>Purple</td>
            <td>DEX pools and routers</td>
          </tr>
          <tr>
            <td>Bridge</td>
            <td>Cyan</td>
            <td>Cross-chain bridges</td>
          </tr>
          <tr>
            <td>Mixer</td>
            <td>Pink/Red</td>
            <td>Privacy mixers (high risk)</td>
          </tr>
          <tr>
            <td>Contract</td>
            <td>Indigo</td>
            <td>Smart contracts</td>
          </tr>
          <tr>
            <td>Wallet</td>
            <td>Green</td>
            <td>Regular wallet addresses</td>
          </tr>
        </tbody>
      </table>
    </DocsPage>
  );
}

export default FundingTreeAnalysisPage;
