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

const CHAIN_TO_ALCHEMY: Record<string, string> = {
  ethereum: 'eth-mainnet',
  linea: 'linea-mainnet',
  arbitrum: 'arb-mainnet',
  optimism: 'opt-mainnet',
  polygon: 'polygon-mainnet',
  base: 'base-mainnet',
  bsc: 'bsc-mainnet',
};

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
// Falls back to Alchemy external data for chains that WalletAnalyzer maps to 'ethereum'
async function analyzeWallet(address: string, chain: string, userId: string): Promise<AnalysisData> {
  const { WalletAnalyzer } = await import('@fundtracer/core');

  const sybilKeys = getSybilAlchemyKeys();

  const analyzer = new WalletAnalyzer({
    alchemy: sybilKeys.defaultKey || '',
    moralis: sybilKeys.moralisKey,
    sybilConfig: sybilKeys,
  });

  const analyzerChain = mapChainForAnalyzer(chain);

  let result: any;
  let walletAnalyzerFailed = false;
  try {
    result = await analyzer.analyze(address, analyzerChain as ChainId) as any;
  } catch {
    walletAnalyzerFailed = true;
  }

  const hasAnalyzerData = result && result.transactions?.length > 0;
  const analysis = {
    address: result?.wallet?.address || address,
    chain,
    riskScore: result?.overallRiskScore,
    riskLevel: result?.riskLevel,
    totalTransactions: hasAnalyzerData ? result.transactions.length : 0,
    balance: result?.wallet?.balanceInEth != null ? Number(result.wallet.balanceInEth) : undefined,
    totalReceived: result?.totalReceived ?? result?.summary?.totalValueReceivedEth?.toString(),
    totalSent: result?.totalSent ?? result?.summary?.totalValueSentEth?.toString(),
    tokenHoldings: [],
    topInteractions: (result?.projectsInteracted || []).slice(0, 10).map((p: any) => ({
      address: p.contractAddress || '',
      label: p.projectName || '',
      count: p.interactionCount || 0
    })),
    flags: (result?.suspiciousIndicators || []).map((s: any) => s.description),
    fundingSources: result?.fundingSources?.nodes?.map((n: any) => n.address) || [],
    firstSeen: result?.wallet?.createdAt,
    lastSeen: result?.wallet?.lastActive,
  } as AnalysisData;

  // Fall back to Alchemy data when WalletAnalyzer found no data
  // (happens for Linea, Base, BSC — chains mapped to 'ethereum')
  if (!hasAnalyzerData && !walletAnalyzerFailed) {
    const subdomain = CHAIN_TO_ALCHEMY[chain];
    const apiKey = sybilKeys.defaultKey || '';
    if (subdomain && apiKey) {
      const alchemyUrl = `https://${subdomain}.g.alchemy.com/v2/${apiKey}`;

      const [balanceRes, outgoingRes, incomingRes] = await Promise.all([
        fetch(alchemyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBalance', params: [address, 'latest'] }),
        }).catch(() => null),
        fetch(alchemyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0', id: 2, method: 'alchemy_getAssetTransfers',
            params: [{ fromBlock: '0x0', toBlock: 'latest', fromAddress: address, order: 'desc', maxCount: '0x3E8', category: ['external', 'internal', 'erc20', 'erc721', 'erc1155'], withMetadata: true, excludeZeroValue: true }],
          }),
        }).catch(() => null),
        fetch(alchemyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0', id: 3, method: 'alchemy_getAssetTransfers',
            params: [{ fromBlock: '0x0', toBlock: 'latest', toAddress: address, order: 'desc', maxCount: '0x3E8', category: ['external', 'internal', 'erc20', 'erc721', 'erc1155'], withMetadata: true, excludeZeroValue: true }],
          }),
        }).catch(() => null),
      ]);

      const balanceData = balanceRes ? await balanceRes.json().catch(() => null) : null;
      const balanceWei = balanceData?.result || '0x0';
      const balanceEth = parseFloat((parseInt(balanceWei, 16) / 1e18).toFixed(6));

      const allTransfers = [
        ...(outgoingRes ? (await outgoingRes.json().catch(() => ({ result: { transfers: [] } }))).result?.transfers || [] : []),
        ...(incomingRes ? (await incomingRes.json().catch(() => ({ result: { transfers: [] } }))).result?.transfers || [] : []),
      ]
        .filter(Boolean)
        .sort((a: any, b: any) => parseInt(b.blockNum || '0x0', 16) - parseInt(a.blockNum || '0x0', 16));

      const txCount = allTransfers.length;
      let sent = 0;
      let received = 0;
      for (const tx of allTransfers) {
        const val = parseFloat(tx.value || '0');
        if (tx.from?.toLowerCase() === address.toLowerCase()) sent += val;
        if (tx.to?.toLowerCase() === address.toLowerCase()) received += val;
      }

      (analysis as any).totalTransactions = txCount;
      (analysis as any).balance = balanceEth.toString();
      (analysis as any).totalSent = sent.toString();
      (analysis as any).totalReceived = received.toString();
      if (!(analysis as any).riskScore) (analysis as any).riskScore = 0;
      if (!(analysis as any).riskLevel) (analysis as any).riskLevel = 'unknown';

      const timestamps = allTransfers
        .map((t: any) => t.metadata?.blockTimestamp)
        .filter(Boolean)
        .sort();
      if (timestamps.length > 0) {
        (analysis as any).firstSeen = timestamps[0];
        (analysis as any).lastSeen = timestamps[timestamps.length - 1];
      }
    }
  }

  return analysis;
}

