import React from 'react';
import { useNavigate } from 'react-router-dom';
import './HowItWorksPage.css';

const steps = [
  {
    number: '01',
    title: 'Enter Wallet Address',
    description: 'Simply paste any wallet address you want to analyze. We support addresses from Ethereum, Linea, Arbitrum, Base, Polygon, Optimism, and BSC.',
    icon: '◆'
  },
  {
    number: '02',
    title: 'Select Analysis Type',
    description: 'Choose from Wallet Analysis, Contract Analytics, Wallet Comparison, or Sybil Detection. Each mode provides specialized insights for different use cases.',
    icon: '◆'
  },
  {
    number: '03',
    title: 'Choose Blockchain',
    description: 'Select which blockchain network to analyze. Free users can analyze Linea, while Pro and Max users have access to all 7+ supported networks.',
    icon: '◆'
  },
  {
    number: '04',
    title: 'Get Results',
    description: 'Receive comprehensive analysis within seconds. View transaction timelines, funding trees, risk scores, and detailed behavioral patterns.',
    icon: '◆'
  }
];

const useCases = [
  {
    title: 'For Researchers',
    description: 'Academic and independent researchers use FundTracer to study blockchain ecosystems, analyze token flows, and identify market patterns.'
  },
  {
    title: 'For Investors',
    description: 'Investors leverage our tools for due diligence, tracking whale wallets, and identifying potential investment opportunities or risks.'
  },
  {
    title: 'For Compliance Teams',
    description: 'Compliance professionals use FundTracer to detect suspicious activities, ensure regulatory compliance, and investigate potential fraud.'
  },
  {
    title: 'For Developers',
    description: 'Web3 developers integrate our insights to build better dApps, analyze user behavior, and improve their protocols.'
  }
];

export function HowItWorksPage() {
  const navigate = useNavigate();
  return (
    <div className="how-it-works-page">
      <button className="back-button" onClick={() => navigate(-1)}>
        ← Back
      </button>
      
      <section className="how-hero">
        <span className="how-label">How It Works</span>
        <h1 className="how-title">Simple, Powerful Analysis</h1>
        <p className="how-subtitle">
          Get started in minutes with our intuitive platform
        </p>
      </section>

      <section className="how-steps">
        <div className="how-steps-container">
          {steps.map((step, index) => (
            <div key={index} className="how-step">
              <div className="how-step-number">{step.number}</div>
              <div className="how-step-content">
                <div className="how-step-icon">{step.icon}</div>
                <h3 className="how-step-title">{step.title}</h3>
                <p className="how-step-description">{step.description}</p>
              </div>
              {index < steps.length - 1 && <div className="how-step-connector" />}
            </div>
          ))}
        </div>
      </section>

      <section className="how-video">
        <h2 className="how-section-title">See It In Action</h2>
        <div className="how-video-placeholder">
          <video 
            src="/videos/demo.mp4" 
            controls 
            playsInline
            className="how-video-player"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      </section>

      <section className="how-use-cases">
        <h2 className="how-section-title">Who Uses FundTracer?</h2>
        <div className="how-use-cases-grid">
          {useCases.map((useCase, index) => (
            <div key={index} className="how-use-case-card">
              <h3 className="how-use-case-title">{useCase.title}</h3>
              <p className="how-use-case-description">{useCase.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="how-cta">
        <h2>Ready to start analyzing?</h2>
        <button className="how-cta-button">Launch App</button>
      </section>

      <footer className="page-footer">
        <a href="/terms">Terms of Service</a>
        <span>•</span>
        <a href="/privacy">Privacy Policy</a>
      </footer>
    </div>
  );
}
