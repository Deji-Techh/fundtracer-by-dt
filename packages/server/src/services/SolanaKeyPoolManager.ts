// ============================================================
// FundTracer by DT - Solana Key Pool Manager
// Manages Helius keys for Solana operations
// ============================================================

import { cache } from '../utils/cache.js';

interface KeyHealth {
    key: string;
    endpoint: string;
    requestsThisMinute: number;
    requestsThisMonth: number;
    totalCUs: number;
    consecutiveErrors: number;
    lastErrorAt: number | null;
    circuitOpen: boolean;
    circuitOpenUntil: number | null;
    avgLatencyMs: number;
}

const MAX_RPS_PER_KEY = 25;
const MAX_MONTHLY_CUS = 300_000_000;
const CIRCUIT_OPEN_MS = 30_000;
const ERROR_THRESHOLD = 5;

export class SolanaKeyPoolManager {
    private keys: KeyHealth[] = [];
    private currentIndex = 0;
    private connections: Map<string, any> = new Map();

    constructor() {
        this.initKeys();
        this.startHealthMonitor();
    }

    private initKeys() {
        const keyCount = 20;
        for (let i = 1; i <= keyCount; i++) {
            const envKey = `HELIUS_KEY_${String(i).padStart(2, '0')}`;
            const key = process.env[envKey];
            
            if (key) {
                const endpoint = `https://mainnet.helius-rpc.com/?api-key=${key}`;
                this.keys.push({
                    key,
                    endpoint,
                    requestsThisMinute: 0,
                    requestsThisMonth: 0,
                    totalCUs: 0,
                    consecutiveErrors: 0,
                    lastErrorAt: null,
                    circuitOpen: false,
                    circuitOpenUntil: null,
                    avgLatencyMs: 0,
                });
            }
        }

        // Fallback: check for older HELIUS_KEY_1, _2, _3
        const fallbackKeys = [
            process.env.HELIUS_KEY_1,
            process.env.HELIUS_KEY_2,
            process.env.HELIUS_KEY_3,
        ].filter(Boolean);

        for (const key of fallbackKeys) {
            if (key && !this.keys.find(k => k.key === key)) {
                const endpoint = `https://mainnet.helius-rpc.com/?api-key=${key}`;
                this.keys.push({
                    key,
                    endpoint,
                    requestsThisMinute: 0,
                    requestsThisMonth: 0,
                    totalCUs: 0,
                    consecutiveErrors: 0,
                    lastErrorAt: null,
                    circuitOpen: false,
                    circuitOpenUntil: null,
                    avgLatencyMs: 0,
                });
            }
        }

        if (this.keys.length === 0) {
            console.warn('[SolanaKeyPool] No Helius keys found, using fallback');
            const fallbackKey = process.env.ALCHEMY_SOLANA_KEY || process.env.ALCHEMY_KEY_01;
            if (fallbackKey) {
                this.keys.push({
                    key: fallbackKey,
                    endpoint: `https://solana-mainnet.g.alchemy.com/v2/${fallbackKey}`,
                    requestsThisMinute: 0,
                    requestsThisMonth: 0,
                    totalCUs: 0,
                    consecutiveErrors: 0,
                    lastErrorAt: null,
                    circuitOpen: false,
                    circuitOpenUntil: null,
                    avgLatencyMs: 0,
                });
            }
        }

        console.log(`[SolanaKeyPool] Initialized with ${this.keys.length} keys`);
    }

    getNextKey(): { health: KeyHealth; endpoint: string } {
        const now = Date.now();
        let attempts = 0;

        while (attempts < this.keys.length) {
            const health = this.keys[this.currentIndex];
            this.currentIndex = (this.currentIndex + 1) % this.keys.length;

            if (health.circuitOpen) {
                if (now < health.circuitOpenUntil!) {
                    attempts++;
                    continue;
                }
                health.circuitOpen = false;
                health.consecutiveErrors = 0;
            }

            if (health.totalCUs >= MAX_MONTHLY_CUS * 0.95) {
                attempts++;
                continue;
            }

            return { health, endpoint: health.endpoint };
        }

        throw new Error('All Alchemy keys exhausted or in circuit-open state');
    }

    async execute<T>(fn: (endpoint: string) => Promise<T>, cuCost = 1): Promise<T> {
        const maxRetries = 3;
        let lastError: Error | null = null;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            const { health, endpoint } = this.getNextKey();
            const start = Date.now();

            try {
                const result = await fn(endpoint);
                const latency = Date.now() - start;

                health.consecutiveErrors = 0;
                health.requestsThisMinute++;
                health.requestsThisMonth++;
                health.totalCUs += cuCost;
                health.avgLatencyMs = (health.avgLatencyMs * 0.9) + (latency * 0.1);

                return result;
            } catch (err: any) {
                lastError = err;
                health.consecutiveErrors++;
                health.lastErrorAt = Date.now();

                if (health.consecutiveErrors >= ERROR_THRESHOLD) {
                    health.circuitOpen = true;
                    health.circuitOpenUntil = Date.now() + CIRCUIT_OPEN_MS;
                    console.warn(`[SolanaKeyPool] Circuit opened for key ${health.key.slice(0, 8)}...`);
                }

                if (err.status === 429) {
                    await new Promise(r => setTimeout(r, 200 * (attempt + 1)));
                }
            }
        }

        throw lastError || new Error('RPC call failed after retries');
    }

    getPoolStats() {
        return {
            totalKeys: this.keys.length,
            healthyKeys: this.keys.filter(k => !k.circuitOpen).length,
            totalCUsUsed: this.keys.reduce((sum, k) => sum + k.totalCUs, 0),
            avgLatencyMs: this.keys.reduce((s, k) => s + k.avgLatencyMs, 0) / this.keys.length,
        };
    }

    private startHealthMonitor() {
        setInterval(() => {
            this.keys.forEach(k => k.requestsThisMinute = 0);
        }, 60_000);
    }
}

export const solanaKeyPool = new SolanaKeyPoolManager();