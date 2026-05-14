/**
 * GettingStartedPage - Quick start guide for FundTracer
 * Documentation page for /docs/getting-started
 */

import React from 'react';
import { DocsPage } from './DocsPage';

const sections = [
  { id: 'overview', title: 'Overview' },
  { id: 'features', title: 'Core Features' },
  { id: 'quickstart', title: 'Quick Start' },
  { id: 'search-engine', title: 'Browser Search Engine' },
  { id: 'supported-chains', title: 'Supported Chains' },
  { id: 'authentication', title: 'Authentication' },
];

export function GettingStartedPage() {
  return (
    <DocsPage
      title="Getting Started"
      description="Learn how to use FundTracer for blockchain wallet analysis, Sybil detection, and on-chain forensics."
      sections={sections}
    >
      <h2 id="overview">Overview</h2>
      <p>
        FundTracer is a professional blockchain forensics and intelligence platform designed for 
        researchers, investors, and compliance teams. Analyze wallet addresses, detect coordinated 
        activity, trace fund flows, and assess risk across multiple blockchains.
      </p>
      <h2 id="features">Core Features</h2>
      <div className="feature-grid">
        <div className="feature-card">
          <h4>Wallet Analysis</h4>
          <p>Deep dive into any wallet address across multiple chains. View transaction history, token holdings, funding sources, and behavioral patterns.</p>
        </div>
        <div className="feature-card">
          <h4>Contract Analytics</h4>
          <p>Analyze smart contracts to understand their behavior, security, and interaction patterns.</p>
        </div>
        <div className="feature-card">
          <h4>Wallet Comparison</h4>
          <p>Compare multiple wallets side-by-side to identify connections and coordinated behaviors.</p>
        </div>
        <div className="feature-card">
          <h4>Sybil Detection</h4>
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

      <h2 id="search-engine">Browser Search Engine</h2>
      <p>
        Add FundTracer as a custom search engine in your browser for instant wallet lookups.
        Type <code>ft</code> in your address bar, press Tab, paste any wallet address or explorer URL,
        and jump straight to analysis. Works across all 10+ supported chains.
      </p>

      <div className="setup-card">
        <div className="setup-card__icon">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
            <circle cx="9" cy="9" r="5"/><path d="M13 13l6 6"/>
          </svg>
        </div>
        <div>
          <h4 style={{margin: '0 0 8px', color: 'var(--color-text-primary)'}}>Setup takes 20 seconds</h4>
          <ol className="setup-card__steps">
            <li>Open <strong>Chrome Settings → Search Engine → Manage Search Engines</strong></li>
            <li>Click <strong>Add</strong> and fill in:<br/>
              <span style={{fontSize:'0.8rem',color:'var(--color-text-muted)'}}>
                · Name: <code>FundTracer</code><br/>
                · Keyword: <code>ft</code><br/>
                · URL: <code>https://fundtracer.xyz/search?q=%s</code>
              </span>
            </li>
            <li>Click <strong>Save</strong></li>
          </ol>
          <p style={{marginTop: 8, fontSize: '0.85rem'}}>
            Now type <code>ft</code>, press Tab, paste an address like <code>0xf8a3...</code> or a full explorer
            URL like <code>https://lineascan.build/address/0xf8a3...</code>, and hit Enter — the chain is
            auto-detected from the explorer URL.
          </p>
        </div>
      </div>

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
    </DocsPage>
  );
}

export default GettingStartedPage;
