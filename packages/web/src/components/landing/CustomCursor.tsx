import React, { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';

interface CursorState {
  x: number;
  y: number;
  isHovering: boolean;
  isClicking: boolean;
}

export function CustomCursor() {
  const [isVisible, setIsVisible] = useState(false);
  const [cursorText, setCursorText] = useState('');
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const innerRef = useRef<HTMLDivElement>(null);

  const springConfig = { damping: 25, stiffness: 300, mass: 0.5 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  useEffect(() => {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) return;

    setIsVisible(true);

    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };

    const handleMouseDown = () => {
      document.body.classList.add('cursor-clicking');
    };

    const handleMouseUp = () => {
      document.body.classList.remove('cursor-clicking');
    };

    const handleMouseEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      if (target.closest('a, button, [data-cursor="pointer"]')) {
        document.body.classList.add('cursor-hover');
      }
      
      const cursorTextAttr = target.closest('[data-cursor-text]')?.getAttribute('data-cursor-text');
      if (cursorTextAttr) {
        setCursorText(cursorTextAttr);
      }
    };

    const handleMouseLeave = () => {
      document.body.classList.remove('cursor-hover');
      setCursorText('');
    };

    document.addEventListener('mousemove', moveCursor);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);

    const interactiveElements = document.querySelectorAll('a, button, [data-cursor="pointer"], [data-cursor-text]');
    interactiveElements.forEach((el) => {
      el.addEventListener('mouseenter', handleMouseEnter as EventListener);
      el.addEventListener('mouseleave', handleMouseLeave);
    });

    return () => {
      document.removeEventListener('mousemove', moveCursor);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      interactiveElements.forEach((el) => {
        el.removeEventListener('mouseenter', handleMouseEnter as EventListener);
        el.removeEventListener('mouseleave', handleMouseLeave);
      });
    };
  }, [cursorX, cursorY]);

  if (!isVisible) return null;

  return (
    <>
      <motion.div
        className="custom-cursor-outer"
        style={{
          x: cursorXSpring,
          y: cursorYSpring,
          translateX: '-50%',
          translateY: '-50%',
        }}
      />
      <motion.div
        ref={innerRef}
        className="custom-cursor-inner"
        style={{
          x: cursorX,
          y: cursorY,
          translateX: '-50%',
          translateY: '-50%',
        }}
      >
        {cursorText && (
          <motion.span
            className="cursor-text"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
          >
            {cursorText}
          </motion.span>
        )}
      </motion.div>
    </>
  );
}
