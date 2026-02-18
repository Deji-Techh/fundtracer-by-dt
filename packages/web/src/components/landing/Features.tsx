import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValue } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
import { Wallet01Icon, File02Icon, GitCompareIcon, Shield01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { SplitText } from './SplitText';
import './Features.css';

interface FeaturesProps {
  onLaunchApp?: () => void;
}

const features = [
  {
    icon: Wallet01Icon,
    title: 'Wallet Analysis',
    description: 'Deep dive into any wallet address across multiple chains. View transaction history, funding sources, portfolio composition, and behavioral patterns.',
    features: ['Transaction timeline', 'Funding tree visualization', 'Token holdings', 'Risk scoring'],
    gradient: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
  },
  {
    icon: File02Icon,
    title: 'Contract Analytics',
    description: 'Analyze smart contracts to understand their behavior, security, and interactions. Perfect for due diligence and research.',
    features: ['Contract creation analysis', 'Interaction patterns', 'Security checks', 'Holder distribution'],
    gradient: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
  },
  {
    icon: GitCompareIcon,
    title: 'Wallet Comparison',
    description: 'Compare multiple wallets side-by-side to identify connections, similarities, and coordinated behaviors.',
    features: ['Side-by-side comparison', 'Shared interactions', 'Similarity scoring', 'Visual mapping'],
    gradient: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
  },
  {
    icon: Shield01Icon,
    title: 'Sybil Detection',
    description: 'Identify coordinated bot networks and fake accounts using advanced algorithms and network analysis.',
    features: ['Same-block detection', 'Funding clustering', 'Pattern analysis', 'Network graphs'],
    gradient: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
  },
];

export function Features({ onLaunchApp }: FeaturesProps) {
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
        <motion.div
          className="features-header-v2"
          style={{ opacity }}
        >
          <motion.div
            className="features-label-v2"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <motion.span
              className="label-line"
              animate={{ scaleX: [0, 1] }}
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
            onClick={onLaunchApp}
            className="features-btn-v2"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            data-cursor="pointer"
            data-cursor-text="Explore"
          >
            <span>Explore All Features</span>
            <motion.span
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={2} />
            </motion.span>
          </motion.button>
        </motion.div>
      </div>

      <motion.div
        className="features-bg-gradient"
        style={{ y }}
      />
    </section>
  );
}

interface FeatureCardProps {
  feature: typeof features[0];
  index: number;
}

function FeatureCard({ feature, index }: FeatureCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [10, -10]), { damping: 30, stiffness: 300 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-10, 10]), { damping: 30, stiffness: 300 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      className="feature-card-v2"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay: index * 0.15 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
      }}
      data-cursor="pointer"
    >
      <div className="feature-card-inner">
        <motion.div
          className="feature-card-glow"
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: index * 0.5,
          }}
        />
        
        <motion.div
          className="feature-icon-v2"
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: 'spring', stiffness: 400, damping: 10 }}
          style={{ transform: 'translateZ(30px)' }}
        >
          <HugeiconsIcon icon={feature.icon} size={32} strokeWidth={1.5} />
        </motion.div>

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
              <motion.span
                className="feature-bullet-v2"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.3,
                }}
              />
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
