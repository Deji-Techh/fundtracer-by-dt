import { idb_get, idb_save, idb_append } from './chatCache.client';
import { API_BASE, getAuthToken } from '../api';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };
  
  return fetch(url, { ...options, headers });
}

export async function loadHistory(uid: string, conversationId: string): Promise<ChatMessage[]> {
  const local = await idb_get(conversationId);

  if (local && local.length > 0) {
    try {
      const response = await fetchWithAuth(`${API_BASE}/api/chat/cache?cid=${conversationId}`);
      if (response.ok) {
        const data = await response.json();
        const remote = data.messages || [];
        if (remote.length > local.length) {
          await idb_save(conversationId, uid, remote);
          return remote;
        }
      }
    } catch {
      // Redis unavailable — fall through to IDB result
    }

    if (local.length <= 1) {
      try {
        const fsRes = await fetchWithAuth(`${API_BASE}/api/chat/sessions/${conversationId}/messages`);
        if (fsRes.ok) {
          const fsData = await fsRes.json();
          const fsMessages = fsData.messages || [];
          if (fsMessages.length > local.length) {
            await idb_save(conversationId, uid, fsMessages);
            fetchWithAuth(`${API_BASE}/api/chat/cache`, {
              method: 'POST',
              body: JSON.stringify({ conversationId, messages: fsMessages }),
            });
            return fsMessages;
          }
        }
      } catch {
        // Firestore unavailable — fall through
      }
    }

    return local;
  }

  try {
    const response = await fetchWithAuth(`${API_BASE}/api/chat/cache?cid=${conversationId}`);
    if (response.ok) {
      const data = await response.json();
      if (data.messages && data.messages.length > 0) {
        await idb_save(conversationId, uid, data.messages);
        return data.messages;
      }
    }
  } catch (error) {
    // Redis miss
  }

  try {
    const response = await fetchWithAuth(`${API_BASE}/api/chat/sessions/${conversationId}/messages`);
    if (response.ok) {
      const data = await response.json();
      const messages = data.messages || [];
      await idb_save(conversationId, uid, messages);
      fetchWithAuth(`${API_BASE}/api/chat/cache`, {
        method: 'POST',
        body: JSON.stringify({ conversationId, messages }),
      });
      return messages;
    }
  } catch (error) {
    console.error('[Cache] Firestore error:', error);
  }

  return [];
}

export async function saveMessage(uid: string, conversationId: string, role: 'user' | 'assistant', content: string): Promise<void> {
  const message: ChatMessage = { role, content, timestamp: Date.now() };

  try {
    await idb_append(conversationId, message);
  } catch (err) {
    console.error('[Orchestrator] IndexedDB failed:', err);
  }

  fetchWithAuth(`${API_BASE}/api/chat/message`, {
    method: 'POST',
    body: JSON.stringify({ conversationId, role, content }),
  }).catch(err => console.error('[Orchestrator] Redis save error:', err));

  fetchWithAuth(`${API_BASE}/api/chat/sessions/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ role, content, timestamp: Date.now() }),
  }).catch(err => console.error('[Orchestrator] Firestore save error:', err));
}

export async function createConversation(uid: string, title: string = 'New Chat'): Promise<string | null> {
  try {
    const response = await fetchWithAuth(`${API_BASE}/api/chat/sessions`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.session?.id || null;
    }
  } catch (error) {
    console.error('[Cache] Create conversation error:', error);
  }
  return null;
}
