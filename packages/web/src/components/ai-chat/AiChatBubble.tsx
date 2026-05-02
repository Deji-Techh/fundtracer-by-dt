import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, Zap, Download, Trash2, Send, Wallet, X } from 'lucide-react';
import { useQVAC, type QVACMessage } from '../../hooks/qvac/useQVAC';
import { useScanCache, type ScanCacheItem } from '../../hooks/qvac/useScanCache';
import './AiChatBubble.css';

interface AiChatBubbleProps {
  currentWallet?: string;
  currentChain?: string;
  className?: string;
  embedded?: boolean;
}

export function AiChatBubble({ currentWallet, currentChain = 'ethereum', className = '', embedded = false }: AiChatBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectedScan, setSelectedScan] = useState<ScanCacheItem | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    messages,
    isLoading,
    error,
    isServerReady,
    streamMessage,
    clearMessages,
  } = useQVAC();
  
  const {
    recentScans,
    isLoading: scansLoading,
  } = useScanCache();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    const walletContext = selectedScan 
      ? `Wallet: ${selectedScan.address} (${selectedScan.chain})`
      : currentWallet 
        ? `Wallet: ${currentWallet} (${currentChain})`
        : undefined;
    try {
      await streamMessage(inputValue, walletContext);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSelectScan = (scan: ScanCacheItem) => {
    setSelectedScan(scan);
    setInputValue(`Analyze ${scan.address}: give me a risk report`);
  };

  const handleExportReport = () => {
    if (messages.length === 0) return;
    const content = messages
      .filter((m: QVACMessage) => m.role !== 'system')
      .map((m: QVACMessage) => `${m.role === 'user' ? 'You' : 'FundTracer AI'}: ${m.content}`)
      .join('\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fundtracer-report-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const expandedContent = (
    <motion.div
      className="ft-ai-panel"
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
    >
      <div className="ft-ai-header">
        <div className="ft-ai-header-left">
          <div className="ft-ai-logo">
            <Zap size={16} />
          </div>
          <div className="ft-ai-header-title">
            <span className="ft-ai-title-text">FundTracer AI</span>
            <span className={`ft-ai-status ${isServerReady ? 'online' : 'offline'}`}>
              {isServerReady ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
        <div className="ft-ai-header-actions">
          <button className="ft-ai-action-btn" onClick={handleExportReport} title="Export">
            <Download size={14} />
          </button>
          <button className="ft-ai-action-btn" onClick={clearMessages} title="Clear">
            <Trash2 size={14} />
          </button>
          <button className="ft-ai-action-btn ft-ai-close" onClick={() => setIsExpanded(false)}>
            <ChevronDown size={16} />
          </button>
        </div>
      </div>

      <div className="ft-ai-scans-section">
        <div className="ft-ai-scans-label">
          <Wallet size={12} />
          <span>Recent</span>
        </div>
        {scansLoading ? (
          <div className="ft-ai-scans-loading">...</div>
        ) : recentScans.length > 0 ? (
          <div className="ft-ai-scans-list">
            {recentScans.slice(0, 6).map((scan: ScanCacheItem) => (
              <button 
                key={scan.id} 
                className={`ft-ai-scan-item ${selectedScan?.address === scan.address ? 'active' : ''}`}
                onClick={() => handleSelectScan(scan)}
              >
                <span>{scan.address.slice(0, 4)}..{scan.address.slice(-2)}</span>
                <span className="ft-scan-chain">{scan.chain?.slice(0, 2)}</span>
              </button>
            ))}
          </div>
        ) : <div className="ft-ai-scans-empty">No scans</div>}
      </div>

      {selectedScan && (
        <div className="ft-ai-selected">
          <span>{selectedScan.address.slice(0, 6)}..{selectedScan.address.slice(-4)}</span>
          <button onClick={() => setSelectedScan(null)}>
            <X size={12} />
          </button>
        </div>
      )}

      <div className="ft-ai-messages">
        {messages.filter((m: QVACMessage) => m.role !== 'system').map((msg: QVACMessage) => (
          <div key={msg.id} className={`ft-ai-message ${msg.role}`}>
            <div className="ft-ai-message-role">{msg.role === 'user' ? 'You' : 'AI'}</div>
            <div className="ft-ai-message-content">{msg.content}</div>
          </div>
        ))}
        {isLoading && (
          <div className="ft-ai-message loading">
            <div className="ft-ai-typing">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        {error && <div className="ft-ai-error">{error}</div>}
        <div ref={messagesEndRef} />
      </div>

      <div className="ft-ai-input-container">
        <textarea
          className="ft-ai-input"
          placeholder={selectedScan ? `Ask about ${selectedScan.address.slice(0, 4)}...` : currentWallet ? `Ask about wallet...` : 'Select scan or ask...'}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={isLoading}
          rows={2}
        />
        <button className="ft-ai-send-btn" onClick={handleSendMessage} disabled={isLoading || !inputValue.trim()}>
          <Send size={14} />
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className={`ft-ai-bubble-container ${className} ${embedded ? 'embedded' : ''}`}>
      <AnimatePresence>
        {isExpanded && expandedContent}
      </AnimatePresence>
      
      {!isExpanded && (
        <motion.button
          className="ft-ai-float-btn"
          onClick={() => setIsExpanded(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="FundTracer AI"
        >
          <Zap size={18} />
        </motion.button>
      )}
    </div>
  );
}