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
import { apiRequest, getAuthToken } from '../../api';
import './AiFullScreenView.css';

interface AiFullScreenViewProps {
  isOpen: boolean;
  onClose: () => void;
  currentWallet?: string;
  currentChain?: string;
}

const CHAIN_LABELS: Record<string, string> = {
  ethereum: 'Ethereum',
  linea: 'Linea',
  arbitrum: 'Arbitrum',
  base: 'Base',
  optimism: 'Optimism',
  polygon: 'Polygon',
  bsc: 'BNB Chain',
  solana: 'Solana',
};

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getRiskClass(level?: string): string {
  if (!level) return '';
  switch (level.toLowerCase()) {
    case 'low': return 'risk-low';
    case 'medium': return 'risk-medium';
    case 'high': return 'risk-high';
    case 'critical': return 'risk-critical';
    default: return '';
  }
}

function getRiskColor(level?: string): string {
  if (!level) return '#888';
  switch (level.toLowerCase()) {
    case 'low': return '#4ade80';
    case 'medium': return '#fbbf24';
    case 'high': return '#f97316';
    case 'critical': return '#ef4444';
    default: return '#888';
  }
}

const CHAIN_COLORS: Record<string, string> = {
  ethereum: '#627eea',
  linea: '#61dfff',
  arbitrum: '#28a0f0',
  base: '#0052ff',
  optimism: '#ff0420',
  polygon: '#8247e5',
  bsc: '#f3ba2f',
  solana: '#9945ff',
};

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
  fileUri?: string;
  mimeType?: string;
}

interface WalletAttachment {
  address: string;
  chain: string;
  data?: any;
  status: 'pending' | 'analyzing' | 'ready' | 'error';
}

type AttachmentMode = 'none' | 'wallet' | 'contract' | 'document';

