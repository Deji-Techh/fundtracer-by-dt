// ============================================================
// FundTracer by DT - Solana Key Pool Manager
// Manages Alchemy keys for Solana operations
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
    disabled: boolean;
    disabledReason?: string;
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
        const getEnvKey = (prefix: string, index: number): string | undefined =>
            process.env[`${prefix}_${index}`] || process.env[`${prefix}_${String(index).padStart(2, '0')}`];

        const addKey = (key: string | undefined) => {
            if (!key || this.keys.find(k => k.key === key)) return;
            this.keys.push({
                key,
                endpoint: `https://solana-mainnet.g.alchemy.com/v2/${key}`,
                requestsThisMinute: 0,
                requestsThisMonth: 0,
                totalCUs: 0,
                consecutiveErrors: 0,
                lastErrorAt: null,
                circuitOpen: false,
                circuitOpenUntil: null,
                disabled: false,
                avgLatencyMs: 0,
            });
        };

        for (let i = 1; i <= 20; i++) {
            addKey(getEnvKey('SOLANA_ALCHEMY_KEY', i));
            addKey(getEnvKey('ALCHEMY_SOLANA_KEY', i));
        }

        addKey(process.env.SOLANA_ALCHEMY_KEY);
        addKey(process.env.ALCHEMY_SOLANA_KEY);

        if (process.env.USE_SYBIL_KEYS_FOR_SOLANA === 'true') {
            for (let i = 1; i <= 10; i++) {
                addKey(getEnvKey('SYBIL_CONTRACT_KEY', i));
                addKey(getEnvKey('SYBIL_WALLET_KEY', i));
            }
        }

        if (this.keys.length === 0) {
            console.warn('[SolanaKeyPool] No Solana-specific Alchemy keys found. Set SOLANA_ALCHEMY_KEY or ALCHEMY_SOLANA_KEY.');
        }

        console.log(`[SolanaKeyPool] Initialized with ${this.keys.length} keys`);
    }

    getNextKey(): { health: KeyHealth; endpoint: string } {
        const now = Date.now();
        let attempts = 0;

        while (attempts < this.keys.length) {
            const health = this.keys[this.currentIndex];
            this.currentIndex = (this.currentIndex + 1) % this.keys.length;

            if (health.disabled) {
                attempts++;
                continue;
            }

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

                if (this.isPermanentKeyError(err)) {
                    health.disabled = true;
                    health.disabledReason = err?.message || 'Permanent Alchemy key error';
                    console.warn(`[SolanaKeyPool] Disabled key ${health.key.slice(0, 8)}...: ${health.disabledReason}`);
                    continue;
                }

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

    private isPermanentKeyError(err: any): boolean {
        const message = String(err?.message || err || '').toLowerCase();
        return message.includes('must be authenticated')
            || message.includes('solana_mainnet is not enabled')
            || message.includes('network is not enabled')
            || message.includes('invalid api key')
            || message.includes('unauthorized');
    }

    getPoolStats() {
        return {
            totalKeys: this.keys.length,
            healthyKeys: this.keys.filter(k => !k.disabled && !k.circuitOpen).length,
            disabledKeys: this.keys.filter(k => k.disabled).length,
            totalCUsUsed: this.keys.reduce((sum, k) => sum + k.totalCUs, 0),
            avgLatencyMs: this.keys.length ? this.keys.reduce((s, k) => s + k.avgLatencyMs, 0) / this.keys.length : 0,
        };
    }

    private startHealthMonitor() {
        setInterval(() => {
            this.keys.forEach(k => k.requestsThisMinute = 0);
        }, 60_000);
    }
}

export const solanaKeyPool = new SolanaKeyPoolManager();
