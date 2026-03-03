import React from 'react';
import { LandingNav } from '../components/landing/LandingNav';
import { Hero } from '../components/landing/Hero';
import { ApiProvidersShowcase } from '../components/landing/ApiProvidersShowcase';
import { Features } from '../components/landing/Features';
import { ChromeExtensionPromo } from '../components/landing/ChromeExtensionPromo';
import { CliShowcase } from '../components/landing/CliShowcase';
import { ScreenshotShowcase } from '../components/landing/ScreenshotShowcase';
import { Pricing } from '../components/landing/Pricing';
import { Footer } from '../components/landing/Footer';
import './LandingPage.css';

export function LandingPage() {
  return (
    <div className="landing-page-v2">
      <LandingNav />
      <Hero />
      <ApiProvidersShowcase />
      <Features />
      <ChromeExtensionPromo />
      <CliShowcase />
      <ScreenshotShowcase />
      <Pricing />
      <Footer />
    </div>
  );
}

export default LandingPage;
