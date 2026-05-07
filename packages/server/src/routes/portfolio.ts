import { Router, Request, Response } from 'express';
import { duneSimClient, EVM_CHAIN_IDS } from '../services/DuneSimClient.js';

const router = Router();

// GET /api/portfolio/:walletAddress
// Now uses Sim API (Dune) for EVM chains
router.get('/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;
    const chain = (req.query.chain as string) || 'linea';

    console.log('[Portfolio] Request - wallet:', walletAddress, 'chain:', chain);

    if (!walletAddress || !walletAddress.startsWith('0x')) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    // Get chain ID for Sim API
    const chainId = EVM_CHAIN_IDS[chain.toLowerCase()] || EVM_CHAIN_IDS[chain] || 59144; // Default to Linea

    console.log('[Portfolio] Fetching from Sim API - chainId:', chainId);

    // Fetch full portfolio using Sim API
    const portfolio = await duneSimClient.getEvmPortfolio(walletAddress, chainId, {
      includeNfts: true,
      includeStablecoins: true,
      includeActivity: true,
    });

    // Format response
    const tokens = portfolio.tokens.map(token => ({
      address: token.address,
      symbol: token.symbol,
      name: token.name,
      balance: token.balance,
      decimals: token.decimals,
      price: token.price_usd,
      value: token.value_usd,
      logoUrl: token.logo,
      poolSize: token.pool_size,
      lowLiquidity: token.low_liquidity,
    }));

    const nfts = (portfolio.nfts || []).map(nft => ({
      contractAddress: nft.contract_address,
      tokenId: nft.token_id,
      name: nft.name,
      imageUrl: nft.image_url,
      collectionName: nft.collection,
      isSpam: nft.is_spam,
    }));

    res.json({
      wallet: walletAddress,
      chain,
      chainId: portfolio.chain_id,
      totalValue: portfolio.total_value_usd,
      native: {
        balance: portfolio.native.balance,
        value: portfolio.native.value_usd,
        symbol: portfolio.native.symbol,
      },
      tokens,
      stablecoins: portfolio.stablecoins.map(sc => ({
        address: sc.address,
        symbol: sc.symbol,
        balance: sc.balance,
        value: sc.value_usd,
      })),
      nfts,
      activitySummary: portfolio.activity_summary,
      attribution: { text: 'Sim API (Dune)' },
      lastUpdated: portfolio.last_updated,
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

// GET /api/portfolio/:walletAddress/tokens - Just tokens
router.get('/:walletAddress/tokens', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;
    const chain = (req.query.chain as string) || 'linea';
    const excludeSpam = req.query.exclude_spam === 'true';
    const excludeUnpriced = req.query.exclude_unpriced === 'true';

    if (!walletAddress || !walletAddress.startsWith('0x')) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const chainId = EVM_CHAIN_IDS[chain.toLowerCase()] || EVM_CHAIN_IDS[chain] || 59144;

    const result = await duneSimClient.getEvmBalances(walletAddress, {
      chainIds: chainId,
      excludeSpamTokens: excludeSpam,
      excludeUnpriced: excludeUnpriced,
      metadata: 'logo',
    });

    // Separate native from tokens
    let nativeBalance = '0';
    let nativeValue = 0;
    const tokens: any[] = [];

    for (const bal of result.balances) {
      if (bal.address === 'native') {
        nativeBalance = bal.amount;
        nativeValue = bal.value_usd || 0;
      } else {
        tokens.push({
          address: bal.address,
          symbol: bal.symbol,
          name: bal.name,
          balance: bal.amount,
          decimals: bal.decimals,
          price: bal.price_usd,
          value: bal.value_usd,
          logo: bal.token_metadata?.logo,
          poolSize: bal.pool_size,
          lowLiquidity: bal.low_liquidity,
        });
      }
    }

    res.json({
      wallet: walletAddress,
      chain,
      chainId,
      native: { balance: nativeBalance, value: nativeValue },
      tokens,
      nextOffset: result.next_offset,
    });
  } catch (error: any) {
    console.error('[Portfolio Tokens Route] Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch tokens',
      message: error.message,
    });
  }
});

