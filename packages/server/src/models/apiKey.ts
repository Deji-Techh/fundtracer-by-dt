/**
 * FundTracer API Key Model
 * Manages developer API keys for external access
 */

import { getFirestore } from '../firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

export type APITier = 'free' | 'pro' | 'enterprise';
export type APIKeyType = 'live' | 'test';

export interface APIKey {
  id: string;
  userId: string;
  keyHash: string;
  keyPrefix: string;
  keyType: APIKeyType;
  name: string;
  scopes: string[];
  tier: APITier;
  dailyUsage: number;
  dailyUsageReset: number; // Timestamp
  lastUsed: number;
  createdAt: number;
  isActive: boolean;
  expiresAt?: number;
  testnetOnly: boolean;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  tier: APITier;
}

// API Key scopes
export const API_SCOPES = {
  READ_ADDRESS: 'read:address',
  READ_TRANSACTIONS: 'read:transactions',
  READ_GRAPH: 'read:graph',
  WRITE_ALERTS: 'write:alerts',
  WRITE_WEBHOOKS: 'write:webhooks',
  ADMIN: 'admin',
} as const;

export type APIScope = typeof API_SCOPES[keyof typeof API_SCOPES];

// Tier limits
export const TIER_LIMITS = {
  free: {
    daily: 100,
    perMinute: 10,
    burst: 20,
    endpoints: ['address', 'transactions', 'tokens', 'risk'],
    features: ['basic_address_info', 'transaction_history'],
  },
  pro: {
    daily: 10000,
    perMinute: 60,
    burst: 100,
    endpoints: ['address', 'transactions', 'tokens', 'risk', 'graph', 'sources', 'destinations', 'analyze', 'entities'],
    features: ['full_graph_analysis', 'async_analysis', 'entity_detection'],
  },
  enterprise: {
    daily: 100000,
    perMinute: 300,
    burst: 1000,
    endpoints: ['*'],
    features: ['*', 'webhooks', 'alerts', 'websocket', 'priority_support'],
  },
} as const;

// Default scopes per tier
export const TIER_DEFAULT_SCOPES: Record<APITier, APIScope[]> = {
  free: [API_SCOPES.READ_ADDRESS, API_SCOPES.READ_TRANSACTIONS],
  pro: [
    API_SCOPES.READ_ADDRESS,
    API_SCOPES.READ_TRANSACTIONS,
    API_SCOPES.READ_GRAPH,
    API_SCOPES.WRITE_ALERTS,
  ],
  enterprise: [API_SCOPES.ADMIN],
};

// Generate a new API key
export function generateAPIKey(type: APIKeyType = 'live'): string {
  const prefix = type === 'live' ? 'ft_live_' : 'ft_test_';
  const randomPart = generateSecureRandom(32);
  return `${prefix}${randomPart}`;
}

// Generate secure random string
function generateSecureRandom(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(length);
  require('crypto').randomFillSync(array);
  return Array.from(array, byte => chars[byte % chars.length]).join('');
}

// Hash API key for storage
export function hashAPIKey(key: string): string {
  return require('crypto').createHash('sha256').update(key).digest('hex');
}

// Create API key in Firestore
export async function createAPIKey(
  userId: string,
  options: {
    name: string;
    tier?: APITier;
    keyType?: APIKeyType;
    scopes?: APIScope[];
    testnetOnly?: boolean;
    expiresAt?: number;
  }
): Promise<{ key: APIKey; rawKey: string }> {
  const db = getFirestore();
  const keyCollection = db.collection('apiKeys');
  
  const tier = options.tier || 'free';
  const keyType = options.keyType || 'live';
  const rawKey = generateAPIKey(keyType);
  const keyHash = hashAPIKey(rawKey);
  const keyPrefix = rawKey.split('_').slice(0, 2).join('_');
  const scopes = options.scopes || TIER_DEFAULT_SCOPES[tier];
  
  const now = Date.now();
  const dailyReset = getDailyResetTimestamp();
  
  const apiKey: APIKey = {
    id: keyCollection.doc().id,
    userId,
    keyHash,
    keyPrefix,
    keyType,
    name: options.name,
    scopes,
    tier,
    dailyUsage: 0,
    dailyUsageReset: dailyReset,
    lastUsed: now,
    createdAt: now,
    isActive: true,
    expiresAt: options.expiresAt,
    testnetOnly: options.testnetOnly || false,
  };
  
  await keyCollection.doc(apiKey.id).set(apiKey);
  
  return { key: apiKey, rawKey };
}

