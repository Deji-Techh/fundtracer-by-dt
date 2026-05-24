// ============================================================
// Investigation Room WebSocket Server
// Real-time messaging, typing indicators, presence
// ============================================================

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
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

function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'dev-secret-key-change-in-prod';
}

export class InvestigationWSS {
  private wss: WebSocketServer;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.wss.on('connection', (ws, req) => this.handleConnection(ws, req));
    this.startHeartbeat();
    console.log('[WS] Investigation WebSocket server started on /ws');
  }

  private async handleConnection(ws: WebSocket, req: any) {
    try {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const token = url.searchParams.get('token');
      const roomId = url.searchParams.get('roomId');

      if (!token || !roomId) {
        ws.close(4001, 'Missing token or roomId');
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
      }
    } catch {
      // ignore malformed messages
    }
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

  private broadcast(roomId: string, message: object, excludeUid?: string) {
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
