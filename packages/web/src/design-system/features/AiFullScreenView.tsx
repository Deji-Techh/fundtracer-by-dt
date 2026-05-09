import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Plus, 
  Send, 
  Wallet, 
  Clock, 
  MessageSquare,
  Shield,
  FileText,
  CheckCircle2,
  Loader2,
  Bot,
  User,
  Sparkles,
  FileCode,
  Check,
  ChevronDown
} from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { getHistory, type HistoryItem } from '../../utils/history';
import { apiRequest } from '../../api';
import './AiFullScreenView.css';

interface AiFullScreenViewProps {
  isOpen: boolean;
  onClose: () => void;
  currentWallet?: string;
  currentChain?: string;
}

const CHAIN_COLORS: Record<string, string> = {
  ethereum: '#627eea',
  linea: '#61dfff',
  arbitrum: '#28a0f0',
  base: '#0052ff',
  optimism: '#ff0420',
  polygon: '#8247e5',
  solana: '#9945ff',
};

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function getRiskColor(level?: string): string {
  if (!level) return 'var(--intel-text-muted)';
  switch (level.toLowerCase()) {
    case 'low': return 'var(--intel-green)';
    case 'medium': return 'var(--intel-yellow)';
    case 'high': return 'var(--intel-orange)';
    case 'critical': return 'var(--intel-red)';
    default: return 'var(--intel-text-muted)';
  }
}

interface RecentScan {
  id: string;
  address: string;
  chain: string;
  timestamp: number;
  riskLevel?: string;
  riskScore?: number;
}

interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: number;
  messageCount: number;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
}

interface WalletAttachment {
  address: string;
  chain: string;
  data?: any;
  status: 'pending' | 'analyzing' | 'ready' | 'error';
}

type AttachmentMode = 'none' | 'wallet' | 'contract';

