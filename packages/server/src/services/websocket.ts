// ============================================================
// Investigation Room WebSocket Server
// Real-time messaging, typing indicators, presence
// ============================================================

import { Server } from 'http';
import jwt from 'jsonwebtoken';
import type { WebSocketServer as WSS_Server, WebSocket as WSS_Socket } from 'ws';

// Use require to avoid esbuild CJS interop issues with ws package
const WebSocketLib = require('ws') as typeof import('ws');
const { WebSocketServer } = WebSocketLib;
const { WebSocket } = WebSocketLib;
import { getFirestore } from '../firebase.js';

interface WSClient {
  ws: WebSocket;
  uid: string;
  roomId: string;
  displayName: string;
}

const rooms = new Map<string, Set<WSClient>>();
const TYPING_DEBOUNCE = 3000; // 3 sec per user
const typingTimers = new Map<string, number>();

let wssInstance: InvestigationWSS | null = null;

export function getWSS(): InvestigationWSS | null {
  return wssInstance;
}

function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'dev-secret-key-change-in-prod';
}

function getCookieValue(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [rawName, ...rawValue] = part.trim().split('=');
    if (rawName === name) {
      return decodeURIComponent(rawValue.join('='));
    }
  }
  return undefined;
}

export class InvestigationWSS {
  private wss: WebSocketServer;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.wss.on('connection', (ws, req) => this.handleConnection(ws, req));
    this.startHeartbeat();
    wssInstance = this;
    console.log('[WS] Investigation WebSocket server started on /ws');
  }

  private async handleConnection(ws: WebSocket, req: any) {
    try {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const token = url.searchParams.get('token') || getCookieValue(req.headers.cookie, 'fundtracer_session');
      const roomId = url.searchParams.get('roomId');

      if (!token) {
        ws.close(4001, 'Missing token');
        return;
      }

      // Validate JWT
      let decoded: any;
      try {
        decoded = jwt.verify(token, getJwtSecret());
      } catch {
        ws.close(4001, 'Invalid token');
        return;
      }

      const uid = decoded.uid || decoded.address || decoded.sub;
      if (!uid) {
        ws.close(4001, 'Invalid token payload');
        return;
      }

      // Watchtower connection (type=watchtower)
      if (url.searchParams.get('type') === 'watchtower') {
        return handleWatchtowerConnection(ws, uid);
      }

      // Require roomId for investigation room connections
      if (!roomId) {
        ws.close(4001, 'Missing roomId');
        return;
      }

      // Verify room membership
      const db = getFirestore();
      const memberDoc = await db.collection('investigation_rooms').doc(roomId)
        .collection('members').doc(uid).get();
      if (!memberDoc.exists) {
        ws.close(4003, 'Not a room member');
        return;
      }

      const memberData = memberDoc.data();
      const client: WSClient = {
        ws,
        uid,
        roomId,
        displayName: memberData?.displayName || 'Unknown',
      };

      // Track connection
      if (!rooms.has(roomId)) rooms.set(roomId, new Set());
      rooms.get(roomId)!.add(client);

      // Update presence
      await db.collection('investigation_rooms').doc(roomId)
        .collection('members').doc(uid).update({
          isOnline: true,
          lastSeenAt: Date.now(),
        });

      // Broadcast join
      this.broadcast(roomId, {
        type: 'user_joined',
        uid,
        displayName: client.displayName,
      }, uid);

      // Send current online list
      const onlineList = Array.from(rooms.get(roomId)!).map(c => c.uid);
      ws.send(JSON.stringify({ type: 'presence', online: onlineList }));

      ws.on('message', (data) => this.handleMessage(client, data));
      ws.on('close', () => this.handleDisconnect(client));
      ws.on('error', () => this.handleDisconnect(client));

    } catch (error) {
      console.error('[WS] Connection error:', error);
      ws.close(4000, 'Internal error');
    }
  }

  private handleMessage(client: WSClient, raw: any) {
    try {
      const data = JSON.parse(raw.toString());
      switch (data.type) {
        case 'typing_start':
          this.handleTyping(client, true);
          break;
        case 'typing_stop':
          this.handleTyping(client, false);
          break;
        case 'ping':
          client.ws.send(JSON.stringify({ type: 'pong' }));
          break;
        case 'chat_message':
          this.handleChatMessage(client, data);
          break;
      }
    } catch {
      // ignore malformed messages
    }
  }

  private async handleChatMessage(client: WSClient, data: any) {
    const { content, tempId } = data;
    if (!content || !content.trim()) return;

    const now = Date.now();
    const message = {
      id: tempId,
      senderId: client.uid,
      senderName: client.displayName,
      senderPhotoURL: null,
      content: content.trim(),
      contentType: 'text',
      mentions: [],
      isPinned: false,
      createdAt: now,
      roomId: client.roomId,
    };

    // Broadcast immediately to all other members for near-instant delivery.
    // Persistence is handled by the REST endpoint, which will send
    // message_id_update with the real Firestore ID once saved.
    this.broadcast(client.roomId, { type: 'message', message }, client.uid);
  }

  private handleTyping(client: WSClient, isTyping: boolean) {
    const key = `${client.roomId}:${client.uid}`;
    if (isTyping) {
      const existing = typingTimers.get(key);
      if (existing) return; // still debounced

      this.broadcast(client.roomId, {
        type: 'typing',
        uid: client.uid,
        displayName: client.displayName,
      }, client.uid);

      typingTimers.set(key, Date.now());
      setTimeout(() => typingTimers.delete(key), TYPING_DEBOUNCE);
    }
  }

  private async handleDisconnect(client: WSClient) {
    const room = rooms.get(client.roomId);
    if (room) {
      room.delete(client);
      if (room.size === 0) {
        rooms.delete(client.roomId);
      } else {
        this.broadcast(client.roomId, {
          type: 'user_left',
          uid: client.uid,
        }, client.uid);
      }
    }

    // Update presence
    try {
      const db = getFirestore();
      await db.collection('investigation_rooms').doc(client.roomId)
        .collection('members').doc(client.uid).update({
          isOnline: false,
          lastSeenAt: Date.now(),
        });
    } catch {
      // Firestore may be unavailable — clean disconnect ok
    }
  }

  broadcast(roomId: string, message: object, excludeUid?: string) {
    const room = rooms.get(roomId);
    if (!room) return;

    const payload = JSON.stringify(message);
    for (const client of room) {
      if (excludeUid && client.uid === excludeUid) continue;
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    }
  }

  /** Broadcast a new room message to all members */
  broadcastRoomMessage(roomId: string, message: any) {
    this.broadcast(roomId, { type: 'message', message });
  }

  /** Broadcast an AI card to the room */
  broadcastAiCard(roomId: string, message: any) {
    this.broadcast(roomId, { type: 'ai_card', message });
  }

  /** Broadcast pin change to the room */
  broadcastPinEvent(roomId: string, event: 'pin_added' | 'pin_removed', data: any) {
    this.broadcast(roomId, { type: event, ...data });
  }

  /** Broadcast a room-level update (member join/leave, metadata change) */
  broadcastRoomUpdate(roomId: string, data: any) {
    this.broadcast(roomId, { type: 'room_update', ...data });
  }

  private startHeartbeat() {
    setInterval(() => {
      for (const [, clients] of rooms) {
        for (const client of clients) {
          if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.ping();
          } else {
            clients.delete(client);
          }
        }
      }
    }, 30000);
  }
}

