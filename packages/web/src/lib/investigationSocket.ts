// ============================================================
// Investigation Room WebSocket Client
// Real-time messaging, typing indicators, presence
// Fallback to REST polling
// ============================================================

import { getAuthToken, API_BASE } from '../api';

type EventHandler = (data: any) => void;

interface SocketState {
  ws: WebSocket | null;
  roomId: string | null;
  uid: string | null;
  connected: boolean;
  reconnectAttempts: number;
  maxReconnectDelay: number;
  listeners: Map<string, Set<EventHandler>>;
  fallbackInterval: ReturnType<typeof setInterval> | null;
  lastMessageId: string | null;
}

const state: SocketState = {
  ws: null,
  roomId: null,
  uid: null,
  connected: false,
  reconnectAttempts: 0,
  maxReconnectDelay: 30000,
  listeners: new Map(),
  fallbackInterval: null,
  lastMessageId: null,
};

function getWsUrl(roomId: string): string {
  const token = getAuthToken();
  const base = API_BASE.replace(/^https?/, (m) => m === 'https' ? 'wss' : 'ws');
  return `${base}/ws?token=${encodeURIComponent(token || '')}&roomId=${encodeURIComponent(roomId)}`;
}

export function connect(roomId: string) {
  if (state.ws && state.roomId === roomId && state.ws.readyState === WebSocket.OPEN) return;

  disconnect();

  state.roomId = roomId;
  state.reconnectAttempts = 0;

  tryConnect(roomId);
}

function tryConnect(roomId: string) {
  try {
    const url = getWsUrl(roomId);
    console.log('[WS] Connecting to:', url.replace(/token=[^&]+/, 'token=***'));
    const ws = new WebSocket(url);
    state.ws = ws;

    ws.onopen = () => {
      state.connected = true;
      state.reconnectAttempts = 0;
      console.log('[WS] Connected to room', roomId);
      emit('connected', { roomId });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Track last message ID for catchup on reconnect
        if (data.type === 'message' && data.message?.id) {
          state.lastMessageId = data.message.id;
        }
        emit(data.type, data);
      } catch {
        // ignore malformed
      }
    };

    ws.onclose = (event) => {
      state.connected = false;
      console.log('[WS] Disconnected (code:', event.code, ') reconnecting...');
      emit('disconnected', { roomId });
      scheduleReconnect(roomId);
    };

    ws.onerror = (err) => {
      state.connected = false;
      console.error('[WS] Connection error');
      // ws.onclose will fire next
    };
  } catch (err) {
    console.error('[WS] Failed to create WebSocket:', err);
    scheduleReconnect(roomId);
  }
}

function scheduleReconnect(roomId: string) {
  if (state.reconnectAttempts >= 10) {
    // Switch to REST polling fallback
    console.log('[WS] Max reconnects reached, starting REST polling fallback');
    startPolling(roomId);
    return;
  }

  emit('reconnecting', { roomId, attempt: state.reconnectAttempts + 1 });

  const delay = Math.min(1000 * Math.pow(2, state.reconnectAttempts), state.maxReconnectDelay);
  state.reconnectAttempts++;
  console.log(`[WS] Reconnecting in ${delay}ms (attempt ${state.reconnectAttempts})`);
  setTimeout(() => {
    if (state.roomId === roomId) tryConnect(roomId);
  }, delay);
}

/** Fetch missed messages since last known ID — called after reconnect */
export async function catchUpMissedMessages(roomId: string): Promise<any[]> {
  if (!state.lastMessageId) return [];
  try {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE}/api/rooms/${roomId}/messages?limit=50`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const missed = (data.messages || []).filter((m: any) => {
      // Get messages after our last known message
      if (!state.lastMessageId) return true;
      // Firestore IDs are time-ordered; compare creation timestamps
      return m.createdAt > 0 && state.lastMessageId && m.id > state.lastMessageId;
    });
    if (missed.length > 0) {
      console.log(`[WS] Caught up ${missed.length} missed messages after reconnect`);
      for (const msg of missed) {
        emit('message', { message: msg });
      }
      // Update last known ID
      const last = missed[missed.length - 1];
      if (last?.id) state.lastMessageId = last.id;
    }
    return missed;
  } catch (err) {
    console.error('[WS] Failed to catch up missed messages:', err);
    return [];
  }
}

function startPolling(roomId: string) {
  if (state.fallbackInterval) return;

  let lastMessageId: string | null = null;

  state.fallbackInterval = setInterval(async () => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/api/rooms/${roomId}/messages?limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.messages?.length) {
          const newMsgs = lastMessageId
            ? data.messages.filter((m: any) => m.id > lastMessageId!)
            : data.messages;
          for (const msg of newMsgs) {
            emit('message', { message: msg });
          }
          lastMessageId = data.messages[data.messages.length - 1].id;
        }
      }
    } catch {
      // polling failed — retry next interval
    }
  }, 5000);
}

export function disconnect() {
  if (state.fallbackInterval) {
    clearInterval(state.fallbackInterval);
    state.fallbackInterval = null;
  }
  if (state.ws) {
    state.ws.close();
    state.ws = null;
  }
  state.connected = false;
  state.roomId = null;
  state.reconnectAttempts = 0;
}

export function sendTypingStart() {
  send({ type: 'typing_start' });
}

export function sendTypingStop() {
  send({ type: 'typing_stop' });
}

function send(data: any) {
  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify(data));
  }
}

export function on(event: string, handler: EventHandler) {
  if (!state.listeners.has(event)) state.listeners.set(event, new Set());
  state.listeners.get(event)!.add(handler);
  return () => {
    state.listeners.get(event)?.delete(handler);
  };
}

function emit(event: string, data: any) {
  state.listeners.get(event)?.forEach(h => h(data));
}

export function isConnected(): boolean {
  return state.connected;
}
