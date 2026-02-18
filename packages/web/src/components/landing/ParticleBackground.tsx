import React, { useRef, useEffect, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  hue: number;
}

interface MouseState {
  x: number;
  y: number;
  radius: number;
}

export function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef<MouseState>({ x: -1000, y: -1000, radius: 150 });
  const animationRef = useRef<number>();
  const dimensionsRef = useRef({ width: 0, height: 0 });

  const createParticles = useCallback((width: number, height: number) => {
    const particleCount = Math.floor((width * height) / 12000);
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.2,
        hue: Math.random() * 60 + 180,
      });
    }

    particlesRef.current = particles;
  }, []);

  const drawConnections = useCallback((ctx: CanvasRenderingContext2D, particles: Particle[]) => {
    const maxDistance = 120;
    
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < maxDistance) {
          const opacity = (1 - distance / maxDistance) * 0.15;
          ctx.beginPath();
          ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
          ctx.lineWidth = 0.5;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
  }, []);

  const drawMouseConnections = useCallback((ctx: CanvasRenderingContext2D, particles: Particle[], mouse: MouseState) => {
    if (mouse.x < 0 || mouse.y < 0) return;

    const maxDistance = 200;
    
    particles.forEach((particle) => {
      const dx = particle.x - mouse.x;
      const dy = particle.y - mouse.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < maxDistance) {
        const opacity = (1 - distance / maxDistance) * 0.4;
        const gradient = ctx.createLinearGradient(particle.x, particle.y, mouse.x, mouse.y);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
        gradient.addColorStop(1, `rgba(150, 150, 150, ${opacity * 0.5})`);
        
        ctx.beginPath();
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1;
        ctx.moveTo(particle.x, particle.y);
        ctx.lineTo(mouse.x, mouse.y);
        ctx.stroke();
      }
    });
  }, []);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { width, height } = dimensionsRef.current;
    ctx.clearRect(0, 0, width, height);

    const mouse = mouseRef.current;
    const particles = particlesRef.current;

    particles.forEach((particle) => {
      const dx = mouse.x - particle.x;
      const dy = mouse.y - particle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxMouseDistance = mouse.radius;

      if (distance < maxMouseDistance && mouse.x > 0 && mouse.y > 0) {
        const force = (maxMouseDistance - distance) / maxMouseDistance;
        const angle = Math.atan2(dy, dx);
        particle.vx -= Math.cos(angle) * force * 0.02;
        particle.vy -= Math.sin(angle) * force * 0.02;
      }

      particle.x += particle.vx;
      particle.y += particle.vy;

      particle.vx *= 0.99;
      particle.vy *= 0.99;

      if (particle.x < 0) particle.x = width;
      if (particle.x > width) particle.x = 0;
      if (particle.y < 0) particle.y = height;
      if (particle.y > height) particle.y = 0;

      const glow = ctx.createRadialGradient(
        particle.x, particle.y, 0,
        particle.x, particle.y, particle.size * 3
      );
      glow.addColorStop(0, `rgba(255, 255, 255, ${particle.opacity})`);
      glow.addColorStop(0.5, `rgba(200, 200, 200, ${particle.opacity * 0.3})`);
      glow.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.beginPath();
      ctx.fillStyle = glow;
      ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity + 0.2})`;
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    });

    drawConnections(ctx, particles);
    drawMouseConnections(ctx, particles, mouse);

    animationRef.current = requestAnimationFrame(animate);
  }, [drawConnections, drawMouseConnections]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      dimensionsRef.current = { width, height };
      createParticles(width, height);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouseRef.current.x = -1000;
      mouseRef.current.y = -1000;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate, createParticles]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
