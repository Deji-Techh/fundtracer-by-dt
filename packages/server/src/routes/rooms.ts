// ============================================================
// Investigation Rooms Routes
// Team Analysis — collaborative investigation rooms
// 3-tier caching: IndexedDB (client) → Redis → Firestore
// ============================================================

import { Router } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { getFirestore, admin } from '../firebase.js';
import { cacheGet, cacheSet, cacheDel, isRedisConnected } from '../utils/redis.js';
import { parseMaverickCommand, hasMaverickTrigger } from '../lib/maverickCommand.js';
import { generateInviteCode, generateInviteUrl, getExpiryDate } from '../lib/roomInvite.js';
import { checkRoomAccess, checkRoomLimit, checkMemberLimit } from '../lib/roomAccess.js';
import { getWSS } from '../services/websocket.js';

const router = Router();
const CACHE_TTL = 3600;

function getDb() { return getFirestore(); }

// ---------------------------------------------------------------------------
// 1. Room CRUD
// ---------------------------------------------------------------------------

// POST /api/rooms — create room
router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name, description, seedAddress, seedChain } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Room name is required' });

    const { allowed, current, max } = await checkRoomLimit(userId);
    if (!allowed) return res.status(403).json({
      error: 'room_limit_reached',
      message: `Free tier supports ${max} room. Upgrade to Pro for unlimited rooms.`,
      current, max,
    });

    const db = getDb();
    const inviteCode = generateInviteCode();
    const now = Date.now();

    const roomData = {
      name: name.trim(),
      description: description?.trim() || '',
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
      seedAddress: seedAddress || null,
      seedChain: seedChain || null,
      seedSnapshot: req.body.seedSnapshot || null,
      memberCount: 1,
      lastMessageAt: now,
      lastMessagePreview: '',
      isPublic: true,
      inviteCode,
      pinCount: 0,
    };

    const roomRef = await db.collection('investigation_rooms').add(roomData);
    const room = { id: roomRef.id, ...roomData };

    // Add creator as owner
    const userDoc = await db.collection('users').doc(userId).get();
    await roomRef.collection('members').doc(userId).set({
      uid: userId,
      displayName: req.user?.name || req.user?.email || 'Unknown',
      photoURL: userDoc.data()?.photoURL || req.user?.photoURL || null,
      role: 'owner',
      joinedAt: now,
      lastReadAt: now,
      isOnline: false,
      lastSeenAt: now,
    });

    // Create invite doc
    await db.collection('investigation_invites').doc(inviteCode).set({
      code: inviteCode,
      roomId: roomRef.id,
      roomName: name.trim(),
      createdBy: userId,
      createdAt: now,
      expiresAt: getExpiryDate().getTime(),
      maxUses: null,
      useCount: 0,
      isRevoked: false,
    });

    // Track membership in flat collection
    await addUserRoom(userId, roomRef.id);

    // Cache
    if (isRedisConnected()) {
      await cacheSet(`room:${roomRef.id}`, room, CACHE_TTL);
      await cacheDel(`rooms:${userId}`);
    }

    res.status(201).json({ success: true, room, inviteCode, inviteUrl: generateInviteUrl(inviteCode) });
  } catch (error: any) {
    console.error('[Rooms] Create error:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// GET /api/rooms — list user's rooms
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Try Redis
    if (isRedisConnected()) {
      const cached = await cacheGet<any[]>(`rooms:${userId}`);
      if (cached) return res.json({ success: true, rooms: cached });
    }

    const db = getDb();

    // Read room memberships from flat collection (avoids composite index requirement)
    const membershipDoc = await db.collection('user_rooms').doc(userId).get();
    const roomIds: string[] = membershipDoc.exists ? (membershipDoc.data()?.roomIds || []) : [];

    if (roomIds.length === 0) return res.json({ success: true, rooms: [] });

    const rooms: any[] = [];
    for (const rid of roomIds) {
      const doc = await db.collection('investigation_rooms').doc(rid).get();
      if (doc.exists) rooms.push({ id: doc.id, ...doc.data() });
    }

    rooms.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));

    if (isRedisConnected()) await cacheSet(`rooms:${userId}`, rooms, CACHE_TTL);
    res.json({ success: true, rooms });
  } catch (error: any) {
    console.error('[Rooms] List error:', error);
    res.status(500).json({ error: 'Failed to list rooms' });
  }
});

