import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Trash2, Plus, MessageSquare, History, Upload, ChevronDown, FileText, X } from 'lucide-react';
import { useIsMobile } from '../../../hooks/useIsMobile';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { sendChatMessage, getChatSessions, deleteChatSession, createChatSession, updateChatSession, getChatSession, type ChatMessage } from '../../api/chat';
import { useNotify } from '../../contexts/ToastContext';
import { getHistory, onHistoryChange } from '../../stores/history';
import { getAuthToken } from '../../api/client';

interface AttachedFile {
  name: string;
  type: string;
  size: number;
  content: string;
}

interface AiChatViewProps {
  context?: { address?: string; chain?: string };
}

export function AiChatView({ context }: AiChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Array<{ id: string; title?: string; updatedAt: number }>>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showHistoryPicker, setShowHistoryPicker] = useState(false);
  const [scanHistory, setScanHistory] = useState<ReturnType<typeof getHistory>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const historyPickerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const notify = useNotify();
  const isMobile = useIsMobile();

  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [loadingSession, setLoadingSession] = useState(false);

  useEffect(() => { loadSessions(); }, []);

  // Restore last session on mount
  useEffect(() => {
    const lastSessionId = (() => { try { return localStorage.getItem('ft_last_chat_session'); } catch { return null; } })();
    if (lastSessionId) {
      loadSession(lastSessionId);
    }
  }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Load scan history and subscribe to changes
  useEffect(() => {
    setScanHistory(getHistory());
    return onHistoryChange(() => setScanHistory(getHistory()));
  }, []);

  // Click outside to close dropdowns
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) setShowPlusMenu(false);
      if (historyPickerRef.current && !historyPickerRef.current.contains(e.target as Node)) setShowHistoryPicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadSessions = async () => {
    try {
      const list = await getChatSessions();
      setSessions(list.sort((a, b) => b.updatedAt - a.updatedAt));
    } catch { /* offline / no sessions yet */ }
  };

  const saveCurrentSession = async (msgs: ChatMessage[], sid: string | null) => {
    const title = msgs.find(m => m.role === 'user')?.content?.slice(0, 80) || 'New Chat';
    try {
      if (sid) {
        await updateChatSession(sid, title, msgs);
      } else {
        const created = await createChatSession(title, msgs);
        setSessionId(created.id);
        try { localStorage.setItem('ft_last_chat_session', created.id); } catch {}
      }
      loadSessions();
    } catch { /* offline — skip */ }
  };

  const loadSession = async (id: string) => {
    setShowHistory(false);
    setMessages([]);
    setSessionId(id);
    setLoadingSession(true);
    try {
      const session = await getChatSession(id);
      setMessages(session.messages || []);
      try { localStorage.setItem('ft_last_chat_session', id); } catch {}
    } catch { /* session not found */ }
    finally { setLoadingSession(false); }
  };

  const handleSend = async () => {
    const text = input.trim();
    if ((!text && attachedFiles.length === 0) || loading) return;
    setInput('');

    const files = [...attachedFiles];
    setAttachedFiles([]);

    const userMsg: ChatMessage = {
      role: 'user',
      content: text || 'Analyze the attached file(s)',
      timestamp: Date.now(),
      attachment: files.length === 1 ? { name: files[0].name, type: files[0].type, size: files[0].size } : undefined,
    };
    const updatedAfterUser = [...messages, userMsg];
    setMessages(updatedAfterUser);

    setLoading(true);
    try {
      const res = await sendChatMessage(
        sessionId, text || 'Analyze the attached file(s)', context,
        messages,
        files.length > 0 ? files.map(f => ({ name: f.name, content: f.content })) : undefined,
      );
      const aiMsg: ChatMessage = { role: 'assistant', content: res.reply, timestamp: Date.now() };
      const finalMsgs = [...updatedAfterUser, aiMsg];
      setMessages(finalMsgs);
      saveCurrentSession(finalMsgs, sessionId);
    } catch (err) {
      const errMsg: ChatMessage = { role: 'assistant', content: 'Sorry, an error occurred. Please try again.', timestamp: Date.now() };
      setMessages(prev => [...prev, errMsg]);
      notify.error('Chat request failed');
    } finally {
      setLoading(false);
    }
  };

  const newChat = () => {
    setMessages([]); setSessionId(null);
    try { localStorage.removeItem('ft_last_chat_session'); } catch {}
  };

  const deleteSession = async (id: string) => {
    try {
      await deleteChatSession(id);
      if (id === sessionId) newChat();
      loadSessions();
    } catch { notify.error('Failed to delete session'); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setShowPlusMenu(false);

    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      setAttachedFiles(prev => [...prev, {
        name: file.name,
        type: file.type || 'text/plain',
        size: file.size,
        content: content.length > 32000 ? content.slice(0, 32000) : content,
      }]);
      notify.success(`Attached: ${file.name}`);
    };
    reader.onerror = () => notify.error('Failed to read file');
    reader.readAsText(file);
    e.target.value = '';
  };

  const removeAttachment = (idx: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const insertHistoryAsContext = (entry: ReturnType<typeof getHistory>[0]) => {
    setShowHistoryPicker(false);
    setShowPlusMenu(false);

    const lines = [
      `[Scan History Entry]`,
      `Address: ${entry.address}`,
      `Chain: ${entry.chain}`,
      `Type: ${entry.type || 'N/A'}`,
      `Risk Level: ${entry.riskLevel || 'N/A'}`,
      `Risk Score: ${entry.riskScore != null ? entry.riskScore + '/100' : 'N/A'}`,
      `Total Transactions: ${entry.totalTransactions ?? 'N/A'}`,
    ];
    if (entry.totalValueSentEth != null) lines.push(`Total Value Sent: ${entry.totalValueSentEth} ETH`);
    if (entry.totalValueReceivedEth != null) lines.push(`Total Value Received: ${entry.totalValueReceivedEth} ETH`);
    if (entry.balanceInEth != null) lines.push(`Balance: ${entry.balanceInEth} ETH`);
    if (entry.activityPeriodDays != null) lines.push(`Activity Period: ${entry.activityPeriodDays} days`);

    const historyMsg = lines.join('\n');
    const userMsg: ChatMessage = { role: 'user', content: historyMsg, timestamp: Date.now() };
    const updatedAfterUser = [...messages, userMsg];
    setMessages(updatedAfterUser);

    setLoading(true);
    sendChatMessage(sessionId, historyMsg, { address: entry.address, chain: entry.chain }, messages)
      .then(res => {
        const aiMsg: ChatMessage = { role: 'assistant', content: res.reply, timestamp: Date.now() };
        const finalMsgs = [...updatedAfterUser, aiMsg];
        setMessages(finalMsgs);
        saveCurrentSession(finalMsgs, sessionId);
      })
      .catch(() => {
        const errMsg: ChatMessage = { role: 'assistant', content: 'Sorry, an error occurred. Please try again.', timestamp: Date.now() };
        setMessages(prev => [...prev, errMsg]);
        notify.error('Chat request failed');
      })
      .finally(() => setLoading(false));
  };

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <div style={{
          padding: '12px 20px', borderBottom: '1px solid var(--hairline)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bot size={18} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>AI Investigator</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setShowHistory(!showHistory)}
              style={iconBtnStyle} title="Chat history">
              <MessageSquare size={14} />
            </button>
            <button onClick={newChat} style={iconBtnStyle} title="New chat">
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {loadingSession ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ display: 'flex', gap: 10, justifyContent: i % 2 === 0 ? 'flex-end' : 'flex-start' }}>
                  {i % 2 !== 0 && (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--hover-overlay)', flexShrink: 0, animation: 'skeleton-pulse 1.5s infinite' }} />
                  )}
                  <div style={{
                    maxWidth: i % 2 === 0 ? '60%' : '75%',
                    padding: '10px 14px', borderRadius: 'var(--radius-lg)',
                    background: 'var(--card)', border: '1px solid var(--hairline)',
                    animation: 'skeleton-pulse 1.5s infinite',
                  }}>
                    <div style={{ width: i === 3 ? '80%' : i === 4 ? '90%' : '100%', height: 10, borderRadius: 4, background: 'var(--hover-overlay)', marginBottom: 6, animation: 'skeleton-pulse 1.5s infinite' }} />
                    {i !== 2 && <div style={{ width: i === 1 ? '60%' : '45%', height: 10, borderRadius: 4, background: 'var(--hover-overlay)', animation: 'skeleton-pulse 1.5s infinite' }} />}
                  </div>
                  {i % 2 === 0 && (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--hover-overlay)', flexShrink: 0, animation: 'skeleton-pulse 1.5s infinite' }} />
                  )}
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--fg-tertiary)' }}>
              <Bot size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-secondary)', marginBottom: 4 }}>FundTracer AI</div>
              <div style={{ fontSize: 12, textAlign: 'center', maxWidth: 340, lineHeight: 1.5 }}>
                {context?.address ? (
                  <>Ask me about <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{context.address.slice(0, 8)}...{context.address.slice(-6)}</span> on {context.chain} — transactions, risk, funding sources, or anything else.</>
                ) : (
                  <>Ask me about wallet analysis, transaction patterns, DeFi risks, or anything blockchain forensics related.</>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {messages.map((msg, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 10,
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}>
                  {msg.role === 'assistant' && (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,230,122,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Bot size={14} style={{ color: 'var(--accent)' }} />
                    </div>
                  )}
                  <div style={{
                    maxWidth: '80%', padding: '10px 14px', borderRadius: 'var(--radius-lg)',
                    background: msg.role === 'user' ? 'rgba(0,230,122,0.1)' : 'var(--card)',
                    border: msg.role === 'user' ? '1px solid var(--accent)' : '1px solid var(--hairline)',
                    fontSize: 13, lineHeight: 1.6, color: 'var(--fg)',
                    whiteSpace: msg.role === 'user' ? 'pre-wrap' : 'normal',
                    wordBreak: 'break-word',
                  }}>
                    {msg.attachment ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FileText size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontFamily: 'var(--font-sans)' }}>{msg.attachment.name}</span>
                        <span style={{ fontSize: 10, color: 'var(--fg-tertiary)' }}>
                          {(msg.attachment.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    ) : msg.role === 'assistant' ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code: ({ className, children, ...props }) => {
                            const isBlock = /language-/.test(className || '');
                            if (isBlock) {
                              return (
                                <pre style={{
                                  background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-md)',
                                  padding: '10px 14px', overflow: 'auto', fontSize: 12,
                                  fontFamily: 'var(--font-mono)', lineHeight: 1.5,
                                  margin: '8px 0',
                                }}>
                                  <code className={className} {...props}>{children}</code>
                                </pre>
                              );
                            }
                            return (
                              <code style={{
                                background: 'rgba(0,0,0,0.3)', padding: '2px 5px',
                                borderRadius: 4, fontSize: 12, fontFamily: 'var(--font-mono)',
                              }} {...props}>{children}</code>
                            );
                          },
                          a: ({ href, children }) => (
                            <a href={href} target="_blank" rel="noopener noreferrer"
                              style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
                              {children}
                            </a>
                          ),
                          table: ({ children }) => (
                            <div style={{ overflow: 'auto', margin: '8px 0' }}>
                              <table style={{
                                borderCollapse: 'collapse', width: '100%', fontSize: 12,
                                border: '1px solid var(--hairline)', borderRadius: 'var(--radius-md)',
                              }}>
                                {children}
                              </table>
                            </div>
                          ),
                          th: ({ children }) => (
                            <th style={{
                              padding: '6px 10px', borderBottom: '1px solid var(--hairline)',
                              textAlign: 'left', fontWeight: 600, color: 'var(--fg-secondary)',
                              fontFamily: 'var(--font-sans)', fontSize: 11,
                            }}>{children}</th>
                          ),
                          td: ({ children }) => (
                            <td style={{
                              padding: '6px 10px', borderBottom: '1px solid var(--hairline)',
                              fontFamily: 'var(--font-mono)', fontSize: 12,
                            }}>{children}</td>
                          ),
                          p: ({ children }) => <p style={{ margin: '4px 0' }}>{children}</p>,
                          strong: ({ children }) => <strong style={{ fontWeight: 600, color: 'var(--fg)' }}>{children}</strong>,
                          em: ({ children }) => <em style={{ fontStyle: 'italic', color: 'var(--fg-secondary)' }}>{children}</em>,
                          ul: ({ children }) => <ul style={{ paddingLeft: 18, margin: '4px 0' }}>{children}</ul>,
                          ol: ({ children }) => <ol style={{ paddingLeft: 18, margin: '4px 0' }}>{children}</ol>,
                          li: ({ children }) => <li style={{ margin: '2px 0' }}>{children}</li>,
                          h1: ({ children }) => <h1 style={{ fontSize: 16, fontWeight: 700, margin: '10px 0 4px', color: 'var(--fg)' }}>{children}</h1>,
                          h2: ({ children }) => <h2 style={{ fontSize: 15, fontWeight: 700, margin: '8px 0 4px', color: 'var(--fg)' }}>{children}</h2>,
                          h3: ({ children }) => <h3 style={{ fontSize: 14, fontWeight: 600, margin: '8px 0 4px', color: 'var(--fg)' }}>{children}</h3>,
                          blockquote: ({ children }) => (
                            <blockquote style={{
                              borderLeft: '2px solid var(--accent)', paddingLeft: 12, margin: '8px 0',
                              color: 'var(--fg-secondary)', fontStyle: 'italic',
                            }}>{children}</blockquote>
                          ),
                          hr: () => <hr style={{ border: 'none', borderTop: '1px solid var(--hairline)', margin: '10px 0' }} />,
                        }}>
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      msg.content
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--hover-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <User size={14} style={{ color: 'var(--fg-secondary)' }} />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,230,122,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Bot size={14} style={{ color: 'var(--accent)' }} />
                  </div>
                  <div style={{
                    padding: '10px 14px', borderRadius: 'var(--radius-lg)', background: 'var(--card)',
                    border: '1px solid var(--hairline)', display: 'flex', gap: 4,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--fg-tertiary)', animation: 'bounce 1.4s infinite' }} />
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--fg-tertiary)', animation: 'bounce 1.4s infinite 0.2s' }} />
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--fg-tertiary)', animation: 'bounce 1.4s infinite 0.4s' }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ padding: isMobile ? '10px 12px 14px' : '12px 20px', borderTop: '1px solid var(--hairline)' }}>
          {/* Pending attached files */}
          {attachedFiles.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              {attachedFiles.map((f, i) => (
                <div key={i} style={{
                  padding: '5px 10px', borderRadius: 'var(--radius-md)',
                  background: 'rgba(0,230,122,0.08)', border: '1px solid var(--accent)',
                  display: 'flex', alignItems: 'center', gap: 6, fontSize: 11,
                  fontFamily: 'var(--font-sans)',
                }}>
                  <FileText size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <span style={{ color: 'var(--fg)' }}>{f.name}</span>
                  <span style={{ color: 'var(--fg-tertiary)' }}>{(f.size / 1024).toFixed(1)} KB</span>
                  <button
                    onClick={() => removeAttachment(i)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-tertiary)', padding: 0, display: 'flex' }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, position: 'relative' }}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Ask about wallet analysis, tracing, DeFi..."
              disabled={loading}
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--card-border)', background: 'var(--card)',
                color: 'var(--fg)', fontSize: 13, fontFamily: 'var(--font-sans)',
                outline: 'none', opacity: loading ? 0.5 : 1,
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--card-border)'; }}
            />

            {/* Plus button with dropdown */}
            <div ref={plusMenuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => { setShowPlusMenu(!showPlusMenu); setShowHistoryPicker(false); }}
                disabled={loading}
                style={{
                  padding: '10px 12px', borderRadius: 'var(--radius-lg)', border: 'none',
                  background: 'var(--hover-overlay)', color: 'var(--fg-tertiary)',
                  cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.5 : 1,
                  transition: 'all 150ms',
                }}
                title="Attach context"
              >
                <Plus size={16} />
              </button>
              {showPlusMenu && (
                <div style={{
                  position: 'absolute', bottom: '100%', right: 0, marginBottom: 6,
                  background: 'var(--card)', border: '1px solid var(--card-border)',
                  borderRadius: 'var(--radius-lg)', padding: 4, minWidth: 200,
                  boxShadow: 'var(--shadow-overlay)', zIndex: 200,
                }}>
                  <button
                    onClick={() => { setShowHistoryPicker(!showHistoryPicker); setShowPlusMenu(false); }}
                    style={plusMenuItemStyle}>
                    <History size={14} />
                    <span>Scan History</span>
                  </button>
                  <button
                    onClick={() => { setShowPlusMenu(false); setTimeout(() => fileInputRef.current?.click(), 0); }}
                    style={plusMenuItemStyle}>
                    <Upload size={14} />
                    <span>Upload Document</span>
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.csv,.json,.md,.log"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </div>

            {/* History picker dropdown */}
            {showHistoryPicker && (
              <div ref={historyPickerRef} style={{
                position: 'absolute', bottom: '100%', right: 52, marginBottom: 6,
                width: 320, maxHeight: 340, overflow: 'auto',
                background: 'var(--card)', border: '1px solid var(--card-border)',
                borderRadius: 'var(--radius-lg)', padding: 4,
                boxShadow: 'var(--shadow-overlay)', zIndex: 200,
              }}>
                <div style={{
                  padding: '8px 12px', fontSize: 11, fontWeight: 600,
                  color: 'var(--fg-tertiary)', textTransform: 'uppercase',
                  letterSpacing: '0.05em', borderBottom: '1px solid var(--hairline)',
                  marginBottom: 4,
                }}>
                  Recent Scans
                </div>
                {scanHistory.length === 0 ? (
                  <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--fg-tertiary)', textAlign: 'center' }}>
                    No scan history yet
                  </div>
                ) : (
                  scanHistory.slice(0, 15).map((entry, i) => (
                    <button key={i}
                      onClick={() => insertHistoryAsContext(entry)}
                      style={{
                        width: '100%', textAlign: 'left', padding: '8px 12px',
                        border: 'none', background: 'transparent', cursor: 'pointer',
                        borderRadius: 'var(--radius-md)', color: 'var(--fg)',
                        display: 'flex', flexDirection: 'column', gap: 2,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-overlay)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--fg)' }}>
                        {entry.address.slice(0, 10)}...{entry.address.slice(-6)}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--fg-tertiary)' }}>
                        {entry.chain}
                        {entry.riskLevel ? ` • Risk: ${entry.riskLevel}` : ''}
                        {entry.totalTransactions != null ? ` • ${entry.totalTransactions} txs` : ''}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}

            <button onClick={handleSend} disabled={loading || (!input.trim() && attachedFiles.length === 0)}
              style={{
                padding: '10px 16px', borderRadius: 'var(--radius-lg)', border: 'none',
                background: (input.trim() || attachedFiles.length > 0) ? 'var(--accent)' : 'var(--hover-overlay)',
                color: (input.trim() || attachedFiles.length > 0) ? '#000' : 'var(--fg-tertiary)',
                cursor: (input.trim() || attachedFiles.length > 0) ? 'pointer' : 'default',
                transition: 'all 150ms',
              }}>
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* History sidebar */}
      {showHistory && (
        <div style={{
          width: 260, borderLeft: '1px solid var(--hairline)', overflow: 'auto',
          background: 'var(--bg-secondary)',
        }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>Chat History</span>
            <button onClick={() => setShowHistory(false)} style={{ ...iconBtnStyle, padding: 2 }}>×</button>
          </div>
          {sessions.length === 0 ? (
            <div style={{ padding: 20, fontSize: 12, color: 'var(--fg-tertiary)', textAlign: 'center' }}>No previous chats</div>
          ) : (
            sessions.map(s => (
              <div key={s.id} onClick={() => loadSession(s.id)} style={{
                padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderBottom: '1px solid var(--hairline)', cursor: 'pointer',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-overlay)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ fontSize: 12, color: 'var(--fg-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.title || `Chat ${s.id.slice(0, 8)}`}
                </span>
                <button onClick={e => { e.stopPropagation(); deleteSession(s.id); }}
                  style={{ ...iconBtnStyle, color: 'var(--fg-tertiary)', padding: 2 }}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  padding: 6, borderRadius: 'var(--radius-md)', border: 'none',
  background: 'transparent', color: 'var(--fg-tertiary)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const plusMenuItemStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
  width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)',
  border: 'none', background: 'transparent', color: 'var(--fg)',
  fontSize: 13, fontFamily: 'var(--font-sans)', cursor: 'pointer',
  textAlign: 'left' as const,
};