export function AiFullScreenView({ 
  isOpen, 
  onClose, 
  currentWallet, 
  currentChain = 'ethereum' 
}: AiFullScreenViewProps) {
  const isMobile = useIsMobile();
  
  const [inputValue, setInputValue] = useState('');
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([
    {
      id: '1',
      title: 'Wallet Analysis: 0x742d...',
      lastMessage: 'What is the risk score for this wallet?',
      timestamp: Date.now() - 3600000,
      messageCount: 5,
    },
    {
      id: '2',
      title: 'Contract Analysis: 0x7a25...',
      lastMessage: 'Analyze this DeFi protocol',
      timestamp: Date.now() - 86400000,
      messageCount: 8,
    },
    {
      id: '3',
      title: 'Funding Trace: 0xd8dA...',
      lastMessage: 'Show me the funding sources',
      timestamp: Date.now() - 172800000,
      messageCount: 3,
    },
  ]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>('1');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string; timestamp: number }[]>([
    {
      role: 'assistant',
      content: 'Hi! I\'m FundTracer AI. Ask me about any wallet address to get an instant risk analysis.',
      timestamp: Date.now() - 3600000,
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const [attachmentMode, setAttachmentMode] = useState<AttachmentMode>('none');
  const [showAttachmentDropdown, setShowAttachmentDropdown] = useState(false);
  const [walletAttachment, setWalletAttachment] = useState<WalletAttachment | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (isMobile) {
    return null;
  }

  useEffect(() => {
    if (isOpen) {
      const history = getHistory() as HistoryItem[];
      const scans: RecentScan[] = history.slice(0, 20).map((item, index) => ({
        id: `scan-${index}`,
        address: item.address,
        chain: item.chain || 'ethereum',
        timestamp: item.timestamp || Date.now(),
        riskLevel: item.riskLevel,
        riskScore: item.riskScore,
      }));
      setRecentScans(scans);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      role: 'user' as const,
      content: inputValue,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    setTimeout(() => {
      const assistantMessage = {
        role: 'assistant' as const,
        content: 'I can analyze that wallet for you. Would you like me to fetch the latest risk score and transaction history?',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewChat = () => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: 'New Conversation',
      lastMessage: 'New chat started',
      timestamp: Date.now(),
      messageCount: 0,
    };
    setChatSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setMessages([]);
  };

  const handleSelectScan = (scan: RecentScan) => {
    setSelectedScanId(scan.id);
    setTimeout(() => {
      setInputValue(`Analyze wallet ${scan.address} on ${scan.chain} and provide a risk report`);
      setSelectedScanId(null);
    }, 300);
  };

  const handleSelectAttachmentMode = (mode: AttachmentMode) => {
    setAttachmentMode(mode);
    setShowAttachmentDropdown(false);
    setInputValue('');
  };

  const handleAcceptWallet = async () => {
    if (!inputValue.trim()) return;

    const isWallet = attachmentMode === 'wallet';
    const address = inputValue.trim();
    
    setWalletAttachment({
      address: address,
      chain: currentChain,
      status: 'analyzing'
    });
    setIsAnalyzing(true);
    setInputValue('');

    try {
      const endpoint = isWallet ? '/api/analyze/wallet' : '/api/analyze/contract';
      const response = await apiRequest(endpoint, 'POST', { 
        address, 
        chain: currentChain 
      }) as Response;
      
      const data = await response.json();
      
      if (data.success && data.result) {
        setWalletAttachment({
          address,
          chain: currentChain,
          data: data.result,
          status: 'ready'
        });
        
        const assistantMessage = {
          role: 'assistant' as const,
          content: isWallet 
            ? `Wallet ${address.slice(0, 6)}...${address.slice(-4)} attached and analyzed. Ask me anything about this wallet!`
            : `Contract ${address.slice(0, 6)}...${address.slice(-4)} attached. Ask me about this contract!`,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setWalletAttachment({
        address,
        chain: currentChain,
        status: 'error'
      });
      
      const errorMessage = {
        role: 'assistant' as const,
        content: `Sorry, I couldn't analyze this ${isWallet ? 'wallet' : 'contract'}. Please check the address and try again.`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendWithAttachment = async () => {
    if (!inputValue.trim() || !walletAttachment || isLoading) return;

    const userMessage = {
      role: 'user' as const,
      content: inputValue,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      let analysisData = '';
      
      if (walletAttachment.data) {
        const d = walletAttachment.data;
        analysisData = `
Wallet Analysis Data:
- Address: ${d.address || walletAttachment.address}
- Chain: ${walletAttachment.chain}
- Risk Score: ${d.riskScore ?? 'N/A'}
- Risk Level: ${d.riskLevel ?? 'Unknown'}
- Total Transactions: ${d.totalTransactions ?? 'N/A'}
- Total Received: ${d.totalReceived ?? 'N/A'}
- Total Sent: ${d.totalSent ?? 'N/A'}
- Unique Addresses: ${d.uniqueAddresses ?? 'N/A'}
- Activity Period: ${d.activityPeriodDays ?? 'N/A'} days
- Balance: ${d.balance ?? 'N/A'}
- Tags: ${d.tags?.join(', ') || 'None'}
- Funding Sources: ${d.fundingSources?.join(', ') || 'None'}
- Top Destinations: ${d.topDestinations?.join(', ') || 'None'}
- First Seen: ${d.firstSeen ?? 'N/A'}
- Last Seen: ${d.lastSeen ?? 'N/A'}
`;
      }

      const promptWithData = analysisData 
        ? `${analysisData}\n\nUser Question: ${inputValue}`
        : inputValue;

      // In production, this would call the AI with the wallet data
      // For now, simulate the response
      setTimeout(() => {
        const responseContent = walletAttachment.data 
          ? `Based on the analysis of ${walletAttachment.address.slice(0, 6)}...${walletAttachment.address.slice(-4)}:\n\n` +
            `• Risk Level: ${walletAttachment.data.riskLevel || 'Unknown'}\n` +
            `• Total Transactions: ${walletAttachment.data.totalTransactions || 0}\n` +
            `• This wallet shows ${walletAttachment.data.riskLevel?.toLowerCase() === 'low' ? 'minimal risk indicators' : 'some patterns worth noting'}.\n\n` +
            `Would you like more specific details about this wallet?`
          : 'I need more context to answer that. What would you like to know specifically?';
          
        const assistantMessage = {
          role: 'assistant' as const,
          content: responseContent,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);
      }, 1500);

    } catch (error) {
      console.error('Send with attachment error:', error);
      setIsLoading(false);
      
      const errorMsg = {
        role: 'assistant' as const,
        content: 'Sorry, something went wrong. Please try again.',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
    }
  };

  const handleClearAttachment = () => {
    setWalletAttachment(null);
    setAttachmentMode('none');
  };

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    for (const file of Array.from(files)) {
      const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      setUploadedFiles(prev => [...prev, {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'uploading'
      }]);

      setTimeout(() => {
        setUploadedFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, status: 'processing' } : f
        ));
        
        setTimeout(() => {
          setUploadedFiles(prev => prev.map(f => 
            f.id === fileId ? { ...f, status: 'ready' } : f
          ));
        }, 1500);
      }, 1000);
    }

    setIsUploading(false);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="ai-fullscreen-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div 
            className="ai-fullscreen-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div 
            className="ai-fullscreen-panel"
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            {/* Header */}
            <motion.div 
              className="ai-fullscreen-header"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <div className="ai-header-left">
                <motion.div 
                  className="ai-header-icon"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Sparkles size={18} />
                </motion.div>
                <span className="ai-header-title">FundTracer AI</span>
              </div>
              <div className="ai-header-actions">
                <motion.button 
                  className="ai-header-btn"
                  title="Export Chat"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Loader2 size={16} />
                </motion.button>
                <motion.button 
                  className="ai-header-btn"
                  onClick={onClose}
                  title="Close"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X size={18} />
                </motion.button>
              </div>
            </motion.div>

            {/* Three Column Layout */}
            <div className="ai-fullscreen-content">
              {/* Left Column - Recent Scans (23%) */}
              <motion.div 
                className="ai-column ai-column-left"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="ai-column-header">
                  <Wallet size={16} />
                  <span>Recent Scans</span>
                </div>
                <div className="ai-scan-list">
                  {recentScans.length > 0 ? (
                    recentScans.slice(0, 10).map((scan, idx) => (
                      <motion.button 
                        key={scan.id} 
                        className={`ai-scan-item ${selectedScanId === scan.id ? 'selected' : ''}`}
                        onClick={() => handleSelectScan(scan)}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03, duration: 0.2 }}
                        whileHover={{ scale: 1.02, x: 4 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="ai-scan-item-main">
                          <span className="ai-scan-address">
                            {scan.address.slice(0, 6)}...{scan.address.slice(-4)}
                          </span>
                          <span 
                            className="ai-scan-chain"
                            style={{ 
                              background: CHAIN_COLORS[scan.chain] || CHAIN_COLORS.ethereum 
                            }}
                          >
                            {scan.chain?.slice(0, 3).toUpperCase()}
                          </span>
                        </div>
                        <div className="ai-scan-item-meta">
                          {scan.riskLevel && (
                            <span 
                              className="ai-scan-risk"
                              style={{ color: getRiskColor(scan.riskLevel) }}
                            >
                              {scan.riskLevel}
                            </span>
                          )}
                          <span className="ai-scan-time">
                            {formatRelativeTime(scan.timestamp)}
                          </span>
                        </div>
                      </motion.button>
                    ))
                  ) : (
                    <motion.div 
                      className="ai-empty-state"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Wallet size={24} />
                      <p>No recent scans</p>
                      <span>Scanned wallets will appear here</span>
                    </motion.div>
                  )}
                </div>
              </motion.div>

              {/* Middle Column - Chat (54%) */}
              <motion.div 
                className="ai-column ai-column-middle"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <div className="ai-chat-messages">
                  {messages.map((msg, index) => (
                    <motion.div 
                      key={index} 
                      className={`ai-message ai-message-${msg.role}`}
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                    >
                      <motion.div 
                        className="ai-message-avatar"
                        whileHover={{ scale: 1.1 }}
                      >
                        {msg.role === 'assistant' ? (
                          <Bot size={14} />
                        ) : (
                          <User size={14} />
                        )}
                      </motion.div>
                      <motion.div 
                        className="ai-message-content"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                      >
                        <p>{msg.content}</p>
                        <span className="ai-message-time">
                          {formatRelativeTime(msg.timestamp)}
                        </span>
                      </motion.div>
                    </motion.div>
                  ))}
                  {isLoading && (
                    <motion.div 
                      className="ai-message ai-message-assistant"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div className="ai-message-avatar">
                        <Bot size={14} />
                      </div>
                      <div className="ai-message-content">
                        <div className="ai-typing-indicator">
                          <motion.span 
                            animate={{ y: [0, -4, 0] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                          />
                          <motion.span 
                            animate={{ y: [0, -4, 0] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                          />
                          <motion.span 
                            animate={{ y: [0, -4, 0] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Uploaded Files Display */}
                <AnimatePresence>
                  {uploadedFiles.length > 0 && (
                    <motion.div 
                      className="ai-uploaded-files"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {uploadedFiles.map((file) => (
                        <motion.div 
                          key={file.id}
                          className={`ai-file-item ai-file-${file.status}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="ai-file-icon">
                            <FileText size={14} />
                          </div>
                          <span className="ai-file-name">{file.name}</span>
                          {file.status === 'uploading' && (
                            <div className="ai-file-skeleton">
                              <div className="ai-skeleton-bar"></div>
                            </div>
                          )}
                          {file.status === 'processing' && (
                            <motion.div 
                              className="ai-file-processing"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            >
                              <Loader2 size={14} />
                            </motion.div>
                          )}
                          {file.status === 'ready' && (
                            <CheckCircle2 size={14} className="ai-file-ready" />
                          )}
                          <button 
                            className="ai-file-remove"
                            onClick={() => handleRemoveFile(file.id)}
                          >
                            <X size={12} />
                          </button>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Chat Input */}
                <div className="ai-chat-input-container">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="ai-hidden-input"
                    onChange={handleFileUpload}
                    accept=".pdf,.txt,.csv,.json,.doc,.docx"
                  />
                  <motion.button 
                    className="ai-attach-btn"
                    title="Attach document"
                    onClick={handleAttachClick}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Loader2 size={18} />
                      </motion.div>
                    ) : (
                      <Plus size={18} />
                    )}
                  </motion.button>

                  {/* Wallet/Contract Attachment Display */}
                  {walletAttachment && (
                    <motion.div 
                      className="ai-attachment-bar"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                    >
                      <div className="ai-attachment-icon">
                        {walletAttachment.status === 'analyzing' ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          >
                            <Loader2 size={14} />
                          </motion.div>
                        ) : walletAttachment.status === 'ready' ? (
                          <CheckCircle2 size={14} />
                        ) : (
                          <X size={14} />
                        )}
                      </div>
                      <span className="ai-attachment-label">
                        {walletAttachment.status === 'analyzing' 
                          ? 'Analyzing...' 
                          : `${walletAttachment.address.slice(0, 8)}...${walletAttachment.address.slice(-4)}`}
                      </span>
                      <button 
                        className="ai-attachment-clear"
                        onClick={handleClearAttachment}
                      >
                        <X size={12} />
                      </button>
                    </motion.div>
                  )}

                  {/* Main Input */}
                  <div className={`ai-input-wrapper ${attachmentMode !== 'none' ? 'attachment-mode' : ''}`}>
                    {/* Dropdown Trigger for Plus Button */}
                    <div className="ai-plus-dropdown">
                      <motion.button 
                        className={`ai-attach-btn ${attachmentMode !== 'none' ? 'active' : ''}`}
                        title="Attach wallet or contract"
                        onClick={() => setShowAttachmentDropdown(!showAttachmentDropdown)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        disabled={isUploading || !!walletAttachment}
                      >
                        {attachmentMode === 'wallet' ? (
                          <Wallet size={18} />
                        ) : attachmentMode === 'contract' ? (
                          <FileCode size={18} />
                        ) : isUploading ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          >
                            <Loader2 size={18} />
                          </motion.div>
                        ) : (
                          <Plus size={18} />
                        )}
                      </motion.button>
                      
                      <AnimatePresence>
                        {showAttachmentDropdown && (
                          <motion.div 
                            className="ai-attachment-dropdown"
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                          >
                            <button 
                              className="ai-dropdown-item"
                              onClick={() => handleSelectAttachmentMode('wallet')}
                            >
                              <Wallet size={16} />
                              <span>Wallet</span>
                            </button>
                            <button 
                              className="ai-dropdown-item"
                              onClick={() => handleSelectAttachmentMode('contract')}
                            >
                              <FileCode size={16} />
                              <span>Contract</span>
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <textarea
                      ref={inputRef}
                      className={`ai-chat-input ${attachmentMode !== 'none' ? 'attachment-input' : ''}`}
                      placeholder={
                        attachmentMode === 'wallet' 
                          ? 'Input wallet address...' 
                          : attachmentMode === 'contract'
                            ? 'Input contract address...'
                            : currentWallet 
                              ? `Ask about ${currentWallet.slice(0, 6)}...` 
                              : 'Enter wallet address or question...'
                      }
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (attachmentMode !== 'none' && !walletAttachment) {
                            handleAcceptWallet();
                          } else if (walletAttachment) {
                            handleSendWithAttachment();
                          } else {
                            handleSendMessage();
                          }
                        }
                      }}
                      disabled={isLoading || isAnalyzing}
                      rows={1}
                    />
                    
                    {/* Send or Accept Button */}
                    {attachmentMode !== 'none' && !walletAttachment ? (
                      <motion.button 
                        className="ai-accept-btn"
                        onClick={handleAcceptWallet}
                        disabled={isAnalyzing || !inputValue.trim()}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {isAnalyzing ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          >
                            <Loader2 size={16} />
                          </motion.div>
                        ) : (
                          <Check size={16} />
                        )}
                      </motion.button>
                    ) : (
                      <motion.button 
                        className="ai-send-btn"
                        onClick={walletAttachment ? handleSendWithAttachment : handleSendMessage}
                        disabled={isLoading || !inputValue.trim()}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Send size={16} />
                      </motion.button>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Right Column - Chat History (23%) */}
              <motion.div 
                className="ai-column ai-column-right"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="ai-column-header">
                  <Clock size={16} />
                  <span>Chat History</span>
                  <motion.button 
                    className="ai-new-chat-btn"
                    onClick={handleNewChat}
                    title="New Chat"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Plus size={14} />
                  </motion.button>
                </div>
                <div className="ai-session-list">
                  {chatSessions.map((session, idx) => (
                    <motion.button
                      key={session.id}
                      className={`ai-session-item ${activeSessionId === session.id ? 'active' : ''}`}
                      onClick={() => setActiveSessionId(session.id)}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={{ scale: 1.02, x: -4 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <motion.div 
                        className="ai-session-icon"
                        whileHover={{ scale: 1.1 }}
                      >
                        <MessageSquare size={14} />
                      </motion.div>
                      <div className="ai-session-content">
                        <span className="ai-session-title">{session.title}</span>
                        <span className="ai-session-preview">{session.lastMessage}</span>
                        <span className="ai-session-time">
                          {formatRelativeTime(session.timestamp)}
                        </span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AiFullScreenView;