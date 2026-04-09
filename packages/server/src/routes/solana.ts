// ============================================================
// FundTracer Server - Solana Routes
// Complete Solana wallet analysis API
// ============================================================

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { usageMiddleware } from '../middleware/usage.js';
import { solanaPortfolioService } from '../services/SolanaPortfolioService.js';

const router = Router();

function isValidSolanaAddress(address: string): boolean {
  if (!address) return false;
  if (address.length < 32 || address.length > 44) return false;
  const base58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  return [...address].every(c => base58Chars.includes(c));
}

// GET /api/solana/portfolio/:address - Full portfolio view
router.get('/portfolio/:address', authMiddleware, usageMiddleware, async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!isValidSolanaAddress(address)) {
      return res.status(400).json({ error: 'Invalid Solana address' });
    }

    const portfolio = await solanaPortfolioService.getPortfolio(address);
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
router.get('/risk/:address', authMiddleware, usageMiddleware, async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!isValidSolanaAddress(address)) {
      return res.status(400).json({ error: 'Invalid Solana address' });
    }

    const risk = await solanaPortfolioService.getRiskAnalysis(address);
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

export const solanaRoutes = router;