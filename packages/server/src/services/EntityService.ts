// ============================================================
// Entity Service - Server-side entity lookup and recognition
// ============================================================

import { getEntity, bulkLookup as dataBulkLookup, searchEntities, findEntityByAddress, Entity, type EntityCategory } from '../data/entities.js';
import { isKnownCEX, getCEXInfo, detectCEXPattern } from '../data/cexWallets.js';
import { cache } from '../utils/cache.js';

const CACHE_TTL = 300; // 5 minutes for individual lookups
const BULK_CACHE_TTL = 60; // 1 minute for bulk lookups

export class EntityService {
  /**
   * Look up a single address on a specific chain
   */
  static lookupEntity(chain: string, address: string): Entity | null {
    if (!address || !chain) return null;

    // Cache key
    const cacheKey = `entity:${chain}:${address.toLowerCase()}`;
    const cached = cache.get(cacheKey) as Entity | null;
    if (cached) return cached;

    // 1. Check curated entity database
    const entity = getEntity(chain, address);
    if (entity) {
      cache.set(cacheKey, entity, CACHE_TTL);
      return entity;
    }

    // 2. Check CEX database (legacy, for addresses not in curated DB)
    const cexInfo = getCEXInfo(address, chain as any);
    if (cexInfo) {
      const cexEntity: Entity = {
        address,
        name: cexInfo.cexName,
        category: 'cex',
        chain,
        confidence: 0.9,
        source: 'manual',
        verified: true,
        tags: ['cex', cexInfo.type],
      };
      cache.set(cacheKey, cexEntity, CACHE_TTL);
      return cexEntity;
    }

    // Cache miss - store null to avoid repeated lookups
    cache.set(cacheKey, null as any, CACHE_TTL);
    return null;
  }

  /**
   * Look up multiple addresses in batch
   */
  static bulkLookup(chain: string, addresses: string[]): Record<string, Entity | null> {
    if (!addresses.length) return {};

    const cacheKey = `entity:bulk:${chain}:${addresses.length}`;
    const cached = cache.get(cacheKey) as Record<string, Entity | null> | null;
    if (cached) return cached;

    const results: Record<string, Entity | null> = {};
    for (const addr of addresses) {
      results[addr.toLowerCase()] = EntityService.lookupEntity(chain, addr);
    }

    cache.set(cacheKey, results, BULK_CACHE_TTL);
    return results;
  }

  /**
   * Search entities by name
   */
  static search(query: string, chain?: string, category?: EntityCategory): Entity[] {
    if (!query || query.length < 2) return [];
    return searchEntities(query, chain, category);
  }

  /**
   * Cross-chain entity lookup (try all chains)
   */
  static findEntityAnyChain(address: string): Entity | null {
    if (!address) return null;
    return findEntityByAddress(address) || null;
  }

  /**
   * Auto-detect entity type from transaction patterns (for unknown addresses)
   */
  static detectEntityType(
    address: string,
    txCount: number,
    uniqueSenders: number,
    uniqueRecipients: number,
    totalVolumeInEth: number,
    avgTxValueInEth: number
  ): { entityType: string; score: number; signals: string[] } | null {
    // Use CEX pattern detection as baseline
    const cexPattern = detectCEXPattern(
      txCount,
      uniqueSenders,
      uniqueRecipients,
      avgTxValueInEth,
      totalVolumeInEth
    );

    const signals: string[] = [];
    let entityType = 'wallet';
    let score = 0;

    // High tx count + many senders = likely exchange/cex
    if (cexPattern.isCEX) {
      return {
        entityType: 'cex',
        score: cexPattern.score,
        signals: cexPattern.signals,
      };
    }

    // Contract detection
    if (txCount > 0 && uniqueSenders === 0 && uniqueRecipients === 0) {
      entityType = 'contract';
      score = 0.5;
      signals.push('no_user_transactions');
    }

    // High volume to few recipients = possible exchange withdrawal
    if (txCount > 50 && uniqueRecipients < 5 && totalVolumeInEth > 100) {
      score = Math.max(score, 0.6);
      entityType = 'protocol';
      signals.push('high_volume_few_recipients');
    }

    if (score < 0.3) return null;

    return { entityType, score: Math.round(score * 100), signals };
  }
}
