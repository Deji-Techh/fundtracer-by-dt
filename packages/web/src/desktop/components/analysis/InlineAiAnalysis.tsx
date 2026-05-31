import { useState, useEffect, useRef } from 'react';
import { Bot, Send, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { sendChatMessage } from '../../api/chat';
import { MarkdownContent } from './MarkdownContent';

interface Props {
  address: string;
  chain: string;
  analysisData: unknown;
}

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

export function InlineAiAnalysis({ address, chain, analysisData }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [streaming, setStreaming] = useState('');
  const loadedRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-run initial analysis when analysisData appears
  useEffect(() => {
    if (loadedRef.current || !analysisData) return;
    loadedRef.current = true;
    runInitialAnalysis();
  }, [analysisData]);

  const runInitialAnalysis = async () => {
    setLoading(true);
    try {
      const prompt = `Analyze wallet ${address} on ${chain} and provide a concise, insightful summary:

1. A risk assessment summary (2-3 sentences)
2. Key findings from suspicious indicators (if any)
3. Notable transaction patterns
4. Entity/label assessment
5. A brief recommendation

Be direct and insightful. Use bullet points for clarity.`;

      let fullReply = '';
      await sendChatMessage(
        'inline-analysis',
        prompt,
        { address, chain },
        [],
        undefined,
        (chunk) => {
          fullReply += chunk;
          setStreaming(fullReply);
        }
      );

      setMessages([{ role: 'assistant', content: fullReply }]);
      setStreaming('');
    } catch (err) {
      console.error('[InlineAiAnalysis]', err);
      const msg = err instanceof Error ? err.message : 'Failed to generate analysis';
      setMessages([{ role: 'assistant', content: `Failed to generate analysis: ${msg}. Please try a follow-up question.` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowUp = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput('');
    setLoading(true);

    const userMsg: Message = { role: 'user', content: q };
    setMessages(prev => [...prev, userMsg]);

    try {
      const ctx = JSON.stringify(analysisData, null, 2).slice(0, 20000);
      const history = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));

      let fullReply = '';
      await sendChatMessage(
        'inline-analysis',
        q,
        { address, chain, analysisData: ctx },
        history,
        undefined,
        (chunk) => {
          fullReply += chunk;
          setStreaming(fullReply);
        }
      );

      setMessages(prev => [...prev, { role: 'assistant', content: fullReply }]);
      setStreaming('');
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Failed to get response.' }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleFollowUp();
    }
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--card)', borderRadius: 'var(--radius-xl)',
      border: '1px solid var(--hairline)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', borderBottom: '1px solid var(--hairline)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={14} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', fontFamily: 'var(--font-sans)' }}>
            AI Analysis
          </span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            padding: 2, border: 'none', background: 'transparent',
            color: 'var(--fg-tertiary)', cursor: 'pointer', display: 'flex',
          }}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {!expanded && (
        <div style={{ padding: '12px 14px', fontSize: 11, color: 'var(--fg-tertiary)', fontStyle: 'italic' }}>
          Click to expand AI analysis
        </div>
      )}

      {expanded && (
        <>
          {/* Messages area */}
          <div style={{ flex: 1, overflow: 'auto', padding: '12px 14px', minHeight: 120, maxHeight: 320 }}>
            {loading && messages.length === 0 && !streaming && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--fg-tertiary)', fontSize: 12 }}>
                <Bot size={14} />
                <span>Analyzing wallet data...</span>
                <span style={{ color: 'var(--accent)' }}>...</span>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} style={{ marginBottom: i < messages.length - 1 ? 12 : 0 }}>
                {msg.role === 'assistant' ? (
                  <div style={{ fontSize: 12, color: 'var(--fg)', lineHeight: 1.6, fontFamily: 'var(--font-sans)' }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 4, padding: '10px 14px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-secondary)', border: '1px solid var(--hairline)' }}>
                      <Sparkles size={12} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
                      <MarkdownContent text={msg.content} />
                    </div>
                  </div>
                ) : (
                  <div style={{
                    fontSize: 12, color: 'var(--fg)', lineHeight: 1.5, fontFamily: 'var(--font-sans)',
                    background: 'var(--hover-overlay)', borderRadius: 'var(--radius-md)',
                    padding: '6px 10px', marginLeft: 24,
                  }}>
                    {msg.content}
                  </div>
                )}
              </div>
            ))}

            {/* Streaming response */}
            {streaming && (
              <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-secondary)', border: '1px solid var(--hairline)' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Sparkles size={12} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
                  <div style={{ fontSize: 12, color: 'var(--fg)', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'var(--font-sans)' }}>
                    {streaming}
                    <span style={{ color: 'var(--accent)', animation: 'pulse-1 1s infinite' }}>|</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '8px 14px', borderTop: '1px solid var(--hairline)',
          }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a follow-up question..."
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--card-border)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--fg)',
                  fontSize: 12,
                  fontFamily: 'var(--font-sans)',
                  outline: 'none',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--card-border)'; }}
              />
              <button
                onClick={handleFollowUp}
                disabled={loading || !input.trim()}
                style={{
                  padding: '7px 10px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: input.trim() && !loading ? 'var(--accent)' : 'var(--card-border)',
                  color: input.trim() && !loading ? '#000' : 'var(--fg-tertiary)',
                  cursor: input.trim() && !loading ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'background 150ms',
                  flexShrink: 0,
                }}
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
