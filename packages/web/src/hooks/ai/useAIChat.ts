import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../../api';

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

// Detect EVM addresses (0x... on eth, arbitrum, optimism, polygon, etc.)
const EVM_ADDRESS_REGEX = /0x[a-fA-F0-9]{40}/g;
// Solana addresses (base58, 32-44 chars)
const SOLANA_ADDRESS_REGEX = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;

export function detectAddress(text: string): { address: string; chain?: string } | null {
  // Try EVM first
  const evmMatch = text.match(EVM_ADDRESS_REGEX);
  if (evmMatch) {
    return { address: evmMatch[0] };
  }
  // Try Solana
  const solMatch = text.match(SOLANA_ADDRESS_REGEX);
  if (solMatch) {
    return { address: solMatch[0] };
  }
  return null;
}

export function useAIChat(customConfig?: Partial<AIConfig>) {
  const [config, setConfig] = useState<AIConfig>({ ...DEFAULT_CONFIG, ...customConfig });
  const [messages, setMessagesState] = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isServerReady, setIsServerReady] = useState(false);

  const SYSTEM_PROMPT = `You are FundTracer AI, a blockchain forensics expert.

CRITICAL RULES:
1. NEVER fabricate, infer, or guess risk assessments, tags, or activities.
2. Only report information that is explicitly provided in the data given to you.
3. If no analysis data is provided for a wallet, respond: "I don't have analysis data for this wallet. Please scan it first on FundTracer."
4. When data IS provided, use ONLY the values from that data (riskScore, tags, balance, txCount, etc.)
5. NEVER assume a wallet is "risky" or "suspicious" unless the provided data shows that.
6. NEVER mention darknet markets, phishing, scams, or illegal activities unless explicitly in the provided data.

RESPONSE STYLE:
- Always reply in 2-3 sentences MAXIMUM.
- Be PRECISE, ACTIONABLE, and SECURITY-FOCUSED.
- NEVER provide financial advice - focus on risk assessment.
- Output ONLY your answer. No prefixes. No formatting.`;

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

  // Analyze a wallet and return real data
  const analyzeWallet = useCallback(async (address: string, chain: string = 'ethereum') => {
    try {
      const res = await apiRequest('/api/analyze/wallet', 'POST', { address, chain }) as Response;
      const data = await res.json();
      if (data.success && data.result) {
        return data.result;
      }
      return null;
    } catch (err) {
      console.error('AI analyze error:', err);
      return null;
    }
  }, []);

  // Check message for addresses and auto-analyze if needed
  const extractWalletDataFromMessage = useCallback(async (content: string): Promise<string | null> => {
    const detected = detectAddress(content);
    if (!detected) return null;
    
    // Try to analyze this wallet
    const result = await analyzeWallet(detected.address, 'ethereum');
    if (result) {
      return `
Wallet: ${result.address || detected.address}
Chain: ethereum
Risk Score: ${result.riskScore ?? 'N/A'}
Risk Level: ${result.riskLevel ?? 'Unknown'}
Total Transactions: ${result.totalTransactions ?? 'N/A'}
Total Received: ${result.totalReceived ?? 'N/A'}
Total Sent: ${result.totalSent ?? 'N/A'}
Unique Addresses: ${result.uniqueAddresses ?? 'N/A'}
Activity Period: ${result.activityPeriodDays ?? 'N/A'} days
Tags: ${result.tags?.join(', ') || 'None'}
Funding Sources: ${result.fundingSources?.join(', ') || 'None'}
Top Destinations: ${result.topDestinations?.join(', ') || 'None'}
      `.trim();
    }
    return null;
  }, [analyzeWallet]);

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
    analyzeWallet,
    extractWalletDataFromMessage,
    detectAddress,
  };
}
