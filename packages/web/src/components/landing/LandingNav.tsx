import React, { useEffect, useState } from 'react';
import {
  Activity,
  Bot,
  Braces,
  ChevronDown,
  CircleDot,
  Code2,
  Command,
  FileText,
  GitBranch,
  KeyRound,
  Menu,
  Moon,
  Network,
  Radar,
  Search,
  Shield,
  Sun,
  Terminal,
  Users,
  X,
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import './LandingNav.css';

type MegaMenu = 'products' | 'developers' | 'company' | null;

const productItems = [
  {
    href: '/features',
    title: 'Wallet Analyzer',
    description: 'Risk, balances, flow history, labels, and behavioral signals.',
    icon: <Search size={16} />,
  },
  {
    href: '/docs/funding-tree-analysis',
    title: 'Funding Tree',
    description: 'Trace source wallets, hops, exchanges, bridges, and fund origins.',
    icon: <GitBranch size={16} />,
  },
  {
    href: '/docs/sybil-detection',
    title: 'Sybil Detection',
    description: 'Cluster wallets that share funding, timing, and activity patterns.',
    icon: <Shield size={16} />,
  },
  {
    href: '/docs/contract-analytics',
    title: 'Contract Analytics',
    description: 'Understand interactors, deployers, token flows, and suspicious links.',
    icon: <Braces size={16} />,
  },
  {
    href: '/app-evm?tab=rooms',
    title: 'AI Investigation Rooms',
    description: 'Collaborate with your team, pin evidence, and mention FundTracer AI.',
    icon: <Users size={16} />,
  },
  {
    href: '/telegram',
    title: 'Alerts & Telegram',
    description: 'Watch addresses and receive fast investigation signals.',
    icon: <Radar size={16} />,
  },
];

const developerItems = [
  { href: '/api-docs', title: 'API', description: 'Wallet analysis, funding trees, compare, and risk endpoints.', icon: <Code2 size={16} /> },
  { href: '/mcp', title: 'MCP', description: 'Let AI assistants call FundTracer tools directly.', icon: <Bot size={16} /> },
  { href: '/cli', title: 'CLI', description: 'Run investigations from a terminal workflow.', icon: <Terminal size={16} /> },
  { href: '/docs/getting-started', title: 'Docs', description: 'Guides for chains, contracts, risk scores, and API usage.', icon: <FileText size={16} /> },
  { href: '/api/keys', title: 'API Keys', description: 'Manage keys, usage, and developer access.', icon: <KeyRound size={16} /> },
];

const companyItems = [
  { href: '/about', title: 'About' },
  { href: '/blog', title: 'Blog' },
  { href: '/faq', title: 'FAQ' },
  { href: '/download', title: 'Download' },
  { href: '/rewards', title: 'Rewards' },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [activeMenu, setActiveMenu] = useState<MegaMenu>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 18);
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveMenu(null);
        setMobileOpen(false);
      }
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('keydown', handleKey);
    };
  }, []);

  const toggleMenu = (menu: Exclude<MegaMenu, null>) => {
    setActiveMenu(current => (current === menu ? null : menu));
  };

  return (
    <header className={`ft-site-nav ${scrolled ? 'ft-site-nav--scrolled' : ''}`}>
      <div className="ft-site-nav__inner" onMouseLeave={() => setActiveMenu(null)}>
        <a className="ft-site-nav__brand" href="/" aria-label="FundTracer home">
          <img src="/logo.png" alt="" className="ft-site-nav__logo" />
          <span>FundTracer</span>
        </a>

        <nav className="ft-site-nav__links" aria-label="Primary navigation">
          <button
            className={`ft-site-nav__link ${activeMenu === 'products' ? 'is-active' : ''}`}
            onMouseEnter={() => setActiveMenu('products')}
            onClick={() => toggleMenu('products')}
            aria-expanded={activeMenu === 'products'}
          >
            Products <ChevronDown size={14} />
          </button>
          <a className="ft-site-nav__link" href="/pricing">Pricing</a>
          <button
            className={`ft-site-nav__link ${activeMenu === 'developers' ? 'is-active' : ''}`}
            onMouseEnter={() => setActiveMenu('developers')}
            onClick={() => toggleMenu('developers')}
            aria-expanded={activeMenu === 'developers'}
          >
            Developer <ChevronDown size={14} />
          </button>
          <button
            className={`ft-site-nav__link ${activeMenu === 'company' ? 'is-active' : ''}`}
            onMouseEnter={() => setActiveMenu('company')}
            onClick={() => toggleMenu('company')}
            aria-expanded={activeMenu === 'company'}
          >
            Company <ChevronDown size={14} />
          </button>
          <a className="ft-site-nav__link" href="/docs/getting-started">Docs</a>
        </nav>

        <div className="ft-site-nav__actions">
          <div className="ft-theme-switch" aria-label="Theme selection">
            <button
              className={theme === 'dark' ? 'is-active' : ''}
              onClick={() => setTheme('dark')}
              aria-label="Use dark theme"
            >
              <Moon size={14} />
            </button>
            <button
              className={theme === 'dim' ? 'is-active' : ''}
              onClick={() => setTheme('dim')}
              aria-label="Use dim theme"
            >
              <CircleDot size={14} />
            </button>
            <button
              className={theme === 'light' ? 'is-active' : ''}
              onClick={() => setTheme('light')}
              aria-label="Use light theme"
            >
              <Sun size={14} />
            </button>
          </div>
          <a className="ft-site-nav__sales" href="/api-docs">API</a>
          <a className="ft-site-nav__cta" href="/auth?mode=signup">Try for free</a>
          <button
            className="ft-site-nav__mobile"
            onClick={() => setMobileOpen(open => !open)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {activeMenu === 'products' && (
          <div className="ft-mega ft-mega--products">
            <div className="ft-mega__list">
              {productItems.map(item => (
                <a key={item.title} href={item.href} className="ft-mega__item">
                  <span className="ft-mega__icon">{item.icon}</span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.description}</small>
                  </span>
                </a>
              ))}
            </div>
            <div className="ft-mega__preview" aria-hidden="true">
              <RoomPreviewMini />
            </div>
          </div>
        )}

        {activeMenu === 'developers' && (
          <div className="ft-mega ft-mega--developers">
            <div className="ft-mega__list">
              {developerItems.map(item => (
                <a key={item.title} href={item.href} className="ft-mega__item">
                  <span className="ft-mega__icon">{item.icon}</span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.description}</small>
                  </span>
                </a>
              ))}
            </div>
            <div className="ft-mega__terminal" aria-hidden="true">
              <div className="ft-mini-terminal__bar">
                <span />
                <span>fundtracer/mcp</span>
              </div>
              <code>$ ft trace 0x742d...5b2a --chain ethereum</code>
              <code className="ok">detect_sybil_clusters: 7 related wallets</code>
              <code>export evidence --room "Treasury review"</code>
            </div>
          </div>
        )}

        {activeMenu === 'company' && (
          <div className="ft-mega ft-mega--company">
            {companyItems.map(item => (
              <a key={item.title} href={item.href} className="ft-mega__plain">{item.title}</a>
            ))}
          </div>
        )}
      </div>

      {mobileOpen && (
        <div className="ft-mobile-panel">
          {[...productItems, ...developerItems].map(item => (
            <a key={item.title} href={item.href} onClick={() => setMobileOpen(false)}>
              <span>{item.icon}</span>
              <strong>{item.title}</strong>
            </a>
          ))}
          <div className="ft-mobile-panel__links">
            {companyItems.map(item => (
              <a key={item.title} href={item.href} onClick={() => setMobileOpen(false)}>{item.title}</a>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

function RoomPreviewMini() {
  return (
    <div className="ft-room-mini">
      <div className="ft-room-mini__header">
        <span><Users size={13} /> Treasury Investigation</span>
        <small>4 online</small>
      </div>
      <div className="ft-room-mini__bubble">Pin this CEX hop. It links three deposits.</div>
      <div className="ft-room-mini__bubble is-right">@ai summarize source-of-funds risk</div>
      <div className="ft-room-mini__bubble is-ai">
        <Command size={12} />
        Funding risk: elevated. Shared source detected.
      </div>
      <div className="ft-room-mini__status"><Activity size={12} /> FundTracer AI is typing</div>
    </div>
  );
}

export default LandingNav;
