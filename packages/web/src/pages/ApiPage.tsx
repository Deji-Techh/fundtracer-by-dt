import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Code, Copy, Check, ExternalLink, Key, Zap, Shield, Database, Clock, GitBranch } from 'lucide-react';
import { LandingLayout } from '../design-system/layouts/LandingLayout';
import './ApiPage.css';

const navItems = [
  { label: 'About', href: '/about' },
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'FAQ', href: '/faq' },
  { label: 'API', href: '/api-docs', active: true },
  { label: 'CLI', href: '/cli' },
];

export function ApiPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const codeExamples: Record<string, { curl: string; js: string; python: string }> = {
    wallet: {
      curl: `curl -X POST "https://fundtracer.xyz/api/analyze/wallet" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ft_live_YOUR_API_KEY" \\
  -d '{"address": "0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1", "chain": "ethereum"}'`,
      js: `const response = await fetch(
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
const data = await response.json();`,
      python: `import requests

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
data = response.json()`,
    },
    fundingTree: {
      curl: `curl -X POST "https://fundtracer.xyz/api/analyze/funding-tree" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ft_live_YOUR_API_KEY" \\
  -d '{"address": "0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1", "chain": "ethereum", "options": {"treeConfig": {"maxDepth": 3}}}"'`,
      js: `const response = await fetch(
  'https://fundtracer.xyz/api/analyze/funding-tree',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ft_live_YOUR_API_KEY'
    },
    body: JSON.stringify({
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1',
      chain: 'ethereum',
      options: { treeConfig: { maxDepth: 3 } }
    })
  }
);
const data = await response.json();`,
      python: `import requests

response = requests.post(
    'https://fundtracer.xyz/api/analyze/funding-tree',
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ft_live_YOUR_API_KEY'
    },
    json={
        'address': '0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1',
        'chain': 'ethereum',
        'options': {'treeConfig': {'maxDepth': 3}}
    }
)
data = response.json()`,
    },
    compare: {
      curl: `curl -X POST "https://fundtracer.xyz/api/analyze/compare" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ft_live_YOUR_API_KEY" \\
  -d '{"addresses": ["0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1", "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"], "chain": "ethereum"}'`,
      js: `const response = await fetch(
  'https://fundtracer.xyz/api/analyze/compare',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ft_live_YOUR_API_KEY'
    },
    body: JSON.stringify({
      addresses: [
        '0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1',
        '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
      ],
      chain: 'ethereum'
    })
  }
);
const data = await response.json();`,
      python: `import requests

response = requests.post(
    'https://fundtracer.xyz/api/analyze/compare',
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ft_live_YOUR_API_KEY'
    },
    json={
        'addresses': [
            '0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1',
            '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
        ],
        'chain': 'ethereum'
    }
)
data = response.json()`,
    },
  };

  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'authentication', label: 'Authentication' },
    { id: 'endpoints', label: 'Endpoints' },
    { id: 'sdks', label: 'SDKs' },
    { id: 'pricing', label: 'Pricing' },
  ];

  return (
    <LandingLayout navItems={navItems} showSearch={false}>
    <div className="api-page">
      <div className="api-container">
        <motion.div 
          className="api-header"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="api-logo">
            <Code size={48} strokeWidth={1.5} />
            <span>FundTracer API</span>
          </div>
          <h1>Build with Blockchain Intelligence</h1>
          <p>
            Integrate wallet analytics, transaction graphs, and risk scoring into your applications.
            The same powerful blockchain forensics engine used by FundTracer, available via API.
          </p>
          <div className="api-header-actions">
            <a href="/api/keys" className="api-btn primary">
              <Key size={18} />
              Get API Key
            </a>
            <a href="/api/docs" className="api-btn secondary" target="_blank" rel="noopener noreferrer">
              <ExternalLink size={18} />
              Full Documentation
            </a>
          </div>
        </motion.div>

        <div className="api-nav-tabs">
          {sections.map((section) => (
            <button
              key={section.id}
              className={`api-tab ${activeTab === section.id ? 'active' : ''}`}
              onClick={() => setActiveTab(section.id)}
            >
              {section.label}
            </button>
          ))}
        </div>

        <motion.div 
          className="api-content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {activeTab === 'overview' && (
            <div className="api-section">
              <h2>API Overview</h2>
              <p className="api-intro">
                The FundTracer API provides programmatic access to blockchain analytics data across multiple chains.
                Query wallet information, transaction history, funding flows, risk scores, and more.
              </p>

              <div className="api-features-grid">
                <div className="api-feature">
                  <div className="feature-icon"><Zap size={24} /></div>
                  <h3>Real-time Data</h3>
                  <p>Access up-to-date wallet balances, transaction history, and on-chain activity</p>
                </div>
                <div className="api-feature">
                  <div className="feature-icon"><GitBranch size={24} /></div>
                  <h3>Funding Graphs</h3>
                  <p>Visualize fund flows with detailed source and destination analysis</p>
                </div>
                <div className="api-feature">
                  <div className="feature-icon"><Shield size={24} /></div>
                  <h3>Risk Scoring</h3>
                  <p>Evaluate wallet risk levels and detect suspicious activity patterns</p>
                </div>
                <div className="api-feature">
                  <div className="feature-icon"><Database size={24} /></div>
                  <h3>Multi-Chain</h3>
                  <p>Support for Ethereum, Linea, Arbitrum, Base, Optimism, Polygon, and BSC</p>
                </div>
              </div>

              <div className="api-base-url">
                <h3>Base URL</h3>
                <div className="api-code-block">
                  <code>https://fundtracer.xyz/api</code>
                  <button 
                    className="api-copy-btn"
                    onClick={() => handleCopy('https://fundtracer.xyz/api', 'base-url')}
                  >
                    {copied === 'base-url' ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                  </button>
                </div>
              </div>

              <div className="api-chains">
                <h3>Supported Chains</h3>
                <div className="api-chains-list">
                  {['Ethereum', 'Linea', 'Arbitrum', 'Base', 'Optimism', 'Polygon', 'BSC'].map((chain) => (
                    <span key={chain} className="api-chain-badge">{chain}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'authentication' && (
            <div className="api-section" id="authentication">
              <h2>Authentication</h2>
              <p className="api-intro">
                All API requests require authentication using an API key. Include your API key in the Authorization header.
              </p>

              <div className="api-auth-methods">
                <h3>Using Authorization Header</h3>
                <div className="api-code-block">
                  <pre><code>Authorization: Bearer ft_live_YOUR_API_KEY</code></pre>
                  <button 
                    className="api-copy-btn"
                    onClick={() => handleCopy('Authorization: Bearer ft_live_YOUR_API_KEY', 'auth-header')}
                  >
                    {copied === 'auth-header' ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                  </button>
                </div>

                <h3>Alternative: X-API-Key Header</h3>
                <div className="api-code-block">
                  <pre><code>X-API-Key: ft_live_YOUR_API_KEY</code></pre>
                  <button 
                    className="api-copy-btn"
                    onClick={() => handleCopy('X-API-Key: ft_live_YOUR_API_KEY', 'api-key-header')}
                  >
                    {copied === 'api-key-header' ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                  </button>
                </div>
              </div>

              <div className="api-key-types">
                <h3>API Key Types</h3>
                <div className="api-key-types-grid">
                  <div className="api-key-type">
                    <h4>Live Keys</h4>
                    <code>ft_live_...</code>
                    <p>For production applications. Count against your rate limits.</p>
                  </div>
                  <div className="api-key-type">
                    <h4>Test Keys</h4>
                    <code>ft_test_...</code>
                    <p>For development and testing. Don't count against limits.</p>
                  </div>
                </div>
              </div>

              <div className="api-rate-headers">
                <h3>Rate Limit Headers</h3>
                <p>Every response includes headers showing your current rate limit status:</p>
                <div className="api-code-block">
                  <pre><code>{`X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000`}</code></pre>
                  <button 
                    className="api-copy-btn"
                    onClick={() => handleCopy(`X-RateLimit-Limit: 100\nX-RateLimit-Remaining: 95\nX-RateLimit-Reset: 1640000000`, 'rate-headers')}
                  >
                    {copied === 'rate-headers' ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'endpoints' && (
            <div className="api-section" id="endpoints">
              <h2>API Endpoints</h2>
              <p className="api-intro">
                All endpoints require authentication. Base URL: <code>https://fundtracer.xyz/api</code>
              </p>

              <div className="api-endpoints">
                <div className="api-endpoint">
                  <div className="endpoint-header">
                    <span className="method post">POST</span>
                    <code>/analyze/wallet</code>
                  </div>
                  <p>Get comprehensive wallet analysis including balance, transactions, risk score, and labels.</p>
                  <div className="endpoint-params">
                    <span className="param">address</span>
                    <span className="param-desc">Wallet address (0x...)</span>
                    <span className="param">chain</span>
                    <span className="param-desc">ethereum, linea, arbitrum, base, optimism, polygon, bsc</span>
                  </div>
                  <div className="endpoint-example">
                    <h4>Example Request</h4>
                    <div className="api-code-block">
                      <pre><code>{codeExamples.wallet.curl}</code></pre>
                      <button 
                        className="api-copy-btn"
                        onClick={() => handleCopy(codeExamples.wallet.curl, 'wallet-curl')}
                      >
                        {copied === 'wallet-curl' ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="api-endpoint">
                  <div className="endpoint-header">
                    <span className="method post">POST</span>
                    <code>/analyze/funding-tree</code>
                  </div>
                  <p>Get funding flow graph showing sources and destinations of funds.</p>
                  <div className="endpoint-params">
                    <span className="param">address</span>
                    <span className="param-desc">Wallet address to trace</span>
                    <span className="param">chain</span>
                    <span className="param-desc">Blockchain network</span>
                    <span className="param">options.treeConfig.maxDepth</span>
                    <span className="param-desc">Trace depth (1-5)</span>
                  </div>
                  <div className="endpoint-example">
                    <h4>Example Request</h4>
                    <div className="api-code-block">
                      <pre><code>{codeExamples.fundingTree.curl}</code></pre>
                      <button 
                        className="api-copy-btn"
                        onClick={() => handleCopy(codeExamples.fundingTree.curl, 'tree-curl')}
                      >
                        {copied === 'tree-curl' ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="api-endpoint">
                  <div className="endpoint-header">
                    <span className="method post">POST</span>
                    <code>/analyze/compare</code>
                  </div>
                  <p>Compare multiple wallets to find shared interactions and connections.</p>
                  <div className="endpoint-params">
                    <span className="param">addresses</span>
                    <span className="param-desc">Array of wallet addresses (2-10)</span>
                    <span className="param">chain</span>
                    <span className="param-desc">Blockchain network</span>
                  </div>
                  <div className="endpoint-example">
                    <h4>Example Request</h4>
                    <div className="api-code-block">
                      <pre><code>{codeExamples.compare.curl}</code></pre>
                      <button 
                        className="api-copy-btn"
                        onClick={() => handleCopy(codeExamples.compare.curl, 'compare-curl')}
                      >
                        {copied === 'compare-curl' ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="api-endpoint">
                  <div className="endpoint-header">
                    <span className="method post">POST</span>
                    <code>/analyze/sybil</code>
                  </div>
                  <p>Detect Sybil attack patterns and coordinated behavior.</p>
                  <div className="endpoint-params">
                    <span className="param">address</span>
                    <span className="param-desc">Contract or wallet address</span>
                    <span className="param">chain</span>
                    <span className="param-desc">Blockchain network</span>
                  </div>
                </div>

                <div className="api-endpoint">
                  <div className="endpoint-header">
                    <span className="method post">POST</span>
                    <code>/analyze/contract</code>
                  </div>
                  <p>Analyze smart contracts and their interactions.</p>
                  <div className="endpoint-params">
                    <span className="param">contractAddress</span>
                    <span className="param-desc">Contract address</span>
                    <span className="param">chain</span>
                    <span className="param-desc">Blockchain network</span>
                  </div>
                </div>

                <div className="api-endpoint">
                  <div className="endpoint-header">
                    <span className="method post">POST</span>
                    <code>/contracts/info</code>
                  </div>
                  <p>Look up contract information and metadata.</p>
                  <div className="endpoint-params">
                    <span className="param">address</span>
                    <span className="param-desc">Contract address</span>
                    <span className="param">chain</span>
                    <span className="param-desc">Blockchain network</span>
                  </div>
                </div>

                <div className="api-endpoint">
                  <div className="endpoint-header">
                    <span className="method post">POST</span>
                    <code>/market/tokens</code>
                  </div>
                  <p>Get token price and market data.</p>
                  <div className="endpoint-params">
                    <span className="param">address</span>
                    <span className="param-desc">Token contract address</span>
                    <span className="param">chain</span>
                    <span className="param-desc">Blockchain network</span>
                  </div>
                </div>

                <a href="/api/docs" className="api-full-docs-link" target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={18} />
                  View Full Documentation
                </a>
              </div>
            </div>
          )}
                </div>

          {activeTab === 'sdks' && (
            <div className="api-section" id="sdks">
              <h2>SDKs & Libraries</h2>
              <p className="api-intro">
                Official SDKs for easy integration into your projects.
              </p>

              <div className="api-sdks-grid">
                <div className="api-sdk">
                  <h3>JavaScript / TypeScript</h3>
                  <div className="api-code-block">
                    <code>npm install @fundtracer/api</code>
                    <button 
                      className="api-copy-btn"
                      onClick={() => handleCopy('npm install @fundtracer/api', 'npm-sdk')}
                    >
                      {copied === 'npm-sdk' ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                    </button>
                  </div>
                  <div className="sdk-example">
                    <h4>Usage</h4>
                    <div className="api-code-block">
                      <pre><code>{`import { FundTracerAPI } from '@fundtracer/api';

const ft = new FundTracerAPI('ft_live_YOUR_API_KEY');

// Get wallet info
const wallet = await ft.address.get('ethereum', '0x742d35...');

// Get transactions
const txs = await ft.address.transactions('ethereum', '0x742d35...');

// Get funding graph
const graph = await ft.address.graph('ethereum', '0x742d35...', { hops: 2 });`}</code></pre>
                      <button 
                        className="api-copy-btn"
                        onClick={() => handleCopy(`import { FundTracerAPI } from '@fundtracer/api';

const ft = new FundTracerAPI('ft_live_YOUR_API_KEY');

// Get wallet info
const wallet = await ft.address.get('ethereum', '0x742d35...');`, 'js-sdk')}
                      >
                        {copied === 'js-sdk' ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="api-sdk">
                  <h3>Python</h3>
                  <div className="api-code-block">
                    <code>pip install fundtracer-api</code>
                    <button 
                      className="api-copy-btn"
                      onClick={() => handleCopy('pip install fundtracer-api', 'pip-sdk')}
                    >
                      {copied === 'pip-sdk' ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                    </button>
                  </div>
                  <div className="sdk-example">
                    <h4>Usage</h4>
                    <div className="api-code-block">
                      <pre><code>{`from fundtracer import FundTracerAPI

ft = FundTracerAPI('ft_live_YOUR_API_KEY')

# Get wallet info
wallet = ft.address.get('ethereum', '0x742d35...')

# Get transactions
txs = ft.address.transactions('ethereum', '0x742d35...')

# Get funding graph
graph = ft.address.graph('ethereum', '0x742d35...', hops=2)`}</code></pre>
                      <button 
                        className="api-copy-btn"
                        onClick={() => handleCopy(`from fundtracer import FundTracerAPI

ft = FundTracerAPI('ft_live_YOUR_API_KEY')

# Get wallet info
wallet = ft.address.get('ethereum', '0x742d35...')`, 'python-sdk')}
                      >
                        {copied === 'python-sdk' ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="api-sdk">
                  <h3>Go (Coming Soon)</h3>
                  <p>Official Go client library.</p>
                  <div className="coming-soon-badge">Coming Q2 2026</div>
                </div>
              </div>

              <div className="api-openapi">
                <h3>OpenAPI Specification</h3>
                <p>Access the full API specification in OpenAPI (Swagger) format.</p>
                <div className="api-openapi-actions">
                  <a href="/api/openapi.json" className="api-btn secondary">
                    <ExternalLink size={16} />
                    Download JSON
                  </a>
                  <a href="/api/docs" className="api-btn secondary">
                    <ExternalLink size={16} />
                    Swagger UI
                  </a>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pricing' && (
            <div className="api-section">
              <h2>Pricing & Rate Limits</h2>
              <p className="api-intro">
                Choose the plan that fits your needs. Start free, upgrade as you grow.
              </p>

              <div className="api-pricing-grid">
                <div className="api-pricing-tier">
                  <h3>Free</h3>
                  <div className="tier-price">$0<span>/month</span></div>
                  <ul className="tier-features">
                    <li><Check size={16} /> 100 requests/day</li>
                    <li><Check size={16} /> 10 requests/minute</li>
                    <li><Check size={16} /> Basic endpoints</li>
                    <li><Check size={16} /> Community support</li>
                  </ul>
                  <a href="/api/keys?plan=free" className="api-btn secondary">Get Free Key</a>
                </div>

                <div className="api-pricing-tier featured">
                  <div className="tier-badge">Most Popular</div>
                  <h3>Pro</h3>
                  <div className="tier-price">$25<span>/month</span></div>
                  <ul className="tier-features">
                    <li><Check size={16} /> 10,000 requests/day</li>
                    <li><Check size={16} /> 60 requests/minute</li>
                    <li><Check size={16} /> All endpoints</li>
                    <li><Check size={16} /> Graph & analysis</li>
                    <li><Check size={16} /> Priority support</li>
                  </ul>
                  <a href="/api/keys?plan=pro" className="api-btn primary">Get Pro Key</a>
                </div>

                <div className="api-pricing-tier">
                  <h3>Enterprise</h3>
                  <div className="tier-price">Custom</div>
                  <ul className="tier-features">
                    <li><Check size={16} /> Unlimited requests</li>
                    <li><Check size={16} /> 300+ requests/minute</li>
                    <li><Check size={16} /> Webhooks & alerts</li>
                    <li><Check size={16} /> Dedicated support</li>
                    <li><Check size={16} /> SLA guarantee</li>
                  </ul>
                  <a href="/contact" className="api-btn secondary">Contact Sales</a>
                </div>
              </div>

              <div className="api-rate-limits">
                <h3>Rate Limit Details</h3>
                <table className="rate-limits-table">
                  <thead>
                    <tr>
                      <th>Tier</th>
                      <th>Daily Limit</th>
                      <th>Per Minute</th>
                      <th>Burst</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Free</td>
                      <td>100</td>
                      <td>10</td>
                      <td>20</td>
                    </tr>
                    <tr>
                      <td>Pro</td>
                      <td>10,000</td>
                      <td>60</td>
                      <td>100</td>
                    </tr>
                    <tr>
                      <td>Enterprise</td>
                      <td>Unlimited</td>
                      <td>300+</td>
                      <td>1000+</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </LandingLayout>
  );
}

export default ApiPage;
