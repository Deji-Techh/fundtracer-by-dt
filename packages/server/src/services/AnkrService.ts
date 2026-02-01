import { cache } from '../utils/cache.js';

const ANKR_API_KEY = process.env.ANKR_API_KEY;
const ANKR_ENDPOINT = process.env.ANKR_ENDPOINT || 'https://rpc.ankr.com/multichain';

export class AnkrService {
  private headers: HeadersInit;
  private endpoint: string;

  constructor() {
    this.endpoint = ANKR_ENDPOINT;
    
    this.headers = {
      'accept': 'application/json',
      'content-type': 'application/json',
    };
  }

  async getTransactionsByAddress(address: string, blockchain: string = 'linea', pageToken?: string) {
    const cacheKey = `ankr:tx:${address}:${blockchain}:${pageToken || 'first'}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const body = {
        id: 1,
        jsonrpc: '2.0',
        method: 'ankr_getTransactionsByAddress',
        params: {
          address,
          blockchain,
          pageToken,
          pageSize: 100,
        },
      };

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Ankr API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`Ankr API error: ${data.error.message}`);
      }

      cache.set(cacheKey, data.result, 300); // 5 minute cache
      return data.result;
    } catch (error) {
      console.error('[AnkrService] Error fetching transactions:', error);
      throw error;
    }
  }

  async getAccountBalance(address: string, blockchain: string = 'linea') {
    const cacheKey = `ankr:balance:${address}:${blockchain}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const body = {
        id: 1,
        jsonrpc: '2.0',
        method: 'ankr_getAccountBalance',
        params: {
          address,
          blockchain,
        },
      };

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Ankr API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`Ankr API error: ${data.error.message}`);
      }

      cache.set(cacheKey, data.result, 30); // 30 second cache
      return data.result;
    } catch (error) {
      console.error('[AnkrService] Error fetching balance:', error);
      throw error;
    }
  }
}

export const ankrService = new AnkrService();
