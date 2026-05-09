// ============================================================
// Chat History Service - Stores chat sessions and messages
// Uses Firebase Firestore for persistence + Redis for caching
// ============================================================

import { getFirestore, admin } from '../firebase.js';
import { cacheGet, cacheSet, cacheDel, isRedisConnected } from '../utils/redis.js';

const firestore = getFirestore();
const CHAT_COLLECTION = 'chat_sessions';
const MESSAGES_COLLECTION = 'chat_messages';
const CACHE_TTL = 3600; // 1 hour for Redis cache

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ChatSession {
  id: string;
  userId: string;
  title: string;
  lastMessage: string;
  timestamp: number;
  messageCount: number;
  attachedAddress?: string;
  attachedChain?: string;
  addressType?: 'wallet' | 'contract';
}

// Create a new chat session
export async function createChatSession(
  userId: string,
  title: string = 'New Conversation'
): Promise<ChatSession> {
  const session: ChatSession = {
    id: '',
    userId,
    title,
    lastMessage: '',
    timestamp: Date.now(),
    messageCount: 0,
  };

  // Save to Firestore
  const docRef = await firestore.collection(CHAT_COLLECTION).add({
    ...session,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  session.id = docRef.id;

  // Cache in Redis
  if (isRedisConnected()) {
    const cacheKey = `chat:session:${userId}:${session.id}`;
    await cacheSet(cacheKey, session, CACHE_TTL);
  }

  return session;
}

// Get chat sessions for a user
export async function getChatSessions(userId: string): Promise<ChatSession[]> {
  // Try Redis first
  if (isRedisConnected()) {
    const cacheKey = `chat:sessions:${userId}`;
    const cached = await cacheGet<ChatSession[]>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Fetch from Firestore
  const snapshot = await firestore
    .collection(CHAT_COLLECTION)
    .where('userId', '==', userId)
    .orderBy('timestamp', 'desc')
    .limit(20)
    .get();

  const sessions: ChatSession[] = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      title: data.title,
      lastMessage: data.lastMessage,
      timestamp: data.timestamp?.toDate?.()?.getTime() || data.timestamp,
      messageCount: data.messageCount,
      attachedAddress: data.attachedAddress,
      attachedChain: data.attachedChain,
      addressType: data.addressType,
    };
  });

  // Cache in Redis
  if (isRedisConnected()) {
    const cacheKey = `chat:sessions:${userId}`;
    await cacheSet(cacheKey, sessions, CACHE_TTL);
  }

  return sessions;
}

// Get a specific chat session
export async function getChatSession(
  userId: string,
  sessionId: string
): Promise<ChatSession | null> {
  // Try Redis first
  if (isRedisConnected()) {
    const cacheKey = `chat:session:${userId}:${sessionId}`;
    const cached = await cacheGet<ChatSession>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Fetch from Firestore
  const docRef = firestore.collection(CHAT_COLLECTION).doc(sessionId);
  const doc = await docRef.get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data();
  const session: ChatSession = {
    id: doc.id,
    userId: data?.userId,
    title: data?.title,
    lastMessage: data?.lastMessage,
    timestamp: data?.timestamp?.toDate?.()?.getTime() || data?.timestamp,
    messageCount: data?.messageCount,
    attachedAddress: data?.attachedAddress,
    attachedChain: data?.attachedChain,
    addressType: data?.addressType,
  };

  // Cache in Redis
  if (isRedisConnected()) {
    const cacheKey = `chat:session:${userId}:${sessionId}`;
    await cacheSet(cacheKey, session, CACHE_TTL);
  }

  return session;
}

// Update chat session (title, last message, etc.)
export async function updateChatSession(
  userId: string,
  sessionId: string,
  updates: Partial<ChatSession>
): Promise<void> {
  // Update in Firestore
  const docRef = firestore.collection(CHAT_COLLECTION).doc(sessionId);
  await docRef.update({
    ...updates,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Invalidate cache
  if (isRedisConnected()) {
    const cacheKey = `chat:session:${userId}:${sessionId}`;
    await cacheDel(cacheKey);
    // Also invalidate sessions list cache
    await cacheDel(`chat:sessions:${userId}`);
  }
}

// Add a message to a chat session
export async function addChatMessage(
  userId: string,
  sessionId: string,
  message: ChatMessage
): Promise<void> {
  // Save message to Firestore
  await firestore.collection(CHAT_COLLECTION)
    .doc(sessionId)
    .collection(MESSAGES_COLLECTION)
    .add({
      ...message,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  // Update session with last message and count
  const session = await getChatSession(userId, sessionId);
  if (session) {
    await updateChatSession(userId, sessionId, {
      lastMessage: message.content.slice(0, 100),
      messageCount: session.messageCount + 1,
      timestamp: Date.now(),
    });
  }

  // Invalidate messages cache
  if (isRedisConnected()) {
    await cacheDel(`chat:messages:${userId}:${sessionId}`);
  }
}

// Get messages for a chat session
export async function getChatMessages(
  userId: string,
  sessionId: string
): Promise<ChatMessage[]> {
  // Try Redis first
  if (isRedisConnected()) {
    const cacheKey = `chat:messages:${userId}:${sessionId}`;
    const cached = await cacheGet<ChatMessage[]>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Fetch from Firestore
  const snapshot = await firestore
    .collection(CHAT_COLLECTION)
    .doc(sessionId)
    .collection(MESSAGES_COLLECTION)
    .orderBy('timestamp', 'asc')
    .limit(100)
    .get();

  const messages: ChatMessage[] = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      role: data.role,
      content: data.content,
      timestamp: data.timestamp?.toDate?.()?.getTime() || data.timestamp,
    };
  });

  // Cache in Redis
  if (isRedisConnected()) {
    const cacheKey = `chat:messages:${userId}:${sessionId}`;
    await cacheSet(cacheKey, messages, CACHE_TTL);
  }

  return messages;
}

// Delete a chat session and its messages
export async function deleteChatSession(
  userId: string,
  sessionId: string
): Promise<void> {
  // Delete messages subcollection
  const messagesSnapshot = await firestore
    .collection(CHAT_COLLECTION)
    .doc(sessionId)
    .collection(MESSAGES_COLLECTION)
    .get();

  const batch = firestore.batch();
  messagesSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  // Delete session document
  await firestore.collection(CHAT_COLLECTION).doc(sessionId).delete();

  // Invalidate caches
  if (isRedisConnected()) {
    await cacheDel(`chat:session:${userId}:${sessionId}`);
    await cacheDel(`chat:messages:${userId}:${sessionId}`);
    await cacheDel(`chat:sessions:${userId}`);
  }
}

// Update attached address for a session
export async function updateSessionAttachment(
  userId: string,
  sessionId: string,
  attachedAddress?: string,
  attachedChain?: string,
  addressType?: 'wallet' | 'contract'
): Promise<void> {
  await updateChatSession(userId, sessionId, {
    attachedAddress,
    attachedChain,
    addressType,
  });
}