import React from 'react';
import { LandingLayout } from '../design-system/layouts/LandingLayout';
import { LANDING_NAV_ITEMS } from '../constants/navigation';
import './DownloadPage.css';

const DOWNLOAD_BASE = 'https://github.com/Deji-Tech/fundtracer-desktop/releases/latest';
const RELEASE_VERSION = 'v1.0.10';

const workflowFeatures = [
  {
    index: '01',
    title: 'Analyze',
    copy: 'Run wallet-level investigations with timelines, funding context, risk signals, and AI summaries tied to the same backend intelligence as the web app.'
  },
  {
    index: '02',
    title: 'Compare',
    copy: 'Compare two or more wallets with shared funders, overlap scoring, graph views, detailed explorer links, and cached per-tab results.'
  },
  {
    index: '03',
    title: 'Contract Scanner',
    copy: 'Inspect smart contracts for interactors, funding patterns, token movement, suspicious clusters, and investigation-ready detail views.'
  },
  {
    index: '04',
    title: 'Sybil + CEX Flow',
    copy: 'Move from wallet behavior to exchange flow and sybil pattern checks without switching tools or losing the current case context.'
  },
  {
    index: '05',
    title: 'Graph Investigation',
    copy: 'Use the same visual language as Analyze: consistent line charts, relationship graphs, node maps, and full-screen graph inspection.'
  },
  {
    index: '06',
    title: 'Exportable Evidence',
    copy: 'Keep CSV, JSON, and report-friendly outputs clean for analysts, compliance teams, internal reviews, or external handoff.'
  }
];

const desktopModules = ['Analyze', 'Compare', 'Contract', 'Interactors', 'Sybil', 'CEX Flow'];

const navItems = LANDING_NAV_ITEMS.map((item) =>
  item.label === 'Download' ? { ...item, active: true } : item
);

export function DownloadPage() {
  return (
    <LandingLayout navItems={navItems} showSearch={false}>
      <div className="download-page">
        <section className="download-hero">
          <div className="download-hero__copy">
            <p className="download-hero__kicker">FUNDTRACER DESKTOP</p>
            <h1 className="download-hero__title">Native blockchain intelligence for long investigations.</h1>
            <p className="download-hero__subtitle">
              Move the FundTracer workflow into a dedicated desktop app built for analysts who keep multiple
              cases open: wallet analysis, compare, contract scanning, interactors, sybil detection, CEX flow,
              graph exploration, AI breakdowns, and per-tab investigation memory.
            </p>
            <div className="download-hero__actions">
              <a className="download-btn download-btn--primary" href="#windows">Download for Windows</a>
              <a className="download-btn download-btn--secondary" href="#linux">Download for Linux</a>
            </div>
            <div className="download-hero__meta" aria-label="Release details">
              <span>Latest release: {RELEASE_VERSION}</span>
              <span>Windows + Linux builds</span>
              <span>Shared FundTracer backend</span>
            </div>
          </div>

          <div className="download-hero__console" aria-label="FundTracer Desktop preview">
            <div className="download-window">
              <div className="download-window__bar">
                <span />
                <span />
                <span />
              </div>
              <div className="download-window__body">
                <div className="download-window__sidebar">
                  {desktopModules.map((module) => (
                    <span key={module}>{module}</span>
                  ))}
                </div>
                <div className="download-window__main">
                  <div className="download-scan-card">
                    <div>
                      <p>ACTIVE CASE</p>
                      <strong>Wallet cluster review</strong>
                    </div>
                    <span>AI Ready</span>
                  </div>
                  <div className="download-graph-preview">
                    <i className="node node--a" />
                    <i className="node node--b" />
                    <i className="node node--c" />
                    <i className="node node--d" />
                    <svg viewBox="0 0 360 160" aria-hidden="true">
                      <path d="M65 102 C120 35 190 50 236 88 S308 112 326 52" />
                      <path d="M83 104 C146 130 190 118 244 88" />
                      <path d="M236 88 C210 30 138 34 102 70" />
                    </svg>
                  </div>
                  <div className="download-window__stats">
                    <span><strong>4</strong> wallets</span>
                    <span><strong>18</strong> shared signals</span>
                    <span><strong>0.84</strong> risk score</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="download-features">
          <div className="download-section-heading">
            <p>Investigation Workflow</p>
            <h2>Everything important from the web app, tuned for desktop sessions.</h2>
          </div>
          <div className="download-feature-grid">
            {workflowFeatures.map((feature) => (
              <article className="download-feature-card" key={feature.title}>
                <span>{feature.index}</span>
                <h3>{feature.title}</h3>
                <p>{feature.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="download-platform-grid" aria-label="Desktop download options">
          <article id="windows" className="download-platform download-platform--windows">
            <div className="download-platform__head">
              <div>
                <p>Recommended</p>
                <h2>Windows</h2>
              </div>
              <span>.exe + .msi</span>
            </div>
            <p>
              Use the latest Windows installer from GitHub Releases. Choose the <code>.exe</code> installer for
              normal installs or <code>.msi</code> when you need a package that works better with managed deployments.
            </p>
            <ul>
              <li>Best option for most analysts and compliance teams</li>
              <li>Includes Analyze, Compare, Contract, Interactors, Sybil, and CEX Flow</li>
              <li>Uses the same authenticated backend and intelligence pipeline as FundTracer web</li>
            </ul>
            <a className="download-btn download-btn--primary" href={DOWNLOAD_BASE} target="_blank" rel="noopener noreferrer">
              Open Windows Release Assets
            </a>
          </article>

          <article id="linux" className="download-platform download-platform--linux">
            <div className="download-platform__head">
              <div>
                <p>Linux</p>
                <h2>AUR + Release Assets</h2>
              </div>
              <span>yay / deb / rpm / AppImage</span>
            </div>
            <p>
              Install from AUR on Arch-based systems or use direct release artifacts for other Linux environments.
              The Linux package tracks the same desktop release stream.
            </p>
            <div className="download-code">
              <code>yay -S fundtracer-desktop-bin</code>
            </div>
            <ul>
              <li>Good fit for analyst workstations, SOC labs, and investigation sandboxes</li>
              <li>Deb, RPM, and AppImage builds are available from release assets</li>
              <li>Per-tab cache keeps long-running cases isolated from each other</li>
            </ul>
            <a className="download-btn download-btn--secondary" href={DOWNLOAD_BASE} target="_blank" rel="noopener noreferrer">
              Open Linux Release Assets
            </a>
          </article>
        </section>
      </div>
    </LandingLayout>
  );
}

export default DownloadPage;