// GET /api/rooms/:roomId — room details + members
router.get('/:roomId', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { roomId } = req.params;
    const db = getDb();
    const roomDoc = await db.collection('investigation_rooms').doc(roomId).get();
    if (!roomDoc.exists) return res.status(404).json({ error: 'Room not found' });

    const membersSnap = await roomDoc.ref.collection('members').get();
    const members = membersSnap.docs.map(d => d.data());
    const isMember = members.some(m => m.uid === userId);

    res.json({
      success: true,
      room: { id: roomDoc.id, ...roomDoc.data() },
      members,
      isMember,
    });
  } catch (error: any) {
    console.error('[Rooms] Get error:', error);
    res.status(500).json({ error: 'Failed to get room' });
  }
});

// PATCH /api/rooms/:roomId — update name/desc (owner/admin)
router.patch('/:roomId', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { roomId } = req.params;
    const { allowed } = await checkRoomAccess(req, res, roomId, 'admin');
    if (!allowed) return res.status(403).json({ error: 'Must be admin or owner' });

    const db = getDb();
    const updates: any = { updatedAt: Date.now() };
    if (req.body.name) updates.name = req.body.name.trim();
    if (req.body.description !== undefined) updates.description = req.body.description.trim();

    await db.collection('investigation_rooms').doc(roomId).update(updates);
    if (isRedisConnected()) await cacheDel(`room:${roomId}`);

    res.json({ success: true });
  } catch (error: any) {
    console.error('[Rooms] Update error:', error);
    res.status(500).json({ error: 'Failed to update room' });
  }
});

