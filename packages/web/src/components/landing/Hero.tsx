import React, { useState } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import './Hero.css';

export function Hero() {
  const { scrollYProgress } = useScroll({
    offset: ['start start', 'end start'],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.5], [0, 100]);
  const [showVideo, setShowVideo] = useState(false);

  return (
    <motion.section
      className="ios-hero"
      style={{ opacity }}
    >
      <div className="ios-hero-bg">
        <div className="ios-hero-gradient" />
        <div className="ios-hero-noise" />
        <div className="ios-hero-orb orb-1" />
        <div className="ios-hero-orb orb-2" />
      </div>

      <motion.div 
        className="ios-hero-content"
        style={{ y }}
      >
        <motion.div
          className="ios-hero-badge"
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <span className="ios-badge-dot" />
          <span>Now supporting Solana + 8+ EVM chains</span>
        </motion.div>

        <motion.h1 
          className="ios-hero-title"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <span className="ios-title-line">Advanced Blockchain</span>
          <span className="ios-title-gradient">ANALYSER</span>
        </motion.h1>

        <motion.p
          className="ios-hero-description"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          Analyze wallets, detect Sybil patterns, and trace funding sources across Ethereum, 
          Solana, Linea, Arbitrum, and more.
        </motion.p>

        <motion.div
          className="ios-hero-buttons"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <motion.button
            onClick={() => window.location.href = '/app-evm'}
            className="ios-btn-primary"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>Launch on EVM</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </motion.button>

          <motion.button
            onClick={() => window.location.href = '/app-solana'}
            className="ios-btn-secondary"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>Launch on Solana</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </motion.button>

          <motion.button
            onClick={() => setShowVideo(true)}
            className="ios-btn-ghost"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            <span>View Demo</span>
          </motion.button>
        </motion.div>

        <motion.div
          className="ios-hero-stats"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          <div className="ios-stat">
            <span className="ios-stat-value">50K+</span>
            <span className="ios-stat-label">Wallets Analyzed</span>
          </div>
          <div className="ios-stat-divider" />
          <div className="ios-stat">
            <span className="ios-stat-value">7+</span>
            <span className="ios-stat-label">Chains Supported</span>
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {showVideo && (
          <motion.div
            className="video-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowVideo(false)}
          >
            <motion.div
              className="video-modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                className="video-modal-close"
                onClick={() => setShowVideo(false)}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
              <video 
                src="/videos/demo.mp4" 
                controls 
                autoPlay 
                className="video-modal-player"
              >
                Your browser does not support the video tag.
              </video>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

export default Hero;
