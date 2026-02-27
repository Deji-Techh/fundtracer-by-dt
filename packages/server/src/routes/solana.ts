// ============================================================
// FundTracer Server - Solana Routes
// API endpoints for Solana wallet analysis
// ============================================================

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { usageMiddleware } from '../middleware/usage.js';

const router = Router();

const HELIUS_KEYS = [
  process.env.HELIUS_KEY_1 || '77de5802-5beb-4647-bfbb-0ba215d47c81',
  process.env.HELIUS_KEY_2 || 'b81bcc20-7710-40dc-b0f3-0865c03a8a1d',
  process.env.HELIUS_KEY_3 || 'deae0411-c969-41ff-9420-f1a0f59d5639',
];

let keyIndex = 0;

function getHeliusKey(): string {
  const key = HELIUS_KEYS[keyIndex % HELIUS_KEYS.length];
  keyIndex++;
  return key;
}

function isValidSolanaAddress(address: string): boolean {
  if (!address) return false;
  if (address.length < 32 || address.length > 44) return false;
  const base58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  return [...address].every(c => base58Chars.includes(c));
}

// Get wallet info
router.get('/wallet/:address', authMiddleware, usageMiddleware, async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!isValidSolanaAddress(address)) {
      return res.status(400).json({ error: 'Invalid Solana address' });
    }

    const key = getHeliusKey();
    const url = `https://mainnet.helius-rpc.com/?api-key=${key}`;
    
    const [balanceRes, accountRes, sigsRes] = await Promise.all([
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBalance', params: [address] }),
      }).then(r => r.json()),
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getAccountInfo', params: [address, { encoding: 'jsonParsed' }] }),
      }).then(r => r.json()),
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getSignaturesForAddress', params: [address, { limit: 1 }] }),
      }).then(r => r.json()),
    ]);

    const isProgram = accountRes.value?.executable ?? false;
    const firstTx = sigsRes.value?.[0];

    res.json({
      address,
      chain: 'solana',
      balance: (balanceRes.value / 1e9).toString(),
      nativeSymbol: 'SOL',
      isContract: isProgram,
      firstSeen: firstTx?.blockTime ? firstTx.blockTime * 1000 : null,
    });
  } catch (error: any) {
    console.error('Solana wallet error:', error);
    res.status(500).json({ error: 'Failed to fetch wallet info' });
  }
});

// Get transactions
router.get('/transactions/:address', authMiddleware, usageMiddleware, async (req, res) => {
  try {
    const { address } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    
    if (!isValidSolanaAddress(address)) {
      return res.status(400).json({ error: 'Invalid Solana address' });
    }

    const key = getHeliusKey();
    const url = `https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${key}&limit=${limit}`;

    const txs = await fetch(url).then(r => r.json());
    res.json({ transactions: txs });
  } catch (error: any) {
    console.error('Solana transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get token balances
router.get('/tokens/:address', authMiddleware, usageMiddleware, async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!isValidSolanaAddress(address)) {
      return res.status(400).json({ error: 'Invalid Solana address' });
    }

    const key = getHeliusKey();
    const url = `https://mainnet.helius-rpc.com/?api-key=${key}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'token-balances',
        method: 'searchAssets',
        params: {
          ownerAddress: address,
          tokenType: 'fungible',
          displayOptions: { showNativeBalance: true },
        },
      }),
    }).then(r => r.json());

    res.json({ tokens: response.result?.items || [] });
  } catch (error: any) {
    console.error('Solana tokens error:', error);
    res.status(500).json({ error: 'Failed to fetch token balances' });
  }
});

// Get risk score (basic)
router.get('/risk/:address', authMiddleware, usageMiddleware, async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!isValidSolanaAddress(address)) {
      return res.status(400).json({ error: 'Invalid Solana address' });
    }

    const key = getHeliusKey();
    const url = `https://mainnet.helius-rpc.com/?api-key=${key}`;
    
    const [balanceRes, sigsRes] = await Promise.all([
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBalance', params: [address] }),
      }).then(r => r.json()),
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getSignaturesForAddress', params: [address, { limit: 100 }] }),
      }).then(r => r.json()),
    ]);

    const signals: any[] = [];
    let score = 0;

    const balance = balanceRes.value / 1e9;
    if (balance < 0.01) {
      score += 5;
      signals.push({ id: 'low_balance', name: 'Near-Zero SOL Balance', detected: true, severity: 'low' });
    }

    const firstTx = sigsRes.value?.[0];
    if (firstTx?.blockTime) {
      const age = Date.now() - firstTx.blockTime * 1000;
      if (age < 30 * 24 * 60 * 60 * 1000) {
        score += 10;
        signals.push({ id: 'new_wallet', name: 'Wallet Created Recently', detected: true, severity: 'medium' });
      }
    }

    res.json({
      score: Math.min(score, 100),
      signals,
      chain: 'solana',
    });
  } catch (error: any) {
    console.error('Solana risk error:', error);
    res.status(500).json({ error: 'Failed to calculate risk score' });
  }
});

export const solanaRoutes = router;
