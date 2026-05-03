import { useState, useEffect, useCallback } from 'react';

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface AIConfig {
  apiKey: string;
  model: string;
}

const DEFAULT_CONFIG: AIConfig = {
  apiKey: import.meta.env.VITE_GROQ_API_KEY || '',
  model: 'llama-3.3-70b-versatile',
};

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

export function useAIChat(customConfig?: Partial<AIConfig>) {
  const [config, setConfig] = useState<AIConfig>({ ...DEFAULT_CONFIG, ...customConfig });
  const [messages, setMessagesState] = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isServerReady, setIsServerReady] = useState(false);

  const SYSTEM_PROMPT = `You are FundTracer AI, a blockchain forensics expert. 
Your role is to analyze wallet addresses and generate plain-English risk reports.
NEVER show thinking. NEVER use tags like <thought>. NEVER be verbose.
Always reply in 2-3 sentences MAXIMUM.
Be PRECISE, ACTIONABLE, and SECURITY-FOCUSED.
NEVER provide financial advice - focus on risk assessment.
Output ONLY your answer. No prefixes. No formatting.`;

  const checkServerStatus = useCallback(async () => {
    if (typeof window === 'undefined') return false;
    if (!config.apiKey) {
      setIsServerReady(false);
      return false;
    }
    setIsServerReady(true);
    return true;
  }, [config.apiKey]);

  const sendMessage = useCallback(async (content: string, walletContext?: string) => {
    if (!config.apiKey) {
      setError('GROQ_API_KEY not configured');
      return null;
    }

    setIsLoading(true);
    setError(null);

    const userMessage: AIMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    let fullContent = content;
    if (walletContext) {
      fullContent = `Wallet Data:\n${walletContext}\n\nUser Question: ${content}`;
    }

    const conversationMessages: AIMessage[] = [
      { id: 'system', role: 'system', content: SYSTEM_PROMPT, timestamp: 0 },
      ...messages,
      userMessage,
    ];

    try {
      const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: conversationMessages.map(m => ({ role: m.role, content: m.content })),
          stream: false,
          temperature: 0.7,
          max_tokens: 150,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Groq API error: ${response.status}`);
      }

      const data = await response.json();
      let rawContent = data.choices?.[0]?.message?.content || 'No response generated';
      
      const cleanContent = rawContent
        .replace(/<0x[0-9a-fA-F]+>.*?<0x[0-9a-fA-F]+>/g, '')
        .replace(/<think>[\s\S]*?<\/thought>/g, '')
        .replace(/<think>/gi, '')
        .replace(/<\/thought>/gi, '')
        .trim();

      const assistantMessage: AIMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: cleanContent || 'No response generated',
        timestamp: Date.now(),
      };

      setMessagesState(prev => [...prev, userMessage, assistantMessage]);
      return assistantMessage;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get response';
      setError(errorMessage);
      
      const errorMsg: AIMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Error: ${errorMessage}. Please check your GROQ_API_KEY configuration.`,
        timestamp: Date.now(),
      };
      
      setMessagesState(prev => [...prev, userMessage, errorMsg]);
      return errorMsg;
    } finally {
      setIsLoading(false);
    }
  }, [config, messages]);

  const streamMessage = useCallback(async (
    content: string, 
    walletContext?: string, 
    onChunk?: (chunk: string) => void
  ) => {
    if (!config.apiKey) {
      setError('GROQ_API_KEY not configured');
      throw new Error('GROQ_API_KEY not configured');
    }

    setIsLoading(true);
    setError(null);

    const userMessage: AIMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    let fullContent = content;
    if (walletContext) {
      fullContent = `Wallet Data:\n${walletContext}\n\nUser Question: ${content}`;
    }

    const conversationMessages: AIMessage[] = [
      { id: 'system', role: 'system', content: SYSTEM_PROMPT, timestamp: 0 },
      ...messages,
      userMessage,
    ];

    try {
      const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: conversationMessages.map(m => ({ role: m.role, content: m.content })),
          stream: true,
          temperature: 0.7,
          max_tokens: 150,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Groq API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      let assistantContent = '';
      const decoder = new TextDecoder();
      const assistantMessage: AIMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      };

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
            let delta = parsed.choices?.[0]?.delta?.content || '';
            if (delta) {
              delta = delta
                .replace(/<0x[0-9a-fA-F]+>.*?<0x[0-9a-fA-F]+>/g, '')
                .replace(/<think>[\s\S]*?<\/thought>/g, '')
                .replace(/<think>/gi, '')
                .replace(/<\/thought>/gi, '');
              if (delta) {
                assistantContent += delta;
                onChunk?.(delta);
              }
            }
          } catch {}
        }
      }

      if (onChunk) {
        setIsLoading(false);
        return assistantMessage;
      }

      assistantMessage.content = assistantContent
        .replace(/<0x[0-9a-fA-F]+>.*?<0x[0-9a-fA-F]+>/g, '')
        .replace(/<think>[\s\S]*?<\/thought>/g, '')
        .replace(/<think>/gi, '')
        .replace(/<\/thought>/gi, '')
        .trim();

      setMessagesState(prev => [...prev, userMessage, assistantMessage]);
      return assistantMessage;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get response';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [config, messages]);

  const generateReport = useCallback(async (walletData: {
    address: string;
    chain: string;
    balance?: string;
    txCount?: number;
    riskScore?: number;
    tags?: string[];
    fundingSources?: string[];
    recentActivity?: string;
  }) => {
    const context = `
Wallet Address: ${walletData.address}
Chain: ${walletData.chain}
Balance: ${walletData.balance || 'Unknown'}
Transactions: ${walletData.txCount || 'Unknown'}
Risk Score: ${walletData.riskScore || 'Unknown'}
Tags: ${walletData.tags?.join(', ') || 'None'}
Funding Sources: ${walletData.fundingSources?.join(', ') || 'None'}
Recent Activity: ${walletData.recentActivity || 'Unknown'}

Generate a comprehensive risk assessment report. Include:
1. Overall risk level (Low/Medium/High)
2. Key findings
3. Behavioral patterns detected
4. Recommendations
`;

    return sendMessage('Generate a wallet risk report based on the following data:', context);
  }, [sendMessage]);

  const handleSetMessages = useCallback((updater: AIMessage[] | ((prev: AIMessage[]) => AIMessage[])) => {
    if (typeof updater === 'function') {
      setMessagesState(updater as (prev: AIMessage[]) => AIMessage[]);
    } else {
      setMessagesState(updater);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessagesState([]);
  }, []);

  useEffect(() => {
    checkServerStatus();
  }, [checkServerStatus]);

  return {
    config,
    setConfig,
    messages,
    setMessages: handleSetMessages,
    isLoading,
    error,
    isServerReady,
    sendMessage,
    streamMessage,
    generateReport,
    clearMessages,
    checkServerStatus,
  };
}
