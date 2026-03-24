import { Router, Request, Response } from 'express';
import { moralisService } from '../services/MoralisService.js';
import { coinGeckoService } from '../services/CoinGeckoService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/portfolio/:walletAddress
router.get('/:walletAddress', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;
    const chain = (req.query.chain as string) || 'linea';

    console.log('[Portfolio] Request - wallet:', walletAddress, 'chain:', chain);
    console.log('[Portfolio] User:', req.user);

    if (!walletAddress || !walletAddress.startsWith('0x')) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    console.log('[Portfolio] Calling Moralis with chain:', chain);
    
    // Fetch tokens from Moralis
    const tokensData = await moralisService.getWalletTokens(walletAddress, chain);
    
    // Fetch NFTs from Moralis
    const nftsData = await moralisService.getWalletNFTs(walletAddress, chain);

    // Get token prices from CoinGecko (for common tokens)
    const tokenIds = tokensData.map((t: any) => t.symbol?.toLowerCase()).filter(Boolean);
    let pricesData = {};
    
    if (tokenIds.length > 0) {
      try {
        pricesData = await coinGeckoService.getTokenPrices(tokenIds.slice(0, 10)); // Limit to 10 tokens
      } catch (priceError) {
        console.warn('[Portfolio Route] Failed to fetch prices:', priceError);
      }
    }

    // Calculate total value
    let totalValue = 0;
    const tokens = tokensData.map((token: any) => {
      const price = pricesData[token.symbol?.toLowerCase()]?.usd || 0;
      const value = (parseFloat(token.balance) / Math.pow(10, token.decimals || 18)) * price;
      totalValue += value;

      return {
        address: token.token_address,
        symbol: token.symbol,
        name: token.name,
        balance: token.balance,
        decimals: token.decimals,
        price: price,
        value: value,
        logoUrl: token.logo,
      };
    });

    // Format NFTs
    const nfts = nftsData.map((nft: any) => ({
      contractAddress: nft.token_address,
      tokenId: nft.token_id,
      name: nft.name,
      imageUrl: nft.image,
      collectionName: nft.collection_name,
    }));

    res.json({
      wallet: walletAddress,
      chain,
      totalValue,
      tokens,
      nfts,
      attribution: coinGeckoService.getAttribution(),
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Portfolio Route] Error:', error);
    console.error('[Portfolio Route] Stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch portfolio data',
      message: error.message || String(error),
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

// GET /api/portfolio/:walletAddress/nfts
router.get('/:walletAddress/nfts', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;
    const chain = (req.query.chain as string) || 'linea';

    const nftsData = await moralisService.getWalletNFTs(walletAddress, chain);
    
    const nfts = nftsData.map((nft: any) => ({
      contractAddress: nft.token_address,
      tokenId: nft.token_id,
      name: nft.name,
      imageUrl: nft.image,
      collectionName: nft.collection_name,
      metadata: nft.metadata,
    }));

    res.json({
      wallet: walletAddress,
      chain,
      nfts,
      count: nfts.length,
    });
  } catch (error: any) {
    console.error('[Portfolio Route] NFT Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch NFT data',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

export { router as portfolioRoutes };
