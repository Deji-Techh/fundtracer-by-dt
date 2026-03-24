import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code, Copy, Check, ExternalLink, Key, Zap, Shield, Database, Clock, GitBranch, X, Send, AlertCircle } from 'lucide-react';
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
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactError, setContactError] = useState('');
  const [contactForm, setContactForm] = useState({ name: '', company: '', email: '', message: '' });
  const [proLoading, setProLoading] = useState(false);

  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setContactForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setContactError('');
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      setContactError('Please fill in all required fields');
      return;
    }
    setContactLoading(true);
    setContactError('');
    try {
      const res = await fetch('/api/contact/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      });
      const data = await res.json();
      if (data.success) {
        setContactSuccess(true);
        setContactForm({ name: '', company: '', email: '', message: '' });
      } else {
        setContactError(data.error || 'Failed to send message');
      }
    } catch {
      setContactError('Failed to send message. Please try again.');
    } finally {
      setContactLoading(false);
    }
  };

  const handleProCheckout = async () => {
    setProLoading(true);
    try {
      const res = await fetch('/api/payment/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tier: 'pro' }),
      });
      const data = await res.json();
      if (data.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert(data.error || 'Failed to start checkout. Please try again.');
      }
    } catch {
      alert('Failed to start checkout. Please try again.');
    } finally {
      setProLoading(false);
    }
  };

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
    <>
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
                    <span className="param-desc">Array of wallet addresses (2-20)</span>
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
                    <span className="param">contractAddress</span>
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

                <a href="/api/docs" className="api-full-docs-link" target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={18} />
                  View Full Documentation
                </a>
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

// Analyze a wallet
const { data: wallet } = await ft.analyzeWallet(
  '0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1',
  { chain: 'ethereum', includeTransactions: true }
);

// Get funding tree
const { data: tree } = await ft.getFundingTree(
  '0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1',
  { chain: 'ethereum', maxDepth: 3 }
);

// Detect Sybil behavior
const { data: sybil } = await ft.detectSybil(
  '0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1',
  'ethereum'
);

// Batch analyze multiple wallets
const { data: batch } = await ft.analyzeBatch(
  ['0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1', '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'],
  'ethereum'
);

// Get transaction details
const { data: tx } = await ft.getTransaction('ethereum', '0xabc123def456...');

// Get gas prices
const { data: gas } = await ft.getGasPrices('ethereum');`}</code></pre>
                      <button
                        className="api-copy-btn"
                        onClick={() => handleCopy(`import { FundTracerAPI } from '@fundtracer/api';

const ft = new FundTracerAPI('ft_live_YOUR_API_KEY');

// Analyze a wallet
const { data: wallet } = await ft.analyzeWallet(
  '0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1',
  { chain: 'ethereum', includeTransactions: true }
);

// Get funding tree
const { data: tree } = await ft.getFundingTree(
  '0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1',
  { chain: 'ethereum', maxDepth: 3 }
);

// Detect Sybil behavior
const { data: sybil } = await ft.detectSybil(
  '0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1',
  'ethereum'
);

// Batch analyze multiple wallets
const { data: batch } = await ft.analyzeBatch(
  ['0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1', '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'],
  'ethereum'
);

// Get transaction details
const { data: tx } = await ft.getTransaction('ethereum', '0xabc123def456...');

// Get gas prices
const { data: gas } = await ft.getGasPrices('ethereum');`, 'js-sdk')}
                      >
                        {copied === 'js-sdk' ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                      </button>
                    </div>
                  </div>
                </div>

                  <div className="api-sdk">
                  <h3>Python (Coming Soon)</h3>
                  <p>Official Python client library.</p>
                  <div className="coming-soon-badge">Coming Q3 2026</div>
                </div>

                <div className="api-sdk">
                  <h3>Go (Coming Soon)</h3>
                  <p>Official Go client library.</p>
                  <div className="coming-soon-badge">Coming Q2 2026</div>
                </div>
              </div>

              <div className="api-openapi">
                <h3>SDK Reference</h3>
                <p>TypeScript types and full SDK documentation are available on npm.</p>
                <div className="api-openapi-actions">
                  <a href="https://www.npmjs.com/package/@fundtracer/api" target="_blank" rel="noopener noreferrer" className="api-btn secondary">
                    <ExternalLink size={16} />
                    View on npm
                  </a>
                  <a href="/api/docs" className="api-btn secondary">
                    <ExternalLink size={16} />
                    Full Documentation
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
                  <div className="tier-price">$15<span>/month</span></div>
                  <ul className="tier-features">
                    <li><Check size={16} /> 10,000 requests/day</li>
                    <li><Check size={16} /> 60 requests/minute</li>
                    <li><Check size={16} /> All endpoints</li>
                    <li><Check size={16} /> Graph & analysis</li>
                    <li><Check size={16} /> Priority support</li>
                  </ul>
                  <button
                    className="api-btn primary"
                    disabled={true}
                    style={{ opacity: 0.6, cursor: 'not-allowed' }}
                  >
                    Coming Soon
                  </button>
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
                  <button
                    className="api-btn secondary"
                    onClick={() => setShowContactModal(true)}
                  >
                    Contact Sales
                  </button>
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
    </div>

      <AnimatePresence>
        {showContactModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e: React.MouseEvent) => { if (e.target === e.currentTarget) setShowContactModal(false); }}
          >
            <motion.div
              className="contact-modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="contact-modal__header">
                <h2>Contact Sales</h2>
                <button className="contact-modal__close" onClick={() => setShowContactModal(false)}>
                  <X size={20} />
                </button>
              </div>

              {contactSuccess ? (
                <div className="contact-modal__success">
                  <div className="success-icon"><Check size={32} /></div>
                  <h3>Message Sent!</h3>
                  <p>We'll be in touch with you shortly.</p>
                  <button className="api-btn primary" onClick={() => { setShowContactModal(false); setContactSuccess(false); }}>
                    Close
                  </button>
                </div>
              ) : (
                <form className="contact-modal__form" onSubmit={handleContactSubmit}>
                  <div className="form-group">
                    <label htmlFor="name">Name <span className="required">*</span></label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={contactForm.name}
                      onChange={handleContactChange}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="company">Company</label>
                    <input
                      type="text"
                      id="company"
                      name="company"
                      value={contactForm.company}
                      onChange={handleContactChange}
                      placeholder="Acme Corp (optional)"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">Email <span className="required">*</span></label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={contactForm.email}
                      onChange={handleContactChange}
                      placeholder="john@acme.com"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="message">How can we help? <span className="required">*</span></label>
                    <textarea
                      id="message"
                      name="message"
                      value={contactForm.message}
                      onChange={handleContactChange}
                      placeholder="Tell us about your use case, expected volume, and any specific requirements..."
                      rows={4}
                      required
                    />
                  </div>
                  {contactError && (
                    <div className="form-error">
                      <AlertCircle size={16} />
                      {contactError}
                    </div>
                  )}
                  <button type="submit" className="api-btn primary submit-btn" disabled={contactLoading}>
                    {contactLoading ? (
                      'Sending...'
                    ) : (
                      <>
                        <Send size={16} />
                        Send Message
                      </>
                    )}
                  </button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </LandingLayout>
    </>
  );
}

export default ApiPage;
