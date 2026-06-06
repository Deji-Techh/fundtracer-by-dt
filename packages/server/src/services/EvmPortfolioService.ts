// ============================================================
// FundTracer by DT - EVM Portfolio Service (Alchemy-powered)
// Replaces Dune SIM for EVM portfolio data
// ============================================================

import { cache } from '../utils/cache.js';

const DEFAULT_ALCHEMY_KEY = process.env.DEFAULT_ALCHEMY_API_KEY || process.env.ALCHEMY_API_KEY || '';

const CHAIN_TO_ALCHEMY_NETWORK: Record<string, string> = {
  ethereum: 'eth-mainnet', eth: 'eth-mainnet',
  linea: 'linea-mainnet',
  arbitrum: 'arb-mainnet', arb: 'arb-mainnet',
  base: 'base-mainnet',
  optimism: 'opt-mainnet', opt: 'opt-mainnet',
  polygon: 'polygon-mainnet', matic: 'polygon-mainnet',
  bsc: 'bsc-mainnet',
};

const CHAIN_TO_COINGECKO_PLATFORM: Record<string, string> = {
  ethereum: 'ethereum', eth: 'ethereum',
  linea: 'linea',
  arbitrum: 'arbitrum-one', arb: 'arbitrum-one',
  base: 'base',
  optimism: 'optimistic-ethereum', opt: 'optimistic-ethereum',
  polygon: 'polygon-pos', matic: 'polygon-pos',
  bsc: 'binance-smart-chain',
};

// Well-known stablecoin addresses per chain (lowercase)
const STABLECOIN_ADDRESSES: Record<string, string[]> = {
  ethereum: [
    '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
    '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
    '0x853d955acef822db058eb8505911ed77f175b99e', // FRAX
    '0x8e870d67f660d95d5be530380d0ec0bd388289e1', // USDP
    '0x1c48f86ae57291f7686349f12601910f2c07207b', // USD0
  ],
  linea: [
    '0x176211869ca2b568f2a7d4ee941e073a821ee1ff', // USDC
    '0xa219439258ca9da29e9cc4ce5596924745e12b93', // USDT
  ],
  arbitrum: [
    '0xaf88d065e77c8cc2239327c5edb3a432268e5831', // USDC
    '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9', // USDT
    '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1', // DAI
  ],
  base: [
    '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', // USDC
    '0x50c5725949a6f0c72e6c4a641f24049a917db0cb', // DAI
  ],
  optimism: [
    '0x0b2c639c533813f4aa9d7837caf62653d097ff85', // USDC
    '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58', // USDT
    '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1', // DAI
  ],
  polygon: [
    '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359', // USDC
    '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', // USDT
    '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063', // DAI
  ],
  bsc: [
    '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', // USDC
    '0x55d398326f99059ff775485246999027b3197955', // USDT
    '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3', // DAI
  ],
};

function getAlchemyNetwork(chain: string): string {
  return CHAIN_TO_ALCHEMY_NETWORK[chain.toLowerCase()] || 'eth-mainnet';
}

function getCoinGeckoPlatform(chain: string): string {
  return CHAIN_TO_COINGECKO_PLATFORM[chain.toLowerCase()] || 'ethereum';
}

function getRpcUrl(chain: string): string {
  const network = getAlchemyNetwork(chain);
  return `https://${network}.g.alchemy.com/v2/${DEFAULT_ALCHEMY_KEY}`;
}

async function alchemyRpc(chain: string, method: string, params: any[]): Promise<any> {
  const url = getRpcUrl(chain);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Alchemy RPC error: ${data.error.message}`);
  return data.result;
}

// -------------------------------------------------------
// Price fetching (CoinGecko)
// -------------------------------------------------------
const priceCache = new Map<string, { price: number; ts: number }>();

async function getBatchPrices(chain: string, addresses: string[]): Promise<Record<string, number>> {
  if (addresses.length === 0) return {};

  const platform = getCoinGeckoPlatform(chain);
  const now = Date.now();
  const uncached = addresses.filter(a => {
    const entry = priceCache.get(a.toLowerCase());
    return !entry || now - entry.ts > 60000;
  });

  if (uncached.length > 0) {
    // Batch in groups of 100 (CoinGecko limit per request)
    for (let i = 0; i < uncached.length; i += 100) {
      const batch = uncached.slice(i, i + 100);
      try {
        const ids = batch.join(',');
        const url = `https://api.coingecko.com/api/v3/simple/token_price/${platform}?contract_addresses=${ids}&vs_currencies=usd`;
        const res = await fetch(url, { headers: { 'accept': 'application/json' } });
        const data = await res.json();
        for (const [addr, info] of Object.entries(data)) {
          priceCache.set(addr.toLowerCase(), { price: (info as any).usd || 0, ts: now });
        }
        // Mark addresses not in response as zero-price
        for (const addr of batch) {
          if (!data[addr.toLowerCase()]) {
            priceCache.set(addr.toLowerCase(), { price: 0, ts: now });
          }
        }
      } catch (e) {
        console.warn('[EvmPortfolio] CoinGecko price fetch failed:', e);
      }
    }
  }

  const prices: Record<string, number> = {};
  for (const addr of addresses) {
    prices[addr.toLowerCase()] = priceCache.get(addr.toLowerCase())?.price || 0;
  }
  return prices;
}

