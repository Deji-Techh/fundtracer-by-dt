import type { McpContext } from './types.js';

/**
 * Validate an MCP API key — tries Firestore first, falls back to HTTP
 * validation against the FundTracer API (for stdio mode where Firebase
 * credentials aren't available).
 */
export async function validateMcpApiKey(rawKey: string): Promise<McpContext> {
  if (!rawKey.startsWith('ft_')) throw new Error('Invalid MCP API key format');

  // Try Firestore (works on the backend where credentials are configured)
  let firestoreResult: McpContext | null = null;
  try {
    firestoreResult = await validateWithFirestore(rawKey);
    if (firestoreResult) return firestoreResult;
  } catch {
    // Fall through to HTTP validation
  }

  // Fallback: validate via HTTP against the live API
  return validateViaHttp(rawKey);
}

// ---------------------------------------------------------------------------
// Firestore-based validation (backend only)
// ---------------------------------------------------------------------------
async function validateWithFirestore(rawKey: string): Promise<McpContext | null> {
  const { getFirestore } = await import('../firebase.js');
  const db = getFirestore();

  if (!db) return null;

  // Direct document lookup
  const keyDoc = await db.collection('apiKeys').doc(rawKey).get();

  if (keyDoc.exists) {
    const data = keyDoc.data();
    if (!data) throw new Error('Invalid MCP API key');
    if (data.expiresAt && data.expiresAt < Date.now()) throw new Error('MCP API key has expired');
    if (data.active === false) throw new Error('MCP API key has been revoked');

    const scopes = data.scopes || [];
    if (data.keyType !== 'mcp' && !scopes.includes('mcp')) {
      throw new Error('This API key does not have MCP access');
    }

    trackUsage(data.userId, rawKey);

    return {
      userId: data.userId,
      tier: data.tier || 'free',
      apiKeyPrefix: rawKey.substring(0, 15),
      apiKey: rawKey,
    };
  }

  // Hash-based fallback
  const { hashAPIKey } = await import('../models/apiKey.js');
  const keyHash = hashAPIKey(rawKey);
  const snapshot = await db.collection('apiKeys')
    .where('isActive', '==', true)
    .get();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.keyHash === keyHash) {
      if (data.expiresAt && data.expiresAt < Date.now()) throw new Error('MCP API key has expired');
      if (!data.isActive) throw new Error('MCP API key has been revoked');

      const scopes = data.scopes || [];
      if (data.keyType !== 'mcp' && !scopes.includes('mcp')) {
        throw new Error('This API key does not have MCP access');
      }

      trackUsage(data.userId, rawKey);

      return {
        userId: data.userId,
        tier: data.tier || 'free',
        apiKeyPrefix: rawKey.substring(0, 15),
        apiKey: rawKey,
      };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// HTTP-based validation (for stdio mode / npx)
// ---------------------------------------------------------------------------
async function validateViaHttp(rawKey: string): Promise<McpContext> {
  const API_URL = process.env.FUNDTRACER_API_URL || 'https://api.fundtracer.xyz';

  const { default: fetch } = await import('node-fetch');
  const res = await fetch(`${API_URL}/api/mcp/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${rawKey}`,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(body ? JSON.parse(body).error || body : `Validation failed (HTTP ${res.status})`);
  }

  const data = await res.json();
  return {
    userId: data.userId,
    tier: data.tier || 'free',
    apiKeyPrefix: rawKey.substring(0, 15),
    apiKey: rawKey,
  };
}

// ---------------------------------------------------------------------------
// Usage tracking (Firestore, non-blocking)
// ---------------------------------------------------------------------------
async function trackUsage(userId: string, rawKey: string) {
  try {
    const { incrementAPIKeyUsage } = await import('../models/apiKey.js');
    await incrementAPIKeyUsage(userId, rawKey);
  } catch { /* non-blocking */ }
}

/** Express middleware: validates MCP API key from Authorization header */
export async function mcpApiKeyAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'MCP API key required (Authorization: Bearer ft_mcp_<key>)' });
  }

  const rawKey = authHeader.slice(7).trim();
  if (!rawKey.startsWith('ft_')) {
    return res.status(401).json({ error: 'Invalid MCP API key format' });
  }

  try {
    const ctx = await validateMcpApiKey(rawKey);
    req.mcpContext = ctx;
    next();
  } catch (err: any) {
    return res.status(401).json({ error: err.message });
  }
}
