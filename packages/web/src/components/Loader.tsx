import React, { useEffect, useState } from 'react';
import '../styles/Loader.css';

interface LoaderProps {
  onComplete?: () => void;
}

export function Loader({ onComplete }: LoaderProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Animate characters
    const chars = document.querySelectorAll('.loader-char');
    chars.forEach((char, i) => {
      setTimeout(() => {
        (char as HTMLElement).style.animationPlayState = 'running';
      }, 200 + i * 90);
    });

    // Show cursor after last char
    const allDone = 200 + 810 + 500;
    setTimeout(() => {
      const cursor = document.getElementById('lcursor');
      if (cursor) {
        (cursor as HTMLElement).style.animationPlayState = 'running';
        cursor.style.opacity = '1';
      }
    }, allDone + 100);

    // Fade out loader
    setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, allDone + 100 + 1600);
  }, [onComplete]);

  return (
    <div id="loader" className={isVisible ? '' : 'hidden'}>
      <div className="loader-text">
        <span className="loader-char" id="lc0" style={{ animationDelay: '0ms' } as React.CSSProperties}>F</span>
        <span className="loader-char" id="lc1" style={{ animationDelay: '90ms' } as React.CSSProperties}>U</span>
        <span className="loader-char" id="lc2" style={{ animationDelay: '180ms' } as React.CSSProperties}>N</span>
        <span className="loader-char" id="lc3" style={{ animationDelay: '270ms' } as React.CSSProperties}>D</span>
        <span className="loader-char" id="lc4" style={{ animationDelay: '360ms' } as React.CSSProperties}>T</span>
        <span className="loader-char" id="lc5" style={{ animationDelay: '450ms' } as React.CSSProperties}>R</span>
        <span className="loader-char" id="lc6" style={{ animationDelay: '540ms' } as React.CSSProperties}>A</span>
        <span className="loader-char" id="lc7" style={{ animationDelay: '630ms' } as React.CSSProperties}>C</span>
        <span className="loader-char" id="lc8" style={{ animationDelay: '720ms' } as React.CSSProperties}>E</span>
        <span className="loader-char" id="lc9" style={{ animationDelay: '810ms' } as React.CSSProperties}>R</span>
        <span className="loader-cursor" id="lcursor">_</span>
      </div>
    </div>
  );
}

export default Loader;
