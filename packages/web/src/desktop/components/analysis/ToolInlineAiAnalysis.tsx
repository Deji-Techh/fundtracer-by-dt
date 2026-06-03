import { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { sendChatMessage } from '../../api/chat';
import { getInlineAiCacheKey, getInlineAiMessages, saveInlineAiMessages } from '../../stores/inlineAiCache';
import { MarkdownContent } from './MarkdownContent';

export interface ToolAiMessage {
  role: 'assistant' | 'user';
  content: string;
}

interface ToolInlineAiAnalysisProps {
  cacheId: string;
  title?: string;
  prompt: string;
  context: {
    address?: string;
    chain: string;
    analysisData: unknown;
  };
  cachedMessages: ToolAiMessage[];
  onMessagesChange: (messages: ToolAiMessage[]) => void;
}

export function ToolInlineAiAnalysis({
  cacheId,
  title = 'AI Analysis',
  prompt,
  context,
  cachedMessages,
  onMessagesChange,
}: ToolInlineAiAnalysisProps) {
  const [messages, setMessages] = useState<ToolAiMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState('');
  const loadedRef = useRef(false);
  const dataSignature = useMemo(() => JSON.stringify(context.analysisData).slice(0, 12000), [context.analysisData]);
  const cacheKey = useMemo(
    () => getInlineAiCacheKey(context.address || cacheId, `${context.chain}:${cacheId}`, context.analysisData),
    [cacheId, context.address, context.chain, context.analysisData],
  );

  useEffect(() => {
    loadedRef.current = false;
    setStreaming('');
    const stored = getInlineAiMessages(cacheKey) as ToolAiMessage[];
    if (cachedMessages.length > 0) {
      setMessages(cachedMessages);
    } else if (stored.length > 0) {
      setMessages(stored);
      onMessagesChange(stored);
    } else {
      setMessages([]);
    }
  }, [cacheKey, dataSignature, cachedMessages.length, onMessagesChange]);

  useEffect(() => {
    if (loadedRef.current || !context.analysisData) return;
    loadedRef.current = true;
    if (cachedMessages.length > 0) {
      setMessages(cachedMessages);
      return;
    }
    const stored = getInlineAiMessages(cacheKey) as ToolAiMessage[];
    if (stored.length > 0) {
      setMessages(stored);
      onMessagesChange(stored);
      return;
    }
    void runPrompt(prompt, []);
  }, [cacheKey, context.analysisData, cachedMessages, prompt, onMessagesChange]);

  useEffect(() => {
    onMessagesChange(messages);
    saveInlineAiMessages(cacheKey, messages);
  }, [cacheKey, messages, onMessagesChange]);

  const runPrompt = async (question: string, history: ToolAiMessage[]) => {
    setLoading(true);
    try {
      let fullReply = '';
      await sendChatMessage(
        cacheId,
        question,
        {
          address: context.address,
          chain: context.chain,
          analysisData: JSON.stringify(context.analysisData).slice(0, 20000),
        },
        history,
        undefined,
        (chunk) => {
          fullReply += chunk;
          setStreaming(fullReply);
        },
      );
      setMessages(prev => [...prev, { role: 'assistant', content: fullReply }]);
      setStreaming('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate AI analysis';
      setMessages(prev => [...prev, { role: 'assistant', content: `Failed to generate analysis: ${msg}` }]);
      setStreaming('');
    } finally {
      setLoading(false);
    }
  };

  const handleFollowUp = async () => {
    const question = input.trim();
    if (!question || loading) return;
    setInput('');
    const userMsg: ToolAiMessage = { role: 'user', content: question };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    await runPrompt(question, nextMessages);
  };

  return (
    <div style={{
      border: '1px solid var(--hairline)',
      borderRadius: 'var(--radius-xl)',
      background: 'var(--card)',
      padding: 12,
      minHeight: 260,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--fg)', marginBottom: 8 }}>
        <Sparkles size={14} /> {title}
      </div>
      <div style={{ flex: 1, overflow: 'auto', marginBottom: 8 }}>
        {loading && messages.length === 0 && !streaming && (
          <div style={{ fontSize: 12, color: 'var(--fg-tertiary)' }}>Generating analysis...</div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            {msg.role === 'assistant'
              ? <div style={{ fontSize: 12, color: 'var(--fg)', lineHeight: 1.55 }}><MarkdownContent text={msg.content} /></div>
              : <div style={{ fontSize: 12, color: 'var(--fg-secondary)' }}>{msg.content}</div>}
          </div>
        ))}
        {streaming && <div style={{ fontSize: 12, color: 'var(--fg)', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{streaming}</div>}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') void handleFollowUp(); }}
          placeholder="Ask a follow-up"
          style={{ flex: 1, minWidth: 0, height: 32, borderRadius: 'var(--radius-md)', border: '1px solid var(--hairline)', background: 'var(--bg-secondary)', color: 'var(--fg)', fontSize: 12, padding: '0 10px', outline: 'none' }}
        />
        <button
          onClick={() => void handleFollowUp()}
          disabled={loading || !input.trim()}
          style={{ height: 32, padding: '0 10px', borderRadius: 'var(--radius-md)', border: 'none', background: loading || !input.trim() ? 'var(--hover-overlay)' : 'var(--accent)', color: loading || !input.trim() ? 'var(--fg-tertiary)' : '#000', fontSize: 11, fontWeight: 600, cursor: loading || !input.trim() ? 'default' : 'pointer' }}
        >
          Ask
        </button>
      </div>
    </div>
  );
}
