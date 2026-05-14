// ============================================================
// Block Timestamp Cache Interface
// Block timestamps are immutable — once fetched, store forever.
// ============================================================

export interface BlockTimestampCache {
    /** Get a single block's timestamp */
    get(chain: string, blockNumber: number): Promise<number | null>;

    /** Get timestamps for many blocks in one round trip */
    getMany(chain: string, blockNumbers: number[]): Promise<Map<number, number>>;

    /** Store a single block's timestamp */
    set(chain: string, blockNumber: number, timestamp: number): Promise<void>;
}
