import { useState, useEffect, useCallback } from 'react';

export interface QVACMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface QVACConfig {
  baseURL: string;
  apiKey: string;
  model: string;
}

const DEFAULT_CONFIG: QVACConfig = {
  baseURL: import.meta.env.VITE_QVAC_URL || 'http://127.0.0.1:11434/v1',
  apiKey: import.meta.env.VITE_QVAC_API_KEY || 'fundtracer-ai-key',
  model: import.meta.env.VITE_QVAC_MODEL || 'fundtracer-llm',
};

export function useQVAC(customConfig?: Partial<QVACConfig>) {
  const [config, setConfig] = useState<QVACConfig>({ ...DEFAULT_CONFIG, ...customConfig });
  const [messages, setMessages] = useState<QVACMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isServerReady, setIsServerReady] = useState(false);

  const SYSTEM_PROMPT = `You are FundTracer AI, a blockchain forensics expert. 
Your role is to analyze wallet addresses and generate plain-English risk reports.
You have access to the user's scan history and cached wallet data.
Always be precise, actionable, and security-focused.
Never provide financial advice - focus on risk assessment and pattern detection.`;

  const checkServerStatus = useCallback(async () => {
    if (typeof window === 'undefined') return false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const response = await fetch(`${config.baseURL}/models`, {
        method: 'GET',
        signal: controller.signal,
        headers: config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {},
      });
      clearTimeout(timeoutId);
      setIsServerReady(response.ok);
      return response.ok;
    } catch {
      setIsServerReady(false);
      return false;
    }
  }, [config.baseURL, config.apiKey]);

  const sendMessage = useCallback(async (content: string, walletContext?: string) => {
    setIsLoading(true);
    setError(null);

    const userMessage: QVACMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    let fullContent = content;
    if (walletContext) {
      fullContent = `Wallet Data:\n${walletContext}\n\nUser Question: ${content}`;
    }

    const conversationMessages: QVACMessage[] = [
      { id: 'system', role: 'system', content: SYSTEM_PROMPT, timestamp: 0 },
      ...messages,
      userMessage,
    ];

    try {
      const response = await fetch(`${config.baseURL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
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
        throw new Error(`QVAC server error: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage: QVACMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.choices?.[0]?.message?.content || 'No response generated',
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, userMessage, assistantMessage]);
      return assistantMessage;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get response';
      setError(errorMessage);
      
      const errorMsg: QVACMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Error: ${errorMessage}. Make sure the QVAC server is running.`,
        timestamp: Date.now(),
      };
      
      setMessages(prev => [...prev, userMessage, errorMsg]);
      return errorMsg;
    } finally {
      setIsLoading(false);
    }
  }, [config, messages]);

  const streamMessage = useCallback(async (content: string, walletContext?: string, onChunk?: (chunk: string) => void) => {
    setIsLoading(true);
    setError(null);

    const userMessage: QVACMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    let fullContent = content;
    if (walletContext) {
      fullContent = `Wallet Data:\n${walletContext}\n\nUser Question: ${content}`;
    }

    const conversationMessages: QVACMessage[] = [
      { id: 'system', role: 'system', content: SYSTEM_PROMPT, timestamp: 0 },
      ...messages,
      userMessage,
    ];

    try {
      const response = await fetch(`${config.baseURL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: config.model,
          messages: conversationMessages.map(m => ({ role: m.role, content: m.content })),
          stream: true,
          temperature: 0.7,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        throw new Error(`QVAC server error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      let assistantContent = '';
      const decoder = new TextDecoder();
      const assistantMessage: QVACMessage = {
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
            const delta = parsed.choices?.[0]?.delta?.content || '';
            if (delta) {
              assistantContent += delta;
              onChunk?.(delta);
            }
          } catch {}
        }
      }

      assistantMessage.content = assistantContent;
      setMessages(prev => [...prev, userMessage, assistantMessage]);
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

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  useEffect(() => {
    checkServerStatus();
    const interval = setInterval(checkServerStatus, 30000);
    return () => clearInterval(interval);
  }, [checkServerStatus]);

  return {
    config,
    setConfig,
    messages,
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