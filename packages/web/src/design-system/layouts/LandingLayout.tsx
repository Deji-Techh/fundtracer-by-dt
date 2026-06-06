import React from 'react';
import { LandingNav } from '../../components/landing/LandingNav';
import './LandingLayout.css';

interface LandingLayoutProps {
  children: React.ReactNode;
  className?: string;
  navItems?: Array<{
    label: string;
    href: string;
    active?: boolean;
    children?: Array<{ label: string; href: string }>;
  }>;
  headerRight?: React.ReactNode;
  showSearch?: boolean;
  transparent?: boolean;
}

export function LandingLayout({ children, className = '' }: LandingLayoutProps) {
  return (
    <div className={`landing-layout ft-public-shell ${className}`}>
      <LandingNav />
      <main className="landing-content ft-public-shell__content">
        {children}
      </main>
      <footer className="landing-footer ft-public-shell__footer">
        <div className="ft-public-shell__footer-inner">
          <a href="/" className="ft-public-shell__footer-brand">
            <img src="/logo.png" alt="" />
            <span>FundTracer</span>
          </a>
          <nav aria-label="Footer navigation">
            <a href="/features">Features</a>
            <a href="/pricing">Pricing</a>
            <a href="/api-docs">API</a>
            <a href="/mcp">MCP</a>
            <a href="/cli">CLI</a>
            <a href="/docs/getting-started">Docs</a>
            <a href="/privacy">Privacy</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

export default LandingLayout;
