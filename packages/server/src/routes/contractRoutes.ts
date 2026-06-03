import { Router } from 'express';
import { ContractScanner } from '../services/contractScanner.js';
import { getAlchemyKeyPool } from '../utils/quicknode.js';

const router = Router();

function sendSseEvent(res: any, event: string, data: any): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function flattenScanResult(result: any, chain: string) {
  const walletInteractions = (result.wallets || []).map((w: any, idx: number) => ({
    rank: idx + 1,
    address: String(w.address || '').toLowerCase(),
    interactionCount: Number(w.interactions || 0),
    interactions: Number(w.interactions || 0),
    firstSeen: w.firstSeen || null,
    lastSeen: w.lastSeen || null,
    sent: Number(w.sentToContract || 0),
    received: Number(w.receivedFromContract || 0),
    sentToContract: Number(w.sentToContract || 0),
    receivedFromContract: Number(w.receivedFromContract || 0),
    category: w.topCategory || 'unknown',
    topCategory: w.topCategory || 'unknown',
    categories: w.categories || {},
    uniqueAssets: Number(w.uniqueAssets || 0),
  }));

  return {
    success: true,
    contractAddress: result.contract.address,
    contractName: result.contract.name,
    contractSymbol: result.contract.symbol,
    contractType: result.contract.type,
    creator: result.contract.creator,
    creationDate: result.contract.createdAt,
    creationTx: result.contract.creationTxHash,
    ethBalance: parseFloat(result.contract.balanceETH || '0'),
    chain,
    uniqueWallets: walletInteractions.length,
    totalTransfers: Number(result.stats.totalTransfers || 0),
    incomingTransfers: Number(result.stats.incomingTransfers || 0),
    outgoingTransfers: Number(result.stats.outgoingTransfers || 0),
    totalInteractors: walletInteractions.length,
    categoryBreakdown: result.stats.categoryCounts || {},
    walletInteractions,
    riskScore: walletInteractions.length > 200 ? 70 : walletInteractions.length > 50 ? 40 : 10,
    scanDuration: result.scanDurationMs,
  };
}

// POST /api/contract/scan
router.post('/scan', async (req, res) => {
  const { address, chain } = req.body;

  if (!address) {
    return res.status(400).json({ error: 'Contract address is required' });
  }

  const apiKey = process.env.DEFAULT_ALCHEMY_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Alchemy API key not configured' });
  }

  try {
    const scanner = new ContractScanner(
      apiKey,
      process.env.LINEASCAN_API_KEY,
      chain || 'linea'
    );

    const result = await scanner.scan(address);

    res.json(flattenScanResult(result, chain || 'linea'));
  } catch (error) {
    console.error('[Contract Scan Error]', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to scan contract';
    res.status(500).json({
      error: errorMessage,
      hint: errorMessage.includes('not a contract') 
        ? 'Please enter a valid smart contract address'
        : undefined
    });
  }
});