// DELETE /api/rooms/:roomId — delete (owner only)
router.delete('/:roomId', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { roomId } = req.params;
    const { allowed } = await checkRoomAccess(req, res, roomId, 'owner');
    if (!allowed) return res.status(403).json({ error: 'Only the room owner can delete it' });

    const db = getDb();
    const roomRef = db.collection('investigation_rooms').doc(roomId);

    // Delete messages subcollection
    const msgSnap = await roomRef.collection('messages').get();
    const batch = db.batch();
    msgSnap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();

    // Delete members + pins subcollections
    for (const sub of ['members', 'pins']) {
      const snap = await roomRef.collection(sub).get();
      const b = db.batch();
      snap.docs.forEach(d => b.delete(d.ref));
      await b.commit();
    }

    // Delete invite
    const roomData = roomRef.get().then(d => d.data());
    const data = await roomData;
    if (data?.inviteCode) {
      await db.collection('investigation_invites').doc(data.inviteCode).delete();
    }

    await roomRef.delete();

    if (isRedisConnected()) {
      await cacheDel(`room:${roomId}`);
      await cacheDel(`rooms:${userId}`);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('[Rooms] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

// ---------------------------------------------------------------------------
// 2. Messages (3-tier cache: IndexedDB → Redis → Firestore)
// ---------------------------------------------------------------------------

// GET /api/rooms/:roomId/messages — paginated messages
router.get('/:roomId/messages', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { roomId } = req.params;
    const { allowed } = await checkRoomAccess(req, res, roomId);
    if (!allowed) return res.status(403).json({ error: 'Not a room member' });

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const before = req.query.before ? parseInt(req.query.before as string) : Date.now();

    // Try Redis
    if (isRedisConnected()) {
      const cached = await cacheGet<any[]>(`room:msgs:${roomId}`);
      if (cached) {
        const filtered = cached.filter(m => m.createdAt < before).slice(0, limit);
        return res.json({ success: true, messages: filtered, hasMore: filtered.length === limit });
      }
    }

    const db = getDb();
    const snap = await db.collection('investigation_rooms').doc(roomId)
      .collection('messages')
      .orderBy('createdAt', 'desc')
      .where('createdAt', '<', before)
      .limit(limit + 1)
      .get();

    const hasMore = snap.docs.length > limit;
    const messages = snap.docs.slice(0, limit).map(d => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate?.()?.getTime() || d.data().createdAt,
      pinnedAt: d.data().pinnedAt?.toDate?.()?.getTime() || d.data().pinnedAt,
      editedAt: d.data().editedAt?.toDate?.()?.getTime() || d.data().editedAt,
    }));

    messages.reverse(); // newest last

    if (isRedisConnected()) await cacheSet(`room:msgs:${roomId}`, messages, 300); // 5 min
    res.json({ success: true, messages, hasMore });
  } catch (error: any) {
    console.error('[Rooms] Messages get error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// POST /api/rooms/:roomId/messages — send message
router.post('/:roomId/messages', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { roomId } = req.params;
    const { allowed } = await checkRoomAccess(req, res, roomId);
    if (!allowed) return res.status(403).json({ error: 'Not a room member' });

    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ error: 'Message content required' });

    const db = getDb();
    const memberDoc = await db.collection('investigation_rooms').doc(roomId)
      .collection('members').doc(userId).get();
    const member = memberDoc.data();

    // Parse @mentions
    const mentionRegex = /@(\S+)/g;
    const mentionedNames: string[] = [];
    let m;
    while ((m = mentionRegex.exec(content)) !== null) {
      mentionedNames.push(m[1]);
    }

    // Resolve mention names to UIDs
    const membersSnap = await db.collection('investigation_rooms').doc(roomId)
      .collection('members').get();
    const allMembers = membersSnap.docs.map(d => ({ uid: d.id, ...d.data() }));
    const mentionedUids = allMembers
      .filter(mem => mentionedNames.some(n => n.toLowerCase() === mem.displayName?.toLowerCase()))
      .map(mem => mem.uid);

    const now = Date.now();
    const messageData = {
      senderId: userId,
      senderName: member?.displayName || req.user?.name || 'Unknown',
      senderPhotoURL: member?.photoURL || req.user?.photoURL || null,
      content: content.trim(),
      contentType: 'text',
      mentions: mentionedUids,
      isPinned: false,
      createdAt: now,
      roomId,
    };

    const msgRef = await db.collection('investigation_rooms').doc(roomId)
      .collection('messages').add(messageData);

    // Update room metadata
    await db.collection('investigation_rooms').doc(roomId).update({
      lastMessageAt: now,
      lastMessagePreview: content.trim().slice(0, 100),
      updatedAt: now,
    });

    // Create @mention notifications
    for (const uid of mentionedUids) {
      if (uid !== userId) {
        await db.collection('notifications').add({
          userId: uid,
          type: 'room_mention',
          title: `${messageData.senderName} mentioned you`,
          message: `in room: ${roomId}`,
          data: { roomId, messageId: msgRef.id, mentionedBy: userId },
          read: false,
          createdAt: new Date(now),
        });
      }
    }

    // Check for @FT MAVERIICK command
    let aiCard: any = null;
    if (hasMaverickTrigger(content)) {
      const parsed = parseMaverickCommand(content);
      if (parsed) {
        // Enqueue AI processing — results streamed via WebSocket
        processMaverickCommand(roomId, msgRef.id, parsed).catch(e =>
          console.error('[Rooms] Maverick command error:', e)
        );
      }
    }

    // Invalidate message cache
    if (isRedisConnected()) {
      await cacheDel(`room:msgs:${roomId}`);
      await cacheDel(`rooms:${userId}`);
    }

    const message = { id: msgRef.id, ...messageData };
    res.status(201).json({ success: true, message });
  } catch (error: any) {
    console.error('[Rooms] Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ---------------------------------------------------------------------------
// 3. Members
// ---------------------------------------------------------------------------

router.get('/:roomId/members', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { roomId } = req.params;
    const { allowed } = await checkRoomAccess(req, res, roomId);
    if (!allowed) return res.status(403).json({ error: 'Not a room member' });

    const db = getDb();
    const snap = await db.collection('investigation_rooms').doc(roomId)
      .collection('members').get();
    res.json({ success: true, members: snap.docs.map(d => d.data()) });
  } catch (error: any) {
    console.error('[Rooms] Members error:', error);
    res.status(500).json({ error: 'Failed to get members' });
  }
});

// POST /api/rooms/:roomId/join
router.post('/:roomId/join', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { roomId } = req.params;
    const { inviteCode } = req.body;

    const db = getDb();

    // Validate invite
    if (inviteCode) {
      const inviteDoc = await db.collection('investigation_invites').doc(inviteCode).get();
      if (!inviteDoc.exists) return res.status(404).json({ error: 'Invalid invite code' });
      const invite = inviteDoc.data();
      if (invite?.isRevoked) return res.status(403).json({ error: 'Invite has been revoked' });
      if (invite?.expiresAt < Date.now()) return res.status(403).json({ error: 'Invite has expired' });
      if (invite?.roomId !== roomId) return res.status(400).json({ error: 'Invite does not match room' });
    }

    // Check member limit
    const { allowed: memberAllowed, current, max } = await checkMemberLimit(roomId);
    if (!memberAllowed) return res.status(403).json({
      error: 'member_limit', message: `Room is full (${max} members on Free tier)`, current, max,
    });

    const roomRef = db.collection('investigation_rooms').doc(roomId);
    const memberRef = roomRef.collection('members').doc(userId);
    const existing = await memberRef.get();
    if (existing.exists) return res.json({ success: true, alreadyMember: true });

    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data() || {};
    const now = Date.now();

    await memberRef.set({
      uid: userId,
      displayName: req.user?.name || userData?.displayName || userData?.email || 'Unknown',
      photoURL: userData?.photoURL || req.user?.photoURL || null,
      role: 'member',
      joinedAt: now,
      lastReadAt: now,
      isOnline: false,
      lastSeenAt: now,
    });

    await roomRef.update({ memberCount: admin.firestore.FieldValue.increment(1), updatedAt: now });

    // Track membership in flat collection
    await addUserRoom(userId, roomId);

    // Update invite use count
    if (inviteCode) {
      await db.collection('investigation_invites').doc(inviteCode).update({
        useCount: admin.firestore.FieldValue.increment(1),
      });
    }

    // Send system message
    await roomRef.collection('messages').add({
      senderId: 'system',
      senderName: 'System',
      contentType: 'system',
      content: `${userData?.displayName || req.user?.name || 'Someone'} joined the room`,
      mentions: [],
      isPinned: false,
      createdAt: now,
      roomId,
    });

    if (isRedisConnected()) {
      await cacheDel(`room:${roomId}`);
      await cacheDel(`rooms:${userId}`);
    }

    res.json({ success: true, member: { uid: userId, displayName: userData?.displayName || 'Unknown', role: 'member' } });
  } catch (error: any) {
    console.error('[Rooms] Join error:', error);
    res.status(500).json({ error: 'Failed to join room' });
  }
});

