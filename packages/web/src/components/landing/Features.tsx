import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
import { Wallet01Icon, File02Icon, GitCompareIcon, Shield01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { SplitText } from './SplitText';
import './Features.css';

const features = [
  {
    icon: Wallet01Icon,
    title: 'Wallet Analysis',
    description: 'Deep dive into any wallet address across multiple chains. View transaction history, funding sources, portfolio composition, and behavioral patterns.',
    features: ['Transaction timeline', 'Funding tree visualization', 'Token holdings', 'Risk scoring'],
  },
  {
    icon: File02Icon,
    title: 'Contract Analytics',
    description: 'Analyze smart contracts to understand their behavior, security, and interactions. Perfect for due diligence and research.',
    features: ['Contract creation analysis', 'Interaction patterns', 'Security checks', 'Holder distribution'],
  },
  {
    icon: GitCompareIcon,
    title: 'Wallet Comparison',
    description: 'Compare multiple wallets side-by-side to identify connections, similarities, and coordinated behaviors.',
    features: ['Side-by-side comparison', 'Shared interactions', 'Similarity scoring', 'Visual mapping'],
  },
  {
    icon: Shield01Icon,
    title: 'Sybil Detection',
    description: 'Identify coordinated bot networks and fake accounts using advanced algorithms and network analysis.',
    features: ['Same-block detection', 'Funding clustering', 'Pattern analysis', 'Network graphs'],
  },
];

export function Features() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], [100, -100]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

  return (
    <section className="features-section-v2" ref={containerRef}>
      <div className="features-container-v2">
        <motion.div className="features-header-v2" style={{ opacity }}>
          <motion.div
            className="features-label-v2"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <motion.span
              className="label-line"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
            />
            <span>Features</span>
          </motion.div>
          
          <motion.h2
            className="features-title-v2"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <SplitText
              text="Everything you need for"
              animation="fadeUp"
              staggerDuration={0.02}
            />
            <br />
            <span className="features-title-highlight">
              <SplitText
                text="blockchain intelligence"
                animation="blur"
                staggerDuration={0.02}
                delay={0.3}
              />
            </span>
          </motion.h2>
          
          <motion.p
            className="features-subtitle-v2"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            Professional-grade tools designed for researchers, investors, and compliance teams
          </motion.p>
        </motion.div>

        <div className="features-grid-v2">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} index={index} />
          ))}
        </div>

        <motion.div
          className="features-cta-v2"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <motion.button
            onClick={() => window.location.href = '/evm'}
            className="features-btn-v2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>Explore All Features</span>
            <HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={2} />
          </motion.button>
        </motion.div>
      </div>

      <motion.div className="features-bg-gradient" style={{ y }} />
    </section>
  );
}

interface FeatureCardProps {
  feature: typeof features[0];
  index: number;
}

function FeatureCard({ feature, index }: FeatureCardProps) {
  return (
    <motion.div
      className="feature-card-v2"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay: index * 0.15 }}
      whileHover={{ y: -4 }}
    >
      <div className="feature-card-inner">
        <div className="feature-icon-v2">
          <HugeiconsIcon icon={feature.icon} size={32} strokeWidth={1.5} />
        </div>

        <h3 className="feature-title-v2">{feature.title}</h3>
        <p className="feature-description-v2">{feature.description}</p>

        <ul className="feature-list-v2">
          {feature.features.map((item, i) => (
            <motion.li
              key={i}
              className="feature-list-item-v2"
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
            >
              <span className="feature-bullet-v2" />
              {item}
            </motion.li>
          ))}
        </ul>

        <motion.div
          className="feature-card-border"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
        />
      </div>
    </motion.div>
  );
}
