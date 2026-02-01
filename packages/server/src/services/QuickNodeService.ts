import { cache } from '../utils/cache.js';

const QUICKNODE_RPC_URL = process.env.QUICKNODE_RPC_URL;

export class QuickNodeService {
  private rpcUrl: string;

  constructor() {
    this.rpcUrl = QUICKNODE_RPC_URL || '';
    
    if (!this.rpcUrl) {
      console.warn('[QuickNodeService] No RPC URL provided');
    }
  }

  async checkTokenSafety(contractAddress: string) {
    const cacheKey = `quicknode:safety:${contractAddress}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      // Using QuickNode's Token Checker add-on via RPC
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'qn_checkTokenHoneypot',
          params: [{ contractAddress }],
        }),
      });

      if (!response.ok) {
        throw new Error(`QuickNode API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        // If the add-on isn't available, return a default safe response
        console.warn('[QuickNodeService] Token checker not available:', data.error);
        return {
          isHoneypot: false,
          riskScore: 50,
          riskLevel: 'unknown',
          warnings: ['Unable to verify token safety'],
          checks: {
            isVerified: false,
            hasMintFunction: null,
            isHoneypot: false,
            liquidityLocked: null,
            ownershipRenounced: null,
            hiddenFunctions: null,
          },
          recommendation: 'caution',
        };
      }

      const result = {
        isHoneypot: data.result?.isHoneypot || false,
        riskScore: data.result?.riskScore || 50,
        riskLevel: data.result?.riskLevel || 'medium',
        warnings: data.result?.warnings || [],
        checks: {
          isVerified: data.result?.isVerified || false,
          hasMintFunction: data.result?.hasMintFunction,
          isHoneypot: data.result?.isHoneypot || false,
          liquidityLocked: data.result?.liquidityLocked,
          ownershipRenounced: data.result?.ownershipRenounced,
          hiddenFunctions: data.result?.hiddenFunctions,
        },
        recommendation: data.result?.recommendation || 'caution',
      };

      cache.set(cacheKey, result, 3600); // 1 hour cache (token safety doesn't change often)
      return result;
    } catch (error) {
      console.error('[QuickNodeService] Error checking token safety:', error);
      // Return default response on error
      return {
        isHoneypot: false,
        riskScore: 50,
        riskLevel: 'unknown',
        warnings: ['Unable to verify token safety'],
        checks: {
          isVerified: false,
          hasMintFunction: null,
          isHoneypot: false,
          liquidityLocked: null,
          ownershipRenounced: null,
          hiddenFunctions: null,
        },
        recommendation: 'caution',
      };
    }
  }
}

export const quickNodeService = new QuickNodeService();
