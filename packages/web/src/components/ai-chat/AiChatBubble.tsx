import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, ChevronUp, Bot, Download, Trash2 } from 'lucide-react';
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
    sendMessage,
    streamMessage,
    clearMessages,
    checkServerStatus,
  } = useQVAC();
  
  const {
    recentScans,
    fetchWalletCache,
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
      await streamMessage(inputValue, walletContext, (chunk) => {
        // Could stream to a temp display here
      });
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
    setInputValue(`Analyze this wallet: ${scan.address}`);
  };

  const handleExportPDF = () => {
    if (messages.length === 0) return;
    
    // Generate PDF from messages
    const content = messages
      .filter(m => m.role !== 'system')
      .map(m => `${m.role === 'user' ? 'You' : 'FundTracer AI'}: ${m.content}`)
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
    <div className={`ai-chat-bubble-container ${className}`}>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="ai-chat-panel"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="ai-chat-header">
              <div className="ai-chat-header-title">
                <Bot className="ai-chat-header-icon" />
                <span>FundTracer AI</span>
                <span className={`ai-server-status ${isServerReady ? 'online' : 'offline'}`}>
                  {isServerReady ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="ai-chat-header-actions">
                <button 
                  className="ai-chat-header-btn" 
                  onClick={handleExportPDF}
                  title="Export report"
                >
                  <Download size={16} />
                </button>
                <button 
                  className="ai-chat-header-btn" 
                  onClick={clearMessages}
                  title="Clear chat"
                >
                  <Trash2 size={16} />
                </button>
                <button 
                  className="ai-chat-header-btn ai-chat-header-close" 
                  onClick={() => setIsExpanded(false)}
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Recent Scans Dropdown */}
            <div className="ai-recent-scans">
              <label className="ai-recent-scans-label">Recent Scans</label>
              {scansLoading ? (
                <div className="ai-recent-scans-loading">Loading...</div>
              ) : recentScans.length > 0 ? (
                <select 
                  className="ai-recent-scans-select"
                  value={selectedScan?.address || ''}
                  onChange={(e) => {
                    const scan = recentScans.find(s => s.address === e.target.value);
                    if (scan) handleSelectScan(scan);
                  }}
                >
                  <option value="">Select a recent scan...</option>
                  {recentScans.map((scan: ScanCacheItem) => (
                    <option key={scan.id} value={scan.address}>
                      {scan.address.slice(0, 6)}...{scan.address.slice(-4)} ({scan.chain}) - {scan.riskScore ? `Risk: ${scan.riskScore}` : 'Analyzing'}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="ai-recent-scans-empty">No recent scans</div>
              )}
            </div>

            {/* Selected Wallet Badge */}
            {selectedScan && (
              <div className="ai-selected-wallet">
                <span>Analyzing:</span>
                <code>{selectedScan.address.slice(0, 8)}...{selectedScan.address.slice(-6)}</code>
                <button onClick={() => setSelectedScan(null)}>×</button>
              </div>
            )}

            {/* Messages */}
            <div className="ai-chat-messages">
              {messages.filter(m => m.role !== 'system').map(msg => (
                <div key={msg.id} className={`ai-chat-message ${msg.role}`}>
                  <div className="ai-chat-message-role">
                    {msg.role === 'user' ? 'You' : 'FundTracer AI'}
                  </div>
                  <div className="ai-chat-message-content">
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="ai-chat-message loading">
                  <div className="ai-chat-message-role">FundTracer AI</div>
                  <div className="ai-chat-message-content ai-typing">
                    <span className="ai-typing-dot">.</span>
                    <span className="ai-typing-dot">.</span>
                    <span className="ai-typing-dot">.</span>
                  </div>
                </div>
              )}
              {error && (
                <div className="ai-chat-error">{error}</div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="ai-chat-input-container">
              <textarea
                className="ai-chat-input"
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
                className="ai-chat-send-btn"
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
              >
                Send
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Bubble Button */}
      <motion.button
        className={`ai-chat-float-btn ${isExpanded ? 'expanded' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title={isExpanded ? 'Close AI Assistant' : 'Open AI Assistant'}
      >
        {isExpanded ? <ChevronUp /> : <MessageSquare />}
      </motion.button>
    </div>
  );
}