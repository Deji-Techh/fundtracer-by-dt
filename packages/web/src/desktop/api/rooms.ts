import { apiRequest, getAuthToken } from './client';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.fundtracer.xyz';

// ---------------------------------------------------------------------------
// WebSocket for real-time room messages
// ---------------------------------------------------------------------------
type WSHandler = (data: any) => void;

let ws: WebSocket | null = null;
let wsRoomId: string | null = null;
const handlers = new Map<string, Set<WSHandler>>();

function getWsUrl(roomId: string): string {
  const token = getAuthToken();
  const base = API_BASE.replace(/^https?/, (m) => m === 'https' ? 'wss' : 'ws');
  return `${base}/ws?token=${encodeURIComponent(token || '')}&roomId=${encodeURIComponent(roomId)}`;
}

export function connectRoomSocket(roomId: string) {
  if (ws && wsRoomId === roomId && ws.readyState === WebSocket.OPEN) return;

  disconnectRoomSocket();

  try {
    wsRoomId = roomId;
    ws = new WebSocket(getWsUrl(roomId));

    ws.onopen = () => {
      emit('connected', { roomId });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type) emit(data.type, data);
        emit('message', data);
      } catch {}
    };

    ws.onclose = () => {
      emit('disconnected', { roomId });
      ws = null;
      wsRoomId = null;
    };

    ws.onerror = () => {
      // ws.onclose will fire next
    };
  } catch {}
}

export function disconnectRoomSocket() {
  if (ws) {
    ws.onclose = null;
    ws.onmessage = null;
    ws.close();
    ws = null;
    wsRoomId = null;
  }
}

export function onRoomEvent(event: string, handler: WSHandler): () => void {
  if (!handlers.has(event)) handlers.set(event, new Set());
  handlers.get(event)!.add(handler);
  return () => { handlers.get(event)?.delete(handler); };
}

export function sendWsEvent(data: object) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function emit(event: string, data: any) {
  handlers.get(event)?.forEach(fn => fn(data));
}

export interface InvestigationRoom {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  memberCount?: number;
  members: Array<{ uid: string; displayName: string; profilePicture?: string; role?: 'owner' | 'admin' | 'member' }>;
  inviteCode?: string;
  createdAt: number;
  updatedAt: number;
}

export interface RoomMessage {
  id: string;
  roomId: string;
  sender: { uid: string; displayName: string; profilePicture?: string };
  content: string;
  timestamp: number;
  type?: 'message' | 'scan' | 'system' | 'ai-response';
  scanResult?: unknown;
}

/** Normalize server message format (senderId/senderName) to client format (sender object). */
export function normalizeMessage(raw: any): RoomMessage {
  return {
    id: raw.id,
    roomId: raw.roomId,
    sender: raw.sender
      ? { uid: raw.sender.uid || '', displayName: raw.sender.displayName || 'Unknown', profilePicture: raw.sender.profilePicture }
      : { uid: raw.senderId || '', displayName: raw.senderName || 'Unknown', profilePicture: raw.senderPhotoURL },
    content: raw.content || '',
    timestamp: raw.createdAt || raw.timestamp || Date.now(),
    type: raw.type || raw.contentType || 'message',
    scanResult: raw.scanResult,
  };
}

export async function getRooms(): Promise<InvestigationRoom[]> {
  const data = await apiRequest<{ success: boolean; rooms: InvestigationRoom[] }>('/api/rooms');
  return data.rooms || [];
}

export async function getRoom(id: string): Promise<InvestigationRoom> {
  const data = await apiRequest<{ success: boolean; room: InvestigationRoom }>(`/api/rooms/${id}`);
  return data.room!;
}

export async function createRoom(name: string, description?: string): Promise<InvestigationRoom> {
  const data = await apiRequest<{ success: boolean; room: InvestigationRoom }>('/api/rooms', 'POST', { name, description });
  return data.room!;
}

export async function getRoomMessages(roomId: string, limit = 50): Promise<RoomMessage[]> {
  const data = await apiRequest<{ success: boolean; messages: any[] }>(`/api/rooms/${roomId}/messages?limit=${limit}`);
  return (data.messages || []).map(normalizeMessage);
}

export async function sendRoomMessage(roomId: string, content: string, type?: string): Promise<RoomMessage> {
  const data = await apiRequest<{ success: boolean; message: any }>(`/api/rooms/${roomId}/messages`, 'POST', { content, type });
  return normalizeMessage(data.message);
}

export async function sendAiResponse(roomId: string, content: string): Promise<RoomMessage> {
  const data = await apiRequest<{ success: boolean; message: any }>(`/api/rooms/${roomId}/ai-response`, 'POST', { content });
  return normalizeMessage(data.message);
}

export async function inviteToRoom(roomId: string, uid: string): Promise<{ inviteCode: string; url: string }> {
  const data = await apiRequest<{ success: boolean; inviteCode: string; url: string }>(`/api/rooms/${roomId}/invite`, 'POST', {});
  return { inviteCode: data.inviteCode!, url: data.url! };
}

export async function updateRoom(roomId: string, updates: { name?: string; description?: string }): Promise<void> {
  return apiRequest(`/api/rooms/${roomId}`, 'PATCH', updates);
}

export async function deleteRoom(roomId: string): Promise<void> {
  return apiRequest(`/api/rooms/${roomId}`, 'DELETE');
}

export async function leaveRoom(roomId: string): Promise<void> {
  return apiRequest(`/api/rooms/${roomId}/leave`, 'POST');
}

export async function lookupInvite(code: string): Promise<{ roomId: string; roomName: string; createdBy: string; expiresAt: number }> {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.fundtracer.xyz';
  const res = await fetch(`${API_BASE_URL}/api/invites/${encodeURIComponent(code)}`);
  if (!res.ok) {
    const d = await res.json().catch(() => ({ error: 'Invalid invite' }));
    throw new Error(d.error || 'Invalid invite code');
  }
  const data = await res.json();
  return data.invite;
}

export async function joinRoom(roomId: string, inviteCode?: string): Promise<void> {
  return apiRequest(`/api/rooms/${roomId}/join`, 'POST', { inviteCode });
}

export async function removeRoomMember(roomId: string, uid: string): Promise<void> {
  return apiRequest(`/api/rooms/${roomId}/members/${uid}`, 'DELETE');
}
