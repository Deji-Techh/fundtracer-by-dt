/**
 * Telegram Bot Redis Storage - Hybrid Memory + Redis
 * Maintains fast in-memory Maps with Redis persistence
 */

import { hset, hget, hgetall, hdel, cacheSet, cacheGet, isRedisConnected } from '../utils/redis';

const REDIS_KEYS = {
  LINKED_USERS: 'telegram:linkedUsers',
  PENDING_CODES: 'telegram:pendingCodes',
  GROUP_CHATS: 'telegram:groupChats',
  GROUP_PENDING_SCANS: 'telegram:groupPendingScans',
  PENDING_LINK_USERS: 'telegram:pendingLinkUsers',
  LINKED_USER_IDS: 'telegram:linkedUserIds',
};

// In-memory Maps (fast access)
const linkedUsers = new Map<number, any>();
const pendingCodes = new Map<string, any>();
const groupChats = new Map<number, any>();
const groupPendingScans = new Map<number, any>();
const pendingLinkUsers = new Map<number, any>();

// Sync to Redis periodically
let syncInterval: NodeJS.Timeout | null = null;

export async function loadFromRedis(): Promise<void> {
  if (!isRedisConnected()) {
    console.log('[TelegramRedis] Redis not connected, using memory only');
    return;
  }

  try {
    // Load linked users
    const linkedData = await hgetall<any>(REDIS_KEYS.LINKED_USERS);
    if (linkedData) {
      for (const [key, value] of Object.entries(linkedData)) {
        linkedUsers.set(parseInt(key), value);
      }
      console.log(`[TelegramRedis] Loaded ${linkedUsers.size} linked users`);
    }

    // Load pending codes
    const pendingData = await hgetall<any>(REDIS_KEYS.PENDING_CODES);
    if (pendingData) {
      for (const [key, value] of Object.entries(pendingData)) {
        pendingCodes.set(key, value);
      }
      console.log(`[TelegramRedis] Loaded ${pendingCodes.size} pending codes`);
    }

    // Load group chats
    const groupData = await hgetall<any>(REDIS_KEYS.GROUP_CHATS);
    if (groupData) {
      for (const [key, value] of Object.entries(groupData)) {
        groupChats.set(parseInt(key), value);
      }
    }

    // Load group pending scans
    const scanData = await hgetall<any>(REDIS_KEYS.GROUP_PENDING_SCANS);
    if (scanData) {
      for (const [key, value] of Object.entries(scanData)) {
        groupPendingScans.set(parseInt(key), value);
      }
    }

    // Load pending link users
    const pendingLinkData = await hgetall<any>(REDIS_KEYS.PENDING_LINK_USERS);
    if (pendingLinkData) {
      for (const [key, value] of Object.entries(pendingLinkData)) {
        pendingLinkUsers.set(parseInt(key), value);
      }
    }

    console.log('[TelegramRedis] All data loaded from Redis');
  } catch (error) {
    console.error('[TelegramRedis] Failed to load data:', error);
  }
}

export async function syncToRedis(): Promise<void> {
  if (!isRedisConnected()) return;

  try {
    // Sync linked users
    const linkedObj: Record<string, any> = {};
    linkedUsers.forEach((value, key) => {
      linkedObj[key.toString()] = value;
    });
    if (Object.keys(linkedObj).length > 0) {
      await hset(REDIS_KEYS.LINKED_USERS, 'data', linkedObj);
    }

    // Sync pending codes
    const pendingObj: Record<string, any> = {};
    pendingCodes.forEach((value, key) => {
      pendingObj[key] = value;
    });
    if (Object.keys(pendingObj).length > 0) {
      await hset(REDIS_KEYS.PENDING_CODES, 'data', pendingObj);
    }

    // Sync group chats
    const groupObj: Record<string, any> = {};
    groupChats.forEach((value, key) => {
      groupObj[key.toString()] = value;
    });
    if (Object.keys(groupObj).length > 0) {
      await hset(REDIS_KEYS.GROUP_CHATS, 'data', groupObj);
    }

    // Sync group pending scans
    const scanObj: Record<string, any> = {};
    groupPendingScans.forEach((value, key) => {
      scanObj[key.toString()] = value;
    });
    if (Object.keys(scanObj).length > 0) {
      await hset(REDIS_KEYS.GROUP_PENDING_SCANS, 'data', scanObj);
    }

    // Sync pending link users
    const pendingLinkObj: Record<string, any> = {};
    pendingLinkUsers.forEach((value, key) => {
      pendingLinkObj[key.toString()] = value;
    });
    if (Object.keys(pendingLinkObj).length > 0) {
      await hset(REDIS_KEYS.PENDING_LINK_USERS, 'data', pendingLinkObj);
    }
  } catch (error) {
    console.error('[TelegramRedis] Sync error:', error);
  }
}

export function startSyncInterval(): void {
  if (syncInterval) return;
  syncInterval = setInterval(() => syncToRedis(), 30000); // Sync every 30s
  console.log('[TelegramRedis] Sync interval started');
}