// POST /api/rooms/:roomId/leave
router.post('/:roomId/leave', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { roomId } = req.params;
    const db = getDb();
    await db.collection('investigation_rooms').doc(roomId).collection('members').doc(userId).delete();
    await db.collection('investigation_rooms').doc(roomId).update({
      memberCount: admin.firestore.FieldValue.increment(-1),
    });

    // Remove from flat membership collection
    await removeUserRoom(userId, roomId);

    const now = Date.now();
    await db.collection('investigation_rooms').doc(roomId).collection('messages').add({
      senderId: 'system', senderName: 'System', contentType: 'system',
      content: `${req.user?.name || 'Someone'} left the room`,
      mentions: [], isPinned: false, createdAt: now, roomId,
    });

    if (isRedisConnected()) {
      await cacheDel(`room:${roomId}`);
      await cacheDel(`rooms:${userId}`);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('[Rooms] Leave error:', error);
    res.status(500).json({ error: 'Failed to leave room' });
  }
});

// DELETE /api/rooms/:roomId/members/:uid — remove member (admin only)
router.delete('/:roomId/members/:uid', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { roomId, uid: targetUid } = req.params;
    const { allowed } = await checkRoomAccess(req, res, roomId, 'admin');
    if (!allowed) return res.status(403).json({ error: 'Only admins can remove members' });

    const db = getDb();
    await db.collection('investigation_rooms').doc(roomId).collection('members').doc(targetUid).delete();
    await db.collection('investigation_rooms').doc(roomId).update({
      memberCount: admin.firestore.FieldValue.increment(-1),
    });

    // Remove from flat membership collection
    await removeUserRoom(targetUid, roomId);

    const now = Date.now();
    await db.collection('investigation_rooms').doc(roomId).collection('messages').add({
      senderId: 'system', senderName: 'System', contentType: 'system',
      content: `${targetUid} was removed from the room`,
      mentions: [], isPinned: false, createdAt: now, roomId,
    });

    if (isRedisConnected()) {
      await cacheDel(`room:${roomId}`);
      await cacheDel(`rooms:${targetUid}`);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('[Rooms] Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// PUT /api/rooms/:roomId/members/:uid/role — promote to admin (owner only)
router.put('/:roomId/members/:uid/role', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { roomId, uid: targetUid } = req.params;
    const { allowed } = await checkRoomAccess(req, res, roomId, 'owner');
    if (!allowed) return res.status(403).json({ error: 'Only the owner can change roles' });

    const { role } = req.body;
    if (!['admin', 'member'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

    const db = getDb();
    await db.collection('investigation_rooms').doc(roomId)
      .collection('members').doc(targetUid).update({ role });

    if (isRedisConnected()) await cacheDel(`room:${roomId}`);

    res.json({ success: true });
  } catch (error: any) {
    console.error('[Rooms] Role update error:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// ---------------------------------------------------------------------------
// 4. Invites
// ---------------------------------------------------------------------------

// POST /api/rooms/:roomId/invite
router.post('/:roomId/invite', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { roomId } = req.params;
    const { allowed } = await checkRoomAccess(req, res, roomId);
    if (!allowed) return res.status(403).json({ error: 'Not a room member' });

    const db = getDb();
    const roomDoc = await db.collection('investigation_rooms').doc(roomId).get();
    const code = roomDoc.data()?.inviteCode || generateInviteCode();
    const hours = req.body.expiresInHours || 168;

    await db.collection('investigation_invites').doc(code).set({
      code, roomId,
      roomName: roomDoc.data()?.name || '',
      createdBy: userId,
      createdAt: Date.now(),
      expiresAt: getExpiryDate(hours).getTime(),
      maxUses: req.body.maxUses || null,
      useCount: 0,
      isRevoked: false,
    }, { merge: true });

    res.json({ success: true, inviteCode: code, url: generateInviteUrl(code) });
  } catch (error: any) {
    console.error('[Rooms] Invite error:', error);
    res.status(500).json({ error: 'Failed to create invite' });
  }
});

// ---------------------------------------------------------------------------
// 5. Pins / Evidence Board
// ---------------------------------------------------------------------------

router.post('/:roomId/messages/:messageId/pin', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { roomId, messageId } = req.params;
    const { allowed } = await checkRoomAccess(req, res, roomId);
    if (!allowed) return res.status(403).json({ error: 'Not a room member' });

    const db = getDb();
    const now = Date.now();

    await db.collection('investigation_rooms').doc(roomId)
      .collection('messages').doc(messageId).update({
        isPinned: true, pinnedAt: now, pinnedBy: userId,
      });

    await db.collection('investigation_rooms').doc(roomId)
      .collection('pins').add({
        messageId, pinnedBy: userId, pinnedAt: now,
        category: req.body.category || 'evidence',
        note: req.body.note || '',
      });

    await db.collection('investigation_rooms').doc(roomId).update({
      pinCount: admin.firestore.FieldValue.increment(1),
    });

    if (isRedisConnected()) {
      await cacheDel(`room:msgs:${roomId}`);
      await cacheDel(`room:pins:${roomId}`);
    }

  } catch (error: any) {
    console.error('[Rooms] Unpin message error:', error);
    res.status(500).json({ error: error.message || 'Failed to unpin message' });
  }
});

// PATCH /api/rooms/:roomId/messages/:messageId — edit message
router.patch('/:roomId/messages/:messageId', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { roomId, messageId } = req.params;
    const { allowed } = await checkRoomAccess(req, res, roomId);
    if (!allowed) return res.status(403).json({ error: 'Not a room member' });

    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ error: 'Content required' });

    const db = getDb();
    const msgRef = db.collection('investigation_rooms').doc(roomId).collection('messages').doc(messageId);
    const msgDoc = await msgRef.get();

    if (!msgDoc.exists) return res.status(404).json({ error: 'Message not found' });
    if (msgDoc.data()?.senderId !== userId) return res.status(403).json({ error: 'Can only edit your own messages' });

    await msgRef.update({
      content: content.trim(),
      editedAt: Date.now(),
    });

    if (isRedisConnected()) await cacheDel(`room:msgs:${roomId}`);

    res.json({ success: true });
  } catch (error: any) {
    console.error('[Rooms] Edit message error:', error);
    res.status(500).json({ error: error.message || 'Failed to edit message' });
  }
});

