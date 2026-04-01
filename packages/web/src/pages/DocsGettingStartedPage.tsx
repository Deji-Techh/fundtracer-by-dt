/**
 * GettingStartedPage - Quick start guide for FundTracer
 * Documentation page for /docs/getting-started
 */

import React from 'react';
import { DocsLayout } from './DocsLayout';
import { 
  Wallet, 
  Shield, 
  Search, 
  GitCompare, 
  Code, 
  Terminal,
  Zap,
  ArrowRight,
  CheckCircle
} from 'lucide-react';

const sections = [
  { id: 'overview', title: 'Overview', icon: <Zap size={16} /> },
  { id: 'features', title: 'Core Features', icon: <Wallet size={16} /> },
  { id: 'quickstart', title: 'Quick Start', icon: <Zap size={16} /> },
  { id: 'supported-chains', title: 'Supported Chains', icon: <Search size={16} /> },
  { id: 'authentication', title: 'Authentication', icon: <Shield size={16} /> },
];

export function GettingStartedPage() {
  return (
    <DocsLayout
      title="Getting Started"
      description="Learn how to use FundTracer for blockchain wallet analysis, Sybil detection, and on-chain forensics."
      activeSection="overview"
      sections={sections}
    >
      <h2 id="overview">Overview</h2>
      <p>
        FundTracer is a professional blockchain forensics and intelligence platform designed for 
        researchers, investors, and compliance teams. Analyze wallet addresses, detect coordinated 
        activity, trace fund flows, and assess risk across multiple blockchains.
      </p>
      <div className="callout">
        <div className="callout-title">Free to Use</div>
        <p>FundTracer offers a free tier with 7 analyses every 4 hours. Upgrade to Pro for 25 analyses, or Max for unlimited access.</p>
      </div>

      <h2 id="features">Core Features</h2>
      <div className="feature-grid">
        <div className="feature-card">
          <h4><Wallet size={16} style={{marginRight: 8, verticalAlign: 'middle'}} />Wallet Analysis</h4>
          <p>Deep dive into any wallet address. View transaction history, token holdings, funding sources, and behavioral patterns.</p>
        </div>
        <div className="feature-card">
          <h4><Search size={16} style={{marginRight: 8, verticalAlign: 'middle'}} />Contract Analytics</h4>
          <p>Analyze smart contracts to understand their behavior, security, and interaction patterns.</p>
        </div>
        <div className="feature-card">
          <h4><GitCompare size={16} style={{marginRight: 8, verticalAlign: 'middle'}} />Wallet Comparison</h4>
          <p>Compare multiple wallets side-by-side to identify connections and coordinated behaviors.</p>
        </div>
        <div className="feature-card">
          <h4><Shield size={16} style={{marginRight: 8, verticalAlign: 'middle'}} />Sybil Detection</h4>
          <p>Identify coordinated bot networks and fake accounts using advanced clustering algorithms.</p>
        </div>
      </div>

      <h2 id="quickstart">Quick Start</h2>
      <h3>1. Enter a Wallet Address</h3>
      <p>
        Simply paste any wallet address you want to analyze into the search bar on the Intel page. 
        FundTracer supports addresses from all supported blockchains.
      </p>

      <h3>2. Select Analysis Type</h3>
      <p>
        Choose from Wallet Analysis, Contract Analytics, Wallet Comparison, or Sybil Detection. 
        Each mode provides specialized insights for different use cases.
      </p>

      <h3>3. Choose Blockchain</h3>
      <p>
        Select which blockchain network to analyze. Free users can analyze Linea, while Pro 
        and Max users have access to all supported networks.
      </p>

      <h3>4. View Results</h3>
      <p>
        Receive comprehensive analysis within seconds. View transaction timelines, funding trees, 
        risk scores, and detailed behavioral patterns.
      </p>

      <h2 id="supported-chains">Supported Chains</h2>
      <p>FundTracer supports analysis across the following blockchain networks:</p>
      <table>
        <thead>
          <tr>
            <th>Chain</th>
            <th>Native Token</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Ethereum</td>
            <td>ETH</td>
            <td>Pro/Max</td>
          </tr>
          <tr>
            <td>Linea</td>
            <td>ETH</td>
            <td>Free</td>
          </tr>
          <tr>
            <td>Base</td>
            <td>ETH</td>
            <td>Pro/Max</td>
          </tr>
          <tr>
            <td>Arbitrum</td>
            <td>ETH</td>
            <td>Pro/Max</td>
          </tr>
          <tr>
            <td>Optimism</td>
            <td>ETH</td>
            <td>Pro/Max</td>
          </tr>
          <tr>
            <td>Polygon</td>
            <td>MATIC</td>
            <td>Pro/Max</td>
          </tr>
          <tr>
            <td>BSC</td>
            <td>BNB</td>
            <td>Pro/Max</td>
          </tr>
          <tr>
            <td>Sui</td>
            <td>SUI</td>
            <td>Pro/Max</td>
          </tr>
        </tbody>
      </table>

      <h2 id="authentication">Authentication</h2>
      <p>
        FundTracer offers multiple authentication options to access advanced features and save your analysis history.
      </p>

      <h3>Sign In Methods</h3>
      <ul>
        <li><strong>Email</strong> - Sign in with your email address</li>
        <li><strong>Google</strong> - Sign in with your Google account</li>
        <li><strong>Wallet</strong> - Connect your wallet (MetaMask, WalletConnect)</li>
        <li><strong>Telegram</strong> - Sign in with Telegram for bot alerts</li>
      </ul>

      <h3>API Access</h3>
      <p>
        For programmatic access, generate API keys from your profile settings. API keys can be 
        used with the FundTracer API to integrate wallet analysis into your own applications.
      </p>

      <div className="callout">
        <div className="callout-title">Next Steps</div>
        <p>Explore the documentation for specific features:</p>
        <ul style={{margin: '8px 0 0'}}>
          <li><a href="/docs/ethereum-wallet-tracker" style={{color: 'var(--intel-cyan)'}}>Ethereum Wallet Tracker</a></li>
          <li><a href="/docs/solana-wallet-tracker" style={{color: 'var(--intel-cyan)'}}>Solana Wallet Tracker</a></li>
          <li><a href="/docs/sybil-detection" style={{color: 'var(--intel-cyan)'}}>Sybil Detection</a></li>
          <li><a href="/docs/api-reference" style={{color: 'var(--intel-cyan)'}}>API Reference</a></li>
        </ul>
      </div>
    </DocsLayout>
  );
}

export default GettingStartedPage;
