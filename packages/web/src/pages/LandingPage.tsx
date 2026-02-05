import React from 'react';
import { LandingNav } from '../components/landing/LandingNav';
import { Hero } from '../components/landing/Hero';
import { Features } from '../components/landing/Features';
import { ScreenshotShowcase } from '../components/landing/ScreenshotShowcase';
import { Pricing } from '../components/landing/Pricing';
import { Footer } from '../components/landing/Footer';

interface LandingPageProps {
  onLaunchApp?: () => void;
}

export function LandingPage({ onLaunchApp }: LandingPageProps) {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#0a0a0a',
      color: '#ffffff'
    }}>
      <LandingNav onLaunchApp={onLaunchApp} />
      <Hero onLaunchApp={onLaunchApp} />
      <Features />
      <ScreenshotShowcase />
      <Pricing />
      <Footer />
    </div>
  );
}

export default LandingPage;
