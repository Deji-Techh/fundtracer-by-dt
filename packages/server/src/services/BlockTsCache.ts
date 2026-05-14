// ============================================================
// Block Timestamp Cache — Redis-backed, permanent (no TTL)
// Block timestamps are immutable, so cache them forever.
// ============================================================

import { type BlockTimestampCache } from '@fundtracer/core';
import { getRedis } from '../utils/redis.js';

/** Key format: block:ts:{chain}:{blockNumber} */
function cacheKey(chain: string, blockNumber: number): string {
  return `block:ts:${chain}:${blockNumber}`;
}

export class RedisBlockTsCache implements BlockTimestampCache {
  async get(chain: string, blockNumber: number): Promise<number | null> {
    const redis = getRedis();
    if (!redis) return null;

    try {
      const val = await redis.get<string>(cacheKey(chain, blockNumber));
      if (val === null || val === undefined) return null;
      const ts = parseInt(val, 10);
      return isNaN(ts) ? null : ts;
    } catch {
      return null;
    }
  }

  async getMany(chain: string, blockNumbers: number[]): Promise<Map<number, number>> {
    const result = new Map<number, number>();
    if (blockNumbers.length === 0) return result;

    const redis = getRedis();
    if (!redis) return result;

    try {
      const keys = blockNumbers.map(b => cacheKey(chain, b));
      const values = await redis.mget<string[]>(...keys);

      for (let i = 0; i < blockNumbers.length; i++) {
        const val = values[i];
        if (val !== null && val !== undefined) {
          const ts = parseInt(val as string, 10);
          if (!isNaN(ts)) {
            result.set(blockNumbers[i], ts);
          }
        }
      }
    } catch {
      // Silent failure — caller falls back to RPC
    }

    return result;
  }

  async set(chain: string, blockNumber: number, timestamp: number): Promise<void> {
    const redis = getRedis();
    if (!redis) return;

    try {
      // No EXPIRE — block timestamps are permanent
      await redis.set(cacheKey(chain, blockNumber), timestamp.toString());
    } catch {
      // Silent failure — cache is best-effort
    }
  }
}