// POST /api/contract/scan/stream
router.post('/scan/stream', async (req, res) => {
  const { address, chain } = req.body;

  if (!address) {
    return res.status(400).json({ error: 'Contract address is required' });
  }

  const apiKey = process.env.DEFAULT_ALCHEMY_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Alchemy API key not configured' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  let closed = false;
  req.on('close', () => {
    closed = true;
  });

  const send = (event: string, data: any) => {
    if (!closed) sendSseEvent(res, event, data);
  };

  try {
    const selectedChain = chain || 'linea';
    const scanner = new ContractScanner(
      apiKey,
      process.env.LINEASCAN_API_KEY,
      selectedChain
    );

    send('status', { stage: 'setup', message: 'Preparing contract scan' });
    const result = await scanner.scan(address, (progress) => {
      send(progress.stage === 'metadata' && progress.contract ? 'partial' : 'status', progress);
    });

    if (closed) return;
    send('complete', {
      result: flattenScanResult(result, selectedChain),
    });
    res.end();
  } catch (error) {
    console.error('[Contract Scan Stream Error]', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to scan contract';
    if (!closed) {
      send('error', {
        error: errorMessage,
        message: errorMessage,
        hint: errorMessage.includes('not a contract')
          ? 'Please enter a valid smart contract address'
          : undefined,
      });
      res.end();
    }
  }
});

// POST /api/contract/scan-rich
// Uses all available Alchemy keys in parallel and returns the richest merged result.
router.post('/scan-rich', async (req, res) => {
  const { address, chain } = req.body;

  if (!address) {
    return res.status(400).json({ error: 'Contract address is required' });
  }

  const selectedChain = chain || 'linea';
  const keyPool = getAlchemyKeyPool();
  const defaultKey = process.env.DEFAULT_ALCHEMY_API_KEY;
  const keys = Array.from(new Set([...(keyPool || []), ...(defaultKey ? [defaultKey] : [])])).filter(Boolean);

  if (keys.length === 0) {
    return res.status(500).json({ error: 'No Alchemy API keys configured' });
  }

  try {
    const scans = await Promise.allSettled(
      keys.map(async (apiKey) => {
        const scanner = new ContractScanner(
          apiKey,
          process.env.LINEASCAN_API_KEY,
          selectedChain
        );
        return scanner.scan(address);
      })
    );

    const successes = scans
      .filter((s): s is PromiseFulfilledResult<any> => s.status === 'fulfilled')
      .map(s => s.value);

    if (successes.length === 0) {
      const firstErr = scans.find(s => s.status === 'rejected') as PromiseRejectedResult | undefined;
      throw new Error(firstErr?.reason?.message || 'All key-pool scans failed');
    }

    // Pick a canonical result with highest transfer count.
    // Do not sum across key responses because most scans overlap the same dataset.
    const best = [...successes].sort(
      (a, b) => (b?.stats?.totalTransfers || 0) - (a?.stats?.totalTransfers || 0)
    )[0];

    const walletInteractions = (best?.wallets || []).map((w: any, idx: number) => ({
      rank: idx + 1,
      address: String(w.address || '').toLowerCase(),
      interactionCount: Number(w.interactions || 0),
      interactions: Number(w.interactions || 0),
      firstSeen: w.firstSeen || null,
      lastSeen: w.lastSeen || null,
      sent: Number(w.sentToContract || 0),
      received: Number(w.receivedFromContract || 0),
      sentToContract: Number(w.sentToContract || 0),
      receivedFromContract: Number(w.receivedFromContract || 0),
      category: w.topCategory || 'unknown',
      topCategory: w.topCategory || 'unknown',
      categories: w.categories || {},
      uniqueAssets: Number(w.uniqueAssets || 0),
    }));

    res.json({
      success: true,
      contractAddress: best.contract.address,
      contractName: best.contract.name,
      contractSymbol: best.contract.symbol,
      contractType: best.contract.type,
      creator: best.contract.creator,
      creationDate: best.contract.createdAt,
      creationTx: best.contract.creationTxHash,
      ethBalance: parseFloat(best.contract.balanceETH || '0'),
      chain: selectedChain,
      uniqueWallets: walletInteractions.length,
      totalTransfers: Number(best.stats.totalTransfers || 0),
      incomingTransfers: Number(best.stats.incomingTransfers || 0),
      outgoingTransfers: Number(best.stats.outgoingTransfers || 0),
      totalInteractors: walletInteractions.length,
      categoryBreakdown: best.stats.categoryCounts || {},
      walletInteractions,
      riskScore: walletInteractions.length > 200 ? 70 : walletInteractions.length > 50 ? 40 : 10,
      scanDuration: best.scanDurationMs,
      keyPoolUsed: keys.length,
      successfulScans: successes.length,
      mergeStrategy: 'best-scan-no-aggregation',
    });
  } catch (error) {
    console.error('[Contract Scan Rich Error]', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to run rich contract scan';
    res.status(500).json({
      error: errorMessage,
      hint: errorMessage.includes('not a contract')
        ? 'Please enter a valid smart contract address'
        : undefined,
    });
  }
});

export default router;
