import { Router, Response } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth.js';
import { getSybilAlchemyKeys } from '../utils/alchemyKeys.js';

const router = Router();

const CHAIN_TO_SUBDOMAIN: Record<string, string> = {
  ethereum: 'eth-mainnet',
  linea: 'linea-mainnet',
  arbitrum: 'arb-mainnet',
  optimism: 'opt-mainnet',
  polygon: 'polygon-mainnet',
  base: 'base-mainnet',
  solana: 'solana-mainnet',
};

let keyIndex = 0;

function getNextKey(): string {
  const keys = getSybilAlchemyKeys();
  const allKeys = [...keys.walletKeys, ...keys.contractKeys];
  if (allKeys.length === 0) {
    if (keys.defaultKey) return keys.defaultKey;
    throw new Error('No Alchemy API keys configured');
  }
  const key = allKeys[keyIndex % allKeys.length];
  keyIndex++;
  return key;
}

// JSON-RPC proxy: POST /api/proxy/alchemy/:chain
router.post('/:chain', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { chain } = req.params;
    const subdomain = CHAIN_TO_SUBDOMAIN[chain.toLowerCase()];
    if (!subdomain) {
      return res.status(400).json({ error: `Unsupported chain: ${chain}` });
    }

    const apiKey = getNextKey();
    const alchemyUrl = `https://${subdomain}.g.alchemy.com/v2/${apiKey}`;

    const response = await fetch(alchemyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error('[Alchemy Proxy] Error:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to proxy Alchemy request' });
    }
  }
});

// NFT REST proxy: GET /api/proxy/alchemy/:chain/nft?owner=...&pageSize=...&withMetadata=...
router.get('/:chain/nft', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { chain } = req.params;
    const subdomain = CHAIN_TO_SUBDOMAIN[chain.toLowerCase()];
    if (!subdomain) {
      return res.status(400).json({ error: `Unsupported chain: ${chain}` });
    }

    const apiKey = getNextKey();
    const query = new URLSearchParams(req.query as Record<string, string>).toString();
    const alchemyUrl = `https://${subdomain}.g.alchemy.com/v2/${apiKey}/getNFTs?${query}`;

    const response = await fetch(alchemyUrl);
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error('[Alchemy Proxy NFT] Error:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to proxy Alchemy NFT request' });
    }
  }
});

export default router;
export { router as alchemyProxyRoutes };
