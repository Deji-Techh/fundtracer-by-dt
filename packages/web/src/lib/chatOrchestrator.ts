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

// ─── READ: load conversation history ──────────────────────────
export async function loadHistory(uid: string, conversationId: string): Promise<ChatMessage[]> {
  console.log('[Cache] loadHistory called for:', conversationId);
  const local = await idb_get(conversationId);
  console.log('[Cache] IndexedDB result:', local ? `got ${local.length} messages` : 'null/empty');

  if (local && local.length > 0) {
    // Always check remote for newer/more messages — IDB may be stale
    // if user navigated away before an async save completed
    try {
      const response = await fetchWithAuth(`${API_BASE}/api/chat/cache?cid=${conversationId}`);
      if (response.ok) {
        const data = await response.json();
        const remote = data.messages || [];
        if (remote.length > local.length) {
          console.log('[Cache] Redis has more messages than IDB, using Redis. IDB:', local.length, 'Redis:', remote.length);
          await idb_save(conversationId, uid, remote);
          return remote;
        }
      }
    } catch {
      // Redis unavailable — fall through to IDB result
    }

    // Even without Redis, try Firestore before trusting IDB
    if (local.length <= 1) {
      try {
        const fsRes = await fetchWithAuth(`${API_BASE}/api/chat/sessions/${conversationId}/messages`);
        if (fsRes.ok) {
          const fsData = await fsRes.json();
          const fsMessages = fsData.messages || [];
          if (fsMessages.length > local.length) {
            console.log('[Cache] Firestore has more messages than IDB. IDB:', local.length, 'FS:', fsMessages.length);
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

    console.log('[Cache] IndexedDB is most complete, returning local messages');
    return local;
  }

  // 2. Check Redis — <1ms (via backend)
  try {
    const response = await fetchWithAuth(`${API_BASE}/api/chat/cache?cid=${conversationId}`);
    if (response.ok) {
      const data = await response.json();
      if (data.messages && data.messages.length > 0) {
        console.log('[Cache] Redis hit');
        await idb_save(conversationId, uid, data.messages);
        return data.messages;
      }
    }
  } catch (error) {
    console.log('[Cache] Redis miss:', error);
  }

  // 3. Firestore fallback — 50-200ms
  console.log('[Cache] Firestore fallback');
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

// ─── WRITE: save a message to all three layers ─────────────────
export async function saveMessage(uid: string, conversationId: string, role: 'user' | 'assistant', content: string): Promise<void> {
  console.log('[Orchestrator] saveMessage called:', { uid, conversationId, role, contentLength: content.length });
  const message: ChatMessage = { role, content, timestamp: Date.now() };

  // 1. IndexedDB — instant, no network (do this FIRST for UI speed)
  try {
    await idb_append(conversationId, message);
    console.log('[Orchestrator] IndexedDB saved');
  } catch (err) {
    console.error('[Orchestrator] IndexedDB failed:', err);
  }

  // 2. Redis — fire and forget (via backend)
  fetchWithAuth(`${API_BASE}/api/chat/message`, {
    method: 'POST',
    body: JSON.stringify({ conversationId, role, content }),
  })
    .then(() => console.log('[Orchestrator] Redis saved'))
    .catch(err => console.error('[Orchestrator] Redis save error:', err));

  // 3. Firestore — fire and forget
  fetchWithAuth(`${API_BASE}/api/chat/sessions/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ role, content, timestamp: Date.now() }),
  })
    .then(() => console.log('[Orchestrator] Firestore saved'))
    .catch(err => console.error('[Orchestrator] Firestore save error:', err));
}

// ─── CREATE: create new conversation ──────────────────────────
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