export function stopSyncInterval(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

// Individual operations with memory + Redis
export async function saveLinkedUser(telegramId: number, user: any): Promise<void> {
  linkedUsers.set(telegramId, user);
  if (isRedisConnected()) {
    try {
      const linkedObj: Record<string, any> = {};
      linkedUsers.forEach((value, key) => {
        linkedObj[key.toString()] = value;
      });
      await hset(REDIS_KEYS.LINKED_USERS, 'data', linkedObj);
    } catch (error) {
      console.error('[TelegramRedis] Save linked user error:', error);
    }
  }
}

export async function deleteLinkedUser(telegramId: number): Promise<void> {
  linkedUsers.delete(telegramId);
  if (isRedisConnected()) {
    try {
      const linkedObj: Record<string, any> = {};
      linkedUsers.forEach((value, key) => {
        linkedObj[key.toString()] = value;
      });
      await hset(REDIS_KEYS.LINKED_USERS, 'data', linkedObj);
    } catch (error) {
      console.error('[TelegramRedis] Delete linked user error:', error);
    }
  }
}

export async function savePendingCode(code: string, pendingCode: any): Promise<void> {
  pendingCodes.set(code, pendingCode);
  if (isRedisConnected()) {
    try {
      const pendingObj: Record<string, any> = {};
      pendingCodes.forEach((value, key) => {
        pendingObj[key] = value;
      });
      await hset(REDIS_KEYS.PENDING_CODES, 'data', pendingObj);
    } catch (error) {
      console.error('[TelegramRedis] Save pending code error:', error);
    }
  }
}

export async function deletePendingCode(code: string): Promise<void> {
  pendingCodes.delete(code);
  if (isRedisConnected()) {
    try {
      const pendingObj: Record<string, any> = {};
      pendingCodes.forEach((value, key) => {
        pendingObj[key] = value;
      });
      await hset(REDIS_KEYS.PENDING_CODES, 'data', pendingObj);
    } catch (error) {
      console.error('[TelegramRedis] Delete pending code error:', error);
    }
  }
}

export async function saveGroupChat(chatId: number, data: any): Promise<void> {
  groupChats.set(chatId, data);
  if (isRedisConnected()) {
    try {
      const groupObj: Record<string, any> = {};
      groupChats.forEach((value, key) => {
        groupObj[key.toString()] = value;
      });
      await hset(REDIS_KEYS.GROUP_CHATS, 'data', groupObj);
    } catch (error) {
      console.error('[TelegramRedis] Save group chat error:', error);
    }
  }
}

export async function deleteGroupChat(chatId: number): Promise<void> {
  groupChats.delete(chatId);
  if (isRedisConnected()) {
    try {
      const groupObj: Record<string, any> = {};
      groupChats.forEach((value, key) => {
        groupObj[key.toString()] = value;
      });
      await hset(REDIS_KEYS.GROUP_CHATS, 'data', groupObj);
    } catch (error) {
      console.error('[TelegramRedis] Delete group chat error:', error);
    }
  }
}

export async function saveGroupPendingScan(chatId: number, data: any): Promise<void> {
  groupPendingScans.set(chatId, data);
  if (isRedisConnected()) {
    try {
      const scanObj: Record<string, any> = {};
      groupPendingScans.forEach((value, key) => {
        scanObj[key.toString()] = value;
      });
      await hset(REDIS_KEYS.GROUP_PENDING_SCANS, 'data', scanObj);
    } catch (error) {
      console.error('[TelegramRedis] Save group pending scan error:', error);
    }
  }
}

export async function deleteGroupPendingScan(chatId: number): Promise<void> {
  groupPendingScans.delete(chatId);
  if (isRedisConnected()) {
    try {
      const scanObj: Record<string, any> = {};
      groupPendingScans.forEach((value, key) => {
        scanObj[key.toString()] = value;
      });
      await hset(REDIS_KEYS.GROUP_PENDING_SCANS, 'data', scanObj);
    } catch (error) {
      console.error('[TelegramRedis] Delete group pending scan error:', error);
    }
  }
}

export async function savePendingLinkUser(telegramId: number, data: any): Promise<void> {
  pendingLinkUsers.set(telegramId, data);
  if (isRedisConnected()) {
    try {
      const pendingLinkObj: Record<string, any> = {};
      pendingLinkUsers.forEach((value, key) => {
        pendingLinkObj[key.toString()] = value;
      });
      await hset(REDIS_KEYS.PENDING_LINK_USERS, 'data', pendingLinkObj);
    } catch (error) {
      console.error('[TelegramRedis] Save pending link user error:', error);
    }
  }
}

export async function deletePendingLinkUser(telegramId: number): Promise<void> {
  pendingLinkUsers.delete(telegramId);
  if (isRedisConnected()) {
    try {
      const pendingLinkObj: Record<string, any> = {};
      pendingLinkUsers.forEach((value, key) => {
        pendingLinkObj[key.toString()] = value;
      });
      await hset(REDIS_KEYS.PENDING_LINK_USERS, 'data', pendingLinkObj);
    } catch (error) {
      console.error('[TelegramRedis] Delete pending link user error:', error);
    }
  }
}

// Export Maps for direct access (for reading in bot commands)
export { linkedUsers, pendingCodes, groupChats, groupPendingScans, pendingLinkUsers };

export function isUsingRedis(): boolean {
  return isRedisConnected();
}

export function getMemoryStats() {
  return {
    linkedUsers: linkedUsers.size,
    pendingCodes: pendingCodes.size,
    groupChats: groupChats.size,
    groupPendingScans: groupPendingScans.size,
    pendingLinkUsers: pendingLinkUsers.size,
  };
}