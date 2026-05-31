import React from 'react';
import { LandingLayout } from '../design-system/layouts/LandingLayout';
import { LANDING_NAV_ITEMS } from '../constants/navigation';
import './DownloadPage.css';

const DOWNLOAD_BASE = 'https://github.com/Deji-Tech/fundtracer-desktop/releases/latest';

const navItems = LANDING_NAV_ITEMS.map((item) =>
  item.label === 'Download' ? { ...item, active: true } : item
);

export function DownloadPage() {
  return (
    <LandingLayout navItems={navItems} showSearch={false}>
      <div className="download-page">
        <section className="download-hero">
          <p className="download-hero__kicker">DESKTOP APP</p>
          <h1 className="download-hero__title">FundTracer Desktop for Investigations That Need Speed</h1>
          <p className="download-hero__subtitle">
            FundTracer Desktop brings your full blockchain intelligence workflow into a native app:
            wallet analysis, compare, contract scanner, interactors mapping, sybil detection, CEX flow,
            AI-assisted breakdowns, and per-tab state that keeps each investigation isolated.
          </p>
          <div className="download-hero__actions">
            <a className="download-btn download-btn--primary" href="#windows">Download for Windows</a>
            <a className="download-btn download-btn--secondary" href="#linux">Download for Linux</a>
          </div>
        </section>

        <section className="download-features">
          <h2>What You Get in Desktop</h2>
          <div className="download-feature-grid">
            <article className="download-feature-card">
              <h3>Full Intel Stack</h3>
              <p>Analyze wallets, compare multiple addresses, scan contracts, surface interactors, detect sybil clusters, and trace CEX flows in one place.</p>
            </article>
            <article className="download-feature-card">
              <h3>Consistency With Web</h3>
              <p>Desktop reuses the same backend intelligence endpoints as Analyze/Intel so results stay aligned with your web workflows.</p>
            </article>
            <article className="download-feature-card">
              <h3>Advanced Graphing</h3>
              <p>Use the same visual language as Analyze: timeline charts, funding graphs, and node maps for clearer relationship analysis.</p>
            </article>
            <article className="download-feature-card">
              <h3>Per-Tab Investigation Memory</h3>
              <p>Each analysis tab keeps its own scoped cache and state, so compare/contract/sybil/cex sessions do not leak into one another.</p>
            </article>
            <article className="download-feature-card">
              <h3>AI Breakdowns</h3>
              <p>Send investigation context to backend AI for automatic interpretation, risk framing, and actionable next-step suggestions.</p>
            </article>
            <article className="download-feature-card">
              <h3>Export-Ready Outputs</h3>
              <p>Export evidence and investigative artifacts (CSV/JSON/report outputs) for internal teams, compliance, or external case handoff.</p>
            </article>
          </div>
        </section>

        <section id="windows" className="download-platform">
          <div className="download-platform__head">
            <h2>Windows</h2>
            <span>Recommended for most users</span>
          </div>
          <p>
            Native Windows installer builds are published via GitHub Releases. Use the latest <code>.exe</code> (NSIS)
            or <code>.msi</code> package depending on your deployment preference.
          </p>
          <ul>
            <li>Best for security/ops teams that need managed installs</li>
            <li>Includes full Desktop feature set: Compare, Contract, Interactors, Sybil, CEX</li>
            <li>Fast startup and better long-session stability vs browser-only workflows</li>
          </ul>
          <a className="download-btn download-btn--primary" href={DOWNLOAD_BASE} target="_blank" rel="noopener noreferrer">
            Open Latest Windows Release
          </a>
        </section>

        <section id="linux" className="download-platform">
          <div className="download-platform__head">
            <h2>Linux</h2>
            <span>AUR + direct release artifacts</span>
          </div>
          <p>
            Linux builds are available as release artifacts and through AUR. If you use Arch/EndeavourOS/Manjaro,
            install the maintained package directly via <code>yay</code>.
          </p>
          <div className="download-code">
            <code>yay -S fundtracer-desktop-bin</code>
          </div>
          <ul>
            <li>Tracks the same release stream as GitHub desktop artifacts</li>
            <li>Good fit for analyst workstations and SOC lab environments</li>
            <li>Deb/AppImage/RPM builds available from release assets</li>
          </ul>
          <a className="download-btn download-btn--secondary" href={DOWNLOAD_BASE} target="_blank" rel="noopener noreferrer">
            Open Latest Linux Release
          </a>
        </section>
      </div>
    </LandingLayout>
  );
}

export default DownloadPage;
