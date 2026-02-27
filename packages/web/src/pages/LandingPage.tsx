import React from 'react';
import { LandingNav } from '../components/landing/LandingNav';
import { Hero } from '../components/landing/Hero';
import { ApiProvidersShowcase } from '../components/landing/ApiProvidersShowcase';
import { Features } from '../components/landing/Features';
import { CliShowcase } from '../components/landing/CliShowcase';
import { ScreenshotShowcase } from '../components/landing/ScreenshotShowcase';
import { Pricing } from '../components/landing/Pricing';
import { Footer } from '../components/landing/Footer';
import './LandingPage.css';

interface LandingPageProps {
  onLaunchApp?: () => void;
  onLaunchSolana?: () => void;
}

export function LandingPage({ onLaunchApp, onLaunchSolana }: LandingPageProps) {
  return (
    <div className="landing-page-v2">
      <LandingNav onLaunchApp={onLaunchApp} onLaunchSolana={onLaunchSolana} />
      <Hero onLaunchApp={onLaunchApp} onLaunchSolana={onLaunchSolana} />
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
