// ============================================================
// AI Chat Route - Context-aware AI analyst with smart model routing
// POST /api/ai-chat
// ============================================================

import { Router, Response } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth.js';
import { callGeminiStream, selectModel } from '../lib/gemini-client.js';
import { buildContext, formatAnalysisForDisplay, type AnalysisData } from '../lib/context-builder.js';
import { getSybilAlchemyKeys } from '../utils/alchemyKeys.js';
import { cacheGet, cacheSet, cacheDel } from '../utils/redis.js';
import { getFirestore } from '../firebase.js';
import type { ChainId } from '@fundtracer/core';

const router = Router();

// Chain validation
const ALLOWED_CHAINS = [
  'ethereum', 'linea', 'arbitrum', 'base', 'optimism', 'polygon', 'bsc', 'solana'
];

const normalizeChainId = (chain: string): string => {
  const mapping: Record<string, string> = {
    'eth': 'ethereum',
    'arb': 'arbitrum',
    'opt': 'optimism',
    'matic': 'polygon',
    'binance': 'bsc',
    'sol': 'solana',
  };
  return mapping[chain.toLowerCase()] || chain.toLowerCase();
};

// Address validation
const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const SOL_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

// Map frontend chain to analyzer-compatible chain
function mapChainForAnalyzer(chain: string): string {
  const chainLower = chain.toLowerCase();
  switch (chainLower) {
    case 'linea':
      return 'ethereum'; // Linea data available via ethereum endpoints
    case 'base':
      return 'ethereum'; // Base data available via ethereum endpoints
    case 'arbitrum':
      return 'arbitrum';
    case 'optimism':
      return 'optimism';
    case 'polygon':
      return 'polygon';
    case 'bsc':
      return 'ethereum'; // BSC uses ethereum-compatible format
    case 'solana':
      return 'solana';
    default:
      return 'ethereum';
  }
}

// Analyze wallet using internal WalletAnalyzer with correct chain mapping
async function analyzeWallet(address: string, chain: string, userId: string): Promise<AnalysisData> {
  const { WalletAnalyzer } = await import('@fundtracer/core');
  
  const sybilKeys = getSybilAlchemyKeys();
  
  const analyzer = new WalletAnalyzer({
    alchemy: sybilKeys.defaultKey || '',
    moralis: sybilKeys.moralisKey,
    sybilConfig: sybilKeys,
  });
  
  // Use the correct chain for the analyzer
  const analyzerChain = mapChainForAnalyzer(chain);
  
  const result = await analyzer.analyze(address, analyzerChain as ChainId) as any;
  
  // Transform to our context format
  return {
    address: result.wallet?.address || address,
    chain: chain, // Return the original chain, not the mapped one
    riskScore: result.overallRiskScore,
    riskLevel: result.riskLevel,
    totalTransactions: result.transactions?.length || 0,
    tokenHoldings: [],
    topInteractions: (result.projectsInteracted || []).slice(0, 10).map((p: any) => ({
      address: p.contractAddress || '',
      label: p.projectName || '',
      count: p.interactionCount || 0
    })),
    flags: (result.suspiciousIndicators || []).map((s: any) => s.description),
    fundingSources: result.fundingSources?.nodes?.map((n: any) => n.address) || [],
    firstSeen: result.wallet?.createdAt,
    lastSeen: result.wallet?.lastActive,
  };
}

// For contracts, use the wallet analyzer
async function analyzeContract(address: string, chain: string, userId: string): Promise<AnalysisData> {
  return analyzeWallet(address, chain, userId);
}

