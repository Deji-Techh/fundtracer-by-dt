// ============================================================
// FundTracer Server - Solana Routes
// Complete Solana wallet analysis API
// ============================================================

import { Router, Response } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth.js';
import { usageMiddleware } from '../middleware/usage.js';
import { solanaPortfolioService } from '../services/SolanaPortfolioService.js';
import { torqueServiceV2 } from '../services/TorqueServiceV2.js';

const router = Router();

function isValidSolanaAddress(address: string): boolean {
  if (!address) return false;
  if (address.length < 32 || address.length > 44) return false;
  const base58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  return Array.from(address).every(c => base58Chars.includes(c));
}

// GET /api/solana/portfolio/:address - Full portfolio view
// Query params: exclude_spam_tokens=true/false, exclude_unpriced=true/false, min_liquidity=number
router.get('/portfolio/:address', authMiddleware, usageMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { address } = req.params;
    const userId = req.user?.uid;
    const { exclude_spam_tokens, exclude_unpriced, min_liquidity } = req.query;
    
    if (!isValidSolanaAddress(address)) {
      return res.status(400).json({ error: 'Invalid Solana address' });
    }

    const filterOptions: any = {};
    if (exclude_spam_tokens === 'true') filterOptions.excludeSpamTokens = true;
    if (exclude_unpriced === 'true') filterOptions.excludeUnpriced = true;
    if (min_liquidity) filterOptions.minLiquidity = parseInt(min_liquidity as string);

    const portfolio = await solanaPortfolioService.getPortfolio(address, 
      Object.keys(filterOptions).length > 0 ? filterOptions : undefined
    );
    
    // Add to Torque leaderboard and activity (if authenticated)
    if (userId) {
      const displayName = req.user?.name || 'User';
      await torqueServiceV2.incrementScan(userId, displayName).catch(() => {});
      await torqueServiceV2.addActivity(userId, displayName, address, 'solana').catch(() => {});
    }
    
    res.json(portfolio);
  } catch (error: any) {
    console.error('Solana portfolio error:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
});

// GET /api/solana/transactions/:address - Transaction history
router.get('/transactions/:address', authMiddleware, usageMiddleware, async (req, res) => {
  try {
    const { address } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    
    if (!isValidSolanaAddress(address)) {
      return res.status(400).json({ error: 'Invalid Solana address' });
    }

    const transactions = await solanaPortfolioService.getTransactions(address, limit);
    res.json({ transactions, count: transactions.length });
  } catch (error: any) {
    console.error('Solana transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// GET /api/solana/tokens/:address - Token holdings
router.get('/tokens/:address', authMiddleware, usageMiddleware, async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!isValidSolanaAddress(address)) {
      return res.status(400).json({ error: 'Invalid Solana address' });
    }

    const portfolio = await solanaPortfolioService.getPortfolio(address);
    res.json({ 
      sol: portfolio.sol, 
      tokens: portfolio.tokens, 
      totalUsd: portfolio.totalUsd 
    });
  } catch (error: any) {
    console.error('Solana tokens error:', error);
    res.status(500).json({ error: 'Failed to fetch tokens' });
  }
});

// GET /api/solana/nfts/:address - NFT holdings
router.get('/nfts/:address', authMiddleware, usageMiddleware, async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!isValidSolanaAddress(address)) {
      return res.status(400).json({ error: 'Invalid Solana address' });
    }

    const nfts = await solanaPortfolioService.getNFTs(address);
    res.json({ nfts, count: nfts.length });
  } catch (error: any) {
    console.error('Solana NFTs error:', error);
    res.status(500).json({ error: 'Failed to fetch NFTs' });
  }
});

