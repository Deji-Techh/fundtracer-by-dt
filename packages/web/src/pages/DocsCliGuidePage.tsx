/**
 * CliGuidePage - CLI documentation
 * Documentation page for /docs/cli-guide
 */

import React from 'react';
import { DocsLayout } from './DocsLayout';
import { Terminal, Download, Settings, Key } from 'lucide-react';

const sections = [
  { id: 'overview', title: 'Overview', icon: <Terminal size={16} /> },
  { id: 'installation', title: 'Installation', icon: <Download size={16} /> },
  { id: 'commands', title: 'Commands', icon: <Terminal size={16} /> },
  { id: 'configuration', title: 'Configuration', icon: <Settings size={16} /> },
];

export function CliGuidePage() {
  return (
    <DocsLayout
      title="CLI Guide"
      description="Command-line interface for FundTracer. Analyze wallets directly from your terminal."
      activeSection="overview"
      sections={sections}
    >
      <h2 id="overview">Overview</h2>
      <p>
        The FundTracer CLI allows you to analyze wallet addresses directly from your terminal. 
        It's perfect for automation, batch processing, and integrating into your workflows.
      </p>
      <div className="callout">
        <div className="callout-title">Prerequisites</div>
        <p>Node.js 18+ and npm or yarn installed on your system.</p>
      </div>

      <h2 id="installation">Installation</h2>
      <pre><code>{`# Install globally via npm
npm install -g fundtracer-cli

# Or via yarn
yarn global add fundtracer-cli

# Verify installation
fundtracer --version`}</code></pre>

      <h2 id="commands">Commands</h2>
      <h3>Analyze a Wallet</h3>
      <pre><code>{`fundtracer analyze 0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1 --chain ethereum`}</code></pre>

      <h3>Get Funding Tree</h3>
      <pre><code>{`fundtracer funding-tree 0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1 --depth 3`}</code></pre>

      <h3>Compare Wallets</h3>
      <pre><code>{`fundtracer compare 0x123... 0x456...`}</code></pre>

      <h3>Export Results</h3>
      <pre><code>{`fundtracer analyze 0x742d... --format json --output results.json`}</code></pre>

      <h2 id="configuration">Configuration</h2>
      <p>
        Set your API key using the <code>FT_API_KEY</code> environment variable or configure 
        it in the CLI settings:
      </p>
      <pre><code>{`# Set API key
fundtracer config set-api-key ft_live_your_api_key

# View current config
fundtracer config show`}</code></pre>
    </DocsLayout>
  );
}

export default CliGuidePage;
