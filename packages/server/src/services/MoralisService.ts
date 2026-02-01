import { cache } from '../utils/cache.js';

const MORALIS_API_KEY = process.env.MORALIS_API_KEY;
const MORALIS_BASE_URL = 'https://deep-index.moralis.io/api/v2';

export class MoralisService {
  private headers: HeadersInit;

  constructor() {
    if (!MORALIS_API_KEY) {
      console.warn('[MoralisService] No API key provided');
    }
    
    this.headers = {
      'accept': 'application/json',
      'X-API-Key': MORALIS_API_KEY || '',
    };
  }

  async getWalletTokens(address: string, chain: string = 'linea') {
    const cacheKey = `moralis:tokens:${address}:${chain}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `${MORALIS_BASE_URL}/${address}/erc20?chain=${chain}`,
        { headers: this.headers }
      );

      if (!response.ok) {
        throw new Error(`Moralis API error: ${response.status}`);
      }

      const data = await response.json();
      cache.set(cacheKey, data, 30); // 30 second cache
      return data;
    } catch (error) {
      console.error('[MoralisService] Error fetching tokens:', error);
      throw error;
    }
  }

  async getWalletNFTs(address: string, chain: string = 'linea') {
    const cacheKey = `moralis:nfts:${address}:${chain}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `${MORALIS_BASE_URL}/${address}/nft?chain=${chain}&format=decimal`,
        { headers: this.headers }
      );

      if (!response.ok) {
        throw new Error(`Moralis API error: ${response.status}`);
      }

      const data = await response.json();
      cache.set(cacheKey, data, 60); // 60 second cache
      return data;
    } catch (error) {
      console.error('[MoralisService] Error fetching NFTs:', error);
      throw error;
    }
  }

  async getTokenMetadata(address: string, chain: string = 'linea') {
    const cacheKey = `moralis:metadata:${address}:${chain}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `${MORALIS_BASE_URL}/erc20/metadata?chain=${chain}&addresses=${address}`,
        { headers: this.headers }
      );

      if (!response.ok) {
        throw new Error(`Moralis API error: ${response.status}`);
      }

      const data = await response.json();
      cache.set(cacheKey, data, 300); // 5 minute cache
      return data;
    } catch (error) {
      console.error('[MoralisService] Error fetching token metadata:', error);
      throw error;
    }
  }

  async searchTokens(query: string, chain: string = 'linea') {
    try {
      // Moralis doesn't have a direct search endpoint
      // We'll use token metadata endpoint as a workaround
      const response = await fetch(
        `${MORALIS_BASE_URL}/erc20/metadata?chain=${chain}&addresses=${query}`,
        { headers: this.headers }
      );

      if (!response.ok) {
        throw new Error(`Moralis API error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[MoralisService] Error searching tokens:', error);
      throw error;
    }
  }
}

export const moralisService = new MoralisService();
