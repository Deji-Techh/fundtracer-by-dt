import React from 'react';
import { LandingNav } from '../components/landing/LandingNav';
import { Hero } from '../components/landing/Hero';
import { ApiProvidersShowcase } from '../components/landing/ApiProvidersShowcase';
import { Features } from '../components/landing/Features';
import { CliShowcase } from '../components/landing/CliShowcase';
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
      backgroundColor: '#000000',
      color: '#ffffff'
    }}>
      <LandingNav onLaunchApp={onLaunchApp} />
      <Hero onLaunchApp={onLaunchApp} />
      <ApiProvidersShowcase />
      <Features onLaunchApp={onLaunchApp} />
      <CliShowcase />
      <ScreenshotShowcase />
      <Pricing onLaunchApp={onLaunchApp} />
      <Footer onLaunchApp={onLaunchApp} />
    </div>
  );
}

export default LandingPage;
