import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, Bot, Download, Trash2, Zap, Send, Wallet } from 'lucide-react';
import { useQVAC, type QVACMessage } from '../../hooks/qvac/useQVAC';
import { useScanCache, type ScanCacheItem } from '../../hooks/qvac/useScanCache';
import './AiChatBubble.css';

interface AiChatBubbleProps {
  currentWallet?: string;
  currentChain?: string;
  className?: string;
}

export function AiChatBubble({ currentWallet, currentChain = 'ethereum', className = '' }: AiChatBubbleProps) {
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
    fetchRecentScans,
    isLoading: scansLoading,
  } = useScanCache();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const walletContext = selectedScan 
      ? `Selected wallet: ${selectedScan.address} (${selectedScan.chain})`
      : currentWallet 
        ? `Current wallet: ${currentWallet} (${currentChain})`
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
    setInputValue(`Analyze wallet ${scan.address} on ${scan.chain}: give me a risk report`);
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

  return (
    <div className={`ft-ai-bubble-container ${className}`}>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="ft-ai-panel"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="ft-ai-header">
              <div className="ft-ai-header-left">
                <div className="ft-ai-logo">
                  <Zap size={18} />
                </div>
                <div className="ft-ai-header-title">
                  <span className="ft-ai-title-text">FundTracer AI</span>
                  <span className={`ft-ai-status ${isServerReady ? 'online' : 'offline'}`}>
                    {isServerReady ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
              <div className="ft-ai-header-actions">
                <button 
                  className="ft-ai-action-btn" 
                  onClick={handleExportReport}
                  title="Export report"
                >
                  <Download size={16} />
                </button>
                <button 
                  className="ft-ai-action-btn" 
                  onClick={clearMessages}
                  title="Clear chat"
                >
                  <Trash2 size={16} />
                </button>
                <button 
                  className="ft-ai-action-btn ft-ai-close" 
                  onClick={() => setIsExpanded(false)}
                >
                  <ChevronUp size={18} />
                </button>
              </div>
            </div>

            {/* Recent Scans */}
            <div className="ft-ai-scans-section">
              <div className="ft-ai-scans-label">
                <Wallet size={14} />
                <span>Recent Scans</span>
              </div>
              {scansLoading ? (
                <div className="ft-ai-scans-loading">Loading...</div>
              ) : recentScans.length > 0 ? (
                <div className="ft-ai-scans-list">
                  {recentScans.slice(0, 8).map((scan: ScanCacheItem) => (
                    <button 
                      key={scan.id} 
                      className={`ft-ai-scan-item ${selectedScan?.address === scan.address ? 'active' : ''}`}
                      onClick={() => handleSelectScan(scan)}
                    >
                      <span className="ft-scan-address">
                        {scan.address.slice(0, 6)}...{scan.address.slice(-4)}
                      </span>
                      <span className="ft-scan-chain">{scan.chain}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="ft-ai-scans-empty">No recent scans</div>
              )}
            </div>

            {/* Selected Wallet */}
            {selectedScan && (
              <div className="ft-ai-selected">
                <span className="ft-ai-selected-label">Analyzing:</span>
                <code className="ft-ai-selected-address">
                  {selectedScan.address.slice(0, 8)}...{selectedScan.address.slice(-6)}
                </code>
                <button onClick={() => setSelectedScan(null)} className="ft-ai-selected-clear">×</button>
              </div>
            )}

            {/* Messages */}
            <div className="ft-ai-messages">
              {messages.filter((m: QVACMessage) => m.role !== 'system').map((msg: QVACMessage) => (
                <div key={msg.id} className={`ft-ai-message ${msg.role}`}>
                  <div className="ft-ai-message-role">
                    {msg.role === 'user' ? 'You' : 'FundTracer AI'}
                  </div>
                  <div className="ft-ai-message-content">
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="ft-ai-message loading">
                  <div className="ft-ai-message-role">FundTracer AI</div>
                  <div className="ft-ai-typing">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              )}
              {error && (
                <div className="ft-ai-error">{error}</div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="ft-ai-input-container">
              <textarea
                className="ft-ai-input"
                placeholder={
                  selectedScan 
                    ? `Ask about ${selectedScan.address.slice(0, 6)}...` 
                    : currentWallet 
                      ? `Ask about ${currentWallet.slice(0, 6)}...`
                      : 'Select a scan or ask about any wallet...'
                }
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={isLoading}
                rows={2}
              />
              <button 
                className="ft-ai-send-btn"
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
              >
                <Send size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <motion.button
        className={`ft-ai-float-btn ${isExpanded ? 'expanded' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title={isExpanded ? 'Close AI Assistant' : 'Open FundTracer AI'}
      >
        {isExpanded ? <ChevronUp /> : <Zap />}
      </motion.button>
    </div>
  );
}