export function AiFullScreenView({ 
  isOpen, 
  onClose, 
  currentWallet, 
  currentChain = 'ethereum' 
}: AiFullScreenViewProps) {
  const isMobile = useIsMobile();
  
  const [inputValue, setInputValue] = useState('');
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
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
  const [selectedChain, setSelectedChain] = useState(currentChain);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Quick suggestions based on attachment mode
  const walletSuggestions = [
    "Is this wallet safe?",
    "Who funded this wallet?",
    "Detect sybil activity",
    "Show risk breakdown"
  ];

const contractSuggestions = [
    "Is this a honeypot?",
    "Check for hidden mint",
    "Who owns this contract?",
    "Is liquidity locked?"
  ];

  const documentSuggestions = [
    "Summarize this document",
    "Extract key findings",
    "What are the main risks?",
    "Generate a report"
  ];

  const suggestions = attachmentMode === 'contract' ? contractSuggestions : 
                       attachmentMode === 'wallet' ? walletSuggestions :
                       attachmentMode === 'document' ? documentSuggestions : [];

  const CHAIN_OPTIONS = [
    { value: 'ethereum', label: 'ETH', color: '#627eea' },
    { value: 'linea', label: 'LINEA', color: '#61dfff' },
    { value: 'arbitrum', label: 'ARB', color: '#28a0f0' },
    { value: 'base', label: 'BASE', color: '#0052ff' },
    { value: 'optimism', label: 'OP', color: '#ff0420' },
    { value: 'polygon', label: 'POL', color: '#8247e5' },
    { value: 'bsc', label: 'BSC', color: '#f3ba2f' },
    { value: 'solana', label: 'SOL', color: '#9945ff' },
  ];
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

      // Fetch chat sessions from backend
      fetchChatSessions();
    }
  }, [isOpen]);

  const fetchChatSessions = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch('/api/chat/sessions', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (response.ok) {
        const data = await response.json();
        if (data.sessions && data.sessions.length > 0) {
          setChatSessions(data.sessions);
          setActiveSessionId(data.sessions[0].id);
          // Load messages for the active session
          loadSessionMessages(data.sessions[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch chat sessions:', error);
    }
  };

  const loadSessionMessages = async (sessionId: string) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (response.ok) {
        const data = await response.json();
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
        }
      }
    } catch (error) {
      console.error('Failed to load session messages:', error);
    }
  };

  const saveMessage = async (message: { role: 'user' | 'assistant'; content: string; timestamp: number }) => {
    if (!activeSessionId) return;
    try {
      const token = getAuthToken();
      await fetch(`/api/chat/sessions/${activeSessionId}/messages`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(message),
      });
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  };

  const createNewSession = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ title: 'New Conversation' }),
      });
      if (response.ok) {
        const data = await response.json();
        const newSession = data.session;
        setChatSessions(prev => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
        setMessages([{
          role: 'assistant',
          content: 'Hi! I\'m FundTracer AI. Ask me about any wallet address to get an instant risk analysis.',
          timestamp: Date.now(),
        }]);
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      role: 'user' as const,
      content: inputValue,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    saveMessage(userMessage);

    // Check if we have attached files (document mode)
    const readyFiles = uploadedFiles.filter(f => f.status === 'ready' && f.fileUri);
    
    // If we have files but no wallet, use the document-only endpoint
    if (readyFiles.length > 0 && !walletAttachment) {
      try {
        const attachedFiles = readyFiles.map(f => ({
          fileUri: f.fileUri,
          mimeType: f.mimeType,
          displayName: f.name,
        }));

        const token = getAuthToken();
        const response = await fetch('/api/ai-chat/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
          body: JSON.stringify({
            question: inputValue,
            attachedFiles,
            history: messages.slice(-10).map(m => ({ role: m.role, content: m.content }))
          })
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        // Add placeholder for streaming response
        const placeholderId = Date.now();
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '',
          timestamp: placeholderId
        }]);

        if (!reader) {
          throw new Error('No response stream');
        }

        let fullResponse = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

          for (const line of lines) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              
              if (parsed.type === 'chunk') {
                fullResponse += parsed.content;
                setMessages(prev => prev.map(m => 
                  m.timestamp === placeholderId 
                    ? { ...m, content: fullResponse }
                    : m
                ));
              } else if (parsed.type === 'error') {
                throw new Error(parsed.message);
              }
            } catch {}
          }
        }

        if (!fullResponse) {
          throw new Error('No response from AI');
        }

      } catch (error: any) {
        console.error('Send with document error:', error);
        
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Sorry, something went wrong. ${error.message || 'Please try again.'}`,
          timestamp: Date.now()
        }]);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Original mock behavior for now when no files
      setTimeout(() => {
        const assistantMessage = {
          role: 'assistant' as const,
          content: 'I can analyze that wallet for you. Would you like me to fetch the latest risk score and transaction history?',
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        saveMessage(assistantMessage);
        setIsLoading(false);
      }, 1500);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewChat = () => {
    createNewSession();
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
      const token = getAuthToken();
      const response = await fetch('/api/ai-chat/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          address,
          addressType: isWallet ? 'wallet' : 'contract',
          chain: currentChain,
          question: 'Analyze this address and tell me about it',
          history: []
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let analysisData = null;

      if (!reader) {
        throw new Error('No response stream');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            
            if (parsed.type === 'analysis') {
              analysisData = parsed.message;
            } else if (parsed.type === 'chunk') {
              fullResponse += parsed.content;
            } else if (parsed.type === 'error') {
              throw new Error(parsed.message);
            }
          } catch {}
        }
      }

      if (analysisData || fullResponse) {
        setWalletAttachment({
          address,
          chain: currentChain,
          status: 'ready'
        });

        const assistantMessage = {
          role: 'assistant' as const,
          content: analysisData || `Address ${address.slice(0, 6)}...${address.slice(-4)} analyzed successfully. Ask me anything!`,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        saveMessage(assistantMessage);
      } else {
        throw new Error('No response from AI');
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      setWalletAttachment({
        address,
        chain: currentChain,
        status: 'error'
      });
      
      const errorMessage = {
        role: 'assistant' as const,
        content: `Sorry, I couldn't analyze this ${isWallet ? 'wallet' : 'contract'}. ${error.message || 'Please check the address and try again.'}`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
      saveMessage(errorMessage);
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
      // Build history from messages (last 10)
      const history = messages
        .slice(-10)
        .filter(m => m.content)
        .map(m => ({ role: m.role, content: m.content }));

      // Get ready files for attachment
      const readyFiles = uploadedFiles.filter(f => f.status === 'ready' && f.fileUri);
      const attachedFiles = readyFiles.map(f => ({
        fileUri: f.fileUri,
        mimeType: f.mimeType,
        displayName: f.name,
      }));

      const token = getAuthToken();
      const response = await fetch('/api/ai-chat/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          address: walletAttachment.address,
          addressType: attachmentMode === 'document' ? 'wallet' : attachmentMode,
          chain: walletAttachment.chain,
          question: inputValue,
          history,
          ...(attachedFiles.length > 0 && { attachedFiles })
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      // Add placeholder for streaming response
      const placeholderId = Date.now();
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '',
        timestamp: placeholderId
      }]);

      if (!reader) {
        throw new Error('No response stream');
      }

      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            
            if (parsed.type === 'chunk') {
              fullResponse += parsed.content;
              setMessages(prev => prev.map(m => 
                m.timestamp === placeholderId 
                  ? { ...m, content: fullResponse }
                  : m
              ));
            } else if (parsed.type === 'error') {
              throw new Error(parsed.message);
            }
          } catch {}
        }
      }

      if (!fullResponse) {
        throw new Error('No response from AI');
      }

    } catch (error: any) {
      console.error('Send with attachment error:', error);
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, something went wrong. ${error.message || 'Please try again.'}`,
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAttachment = () => {
    setWalletAttachment(null);
    setAttachmentMode('none');
  };

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setAttachmentMode('document');

    for (const file of Array.from(files)) {
      const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      setUploadedFiles(prev => [...prev, {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'uploading'
      }]);

      try {
        // Read file as base64
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            // Remove data URL prefix
            const base64Data = result.split(',')[1];
            resolve(base64Data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Upload to backend
        const token = getAuthToken();
        const response = await fetch('/api/upload/file', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
          body: JSON.stringify({
            fileData: base64,
            fileName: file.name,
            mimeType: file.type,
          }),
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const data = await response.json();

        if (data.success) {
          setUploadedFiles(prev => prev.map(f => 
            f.id === fileId ? { 
              ...f, 
              status: 'ready',
              fileUri: data.file.fileUri,
              mimeType: data.file.mimeType,
            } : f
          ));
        } else {
          throw new Error(data.error || 'Upload failed');
        }
      } catch (error: any) {
        console.error('File upload error:', error);
        setUploadedFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, status: 'error' } : f
        ));
      }
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
                    accept=".pdf,.txt,.csv,.json,.js,.ts,.py,.sol,.png,.jpg,.jpeg,.webp"
                  />

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
                        ) : attachmentMode === 'document' ? (
                          <FileText size={18} />
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
                            {attachmentMode !== 'none' && (
                              <>
                                <button 
                                  className="ai-dropdown-item"
                                  onClick={() => {
                                    setAttachmentMode('none');
                                    setWalletAttachment(null);
                                    setUploadedFiles([]);
                                    setShowAttachmentDropdown(false);
                                  }}
                                >
                                  <MessageSquare size={16} />
                                  <span>Chat Only</span>
                                </button>
                                <div className="ai-dropdown-divider" />
                              </>
                            )}
                            <button 
                              className="ai-dropdown-item"
                              onClick={() => {
                                setAttachmentMode('document');
                                setShowAttachmentDropdown(false);
                                fileInputRef.current?.click();
                              }}
                            >
                              <FileText size={16} />
                              <span>Document</span>
                            </button>
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
                            
                            {attachmentMode !== 'none' && (
                              <>
                                <div className="ai-dropdown-divider" />
                                <div className="ai-chain-selector">
                                  <span className="ai-chain-label">Chain:</span>
                                  <div className="ai-chain-options">
                                    {CHAIN_OPTIONS.map(chain => (
                                      <button
                                        key={chain.value}
                                        className={`ai-chain-btn ${selectedChain === chain.value ? 'active' : ''}`}
                                        onClick={() => {
                                          setSelectedChain(chain.value);
                                        }}
                                        style={{ 
                                          borderColor: selectedChain === chain.value ? chain.color : 'transparent',
                                          background: selectedChain === chain.value ? `${chain.color}20` : 'transparent'
                                        }}
                                      >
                                        {chain.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </>
                            )}
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
                            : attachmentMode === 'document'
                              ? 'Ask about the document...'
                              : currentWallet 
                                ? `Ask about ${currentWallet.slice(0, 6)}...` 
                                : 'Enter wallet address or question...'
                      }
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (attachmentMode === 'document' && uploadedFiles.length > 0) {
                            handleSendMessage();
                          } else if (attachmentMode !== 'none' && !walletAttachment) {
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
                    {attachmentMode !== 'none' && attachmentMode !== 'document' && !walletAttachment ? (
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
                        onClick={() => {
                          if (attachmentMode === 'document' && uploadedFiles.length > 0) {
                            // Send with document
                            handleSendMessage();
                          } else if (walletAttachment) {
                            handleSendWithAttachment();
                          } else {
                            handleSendMessage();
                          }
                        }}
                        disabled={isLoading || !inputValue.trim()}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Send size={16} />
                      </motion.button>
                    )}
                  </div>

                  {/* Quick Suggestion Chips */}
                  {walletAttachment && suggestions.length > 0 && (
                    <motion.div 
                      className="ai-suggestions"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <span className="ai-suggestions-label">Quick questions:</span>
                      <div className="ai-suggestions-list">
                        {suggestions.map((suggestion, idx) => (
                          <motion.button
                            key={idx}
                            className="ai-suggestion-chip"
                            onClick={() => {
                              setInputValue(suggestion);
                              inputRef.current?.focus();
                            }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 + idx * 0.05 }}
                          >
                            {suggestion}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
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
                      onClick={() => {
                          setActiveSessionId(session.id);
                          loadSessionMessages(session.id);
                        }}
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