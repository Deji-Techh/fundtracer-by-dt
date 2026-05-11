// ============================================================
// FundTracer by DT - Helius Key Pool
// Dedicated pool manager for Helius API keys with circuit breaker
// Supports multiple named pools for different operation types
// ============================================================

import { cache } from '../utils/cache.js';

interface KeySlot {
    key: string;
    requestsThisMinute: number;
    consecutiveErrors: number;
    lastErrorAt: number | null;
    circuitOpen: boolean;
    circuitOpenUntil: number | null;
    avgLatencyMs: number;
    totalRequests: number;
}

const RPS_PER_KEY = 10;
const CIRCUIT_OPEN_MS = 30_000;
const ERROR_THRESHOLD = 5;

/**
 * HeliusKeyPool — manages a set of Helius API keys with:
 * - Round-robin dispatch
 * - Per-key circuit breaker (opens after ERROR_THRESHOLD consecutive errors)
 * - Rate limit awareness (tracks requests/minute)
 * - Latency tracking
 */
export class HeliusKeyPool {
    private slots: KeySlot[] = [];
    private index = 0;

    constructor(keys: string[], label: string) {
        this.slots = keys.filter(Boolean).map(key => ({
            key,
            requestsThisMinute: 0,
            consecutiveErrors: 0,
            lastErrorAt: null,
            circuitOpen: false,
            circuitOpenUntil: null,
            avgLatencyMs: 0,
            totalRequests: 0,
        }));

        if (this.slots.length === 0) {
            console.warn(`[HeliusKeyPool:${label}] No keys provided — will throw on dispatch`);
        } else {
            console.log(`[HeliusKeyPool:${label}] Initialized with ${this.slots.length} key(s)`);
        }

        // Reset minute counters every 60s
        setInterval(() => {
            for (const s of this.slots) s.requestsThisMinute = 0;
        }, 60_000).unref();
    }

    get size(): number {
        return this.slots.length;
    }

    get healthy(): number {
        return this.slots.filter(s => !s.circuitOpen).length;
    }

    /** True if this pool has at least one healthy key */
    get isOperational(): boolean {
        return this.slots.length > 0 && this.slots.some(s => !s.circuitOpen);
    }

    /** Get next healthy key in round-robin. Throws if all keys are exhausted. */
    private acquire(): KeySlot {
        if (this.slots.length === 0) {
            throw new Error('HeliusKeyPool: No keys configured');
        }

        const now = Date.now();
        for (let attempt = 0; attempt < this.slots.length * 2; attempt++) {
            const slot = this.slots[this.index % this.slots.length];
            this.index++;

            if (slot.circuitOpen) {
                if (slot.circuitOpenUntil && now >= slot.circuitOpenUntil) {
                    slot.circuitOpen = false;
                    slot.consecutiveErrors = 0;
                    return slot;
                }
                continue;
            }

            return slot;
        }

        throw new Error('HeliusKeyPool: All keys are circuit-open');
    }

    /** Execute a fetch callback with a Helius key, with retries and circuit-breaker logic */
    async fetch<R>(
        urlBuilder: (key: string) => Promise<R>,
    ): Promise<R> {
        const maxRetries = 2;
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            let slot: KeySlot;
            try {
                slot = this.acquire();
            } catch (e) {
                throw lastError || e;
            }

            const start = Date.now();
            slot.requestsThisMinute++;

            try {
                const result = await urlBuilder(slot.key);
                const latency = Date.now() - start;
                slot.consecutiveErrors = 0;
                slot.avgLatencyMs = slot.avgLatencyMs * 0.9 + latency * 0.1;
                slot.totalRequests++;
                return result;
            } catch (err: any) {
                lastError = err;
                slot.consecutiveErrors++;
                slot.lastErrorAt = Date.now();

                if (slot.consecutiveErrors >= ERROR_THRESHOLD) {
                    slot.circuitOpen = true;
                    slot.circuitOpenUntil = Date.now() + CIRCUIT_OPEN_MS;
                    console.warn(`[HeliusKeyPool] Circuit opened for key ${slot.key.slice(0, 8)}...`);
                }

                if (err.status === 429) {
                    await new Promise(r => setTimeout(r, 200 * (attempt + 1)));
                }

                // On last retry, don't sleep
                if (attempt < maxRetries) {
                    await new Promise(r => setTimeout(r, 50 * (attempt + 1)));
                }
            }
        }

        throw lastError || new Error('HeliusKeyPool: All retries exhausted');
    }

    /** Snapshot for monitoring */
    stats() {
        return {
            totalSlots: this.slots.length,
            healthy: this.healthy,
            totalRequests: this.slots.reduce((s, k) => s + k.totalRequests, 0),
            avgLatencyMs: this.slots.reduce((s, k) => s + k.avgLatencyMs, 0) / (this.slots.length || 1),
        };
    }

    /** Transfer all healthy keys from another pool into this one */
    absorb(other: HeliusKeyPool): void {
        const transferred = other.slots.filter(s => !s.circuitOpen);
        for (const s of transferred) {
            this.slots.push(s);
        }
        console.log(`[HeliusKeyPool] Absorbed ${transferred.length} key(s) from another pool (now ${this.slots.length} total)`);
    }
}

// ================================================================
// Pool definitions — load from env, create named pools
// ================================================================

const ALL_HELIUS_KEYS = [
    process.env.HELIUS_KEY_1,
    process.env.HELIUS_KEY_2,
    process.env.HELIUS_KEY_3,
].filter(Boolean) as string[];

if (ALL_HELIUS_KEYS.length === 0) {
    console.warn('[HeliusKeyPool] No HELIUS_KEY_* environment variables found — Helius features will fail');
}

/** Pool A — signatures scanning (gets 2 of 3 keys) */
export const sigHeliusPool = new HeliusKeyPool(
    ALL_HELIUS_KEYS.slice(0, Math.min(2, ALL_HELIUS_KEYS.length)),
    'signatures',
);

/** Pool B — transfers scanning (gets the remaining key) */
export const xferHeliusPool = new HeliusKeyPool(
    ALL_HELIUS_KEYS.slice(2),
    'transfers',
);
