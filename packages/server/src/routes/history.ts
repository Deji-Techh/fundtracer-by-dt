import { Router, Request, Response } from 'express';
import { ankrService } from '../services/AnkrService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// POST /api/history
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { wallet, blockchain, pageToken, filters } = req.body;

    if (!wallet || !wallet.startsWith('0x')) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const chain = blockchain || 'linea';

    // Fetch transactions from Ankr
    const result = await ankrService.getTransactionsByAddress(wallet, chain, pageToken);

    // Filter transactions if filters provided
    let transactions = result.transactions || [];
    
    if (filters) {
      if (filters.type && filters.type !== 'all') {
        transactions = transactions.filter((tx: any) => 
          tx.type?.toLowerCase() === filters.type.toLowerCase()
        );
      }
      
      if (filters.minAmount) {
        transactions = transactions.filter((tx: any) => {
          const amount = parseFloat(tx.value) / 1e18; // Convert from wei
          return amount >= filters.minAmount;
        });
      }
    }

    res.json({
      wallet,
      blockchain: chain,
      transactions: transactions.map((tx: any) => ({
        hash: tx.hash,
        timestamp: tx.timestamp,
        type: tx.type,
        status: tx.status,
        from: tx.from,
        to: tx.to,
        amount: tx.value,
        gasFee: tx.gasFee,
        blockNumber: tx.blockNumber,
      })),
      pagination: {
        pageToken: result.nextPageToken,
        hasMore: !!result.nextPageToken,
        count: transactions.length,
      },
    });
  } catch (error: any) {
    console.error('[History Route] Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch transaction history',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

export { router as historyRoutes };
