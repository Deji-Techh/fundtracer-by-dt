// ============================================================
// FundTracer by DT - RPC Key Pool
// Manages mixed provider keys (Helius + Alchemy) for Solana RPC
// Each slot stores a full RPC endpoint URL.
// Supports multiple named pools with circuit breaker.
// ============================================================

interface RpcEndpoint {
    url: string;
    label: string;
    requestsThisMinute: number;
    consecutiveErrors: number;
    lastErrorAt: number | null;
    circuitOpen: boolean;
    circuitOpenUntil: number | null;
    avgLatencyMs: number;
    totalRequests: number;
}

const CIRCUIT_OPEN_MS = 30_000;
const ERROR_THRESHOLD = 5;

/**
 * RpcKeyPool — manages a set of Solana RPC endpoints with:
 * - Round-robin dispatch across all URLs
 * - Per-endpoint circuit breaker
 * - Latency tracking
 */
export class RpcKeyPool {
    private slots: RpcEndpoint[] = [];
    private index = 0;

    constructor(endpoints: Array<{ url: string; label: string }>, label: string) {
        this.slots = endpoints.filter(e => e.url).map(e => ({
            url: e.url,
            label: e.label,
            requestsThisMinute: 0,
            consecutiveErrors: 0,
            lastErrorAt: null,
            circuitOpen: false,
            circuitOpenUntil: null,
            avgLatencyMs: 0,
            totalRequests: 0,
        }));

        if (this.slots.length === 0) {
            console.warn(`[RpcKeyPool:${label}] No endpoints configured`);
        } else {
            console.log(`[RpcKeyPool:${label}] Initialized with ${this.slots.length} endpoint(s): ${this.slots.map(s => s.label).join(', ')}`);
        }

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

    get isOperational(): boolean {
        return this.slots.length > 0 && this.slots.some(s => !s.circuitOpen);
    }

    private acquire(): RpcEndpoint {
        if (this.slots.length === 0) {
            throw new Error('RpcKeyPool: No endpoints configured');
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

        throw new Error('RpcKeyPool: All endpoints are circuit-open');
    }

    /** Execute an RPC method through the pool */
    async rpc(method: string, params: any[]): Promise<any> {
        const maxRetries = 2;
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            let slot: RpcEndpoint;
            try {
                slot = this.acquire();
            } catch (e) {
                throw lastError || e;
            }

            const start = Date.now();
            slot.requestsThisMinute++;

            try {
                const res = await fetch(slot.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
                });
                const data = await res.json();
                if (data.error) throw new Error(data.error.message);

                const latency = Date.now() - start;
                slot.consecutiveErrors = 0;
                slot.avgLatencyMs = slot.avgLatencyMs * 0.9 + latency * 0.1;
                slot.totalRequests++;
                return data.result;
            } catch (err: any) {
                lastError = err;
                slot.consecutiveErrors++;
                slot.lastErrorAt = Date.now();

                if (slot.consecutiveErrors >= ERROR_THRESHOLD) {
                    slot.circuitOpen = true;
                    slot.circuitOpenUntil = Date.now() + CIRCUIT_OPEN_MS;
                    console.warn(`[RpcKeyPool] Circuit opened for ${slot.label}`);
                }

                if (err.status === 429) {
                    await new Promise(r => setTimeout(r, 200 * (attempt + 1)));
                }
                if (attempt < maxRetries) {
                    await new Promise(r => setTimeout(r, 50 * (attempt + 1)));
                }
            }
        }

        throw lastError || new Error('RpcKeyPool: All retries exhausted');
    }

    stats() {
        return {
            totalSlots: this.slots.length,
            healthy: this.healthy,
            totalRequests: this.slots.reduce((s, k) => s + k.totalRequests, 0),
            avgLatencyMs: this.slots.reduce((s, k) => s + k.avgLatencyMs, 0) / (this.slots.length || 1),
        };
    }

    absorb(other: RpcKeyPool): void {
        const transferred = other.slots.filter(s => !s.circuitOpen);
        for (const s of transferred) {
            this.slots.push(s);
        }
        console.log(`[RpcKeyPool] Absorbed ${transferred.length} endpoint(s) from another pool (now ${this.slots.length} total)`);
    }
}

// ================================================================
// Collect all available RPC endpoints from env vars
// ================================================================

function buildEndpoints(): Array<{ url: string; label: string }> {
    const eps: Array<{ url: string; label: string }> = [];

    // Helius keys (3 max)
    for (let i = 1; i <= 3; i++) {
        const key = process.env[`HELIUS_KEY_${i}`];
        if (key) {
            eps.push({ url: `https://mainnet.helius-rpc.com/?api-key=${key}`, label: `Helius-${i}` });
        }
    }

    // Alchemy Solana key
    const alchemyKey = process.env.ALCHEMY_SOLANA_API_KEY;
    if (alchemyKey) {
        eps.push({ url: `https://solana-mainnet.g.alchemy.com/v2/${alchemyKey}`, label: 'Alchemy-Sol' });
    }

    return eps;
}

const ALL_ENDPOINTS = buildEndpoints();

if (ALL_ENDPOINTS.length === 0) {
    console.warn('[RpcKeyPool] No Solana RPC endpoints found — Helius/Alchemy features will fail');
} else {
    console.log(`[RpcKeyPool] Found ${ALL_ENDPOINTS.length} Solana RPC endpoint(s)`);
}

/** Pool A — high-throughput RPC (2/3 of available endpoints) */
const splitPoint = Math.max(1, Math.floor(ALL_ENDPOINTS.length * 0.66));
export const sigRpcPool = new RpcKeyPool(ALL_ENDPOINTS.slice(0, splitPoint), 'sig-rpc');

/** Pool B — secondary RPC (remaining endpoints) */
export const xferRpcPool = new RpcKeyPool(ALL_ENDPOINTS.slice(splitPoint), 'xfer-rpc');
