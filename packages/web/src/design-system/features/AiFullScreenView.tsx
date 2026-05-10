import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
  ChevronDown,
  AlertCircle,
  Square,
  Search,
  GitBranch,
  Users,
  AlertTriangle,
  BarChart3,
  Link2,
  FileWarning,
  Key,
  Droplets,
  Printer,
  Skull,
  UserPlus,
  Zap,
  Brain,
  XCircle
} from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useAuth } from '../../contexts/AuthContext';
import { getHistory, type HistoryItem } from '../../utils/history';
import { apiRequest, getAuthToken, API_BASE } from '../../api';
import { loadHistory, saveMessage as orchestratorSaveMessage, createConversation } from '../../lib/chatOrchestrator';
import './AiFullScreenView.css';

// Design tokens
const T = {
  bg: '#08080f',
  surface: '#0f0f1a',
  surfaceAlt: '#13131f',
  border: 'rgba(255,255,255,0.07)',
  borderHov: 'rgba(255,255,255,0.14)',
  accent: '#7F77DD',
  accentDim: 'rgba(127,119,221,0.14)',
  accentBord: 'rgba(127,119,221,0.32)',
  green: '#1DB87A',
  greenDim: 'rgba(29,184,122,0.12)',
  red: '#E24B4A',
  redDim: 'rgba(226,75,74,0.1)',
  amber: '#EF9F27',
  amberDim: 'rgba(239,159,39,0.1)',
  text: '#eaeaf4',
  textSub: 'rgba(234,234,244,0.52)',
  textMuted: 'rgba(234,234,244,0.28)',
};

// Suggestion sets with icons (no emojis)
const SUGGESTIONS = {
  wallet: [
    { icon: Shield, text: 'Is this wallet safe to interact with?' },
    { icon: GitBranch, text: 'Trace the full funding source' },
    { icon: Users, text: 'Is this a sybil farming wallet?' },
    { icon: AlertTriangle, text: 'Show all risk flags detected' },
    { icon: BarChart3, text: 'Break down transaction patterns' },
    { icon: Link2, text: 'Find linked wallets' },
  ],
  contract: [
    { icon: AlertCircle, text: 'Is this contract a honeypot?' },
    { icon: Key, text: 'What permissions does the owner have?' },
    { icon: Droplets, text: 'Is liquidity locked?' },
    { icon: Printer, text: 'Check for hidden mint functions' },
    { icon: Skull, text: 'Has this contract been exploited?' },
    { icon: UserPlus, text: 'Who deployed this contract?' },
  ],
};

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

// Format file size helper
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Simple markdown to HTML converter for tables
function renderMarkdown(content: string): string {
  if (!content) return '';
  
  let html = content;
  
  // First, normalize tables by splitting rows that are on same line
  // Match patterns like: | X | Y | |---|-| | A | B |
  html = html.replace(/(\|[^\n|]+)\|(\s*)(\|[^\n|]+\|)+/g, (match) => {
    return match.replace(/\|(\s*)\|/g, '\n|$1|');
  });
  
  // Now split into blocks and process
  const blocks = html.split(/\n\n+/);
  const processedBlocks = blocks.map(block => {
    // Check if this block contains table-like structure
    const hasTableStart = block.includes('|') && block.match(/\|[^\n|]+\|[^\n|]*\|/);
    if (!hasTableStart) return block;
    
    // Split by lines and filter
    const lines = block.split('\n').filter(line => line.trim());
    if (lines.length < 2) return block;
    
    const rows: string[] = [];
    let isHeader = true;
    
    for (const line of lines) {
      // Skip separator lines (contains --- or :-)
      if (line.match(/\|[\s:-]+/) || line.match(/\|[\s]*---[\s]*\|/)) {
        isHeader = false;
        continue;
      }
      
      const cells = line.split('|').filter(c => c.trim());
      if (cells.length < 2) continue;
      
      if (isHeader) {
        rows.push('<tr>' + cells.map(c => `<th>${c.trim()}</th>`).join('') + '</tr>');
        isHeader = false;
      } else {
        rows.push('<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>');
      }
    }
    
    if (rows.length > 1) {
      return `<table class="ai-result-table"><thead>${rows[0]}</thead><tbody>${rows.slice(1).join('')}</tbody></table>`;
    }
    return block;
  });
  
  html = processedBlocks.join('<br><br>');
  
  // Convert bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Convert inline code
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');
  
  // Convert bullet lists
  html = html.replace(/^- (.*)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)+/g, '<ul>$&</ul>');
  
  return html;
}

