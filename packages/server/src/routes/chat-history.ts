// ============================================================
// Chat History Routes - API endpoints for chat sessions
// ============================================================

import { Router } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth.js';
import * as chatHistory from '../lib/chat-history.js';

const router = Router();

// GET /api/chat/sessions - Get all chat sessions for user
router.get('/sessions', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const sessions = await chatHistory.getChatSessions(userId);
    res.json({ sessions });
  } catch (error: any) {
    console.error('[ChatHistory] Get sessions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/chat/sessions - Create a new chat session
router.post('/sessions', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { title } = req.body;
    const session = await chatHistory.createChatSession(userId, title || 'New Conversation');
    res.json({ session });
  } catch (error: any) {
    console.error('[ChatHistory] Create session error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/chat/sessions/:sessionId - Get a specific session
router.get('/sessions/:sessionId', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const session = await chatHistory.getChatSession(userId, req.params.sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json({ session });
  } catch (error: any) {
    console.error('[ChatHistory] Get session error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/chat/sessions/:sessionId - Delete a session
router.delete('/sessions/:sessionId', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await chatHistory.deleteChatSession(userId, req.params.sessionId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('[ChatHistory] Delete session error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/chat/sessions/:sessionId/messages - Get messages for a session
router.get('/sessions/:sessionId/messages', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const messages = await chatHistory.getChatMessages(userId, req.params.sessionId);
    res.json({ messages });
  } catch (error: any) {
    console.error('[ChatHistory] Get messages error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/chat/sessions/:sessionId/messages - Add a message to a session
router.post('/sessions/:sessionId/messages', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { role, content, timestamp } = req.body;
    if (!role || !content) {
      return res.status(400).json({ error: 'Missing role or content' });
    }

    await chatHistory.addChatMessage(userId, req.params.sessionId, {
      role,
      content,
      timestamp: timestamp || Date.now(),
    });
    res.json({ success: true });
  } catch (error: any) {
    console.error('[ChatHistory] Add message error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/chat/sessions/:sessionId - Update session (title, attachment, etc.)
router.patch('/sessions/:sessionId', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { title, attachedAddress, attachedChain, addressType } = req.body;
    await chatHistory.updateChatSession(userId, req.params.sessionId, {
      title,
      attachedAddress,
      attachedChain,
      addressType,
    });
    res.json({ success: true });
  } catch (error: any) {
    console.error('[ChatHistory] Update session error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// Redis Cache Endpoints (Hot Cache Layer)
// ============================================================

import { redis_getChat, redis_setChat, redis_appendChat } from '../utils/redis.js';

// GET /api/chat/cache?cid=conversationId - Get cached messages from Redis
router.get('/cache', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.uid;
    const conversationId = req.query.cid as string;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!conversationId) {
      return res.status(400).json({ error: 'Missing conversationId' });
    }

    const messages = await redis_getChat(userId, conversationId);
    res.json({ messages: messages || [] });
  } catch (error: any) {
    console.error('[ChatHistory] Redis get error:', error);
    res.status(500).json({ error: 'Failed to get cache' });
  }
});

// POST /api/chat/cache - Set/update cached messages in Redis
router.post('/cache', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.uid;
    const { conversationId, messages } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!conversationId || !messages) {
      return res.status(400).json({ error: 'Missing conversationId or messages' });
    }

    await redis_setChat(userId, conversationId, messages);
    res.json({ success: true });
  } catch (error: any) {
    console.error('[ChatHistory] Redis set error:', error);
    res.status(500).json({ error: 'Failed to set cache' });
  }
});

// POST /api/chat/message - Append a message to Redis cache
router.post('/message', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.uid;
    const { conversationId, role, content } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!conversationId || !role || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await redis_appendChat(userId, conversationId, {
      role,
      content,
      timestamp: Date.now(),
    });
    res.json({ success: true });
  } catch (error: any) {
    console.error('[ChatHistory] Redis append error:', error);
    res.status(500).json({ error: 'Failed to append message' });
  }
});

export default router;
export { router as chatHistoryRoutes };