// ============================================================
// FundTracer by DT - Helius Key Manager
// Credit-aware routing for Helius API keys
// ============================================================

interface KeyState {
  key: string;
  creditsUsed: number;
  creditsLimit: number;
  lastReset: number;
  consecutiveErrors: number;
  rateLimitedUntil: number;
}

export class HeliusKeyManager {
  private keys: KeyState[];
  private cache: Map<string, { data: any; expiry: number }> = new Map();

  constructor(apiKeys: string[]) {
    this.keys = apiKeys.map(key => ({
      key,
      creditsUsed: 0,
      creditsLimit: 50_000,
      lastReset: Date.now(),
      consecutiveErrors: 0,
      rateLimitedUntil: 0,
    }));
  }

  private getBestKey(creditCost: number): KeyState {
    const now = Date.now();

    for (const key of this.keys) {
      const resetTime = new Date(key.lastReset);
      const nowDate = new Date(now);
      if (resetTime.getUTCDate() !== nowDate.getUTCDate()) {
        key.creditsUsed = 0;
        key.lastReset = now;
        key.consecutiveErrors = 0;
      }
    }

    const available = this.keys.filter(k =>
      k.rateLimitedUntil < now &&
      k.creditsUsed + creditCost <= k.creditsLimit &&
      k.consecutiveErrors < 5
    );

    if (available.length === 0) {
      throw new Error('All Helius keys exhausted or rate-limited');
    }

    return available.sort((a, b) => (a.creditsUsed) - (b.creditsUsed))[0];
  }

  async request<T>(
    endpoint: string,
    options: RequestInit,
    creditCost: number,
    cacheKey?: string,
    cacheTTL: number = 60_000
  ): Promise<T> {
    if (cacheKey) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiry > Date.now()) {
        return cached.data as T;
      }
    }

    const keyState = this.getBestKey(creditCost);
    const url = endpoint.replace('{KEY}', keyState.key);

    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (res.status === 429) {
        keyState.rateLimitedUntil = Date.now() + 60_000;
        keyState.consecutiveErrors++;
        return this.request(endpoint, options, creditCost, cacheKey, cacheTTL);
      }

      if (!res.ok) {
        keyState.consecutiveErrors++;
        throw new Error(`Helius error: ${res.status}`);
      }

      keyState.consecutiveErrors = 0;
      keyState.creditsUsed += creditCost;

      const data = await res.json();

      if (cacheKey) {
        this.cache.set(cacheKey, {
          data,
          expiry: Date.now() + cacheTTL,
        });
      }

      return data as T;

    } catch (err) {
      keyState.consecutiveErrors++;
      throw err;
    }
  }

  getStatus() {
    return {
      keys: this.keys.map((k, i) => ({
        index: i,
        creditsUsed: k.creditsUsed,
        creditsRemaining: k.creditsLimit - k.creditsUsed,
        percentUsed: ((k.creditsUsed / k.creditsLimit) * 100).toFixed(1) + '%',
        isRateLimited: k.rateLimitedUntil > Date.now(),
        errors: k.consecutiveErrors,
      })),
      totalRemaining: this.keys.reduce(
        (sum, k) => sum + (k.creditsLimit - k.creditsUsed), 0
      ),
      cacheSize: this.cache.size,
    };
  }

  cleanCache() {
    const now = Date.now();
    for (const [key, val] of this.cache) {
      if (val.expiry < now) this.cache.delete(key);
    }
  }
}

export const CACHE_TTL = {
  walletFirstTx: 24 * 60 * 60 * 1000,
  knownLabels: 24 * 60 * 60 * 1000,
  programInfo: 12 * 60 * 60 * 1000,
  fundingTree: 30 * 60 * 1000,
  tokenBalances: 5 * 60 * 1000,
  riskScore: 15 * 60 * 1000,
  recentTransactions: 60 * 1000,
  balance: 30 * 1000,
};
