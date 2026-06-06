import React from 'react';
import { ArrowRight, Bot, Braces, GitBranch, KeyRound, Shield, Terminal, Users } from 'lucide-react';
import { LandingNav } from '../components/landing/LandingNav';
import { Hero } from '../components/landing/Hero';
import './LandingPage.css';

const productRows = [
  {
    number: '01',
    title: 'Trace the money path',
    body: 'Follow inbound and outbound funding with entity labels, bridge hops, exchange deposits, and chain-aware risk context.',
    href: '/docs/funding-tree-analysis',
    icon: <GitBranch size={18} />,
  },
  {
    number: '02',
    title: 'Score wallet risk',
    body: 'Combine transaction behavior, counterparties, known entities, scam indicators, and portfolio context into one investigation view.',
    href: '/features',
    icon: <Shield size={18} />,
  },
  {
    number: '03',
    title: 'Investigate together',
    body: 'Rooms keep analysts, evidence, AI summaries, recent scans, pins, members, and invite links in the same workspace.',
    href: '/app-evm?tab=rooms',
    icon: <Users size={18} />,
  },
];

const developerCards = [
  { title: 'API', copy: 'Wallet analysis, compare, contract analytics, funding tree, and risk endpoints.', href: '/api-docs', icon: <KeyRound size={20} /> },
  { title: 'MCP', copy: 'Expose FundTracer tools to Claude, Cursor, and compatible AI clients.', href: '/mcp', icon: <Bot size={20} /> },
  { title: 'CLI', copy: 'Run repeatable investigations from shell scripts and terminal workflows.', href: '/cli', icon: <Terminal size={20} /> },
  { title: 'Contracts', copy: 'Inspect deployers, interactors, funding sources, and suspicious behavior.', href: '/docs/contract-analytics', icon: <Braces size={20} /> },
];

const intelligenceCompanies = [
  'Alchemy',
  'LineaScan',
  'QuickNode',
  'Etherscan',
  'BaseScan',
  'Arbiscan',
  'Infura',
  'Tenderly',
  'Dune',
  'Nansen',
  'Arkham',
  'Chainalysis',
];

export function LandingPage() {
  return (
    <div className="ft-public-page">
      <LandingNav />
      <main>
        <Hero />

        <section className="ft-section ft-section--bordered">
          <div className="ft-section__intro">
            <span className="ft-kicker">Platform</span>
            <h2>Built for serious on-chain investigation.</h2>
            <p>
              FundTracer turns scattered blockchain data into a working intelligence surface for analysts,
              builders, compliance teams, and crypto operators.
            </p>
          </div>

          <div className="ft-workflow">
            {productRows.map(row => (
              <a href={row.href} className="ft-workflow__row" key={row.title}>
                <span className="ft-workflow__number">{row.number}</span>
                <span className="ft-workflow__icon">{row.icon}</span>
                <span className="ft-workflow__content">
                  <strong>{row.title}</strong>
                  <small>{row.body}</small>
                </span>
                <ArrowRight size={18} />
              </a>
            ))}
          </div>
        </section>

        <section className="ft-section ft-section--api">
          <div className="ft-api-band">
            <div>
              <span className="ft-kicker">For developers</span>
              <h2>
                One API.
                <span>Every investigation surface.</span>
              </h2>
              <p>
                Query wallet context, funding graphs, entity labels, risk scores, rooms, and
                MCP-ready tooling through one interface.
              </p>
              <div className="ft-section__actions">
                <a className="ft-button ft-button--primary" href="/api/keys">Get API key</a>
                <a className="ft-button ft-button--secondary" href="/docs/getting-started">Read docs</a>
              </div>
              <div className="ft-api-stats">
                <span><strong>1M+</strong><small>API calls per day</small></span>
                <span><strong>&lt;200ms</strong><small>Median latency</small></span>
                <span><strong>12+</strong><small>Tool families</small></span>
              </div>
            </div>

            <div className="ft-code-showcase">
              <div className="ft-code-showcase__tabs">
                <span>Python</span>
                <span>TypeScript</span>
                <span>cURL</span>
                <button type="button">Copy</button>
              </div>
              <pre>{`from fundtracer import Client

client = Client(api_key=os.getenv("FUNDTRACER_API_KEY"))

trace = client.funding.trace(
    address="0x742d...5b2a",
    chain="ethereum",
    depth=4,
    include_entities=True
)

room = client.rooms.pin(
    title="Treasury Investigation",
    evidence=trace.summary
)

print(room.evidence_url)`}</pre>
            </div>
          </div>

          <div className="ft-developer-grid">
            {developerCards.map(card => (
              <a href={card.href} className="ft-dev-card" key={card.title}>
                <span>{card.icon}</span>
                <strong>{card.title}</strong>
                <small>{card.copy}</small>
              </a>
            ))}
          </div>
        </section>

        <section className="ft-section ft-section--logos">
          <div className="ft-logo-grid" aria-label="Popular intelligence companies FundTracer users also use">
            <div className="ft-logo-grid__intro">
              FundTracer users also use
            </div>
            {intelligenceCompanies.map(company => (
              <div className="ft-logo-cell" key={company}>
                <span>{company}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="ft-section ft-section--closing">
          <h2>Start with a wallet. Leave with an evidence trail.</h2>
          <p>Launch the app, connect your workflow, or hand FundTracer to your AI assistant.</p>
          <div className="ft-section__actions">
            <a className="ft-button ft-button--primary" href="/auth?mode=signup">Try for free</a>
            <a className="ft-button ft-button--secondary" href="/mcp">Connect MCP</a>
          </div>
        </section>
      </main>

      <footer className="ft-public-footer">
        <div>
          <img src="/logo.png" alt="" />
          <span>FundTracer</span>
        </div>
        <nav>
          <a href="/features">Features</a>
          <a href="/pricing">Pricing</a>
          <a href="/api-docs">API</a>
          <a href="/mcp">MCP</a>
          <a href="/docs/getting-started">Docs</a>
          <a href="/privacy">Privacy</a>
        </nav>
      </footer>
    </div>
  );
}

export default LandingPage;
