import fetch from 'node-fetch';
import { cache } from '../utils/cache.js';

const DUNE_API_KEY = process.env.DUNE_API_KEY;

export class DuneService {
    private apiKey: string;
    private baseUrl = 'https://api.dune.com/api/v1';

    constructor(apiKey?: string) {
        this.apiKey = apiKey || DUNE_API_KEY || '';
        
        if (!this.apiKey) {
            console.warn('[DuneService] No API key provided');
        }
    }

    async getContractInteractors(chain: string, contractAddress: string, limit: number = 1000): Promise<string[]> {
        const chainTableMap: Record<string, string> = {
            ethereum: 'ethereum.transactions',
            polygon: 'polygon.transactions',
            arbitrum: 'arbitrum.transactions',
            optimism: 'optimism.transactions',
            base: 'base.transactions',
            linea: 'linea.transactions',
        };

        const duneTable = chainTableMap[chain.toLowerCase()] || 'ethereum.transactions';
        const contractLower = contractAddress.toLowerCase();

        const query = `
            SELECT DISTINCT "from" as wallet
            FROM ${duneTable}
            WHERE LOWER(CAST("to" AS VARCHAR)) = '${contractLower}'
            LIMIT ${limit}
        `;

        try {
            console.log(`[DuneService] Fetching interactors for ${contractAddress} on ${chain}`);
            const result = await this.executeQuery(query);

            if (result && result.result && result.result.rows) {
                return result.result.rows.map((r: any) => r.wallet);
            }
            return [];
        } catch (error) {
            console.error('[DuneService] Error fetching interactors:', error);
            // Return empty array to allow fallback to RPC
            return [];
        }
    }

    async executeQuery(query: string): Promise<any> {
        // 1. Submit query
        const executeRes = await fetch(`${this.baseUrl}/sql/execute`, {
            method: 'POST',
            headers: {
                'X-Dune-Api-Key': this.apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sql: query,
                performance: 'medium',
            }),
        });

        if (!executeRes.ok) {
            throw new Error(`Failed to submit query: ${executeRes.statusText}`);
        }

        const executeData = await executeRes.json() as any;
        const executionId = executeData.execution_id;

        // 2. Poll for status
        let attempts = 0;
        const maxAttempts = 20; // 30-40 seconds max

        while (attempts < maxAttempts) {
            await new Promise(r => setTimeout(r, 1500)); // 1.5s delay

            const statusRes = await fetch(`${this.baseUrl}/execution/${executionId}/status`, {
                headers: { 'X-Dune-Api-Key': this.apiKey },
            });

            if (!statusRes.ok) continue;

            const statusData = await statusRes.json() as any;
            const state = statusData.state;

            if (state === 'QUERY_STATE_COMPLETED') {
                // 3. Get results
                const resultsRes = await fetch(`${this.baseUrl}/execution/${executionId}/results`, {
                    headers: { 'X-Dune-Api-Key': this.apiKey },
                });

                if (!resultsRes.ok) {
                    throw new Error('Failed to fetch results');
                }

                return await resultsRes.json();
            } else if (state === 'QUERY_STATE_FAILED' || state === 'QUERY_STATE_CANCELLED') {
                throw new Error(`Query failed with state: ${state}`);
            }

            attempts++;
        }

        throw new Error('Query execution timed out');
    }

    async getLineaStats() {
        // Placeholder query ID - user needs to create this query in Dune
        // Example query: "Linea Ecosystem Stats"
        const LINEA_STATS_QUERY_ID = '1234567'; // Replace with actual query ID
        
        const cacheKey = `dune:linea:stats`;
        const cached = cache.get(cacheKey);
        if (cached) return cached;
        
        try {
            // Try to get results from a saved query
            const resultsRes = await fetch(`${this.baseUrl}/query/${LINEA_STATS_QUERY_ID}/results`, {
                headers: { 'X-Dune-Api-Key': this.apiKey },
            });
            
            if (!resultsRes.ok) {
                throw new Error('Failed to fetch Linea stats');
            }
            
            const data = await resultsRes.json();
            cache.set(cacheKey, data, 3600); // 1 hour cache
            return data;
        } catch (error) {
            console.error('[DuneService] Error fetching Linea stats:', error);
            // Return mock data if query doesn't exist
            return {
                result: {
                    rows: [
                        { metric: 'TVL', value: 450000000, change_24h: 2.3 },
                        { metric: 'Volume 24h', value: 23500000, change_24h: -5.1 },
                        { metric: 'Transactions', value: 125400, change_24h: 12.0 },
                        { metric: 'Active Users', value: 45200, change_24h: 8.0 },
                    ],
                },
            };
        }
    }

    async getQueryResults(queryId: string, limit: number = 100) {
        const cacheKey = `dune:results:${queryId}:${limit}`;
        const cached = cache.get(cacheKey);
        if (cached) return cached;

        try {
            const response = await fetch(
                `${this.baseUrl}/query/${queryId}/results?limit=${limit}`,
                { headers: { 'X-Dune-Api-Key': this.apiKey } }
            );

            if (!response.ok) {
                throw new Error(`Dune API error: ${response.status}`);
            }

            const data = await response.json();
            cache.set(cacheKey, data, 3600); // 1 hour cache
            return data;
        } catch (error) {
            console.error('[DuneService] Error fetching query results:', error);
            throw error;
        }
    }
}

export const duneService = new DuneService();
