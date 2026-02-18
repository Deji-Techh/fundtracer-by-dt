import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValue, AnimatePresence } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon, PlayIcon } from '@hugeicons/core-free-icons';
import { VideoModal } from '../VideoModal';
import { SplitText, ScrambleText } from './SplitText';
import './Hero.css';

interface HeroProps {
  onLaunchApp?: () => void;
}

export function Hero({ onLaunchApp }: HeroProps) {
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const sectionRef = useRef<HTMLElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, 300]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.9]);
  const rotateX = useTransform(scrollYProgress, [0, 0.5], [0, 10]);

  const springConfig = { damping: 100, stiffness: 400 };
  const xSpring = useSpring(mouseX, springConfig);
  const ySpring = useSpring(mouseY, springConfig);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = sectionRef.current?.getBoundingClientRect();
    if (rect) {
      const x = (e.clientX - rect.left - rect.width / 2) / 30;
      const y = (e.clientY - rect.top - rect.height / 2) / 30;
      mouseX.set(x);
      mouseY.set(y);
      setMousePosition({ x, y });
    }
  }, [mouseX, mouseY]);

  return (
    <motion.section
      ref={sectionRef}
      className="hero-section-v2"
      onMouseMove={handleMouseMove}
      style={{ opacity }}
    >
      <div className="hero-mesh-gradient" />
      
      <div className="hero-noise" />

      <motion.div
        className="hero-content-v2"
        style={{
          y,
          scale,
          rotateX,
          transformPerspective: 1000,
        }}
      >
        <motion.div
          className="hero-badge-v2"
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{
            x: useTransform(xSpring, (v) => v * 1.5),
            y: useTransform(ySpring, (v) => v * 1.5),
          }}
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
          <ScrambleText text="Now supporting 7+ blockchains" delay={500} speed={40} />
        </motion.div>

        <motion.h1
          className="hero-title-v2"
          style={{
            x: useTransform(xSpring, (v) => v * 2),
            y: useTransform(ySpring, (v) => v * 2),
          }}
        >
          <SplitText
            text="Advanced Blockchain"
            animation="fadeUp"
            delay={0.3}
            staggerDuration={0.04}
            charClassName="hero-char"
          />
          <br />
          <motion.span
            className="hero-title-gradient-v2"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            style={{
              backgroundPosition: useTransform(scrollYProgress, [0, 0.5], ['0% 50%', '100% 50%']),
            }}
          >
            <SplitText
              text="Forensics & Intelligence"
              animation="wave"
              delay={0.7}
              staggerDuration={0.03}
              charClassName="hero-char-gradient"
            />
          </motion.span>
        </motion.h1>

        <motion.div
          className="hero-tagline-v2"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          style={{
            x: useTransform(xSpring, (v) => v * 1.2),
            y: useTransform(ySpring, (v) => v * 1.2),
          }}
        >
          <motion.div
            className="tagline-border"
            animate={{
              rotate: [0, 360],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
          <div className="tagline-inner">
            <motion.span
              animate={{
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              ◆
            </motion.span>
            <span>Trace with precision, scale with confidence</span>
            <motion.span
              animate={{
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 1,
              }}
            >
              ◆
            </motion.span>
          </div>
        </motion.div>

        <motion.p
          className="hero-description-v2"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.4 }}
        >
          Analyze wallets, detect Sybil patterns, and trace funding sources across Ethereum, 
          Linea, Arbitrum, and more. Professional-grade tools for researchers, investors, 
          and compliance teams.
        </motion.p>

        <motion.div
          className="hero-buttons-v2"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.6 }}
        >
          <motion.button
            onClick={onLaunchApp}
            className="hero-btn-v2 hero-btn-primary-v2"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            data-cursor="pointer"
            data-cursor-text="Launch"
          >
            <span className="btn-content">
              <span>Launch App</span>
              <motion.span
                className="btn-icon"
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <HugeiconsIcon icon={ArrowRight01Icon} size={20} strokeWidth={2} />
              </motion.span>
            </span>
            <motion.span
              className="btn-shine"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.button>

          <motion.button
            onClick={() => setIsVideoOpen(true)}
            className="hero-btn-v2 hero-btn-secondary-v2"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            data-cursor="pointer"
          >
            <motion.span
              className="btn-icon-wrapper"
              whileHover={{ scale: 1.1 }}
            >
              <HugeiconsIcon icon={PlayIcon} size={18} strokeWidth={2} />
            </motion.span>
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
            { number: '7+', label: 'Blockchains' },
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
              whileHover={{ y: -4, scale: 1.02 }}
              style={{
                x: useTransform(xSpring, (v) => v * 0.5),
              }}
            >
              <motion.div
                className="stat-number-v2"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 2.2 + index * 0.1, type: 'spring' }}
              >
                {stat.number}
              </motion.div>
              <div className="stat-label-v2">{stat.label}</div>
              <motion.div
                className="stat-glow"
                animate={{
                  opacity: [0, 0.5, 0],
                  scale: [1, 1.5, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: index * 0.5,
                }}
              />
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      <motion.div
        className="hero-scroll-indicator"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3 }}
        style={{ opacity: useTransform(scrollYProgress, [0, 0.1], [1, 0]) }}
      >
        <motion.div
          className="scroll-line"
          animate={{ scaleY: [0, 1, 0], y: [0, 0, 20] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <span>Scroll to explore</span>
      </motion.div>
    </motion.section>
  );
}
