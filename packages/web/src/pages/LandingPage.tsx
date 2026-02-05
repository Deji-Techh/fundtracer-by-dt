import React from 'react';
import { LandingNav } from '../components/landing/LandingNav';
import { Hero } from '../components/landing/Hero';
import { Features } from '../components/landing/Features';
import { ScreenshotShowcase } from '../components/landing/ScreenshotShowcase';
import { PricingPreview } from '../components/landing/PricingPreview';
import { Footer } from '../components/landing/Footer';
import './LandingPage.css';

interface LandingPageProps {
  onLaunchApp?: () => void;
}

export function LandingPage({ onLaunchApp }: LandingPageProps) {
  console.log('[LandingPage] Rendering landing page');
  
  return (
    <div className="landing-page" style={{ backgroundColor: '#0a0a0a', minHeight: '100vh' }}>
      <LandingNav onLaunchApp={onLaunchApp} />
      <main className="landing-main">
        <Hero onLaunchApp={onLaunchApp} />
        <Features />
        <ScreenshotShowcase />
        <PricingPreview />
      </main>
      <Footer />
    </div>
  );
}

export default LandingPage;