// GET /api/solana/defi/:address - DeFi positions
router.get('/defi/:address', authMiddleware, usageMiddleware, async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!isValidSolanaAddress(address)) {
      return res.status(400).json({ error: 'Invalid Solana address' });
    }

    const positions = await solanaPortfolioService.getDeFiPositions(address);
    res.json({ positions, count: positions.length });
  } catch (error: any) {
    console.error('Solana DeFi error:', error);
    res.status(500).json({ error: 'Failed to fetch DeFi positions' });
  }
});

// GET /api/solana/risk/:address - Risk analysis
router.get('/risk/:address', authMiddleware, usageMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { address } = req.params;
    const userId = req.user?.uid;
    
    if (!isValidSolanaAddress(address)) {
      return res.status(400).json({ error: 'Invalid Solana address' });
    }

    const risk = await solanaPortfolioService.getRiskAnalysis(address);
    
    // Add to Torque leaderboard and activity (if authenticated)
    if (userId) {
      const displayName = req.user?.name || 'User';
      await torqueServiceV2.incrementScan(userId, displayName).catch(() => {});
      await torqueServiceV2.addActivity(userId, displayName, address, 'solana').catch(() => {});
    }
    
    res.json(risk);
  } catch (error: any) {
    console.error('Solana risk error:', error);
    res.status(500).json({ error: 'Failed to calculate risk score' });
  }
});

// GET /api/solana/wallet/:address - Basic wallet info (non-auth for public)
router.get('/wallet/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!isValidSolanaAddress(address)) {
      return res.status(400).json({ error: 'Invalid Solana address' });
    }

    const portfolio = await solanaPortfolioService.getPortfolio(address);
    res.json({
      address,
      chain: 'solana',
      sol: portfolio.sol.sol,
      totalUsd: portfolio.totalUsd,
      tokenCount: portfolio.tokens.length,
      nftCount: 0,
    });
  } catch (error: any) {
    console.error('Solana wallet error:', error);
    res.status(500).json({ error: 'Failed to fetch wallet info' });
  }
});

