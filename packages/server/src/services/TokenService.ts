/**
 * Token Service using Alchemy Token API
 * Replaces Moralis for portfolio token/NFT fetching
 */

import axios from 'axios';
import { cache } from '../utils/cache.js';

const DEFAULT_ALCHEMY_API_KEY = process.env.DEFAULT_ALCHEMY_API_KEY || process.env.ALCHEMY_API_KEY;

const CHAIN_TO_ALCHEMY: Record<string, string> = {
  ethereum: 'eth-mainnet',
  eth: 'eth-mainnet',
  linea: 'linea-mainnet',
  arbitrum: 'arb-mainnet',
  arb: 'arb-mainnet',
  base: 'base-mainnet',
  optimism: 'opt-mainnet',
  opt: 'opt-mainnet',
  polygon: 'polygon-mainnet',
  matic: 'polygon-mainnet',
  bsc: 'bsc-mainnet',
};

function getAlchemyNetwork(chain: string): string {
  return CHAIN_TO_ALCHEMY[chain.toLowerCase()] || 'linea-mainnet';
}

interface AlchemyToken {
  contractAddress: string;
  balance: string;
  decimals: number;
  name: string;
  symbol: string;
  logo?: string;
  balanceFormatted?: string;
}

interface AlchemyNFT {
  contract: { address: string };
  tokenId: string;
  name: string;
  description?: string;
  media: Array<{ gateway: string }>;
  tokenType: string;
}

export class TokenService {
  private getApiKey(): string {
    return DEFAULT_ALCHEMY_API_KEY || '';
  }

  async getWalletTokens(address: string, chain: string = 'linea') {
    const network = getAlchemyNetwork(chain);
    const cacheKey = `alchemy:tokens:${address}:${network}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('No Alchemy API key configured');
    }

    try {
      const response = await axios.post(
        `https://${network}.g.alchemy.com/v2/${apiKey}`,
        {
          jsonrpc: '2.0',
          method: 'alchemy_getTokenBalances',
          params: [address],
          id: 1,
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
      );

      if (response.data.error) {
        throw new Error(`Alchemy error: ${response.data.error.message}`);
      }

      const balances = response.data.result?.tokens || [];
      
      const tokens = balances
        .filter((t: AlchemyToken) => t.balance && t.balance !== '0')
        .map((t: AlchemyToken) => ({
          token_address: t.contractAddress,
          name: t.name,
          symbol: t.symbol,
          balance: t.balance,
          decimals: t.decimals || 18,
          logo: t.logo || null,
        }));

      cache.set(cacheKey, tokens, 30);
      return tokens;
    } catch (error: any) {
      console.error('[TokenService] Error fetching tokens:', error.message);
      throw error;
    }
  }

  async getWalletNFTs(address: string, chain: string = 'linea') {
    const network = getAlchemyNetwork(chain);
    const cacheKey = `alchemy:nfts:${address}:${network}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('No Alchemy API key configured');
    }

    // Linea and some chains don't support alchemy_getNfts - return empty gracefully
    const unsupportedChains = ['linea', 'bsc', 'avalanche_c', 'solana'];
    if (unsupportedChains.includes(chain.toLowerCase())) {
      console.warn(`[TokenService] NFT API not supported on ${chain}, returning empty`);
      return [];
    }

    try {
      const response = await axios.post(
        `https://${network}.g.alchemy.com/v2/${apiKey}`,
        {
          jsonrpc: '2.0',
          method: 'alchemy_getNfts',
          params: [
            address,
            { contractAddresses: [] }
          ],
          id: 1,
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
      );

      if (response.data.error) {
        throw new Error(`Alchemy error: ${response.data.error.message}`);
      }

      const nfts = (response.data.result?.ownedNfts || []).map((nft: AlchemyNFT) => ({
        token_address: nft.contract?.address || '',
        token_id: nft.tokenId,
        name: nft.name || 'Unknown NFT',
        description: nft.description || '',
        image: nft.media?.[0]?.gateway || '',
        token_type: nft.tokenType || 'erc721',
      }));

      cache.set(cacheKey, nfts, 60);
      return nfts;
    } catch (error: any) {
      console.error('[TokenService] Error fetching NFTs:', error.message);
      throw error;
    }
  }

  async getTokenMetadata(tokenAddress: string, chain: string = 'linea') {
    const network = getAlchemyNetwork(chain);
    const cacheKey = `alchemy:metadata:${tokenAddress}:${network}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('No Alchemy API key configured');
    }

    try {
      const response = await axios.post(
        `https://${network}.g.alchemy.com/v2/${apiKey}`,
        {
          jsonrpc: '2.0',
          method: 'alchemy_getTokenMetadata',
          params: [tokenAddress],
          id: 1,
        },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (response.data.error) {
        throw new Error(`Alchemy error: ${response.data.error.message}`);
      }

      const metadata = response.data.result;
      const result = {
        address: tokenAddress,
        name: metadata.name,
        symbol: metadata.symbol,
        decimals: metadata.decimals,
        logo: metadata.logo?.uri || null,
      };

      cache.set(cacheKey, result, 300);
      return result;
    } catch (error: any) {
      console.error('[TokenService] Error fetching metadata:', error.message);
      throw error;
    }
  }
}

export const tokenService = new TokenService();
