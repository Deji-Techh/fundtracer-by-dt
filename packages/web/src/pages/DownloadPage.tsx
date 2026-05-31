import React from 'react';
import { ArrowRight, CheckCircle, Download, MonitorDown, Package, Shield, Terminal, Zap } from 'lucide-react';
import { LandingLayout } from '../design-system/layouts/LandingLayout';
import { LANDING_NAV_ITEMS } from '../constants/navigation';
import './DownloadPage.css';

const DOWNLOAD_BASE = 'https://github.com/Deji-Tech/fundtracer-desktop/releases/latest';
const RELEASE_VERSION = 'v1.0.10';

const workflowFeatures = [
  {
    icon: <Zap size={24} />,
    title: 'Analyze',
    copy: 'Run wallet-level investigations with timelines, funding context, risk signals, and AI summaries tied to the same backend intelligence as the web app.'
  },
  {
    icon: <Shield size={24} />,
    title: 'Compare',
    copy: 'Compare two or more wallets with shared funders, overlap scoring, graph views, detailed explorer links, and cached per-tab results.'
  },
  {
    icon: <MonitorDown size={24} />,
    title: 'Contract Scanner',
    copy: 'Inspect smart contracts for interactors, funding patterns, token movement, suspicious clusters, and investigation-ready detail views.'
  },
  {
    icon: <Package size={24} />,
    title: 'Sybil + CEX Flow',
    copy: 'Move from wallet behavior to exchange flow and sybil pattern checks without switching tools or losing the current case context.'
  },
  {
    icon: <Terminal size={24} />,
    title: 'Graph Investigation',
    copy: 'Use the same visual language as Analyze: consistent line charts, relationship graphs, node maps, and full-screen graph inspection.'
  },
  {
    icon: <CheckCircle size={24} />,
    title: 'Exportable Evidence',
    copy: 'Keep CSV, JSON, and report-friendly outputs clean for analysts, compliance teams, internal reviews, or external handoff.'
  }
];

const sections = [
  { id: 'overview', label: 'Overview', icon: <MonitorDown size={18} /> },
  { id: 'features', label: 'Desktop Features', icon: <Zap size={18} /> },
  { id: 'windows', label: 'Windows', icon: <Download size={18} /> },
  { id: 'linux', label: 'Linux', icon: <Terminal size={18} /> }
];

export function DownloadPage() {
  return (
    <LandingLayout navItems={LANDING_NAV_ITEMS} showSearch={false}>
      <div className="download-page">
        <div className="download-container">
          <header className="download-header" id="overview">
            <p className="download-eyebrow">Desktop App</p>
            <h1>FundTracer Desktop</h1>
            <p>
              A native investigation workspace for wallet analysis, compare, contract scanning, interactors,
              sybil detection, CEX flow, graph exploration, and AI-assisted case review.
            </p>
            <div className="download-header__actions">
              <a className="download-primary-btn" href="#windows">
                Download for Windows
                <ArrowRight size={18} />
              </a>
              <a className="download-secondary-btn" href="#linux">
                Install on Linux
                <Terminal size={18} />
              </a>
            </div>
            <div className="download-release-strip">
              <span>Latest release: {RELEASE_VERSION}</span>
              <span>Windows .exe/.msi</span>
              <span>Linux AUR, deb, rpm, AppImage</span>
            </div>
          </header>

          <div className="download-layout">
            <nav className="download-sidebar" aria-label="Download page sections">
              {sections.map((section) => (
                <a className="download-sidebar-link" href={`#${section.id}`} key={section.id}>
                  {section.icon}
                  <span>{section.label}</span>
                </a>
              ))}
            </nav>

            <main className="download-content">
              <section className="download-doc-section">
                <h2>Overview</h2>
                <p className="download-section-intro">
                  FundTracer Desktop uses the same backend intelligence pipeline as the web app, but gives long
                  investigations a dedicated native workspace. Keep multiple cases open, preserve per-tab context,
                  and move between overview, graph, detailed evidence, and AI analysis without browser clutter.
                </p>

                <div className="download-info-grid">
                  <div className="download-info-card">
                    <h3>Built for investigation tabs</h3>
                    <p>Analyze, Compare, Contract, Interactors, Sybil, and CEX Flow keep their own state per tab.</p>
                  </div>
                  <div className="download-info-card">
                    <h3>Same data as web</h3>
                    <p>Desktop calls the production FundTracer endpoints instead of inventing separate local results.</p>
                  </div>
                  <div className="download-info-card">
                    <h3>AI context included</h3>
                    <p>Analysis payloads are sent to backend AI so summaries match the current wallet or contract.</p>
                  </div>
                  <div className="download-info-card">
                    <h3>Export-friendly outputs</h3>
                    <p>Evidence views and CSV exports are structured for analyst review and operational handoff.</p>
                  </div>
                </div>
              </section>

              <section className="download-doc-section" id="features">
                <h2>Desktop Features</h2>
                <p className="download-section-intro">
                  The desktop app mirrors the core FundTracer workflow and adds stronger session isolation for
                  investigation-heavy usage.
                </p>

                <div className="download-features-grid">
                  {workflowFeatures.map((feature) => (
                    <div className="download-feature" key={feature.title}>
                      <div className="download-feature-icon">{feature.icon}</div>
                      <div>
                        <h3>{feature.title}</h3>
                        <p>{feature.copy}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="download-doc-section" id="windows">
                <div className="download-platform-heading">
                  <div>
                    <h2>Windows</h2>
                    <p className="download-section-intro">
                      Use the GitHub release assets for normal installs or managed workstation deployment.
                    </p>
                  </div>
                  <span>Recommended</span>
                </div>

                <h3>Available Packages</h3>
                <div className="download-code-block">
                  <code>.exe installer  |  .msi package</code>
                </div>

                <div className="download-checklist">
                  <p><CheckCircle size={16} /> Best option for most analysts and compliance teams</p>
                  <p><CheckCircle size={16} /> Includes Analyze, Compare, Contract, Interactors, Sybil, and CEX Flow</p>
                  <p><CheckCircle size={16} /> Uses authenticated FundTracer backend services</p>
                </div>

                <a className="download-primary-btn" href={DOWNLOAD_BASE} target="_blank" rel="noopener noreferrer">
                  Open Windows Release Assets
                  <ArrowRight size={18} />
                </a>
              </section>

              <section className="download-doc-section" id="linux">
                <div className="download-platform-heading">
                  <div>
                    <h2>Linux</h2>
                    <p className="download-section-intro">
                      Install from AUR on Arch-based systems, or download direct artifacts for other Linux environments.
                    </p>
                  </div>
                  <span>AUR + Artifacts</span>
                </div>

                <h3>Install with yay</h3>
                <div className="download-code-block">
                  <code>yay -S fundtracer-desktop-bin</code>
                </div>

                <h3>Release Artifacts</h3>
                <div className="download-code-block">
                  <code>.deb package  |  .rpm package  |  .AppImage</code>
                </div>

                <div className="download-checklist">
                  <p><CheckCircle size={16} /> Tracks the same release stream as GitHub desktop artifacts</p>
                  <p><CheckCircle size={16} /> Good fit for SOC labs and investigation sandboxes</p>
                  <p><CheckCircle size={16} /> Per-tab cache keeps long-running cases isolated</p>
                </div>

                <a className="download-secondary-btn" href={DOWNLOAD_BASE} target="_blank" rel="noopener noreferrer">
                  Open Linux Release Assets
                  <ArrowRight size={18} />
                </a>
              </section>
            </main>
          </div>
        </div>
      </div>
    </LandingLayout>
  );
}

export default DownloadPage;
