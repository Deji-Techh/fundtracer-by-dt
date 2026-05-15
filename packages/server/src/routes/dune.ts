// ============================================================
// Dune Routes - Fetch contract interactors from Dune Analytics
// ============================================================

import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

interface DuneExecutionResponse {
    execution_id: string;
    state: string;
}

interface DuneResultResponse {
    execution_id: string;
    state: string;
    result?: {
        rows: Array<{ wallet: string }>;
    };
}

/**
 * POST /fetch
 * Fetch contract interactors from Dune Analytics
 */
router.post('/fetch', async (req: AuthenticatedRequest, res: Response) => {
    console.log('[DEBUG] /dune/fetch endpoint hit');

    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { contractAddress, chain, limit = 1000, customApiKey } = req.body;

    if (!contractAddress) {
        return res.status(400).json({ error: 'Contract address is required' });
    }

    // Use custom API key if provided, otherwise use default
    const apiKey = customApiKey || process.env.DUNE_API_KEY;

    if (!apiKey) {
        return res.status(400).json({ error: 'Dune API key not configured' });
    }

    // Map chain to Dune table name
    const chainTableMap: Record<string, string> = {
        ethereum: 'ethereum.transactions',
        polygon: 'polygon.transactions',
        arbitrum: 'arbitrum.transactions',
        optimism: 'optimism.transactions',
        base: 'base.transactions',
        linea: 'linea.transactions',
    };

    // Ensure contract address is properly formatted to prevent SQL injection
    // Allow only hex chars for contract address
    if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
        return res.status(400).json({ error: 'Invalid contract address format' });
    }

    const duneTable = chainTableMap[chain] || 'ethereum.transactions';
    const contractLower = contractAddress.toLowerCase();

    // Limit is converted to a number and clamped
    const safeLimit = Math.min(Math.max(1, Number(limit) || 1000), 10000);

    // Build the SQL query - using checked inputs
    const query = `
        SELECT DISTINCT "from" as wallet
        FROM ${duneTable}
        WHERE LOWER(CAST("to" AS VARCHAR)) = '${contractLower}'
        LIMIT ${safeLimit}
    `;

    try {
        console.log('[Dune] Executing query...');
        console.log('[Dune] Query:', query);

        // Step 1: Execute the query using /sql/execute endpoint
        // Add 30 second timeout for the initial request
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        let executeRes;
        try {
            executeRes = await fetch('https://api.dune.com/api/v1/sql/execute', {
                method: 'POST',
                headers: {
                    'X-Dune-Api-Key': apiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sql: query,
                    performance: 'medium',
                }),
                signal: controller.signal,
            });
        } catch (fetchError: any) {
            clearTimeout(timeout);
            console.error('[Dune] Fetch error:', fetchError.message);
            return res.status(500).json({
                error: 'Failed to connect to Dune API',
                message: fetchError.message,
                hint: 'Try again or reduce the limit'
            });
        }
        clearTimeout(timeout);

        if (!executeRes.ok) {
            const errorText = await executeRes.text();
            console.error('[Dune] Execute error:', errorText);
            return res.status(500).json({ error: 'Failed to execute Dune query', details: errorText });
        }

        const executeData: DuneExecutionResponse = await executeRes.json();
        console.log('[Dune] Execution ID:', executeData.execution_id);

        // Step 2: Poll for results
        let attempts = 0;
        const maxAttempts = 60; // 60 seconds max for large queries

        while (attempts < maxAttempts) {
            await new Promise(r => setTimeout(r, 1000)); // Wait 1 second

            const resultRes = await fetch(
                `https://api.dune.com/api/v1/execution/${executeData.execution_id}/results`,
                {
                    headers: { 'X-Dune-API-Key': apiKey },
                }
            );

            if (!resultRes.ok) {
                attempts++;
                continue;
            }

            const resultData: DuneResultResponse = await resultRes.json();

            if (resultData.state === 'QUERY_STATE_COMPLETED' && resultData.result) {
                const wallets = resultData.result.rows.map(r => r.wallet);
                console.log(`[Dune] Found ${wallets.length} unique wallets`);

                return res.json({
                    success: true,
                    wallets,
                    count: wallets.length,
                    executionId: executeData.execution_id,
                });
            }

            if (resultData.state === 'QUERY_STATE_FAILED') {
                return res.status(500).json({ error: 'Dune query failed' });
            }

            attempts++;
            console.log(`[Dune] Waiting... attempt ${attempts}/${maxAttempts}, state: ${resultData.state}`);
        }

        return res.status(504).json({ error: 'Dune query timed out' });

    } catch (error: any) {
        console.error('[Dune] Error:', error.message);
        return res.status(500).json({ error: 'Dune API error' });
    }
});

export { router as duneRoutes };
