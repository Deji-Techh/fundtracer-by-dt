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
  baseURL: import.meta.env.VITE_QVAC_URL || 'https://fundtracer-qvac-production.up.railway.app',
  apiKey: import.meta.env.VITE_QVAC_API_KEY || 'fundtracer-ai-key',
  model: import.meta.env.VITE_QVAC_MODEL || 'fundtracer-llm',
};

export function useQVAC(customConfig?: Partial<QVACConfig>) {
  const [config, setConfig] = useState<QVACConfig>({ ...DEFAULT_CONFIG, ...customConfig });
  const [messages, setMessagesState] = useState<QVACMessage[]>([]);
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
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const baseURL = config.baseURL.replace(/\/v1\/chat\/completions$/, '').replace(/\/v1$/, '');
      const response = await fetch(`${baseURL}/v1/models`, {
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
      // Ensure baseURL doesn't have trailing /v1/chat/completions
      const baseURL = config.baseURL.replace(/\/v1\/chat\/completions$/, '').replace(/\/v1$/, '');
      const response = await fetch(`${baseURL}/v1/chat/completions`, {
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
      let rawContent = data.choices?.[0]?.message?.content || 'No response generated';
      // Remove thinking tokens: hex format like <0x09>answer<0x09> or literal like<think>Answer<\/thought>
      const cleanContent = rawContent
        .replace(/<0x[0-9a-fA-F]+>.*?<0x[0-9a-fA-F]+>/g, '')
        .replace(/<think>[\s\S]*?<\/thought>/g, '')
        .replace(/<think>/gi, '')
        .replace(/<\/thought>/gi, '')
        .trim();
      const assistantMessage: QVACMessage = {
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
      
      const errorMsg: QVACMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Error: ${errorMessage}. Make sure the QVAC server is running.`,
        timestamp: Date.now(),
      };
      
      setMessagesState(prev => [...prev, userMessage, errorMsg]);
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
      // Ensure baseURL doesn't have trailing /v1/chat/completions
      const baseURL = config.baseURL.replace(/\/v1\/chat\/completions$/, '').replace(/\/v1$/, '');
      const response = await fetch(`${baseURL}/v1/chat/completions`, {
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
          max_tokens: 150,
        }),
      });

      if (!response.ok) {
        throw new Error(`QVAC server error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      let assistantContent = '';
      const decoder = new TextDecoder();
      let thinkingBuffer = '';
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
            let delta = parsed.choices?.[0]?.delta?.content || '';
            if (delta) {
              // Filter thinking tokens
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

      // If onChunk was provided, caller handles messages - just return
      if (onChunk) {
        setIsLoading(false);
        return assistantMessage;
      }

      // Clean the full response if not streaming
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

  const handleSetMessages = useCallback((updater: QVACMessage[] | ((prev: QVACMessage[]) => QVACMessage[])) => {
    if (typeof updater === 'function') {
      setMessagesState(updater as (prev: QVACMessage[]) => QVACMessage[]);
    } else {
      setMessagesState(updater);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessagesState([]);
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