// ============================================================
// AI Chat Route - Context-aware AI analyst with smart model routing
// POST /api/ai-chat
// ============================================================

import { Router, Response } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth.js';
import { callGeminiStream, selectModel } from '../lib/gemini-client.js';
import { buildContext, formatAnalysisForDisplay, type AnalysisData } from '../lib/context-builder.js';

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

// Analyze wallet using FundTracer's wallet analyzer
async function analyzeWallet(address: string, chain: string): Promise<AnalysisData> {
  const { WalletAnalyzer } = await import('@fundtracer/core');
  
  const analyzer = new WalletAnalyzer({
    alchemy: process.env.ALCHEMY_API_KEY || '',
    moralis: process.env.MORALIS_API_KEY,
    etherscan: process.env.ETHERSCAN_API_KEY,
  });
  
  // Use 'ethereum' as default chain ID - can be made dynamic
  const result = await analyzer.analyze(address, 'ethereum') as any;
  
  // Transform to our context format
  return {
    address: result.wallet?.address || address,
    chain: chain,
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
async function analyzeContract(address: string, chain: string): Promise<AnalysisData> {
  return analyzeWallet(address, chain);
}

// Main AI Chat endpoint with SSE
router.post('/chat', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { address, addressType, chain, question, history, attachedFiles } = req.body;

    // Validation - either address OR attachedFiles must be provided
    const hasAddress = address && addressType && chain;
    const hasFiles = attachedFiles && Array.isArray(attachedFiles) && attachedFiles.length > 0;
    
    if (!question) {
      return res.status(400).json({ 
        error: 'Missing required field: question'
      });
    }

    if (!hasAddress && !hasFiles) {
      return res.status(400).json({ 
        error: 'Must provide either address (with addressType and chain) OR attachedFiles'
      });
    }

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

      let analysisData: AnalysisData;
      
      try {
        if (addressType === 'wallet') {
          analysisData = await analyzeWallet(address, normalizedChain);
        } else {
          analysisData = await analyzeContract(address, normalizedChain);
        }
      } catch (analysisError: any) {
        console.error('[AI-Chat] Analysis error:', analysisError.message);
        res.write(`data: ${JSON.stringify({ 
          type: 'error', 
          message: `Failed to analyze ${addressType}: ${analysisError.message}` 
        })}\n\n`);
        res.write('data: [DONE]\n\n');
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
    } else {
      // Document-only mode
      res.write(`data: ${JSON.stringify({ type: 'status', message: 'Processing document(s)...' })}\n\n`);
      context = `The user has attached the following document(s) for analysis:\n`;
      
      for (const file of attachedFiles) {
        context += `- ${file.displayName} (${file.mimeType})\n`;
      }
      context += '\nPlease analyze these documents and answer the user\'s question.\n';
    }

    console.log('[AI-Chat] Context built, classifying question...');

    // Classify question complexity and select model
    const modelType = await selectModel(question);
    console.log(`[AI-Chat] Using model: ${modelType}`);

    // Convert history to Gemini format
    const geminiHistory = (history || []).map((msg: { role: string; content: string }) => ({
      role: msg.role === 'assistant' ? 'model' : msg.role as 'user' | 'model',
      content: msg.content
    }));

    // Stream response from Gemini
    res.write(`data: ${JSON.stringify({ type: 'status', message: 'Getting AI response...' })}\n\n`);

    let fullResponse = '';
    
    for await (const chunk of callGeminiStream(context, question, geminiHistory, modelType, hasFiles ? attachedFiles : undefined)) {
      fullResponse += chunk;
      res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
    }

    // Send completion
    res.write(`data: ${JSON.stringify({ 
      type: 'complete', 
      fullResponse 
    })}\n\n`);
    res.write('data: [DONE]\n\n');

    console.log('[AI-Chat] Response complete, length:', fullResponse.length);

  } catch (error: any) {
    console.error('[AI-Chat] Error:', error.message);
    res.write(`data: ${JSON.stringify({ 
      type: 'error', 
      message: error.message || 'An unexpected error occurred' 
    })}\n\n`);
    res.write('data: [DONE]\n\n');
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

export default router;
export { router as aiChatRoutes };