export function createWebSocketServer(server: Server): InvestigationWSS {
  return new InvestigationWSS(server);
}

// ─── Watchtower WebSocket ──────────────────────────────────────────

import { getWatchtowerMonitor } from './WatchtowerMonitor.js';

interface WTClient {
  ws: WebSocket;
  uid: string;
}

const wtClients = new Map<string, Set<WTClient>>();

function handleWatchtowerConnection(ws: WebSocket, uid: string) {
  const client: WTClient = { ws, uid };
  if (!wtClients.has(uid)) wtClients.set(uid, new Set());
  wtClients.get(uid)!.add(client);

  console.log(`[Watchtower WS] User ${uid.slice(0, 8)}... connected`);

  // Subscribe to monitor events for this user
  const unsub = getWatchtowerMonitor().subscribe((eventUid, event) => {
    if (eventUid === uid && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'tx', event }));
    }
  });

  // Send recent activity on connect
  getWatchtowerMonitor().getActivity(uid, 10).then(events => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'history', events }));
    }
  });

  ws.on('close', () => {
    unsub();
    const set = wtClients.get(uid);
    if (set) {
      set.delete(client);
      if (set.size === 0) wtClients.delete(uid);
    }
  });

  ws.on('error', () => {
    unsub();
    const set = wtClients.get(uid);
    if (set) {
      set.delete(client);
      if (set.size === 0) wtClients.delete(uid);
    }
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch {}
  });
}

// Deprecated: watchtower now uses /ws?type=watchtower instead of /ws/watchtower
export function createWatchtowerWSS(server: Server): void {
  console.log('[WS] Watchtower merged into /ws WebSocket (connect with ?type=watchtower)');
}
