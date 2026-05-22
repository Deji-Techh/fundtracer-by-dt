import type { McpContext } from './types.js';

/**
 * Validate an MCP API key against Firestore.
 * Supports:
 *  - Dedicated mcp-scoped keys (prefix: ft_mcp_)
 *  - Existing live/test keys that have the 'mcp' scope
 */
export async function validateMcpApiKey(rawKey: string): Promise<McpContext> {
  const { getFirestore } = await import('../firebase.js');
  const db = getFirestore();

  if (!db) throw new Error('Firestore not available');

  // Look up the key document directly (same pattern as apiKeyAuthMiddleware)
  const keyDoc = await db.collection('apiKeys').doc(rawKey).get();

  if (!keyDoc.exists) {
    // Fallback: hash-based lookup for backward compatibility
    const { hashAPIKey } = await import('../models/apiKey.js');
    const keyHash = hashAPIKey(rawKey);
    const snapshot = await db.collection('apiKeys')
      .where('isActive', '==', true)
      .get();

    let found = false;
    let data: any = null;
    for (const doc of snapshot.docs) {
      if (doc.data().keyHash === keyHash) {
        found = true;
        data = doc.data();
        break;
      }
    }
    if (!found) throw new Error('Invalid MCP API key');
    if (data.expiresAt && data.expiresAt < Date.now()) throw new Error('MCP API key has expired');
    if (!data.isActive) throw new Error('MCP API key has been revoked');

    const scopes = data.scopes || [];
    if (data.keyType !== 'mcp' && !scopes.includes('mcp')) {
      throw new Error('This API key does not have MCP access');
    }

    return {
      userId: data.userId,
      tier: data.tier || 'free',
      apiKeyPrefix: rawKey.substring(0, 15),
    };
  }

  const data = keyDoc.data();
  if (!data) throw new Error('Invalid MCP API key');
  if (data.expiresAt && data.expiresAt < Date.now()) throw new Error('MCP API key has expired');
  if (data.active === false) throw new Error('MCP API key has been revoked');

  const scopes = data.scopes || [];
  if (data.keyType !== 'mcp' && !scopes.includes('mcp')) {
    throw new Error('This API key does not have MCP access');
  }

  // Track usage
  try {
    const { incrementAPIKeyUsage } = await import('../models/apiKey.js');
    await incrementAPIKeyUsage(data.userId, rawKey);
  } catch { /* non-blocking */ }

  return {
    userId: data.userId,
    tier: data.tier || 'free',
    apiKeyPrefix: rawKey.substring(0, 15),
  };
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
