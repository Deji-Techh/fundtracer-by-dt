import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Code, Copy, Check, ExternalLink, Key, Zap, Shield, Database, Clock, GitBranch, Book, Hash, DollarSign, AlertTriangle, CheckCircle, ArrowRight, FileText } from 'lucide-react';
import { LandingLayout } from '../design-system/layouts/LandingLayout';
import './ApiDocsPage.css';

const navItems = [
  { label: 'About', href: '/about' },
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'FAQ', href: '/faq' },
  { label: 'API', href: '/api-docs' },
  { label: 'CLI', href: '/cli' },
];

export function ApiDocsPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('introduction');

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const sections = [
    { id: 'introduction', label: 'Introduction', icon: <Book size={18} /> },
    { id: 'authentication', label: 'Authentication', icon: <Key size={18} /> },
    { id: 'endpoints', label: 'Endpoints', icon: <Code size={18} /> },
    { id: 'chains', label: 'Supported Chains', icon: <Database size={18} /> },
    { id: 'responses', label: 'Response Format', icon: <FileText size={18} /> },
    { id: 'errors', label: 'Error Handling', icon: <AlertTriangle size={18} /> },
    { id: 'rate-limits', label: 'Rate Limits', icon: <Clock size={18} /> },
    { id: 'examples', label: 'Code Examples', icon: <Zap size={18} /> },
  ];

  const copyBtn = (text: string, id: string) => (
    <button 
      className="api-copy-btn"
      onClick={() => handleCopy(text, id)}
    >
      {copied === id ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
    </button>
  );

  return (
    <LandingLayout navItems={navItems} showSearch={false}>
      <div className="api-docs-page">
        <div className="api-docs-container">
          <motion.div 
            className="api-docs-header"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1>FundTracer API Documentation</h1>
            <p>Complete reference guide for integrating blockchain intelligence into your applications</p>
            <a href="/api/keys" className="get-started-btn">
              Get API Key
              <ArrowRight size={18} />
            </a>
          </motion.div>

          <div className="api-docs-layout">
            <nav className="api-docs-sidebar">
              {sections.map((section) => (
                <button
                  key={section.id}
                  className={`sidebar-link ${activeSection === section.id ? 'active' : ''}`}
                  onClick={() => setActiveSection(section.id)}
                >
                  {section.icon}
                  <span>{section.label}</span>
                </button>
              ))}
            </nav>

            <div className="api-docs-content">
              {activeSection === 'introduction' && (
                <motion.div 
                  className="docs-section"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <h2>Introduction</h2>
                  <p className="section-intro">
                    The FundTracer API provides programmatic access to blockchain analytics data across multiple chains. 
                    Build powerful applications that trace wallet funding sources, analyze transaction patterns, 
                    detect Sybil attacks, and visualize fund flows.
                  </p>

                  <div className="docs-features">
                    <div className="docs-feature">
                      <div className="feature-icon"><Zap size={24} /></div>
                      <div>
                        <h3>Real-time Analysis</h3>
                        <p>Get instant wallet analysis with transaction history, balances, and risk scores</p>
                      </div>
                    </div>
                    <div className="docs-feature">
                      <div className="feature-icon"><GitBranch size={24} /></div>
                      <div>
                        <h3>Funding Trees</h3>
                        <p>Visualize complete funding flows showing where every token originated</p>
                      </div>
                    </div>
                    <div className="docs-feature">
                      <div className="feature-icon"><Shield size={24} /></div>
                      <div>
                        <h3>Risk Detection</h3>
                        <p>Identify suspicious activity patterns and Sybil attack networks</p>
                      </div>
                    </div>
                    <div className="docs-feature">
                      <div className="feature-icon"><Database size={24} /></div>
                      <div>
                        <h3>Multi-Chain Support</h3>
                        <p>Query across 7+ major blockchain networks from a single API</p>
                      </div>
                    </div>
                  </div>

                  <h3>Base URL</h3>
                  <div className="api-code-block">
                    <code>https://fundtracer.xyz/api</code>
                    {copyBtn('https://fundtracer.xyz/api', 'base-url')}
                  </div>
                </motion.div>
              )}

              {activeSection === 'authentication' && (
                <motion.div 
                  className="docs-section"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <h2>Authentication</h2>
                  <p className="section-intro">
                    All API requests require authentication using an API key. Include your API key in the Authorization header.
                  </p>

                  <h3>Authorization Header</h3>
                  <div className="api-code-block">
                    <pre><code>Authorization: Bearer ft_live_YOUR_API_KEY</code></pre>
                    {copyBtn('Authorization: Bearer ft_live_YOUR_API_KEY', 'auth-header')}
                  </div>

                  <h3>Alternative: X-API-Key Header</h3>
                  <div className="api-code-block">
                    <pre><code>X-API-Key: ft_live_YOUR_API_KEY</code></pre>
                    {copyBtn('X-API-Key: ft_live_YOUR_API_KEY', 'api-key-header')}
                  </div>

                  <h3>API Key Types</h3>
                  <div className="key-types-grid">
                    <div className="key-type-card live">
                      <h4>Live Keys</h4>
                      <code>ft_live_...</code>
                      <p>For production applications. Count against your rate limits.</p>
                    </div>
                    <div className="key-type-card test">
                      <h4>Test Keys</h4>
                      <code>ft_test_...</code>
                      <p>For development and testing. Don't count against limits.</p>
                    </div>
                  </div>

                  <div className="note-box">
                    <AlertTriangle size={18} />
                    <p>Never expose your API keys in client-side code or public repositories. Use environment variables.</p>
                  </div>
                </motion.div>
              )}

              {activeSection === 'endpoints' && (
                <motion.div 
                  className="docs-section"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <h2>API Endpoints</h2>
                  <p className="section-intro">
                    All endpoints use POST method and accept JSON request bodies. Authentication is required for all endpoints.
                  </p>

                  <div className="endpoint-docs">
                    <div className="endpoint-item">
                      <div className="endpoint-header">
                        <span className="method post">POST</span>
                        <code>/analyze/wallet</code>
                      </div>
                      <p>Get comprehensive wallet analysis including balance, transactions, risk score, and labels.</p>
                      <h4>Request Body</h4>
                      <div className="api-code-block">
                        <pre><code>{`{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1",
  "chain": "ethereum",
  "options": {
    "limit": 100,
    "offset": 0
  }
}`}</code></pre>
                        {copyBtn(`{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1",
  "chain": "ethereum",
  "options": {
    "limit": 100,
    "offset": 0
  }
}`, 'wallet-request')}
                      </div>
                      <h4>Parameters</h4>
                      <table className="params-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><code>address</code></td>
                            <td>string</td>
                            <td>Wallet address (0x... format)</td>
                          </tr>
                          <tr>
                            <td><code>chain</code></td>
                            <td>string</td>
                            <td>Blockchain: ethereum, linea, arbitrum, base, optimism, polygon, bsc</td>
                          </tr>
                          <tr>
                            <td><code>options.limit</code></td>
                            <td>number</td>
                            <td>Number of transactions (default: 100, max: 500)</td>
                          </tr>
                          <tr>
                            <td><code>options.offset</code></td>
                            <td>number</td>
                            <td>Pagination offset (default: 0)</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="endpoint-item">
                      <div className="endpoint-header">
                        <span className="method post">POST</span>
                        <code>/analyze/funding-tree</code>
                      </div>
                      <p>Get funding flow graph showing sources and destinations of funds.</p>
                      <h4>Request Body</h4>
                      <div className="api-code-block">
                        <pre><code>{`{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1",
  "chain": "ethereum",
  "options": {
    "treeConfig": {
      "maxDepth": 3
    }
  }
}`}</code></pre>
                        {copyBtn(`{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1",
  "chain": "ethereum",
  "options": {
    "treeConfig": {
      "maxDepth": 3
    }
  }
}`, 'tree-request')}
                      </div>
                      <h4>Parameters</h4>
                      <table className="params-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><code>address</code></td>
                            <td>string</td>
                            <td>Wallet address to trace</td>
                          </tr>
                          <tr>
                            <td><code>chain</code></td>
                            <td>string</td>
                            <td>Blockchain network</td>
                          </tr>
                          <tr>
                            <td><code>options.treeConfig.maxDepth</code></td>
                            <td>number</td>
                            <td>Trace depth (1-5, default: 3)</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="endpoint-item">
                      <div className="endpoint-header">
                        <span className="method post">POST</span>
                        <code>/analyze/compare</code>
                      </div>
                      <p>Compare multiple wallets to find shared interactions and connections.</p>
                      <h4>Request Body</h4>
                      <div className="api-code-block">
                        <pre><code>{`{
  "addresses": [
    "0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1",
    "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
  ],
  "chain": "ethereum"
}`}</code></pre>
                        {copyBtn(`{
  "addresses": [
    "0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1",
    "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
  ],
  "chain": "ethereum"
}`, 'compare-request')}
                      </div>
                    </div>

                    <div className="endpoint-item">
                      <div className="endpoint-header">
                        <span className="method post">POST</span>
                        <code>/analyze/sybil</code>
                      </div>
                      <p>Detect Sybil attack patterns and coordinated behavior.</p>
                      <h4>Request Body</h4>
                      <div className="api-code-block">
                        <pre><code>{`{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1",
  "chain": "ethereum"
}`}</code></pre>
                      </div>
                    </div>

                    <div className="endpoint-item">
                      <div className="endpoint-header">
                        <span className="method post">POST</span>
                        <code>/analyze/contract</code>
                      </div>
                      <p>Analyze smart contracts and their interactions.</p>
                      <h4>Request Body</h4>
                      <div className="api-code-block">
                        <pre><code>{`{
  "contractAddress": "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
  "chain": "ethereum",
  "options": {
    "maxInteractors": 50,
    "analyzeFunding": true
  }
}`}</code></pre>
                      </div>
                    </div>

                    <div className="endpoint-item">
                      <div className="endpoint-header">
                        <span className="method post">POST</span>
                        <code>/contracts/info</code>
                      </div>
                      <p>Look up contract information and metadata.</p>
                      <h4>Request Body</h4>
                      <div className="api-code-block">
                        <pre><code>{`{
  "address": "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
  "chain": "ethereum"
}`}</code></pre>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeSection === 'chains' && (
                <motion.div 
                  className="docs-section"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <h2>Supported Chains</h2>
                  <p className="section-intro">
                    The FundTracer API supports multiple blockchain networks. Use the chain identifier in your requests.
                  </p>

                  <div className="chains-grid">
                    <div className="chain-card">
                      <div className="chain-icon ethereum" />
                      <h4>Ethereum</h4>
                      <code>ethereum</code>
                    </div>
                    <div className="chain-card">
                      <div className="chain-icon linea" />
                      <h4>Linea</h4>
                      <code>linea</code>
                    </div>
                    <div className="chain-card">
                      <div className="chain-icon arbitrum" />
                      <h4>Arbitrum</h4>
                      <code>arbitrum</code>
                    </div>
                    <div className="chain-card">
                      <div className="chain-icon base" />
                      <h4>Base</h4>
                      <code>base</code>
                    </div>
                    <div className="chain-card">
                      <div className="chain-icon optimism" />
                      <h4>Optimism</h4>
                      <code>optimism</code>
                    </div>
                    <div className="chain-card">
                      <div className="chain-icon polygon" />
                      <h4>Polygon</h4>
                      <code>polygon</code>
                    </div>
                    <div className="chain-card">
                      <div className="chain-icon bsc" />
                      <h4>BNB Chain</h4>
                      <code>bsc</code>
                    </div>
                  </div>

                  <h3>Example Usage</h3>
                  <div className="api-code-block">
                    <pre><code>{`// Ethereum wallet
{ "chain": "ethereum", "address": "0x742d..." }

// Linea wallet
{ "chain": "linea", "address": "0x742d..." }

// Arbitrum wallet
{ "chain": "arbitrum", "address": "0x742d..." }`}</code></pre>
                    {copyBtn(`"chain": "ethereum"`, 'chain-example')}
                  </div>
                </motion.div>
              )}

              {activeSection === 'responses' && (
                <motion.div 
                  className="docs-section"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <h2>Response Format</h2>
                  <p className="section-intro">
                    All API responses follow a consistent JSON structure.
                  </p>

                  <h3>Success Response</h3>
                  <div className="api-code-block">
                    <pre><code>{`{
  "success": true,
  "result": {
    // Response data here
  },
  "usageRemaining": 95
}`}</code></pre>
                    {copyBtn(`{
  "success": true,
  "result": {},
  "usageRemaining": 95
}`, 'success-response')}
                  </div>

                  <h3>Rate Limit Headers</h3>
                  <p>Every response includes headers showing your current rate limit status:</p>
                  <div className="api-code-block">
                    <pre><code>{`X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000`}</code></pre>
                    {copyBtn(`X-RateLimit-Limit: 100`, 'rate-headers')}
                  </div>

                  <h3>Wallet Analysis Response</h3>
                  <div className="api-code-block">
                    <pre><code>{`{
  "success": true,
  "result": {
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1",
    "chain": "ethereum",
    "balance": "1.2345 ETH",
    "balanceRaw": 1234500000000000000,
    "transactionCount": 156,
    "firstTransaction": "2021-05-12T10:30:00Z",
    "lastTransaction": "2024-01-15T14:22:33Z",
    "riskScore": 25,
    "labels": ["DeFi User", "NFT Trader"],
    "tokens": [...],
    "transactions": [...]
  },
  "usageRemaining": 94
}`}</code></pre>
                  </div>
                </motion.div>
              )}

              {activeSection === 'errors' && (
                <motion.div 
                  className="docs-section"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <h2>Error Handling</h2>
                  <p className="section-intro">
                    The API uses standard HTTP status codes and returns detailed error messages.
                  </p>

                  <h3>Error Response Format</h3>
                  <div className="api-code-block">
                    <pre><code>{`{
  "success": false,
  "error": "Error message here",
  "code": "ERROR_CODE"
}`}</code></pre>
                    {copyBtn(`{
  "success": false,
  "error": "",
  "code": ""
}`, 'error-response')}
                  </div>

                  <h3>HTTP Status Codes</h3>
                  <table className="params-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Meaning</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><code>200</code></td>
                        <td className="success">Success</td>
                        <td>Request completed successfully</td>
                      </tr>
                      <tr>
                        <td><code>400</code></td>
                        <td className="error">Bad Request</td>
                        <td>Invalid request parameters</td>
                      </tr>
                      <tr>
                        <td><code>401</code></td>
                        <td className="error">Unauthorized</td>
                        <td>Invalid or missing API key</td>
                      </tr>
                      <tr>
                        <td><code>403</code></td>
                        <td className="error">Forbidden</td>
                        <td>API key revoked or rate limit exceeded</td>
                      </tr>
                      <tr>
                        <td><code>429</code></td>
                        <td className="error">Too Many Requests</td>
                        <td>Rate limit exceeded, slow down</td>
                      </tr>
                      <tr>
                        <td><code>500</code></td>
                        <td className="error">Server Error</td>
                        <td>Something went wrong on our end</td>
                      </tr>
                    </tbody>
                  </table>

                  <h3>Common Error Codes</h3>
                  <table className="params-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><code>KEY_INVALID</code></td>
                        <td>API key is invalid or not found</td>
                      </tr>
                      <tr>
                        <td><code>KEY_REVOKED</code></td>
                        <td>API key has been revoked</td>
                      </tr>
                      <tr>
                        <td><code>RATE_LIMITED</code></td>
                        <td>Too many requests, wait and retry</td>
                      </tr>
                      <tr>
                        <td><code>INVALID_ADDRESS</code></td>
                        <td>Wallet address format is invalid</td>
                      </tr>
                      <tr>
                        <td><code>UNSUPPORTED_CHAIN</code></td>
                        <td>Chain not supported</td>
                      </tr>
                      <tr>
                        <td><code>ADDRESS_NOT_FOUND</code></td>
                        <td>No data found for this address</td>
                      </tr>
                    </tbody>
                  </table>
                </motion.div>
              )}

              {activeSection === 'rate-limits' && (
                <motion.div 
                  className="docs-section"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <h2>Rate Limits</h2>
                  <p className="section-intro">
                    Rate limits ensure fair usage and protect the API from abuse.
                  </p>

                  <div className="rate-limits-grid">
                    <div className="rate-limit-card">
                      <div className="rate-limit-icon"><Zap size={24} /></div>
                      <h3>100 requests</h3>
                      <p>per minute</p>
                    </div>
                    <div className="rate-limit-card">
                      <div className="rate-limit-icon"><Clock size={24} /></div>
                      <h3>1,000 requests</h3>
                      <p>per hour</p>
                    </div>
                    <div className="rate-limit-card">
                      <div className="rate-limit-icon"><DollarSign size={24} /></div>
                      <h3>Unlimited</h3>
                      <p>with paid plans</p>
                    </div>
                  </div>

                  <div className="note-box success">
                    <CheckCircle size={18} />
                    <p>Test keys (ft_test_...) do not count against rate limits. Use them for development.</p>
                  </div>

                  <h3>Checking Your Rate Limit</h3>
                  <p>Use the response headers to monitor your usage:</p>
                  <div className="api-code-block">
                    <pre><code>{`// Check these headers in every response
X-RateLimit-Limit: 100      // Your limit per window
X-RateLimit-Remaining: 95  // Requests remaining
X-RateLimit-Reset: 1640000060  // Unix timestamp when limit resets`}</code></pre>
                    {copyBtn(`X-RateLimit-Remaining: 95`, 'rate-usage')}
                  </div>
                </motion.div>
              )}

              {activeSection === 'examples' && (
                <motion.div 
                  className="docs-section"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <h2>Code Examples</h2>
                  <p className="section-intro">
                    Ready-to-use code snippets for integrating the FundTracer API.
                  </p>

                  <h3>JavaScript / Node.js</h3>
                  <div className="api-code-block">
                    <pre><code>{`const response = await fetch(
  'https://fundtracer.xyz/api/analyze/wallet',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ft_live_YOUR_API_KEY'
    },
    body: JSON.stringify({
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1',
      chain: 'ethereum'
    })
  }
);

const data = await response.json();
console.log(data.result);`}</code></pre>
                    {copyBtn(`const response = await fetch(
  'https://fundtracer.xyz/api/analyze/wallet',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ft_live_YOUR_API_KEY'
    },
    body: JSON.stringify({
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1',
      chain: 'ethereum'
    })
  }
);

const data = await response.json();
console.log(data.result);`, 'js-example')}
                  </div>

                  <h3>Python</h3>
                  <div className="api-code-block">
                    <pre><code>{`import requests

response = requests.post(
    'https://fundtracer.xyz/api/analyze/wallet',
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ft_live_YOUR_API_KEY'
    },
    json={
        'address': '0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1',
        'chain': 'ethereum'
    }
)

data = response.json()
print(data['result'])`}</code></pre>
                    {copyBtn(`import requests

response = requests.post(
    'https://fundtracer.xyz/api/analyze/wallet',
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ft_live_YOUR_API_KEY'
    },
    json={
        'address': '0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1',
        'chain': 'ethereum'
    }
)

data = response.json()
print(data['result'])`, 'python-example')}
                  </div>

                  <h3>cURL</h3>
                  <div className="api-code-block">
                    <pre><code>{`curl -X POST "https://fundtracer.xyz/api/analyze/wallet" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ft_live_YOUR_API_KEY" \\
  -d '{"address": "0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1", "chain": "ethereum"}'`}</code></pre>
                    {copyBtn(`curl -X POST "https://fundtracer.xyz/api/analyze/wallet" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ft_live_YOUR_API_KEY" \\
  -d '{"address": "0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1", "chain": "ethereum"}'`, 'curl-example')}
                  </div>
                </motion.div>
              )}

              <div className="docs-cta">
                <h3>Ready to Start?</h3>
                <p>Get your API key and start building in minutes.</p>
                <a href="/api/keys" className="cta-btn">
                  Get API Key
                  <ArrowRight size={18} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LandingLayout>
  );
}

export default ApiDocsPage;