// GET /api/portfolio/:walletAddress/nfts
router.get('/:walletAddress/nfts', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;
    const chain = (req.query.chain as string) || 'linea';
    const showSpam = req.query.show_spam === 'true';

    if (!walletAddress || !walletAddress.startsWith('0x')) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const chainId = EVM_CHAIN_IDS[chain.toLowerCase()] || EVM_CHAIN_IDS[chain] || 59144;

    const result = await duneSimClient.getEvmCollectibles(walletAddress, {
      chainIds: chainId,
      filterSpam: !showSpam,
      showSpamScores: showSpam,
      limit: 100,
    });

    const nfts = result.entries.map(nft => ({
      contractAddress: nft.contract_address,
      tokenId: nft.token_id,
      name: nft.name,
      imageUrl: nft.image_url,
      collectionName: nft.symbol,
      description: nft.description,
      attributes: nft.metadata?.attributes,
      isSpam: nft.is_spam,
      spamScore: nft.spam_score,
      balance: nft.balance,
      lastAcquired: nft.last_acquired,
    }));

    res.json({
      wallet: walletAddress,
      chain,
      chainId,
      nfts,
      count: nfts.length,
      nextOffset: result.next_offset,
    });
  } catch (error: any) {
    console.error('[Portfolio NFTs Route] Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch NFTs',
      message: error.message,
    });
  }
});

// GET /api/portfolio/:walletAddress/activity
router.get('/:walletAddress/activity', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;
    const chain = (req.query.chain as string) || 'linea';
    const limit = parseInt(req.query.limit as string) || 50;
    const activityType = req.query.type as string; // send, receive, mint, burn, swap, approve, call

    if (!walletAddress || !walletAddress.startsWith('0x')) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const chainId = EVM_CHAIN_IDS[chain.toLowerCase()] || EVM_CHAIN_IDS[chain] || 59144;

    const result = await duneSimClient.getEvmActivity(walletAddress, {
      chainIds: chainId,
      activityType: activityType || undefined,
      limit,
    });

    const activities = result.activity.map(act => ({
      chainId: act.chain_id,
      blockNumber: act.block_number,
      blockTime: act.block_time,
      txHash: act.tx_hash,
      type: act.type,
      assetType: act.asset_type,
      tokenAddress: act.token_address,
      from: act.from,
      to: act.to,
      value: act.value,
      valueUsd: act.value_usd,
      tokenMetadata: act.token_metadata,
      function: act.function,
    }));

    res.json({
      wallet: walletAddress,
      chain,
      chainId,
      activities,
      count: activities.length,
      nextOffset: result.next_offset,
    });
  } catch (error: any) {
    console.error('[Portfolio Activity Route] Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch activity',
      message: error.message,
    });
  }
});

// GET /api/portfolio/:walletAddress/stablecoins
router.get('/:walletAddress/stablecoins', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;
    const chain = (req.query.chain as string) || 'linea';

    if (!walletAddress || !walletAddress.startsWith('0x')) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const chainId = EVM_CHAIN_IDS[chain.toLowerCase()] || EVM_CHAIN_IDS[chain] || 59144;

    const result = await duneSimClient.getEvmStablecoins(walletAddress, {
      chainIds: chainId,
      excludeUnpriced: true,
    });

    const stablecoins = result.balances.map(sc => ({
      address: sc.address,
      symbol: sc.symbol,
      name: sc.name,
      balance: sc.amount,
      decimals: sc.decimals,
      price: sc.price_usd,
      value: sc.value_usd,
    }));

    res.json({
      wallet: walletAddress,
      chain,
      chainId,
      stablecoins,
      totalValue: stablecoins.reduce((sum, sc) => sum + (sc.value || 0), 0),
    });
  } catch (error: any) {
    console.error('[Portfolio Stablecoins Route] Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch stablecoins',
      message: error.message,
    });
  }
});

export { router as portfolioRoutes };
