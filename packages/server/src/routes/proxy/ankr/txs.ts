import { Router, Request, Response } from 'express';
import { ankrService } from '../../services/AnkrService.js';
import cacheControl from '../cacheControl';

const router = Router();

router.get('/:chain/:address', cacheControl.middleware, async (req: Request, res: Response) => {
  try {
    const { chain, address } = req.params;
    const { pageToken, limit = '100' } = req.query;

    if (!address || !address.startsWith('0x')) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const result = await ankrService.getTransactionsByAddress(
      address,
      chain,
      pageToken
    );

    const transactions = (result.transactions || []).map((tx: any) => ({
      hash: tx.hash,
      timestamp: tx.timestamp,
      type: tx.type || 'unknown',
      status: tx.status || 'confirmed',
      from: tx.from,
      to: tx.to,
      value: tx.value,
      gasFee: tx.gasFee,
      blockNumber: tx.blockNumber,
      nonce: tx.nonce,
      input: tx.input,
      chainId: chain,
    }));

    res.json({
      wallet: address,
      chain,
      transactions,
      pagination: {
        pageToken: result.nextPageToken,
        hasMore: !!result.nextPageToken,
        count: transactions.length,
      },
      cached: false,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Ankr Txs Proxy] Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch transactions',
      message: error.message,
    });
  }
});

export { router as ankrTxsRoutes };
