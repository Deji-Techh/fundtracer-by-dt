/**
 * FundTracer Alert Worker
 * Monitors wallets and sends Telegram alerts with AI analysis
 */

import { WalletAnalyzer } from 'fundtracer-core';
import { getAllLinkedUsers, sendAlert, analyzeTransaction } from './TelegramBot.js';

const DATA_FILE = process.env.DATA_FILE || './data/telegram-bot.json';

const frequencyIntervals: Record<string, number> = {
    realtime: 30000,
    '20min': 20 * 60 * 1000,
    '30min': 30 * 60 * 1000,
    '1hr': 60 * 60 * 1000
};

let lastKnownTxs: Map<string, string> = new Map();
let isRunning = false;
let scanIntervals: Map<string, NodeJS.Timeout> = new Map();

function getApiKeys() {
    return {
        alchemy: process.env.DEFAULT_ALCHEMY_API_KEY || process.env.ALCHEMY_API_KEY,
        moralis: process.env.MORALIS_API_KEY,
        dune: process.env.DUNE_API_KEY,
    };
}

function ensureDataDir() {
    const fs = require('fs');
    const dir = require('path').dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function loadLastKnownTxs(): Map<string, string> {
    try {
        const fs = require('fs');
        const filePath = DATA_FILE.replace('.json', '-tx.json');
        if (fs.existsSync(filePath)) {
            return new Map(JSON.parse(fs.readFileSync(filePath, 'utf8')));
        }
    } catch (e) {
        console.error('[AlertWorker] Failed to load lastKnownTxs:', e);
    }
    return new Map();
}

function saveLastKnownTxs() {
    try {
        const fs = require('fs');
        const filePath = DATA_FILE.replace('.json', '-tx.json');
        ensureDataDir();
        fs.writeFileSync(filePath, JSON.stringify(Array.from(lastKnownTxs.entries())));
    } catch (e) {
        console.error('[AlertWorker] Failed to save lastKnownTxs:', e);
    }
}

export function startAlertWorker() {
    if (isRunning) {
        console.log('[AlertWorker] Already running');
        return;
    }

    isRunning = true;
    console.log('[AlertWorker] Starting alert worker...');

    lastKnownTxs = loadLastKnownTxs();

    setInterval(() => {
        saveLastKnownTxs();
    }, 60000);

    setTimeout(scanWatchedWallets, 5000);

    console.log('[AlertWorker] Started');
}

async function scanWatchedWallets() {
    const users = getAllLinkedUsers();

    if (users.length === 0) {
        return;
    }

    const apiKeys = getApiKeys();
    
    if (!apiKeys.alchemy) {
        console.log('[AlertWorker] No Alchemy API key configured, skipping...');
        return;
    }

    const analyzer = new WalletAnalyzer(apiKeys);

    for (const user of users) {
        const freq = user.alertFrequency || 'realtime';
        const interval = frequencyIntervals[freq];
        const key = `${user.telegramId}`;

        const existingInterval = scanIntervals.get(key);
        if (existingInterval) {
            continue;
        }

        scanIntervals.set(key, setInterval(async () => {
            await scanUserWallets(user, analyzer);
        }, interval));

        await scanUserWallets(user, analyzer);
    }
}

async function scanUserWallets(user: typeof getAllLinkedUsers extends () => infer R ? R extends (infer U)[] ? U : never : never, analyzer: WalletAnalyzer) {
    for (const wallet of user.watches) {
        try {
            const result = await analyzer.analyze(
                wallet.address,
                wallet.chain as any,
                { transactionLimit: 50 }
            );

            const latestTx = result.transactions?.[0];

            if (!latestTx) continue;

            const txKey = `${wallet.address}-${wallet.chain}`;
            const lastKnownHash = lastKnownTxs.get(txKey);

            if (latestTx.hash !== lastKnownHash) {
                lastKnownTxs.set(txKey, latestTx.hash);
                saveLastKnownTxs();

                console.log(`[AlertWorker] New tx for ${wallet.address}: ${latestTx.hash}`);

                const aiAnalysis = await analyzeTransaction({
                    hash: latestTx.hash,
                    from: latestTx.from,
                    to: latestTx.to || '',
                    value: latestTx.valueInEth,
                    chain: wallet.chain
                });

                await sendAlert(
                    user.telegramId,
                    wallet.address,
                    wallet.chain,
                    {
                        hash: latestTx.hash,
                        value: latestTx.valueInEth,
                        isIncoming: latestTx.isIncoming || false
                    },
                    aiAnalysis
                );
            }
        } catch (error) {
            console.error(`[AlertWorker] Error scanning ${wallet.address}:`, error);
        }
    }
}

export async function triggerScan() {
    const users = getAllLinkedUsers();
    const apiKeys = getApiKeys();
    
    if (!apiKeys.alchemy) {
        console.log('[AlertWorker] No Alchemy API key configured');
        return;
    }

    const analyzer = new WalletAnalyzer(apiKeys);

    for (const user of users) {
        await scanUserWallets(user, analyzer);
    }
}

export function stopAlertWorker() {
    for (const interval of Array.from(scanIntervals.values())) {
        clearInterval(interval);
    }
    scanIntervals.clear();
    isRunning = false;
    console.log('[AlertWorker] Stopped');
}