// Main AI Chat endpoint with SSE
router.post('/chat', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { address, addressType, chain, question, history, attachedFiles } = req.body;

    // Validation - question is required, address and files are optional for chat-only mode
    const hasAddress = address && addressType && chain;
    const hasFiles = attachedFiles && Array.isArray(attachedFiles) && attachedFiles.length > 0;
    
    if (!question) {
      return res.status(400).json({ 
        error: 'Missing required field: question'
      });
    }

    // Note: address and attachedFiles are now optional - chat-only mode is supported

    // If address is provided, validate it
    let normalizedChain = '';
    if (address) {
      if (!addressType || !chain) {
        return res.status(400).json({ 
          error: 'addressType and chain are required when address is provided'
        });
      }

      if (!['wallet', 'contract'].includes(addressType)) {
        return res.status(400).json({ error: 'addressType must be wallet or contract' });
      }

      normalizedChain = normalizeChainId(chain);
      if (!ALLOWED_CHAINS.includes(normalizedChain)) {
        return res.status(400).json({ 
          error: `Invalid chain: ${chain}. Allowed: ${ALLOWED_CHAINS.join(', ')}` 
        });
      }

      // Validate address format
      const isSolana = normalizedChain === 'solana';
      const isValidAddress = isSolana 
        ? SOL_ADDRESS_REGEX.test(address)
        : ETH_ADDRESS_REGEX.test(address);
      
      if (!isValidAddress) {
        return res.status(400).json({ 
          error: `Invalid ${isSolana ? 'Solana' : 'EVM'} address format` 
        });
      }
    } else {
      // Chat-only mode - no address provided
      normalizedChain = 'ethereum'; // Default for chat-only
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'disable');

    // Build context
    let context = '';
    let analysisSummary = '';

    // If we have an address, analyze it
    if (hasAddress) {
      // Send initial status
      res.write(`data: ${JSON.stringify({ type: 'status', message: 'Analyzing ' + addressType + '...' })}\n\n`);

      const userId = req.user?.uid || 'anonymous';
      
      let analysisData: AnalysisData;
      
      try {
        if (addressType === 'wallet') {
          analysisData = await analyzeWallet(address, normalizedChain, userId);
        } else {
          analysisData = await analyzeContract(address, normalizedChain, userId);
        }
      } catch (analysisError: any) {
        console.error('[AI-Chat] Analysis error:', analysisError.message);
        res.write(`data: ${JSON.stringify({ 
          type: 'error', 
          message: `Failed to analyze ${addressType}: ${analysisError.message}` 
        })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }

      // Send analysis complete message
      analysisSummary = formatAnalysisForDisplay(analysisData, addressType);
      res.write(`data: ${JSON.stringify({ 
        type: 'analysis', 
        message: analysisSummary 
      })}\n\n`);

      // Build context from analysis data
      context = buildContext(analysisData, addressType);
    } else if (hasFiles) {
      // Document-only mode (no address, but has files)
      res.write(`data: ${JSON.stringify({ type: 'status', message: 'Processing document(s)...' })}\n\n`);
      context = `The user has attached the following document(s) for analysis:\n`;
      
      for (const file of attachedFiles) {
        context += `- ${file.displayName} (${file.mimeType})\n`;
      }
      context += '\nPlease analyze these documents and answer the user\'s question.\n';
    } else {
      // Chat-only mode (no address, no files)
      res.write(`data: ${JSON.stringify({ type: 'status', message: 'Thinking...' })}\n\n`);
      context = `You are FundTracer AI, a blockchain forensics analyst assistant. You help users analyze wallet addresses, understand transaction flows, assess risk levels, and answer questions about blockchain security.\n\n`;
    }

    // Classify question complexity and select model
    const modelType = await selectModel(question);

    // Convert history to Gemini format
    const geminiHistory = (history || []).map((msg: { role: string; content: string }) => ({
      role: msg.role === 'assistant' ? 'model' : msg.role as 'user' | 'model',
      content: msg.content
    }));

    // Stream response from Gemini
    res.write(`data: ${JSON.stringify({ type: 'status', message: 'Getting AI response...' })}\n\n`);

    let fullResponse = '';
    let responseEnded = false;

    try {
      for await (const chunk of callGeminiStream(context, question, geminiHistory, modelType, hasFiles ? attachedFiles : undefined)) {
        fullResponse += chunk;
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
      }
    } catch (streamError: any) {
      console.error('[AI-Chat] Stream error:', streamError.message);
      if (!fullResponse) {
        res.write(`data: ${JSON.stringify({ 
          type: 'error', 
          message: 'Failed to get AI response. Please try again.' 
        })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
        responseEnded = true;
      }
    }

    if (responseEnded) return;

    // Send completion
    if (fullResponse) {
      res.write(`data: ${JSON.stringify({ 
        type: 'complete', 
        fullResponse 
      })}\n\n`);
    }
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error: any) {
    if (responseEnded) return;
    console.error('[AI-Chat] Error:', error.message);
    res.write(`data: ${JSON.stringify({ 
      type: 'error', 
      message: error.message || 'An unexpected error occurred' 
    })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// Health check for AI service
router.get('/status', (req, res) => {
  const hasApiKey = !!process.env.GEMINI_API_KEY;
  
  res.json({
    status: hasApiKey ? 'ready' : 'no_api_key',
    gemini: hasApiKey ? 'configured' : 'missing',
    models: {
      flash: 'gemini-2.0-flash',
      pro: 'gemini-2.5-pro'
    }
  });
});

// ============================================================
// Chat Session Management (Redis + Firestore)
// ============================================================

const SESSION_TTL_SECONDS = 10 * 24 * 60 * 60; // 10 days
const FIRESTORE_COLLECTION = 'aiChatSessions';

// List all sessions for the user
router.get('/sessions', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Try Redis first
    const redisKey = `ai:sessions:${userId}`;
    const cached = await cacheGet(redisKey);
    if (cached) {
      return res.json({ sessions: cached, source: 'cache' });
    }

    // Fall back to Firestore
    const db = getFirestore();
    const snapshot = await db.collection(FIRESTORE_COLLECTION)
      .where('userId', '==', userId)
      .orderBy('updatedAt', 'desc')
      .limit(50)
      .get();

    const sessions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Convert timestamps
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString(),
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString(),
    }));

    // Cache in Redis for 1 hour
    await cacheSet(redisKey, sessions, 3600);

    res.json({ sessions, source: 'firestore' });
  } catch (error: any) {
    console.error('[AI Chat] Failed to list sessions:', error);
    res.status(500).json({ error: 'Failed to load sessions' });
  }
});

// Get a specific session with messages
router.get('/sessions/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.uid;
    const sessionId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Try Redis first
    const redisKey = `ai:session:${sessionId}`;
    const cached = await cacheGet(redisKey) as { userId: string; [key: string]: any } | null;
    if (cached && cached.userId === userId) {
      return res.json({ session: cached, source: 'cache' });
    }

    // Fall back to Firestore
    const db = getFirestore();
    const doc = await db.collection(FIRESTORE_COLLECTION).doc(sessionId).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const data = doc.data();
    if (data?.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const session = {
      id: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate?.()?.toISOString(),
      updatedAt: data?.updatedAt?.toDate?.()?.toISOString(),
    };

    // Cache in Redis
    await cacheSet(redisKey, session, 3600);

    res.json({ session, source: 'firestore' });
  } catch (error: any) {
    console.error('[AI Chat] Failed to get session:', error);
    res.status(500).json({ error: 'Failed to load session' });
  }
});

// Create a new session
router.post('/sessions', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.uid;
    const { title, walletAddress, chain } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = getFirestore();
    const { FieldValue } = await import('firebase-admin/firestore');

    const sessionData = {
      userId,
      title: title || 'New Chat',
      walletAddress: walletAddress || null,
      chain: chain || null,
      messages: [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection(FIRESTORE_COLLECTION).add(sessionData);

    // Invalidate sessions list cache
    const redisKey = `ai:sessions:${userId}`;
    await cacheDel(redisKey);

    const session = {
      id: docRef.id,
      ...sessionData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Cache the new session
    await cacheSet(`ai:session:${docRef.id}`, session, SESSION_TTL_SECONDS);

    res.status(201).json({ session });
  } catch (error: any) {
    console.error('[AI Chat] Failed to create session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Update session (add messages)
router.put('/sessions/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.uid;
    const sessionId = req.params.id;
    const { messages, title } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = getFirestore();
    const { FieldValue } = await import('firebase-admin/firestore');

    const docRef = db.collection(FIRESTORE_COLLECTION).doc(sessionId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const data = doc.data();
    if (data?.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updateData: any = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (messages !== undefined) {
      updateData.messages = messages;
    }
    if (title !== undefined) {
      updateData.title = title;
    }

    await docRef.update(updateData);

    // Invalidate caches
    await cacheDel(`ai:session:${sessionId}`);
    await cacheDel(`ai:sessions:${userId}`);

    // Store in Redis with TTL
    const updatedDoc = await docRef.get();
    const sessionData = {
      id: sessionId,
      ...updatedDoc.data(),
      createdAt: updatedDoc.data()?.createdAt?.toDate?.()?.toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await cacheSet(`ai:session:${sessionId}`, sessionData, SESSION_TTL_SECONDS);

    res.json({ session: sessionData });
  } catch (error: any) {
    console.error('[AI Chat] Failed to update session:', error);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// Delete a session
router.delete('/sessions/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.uid;
    const sessionId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = getFirestore();
    const docRef = db.collection(FIRESTORE_COLLECTION).doc(sessionId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const data = doc.data();
    if (data?.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await docRef.delete();

    // Invalidate caches
    await cacheDel(`ai:session:${sessionId}`);
    await cacheDel(`ai:sessions:${userId}`);

    res.json({ success: true });
  } catch (error: any) {
    console.error('[AI Chat] Failed to delete session:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

export default router;
export { router as aiChatRoutes };