// GET /api/solana/analytics/:address - Dune analytics & whale tracking
router.get('/analytics/:address', authMiddleware, usageMiddleware, async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!isValidSolanaAddress(address)) {
      return res.status(400).json({ error: 'Invalid Solana address' });
    }

    const { DuneService } = await import('../services/DuneService.js');
    const duneService = new DuneService();

    // Get portfolio history from Dune
    const history = [];
    
    res.json({
      history,
      whaleActivity: [],
      tokenAllocation: [],
    });
  } catch (error: any) {
    console.error('Solana analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// GET /api/solana/history/:address - Portfolio history over time
router.get('/history/:address', authMiddleware, usageMiddleware, async (req, res) => {
  try {
    const { address } = req.params;
    const range = req.query.range as string || '30d';
    
    if (!isValidSolanaAddress(address)) {
      return res.status(400).json({ error: 'Invalid Solana address' });
    }

    // Mock historical data (would come from Dune/analytics)
    const portfolio = await solanaPortfolioService.getPortfolio(address);
    const currentValue = portfolio.totalUsd;
    
    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365;
    const changePercent = (Math.random() * 30 - 15); // Mock
    
    const history = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - i - 1));
      return {
        date: date.toISOString().split('T')[0],
        value: currentValue * (0.7 + Math.random() * 0.3),
      };
    });

    res.json({
      history,
      summary: {
        currentValue,
        changePercent,
        highest: Math.max(...history.map(h => h.value)),
        lowest: Math.min(...history.map(h => h.value)),
      },
    });
  } catch (error: any) {
    console.error('Solana history error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// GET /api/solana/alerts/:address - Token alerts & market intel
router.get('/alerts/:address', authMiddleware, usageMiddleware, async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!isValidSolanaAddress(address)) {
      return res.status(400).json({ error: 'Invalid Solana address' });
    }

    // Mock alerts
    const alerts = [
      { id: '1', type: 'price', message: 'SOL moved more than 5%', token: 'SOL', createdAt: Date.now() - 3600000 },
      { id: '2', type: 'token', message: 'New token detected in wallet', token: 'UNKNOWN', createdAt: Date.now() - 7200000 },
    ];

    // Trending tokens
    const trending = [
      { symbol: 'SOL', name: 'Solana', change24h: 5.2, volume: 1500000000 },
      { symbol: 'BONK', name: 'Bonk', change24h: 12.4, volume: 50000000 },
      { symbol: 'JUP', name: 'Jupiter', change24h: -2.1, volume: 80000000 },
    ];

    res.json({ alerts, trending });
  } catch (error: any) {
    console.error('Solana alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// GET /api/solana/tax/:address - Tax positions with cost basis
router.get('/tax/:address', authMiddleware, usageMiddleware, async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!isValidSolanaAddress(address)) {
      return res.status(400).json({ error: 'Invalid Solana address' });
    }

    const portfolio = await solanaPortfolioService.getPortfolio(address);
    
    // Mock tax positions with FIFO cost basis
    const positions = portfolio.tokens.map(token => ({
      token: token.symbol || token.mint.slice(0, 8),
      quantity: token.uiAmount,
      costBasis: (token.uiAmount * (token.price || 0) * 0.8), // Mock 80% of current value as cost
      currentValue: token.value || 0,
      pnl: (token.value || 0) - (token.uiAmount * (token.price || 0) * 0.8),
      entryPrice: (token.price || 0) * 0.8,
      exitPrice: token.price || 0,
    }));

    // Add SOL position
    positions.unshift({
      token: 'SOL',
      quantity: portfolio.sol.sol,
      costBasis: portfolio.sol.usd * 0.85,
      currentValue: portfolio.sol.usd,
      pnl: portfolio.sol.usd * 0.15,
      entryPrice: portfolio.sol.usd * 0.85 / portfolio.sol.sol,
      exitPrice: portfolio.sol.usd / portfolio.sol.sol,
    });

    const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0);
    const realizedGains = totalPnl * 0.7;
    const unrealizedGains = totalPnl * 0.3;

    res.json({
      positions,
      summary: {
        totalPnl,
        realizedGains,
        unrealizedGains,
        costBasis: positions.reduce((sum, p) => sum + p.costBasis, 0),
      },
    });
  } catch (error: any) {
    console.error('Solana tax error:', error);
    res.status(500).json({ error: 'Failed to calculate tax positions' });
  }
});

// GET /api/solana/compare/:address1/:address2 - Compare two Solana wallets
router.get('/compare/:address1/:address2', authMiddleware, usageMiddleware, async (req, res) => {
  try {
    const { address1, address2 } = req.params;
    
    if (!isValidSolanaAddress(address1) || !isValidSolanaAddress(address2)) {
      return res.status(400).json({ error: 'Invalid Solana address' });
    }

    const [portfolio1, portfolio2, txs1, txs2] = await Promise.all([
      solanaPortfolioService.getPortfolio(address1),
      solanaPortfolioService.getPortfolio(address2),
      solanaPortfolioService.getTransactions(address1, 100),
      solanaPortfolioService.getTransactions(address2, 100),
    ]);

    const tokens1 = new Set(portfolio1.tokens.map(t => t.mint));
    const tokens2 = new Set(portfolio2.tokens.map(t => t.mint));
    const commonTokens = Array.from(tokens1).filter(t => tokens2.has(t)).length;

    const sigs1 = new Set(txs1.map(t => t.signature));
    const sharedTxs = txs2.filter(t => sigs1.has(t.signature)).length;

    res.json({
      wallet1: { address: address1, totalUsd: portfolio1.totalUsd },
      wallet2: { address: address2, totalUsd: portfolio2.totalUsd },
      commonTokens,
      sharedTxs,
      firstCommon: sharedTxs > 0 ? 'Found' : 'None',
    });
  } catch (error: any) {
    console.error('Solana compare error:', error);
    res.status(500).json({ error: 'Failed to compare wallets' });
  }
});

export const solanaRoutes = router;