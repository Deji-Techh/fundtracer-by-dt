import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView, useAnimation, Variants } from 'framer-motion';

interface SplitTextProps {
  text: string;
  className?: string;
  charClassName?: string;
  animation?: 'fadeUp' | 'fadeDown' | 'blur' | 'glitch' | 'wave';
  delay?: number;
  staggerDuration?: number;
  once?: boolean;
}

const animations: Record<string, Variants> = {
  fadeUp: {
    hidden: { y: 100, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  },
  fadeDown: {
    hidden: { y: -100, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  },
  blur: {
    hidden: { filter: 'blur(12px)', opacity: 0 },
    visible: { filter: 'blur(0px)', opacity: 1 },
  },
  glitch: {
    hidden: { 
      x: 0, 
      opacity: 0,
      filter: 'blur(8px)',
    },
    visible: { 
      x: 0, 
      opacity: 1,
      filter: 'blur(0px)',
    },
  },
  wave: {
    hidden: { y: 50, rotateX: 90, opacity: 0 },
    visible: { y: 0, rotateX: 0, opacity: 1 },
  },
};

export function SplitText({
  text,
  className = '',
  charClassName = '',
  animation = 'fadeUp',
  delay = 0,
  staggerDuration = 0.03,
  once = true,
}: SplitTextProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, margin: '-50px' });
  const controls = useAnimation();
  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    if (isInView && !isAnimated) {
      controls.start('visible');
      if (once) setIsAnimated(true);
    } else if (!isInView && !once) {
      controls.start('hidden');
    }
  }, [isInView, controls, once, isAnimated]);

  const chars = text.split('');

  return (
    <div ref={ref} className={`split-text ${className}`} style={{ overflow: 'hidden' }}>
      {chars.map((char, i) => (
        <motion.span
          key={i}
          className={`split-char ${charClassName}`}
          variants={animations[animation]}
          initial="hidden"
          animate={controls}
          transition={{
            duration: 0.6,
            delay: delay + i * staggerDuration,
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{ display: 'inline-block', whiteSpace: char === ' ' ? 'pre' : 'normal' }}
        >
          {char}
        </motion.span>
      ))}
    </div>
  );
}

interface ScrambleTextProps {
  text: string;
  className?: string;
  speed?: number;
  delay?: number;
  trigger?: boolean;
}

const glitchChars = '!<>-_\\/[]{}—=+*^?#________';

export function ScrambleText({
  text,
  className = '',
  speed = 30,
  delay = 0,
  trigger = true,
}: ScrambleTextProps) {
  const [displayText, setDisplayText] = useState(text);
  const [isScrambling, setIsScrambling] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();
  const frameRef = useRef(0);

  useEffect(() => {
    if (!trigger) return;

    const startScramble = () => {
      setIsScrambling(true);
      const chars = text.split('');
      const length = chars.length;
      let iteration = 0;

      intervalRef.current = setInterval(() => {
        setDisplayText(
          chars
            .map((char, index) => {
              if (index < iteration) {
                return char;
              }
              return glitchChars[Math.floor(Math.random() * glitchChars.length)];
            })
            .join('')
        );

        if (iteration >= length) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setDisplayText(text);
          setIsScrambling(false);
        }

        iteration += 1 / 3;
      }, speed);
    };

    const timeout = setTimeout(startScramble, delay);

    return () => {
      clearTimeout(timeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text, speed, delay, trigger]);

  return (
    <span className={`scramble-text ${className} ${isScrambling ? 'scrambling' : ''}`}>
      {displayText}
    </span>
  );
}
