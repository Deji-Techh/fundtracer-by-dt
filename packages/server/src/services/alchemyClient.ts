import axios from 'axios';

// Compute Unit costs for Alchemy methods
const CU_COSTS: Record<string, number> = {
  'eth_getCode': 26,
  'eth_call': 26,
  'eth_getBalance': 19,
  'eth_getBlockByNumber': 16,
  'alchemy_getAssetTransfers': 150,
  'eth_getLogs': 75
};

// Rate limiter class for tracking CU budget
class RateLimiter {
  private maxCU: number;
  private windowMs: number;
  private usedCU: number;
  private resetTime: number;

  constructor(maxCU = 300, windowMs = 1000) {
    this.maxCU = maxCU;
    this.windowMs = windowMs;
    this.usedCU = 0;
    this.resetTime = Date.now() + windowMs;
  }

  canSpend(cu: number): boolean {
    this.checkReset();
    return this.usedCU + cu <= this.maxCU;
  }

  spend(cu: number): void {
    this.checkReset();
    this.usedCU += cu;
  }

  async waitForBudget(cu: number): Promise<void> {
    while (!this.canSpend(cu)) {
      const waitTime = this.resetTime - Date.now();
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 100)));
      }
      this.checkReset();
    }
  }

  checkReset(): void {
    const now = Date.now();
    if (now >= this.resetTime) {
      this.usedCU = 0;
      this.resetTime = now + this.windowMs;
    }
  }
}

export class AlchemyClient {
  private baseUrl: string;
  private rateLimiter: RateLimiter;

  constructor(apiKey: string) {
    this.baseUrl = `https://linea-mainnet.g.alchemy.com/v2/${apiKey}`;
    this.rateLimiter = new RateLimiter(300, 1000); // 300 CU/sec
  }

  // Get CU cost for a method
  getCUCost(method: string): number {
    return CU_COSTS[method] || 26; // Default to eth_call cost
  }

