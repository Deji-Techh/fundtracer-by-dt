import React, { useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon, PlayIcon } from '@hugeicons/core-free-icons';
import { VideoModal } from '../VideoModal';
import { SplitText, ScrambleText } from './SplitText';
import './Hero.css';

export function Hero() {
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  const { scrollYProgress } = useScroll({
    offset: ['start start', 'end start'],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <motion.section
      className="hero-section-v2"
      style={{ opacity }}
    >
      <div className="hero-mesh-gradient" />
      <div className="hero-noise" />

      <motion.div
        className="hero-content-v2"
      >
        <motion.div
          className="hero-badge-v2"
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <motion.span
            className="badge-pulse"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [1, 0.5, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <ScrambleText text="Now supporting Solana + 7+ EVM chains" delay={500} speed={40} />
        </motion.div>

        <motion.h1 className="hero-title-v2">
          <span style={{ display: 'block' }}>
            <SplitText
              text="Advanced Blockchain"
              animation="fadeUp"
              delay={0.3}
              staggerDuration={0.04}
              charClassName="hero-char"
            />
          </span>
          <span style={{ display: 'block', marginTop: 8 }}>
            <motion.span
              className="hero-title-gradient-v2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              ANALYSER
            </motion.span>
          </span>
        </motion.h1>

        <motion.div
          className="hero-tagline-v2"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 1.2 }}
        >
          <motion.div
            className="tagline-border"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          />
          <div className="tagline-inner">
            <span>◆</span>
            <span>Trace with precision, scale with confidence</span>
            <span>◆</span>
          </div>
        </motion.div>

        <motion.p
          className="hero-description-v2"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.4 }}
        >
          Analyze wallets, detect Sybil patterns, and trace funding sources across Ethereum, 
          Solana, Linea, Arbitrum, and more. Professional-grade tools for researchers, investors, 
          and compliance teams.
        </motion.p>

        <motion.div
          className="hero-buttons-v2"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.6 }}
        >
          <motion.button
            onClick={() => window.location.href = '/app-evm'}
            className="hero-btn-v2 hero-btn-primary-v2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="btn-content">
              <span>Launch on EVM</span>
              <HugeiconsIcon icon={ArrowRight01Icon} size={20} strokeWidth={2} />
            </span>
          </motion.button>

          <motion.button
            onClick={() => window.location.href = '/app-solana'}
            className="hero-btn-v2 solana-btn"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="btn-content">
              <span>Launch on Solana</span>
              <HugeiconsIcon icon={ArrowRight01Icon} size={20} strokeWidth={2} />
            </span>
          </motion.button>

          <motion.button
            onClick={() => setIsVideoOpen(true)}
            className="hero-btn-v2 hero-btn-secondary-v2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <HugeiconsIcon icon={PlayIcon} size={18} strokeWidth={2} />
            <span>View Demo</span>
          </motion.button>
        </motion.div>

        <VideoModal
          isOpen={isVideoOpen}
          onClose={() => setIsVideoOpen(false)}
          videoSrc="/videos/demo.mp4"
        />

        <motion.div
          className="hero-stats-v2"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.8 }}
        >
            {[
            { number: '8+', label: 'Blockchains' },
            { number: '10K+', label: 'Wallets Analyzed' },
            { number: 'Real-time', label: 'Data' },
            { number: 'Enterprise', label: 'Security' },
          ].map((stat, index) => (
            <motion.div
              key={index}
              className="hero-stat-v2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 2 + index * 0.1 }}
              whileHover={{ y: -4 }}
            >
              <div className="stat-number-v2">{stat.number}</div>
              <div className="stat-label-v2">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </motion.section>
  );
}