// DELETE /api/rooms/:roomId/messages/:messageId — delete message
router.delete('/:roomId/messages/:messageId', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { roomId, messageId } = req.params;
    const { allowed } = await checkRoomAccess(req, res, roomId);
    if (!allowed) return res.status(403).json({ error: 'Not a room member' });

    const db = getDb();
    const msgRef = db.collection('investigation_rooms').doc(roomId).collection('messages').doc(messageId);
    const msgDoc = await msgRef.get();

    if (!msgDoc.exists) return res.status(404).json({ error: 'Message not found' });
    if (msgDoc.data()?.senderId !== userId) return res.status(403).json({ error: 'Can only delete your own messages' });

    await msgRef.delete();

    if (isRedisConnected()) await cacheDel(`room:msgs:${roomId}`);

    res.json({ success: true });
  } catch (error: any) {
    console.error('[Rooms] Delete message error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete message' });
  }
});

router.delete('/:roomId/messages/:messageId/pin', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { roomId, messageId } = req.params;
    const { allowed } = await checkRoomAccess(req, res, roomId);
    if (!allowed) return res.status(403).json({ error: 'Not a room member' });

    const db = getDb();

    await db.collection('investigation_rooms').doc(roomId)
      .collection('messages').doc(messageId).update({
        isPinned: false, pinnedAt: null, pinnedBy: null,
      });

    // Remove pin doc
    const pinsSnap = await db.collection('investigation_rooms').doc(roomId)
      .collection('pins').where('messageId', '==', messageId).get();
    for (const d of pinsSnap.docs) await d.ref.delete();

    await db.collection('investigation_rooms').doc(roomId).update({
      pinCount: admin.firestore.FieldValue.increment(-1),
    });

    if (isRedisConnected()) {
      await cacheDel(`room:msgs:${roomId}`);
      await cacheDel(`room:pins:${roomId}`);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('[Rooms] Unpin error:', error);
    res.status(500).json({ error: 'Failed to unpin message' });
  }
});