// -------------------------------------------------------
// NFT fetching
// -------------------------------------------------------
const NFT_UNSUPPORTED_CHAINS = new Set(['linea', 'base', 'bsc']);

async function fetchNftsFromAlchemy(
  address: string, chain: string, filterSpam: boolean
): Promise<Array<{ contract_address: string; token_id: string; name: string; image_url?: string; collection: string; is_spam: boolean }>> {
  const network = getAlchemyNetwork(chain).replace('-mainnet', '');
  const url = `https://${network}.g.alchemy.com/nft/v3/${DEFAULT_ALCHEMY_KEY}/getNFTsForOwner?owner=${address}&withMetadata=true&pageSize=100`;

  try {
    const res = await fetch(url, { headers: { 'accept': 'application/json' } });
    const data = await res.json();
    const owned = data.ownedNfts || [];

    return owned.map((nft: any) => {
      const isSpam = filterSpam && (!nft.name || nft.name.includes('Unnamed'));
      return {
        contract_address: nft.contract?.address || '',
        token_id: nft.tokenId || nft.id?.tokenId || '',
        name: nft.name || nft.title || 'Unknown',
        image_url: nft.image?.thumbnailUrl || nft.media?.[0]?.gateway || nft.image?.cachedUrl,
        collection: nft.contract?.name || nft.collection?.name || '',
        is_spam: isSpam,
      };
    }).filter((n: any) => !filterSpam || !n.is_spam);
  } catch (e) {
    console.warn('[EvmPortfolio] NFT fetch failed:', e);
    return [];
  }
}

// -------------------------------------------------------
// Public API
// -------------------------------------------------------

export interface EvmPortfolioOptions {
  includeNfts?: boolean;
  includeActivity?: boolean;
  includeStablecoins?: boolean;
  excludeSpamTokens?: boolean;
  excludeUnpriced?: boolean;
}

export interface EvmBalanceResult {
  balances: Array<{
    address: string;
    amount: string;
    symbol: string;
    name: string;
    decimals: number;
    price_usd: number;
    value_usd: number;
    pool_size?: number;
    low_liquidity?: boolean;
    token_metadata?: { logo?: string };
  }>;
  next_offset?: string;
}

export class EvmPortfolioService {

