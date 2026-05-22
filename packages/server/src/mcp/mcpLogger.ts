import { getFirestore } from '../firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

export interface McpLogEntry {
  userId: string;
  toolName: string;
  args: string;
  status: 'success' | 'error';
  responsePreview: string;
  duration: number;
  createdAt: number;
  keyPrefix?: string;
}

/**
 * Log an MCP tool request to Firestore for the History tab.
 * Non-blocking — failures are silently ignored.
 */
export async function logMcpRequest(entry: McpLogEntry): Promise<void> {
  try {
    const db = getFirestore();
    if (!db) return;
    await db.collection('mcpLogs').add(entry);
  } catch {
    // Non-blocking
  }
}

/**
 * Fetch paginated MCP request logs for a user.
 */
export async function getMcpLogs(
  userId: string,
  options: { limit?: number; startAfter?: number; tool?: string } = {}
): Promise<{ logs: McpLogEntry[]; hasMore: boolean }> {
  const { limit = 50, startAfter, tool } = options;
  const db = getFirestore();
  if (!db) return { logs: [], hasMore: false };

  try {
    let query: FirebaseFirestore.Query = db.collection('mcpLogs')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit + 1);

    if (startAfter) {
      query = query.startAfter(startAfter);
    }
    if (tool) {
      query = query.where('toolName', '==', tool);
    }

    const snapshot = await query.get();
    const logs = snapshot.docs.slice(0, limit).map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as any;

    return {
      logs,
      hasMore: snapshot.docs.length > limit,
    };
  } catch (err) {
    // If index doesn't exist yet, try without ordering
    try {
      let fallbackQuery: FirebaseFirestore.Query = db.collection('mcpLogs')
        .where('userId', '==', userId)
        .limit(limit + 1);

      if (tool) {
        fallbackQuery = fallbackQuery.where('toolName', '==', tool);
      }

      const snapshot = await fallbackQuery.get();
      const logs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        .slice(0, limit);

      return { logs, hasMore: snapshot.docs.length > limit };
    } catch {
      return { logs: [], hasMore: false };
    }
  }
}