router.get('/:roomId/pins', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { roomId } = req.params;
    const { allowed } = await checkRoomAccess(req, res, roomId);
    if (!allowed) return res.status(403).json({ error: 'Not a room member' });

    if (isRedisConnected()) {
      const cached = await cacheGet<any[]>(`room:pins:${roomId}`);
      if (cached) return res.json({ success: true, pins: cached });
    }

    const db = getDb();
    const snap = await db.collection('investigation_rooms').doc(roomId)
      .collection('pins').orderBy('pinnedAt', 'desc').get();

    const pins = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      pinnedAt: d.data().pinnedAt?.toDate?.()?.getTime() || d.data().pinnedAt,
    }));

    if (isRedisConnected()) await cacheSet(`room:pins:${roomId}`, pins, CACHE_TTL);

    res.json({ success: true, pins });
  } catch (error: any) {
    console.error('[Rooms] Pins get error:', error);
    res.status(500).json({ error: 'Failed to get pins' });
  }
});

// ---------------------------------------------------------------------------
// 6. AI Command (SSE)
// ---------------------------------------------------------------------------

router.post('/:roomId/ai-command', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { roomId } = req.params;
    const { allowed } = await checkRoomAccess(req, res, roomId);
    if (!allowed) return res.status(403).json({ error: 'Not a room member' });

    const { command, address, chain, commandType } = req.body;
    if (!command || !address || !commandType) {
      return res.status(400).json({ error: 'Missing command, address, or commandType' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const apiBase = process.env.FUNDTRACER_API_URL || 'http://localhost:3001';
      const axios = (await import('axios')).default;

      let endpoint: string;
      let body: any;

      switch (commandType) {
        case 'analyze':
          endpoint = '/api/analyze/wallet';
          body = { address, chain };
          break;
        case 'compare':
          endpoint = '/api/analyze/compare';
          body = { addresses: [address], chain };
          break;
        case 'risk':
          endpoint = '/api/analyze/wallet';
          body = { address, chain, options: { riskOnly: true } };
          break;
        case 'trace':
          endpoint = '/api/analyze/funding-tree';
          body = { address, chain, maxDepth: 3 };
          break;
        default:
          res.write(`data: ${JSON.stringify({ type: 'error', message: 'Unknown command' })}\n\n`);
          res.write('data: [DONE]\n\n');
          res.end();
          return;
      }

      res.write(`data: ${JSON.stringify({ type: 'status', message: `Running ${commandType} on ${address}...` })}\n\n`);

      const result = await axios.post(`${apiBase}${endpoint}`, body, {
        headers: { Authorization: req.headers.authorization || '', 'Content-Type': 'application/json' },
        timeout: 60000,
      });

      const cardData = {
        command: commandType,
        address,
        chain,
        resultSummary: extractSummary(commandType, result.data),
        resultData: result.data,
      };

      res.write(`data: ${JSON.stringify({ type: 'card_data', data: cardData })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'complete', card: cardData })}\n\n`);
    } catch (error: any) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.response?.data?.error || error.message })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error('[Rooms] AI command error:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Failed to process AI command' });
  }
});

