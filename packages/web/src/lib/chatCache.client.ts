import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'ft-chat-db';
const DB_VERSION = 1;
const STORE_NAME = 'conversations';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ConversationRecord {
  id: string;
  uid: string;
  messages: ChatMessage[];
  updatedAt: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

// Promise-chain mutex per conversationId to serialize concurrent idb_append calls
// Each call chains onto the previous call's promise — no TOCTOU race.
const appendQueues = new Map<string, Promise<void>>();

async function acquireAppendLock(conversationId: string): Promise<() => void> {
  const prev = appendQueues.get(conversationId) || Promise.resolve();
  let release: () => void;
  const next = new Promise<void>(resolve => { release = resolve; });
  appendQueues.set(conversationId, next);
  await prev;
  return release!;
}

async function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('uid', 'uid');
          store.createIndex('updatedAt', 'updatedAt');
        }
      },
    });
  }
  return dbPromise;
}

export async function idb_get(conversationId: string): Promise<ChatMessage[] | null> {
  console.log('[IDB] get conv:', conversationId);
  try {
    const db = await getDB();
    const record = await db.get(STORE_NAME, conversationId);
    console.log('[IDB] get conv:', conversationId, 'found:', record ? 'yes count:' + record.messages.length : 'no');
    return record?.messages || null;
  } catch (error) {
    console.error('[IDB] Get error:', error);
    return null;
  }
}

export async function idb_save(conversationId: string, uid: string, messages: ChatMessage[]): Promise<void> {
  const release = await acquireAppendLock(conversationId);
  try {
    const db = await getDB();
    await db.put(STORE_NAME, {
      id: conversationId,
      uid,
      messages: [...messages],
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error('[IDB] Save error:', error);
  } finally {
    release();
  }
}

export async function idb_append(conversationId: string, message: ChatMessage): Promise<void> {
  const release = await acquireAppendLock(conversationId);
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    let record = await tx.store.get(conversationId);
    
    if (!record) {
      record = {
        id: conversationId,
        uid: '',
        messages: [],
        updatedAt: Date.now()
      };
    }
    
    record.messages.push(message);
    record.updatedAt = Date.now();
    console.log('[IDB] Appending message:', message.role, 'conv:', conversationId, 'content length:', message.content.length);
    await tx.store.put(record);
    await tx.done;
    console.log('[IDB] Appended message, conv:', conversationId, 'total:', record.messages.length);
  } catch (error) {
    console.error('[IDB] Append error:', error);
  } finally {
    release();
  }
}

export async function idb_clear(conversationId: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(STORE_NAME, conversationId);
  } catch (error) {
    console.error('[IDB] Clear error:', error);
  }
}

export async function idb_getAll(uid: string): Promise<ConversationRecord[]> {
  try {
    const db = await getDB();
    const index = db.transaction(STORE_NAME).store.index('uid');
    return await index.getAll(uid);
  } catch (error) {
    console.error('[IDB] GetAll error:', error);
    return [];
  }
}