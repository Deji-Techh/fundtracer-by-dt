import { apiRequest, getAuthToken } from './client';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.fundtracer.xyz';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
  attachment?: { name: string; type: string; size: number };
}

export interface ChatSession {
  id: string;
  title?: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export async function sendChatMessage(
  sessionId: string | null,
  message: string,
  context?: { address?: string; chain?: string; analysisData?: string },
  history?: ChatMessage[],
  attachedFiles?: Array<{ name: string; content: string }>,
  onChunk?: (chunk: string) => void,
): Promise<{ reply: string }> {
  const token = getAuthToken();
  const apiKey = (() => { try { return localStorage.getItem('fdt_api_key'); } catch { return null; } })();

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  } else if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const body: Record<string, unknown> = {
    question: message,
    history: (history || []).map(m => ({ role: m.role, content: m.content })),
  };

  if (attachedFiles && attachedFiles.length > 0) {
    body.attachedFiles = attachedFiles;
  }

  if (context?.address) {
    body.address = context.address;
    body.addressType = 'wallet';
    body.chain = context.chain || 'ethereum';
  }
  if (context?.analysisData) {
    body.analysisData = context.analysisData;
  }

  const response = await fetch(`${API_BASE}/api/ai-chat/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Chat request failed' }));
    throw new Error(err.error || err.message || 'Chat request failed');
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response stream');

  const decoder = new TextDecoder();
  let fullReply = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') continue;

      try {
        const event = JSON.parse(data);
        if (event.type === 'chunk' && event.content) {
          fullReply += event.content;
          onChunk?.(event.content);
        } else if (event.type === 'error') {
          throw new Error(event.message || 'AI response failed');
        }
      } catch (err) {
        if (err instanceof Error && err.message !== 'AI response failed') continue;
        throw err;
      }
    }
  }

  if (!fullReply) throw new Error('No response from AI');
  return { reply: fullReply };
}

export async function getChatSessions(): Promise<ChatSession[]> {
  const data = await apiRequest<{ sessions: ChatSession[] }>('/api/ai-chat/sessions');
  return data.sessions || [];
}

export async function getChatSession(id: string): Promise<ChatSession> {
  const data = await apiRequest<{ session: ChatSession }>(`/api/ai-chat/sessions/${id}`);
  return data.session!;
}

export async function deleteChatSession(id: string): Promise<void> {
  return apiRequest(`/api/ai-chat/sessions/${id}`, 'DELETE');
}

export async function createChatSession(title: string, messages: ChatMessage[]): Promise<ChatSession> {
  const data = await apiRequest<{ session: ChatSession }>('/api/ai-chat/sessions', 'POST', { title, messages });
  return data.session!;
}

export async function updateChatSession(id: string, title?: string, messages?: ChatMessage[]): Promise<ChatSession> {
  const data = await apiRequest<{ session: ChatSession }>(`/api/ai-chat/sessions/${id}`, 'PUT', { title, messages });
  return data.session!;
}
