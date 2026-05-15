/**
 * Contract Routes - API endpoints for contract data
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import contractService from '../services/ContractService.js';

const router = Router();

/**
 * GET /contracts/lookup/:address
 * Look up contract info by address
 */
router.get('/lookup/:address', async (req: AuthenticatedRequest, res: Response) => {
    const { address } = req.params;

    if (!address || !/^0x[a-fA-F0-9]{40}$/i.test(address)) {
        return res.status(400).json({ error: 'Invalid address format' });
    }

    // Try cached first
    let info = contractService.getContract(address);

    // If not found, try to lookup from Lineascan
    if (!info) {
        info = await contractService.lookupContract(address);
    }

    if (info) {
        res.json({
            success: true,
            address: address.toLowerCase(),
            ...info
        });
    } else {
        res.json({
            success: true,
            address: address.toLowerCase(),
            name: null,
            isKnown: false
        });
    }
});

/**
 * POST /contracts/batch
 * Batch lookup multiple addresses
 */
router.post('/batch', async (req: AuthenticatedRequest, res: Response) => {
    const { addresses } = req.body;

    if (!Array.isArray(addresses)) {
        return res.status(400).json({ error: 'Addresses must be an array' });
    }

    const validAddresses = addresses
        .filter(a => /^0x[a-fA-F0-9]{40}$/i.test(a))
        .slice(0, 100); // Limit to 100

    const results: Record<string, any> = {};

    for (const addr of validAddresses) {
        const info = contractService.getContract(addr);
        results[addr.toLowerCase()] = info || null;
    }

    res.json({
        success: true,
        contracts: results,
        total: Object.keys(results).length
    });
});

/**
 * GET /contracts/stats
 * Get contract database stats
 */
router.get('/stats', async (req: AuthenticatedRequest, res: Response) => {
    const total = contractService.getCount();

    res.json({
        success: true,
        totalContracts: total,
        sources: {
            'linea-token-list': 0,
            'defillama': 0,
            'lineascan-verified': 0,
            'lineascan': 0
        }
    });
});

/**
 * POST /contracts/refresh
 * Trigger a refresh of latest contracts (admin only)
 */
router.post('/refresh', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const added = await contractService.refreshLatestContracts(50);
        res.json({
            success: true,
            added,
            total: contractService.getCount()
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: 'An internal error occurred'
        });
    }
});

/**
 * GET /contracts/search
 * Search contracts by name
 */
router.get('/search', async (req: AuthenticatedRequest, res: Response) => {
    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.length < 2) {
        return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    const query = q.toLowerCase();
    const results: Array<{ address: string; name: string; type: string }> = [];

    contractService.getAllContracts().forEach((info, address) => {
        if (info.name.toLowerCase().includes(query) ||
            (info.symbol && info.symbol.toLowerCase().includes(query))) {
            results.push({
                address,
                name: info.symbol ? `${info.name} (${info.symbol})` : info.name,
                type: info.type
            });
        }
    });

    res.json({
        success: true,
        results: results.slice(0, 50),
        total: results.length
    });
});

export default router;
