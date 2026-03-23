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
    address: {
      curl: `curl -X GET "https://api.fundtracer.xyz/v1/address/ethereum/0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1" \\
  -H "Authorization: Bearer ft_live_YOUR_API_KEY"`,
      js: `const response = await fetch(
  'https://api.fundtracer.xyz/v1/address/ethereum/0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1',
  {
    headers: {
      'Authorization': 'Bearer ft_live_YOUR_API_KEY'
    }
  }
);
const data = await response.json();`,
      python: `import requests

response = requests.get(
    'https://api.fundtracer.xyz/v1/address/ethereum/0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1',
    headers={'Authorization': 'Bearer ft_live_YOUR_API_KEY'}
)
data = response.json()`,
    },
    transactions: {
      curl: `curl -X GET "https://api.fundtracer.xyz/v1/address/ethereum/0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1/transactions?page=1&limit=50" \\
  -H "Authorization: Bearer ft_live_YOUR_API_KEY"`,
      js: `const response = await fetch(
  'https://api.fundtracer.xyz/v1/address/ethereum/0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1/transactions?page=1&limit=50',
  {
    headers: {
      'Authorization': 'Bearer ft_live_YOUR_API_KEY'
    }
  }
);`,
      python: `import requests

response = requests.get(
    'https://api.fundtracer.xyz/v1/address/ethereum/0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1/transactions',
    params={'page': 1, 'limit': 50},
    headers={'Authorization': 'Bearer ft_live_YOUR_API_KEY'}
)`,
    },
    graph: {
      curl: `curl -X GET "https://api.fundtracer.xyz/v1/address/ethereum/0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1/graph?hops=2" \\
  -H "Authorization: Bearer ft_live_YOUR_API_KEY"`,
      js: `const response = await fetch(
  'https://api.fundtracer.xyz/v1/address/ethereum/0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1/graph?hops=2',
  {
    headers: {
      'Authorization': 'Bearer ft_live_YOUR_API_KEY'
    }
  }
);`,
      python: `import requests

response = requests.get(
    'https://api.fundtracer.xyz/v1/address/ethereum/0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1/graph',
    params={'hops': 2},
    headers={'Authorization': 'Bearer ft_live_YOUR_API_KEY'}
)`,
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
            <a href="/api-docs#endpoints" className="api-btn secondary">
              View Documentation
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
                  <code>https://api.fundtracer.xyz/v1</code>
                  <button 
                    className="api-copy-btn"
                    onClick={() => handleCopy('https://api.fundtracer.xyz/v1', 'base-url')}
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

              <div className="api-endpoints">
                <div className="api-endpoint">
                  <div className="endpoint-header">
                    <span className="method get">GET</span>
                    <code>/v1/address/{'{chain}'}/{'{address}'}</code>
                  </div>
                  <p>Get wallet information including balance, transaction count, risk score, and labels.</p>
                  <div className="endpoint-try">
                    <span className="param">chain</span>
                    <span className="param-desc">ethereum, linea, arbitrum, etc.</span>
                    <span className="param">address</span>
                    <span className="param-desc">Wallet address (0x...)</span>
                  </div>
                  <div className="endpoint-example">
                    <h4>Example Request</h4>
                    <div className="code-tabs">
                      <div className="code-tabs-header">
                        <button className="code-tab active">cURL</button>
                        <button className="code-tab">JavaScript</button>
                        <button className="code-tab">Python</button>
                      </div>
                      <div className="code-tabs-content">
                        <div className="code-content active">
                          <div className="api-code-block">
                            <pre><code>{codeExamples.address.curl}</code></pre>
                            <button 
                              className="api-copy-btn"
                              onClick={() => handleCopy(codeExamples.address.curl, 'address-curl')}
                            >
                              {copied === 'address-curl' ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="api-endpoint">
                  <div className="endpoint-header">
                    <span className="method get">GET</span>
                    <code>/v1/address/{'{chain}'}/{'{address}'}/transactions</code>
                  </div>
                  <p>Get paginated transaction history for a wallet address.</p>
                  <div className="endpoint-params">
                    <span className="param">page</span>
                    <span className="param-desc">Page number (default: 1)</span>
                    <span className="param">limit</span>
                    <span className="param-desc">Items per page (default: 50, max: 100)</span>
                  </div>
                  <div className="endpoint-example">
                    <h4>Example Request</h4>
                    <div className="api-code-block">
                      <pre><code>{codeExamples.transactions.curl}</code></pre>
                      <button 
                        className="api-copy-btn"
                        onClick={() => handleCopy(codeExamples.transactions.curl, 'tx-curl')}
                      >
                        {copied === 'tx-curl' ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="api-endpoint">
                  <div className="endpoint-header">
                    <span className="method get">GET</span>
                    <code>/v1/address/{'{chain}'}/{'{address}'}/graph</code>
                  </div>
                  <p>Get funding flow graph showing sources and destinations.</p>
                  <div className="endpoint-params">
                    <span className="param">hops</span>
                    <span className="param-desc">Number of hops to trace (1-5)</span>
                    <span className="param">minValue</span>
                    <span className="param-desc">Minimum transaction value in ETH</span>
                  </div>
                  <div className="endpoint-example">
                    <h4>Example Request</h4>
                    <div className="api-code-block">
                      <pre><code>{codeExamples.graph.curl}</code></pre>
                      <button 
                        className="api-copy-btn"
                        onClick={() => handleCopy(codeExamples.graph.curl, 'graph-curl')}
                      >
                        {copied === 'graph-curl' ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="api-endpoint">
                  <div className="endpoint-header">
                    <span className="method get">GET</span>
                    <code>/v1/address/{'{chain}'}/{'{address}'}/tokens</code>
                  </div>
                  <p>Get token balances for a wallet address.</p>
                </div>

                <div className="api-endpoint">
                  <div className="endpoint-header">
                    <span className="method get">GET</span>
                    <code>/v1/address/{'{chain}'}/{'{address}'}/risk</code>
                  </div>
                  <p>Get risk score and privacy analysis for a wallet.</p>
                </div>

                <div className="api-endpoint">
                  <div className="endpoint-header">
                    <span className="method get">GET</span>
                    <code>/v1/address/{'{chain}'}/{'{address}'}/entities</code>
                  </div>
                  <p>Get detected entity labels (exchanges, protocols, etc.).</p>
                </div>

                <div className="api-endpoint">
                  <div className="endpoint-header">
                    <span className="method post">POST</span>
                    <code>/v1/analyze</code>
                  </div>
                  <p>Submit an async deep analysis job for a wallet.</p>
                </div>

                <div className="api-endpoint">
                  <div className="endpoint-header">
                    <span className="method get">GET</span>
                    <code>/v1/health</code>
                  </div>
                  <p>Check API health status (no authentication required).</p>
                </div>
              </div>

              <div className="api-response-format">
                <h3>Response Format</h3>
                <p>All responses follow a consistent JSON structure:</p>
                <div className="api-code-block">
                  <pre><code>{`{
  "success": true,
  "data": { ... },
  "meta": {
    "rateLimit": {
      "remaining": 94,
      "reset": 1640000060
    },
    "executionTime": "45ms"
  }
}`}</code></pre>
                  <button 
                    className="api-copy-btn"
                    onClick={() => handleCopy(`{
  "success": true,
  "data": { ... },
  "meta": {
    "rateLimit": {
      "remaining": 94,
      "reset": 1640000060
    },
    "executionTime": "45ms"
  }
}`, 'response-format')}
                  >
                    {copied === 'response-format' ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                  </button>
                </div>
              </div>
            </div>
          )}

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

        <motion.div 
          className="api-footer"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="api-footer-content">
            <h3>Get Started Today</h3>
            <p>Start building with the FundTracer API. No credit card required for free tier.</p>
            <div className="api-footer-actions">
              <a href="/api/keys" className="api-btn primary">
                <Key size={18} />
                Create API Key
              </a>
              <a href="/api-docs#endpoints" className="api-btn secondary">
                <ExternalLink size={18} />
                Full Documentation
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
    </LandingLayout>
  );
}

export default ApiPage;
