// ============================================================
// FundTracer CLI - Database Module
// SQLite database for history, favorites, and caching
// ============================================================

import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';

const DB_DIR = path.join(os.homedir(), '.fundtracer');
const DB_PATH = path.join(DB_DIR, 'fundtracer.db');

// Ensure directory exists
if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
}

export class FundtracerDB {
    private db: Database.Database;

    constructor() {
        this.db = new Database(DB_PATH);
        this.init();
    }

    private init() {
        // History table - tracks analyzed addresses
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                address TEXT NOT NULL,
                chain TEXT NOT NULL,
                command TEXT NOT NULL,
                timestamp INTEGER DEFAULT (strftime('%s', 'now')),
                result_hash TEXT,
                risk_score INTEGER
            )
        `);

        // Favorites table - bookmarked wallets
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS favorites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                address TEXT NOT NULL UNIQUE,
                name TEXT,
                chain TEXT DEFAULT 'ethereum',
                notes TEXT,
                created_at INTEGER DEFAULT (strftime('%s', 'now'))
            )
        `);

        // Cache table - cached analysis results
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                address TEXT NOT NULL,
                chain TEXT NOT NULL,
                data TEXT NOT NULL,
                cached_at INTEGER DEFAULT (strftime('%s', 'now')),
                expires_at INTEGER,
                UNIQUE(address, chain)
            )
        `);

        // Settings table - user preferences
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        `);

        // Create indexes
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_history_address ON history(address)`);
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_history_timestamp ON history(timestamp DESC)`);
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache(expires_at)`);
    }

    // History methods
    addToHistory(address: string, chain: string, command: string, riskScore?: number) {
        const stmt = this.db.prepare(
            'INSERT INTO history (address, chain, command, risk_score) VALUES (?, ?, ?, ?)'
        );
        stmt.run(address.toLowerCase(), chain, command, riskScore ?? null);
        
        // Keep only last 100 entries
        this.db.exec(`DELETE FROM history WHERE id NOT IN (SELECT id FROM history ORDER BY timestamp DESC LIMIT 100)`);
    }

    getHistory(limit: number = 20): Array<{address: string, chain: string, command: string, timestamp: number, risk_score: number | null}> {
        const stmt = this.db.prepare(
            'SELECT address, chain, command, timestamp, risk_score FROM history ORDER BY timestamp DESC LIMIT ?'
        );
        return stmt.all(limit) as any;
    }

    searchHistory(query: string): Array<{address: string, chain: string, command: string, timestamp: number}> {
        const stmt = this.db.prepare(
            "SELECT address, chain, command, timestamp FROM history WHERE address LIKE ? ORDER BY timestamp DESC"
        );
        return stmt.all(`%${query}%`) as any;
    }

    clearHistory() {
        this.db.exec('DELETE FROM history');
    }

    // Favorites methods
    addFavorite(address: string, name?: string, chain: string = 'ethereum', notes?: string) {
        const stmt = this.db.prepare(
            'INSERT OR REPLACE INTO favorites (address, name, chain, notes) VALUES (?, ?, ?, ?)'
        );
        stmt.run(address.toLowerCase(), name ?? null, chain, notes ?? null);
    }

    removeFavorite(address: string) {
        const stmt = this.db.prepare('DELETE FROM favorites WHERE address = ?');
        stmt.run(address.toLowerCase());
    }

    getFavorites(): Array<{address: string, name: string | null, chain: string, notes: string | null}> {
        const stmt = this.db.prepare('SELECT address, name, chain, notes FROM favorites ORDER BY created_at DESC');
        return stmt.all() as any;
    }

    isFavorite(address: string): boolean {
        const stmt = this.db.prepare('SELECT COUNT(*) as count FROM favorites WHERE address = ?');
        const result = stmt.get(address.toLowerCase()) as any;
        return result.count > 0;
    }

    // Cache methods
    getCache(address: string, chain: string): any | null {
        const stmt = this.db.prepare(
            'SELECT data FROM cache WHERE address = ? AND chain = ? AND expires_at > strftime("%s", "now")'
        );
        const result = stmt.get(address.toLowerCase(), chain) as any;
        return result ? JSON.parse(result.data) : null;
    }

    setCache(address: string, chain: string, data: any, ttlMinutes: number = 60) {
        const expiresAt = Math.floor(Date.now() / 1000) + (ttlMinutes * 60);
        const stmt = this.db.prepare(
            'INSERT OR REPLACE INTO cache (address, chain, data, expires_at) VALUES (?, ?, ?, ?)'
        );
        stmt.run(address.toLowerCase(), chain, JSON.stringify(data), expiresAt);
    }

    clearExpiredCache() {
        this.db.exec('DELETE FROM cache WHERE expires_at < strftime("%s", "now")');
    }

    clearAllCache() {
        this.db.exec('DELETE FROM cache');
    }

    // Settings methods
    getSetting(key: string, defaultValue?: string): string | undefined {
        const stmt = this.db.prepare('SELECT value FROM settings WHERE key = ?');
        const result = stmt.get(key) as any;
        return result ? result.value : defaultValue;
    }

    setSetting(key: string, value: string) {
        const stmt = this.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
        stmt.run(key, value);
    }

    close() {
        this.db.close();
    }
}

// Singleton instance
export const db = new FundtracerDB();
