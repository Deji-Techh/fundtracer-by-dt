import { Router } from 'express';
import { ContractScanner } from '../services/contractScanner.js';

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

export default router;