  // Exponential backoff retry
  async retryWithBackoff<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        // Retry on rate limit (429) or server errors (5xx)
        const status = error.response?.status;
        if (status === 429 || (status >= 500 && status < 600)) {
          const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          console.log(`[AlchemyClient] Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // Don't retry on client errors (4xx except 429)
        if (status >= 400 && status < 500) {
          throw error;
        }
      }
    }
    
    throw lastError;
  }

  // Single JSON-RPC call
  async singleCall(method: string, params: any[] = []): Promise<any> {
    const cu = this.getCUCost(method);
    await this.rateLimiter.waitForBudget(cu);
    
    return this.retryWithBackoff(async () => {
      const response = await axios.post(
        this.baseUrl,
        {
          jsonrpc: '2.0',
          id: Date.now(),
          method,
          params
        },
        {
          timeout: 30000,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      this.rateLimiter.spend(cu);
      
      if (response.data.error) {
        throw new Error(`Alchemy error: ${response.data.error.message}`);
      }
      
      return response.data.result;
    });
  }

  // Batch multiple JSON-RPC calls into one request
  async batchCall(calls: { method: string; params?: any[] }[]): Promise<any[]> {
    if (!calls || calls.length === 0) return [];
    
    // Calculate total CU for batch
    const totalCU = calls.reduce((sum, call) => sum + this.getCUCost(call.method), 0);
    await this.rateLimiter.waitForBudget(totalCU);
    
    return this.retryWithBackoff(async () => {
      const requests = calls.map((call, index) => ({
        jsonrpc: '2.0',
        id: index,
        method: call.method,
        params: call.params || []
      }));
      
      const response = await axios.post(
        this.baseUrl,
        requests,
        {
          timeout: 30000,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      this.rateLimiter.spend(totalCU);
      
      // Sort responses by ID to maintain order
      const results = response.data.sort((a: any, b: any) => a.id - b.id);
      
      return results.map((result: any) => {
        if (result.error) {
          console.warn(`[AlchemyClient] Batch call error: ${result.error.message}`);
          return null;
        }
        return result.result;
      });
    });
  }

  // Fetch asset transfers with automatic pagination
  async getAssetTransfers(params: any): Promise<any[]> {
    const allTransfers: any[] = [];
    let pageKey: string | null = null;
    let pageCount = 0;
    const maxPages = 100; // Safety limit
    
    do {
      const requestParams = {
        ...params,
        maxCount: '0x3E8' // 1000 in hex
      };
      
      if (pageKey) {
        requestParams.pageKey = pageKey;
      }
      
      try {
        const result = await this.singleCall('alchemy_getAssetTransfers', [requestParams]);
        
        if (result && result.transfers) {
          allTransfers.push(...result.transfers);
        }
        
        pageKey = result?.pageKey;
        pageCount++;
        
        // Add small delay between pages to avoid burst
        if (pageKey && pageCount < maxPages) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error('[AlchemyClient] Error fetching transfers:', error);
        break;
      }
    } while (pageKey && pageCount < maxPages);
    
    return allTransfers;
  }

  // Get contract metadata (batched)
  async getContractMetadata(address: string): Promise<any> {
    const calls = [
      { method: 'eth_getCode', params: [address, 'latest'] },
      { method: 'eth_getBalance', params: [address, 'latest'] },
      // ERC-20 calls
      { 
        method: 'eth_call', 
        params: [{ to: address, data: '0x06fdde03' }, 'latest'] // name()
      },
      { 
        method: 'eth_call', 
        params: [{ to: address, data: '0x95d89b41' }, 'latest'] // symbol()
      },
      { 
        method: 'eth_call', 
        params: [{ to: address, data: '0x313ce567' }, 'latest'] // decimals()
      },
      { 
        method: 'eth_call', 
        params: [{ to: address, data: '0x18160ddd' }, 'latest'] // totalSupply()
      },
      // ERC-721 interface check
      { 
        method: 'eth_call', 
        params: [{ 
          to: address, 
          data: '0x01ffc9a780ac58cd000000000000000000000000000000000000000000000000000000' 
        }, 'latest'] // supportsInterface(0x80ac58cd)
      },
      // ERC-1155 interface check
      { 
        method: 'eth_call', 
        params: [{ 
          to: address, 
          data: '0x01ffc9a7d9b67a2600000000000000000000000000000000000000000000000000000000' 
        }, 'latest'] // supportsInterface(0xd9b67a26)
      }
    ];
    
    const results = await this.batchCall(calls);
    
    return {
      code: results[0],
      balance: results[1],
      name: this.decodeStringResult(results[2]),
      symbol: this.decodeStringResult(results[3]),
      decimals: this.decodeUintResult(results[4]),
      totalSupply: this.decodeUintResult(results[5]),
      isERC721: results[6] === '0x0000000000000000000000000000000000000000000000000000000000000001',
      isERC1155: results[7] === '0x0000000000000000000000000000000000000000000000000000000000000001'
    };
  }

  // Decode string result from eth_call
  decodeStringResult(hex: string | null): string | null {
    if (!hex || hex === '0x') return null;
    try {
      // Remove 0x prefix and offset (first 64 chars)
      const offset = parseInt(hex.slice(2, 66), 16) * 2;
      const length = parseInt(hex.slice(66, 130), 16) * 2;
      const data = hex.slice(130, 130 + length);
      
      // Convert hex to string
      let str = '';
      for (let i = 0; i < data.length; i += 2) {
        str += String.fromCharCode(parseInt(data.substr(i, 2), 16));
      }
      return str;
    } catch (e) {
      return null;
    }
  }

  // Decode uint result from eth_call
  decodeUintResult(hex: string | null): number | null {
    if (!hex || hex === '0x') return null;
    try {
      return parseInt(hex, 16);
    } catch (e) {
      return null;
    }
  }
}

export default AlchemyClient;