// For contracts, use the wallet analyzer
async function analyzeContract(address: string, chain: string, userId: string): Promise<AnalysisData> {
  return analyzeWallet(address, chain, userId);
}

// ============================================================
// Combined Wallet Analysis Endpoint
// 1. Fetches raw wallet data from Alchemy → caches in Redis
// 2. Runs FundTracer WalletAnalyzer on the address
// 3. Returns everything combined for tabular display
// POST /api/ai-chat/analyze-wallet
// ============================================================
router.post('/analyze-wallet', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { address, chain } = req.body;

    if (!address || !chain) {
      return res.status(400).json({ success: false, error: 'address and chain required' });
    }

    const normalizedChain = normalizeChainId(chain);
    const cacheKey = `ext:wallet:${normalizedChain}:${address.toLowerCase()}`;

    // Step 1: Check cache for external data, or fetch from Alchemy
    let cached = await cacheGet<any>(cacheKey);
    if (!cached?.transfers) {
      const sybilKeys = getSybilAlchemyKeys();
      const apiKey = sybilKeys.defaultKey || '';
      const subdomain = CHAIN_TO_ALCHEMY[normalizedChain];

      if (subdomain && apiKey) {
        const alchemyUrl = `https://${subdomain}.g.alchemy.com/v2/${apiKey}`;

        // Fetch balance
        const balanceRes = await fetch(alchemyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBalance', params: [address, 'latest'] }),
        }).catch(() => null);
        const balanceData = balanceRes ? await balanceRes.json().catch(() => null) : null;
        const balanceWei = balanceData?.result || '0x0';
        const balanceEth = parseFloat((parseInt(balanceWei, 16) / 1e18).toFixed(6));

        // Fetch outgoing transfers
        const outgoingRes = await fetch(alchemyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0', id: 2, method: 'alchemy_getAssetTransfers',
            params: [{
              fromBlock: '0x0', toBlock: 'latest',
              fromAddress: address,
              order: 'desc', maxCount: '0x3E8',
              category: ['external', 'internal', 'erc20', 'erc721', 'erc1155'],
              withMetadata: true, excludeZeroValue: true,
            }],
          }),
        }).catch(() => null);
        const outgoingData = outgoingRes ? await outgoingRes.json().catch(() => null) : null;

        // Fetch incoming transfers
        const incomingRes = await fetch(alchemyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0', id: 3, method: 'alchemy_getAssetTransfers',
            params: [{
              fromBlock: '0x0', toBlock: 'latest',
              toAddress: address,
              order: 'desc', maxCount: '0x3E8',
              category: ['external', 'internal', 'erc20', 'erc721', 'erc1155'],
              withMetadata: true, excludeZeroValue: true,
            }],
          }),
        }).catch(() => null);
        const incomingData = incomingRes ? await incomingRes.json().catch(() => null) : null;

        const allTransfers = [...(outgoingData?.result?.transfers || []), ...(incomingData?.result?.transfers || [])]
          .filter(Boolean)
          .sort((a: any, b: any) => parseInt(b.blockNum || '0x0', 16) - parseInt(a.blockNum || '0x0', 16))
          .slice(0, 50)
          .map((t: any) => ({
            hash: t.hash,
            from: t.from,
            to: t.to,
            value: t.value || '0',
            asset: t.asset || 'ETH',
            category: t.category || 'external',
            timestamp: t.metadata?.blockTimestamp || null,
            blockNum: t.blockNum,
          }));

        cached = { balance: balanceEth, transfers: allTransfers };

        // Cache for 30 minutes (don't block on cache failure)
        await cacheSet(cacheKey, cached, 1800).catch(() => {});
      } else {
        cached = { balance: 0, transfers: [] };
      }
    }

    // Step 2: Run FundTracer WalletAnalyzer directly for full analysis data
    const userId = req.user?.uid || 'anonymous';
    let riskScore: number | undefined;
    let riskLevel: string | undefined;
    let totalTransactions = 0;
    let totalValueSentEth: number | undefined;
    let totalValueReceivedEth: number | undefined;
    let firstSeen: string | undefined;
    let lastSeen: string | undefined;
    let flags: string[] = [];
    let topInteractions: Array<{ address: string; label: string; count: number }> = [];
    let fundingSources: string[] = [];
    let balance: number | undefined;

    try {
      const { WalletAnalyzer } = await import('@fundtracer/core');
      const sybilKeys = getSybilAlchemyKeys();
      const analyzer = new WalletAnalyzer({
        alchemy: sybilKeys.defaultKey || '',
        moralis: sybilKeys.moralisKey,
        sybilConfig: sybilKeys,
      });
      const analyzerChain = mapChainForAnalyzer(normalizedChain);
      const result = await analyzer.analyze(address, analyzerChain as ChainId) as any;

      riskScore = result.overallRiskScore;
      riskLevel = result.riskLevel;
      totalTransactions = result.transactions?.length ?? result.summary?.totalTransactions ?? 0;
      totalValueSentEth = result.summary?.totalValueSentEth;
      totalValueReceivedEth = result.summary?.totalValueReceivedEth;
      firstSeen = result.wallet?.createdAt;
      lastSeen = result.wallet?.lastActive;
      balance = result.wallet?.balanceInEth != null ? Number(result.wallet.balanceInEth) : undefined;
      flags = (result.suspiciousIndicators || []).map((s: any) => s.description || s);
      topInteractions = (result.projectsInteracted || []).slice(0, 10).map((p: any) => ({
        address: p.contractAddress || p.address || '',
        label: p.projectName || p.label || 'Unknown',
        count: p.interactionCount || p.count || 0,
      }));
      fundingSources = (result.fundingSources?.nodes && Array.isArray(result.fundingSources.nodes)
        ? result.fundingSources.nodes.map((n: any) => n.address || n)
        : []);
    } catch (analysisError) {
      console.warn('[AI-Chat] WalletAnalyzer failed, using external data only:', (analysisError as Error).message);
    }

    // Step 2.5: If WalletAnalyzer found no data but Alchemy has external transfers,
    // compute the table fields from Alchemy data (handles Linea, Base, BSC — chains
    // where WalletAnalyzer maps to 'ethereum' and finds nothing)
    if ((totalTransactions === 0 || !totalTransactions) && cached.transfers.length > 0) {
      totalTransactions = cached.transfers.length;

      let sent = 0;
      let received = 0;
      for (const tx of cached.transfers) {
        const val = parseFloat(tx.value) || 0;
        if (tx.from.toLowerCase() === address.toLowerCase()) sent += val;
        if (tx.to.toLowerCase() === address.toLowerCase()) received += val;
      }
      totalValueSentEth = sent;
      totalValueReceivedEth = received;

      if (balance === undefined || balance === 0) {
        balance = cached.balance;
      }

      const timestamps = cached.transfers
        .map((t: any) => t.timestamp)
        .filter(Boolean)
        .sort();
      if (timestamps.length > 0) {
        firstSeen = timestamps[0];
        lastSeen = timestamps[timestamps.length - 1];
      }

      if (riskScore === undefined) {
        riskScore = 0;
        riskLevel = 'unknown';
      }
    }

    // Step 3: Return combined result for tabular display
    const combined = {
      success: true,
      address,
      chain: normalizedChain,
      externalBalanceWei: cached.balance,
      externalTransfers: cached.transfers,
      fromCache: cached?.fromCache || false,
      fromAlchemyFallback: (totalTransactions === cached.transfers.length) && cached.transfers.length > 0,
      analysis: {
        riskScore,
        riskLevel,
        totalTransactions,
        totalValueSentEth,
        totalValueReceivedEth,
        balance,
        firstSeen,
        lastSeen,
        flags,
        topInteractions,
        fundingSources,
      },
    };
    res.json(combined);
  } catch (error: any) {
    console.error('[AI-Chat] Analyze-wallet error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

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
      context = `You are FT Maverick, FundTracer's blockchain forensics AI analyst. Help users analyze wallet addresses, understand transaction flows, assess risk levels, and answer questions about blockchain security.\n\n`;
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
      message: 'An unexpected error occurred'
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