  async getEvmBalances(
    address: string,
    options: { chainIds?: number | number[]; excludeSpamTokens?: boolean; excludeUnpriced?: boolean; metadata?: string } = {}
  ): Promise<EvmBalanceResult> {
    const chain = this.chainIdToName(options.chainIds);
    const cacheKey = `evm:balances:${address}:${chain}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached as EvmBalanceResult;

    // Native balance
    let nativeBalance = '0';
    try {
      nativeBalance = await alchemyRpc(chain, 'eth_getBalance', [address, 'latest']);
    } catch (e) {
      console.warn('[EvmPortfolio] Native balance fetch failed:', e);
    }

    // Token balances
    let tokenBalances: any[] = [];
    try {
      const result = await alchemyRpc(chain, 'alchemy_getTokenBalances', [address]);
      tokenBalances = (result?.tokenBalances || []).filter((t: any) => t.tokenBalance && t.tokenBalance !== '0x0');
    } catch (e) {
      console.warn('[EvmPortfolio] Token balances fetch failed:', e);
    }

    // Token metadata (batch)
    const tokenContracts = tokenBalances.map((t: any) => t.contractAddress);
    const metadataMap = new Map<string, any>();
    if (tokenContracts.length > 0) {
      try {
        const batchCalls = tokenContracts.map(addr => ({
          jsonrpc: '2.0', id: 1, method: 'alchemy_getTokenMetadata', params: [addr],
        }));
        const url = getRpcUrl(chain);
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batchCalls),
        });
        const results = await res.json();
        if (Array.isArray(results)) {
          for (let i = 0; i < results.length; i++) {
            if (results[i]?.result) {
              metadataMap.set(tokenContracts[i].toLowerCase(), results[i].result);
            }
          }
        }
      } catch (e) {
        console.warn('[EvmPortfolio] Token metadata batch failed:', e);
      }
    }

    // Prices
    const prices = await getBatchPrices(chain, tokenContracts);

    // Assemble balances
    const balances: EvmBalanceResult['balances'] = [];
    const nativeWei = BigInt(nativeBalance === '0x' ? '0' : nativeBalance);
    const nativeEth = Number(nativeWei) / 1e18;

    // Get native token price (ETH, MATIC, BNB etc.)
    const nativeSymbol = chain === 'polygon' || chain === 'matic' ? 'POL' : chain === 'bsc' ? 'BNB' : 'ETH';
    let nativePrice = 0;
    try {
      const nativePlatform = getCoinGeckoPlatform(chain);
      const nativeId = chain === 'polygon' || chain === 'matic' ? 'matic-network' : chain === 'bsc' ? 'binancecoin' : 'ethereum';
      const priceRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${nativeId}&vs_currencies=usd`);
      const priceData = await priceRes.json();
      nativePrice = priceData[nativeId]?.usd || 0;
    } catch {}

    balances.push({
      address: 'native',
      amount: nativeBalance,
      symbol: nativeSymbol,
      name: nativeSymbol,
      decimals: 18,
      price_usd: nativePrice,
      value_usd: nativeEth * nativePrice,
    });

    for (const t of tokenBalances) {
      const addr = t.contractAddress;
      const meta = metadataMap.get(addr.toLowerCase()) || {};
      const rawBalance = BigInt(t.tokenBalance || '0x0');
      const decimals = meta.decimals || 18;
      const formatted = Number(rawBalance) / Math.pow(10, decimals);
      const price = prices[addr.toLowerCase()] || 0;

      // Apply filters
      if (options.excludeUnpriced && price === 0) continue;
      if (options.excludeSpamTokens && !meta.name && !meta.symbol) continue;

      balances.push({
        address: addr,
        amount: t.tokenBalance,
        symbol: meta.symbol || '???',
        name: meta.name || addr.slice(0, 10) + '...',
        decimals,
        price_usd: price,
        value_usd: formatted * price,
        token_metadata: meta.logo ? { logo: meta.logo } : undefined,
      });
    }

    const result: EvmBalanceResult = { balances };
    cache.set(cacheKey, result, 30);
    return result;
  }

  async getEvmCollectibles(
    address: string,
    options: { chainIds?: number | number[]; filterSpam?: boolean; showSpamScores?: boolean; limit?: number } = {}
  ): Promise<{ entries: Array<{ contract_address: string; token_id: string; name: string; image_url?: string; symbol?: string; description?: string; metadata?: any; is_spam: boolean; spam_score?: number; balance: string; last_acquired: string }>; next_offset?: string }> {
    const chain = this.chainIdToName(options.chainIds);
    const cacheKey = `evm:nfts:${address}:${chain}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached as any;

    if (NFT_UNSUPPORTED_CHAINS.has(chain)) {
      return { entries: [] };
    }

    const nfts = await fetchNftsFromAlchemy(address, chain, options.filterSpam ?? true);

    const entries = nfts.map(n => ({
      contract_address: n.contract_address,
      token_id: n.token_id,
      name: n.name,
      image_url: n.image_url,
      symbol: n.collection,
      description: '',
      metadata: {},
      is_spam: n.is_spam,
      spam_score: n.is_spam ? 100 : 0,
      balance: '1',
      last_acquired: '',
    }));

    const result = { entries, next_offset: undefined };
    cache.set(cacheKey, result, 300);
    return result;
  }

  async getEvmActivity(
    address: string,
    options: { chainIds?: number | number[]; activityType?: string; limit?: number } = {}
  ): Promise<{ activity: Array<{ chain_id: number; block_number: number; block_time: string; tx_hash: string; type: string; asset_type: string; token_address?: string; from?: string; to?: string; value: string; value_usd: number; token_metadata?: any; function?: any }>; next_offset?: string }> {
    const chain = this.chainIdToName(options.chainIds);
    const limit = options.limit || 50;
    const cacheKey = `evm:activity:${address}:${chain}:${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached as any;

    try {
      const result = await alchemyRpc(chain, 'alchemy_getAssetTransfers', [{
        fromBlock: '0x0',
        toBlock: 'latest',
        fromAddress: address,
        toAddress: address,
        category: ['external', 'erc20', 'erc721', 'erc1155'],
        withMetadata: true,
        maxCount: `0x${limit.toString(16)}`,
      }]);

      const transfers = result?.transfers || [];
      const activity = transfers.map((t: any) => {
        const isOutgoing = t.from?.toLowerCase() === address.toLowerCase();
        return {
          chain_id: this.chainNameToId(chain),
          block_number: parseInt(t.blockNum || '0', 16),
          block_time: t.metadata?.blockTimestamp || new Date().toISOString(),
          tx_hash: t.hash || t.uniqueId,
          type: isOutgoing ? 'send' : 'receive',
          asset_type: t.category || 'external',
          token_address: t.asset || t.rawContract?.address,
          from: t.from,
          to: t.to,
          value: t.value?.toString() || '0',
          value_usd: 0,
          token_metadata: t.asset ? { symbol: t.asset } : undefined,
        };
      });

      const resultObj = { activity, next_offset: undefined };
      cache.set(cacheKey, resultObj, 60);
      return resultObj;
    } catch (e) {
      console.warn('[EvmPortfolio] Activity fetch failed:', e);
      return { activity: [] };
    }
  }

  async getEvmStablecoins(
    address: string,
    options: { chainIds?: number | number[]; excludeUnpriced?: boolean } = {}
  ): Promise<{ balances: Array<{ address: string; amount: string; symbol: string; name: string; decimals: number; price_usd: number; value_usd: number }> }> {
    const chain = this.chainIdToName(options.chainIds);
    const knownStablecoins = STABLECOIN_ADDRESSES[chain] || STABLECOIN_ADDRESSES.ethereum;

    // Fetch balances for known stablecoin addresses
    const balances: any[] = [];
    try {
      const result = await alchemyRpc(chain, 'alchemy_getTokenBalances', [address, knownStablecoins]);
      const tokenBalances = result?.tokenBalances || [];

      const metadataMap = new Map<string, any>();
      const batchCalls = knownStablecoins.map(addr => ({
        jsonrpc: '2.0', id: 1, method: 'alchemy_getTokenMetadata', params: [addr],
      }));
      try {
        const url = getRpcUrl(chain);
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batchCalls),
        });
        const results = await res.json();
        if (Array.isArray(results)) {
          for (let i = 0; i < results.length; i++) {
            if (results[i]?.result) {
              metadataMap.set(knownStablecoins[i].toLowerCase(), results[i].result);
            }
          }
        }
      } catch {}

      for (const t of tokenBalances) {
        if (!t.tokenBalance || t.tokenBalance === '0x0') continue;
        const addr = t.contractAddress;
        const meta = metadataMap.get(addr.toLowerCase()) || {};
        const decimals = meta.decimals || 6;
        const rawBalance = BigInt(t.tokenBalance);
        const formatted = Number(rawBalance) / Math.pow(10, decimals);

        balances.push({
          address: addr,
          amount: t.tokenBalance,
          symbol: meta.symbol || '???',
          name: meta.name || '',
          decimals,
          price_usd: 1,
          value_usd: formatted,
        });
      }
    } catch (e) {
      console.warn('[EvmPortfolio] Stablecoins fetch failed:', e);
    }

    return { balances };
  }

  async getEvmPortfolio(
    address: string,
    chainId: number = 1,
    options: EvmPortfolioOptions = {}
  ): Promise<{
    address: string;
    chain_id: number;
    total_value_usd: number;
    native: { balance: string; value_usd: number; symbol: string };
    tokens: Array<{ address: string; balance: string; value_usd: number; symbol: string; name: string; decimals: number; price_usd: number; pool_size?: number; low_liquidity?: boolean; logo?: string }>;
    stablecoins: Array<{ address: string; balance: string; value_usd: number; symbol: string }>;
    nfts?: Array<{ contract_address: string; token_id: string; name: string; image_url?: string; collection: string; is_spam: boolean }>;
    activity_summary?: { total_sends: number; total_receives: number; total_volume_usd: number };
    last_updated: string;
  }> {
    const chain = this.chainIdToName(chainId);

    const balancesResult = await this.getEvmBalances(address, {
      chainIds: chainId,
      excludeSpamTokens: options.excludeSpamTokens,
      excludeUnpriced: options.excludeUnpriced,
      metadata: 'logo',
    });

    let totalValue = 0;
    const tokens: any[] = [];
    let nativeBalance = '0';
    let nativeValue = 0;
    let nativeSymbol = 'ETH';

    for (const bal of balancesResult.balances || []) {
      totalValue += bal.value_usd || 0;

      if (bal.address === 'native') {
        nativeBalance = bal.amount;
        nativeValue = bal.value_usd || 0;
        nativeSymbol = bal.symbol;
      } else {
        tokens.push({
          address: bal.address,
          balance: bal.balance || bal.amount,
          value_usd: bal.value_usd || 0,
          symbol: bal.symbol,
          name: bal.name,
          decimals: bal.decimals,
          price_usd: bal.price_usd || 0,
          pool_size: bal.pool_size,
          low_liquidity: bal.low_liquidity,
          logo: bal.token_metadata?.logo,
        });
      }
    }

    // Stablecoins (optional)
    const stablecoinsList: any[] = [];
    if (options.includeStablecoins) {
      try {
        const stableResult = await this.getEvmStablecoins(address, { chainIds: chainId });
        for (const bal of stableResult.balances || []) {
          stablecoinsList.push({
            address: bal.address,
            balance: bal.balance || bal.amount,
            value_usd: bal.value_usd || 0,
            symbol: bal.symbol,
          });
        }
      } catch (e) {
        console.warn('[EvmPortfolio] Stablecoins fetch failed:', e);
      }
    }

    // NFTs (optional)
    const nftList: any[] = [];
    if (options.includeNfts) {
      try {
        const nftResult = await this.getEvmCollectibles(address, { chainIds: chainId, filterSpam: true });
        for (const nft of nftResult.entries || []) {
          nftList.push({
            contract_address: nft.contract_address,
            token_id: nft.token_id,
            name: nft.name,
            image_url: nft.image_url,
            collection: nft.symbol || nft.name,
            is_spam: nft.is_spam,
          });
        }
      } catch (e) {
        console.warn('[EvmPortfolio] Collectibles fetch failed:', e);
      }
    }

    // Activity summary (optional)
    let activitySummary: { total_sends: number; total_receives: number; total_volume_usd: number } | undefined;
    if (options.includeActivity) {
      try {
        const activityResult = await this.getEvmActivity(address, { chainIds: chainId, limit: 100 });
        let sends = 0, receives = 0, volume = 0;

        for (const act of activityResult.activity || []) {
          if (act.type === 'send') sends++;
          if (act.type === 'receive') receives++;
          volume += act.value_usd || 0;
        }

        activitySummary = { total_sends: sends, total_receives: receives, total_volume_usd: volume };
      } catch (e) {
        console.warn('[EvmPortfolio] Activity fetch failed:', e);
      }
    }

    return {
      address,
      chain_id: chainId,
      total_value_usd: totalValue,
      native: { balance: nativeBalance, value_usd: nativeValue, symbol: nativeSymbol },
      tokens,
      stablecoins: options.includeStablecoins ? stablecoinsList : [],
      nfts: options.includeNfts ? nftList : undefined,
      activity_summary: options.includeActivity ? activitySummary : undefined,
      last_updated: new Date().toISOString(),
    };
  }

  // --- helpers ---

  private chainIdToName(chainIds?: number | number[]): string {
    const id = Array.isArray(chainIds) ? chainIds[0] : chainIds;
    const map: Record<number, string> = {
      1: 'ethereum', 59144: 'linea', 42161: 'arbitrum',
      8453: 'base', 10: 'optimism', 137: 'polygon', 56: 'bsc',
    };
    return map[id ?? 59144] || 'linea';
  }

  private chainNameToId(chain: string): number {
    const map: Record<string, number> = {
      ethereum: 1, eth: 1, linea: 59144, arbitrum: 42161, arb: 42161,
      base: 8453, optimism: 10, opt: 10, polygon: 137, matic: 137, bsc: 56,
    };
    return map[chain.toLowerCase()] || 59144;
  }
}

export const evmPortfolioService = new EvmPortfolioService();