// ---------------------------------------------------------------------------
// 7. PDF Export (Pro only)
// ---------------------------------------------------------------------------

router.get('/:roomId/export', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { roomId } = req.params;
    const { allowed } = await checkRoomAccess(req, res, roomId);
    if (!allowed) return res.status(403).json({ error: 'Not a room member' });

    const db = getDb();
    const userDoc = await db.collection('users').doc(userId).get();
    const tier = userDoc.data()?.tier || 'free';
    if (tier === 'free') {
      return res.status(403).json({ error: 'PDF export is a Pro feature', upgradeRequired: true });
    }

    const roomDoc = await db.collection('investigation_rooms').doc(roomId).get();
    const room = roomDoc.data();

    const msgSnap = await roomDoc.ref.collection('messages').orderBy('createdAt', 'asc').get();
    const messages = msgSnap.docs.map(d => d.data());

    const pinsSnap = await roomDoc.ref.collection('pins').get();
    const pins = pinsSnap.docs.map(d => d.data());

    // Return structured data — PDF rendering done client-side
    res.json({
      success: true,
      export: {
        roomName: room?.name,
        exportedAt: Date.now(),
        messages,
        pins,
        memberCount: room?.memberCount,
        seedAddress: room?.seedAddress,
        seedChain: room?.seedChain,
      },
    });
  } catch (error: any) {
    console.error('[Rooms] Export error:', error);
    res.status(500).json({ error: 'Failed to export' });
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function addUserRoom(userId: string, roomId: string) {
  const db = getDb();
  const ref = db.collection('user_rooms').doc(userId);
  await ref.set({
    roomIds: admin.firestore.FieldValue.arrayUnion(roomId),
    updatedAt: Date.now(),
  }, { merge: true });
}

async function removeUserRoom(userId: string, roomId: string) {
  const db = getDb();
  const ref = db.collection('user_rooms').doc(userId);
  await ref.set({
    roomIds: admin.firestore.FieldValue.arrayRemove(roomId),
    updatedAt: Date.now(),
  }, { merge: true });
}

function extractSummary(commandType: string, data: any): string {
  try {
    switch (commandType) {
      case 'analyze':
      case 'risk': {
        const r = data?.result || data;
        const risk = r?.overallRiskScore ?? r?.riskScore ?? '?';
        const txs = r?.summary?.totalTransactions ?? r?.transactions?.length ?? '?';
        return `Risk: ${risk}/100 | ${txs} transactions`;
      }
      case 'compare': {
        const r = data?.result || data;
        return `Correlation: ${r?.correlationScore ?? '?'}% | ${r?.wallets?.length ?? '?'} wallets`;
      }
      case 'trace': {
        const r = data?.result || data;
        return `Funding tree — ${r?.fundingSources?.children?.length ?? '?'} sources, ${r?.fundingDestinations?.children?.length ?? '?'} destinations`;
      }
      default:
        return 'Analysis complete';
    }
  } catch {
    return 'Analysis complete';
  }
}

async function processMaverickCommand(roomId: string, messageId: string, parsed: { type: string; address: string; chain: string }) {
  try {
    const apiBase = process.env.FUNDTRACER_API_URL || 'http://localhost:3001';
    const axios = (await import('axios')).default;
    const db = getFirestore();

    let endpoint: string;
    let body: any;

    switch (parsed.type) {
      case 'analyze':
        endpoint = '/api/analyze/wallet';
        body = { address: parsed.address, chain: parsed.chain };
        break;
      case 'compare':
        endpoint = '/api/analyze/compare';
        body = { addresses: [parsed.address], chain: parsed.chain };
        break;
      case 'risk':
        endpoint = '/api/analyze/wallet';
        body = { address: parsed.address, chain: parsed.chain, options: { riskOnly: true } };
        break;
      case 'trace':
        endpoint = '/api/analyze/funding-tree';
        body = { address: parsed.address, chain: parsed.chain, maxDepth: 3 };
        break;
      default: return;
    }

    const result = await axios.post(`${apiBase}${endpoint}`, body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000,
    });

    const card = {
      command: parsed.type,
      address: parsed.address,
      chain: parsed.chain,
      resultSummary: extractSummary(parsed.type, result.data),
      resultData: result.data,
    };

    // Save AI card as a message
    const aiMsgRef = await db.collection('investigation_rooms').doc(roomId)
      .collection('messages').add({
        senderId: 'ai',
        senderName: 'FT MAVERIICK',
        senderPhotoURL: null,
        content: `${parsed.type} analysis for ${parsed.address}`,
        contentType: 'ai_card',
        aiCard: card,
        mentions: [],
        isPinned: false,
        createdAt: Date.now(),
        roomId,
      });

    // Broadcast via WebSocket so clients see it in real-time
    const aiMessage = { id: aiMsgRef.id, senderId: 'ai', senderName: 'FT MAVERIICK', senderPhotoURL: null, content: `${parsed.type} analysis for ${parsed.address}`, contentType: 'ai_card', aiCard: card, mentions: [], isPinned: false, createdAt: Date.now(), roomId };
    const wss = getWSS();
    if (wss) wss.broadcastAiCard(roomId, aiMessage);
  } catch (error: any) {
    console.error('[Maverick] Command processing failed:', error.message);
    const db = getFirestore();
    const errMsgRef = await db.collection('investigation_rooms').doc(roomId)
      .collection('messages').add({
        senderId: 'ai',
        senderName: 'FT MAVERIICK',
        senderPhotoURL: null,
        content: `Analysis failed: ${error.message}`,
        contentType: 'ai_card',
        aiCard: {
          command: parsed.type,
          address: parsed.address,
          chain: parsed.chain,
          resultSummary: `Analysis failed: ${error.message}`,
          resultData: null,
        },
        mentions: [],
        isPinned: false,
        createdAt: Date.now(),
        roomId,
      });

    // Broadcast error as ai_card via WebSocket so client clears loading state
    const errMessage = { id: errMsgRef.id, senderId: 'ai', senderName: 'FT MAVERIICK', senderPhotoURL: null, content: `Analysis failed: ${error.message}`, contentType: 'ai_card', aiCard: { command: parsed.type, address: parsed.address, chain: parsed.chain, resultSummary: `Analysis failed: ${error.message}`, resultData: null }, mentions: [], isPinned: false, createdAt: Date.now(), roomId };
    const wss = getWSS();
    if (wss) wss.broadcastAiCard(roomId, errMessage);
  }
}

export { router as roomRoutes };