// Premium Markdown renderer with Claude-style design
function MDContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        table: ({ children }: { children?: React.ReactNode }) => (
          <div style={{
            overflowX: 'auto', margin: '12px 0',
            borderRadius: 10, border: `0.5px solid ${T.border}`,
            background: T.surface,
          }}>
            <table style={{
              width: '100%', borderCollapse: 'collapse',
              fontSize: 12, color: T.text,
            }}>
              {children}
            </table>
          </div>
        ),
        thead: ({ children }: { children?: React.ReactNode }) => (
          <thead style={{ background: T.surfaceAlt }}>{children}</thead>
        ),
        th: ({ children }: { children?: React.ReactNode }) => (
          <th style={{
            padding: '9px 14px', textAlign: 'left',
            borderBottom: `0.5px solid ${T.border}`,
            color: T.accent, fontWeight: 500, fontSize: 11,
            whiteSpace: 'nowrap', letterSpacing: '0.03em',
            textTransform: 'uppercase',
          }}>
            {children}
          </th>
        ),
        td: ({ children }: { children?: React.ReactNode }) => (
          <td style={{
            padding: '8px 14px',
            borderBottom: 'rgba(255,255,255,0.04)',
            color: T.text, fontSize: 12, lineHeight: 1.5,
          }}>
            {children}
          </td>
        ),
        tr: ({ children }: { children?: React.ReactNode }) => (
          <tr style={{ transition: 'background 0.15s' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = T.surfaceAlt)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            {children}
          </tr>
        ),
        code: ({ children, className, ...props }: { children?: React.ReactNode; className?: string }) => {
          const isInline = !className;
          if (isInline) {
            return (
              <code style={{
                background: T.accentDim,
                padding: '1px 5px', borderRadius: 4,
                fontSize: 11, color: T.accent,
                fontFamily: '"JetBrains Mono", monospace', wordBreak: 'break-all',
              }}>
                {children}
              </code>
            );
          }
          return (
            <pre style={{
              background: '#0d0d18', padding: '12px 14px',
              borderRadius: 8, overflowX: 'auto',
              fontSize: 11, color: '#c8c8e8',
              border: `0.5px solid ${T.border}`,
              margin: '8px 0', fontFamily: '"JetBrains Mono", monospace',
            }}>
              <code {...props}>{children}</code>
            </pre>
          );
        },
        blockquote: ({ children }: { children?: React.ReactNode }) => (
          <blockquote style={{
            borderLeft: '3px solid ' + T.red,
            paddingLeft: 12, margin: '8px 0',
            background: T.redDim,
            borderRadius: '0 8px 8px 0',
            padding: '8px 12px',
            color: '#f0a0a0',
          }}>
            {children}
          </blockquote>
        ),
        strong: ({ children }: { children?: React.ReactNode }) => (
          <strong style={{ color: '#c8c8f8', fontWeight: 500 }}>
            {children}
          </strong>
        ),
        p: ({ children }: { children?: React.ReactNode }) => (
          <p style={{ margin: '4px 0', lineHeight: 1.6 }}>{children}</p>
        ),
        ul: ({ children }: { children?: React.ReactNode }) => (
          <ul style={{ margin: '4px 0', paddingLeft: 20 }}>{children}</ul>
        ),
        ol: ({ children }: { children?: React.ReactNode }) => (
          <ol style={{ margin: '4px 0', paddingLeft: 20 }}>{children}</ol>
        ),
        li: ({ children }: { children?: React.ReactNode }) => (
          <li style={{ margin: '2px 0', lineHeight: 1.6 }}>{children}</li>
        ),
        h3: ({ children }: { children?: React.ReactNode }) => (
          <h3 style={{
            color: T.accent, fontSize: 12, fontWeight: 500,
            textTransform: 'uppercase', letterSpacing: '0.05em',
            margin: '12px 0 6px 0',
          }}>
            {children}
          </h3>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

interface RecentScan {
  id: string;
  address: string;
  chain: string;
  timestamp: number;
  riskLevel?: string;
  riskScore?: number;
  label?: string;
  type?: 'wallet' | 'contract' | 'compare' | 'sybil';
  totalTransactions?: number;
  totalValueSentEth?: number;
  totalValueReceivedEth?: number;
  activityPeriodDays?: number;
  balanceInEth?: number;
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
  const { user, isAuthenticated } = useAuth();
  
  const [inputValue, setInputValue] = useState('');
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    // Restore last active session from localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ft_active_session_id');
    }
    return null;
  });
  
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string; timestamp: number }[]>(() => {
    // Start with empty, will be filled by loadSessionMessages or fetchChatSessions
    return [{
      role: 'assistant',
      content: 'Hi! I\'m FundTracer AI. Ask me about any wallet address to get an instant risk analysis.',
      timestamp: Date.now() - 3600000,
    }];
  });
  const [isLoading, setIsLoading] = useState(false);
  
  // Abort controller for stopping requests
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const [attachmentMode, setAttachmentMode] = useState<AttachmentMode>('none');
  const [showAttachmentDropdown, setShowAttachmentDropdown] = useState(false);
  const [walletAttachment, setWalletAttachment] = useState<WalletAttachment | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [selectedChain, setSelectedChain] = useState(currentChain);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Persist active session to localStorage
  useEffect(() => {
    if (activeSessionId && typeof window !== 'undefined') {
      localStorage.setItem('ft_active_session_id', activeSessionId);
    }
  }, [activeSessionId]);

  // Computed: is anything running
  const isRunning = isLoading || isAnalyzing || isLoadingContext || isUploading;
  
  // Stop everything
  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setIsAnalyzing(false);
    setIsLoadingContext(false);
    setIsUploading(false);
    
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: 'Operation stopped.',
      timestamp: Date.now()
    }]);
  };

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
      setIsInitialLoading(true);
      
      const history = getHistory() as HistoryItem[];
      const scans: RecentScan[] = history.slice(0, 20).map((item, index) => ({
        id: `scan-${index}`,
        address: item.address,
        chain: item.chain || 'ethereum',
        timestamp: item.timestamp || Date.now(),
        riskLevel: item.riskLevel,
        riskScore: item.riskScore,
        label: item.label,
        type: item.type,
        totalTransactions: item.totalTransactions,
        totalValueSentEth: item.totalValueSentEth,
        totalValueReceivedEth: item.totalValueReceivedEth,
        activityPeriodDays: item.activityPeriodDays,
        balanceInEth: item.balanceInEth,
      }));
      setRecentScans(scans);

      // Fetch chat sessions from backend
      fetchChatSessions().finally(() => {
        setIsInitialLoading(false);
      });
    }
  }, [isOpen]);

  const fetchChatSessions = async () => {
    try {
      const data = await apiRequest<{ sessions: any[] }>('/api/chat/sessions');
      if (data.sessions && data.sessions.length > 0) {
        setChatSessions(data.sessions);
        
        // Find the session to load: prefer saved activeSessionId, otherwise first one
        let sessionToLoad = data.sessions[0].id;
        
        // Check if saved activeSessionId exists in the list
        if (activeSessionId) {
          const savedSessionExists = data.sessions.find((s: any) => s.id === activeSessionId);
          if (savedSessionExists) {
            sessionToLoad = activeSessionId;
            console.log('[Chat] Restoring saved session:', sessionToLoad);
          }
        }
        
        setActiveSessionId(sessionToLoad);
        loadSessionMessages(sessionToLoad);
      } else {
        // No sessions exist - create a new one
        createNewSession();
      }
    } catch (error) {
      console.error('Failed to fetch chat sessions:', error);
      // Create a new session on error too
      createNewSession();
    }
  };

  const loadSessionMessages = async (sessionId: string) => {
    setIsLoadingSession(true);
    try {
      const userId = user?.uid;
      if (!userId) {
        throw new Error('Not authenticated');
      }
      
      const messages = await loadHistory(userId, sessionId);
      
      if (messages && messages.length > 0) {
        setMessages(messages);
      } else {
        setMessages([{
          role: 'assistant',
          content: 'Hi! I\'m FundTracer AI. Ask me about any wallet address to get an instant risk analysis.',
          timestamp: Date.now(),
        }]);
      }
    } catch (error) {
      console.error('Failed to load session messages:', error);
      setMessages([{
        role: 'assistant',
        content: 'Hi! I\'m FundTracer AI. Ask me about any wallet address to get an instant risk analysis.',
        timestamp: Date.now(),
      }]);
    } finally {
      setIsLoadingSession(false);
    }
  };

  const saveMessage = async (message: { role: 'user' | 'assistant'; content: string; timestamp: number }) => {
    console.log('[SaveMessage] Called:', { hasSession: !!activeSessionId, hasUser: !!user?.uid, role: message.role, contentLength: message.content.length });
    if (!activeSessionId || !user?.uid) {
      console.log('[SaveMessage] Skipped - missing session or user');
      return;
    }
    try {
      await orchestratorSaveMessage(user.uid, activeSessionId, message.role, message.content);
      console.log('[SaveMessage] Saved successfully');
    } catch (error) {
      console.error('[SaveMessage] Failed to save message:', error);
    }
  };

  const createNewSession = async () => {
    if (!user?.uid) return;
    
    try {
      setWalletAttachment(null);
      setUploadedFiles([]);
      setAttachmentMode('none');
      setInputValue('');
      
      const newSessionId = await createConversation(user.uid, 'New Conversation');
      
      if (newSessionId) {
        const newSession = { 
          id: newSessionId, 
          title: 'New Conversation',
          lastMessage: '',
          timestamp: Date.now(),
          messageCount: 0
        };
        setChatSessions(prev => [newSession, ...prev]);
        setActiveSessionId(newSessionId);
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

  // Auto-reset loading when new assistant message appears (backup for streaming completion)
  useEffect(() => {
    if (isLoading && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant' && lastMessage.content) {
        setIsLoading(false);
      }
    }
  }, [messages, isLoading]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    // Create new session if none exists
    if (!activeSessionId) {
      await createNewSession();
    }

    const userMessage = {
      role: 'user' as const,
      content: inputValue,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    try { await saveMessage(userMessage); } catch (e) { console.error('[Chat] Failed to save user message:', e); }
    
    // Safety timeout - ensure loading is reset after 5 seconds (backup)
    const loadingTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 5000);

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
        abortControllerRef.current = new AbortController();
        const response = await fetch(`${API_BASE}/api/ai-chat/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
          body: JSON.stringify({
            question: inputValue,
            attachedFiles,
            history: messages.slice(-10).map(m => ({ role: m.role, content: m.content }))
          }),
          signal: abortControllerRef.current.signal
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

        // Save assistant message to cache
        const assistantMsg = {
          role: 'assistant' as const,
          content: fullResponse,
          timestamp: Date.now(),
        };
        try { await saveMessage(assistantMsg); } catch (e) { console.error('[Chat] Failed to save assistant message:', e); }

      } catch (error: any) {
        clearTimeout(loadingTimeout);
        const errorMsg = error.message?.includes('network') 
          ? 'Network error. Please check your connection and try again.' 
          : `Sorry, something went wrong. ${error.message || 'Please try again.'}`;
        const docErrMsg = {
          role: 'assistant' as const,
          content: errorMsg,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, docErrMsg]);
        try { await saveMessage(docErrMsg); } catch (e) { console.error('[Chat] Failed to save error message:', e); }
      } finally {
        clearTimeout(loadingTimeout);
        setIsLoading(false);
      }
    } else {
      // Chat-only mode - call API without address or files
      try {
        const token = getAuthToken();
        if (!token) {
          throw new Error('Not authenticated - please log in again');
        }
        abortControllerRef.current = new AbortController();
        const response = await fetch(`${API_BASE}/api/ai-chat/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            question: inputValue,
            history: messages.slice(-10).map(m => ({ role: m.role, content: m.content }))
          }),
          signal: abortControllerRef.current.signal
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

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

        // Save assistant message to cache
        const assistantMsg = {
          role: 'assistant' as const,
          content: fullResponse,
          timestamp: Date.now(),
        };
        try { await saveMessage(assistantMsg); } catch (e) { console.error('[Chat] Failed to save assistant message:', e); }

      } catch (error: any) {
        clearTimeout(loadingTimeout);
        
        // Handle abort errors gracefully
        if (error.name === 'AbortError' || error.message?.includes('aborted')) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: 'Request was cancelled.',
            timestamp: Date.now()
          }]);
          setIsLoading(false);
          return;
        }
        
        const errorMsg = error.message?.includes('network') 
          ? 'Network error. Please check your connection and try again.' 
          : `Sorry, something went wrong. ${error.message || 'Please try again.'}`;
        const errMessage = {
          role: 'assistant' as const,
          content: errorMsg,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, errMessage]);
        try { await saveMessage(errMessage); } catch (e) { console.error('[Chat] Failed to save error message:', e); }
      } finally {
        clearTimeout(loadingTimeout);
        setIsLoading(false);
      }
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

