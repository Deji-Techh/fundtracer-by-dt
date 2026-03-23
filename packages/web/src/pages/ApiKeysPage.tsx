import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Key, Copy, Check, Trash2, Plus, Eye, EyeOff, AlertCircle, ExternalLink, Code } from 'lucide-react';
import { LandingLayout } from '../design-system/layouts/LandingLayout';
import './ApiKeysPage.css';

const navItems = [
  { label: 'About', href: '/about' },
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'FAQ', href: '/faq' },
  { label: 'API', href: '/api-docs', active: true },
  { label: 'CLI', href: '/cli' },
];

interface ApiKey {
  id: string;
  name: string;
  key: string;
  type: 'live' | 'test';
  created: string;
  lastUsed: string | null;
  requests: number;
}

const mockKeys: ApiKey[] = [
  {
    id: '1',
    name: 'Production Key',
    key: 'ft_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    type: 'live',
    created: '2026-03-15',
    lastUsed: '2026-03-23',
    requests: 12453,
  },
  {
    id: '2',
    name: 'Development Key',
    key: 'ft_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    type: 'test',
    created: '2026-03-10',
    lastUsed: '2026-03-22',
    requests: 892,
  },
];

export function ApiKeysPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [keys, setKeys] = useState<ApiKey[]>(mockKeys);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyType, setNewKeyType] = useState<'live' | 'test'>('test');

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const toggleShowKey = (id: string) => {
    setShowKey((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const maskKey = (key: string) => {
    return key.replace(/(ft_(?:live|test)_).*(_[a-z0-9]{4})$/, '$1••••••••••••••••••••••••$2');
  };

  const createKey = () => {
    if (!newKeyName.trim()) return;
    const newKey: ApiKey = {
      id: Date.now().toString(),
      name: newKeyName,
      key: `ft_${newKeyType}_${Math.random().toString(36).substring(2, 30)}_${Math.random().toString(36).substring(2, 6)}`,
      type: newKeyType,
      created: new Date().toISOString().split('T')[0],
      lastUsed: null,
      requests: 0,
    };
    setKeys((prev) => [...prev, newKey]);
    setNewKeyName('');
  };

  const deleteKey = (id: string) => {
    setKeys((prev) => prev.filter((k) => k.id !== id));
  };

  return (
    <LandingLayout navItems={navItems} showSearch={false}>
      <div className="api-keys-page">
        <div className="api-keys-container">
          <motion.div
            className="api-keys-header"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="api-keys-title">
              <Key size={32} strokeWidth={1.5} />
              <h1>API Keys</h1>
            </div>
            <p>
              Manage your API keys for authenticating requests to the FundTracer API.
              Keep your keys secure and never share them publicly.
            </p>
          </motion.div>

          <motion.div
            className="api-keys-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="api-keys-create">
              <h2>Create New API Key</h2>
              <div className="create-form">
                <input
                  type="text"
                  placeholder="Key name (e.g., Production, Development)"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="create-input"
                />
                <div className="type-selector">
                  <button
                    className={`type-btn ${newKeyType === 'test' ? 'active' : ''}`}
                    onClick={() => setNewKeyType('test')}
                  >
                    Test Key
                  </button>
                  <button
                    className={`type-btn ${newKeyType === 'live' ? 'active' : ''}`}
                    onClick={() => setNewKeyType('live')}
                  >
                    Live Key
                  </button>
                </div>
                <button className="create-btn" onClick={createKey}>
                  <Plus size={18} />
                  Create Key
                </button>
              </div>
              <div className="create-notice">
                <AlertCircle size={16} />
                <span>
                  {newKeyType === 'test'
                    ? 'Test keys are for development only and do not count against rate limits.'
                    : 'Live keys are for production use and will count against your rate limits.'}
                </span>
              </div>
            </div>

            <div className="api-keys-list">
              <h2>Your API Keys</h2>
              {keys.length === 0 ? (
                <div className="no-keys">
                  <Key size={48} strokeWidth={1} />
                  <p>No API keys yet. Create your first key above.</p>
                </div>
              ) : (
                <div className="keys-grid">
                  {keys.map((apiKey) => (
                    <div key={apiKey.id} className="api-key-card">
                      <div className="key-card-header">
                        <div className="key-info">
                          <h3>{apiKey.name}</h3>
                          <span className={`key-type ${apiKey.type}`}>
                            {apiKey.type === 'live' ? 'Live' : 'Test'}
                          </span>
                        </div>
                        <button
                          className="delete-btn"
                          onClick={() => deleteKey(apiKey.id)}
                          title="Delete key"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <div className="key-value">
                        <code>
                          {showKey[apiKey.id] ? apiKey.key : maskKey(apiKey.key)}
                        </code>
                        <button
                          className="toggle-visibility-btn"
                          onClick={() => toggleShowKey(apiKey.id)}
                          title={showKey[apiKey.id] ? 'Hide key' : 'Show key'}
                        >
                          {showKey[apiKey.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button
                          className="copy-btn"
                          onClick={() => handleCopy(apiKey.key, apiKey.id)}
                          title="Copy key"
                        >
                          {copied === apiKey.id ? (
                            <Check size={16} className="copied" />
                          ) : (
                            <Copy size={16} />
                          )}
                        </button>
                      </div>
                      <div className="key-stats">
                        <div className="stat">
                          <span className="stat-label">Created</span>
                          <span className="stat-value">{apiKey.created}</span>
                        </div>
                        <div className="stat">
                          <span className="stat-label">Last Used</span>
                          <span className="stat-value">
                            {apiKey.lastUsed || 'Never'}
                          </span>
                        </div>
                        <div className="stat">
                          <span className="stat-label">Requests</span>
                          <span className="stat-value">
                            {apiKey.requests.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="api-keys-security">
              <h2>Security Best Practices</h2>
              <ul>
                <li>Never expose your API keys in client-side code or public repositories</li>
                <li>Use environment variables to store your API keys</li>
                <li>Use test keys for development and live keys only in production</li>
                <li>Rotate your keys regularly or immediately if compromised</li>
                <li>Monitor your API usage for any unexpected activity</li>
              </ul>
            </div>

            <div className="api-keys-documentation">
              <h2>Documentation</h2>
              <p>Learn how to integrate FundTracer API into your applications</p>
              <div className="doc-links">
                <a href="/api-docs#endpoints" className="doc-link">
                  <div className="doc-link-icon">
                    <ExternalLink size={20} />
                  </div>
                  <div className="doc-link-content">
                    <h3>API Reference</h3>
                    <p>Explore all available endpoints and parameters</p>
                  </div>
                </a>
                <a href="/api-docs#authentication" className="doc-link">
                  <div className="doc-link-icon">
                    <Key size={20} />
                  </div>
                  <div className="doc-link-content">
                    <h3>Authentication</h3>
                    <p>Learn how to authenticate your API requests</p>
                  </div>
                </a>
                <a href="/api-docs#sdks" className="doc-link">
                  <div className="doc-link-icon">
                    <Code size={20} />
                  </div>
                  <div className="doc-link-content">
                    <h3>SDKs & Libraries</h3>
                    <p>Official SDKs for JavaScript, Python, and more</p>
                  </div>
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </LandingLayout>
  );
}

export default ApiKeysPage;
