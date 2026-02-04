import { Router, Request, Response } from 'express';
import { moralisService } from '../../services/MoralisService';
import { ankrService } from '../../services/AnkrService';
import cacheControl from '../cacheControl';

const router = Router();

router.get('/:chain/:address', cacheControl.middleware, async (req: Request, res: Response) => {
  try {
    const { chain, address } = req.params;

    if (!address || !address.startsWith('0x')) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    let tokensData;
    try {
      tokensData = await moralisService.getWalletTokens(address, chain);
    } catch (moralisError) {
      console.warn('[Moralis Balance Proxy] Moralis failed, falling back to Ankr:', moralisError);
      const ankrBalance = await ankrService.getAccountBalance(address, chain);
      tokensData = {
        native: {
          balance: ankrBalance.balance || '0',
          symbol: ankrBalance.assetId || 'ETH',
          decimals: 18,
        },
        tokens: [],
      };
    }

    const tokens = (tokensData || []).map((token: any) => ({
      address: token.token_address || 'native',
      symbol: token.symbol || 'UNKNOWN',
      name: token.name || 'Unknown Token',
      balance: token.balance || '0',
      decimals: token.decimals || 18,
      logoUrl: token.logo,
    }));

    res.json({
      wallet: address,
      chain,
      tokens,
      count: tokens.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Moralis Balance Proxy] Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch token balances',
      message: error.message,
    });
  }
});

export { router as moralisBalanceRoutes };