const handleSelectScan = async (scan: RecentScan) => {
    setSelectedScanId(scan.id);
    setIsLoadingContext(true);
    
    setWalletAttachment({
      address: scan.address,
      chain: scan.chain,
      status: 'ready'
    });
    setAttachmentMode('wallet');
    setInputValue('');
    
    const scanDataTable = `
| Property | Value |
|----------|-------|
| Address | ${scan.address} |
| Chain | ${scan.chain} |
| Label | ${scan.label || 'N/A'} |
| Risk Score | ${scan.riskScore ?? 'N/A'} |
| Risk Level | ${scan.riskLevel || 'N/A'} |
| Total Transactions | ${scan.totalTransactions ?? 'N/A'} |
| Total Value Sent | ${scan.totalValueSentEth ? scan.totalValueSentEth.toFixed(4) : 'N/A'} ETH |
| Total Value Received | ${scan.totalValueReceivedEth ? scan.totalValueReceivedEth.toFixed(4) : 'N/A'} ETH |
| Activity Period | ${scan.activityPeriodDays ? `${scan.activityPeriodDays} days` : 'N/A'} |
| Balance | ${scan.balanceInEth ? scan.balanceInEth.toFixed(4) : 'N/A'} ETH |
| Last Scanned | ${formatRelativeTime(scan.timestamp)} |
`;
    
    const userMessage = {
      role: 'user' as const,
      content: `Show me details for wallet ${scan.address} on ${scan.chain}`,
      timestamp: Date.now(),
    };
    
    const assistantMessage = {
      role: 'assistant' as const,
      content: `Here's the cached scan data for **${scan.label || scan.address.slice(0, 8) + '...'}** on ${scan.chain.toUpperCase()}:\n\n${scanDataTable}\n\nYou can ask me follow-up questions about this wallet.`,
      timestamp: Date.now(),
    };
    
    setMessages(prev => [...prev, userMessage, assistantMessage]);
    try { await saveMessage(userMessage); } catch (e) { console.error('[Chat] Failed to save scan user message:', e); }
    try { await saveMessage(assistantMessage); } catch (e) { console.error('[Chat] Failed to save scan assistant message:', e); }
    setIsLoadingContext(false);
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
      abortControllerRef.current = new AbortController();
      const response = await fetch(`${API_BASE}/api/ai-chat/chat`, {
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
        }),
        signal: abortControllerRef.current.signal
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
        try { await saveMessage(assistantMessage); } catch (e) { console.error('[Chat] Failed to save analysis result:', e); }
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
      try { await saveMessage(errorMessage); } catch (e) { console.error('[Chat] Failed to save error message:', e); }
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
    try { await saveMessage(userMessage); } catch (e) { console.error('[Chat] Failed to save user message:', e); }
    
    // Safety timeout
    const loadingTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 5000);

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
      abortControllerRef.current = new AbortController();
      const response = await fetch(`${API_BASE}/api/ai-chat/chat`, {
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
        }),
        signal: abortControllerRef.current.signal
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

        // Save assistant message to backend
        const assistantMsg = {
          role: 'assistant' as const,
          content: fullResponse,
          timestamp: Date.now(),
        };
        try { await saveMessage(assistantMsg); } catch (e) { console.error('[Chat] Failed to save assistant message:', e); }

      } catch (error: any) {
      // Handle abort errors gracefully
      if (error.name === 'AbortError' || error.message?.includes('aborted')) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Request was cancelled.',
          timestamp: Date.now()
        }]);
        return;
      }
      
      console.error('Send with attachment error:', error);
      const errorMsg = error.message?.includes('network') 
        ? 'Network error. Please check your connection and try again.' 
        : `Sorry, something went wrong. ${error.message || 'Please try again.'}`;
      
      const errorMessage = {
        role: 'assistant' as const,
        content: errorMsg,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
      try { await saveMessage(errorMessage); } catch (e) { console.error('[Chat] Failed to save error message:', e); }
    } finally {
      clearTimeout(loadingTimeout);
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
        abortControllerRef.current = new AbortController();
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
          signal: abortControllerRef.current.signal
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
                <span 
                  className={`ai-header-status ${isRunning ? 'analyzing' : 'idle'}`}
                  title={isRunning ? 'Analyzing...' : 'Ready'}
                >
                  <span className={`ai-status-dot-header ${isRunning ? 'analyzing' : 'idle'}`} />
                  {isRunning ? 'Analyzing' : 'Ready'}
                </span>
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
              {/* Initial Loading State */}
              {isInitialLoading && (
                <>
                  {/* Left Column Skeleton */}
                  <motion.div 
                    className="ai-column ai-column-left"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div className="ai-column-header">
                      <Wallet size={16} />
                      <span>Recent Scans</span>
                    </div>
                    <div className="ai-scan-list">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="ai-scan-item ai-scan-skeleton">
                          <div className="ai-skeleton" style={{ width: '60%', height: '14px', marginBottom: '8px' }} />
                          <div className="ai-skeleton" style={{ width: '40%', height: '10px', opacity: 0.5 }} />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                  
                  {/* Middle Column Skeleton */}
                  <motion.div 
                    className="ai-column ai-column-middle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div className="ai-chat-messages">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className={`ai-message ai-message-${i === 1 ? 'user' : 'assistant'}`}>
                          <div className="ai-message-avatar">
                            {i === 1 ? <User size={14} /> : <Bot size={14} />}
                          </div>
                          <div className="ai-message-content">
                            <div className="ai-skeleton" style={{ 
                              width: i === 1 ? '60%' : i === 2 ? '80%' : '45%',
                              height: '16px',
                              borderRadius: '4px',
                              marginBottom: '8px'
                            }} />
                            <div className="ai-skeleton" style={{ 
                              width: '30%',
                              height: '12px',
                              borderRadius: '4px',
                              opacity: 0.5
                            }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                  
                  {/* Right Column Skeleton */}
                  <motion.div 
                    className="ai-column ai-column-right"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div className="ai-column-header">
                      <MessageSquare size={16} />
                      <span>Chat History</span>
                    </div>
                    <div className="ai-session-list">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="ai-session-item ai-session-skeleton">
                          <div className="ai-skeleton" style={{ width: '70%', height: '14px', marginBottom: '6px' }} />
                          <div className="ai-skeleton" style={{ width: '50%', height: '10px', opacity: 0.5 }} />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
              
              {/* Actual Content */}
              {!isInitialLoading && (
              <>
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
                          <span className="ai-scan-chain">
                            {scan.chain?.slice(0, 3).toUpperCase()}
                          </span>
                        </div>
                        <div className="ai-scan-item-meta">
                          {scan.riskLevel && (
                            <span className="ai-scan-risk">
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
                  {/* Quick Suggestions - Above context cards */}
                  {walletAttachment && suggestions.length > 0 && !isLoading && (
                    <motion.div 
                      className="ai-suggestions ai-suggestions-inline"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
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
                            transition={{ delay: 0.15 + idx * 0.05 }}
                          >
                            {suggestion}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                  
                  {/* Loading Context Indicator */}
                  {isLoadingContext && (
                    <div className="ai-context-cards">
                      <motion.div 
                        className="ai-context-card ai-context-loading"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <div className="ai-context-card-icon">
                          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                            <Loader2 size={14} />
                          </motion.div>
                        </div>
                        <div className="ai-context-card-content">
                          <span className="ai-context-card-label">Loading</span>
                          <span className="ai-context-card-value">Fetching cached data...</span>
                        </div>
                      </motion.div>
                    </div>
                  )}
                  
                  {/* Attachment Context Cards */}
                  {(walletAttachment || uploadedFiles.length > 0) && !isLoadingContext && (
                    <div className="ai-context-cards">
                      {walletAttachment && (
                        <motion.div 
                          className="ai-context-card"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <div className="ai-context-card-icon">
                            {walletAttachment.status === 'analyzing' ? (
                              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                                <Loader2 size={14} />
                              </motion.div>
                            ) : walletAttachment.status === 'ready' ? (
                              <CheckCircle2 size={14} />
                            ) : (
                              <AlertCircle size={14} />
                            )}
                          </div>
                          <div className="ai-context-card-content">
                            <span className="ai-context-card-label">
                              {attachmentMode === 'wallet' ? 'Wallet' : 'Contract'}
                            </span>
                            <span className="ai-context-card-value">
                              {walletAttachment.address.slice(0, 10)}...{walletAttachment.address.slice(-4)}
                            </span>
                            <span className="ai-context-card-chain">
                              {walletAttachment.chain?.toUpperCase()}
                            </span>
                          </div>
                          <button 
                            className="ai-context-card-clear"
                            onClick={handleClearAttachment}
                          >
                            <X size={12} />
                          </button>
                        </motion.div>
                      )}
                      {uploadedFiles.filter(f => f.status === 'ready').map((file) => (
                        <motion.div 
                          key={file.id}
                          className="ai-context-card ai-document-card"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <div className="ai-document-icon">
                            <FileText size={16} />
                          </div>
                          <div className="ai-document-info">
                            <span className="ai-document-name">{file.name}</span>
                            <span className="ai-document-size">{formatFileSize(file.size)}</span>
                          </div>
                          <button 
                            className="ai-document-remove"
                            onClick={() => handleRemoveFile(file.id)}
                          >
                            <X size={14} />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                  {isLoadingSession ? (
                    <>
                      {[1, 2, 3].map((i) => (
                        <motion.div 
                          key={i}
                          className={`ai-message ai-message-${i === 1 ? 'user' : 'assistant'}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          <div className="ai-message-avatar">
                            {i === 1 ? <User size={14} /> : <Bot size={14} />}
                          </div>
                          <div className="ai-message-content">
                            <div className="ai-skeleton" style={{ 
                              width: i === 1 ? '60%' : i === 2 ? '80%' : '45%',
                              height: '16px',
                              borderRadius: '4px',
                              marginBottom: '8px'
                            }} />
                            <div className="ai-skeleton" style={{ 
                              width: '30%',
                              height: '12px',
                              borderRadius: '4px',
                              opacity: 0.5
                            }} />
                          </div>
                        </motion.div>
                      ))}
                    </>
                  ) : (
                    messages.map((msg, index) => (
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
                        <MDContent content={msg.content} />
                        <div className="ai-message-footer">
                          {msg.role === 'assistant' && (
                            <div className="ai-model-badges">
                              <span className="ai-model-badge maverick">Maverick</span>
                              {walletAttachment && (
                                <span 
                                  className="ai-chain-badge"
                                  style={{ 
                                    background: `${CHAIN_COLORS[walletAttachment.chain] || '#888'}20`,
                                    color: CHAIN_COLORS[walletAttachment.chain] || '#888',
                                    borderColor: CHAIN_COLORS[walletAttachment.chain] || '#888'
                                  }}
                                >
                                  {walletAttachment.chain.toUpperCase()}
                                </span>
                              )}
                            </div>
                          )}
                          <span className={`ai-status-dot ${isRunning ? 'analyzing' : 'idle'}`} title={isRunning ? 'Analyzing...' : 'Ready'} />
                          <span className="ai-message-time">
                            {formatRelativeTime(msg.timestamp)}
                          </span>
                        </div>
                      </motion.div>
                    </motion.div>
                  ))
                  )}
                  {isLoading && messages.filter(m => m.role === 'assistant').slice(-1)[0]?.content.length < 5 && (
                    <motion.div 
                      className="ai-message ai-message-assistant ai-thinking"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div className="ai-message-avatar">
                        <Bot size={14} />
                      </div>
                      <div className="ai-message-content">
                        <div className="ai-thinking-dots">
                          <motion.span 
                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                          />
                          <motion.span 
                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                          />
                          <motion.span 
                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                          />
                        </div>
                        <span className="ai-thinking-text">Thinking</span>
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
                        disabled={isUploading}
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
                    ) : isRunning ? (
                      <motion.button 
                        className="ai-stop-btn"
                        onClick={handleStop}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        style={{ background: '#ef4444' }}
                      >
                        <Square size={16} />
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
                        disabled={!inputValue.trim()}
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
              </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AiFullScreenView;