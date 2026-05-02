import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Zap, Download, Trash2, Send, Wallet, X, MessageSquare, Plus, History } from 'lucide-react';
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
  const [attachedWallet, setAttachedWallet] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    messages,
    setMessages,
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

  // Get last scanned wallet - prefer recent scan, fallback to current wallet prop
  const lastScannedWallet = recentScans[0]?.address || currentWallet;
  const lastScannedChain = recentScans[0]?.chain || currentChain;

  // Show plus button always (when panel is closed) - adds last scanned wallet to input
  const showPlusButton = !isExpanded;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    const walletContext = selectedScan 
      ? `Wallet: ${selectedScan.address} (${selectedScan.chain})`
      : attachedWallet
        ? `Wallet: ${attachedWallet} (${lastScannedChain || currentChain})`
        : currentWallet 
          ? `Wallet: ${currentWallet} (${currentChain})`
          : undefined;
    
    // streamMessage adds user message internally - just pass content
    try {
      await streamMessage(inputValue, walletContext, (chunk: string) => {
        setMessages(prev => {
          const updated = [...prev];
          const lastMsg = updated[updated.length - 1];
          if (lastMsg?.role === 'assistant') {
            lastMsg.content += chunk;
          } else {
            const assistantMsg: QVACMessage = {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: chunk,
              timestamp: Date.now(),
            };
            updated.push(assistantMsg);
          }
          return updated;
        });
      });
    } catch (err) {
      console.error('Failed to send message:', err);
    }
    setInputValue('');
    setAttachedWallet(null);
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

  const handleAttachLastScan = () => {
    if (lastScannedWallet) {
      setAttachedWallet(lastScannedWallet);
      setInputValue(`Analyze ${lastScannedWallet}: give me a risk report`);
    }
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

  // Load chat history on mount
  useEffect(() => {
    loadChatHistory();
  }, []);

  // Load chat history from localStorage
  const loadChatHistory = () => {
    try {
      const saved = localStorage.getItem('ft_qvac_history');
      if (saved) {
        const history = JSON.parse(saved);
        if (history.length > 0) {
          setMessages(history);
        }
      }
    } catch (e) {
      console.error('Failed to load chat history:', e);
    }
  };

  // Save chat history to localStorage
  const saveChatHistory = () => {
    try {
      const toSave = messages.filter((m: QVACMessage) => m.role !== 'system');
      localStorage.setItem('ft_qvac_history', JSON.stringify(toSave));
    } catch (e) {
      console.error('Failed to save chat history:', e);
    }
  };

  // Auto-save on messages change
  useEffect(() => {
    if (messages.length > 0) {
      saveChatHistory();
    }
  }, [messages]);

  return (
    <div className={`ft-ai-container ${className}`}>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="ft-ai-panel"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
          >
            {/* Header */}
            <div className="ft-ai-panel-header">
              <div className="ft-ai-panel-title">
                <Zap size={16} className="ft-ai-panel-icon" />
                <span>FundTracer AI</span>
              </div>
              <div className="ft-ai-panel-actions">
                <button className="ft-ai-panel-btn" onClick={loadChatHistory} title="Load History">
                  <History size={14} />
                </button>
                <button className="ft-ai-panel-btn" onClick={handleExportReport} title="Export">
                  <Download size={14} />
                </button>
                <button className="ft-ai-panel-btn" onClick={clearMessages} title="Clear">
                  <Trash2 size={14} />
                </button>
                <button className="ft-ai-panel-btn ft-ai-panel-close" onClick={() => setIsExpanded(false)}>
                  <ChevronDown size={14} />
                </button>
              </div>
            </div>

            {/* Status bar */}
            <div className="ft-ai-status-bar">
              <span className={`ft-ai-status-dot ${isServerReady ? 'online' : 'offline'}`} />
              <span>{isServerReady ? 'Connected' : 'Offline'}</span>
            </div>

            {/* Recent Scans */}
            <div className="ft-ai-scans">
              <div className="ft-ai-scans-header">
                <Wallet size={12} />
                <span>Recent Scans</span>
              </div>
              <div className="ft-ai-scans-list">
                {scansLoading ? (
                  <span className="ft-ai-scans-loading">Loading...</span>
                ) : recentScans.length > 0 ? (
                  recentScans.slice(0, 6).map((scan: ScanCacheItem) => (
                    <button 
                      key={scan.id} 
                      className={`ft-ai-scan-chip ${selectedScan?.address === scan.address ? 'active' : ''}`}
                      onClick={() => handleSelectScan(scan)}
                    >
                      {scan.address.slice(0, 4)}..{scan.address.slice(-2)}
                      <span className="ft-ai-scan-chain">{scan.chain?.slice(0, 3)?.toUpperCase()}</span>
                    </button>
                  ))
                ) : (
                  <span className="ft-ai-scans-empty">No scans yet</span>
                )}
              </div>
            </div>

            {/* Selected Wallet */}
            {selectedScan && (
              <div className="ft-ai-wallet-bar">
                <span>Analyzing:</span>
                <code>{selectedScan.address.slice(0, 8)}...</code>
                <button onClick={() => setSelectedScan(null)}><X size={12} /></button>
              </div>
            )}

            {/* Messages */}
            <div className="ft-ai-messages">
              {messages.filter((m: QVACMessage) => m.role !== 'system').length === 0 && (
                <div className="ft-ai-empty">
                  <MessageSquare size={24} />
                  <p>Ask about any wallet to get an AI-generated risk report</p>
                </div>
              )}
              {messages.filter((m: QVACMessage) => m.role !== 'system').map((msg: QVACMessage) => (
                <div key={msg.id} className={`ft-ai-message ${msg.role}`}>
                  <div className="ft-ai-message-label">{msg.role === 'user' ? 'You' : 'AI'}</div>
                  <div className="ft-ai-message-text">{msg.content}</div>
                </div>
              ))}
              {isLoading && (
                <div className="ft-ai-message assistant">
                  <div className="ft-ai-message-label">AI</div>
                  <div className="ft-ai-typing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              )}
              {error && <div className="ft-ai-error">{error}</div>}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="ft-ai-input-area">
              <textarea
                className="ft-ai-input"
                placeholder={selectedScan ? `Ask about ${selectedScan.address.slice(0, 4)}...` : currentWallet ? `Ask about ${currentWallet.slice(0, 6)}...` : 'Enter wallet address or question...'}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={isLoading}
              />
              <button 
                className="ft-ai-send-btn" 
                onClick={handleSendMessage} 
                disabled={isLoading || !inputValue.trim()}
              >
                <Send size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button Group */}
      <div className="ft-ai-button-group">
        {showPlusButton && (
          <motion.button
            className="ft-ai-trigger ft-ai-plus-btn"
            onClick={handleAttachLastScan}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={`Analyze ${lastScannedWallet?.slice(0, 6)}...${lastScannedWallet?.slice(-4)}`}
          >
            <Plus size={16} />
          </motion.button>
        )}
        <motion.button
          className="ft-ai-trigger"
          onClick={() => setIsExpanded(!isExpanded)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="FundTracer AI"
        >
          <Zap size={18} />
        </motion.button>
      </div>
    </div>
  );
}