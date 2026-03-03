import React from 'react';
import { 
  Terminal, 
  Download, 
  Zap, 
  Globe, 
  FileJson, 
  Clock,
  ArrowRight
} from 'lucide-react';
import './CliShowcase.css';

export const CliShowcase: React.FC = () => {
  const features = [
    {
      icon: Download,
      title: 'Cross-Platform Install',
      description: 'npm install -g fundtracer-cli'
    },
    {
      icon: Zap,
      title: '20x Faster Analysis',
      description: 'Parallel processing with 20 API keys'
    },
    {
      icon: Globe,
      title: 'Multi-Chain Support',
      description: 'Ethereum, Linea, Arbitrum, Base, Optimism, Polygon'
    },
    {
      icon: FileJson,
      title: 'Multiple Formats',
      description: 'JSON, CSV, PDF exports'
    },
    {
      icon: Clock,
      title: 'Watch Mode',
      description: 'Auto-refresh every 2 minutes'
    }
  ];

  return (
    <section className="cli-showcase">
      <div className="cli-container">
        {/* Left Side - Content */}
        <div className="cli-content">
          <div className="cli-badge">
            <Terminal size={14} />
            <span>Command Line Interface</span>
          </div>
          
          <h2 className="cli-title">
            Power at Your
            <span className="cli-title-highlight"> Fingertips</span>
          </h2>
          
          <p className="cli-description">
            FundTracer CLI brings professional-grade blockchain forensics to your terminal. 
            Analyze wallets, detect Sybil patterns, and export reports—all from the command line.
          </p>
          
          <div className="cli-features">
            {features.map((feature, index) => (
              <div key={index} className="cli-feature">
                <div className="cli-feature-icon">
                  <feature.icon size={18} />
                </div>
                <div className="cli-feature-text">
                  <h4>{feature.title}</h4>
                  <p>{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="cli-cta">
            <code className="cli-install">npm install -g fundtracer-cli</code>
            <a 
              href="https://github.com/Deji-Tech/fundtracer-by-dt/blob/master/packages/cli/README.md" 
              target="_blank" 
              rel="noopener noreferrer"
              className="cli-docs-link"
            >
              Read Documentation
              <ArrowRight size={16} />
            </a>
          </div>
        </div>
        
        {/* Right Side - Terminal Animation */}
        <div className="cli-terminal-wrapper">
          <CliTerminal />
        </div>
      </div>
    </section>
  );
};

// CLI Terminal Animation Component
const CliTerminal: React.FC = () => {
  const [currentLine, setCurrentLine] = React.useState(0);
  const [typingText, setTypingText] = React.useState('');
  const [isTyping, setIsTyping] = React.useState(true);

  const commands = [
    { text: '$ npm install -g fundtracer-cli', output: '' },
    { text: '', output: 'added 42 packages in 3s' },
    { text: '$ fundtracer analyze 0x742d...35Cc --chain linea', output: '' },
    { text: '', output: 'Analyzing wallet on Linea...' },
    { text: '', output: 'Found: 847 transactions, 12 tokens, 3 NFTs' },
    { text: '', output: 'Risk Score: LOW (23/100)' },
    { text: '', output: 'Analysis complete in 1.2s' },
    { text: '$ fundtracer compare --file wallets.txt', output: '' },
    { text: '', output: 'Comparing 150 wallets...' },
    { text: '', output: 'Clusters detected: 3' },
    { text: '', output: 'High risk wallets: 12' },
    { text: '$ fundtracer watch 0x742d...35Cc --interval 2m', output: '' },
    { text: '', output: 'Watch mode enabled (refresh: 2m)' },
    { text: '', output: 'Monitoring... Press Ctrl+C to stop' }
  ];

  React.useEffect(() => {
    if (currentLine >= commands.length) return;

    const current = commands[currentLine];
    
    if (current.text && isTyping) {
      // Typing command
      if (typingText.length < current.text.length) {
        const timer = setTimeout(() => {
          setTypingText(current.text.slice(0, typingText.length + 1));
        }, 50);
        return () => clearTimeout(timer);
      } else {
        // Finished typing command
        setIsTyping(false);
        const timer = setTimeout(() => {
          setCurrentLine(prev => prev + 1);
          setTypingText('');
          setIsTyping(true);
        }, 400);
        return () => clearTimeout(timer);
      }
    } else if (current.output) {
      // Show output immediately
      const timer = setTimeout(() => {
        setCurrentLine(prev => prev + 1);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [currentLine, typingText, isTyping]);

  // Reset animation
  React.useEffect(() => {
    if (currentLine >= commands.length) {
      const timer = setTimeout(() => {
        setCurrentLine(0);
        setTypingText('');
        setIsTyping(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentLine]);

  return (
    <div className="cli-terminal">
      {/* Terminal Header */}
      <div className="cli-terminal-header">
        <div className="cli-terminal-dots">
          <div className="cli-dot cli-dot-red" />
          <div className="cli-dot cli-dot-yellow" />
          <div className="cli-dot cli-dot-green" />
        </div>
        <div className="cli-terminal-title">fundtracer-cli</div>
      </div>
      
      {/* Terminal Content */}
      <div className="cli-terminal-content">
        {commands.slice(0, currentLine).map((cmd, index) => (
          <div key={index} className="cli-line">
            {cmd.text && <span className="cli-prompt">{cmd.text}</span>}
            {cmd.output && <span className="cli-output">{cmd.output}</span>}
          </div>
        ))}
        
        {/* Current typing line */}
        {currentLine < commands.length && commands[currentLine].text && (
          <div className="cli-line">
            <span className="cli-prompt">{typingText}</span>
            <span className="cli-cursor">▋</span>
          </div>
        )}
        
        {/* Current output line */}
        {currentLine < commands.length && commands[currentLine].output && (
          <div className="cli-line">
            <span className="cli-output">{commands[currentLine].output}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CliShowcase;
