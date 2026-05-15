// ============================================================
// Entity Routes - Entity lookup and search API
// ============================================================

import { Router } from 'express';
import { EntityService } from '../services/EntityService.js';

const router = Router();

/**
 * GET /api/entities/:address - Look up a single address
 * Query params: chain (required), category (optional filter)
 */
router.get('/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const chain = (req.query.chain as string) || 'ethereum';
    const lookupType = (req.query.type as string) || 'strict'; // 'strict' | 'any'

    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    let entity;

    if (lookupType === 'any') {
      entity = EntityService.findEntityAnyChain(address);
    } else {
      entity = EntityService.lookupEntity(chain, address);
    }

    if (!entity) {
      return res.status(404).json({ error: 'Entity not found', address, chain });
    }

    return res.json({
      found: true,
      entity,
    });
  } catch (error: any) {
    console.error('[Entities] Lookup error:', error.message);
    return res.status(500).json({ error: 'Entity lookup failed' });
  }
});

/**
 * POST /api/entities/bulk - Bulk lookup addresses
 * Body: { chain, addresses: string[] }
 */
router.post('/bulk', async (req, res) => {
  try {
    const { chain, addresses } = req.body;

    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return res.status(400).json({ error: 'addresses array is required' });
    }

    if (addresses.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 addresses per request' });
    }

    const results = EntityService.bulkLookup(chain || 'ethereum', addresses);

    return res.json({
      found: Object.fromEntries(Object.entries(results).filter(([_, v]) => v !== null)),
      total: addresses.length,
      matched: Object.values(results).filter(Boolean).length,
    });
  } catch (error: any) {
    console.error('[Entities] Bulk lookup error:', error.message);
    return res.status(500).json({ error: 'Bulk lookup failed' });
  }
});

/**
 * GET /api/entities/search - Search entities by name
 * Query params: q (query), chain (optional filter), category (optional filter)
 */
router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q as string) || '';
    const chain = req.query.chain as string | undefined;
    const category = req.query.category as any;

    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    const results = EntityService.search(q, chain, category);

    return res.json({
      query: q,
      results,
      total: results.length,
    });
  } catch (error: any) {
    console.error('[Entities] Search error:', error.message);
    return res.status(500).json({ error: 'Entity search failed' });
  }
});

export default router;
