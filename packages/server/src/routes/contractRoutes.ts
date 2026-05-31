import { Router } from 'express';
import { ContractScanner } from '../services/contractScanner.js';
import { getAlchemyKeyPool } from '../utils/quicknode.js';

const router = Router();

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

    res.json({
      success: true,
      // Flatten nested result to match what the frontend expects
      contractAddress: result.contract.address,
      contractName: result.contract.name,
      contractSymbol: result.contract.symbol,
      contractType: result.contract.type,
      creator: result.contract.creator,
      creationDate: result.contract.createdAt,
      creationTx: result.contract.creationTxHash,
      ethBalance: parseFloat(result.contract.balanceETH || '0'),
      chain: chain || 'linea',
      uniqueWallets: result.stats.uniqueWallets,
      totalTransfers: result.stats.totalTransfers,
      incomingTransfers: result.stats.incomingTransfers,
      outgoingTransfers: result.stats.outgoingTransfers,
      totalInteractors: result.stats.uniqueWallets,
      categoryBreakdown: result.stats.categoryCounts,
      walletInteractions: result.wallets,
      riskScore: 0, // Contract scanner doesn't calculate risk score
      scanDuration: result.scanDurationMs,
    });
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

    // Pick a base result with highest transfer count, then merge all wallet interactions.
    const best = [...successes].sort(
      (a, b) => (b?.stats?.totalTransfers || 0) - (a?.stats?.totalTransfers || 0)
    )[0];

    const walletMap = new Map<string, any>();
    for (const result of successes) {
      for (const w of result?.wallets || []) {
        const addr = String(w.address || '').toLowerCase();
        if (!addr) continue;
        const prev = walletMap.get(addr) || {
          rank: 0,
          address: addr,
          interactions: 0,
          firstSeen: w.firstSeen || null,
          lastSeen: w.lastSeen || null,
          sentToContract: 0,
          receivedFromContract: 0,
          topCategory: w.topCategory || 'unknown',
          categories: {},
          uniqueAssets: 0,
        };
        prev.interactions += Number(w.interactions || 0);
        prev.sentToContract += Number(w.sentToContract || 0);
        prev.receivedFromContract += Number(w.receivedFromContract || 0);
        prev.uniqueAssets = Math.max(prev.uniqueAssets, Number(w.uniqueAssets || 0));
        if (w.firstSeen && (!prev.firstSeen || new Date(w.firstSeen) < new Date(prev.firstSeen))) prev.firstSeen = w.firstSeen;
        if (w.lastSeen && (!prev.lastSeen || new Date(w.lastSeen) > new Date(prev.lastSeen))) prev.lastSeen = w.lastSeen;
        const cats = w.categories || {};
        for (const [k, v] of Object.entries(cats)) {
          prev.categories[k] = (prev.categories[k] || 0) + Number(v || 0);
        }
        prev.topCategory = Object.entries(prev.categories).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || prev.topCategory;
        walletMap.set(addr, prev);
      }
    }

    const walletInteractions = Array.from(walletMap.values())
      .sort((a, b) => b.interactions - a.interactions)
      .map((w, idx) => ({
        rank: idx + 1,
        address: w.address,
        interactionCount: w.interactions,
        interactions: w.interactions,
        firstSeen: w.firstSeen,
        lastSeen: w.lastSeen,
        sent: w.sentToContract,
        received: w.receivedFromContract,
        sentToContract: w.sentToContract,
        receivedFromContract: w.receivedFromContract,
        category: w.topCategory,
        topCategory: w.topCategory,
        categories: w.categories,
        uniqueAssets: w.uniqueAssets,
      }));

    const mergedTotalTransfers = walletInteractions.reduce(
      (sum, w) => sum + Number(w.interactionCount || 0), 0
    );
    const mergedIncoming = walletInteractions.reduce(
      (sum, w) => sum + Number(w.sent || 0), 0
    );
    const mergedOutgoing = walletInteractions.reduce(
      (sum, w) => sum + Number(w.received || 0), 0
    );

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
      totalTransfers: Math.max(best.stats.totalTransfers || 0, mergedTotalTransfers),
      incomingTransfers: Math.max(best.stats.incomingTransfers || 0, mergedIncoming),
      outgoingTransfers: Math.max(best.stats.outgoingTransfers || 0, mergedOutgoing),
      totalInteractors: walletInteractions.length,
      categoryBreakdown: best.stats.categoryCounts || {},
      walletInteractions,
      riskScore: walletInteractions.length > 200 ? 70 : walletInteractions.length > 50 ? 40 : 10,
      scanDuration: best.scanDurationMs,
      keyPoolUsed: keys.length,
      successfulScans: successes.length,
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