// Validate API key and return key info
export async function validateAPIKey(rawKey: string): Promise<APIKey | null> {
  const db = getFirestore();
  const keyCollection = db.collection('apiKeys');
  
  // Find all keys and check hash (Firestore doesn't support hash search)
  const snapshot = await keyCollection.where('isActive', '==', true).get();
  
  const keyHash = hashAPIKey(rawKey);
  
  for (const doc of snapshot.docs) {
    const keyData = doc.data() as APIKey;
    if (keyData.keyHash === keyHash) {
      // Check expiration
      if (keyData.expiresAt && keyData.expiresAt < Date.now()) {
        return null;
      }
      return keyData;
    }
  }
  
  return null;
}

// Get API key by ID
export async function getAPIKeyById(keyId: string): Promise<APIKey | null> {
  const db = getFirestore();
  const doc = await db.collection('apiKeys').doc(keyId).get();
  return doc.exists ? (doc.data() as APIKey) : null;
}

// Get all API keys for a user
export async function getUserAPIKeys(userId: string): Promise<APIKey[]> {
  const db = getFirestore();
  const snapshot = await db.collection('apiKeys')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .get();
  
  return snapshot.docs.map(doc => doc.data() as APIKey);
}

// Update API key usage
export async function incrementAPIKeyUsage(userId: string, keyId: string): Promise<void> {
  const db = getFirestore();
  const keyRef = db.collection('users').doc(userId).collection('apiKeys').doc(keyId);
  const now = Date.now();
  const dailyReset = getDailyResetTimestamp();
  
  await keyRef.update({
    dailyUsage: FieldValue.increment(1),
    dailyUsageReset: dailyReset,
    lastUsed: now,
  });
}

// Reset daily usage if needed
export async function resetDailyUsageIfNeeded(key: APIKey): Promise<void> {
  if (key.dailyUsageReset < Date.now()) {
    const db = getFirestore();
    await db.collection('apiKeys').doc(key.id).update({
      dailyUsage: 0,
      dailyUsageReset: getDailyResetTimestamp(),
    });
  }
}

// Check rate limit for API key
export async function checkRateLimit(key: APIKey): Promise<RateLimitInfo> {
  const limits = TIER_LIMITS[key.tier];
  const now = Date.now();
  
  // Reset if daily limit has passed
  await resetDailyUsageIfNeeded(key);
  
  return {
    limit: limits.daily,
    remaining: Math.max(0, limits.daily - key.dailyUsage),
    reset: key.dailyUsageReset,
    tier: key.tier,
  };
}

// Deactivate API key
export async function deactivateAPIKey(keyId: string, userId: string): Promise<boolean> {
  const db = getFirestore();
  const keyRef = db.collection('apiKeys').doc(keyId);
  const doc = await keyRef.get();
  
  if (!doc.exists || doc.data()?.userId !== userId) {
    return false;
  }
  
  await keyRef.update({ isActive: false });
  return true;
}

// Check if scope is allowed for tier
export function hasScope(key: APIKey, requiredScope: APIScope): boolean {
  if (key.scopes.includes(API_SCOPES.ADMIN)) {
    return true;
  }
  return key.scopes.includes(requiredScope);
}

// Get daily reset timestamp (midnight UTC)
function getDailyResetTimestamp(): number {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return tomorrow.getTime();
}

// Update key tier/scopes (admin only)
export async function updateAPIKeyTier(
  keyId: string,
  updates: { tier?: APITier; scopes?: APIScope[]; expiresAt?: number }
): Promise<void> {
  const db = getFirestore();
  await db.collection('apiKeys').doc(keyId).update({
    ...(updates.tier && { tier: updates.tier }),
    ...(updates.scopes && { scopes: updates.scopes }),
    ...(updates.expiresAt !== undefined && { expiresAt: updates.expiresAt }),
  });
}
