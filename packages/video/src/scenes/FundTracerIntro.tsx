import { AbsoluteFill, useCurrentFrame, interpolate, useVideoConfig, Easing, spring } from 'remotion';
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont();

// Node positions - more dynamic layout
const nodes = [
  { x: 200, y: 540, label: 'Source' },
  { x: 550, y: 280, label: 'Route' },
  { x: 960, y: 540, label: 'Merge' },
  { x: 1370, y: 800, label: 'Split' },
  { x: 1720, y: 540, label: 'Target' },
];

// Generate random particles
const particles = Array.from({ length: 50 }, (_, i) => ({
  id: i,
  x: Math.random() * 1920,
  y: Math.random() * 1080,
  size: Math.random() * 3 + 1,
  speed: Math.random() * 0.5 + 0.2,
  opacity: Math.random() * 0.5 + 0.1,
}));

export const FundTracerIntro = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  
  // Animation timing
  const lineStartFrame = 0;
  const lineEndFrame = 90;
  const textStartFrame = 100;
  const textEndFrame = 130;
  
  // Line progress with smooth easing
  const lineProgress = interpolate(frame, [lineStartFrame, lineEndFrame], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });
  
  // Cursor position along the path
  const getCursorPosition = () => {
    const totalSegments = nodes.length - 1;
    const progressPerSegment = 1 / totalSegments;
    const currentSegment = Math.min(Math.floor(lineProgress / progressPerSegment), totalSegments - 1);
    const segmentProgress = (lineProgress - currentSegment * progressPerSegment) / progressPerSegment;
    
    const startNode = nodes[currentSegment];
    const endNode = nodes[currentSegment + 1];
    
    return {
      x: interpolate(segmentProgress, [0, 1], [startNode.x, endNode.x]),
      y: interpolate(segmentProgress, [0, 1], [startNode.y, endNode.y]),
    };
  };
  
  const cursorPos = getCursorPosition();
  
  // Build path
  const pathD = nodes.reduce((acc, node, index) => {
    if (index === 0) return `M ${node.x} ${node.y}`;
    return `${acc} L ${node.x} ${node.y}`;
  }, '');
  
  // Node activation timing with spring
  const getNodeSpring = (nodeIndex: number) => {
    const triggerFrame = (nodeIndex / (nodes.length - 1)) * (lineEndFrame - lineStartFrame);
    return spring({
      frame: frame - triggerFrame,
      fps,
      config: { damping: 12, stiffness: 150, mass: 0.8 },
    });
  };
  
  // Text reveal with spring
  const titleSpring = spring({
    frame: frame - textStartFrame,
    fps,
    config: { damping: 15, stiffness: 100 },
  });
  
  const subtitleSpring = spring({
    frame: frame - (textStartFrame + 15),
    fps,
    config: { damping: 15, stiffness: 100 },
  });
  
  // Background gradient animation
  const bgGradientShift = interpolate(frame, [0, durationInFrames], [0, 360], {
    extrapolateRight: 'extend',
  });
  
  // Particle animation
  const getParticleY = (particle: typeof particles[0]) => {
    return (particle.y - (frame * particle.speed)) % 1080;
  };

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(${bgGradientShift}deg, #050508 0%, #0a0a12 25%, #0f0f1a 50%, #0a0a12 75%, #050508 100%)`,
      fontFamily,
      overflow: 'hidden',
    }}>
      {/* Animated background grid */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(0, 212, 255, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 212, 255, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        transform: `perspective(1000px) rotateX(60deg) translateY(${frame * 0.5}px)`,
        transformOrigin: 'center bottom',
        opacity: 0.6,
      }} />
      
      {/* Floating particles */}
      <svg width="1920" height="1080" style={{ position: 'absolute', inset: 0 }}>
        {particles.map((particle) => (
          <circle
            key={particle.id}
            cx={particle.x}
            cy={getParticleY(particle)}
            r={particle.size}
            fill="#00d4ff"
            opacity={particle.opacity * (0.5 + 0.5 * Math.sin(frame * 0.05 + particle.id))}
          />
        ))}
      </svg>
      
      {/* Vignette overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.8) 100%)',
        pointerEvents: 'none',
      }} />
      
      {/* Main SVG animation */}
      <svg width="1920" height="1080" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          {/* Multi-layer glow filters */}
          <filter id="intenseGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2" result="blur1"/>
            <feGaussianBlur stdDeviation="6" result="blur2"/>
            <feGaussianBlur stdDeviation="12" result="blur3"/>
            <feMerge>
              <feMergeNode in="blur3"/>
              <feMergeNode in="blur2"/>
              <feMergeNode in="blur1"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          <filter id="cursorGlow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="4" result="blur1"/>
            <feGaussianBlur stdDeviation="10" result="blur2"/>
            <feGaussianBlur stdDeviation="20" result="blur3"/>
            <feMerge>
              <feMergeNode in="blur3"/>
              <feMergeNode in="blur2"/>
              <feMergeNode in="blur1"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          {/* Gradient definitions */}
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00d4ff" />
            <stop offset="33%" stopColor="#7b2cbf" />
            <stop offset="66%" stopColor="#ff006e" />
            <stop offset="100%" stopColor="#00d4ff" />
          </linearGradient>
          
          <radialGradient id="nodeGradient">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor="#00d4ff" />
            <stop offset="100%" stopColor="#00d4ff" stopOpacity="0" />
          </radialGradient>
        </defs>
        
        {/* Connection lines - permanent after traced */}
        {nodes.map((node, index) => {
          if (index === 0) return null;
          const prevNode = nodes[index - 1];
          const nodeProgress = lineProgress * (nodes.length - 1);
          const isVisible = nodeProgress >= index - 1;
          const segmentOpacity = isVisible ? 1 : 0;
          
          return (
            <line
              key={`line-${index}`}
              x1={prevNode.x}
              y1={prevNode.y}
              x2={node.x}
              y2={node.y}
              stroke="url(#lineGradient)"
              strokeWidth="3"
              filter="url(#intenseGlow)"
              opacity={segmentOpacity}
              strokeLinecap="round"
            />
          );
        })}
        
        {/* Main tracing line */}
        <path
          d={pathD}
          fill="none"
          stroke="#ffffff"
          strokeWidth="6"
          filter="url(#intenseGlow)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={2000}
          strokeDashoffset={2000 * (1 - lineProgress)}
          opacity={0.9}
        />
        
        {/* Trailing cursor with intense glow */}
        {frame < lineEndFrame && (
          <g>
            {/* Outer glow */}
            <circle
              cx={cursorPos.x}
              cy={cursorPos.y}
              r={30}
              fill="none"
              stroke="#00d4ff"
              strokeWidth="2"
              opacity={0.3}
              filter="url(#cursorGlow)"
            />
            {/* Middle ring */}
            <circle
              cx={cursorPos.x}
              cy={cursorPos.y}
              r={15}
              fill="none"
              stroke="#ffffff"
              strokeWidth="3"
              opacity={0.6}
              filter="url(#intenseGlow)"
            />
            {/* Core */}
            <circle
              cx={cursorPos.x}
              cy={cursorPos.y}
              r={6}
              fill="#ffffff"
              filter="url(#cursorGlow)"
            />
          </g>
        )}
        
        {/* Animated nodes */}
        {nodes.map((node, index) => {
          const nodeSpring = getNodeSpring(index);
          const scale = 1 + nodeSpring * 0.5;
          const isLastNode = index === nodes.length - 1;
          
          return (
            <g key={index}>
              {/* Ripple rings that expand outward */}
              {[1, 2, 3].map((ring) => (
                <circle
                  key={ring}
                  cx={node.x}
                  cy={node.y}
                  r={20 + ring * 15 * nodeSpring}
                  fill="none"
                  stroke="#00d4ff"
                  strokeWidth="1"
                  opacity={nodeSpring * (0.4 - ring * 0.1)}
                />
              ))}
              
              {/* Outer glow */}
              <circle
                cx={node.x}
                cy={node.y}
                r={25 * scale}
                fill="url(#nodeGradient)"
                opacity={nodeSpring * 0.4}
                filter="url(#intenseGlow)"
              />
              
              {/* Main node body */}
              <circle
                cx={node.x}
                cy={node.y}
                r={12 * (0.5 + nodeSpring * 0.5)}
                fill="#ffffff"
                filter="url(#intenseGlow)"
              />
              
              {/* Inner core */}
              <circle
                cx={node.x}
                cy={node.y}
                r={6 * (0.5 + nodeSpring * 0.5)}
                fill={isLastNode ? '#ff006e' : '#00d4ff'}
              />
              
              {/* Node label */}
              <text
                x={node.x}
                y={node.y + 45}
                textAnchor="middle"
                fill="#8b92a8"
                fontSize="14"
                fontWeight="500"
                opacity={nodeSpring}
                style={{ letterSpacing: '0.15em' }}
              >
                {node.label.toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>
      
      {/* Central title with dramatic reveal */}
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        pointerEvents: 'none',
      }}>
        {/* Main title with glitch/scan effect */}
        <div style={{
          position: 'relative',
          transform: `scale(${0.8 + titleSpring * 0.2})`,
          opacity: titleSpring,
        }}>
          {/* Glitch layers */}
          <h1 style={{
            fontSize: 120,
            fontWeight: 900,
            margin: 0,
            background: 'linear-gradient(180deg, #ffffff 0%, #00d4ff 50%, #7b2cbf 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: '0 0 80px rgba(0, 212, 255, 0.5)',
            letterSpacing: '-0.02em',
            position: 'relative',
            zIndex: 2,
          }}>
            FundTracer
          </h1>
          
          {/* Glow layer behind */}
          <h1 style={{
            fontSize: 120,
            fontWeight: 900,
            margin: 0,
            position: 'absolute',
            top: 0,
            left: 0,
            color: 'transparent',
            textShadow: '0 0 60px rgba(0, 212, 255, 0.8), 0 0 120px rgba(123, 44, 191, 0.4)',
            letterSpacing: '-0.02em',
            zIndex: 1,
          }}>
            FundTracer
          </h1>
        </div>
        
        {/* Subtitle with digital feel */}
        <div style={{
          marginTop: 24,
          transform: `translateY(${20 - subtitleSpring * 20}px)`,
          opacity: subtitleSpring,
        }}>
          <p style={{
            fontSize: 28,
            color: '#8b92a8',
            margin: 0,
            fontWeight: 400,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            position: 'relative',
          }}>
            {/* Decorative brackets */}
            <span style={{ color: '#00d4ff', marginRight: 16 }}>{'<'}</span>
            On-Chain Intelligence
            <span style={{ color: '#00d4ff', marginLeft: 16 }}>{'/>'}</span>
          </p>
        </div>
        
        {/* Decorative line under subtitle */}
        <div style={{
          width: interpolate(subtitleSpring, [0, 1], [0, 300]),
          height: 2,
          background: 'linear-gradient(90deg, transparent, #00d4ff, #7b2cbf, transparent)',
          marginTop: 20,
          opacity: subtitleSpring,
        }} />
      </div>
      
      {/* Corner decorations */}
      <div style={{
        position: 'absolute',
        top: 40,
        left: 40,
        width: 60,
        height: 60,
        borderLeft: '2px solid rgba(0, 212, 255, 0.3)',
        borderTop: '2px solid rgba(0, 212, 255, 0.3)',
        opacity: interpolate(frame, [60, 90], [0, 1]),
      }} />
      <div style={{
        position: 'absolute',
        top: 40,
        right: 40,
        width: 60,
        height: 60,
        borderRight: '2px solid rgba(0, 212, 255, 0.3)',
        borderTop: '2px solid rgba(0, 212, 255, 0.3)',
        opacity: interpolate(frame, [60, 90], [0, 1]),
      }} />
      <div style={{
        position: 'absolute',
        bottom: 40,
        left: 40,
        width: 60,
        height: 60,
        borderLeft: '2px solid rgba(0, 212, 255, 0.3)',
        borderBottom: '2px solid rgba(0, 212, 255, 0.3)',
        opacity: interpolate(frame, [60, 90], [0, 1]),
      }} />
      <div style={{
        position: 'absolute',
        bottom: 40,
        right: 40,
        width: 60,
        height: 60,
        borderRight: '2px solid rgba(0, 212, 255, 0.3)',
        borderBottom: '2px solid rgba(0, 212, 255, 0.3)',
        opacity: interpolate(frame, [60, 90], [0, 1]),
      }} />
    </AbsoluteFill>
  );
};
