/**
 * FundTracer Alert Worker
 * Monitors wallets and sends Telegram alerts with AI analysis
 */

import { WalletAnalyzer } from 'fundtracer-core';
import { getAllWatchedWallets, sendTelegramAlert, analyzeTransactionWithAI } from './TelegramBot.js';

const POLL_INTERVAL = 30000; // 30 seconds
const lastKnownTxs: Map<string, string> = new Map();

let isRunning = false;

function getApiKeys() {
    return {
        alchemy: process.env.DEFAULT_ALCHEMY_API_KEY || process.env.ALCHEMY_API_KEY,
        moralis: process.env.MORALIS_API_KEY,
        dune: process.env.DUNE_API_KEY,
    };
}

export function startAlertWorker() {
    if (isRunning) {
        console.log('[AlertWorker] Already running');
        return;
    }

    isRunning = true;
    console.log('[AlertWorker] Starting alert worker...');

    // Initial scan
    scanWatchedWallets();

    // Poll every 30 seconds
    setInterval(scanWatchedWallets, POLL_INTERVAL);
}

async function scanWatchedWallets() {
    const watchedWallets = getAllWatchedWallets();

    if (watchedWallets.length === 0) {
        return;
    }

    console.log(`[AlertWorker] Scanning ${watchedWallets.length} wallets...`);

    const apiKeys = getApiKeys();
    
    if (!apiKeys.alchemy) {
        console.log('[AlertWorker] No Alchemy API key configured, skipping...');
        return;
    }

    const analyzer = new WalletAnalyzer(apiKeys);

    for (const { userId, wallet } of watchedWallets) {
        try {
            const result = await analyzer.analyze(
                wallet.address,
                wallet.chain as any,
                { transactionLimit: 50 }
            );

            // Get the latest transaction hash
            const latestTx = result.transactions?.[0];

            if (!latestTx) continue;

            const txKey = `${wallet.address}-${wallet.chain}`;
            const lastKnownHash = lastKnownTxs.get(txKey);

            // New transaction detected
            if (latestTx.hash !== lastKnownHash) {
                lastKnownTxs.set(txKey, latestTx.hash);

                console.log(`[AlertWorker] New tx for ${wallet.address}: ${latestTx.hash}`);

                // Get AI analysis
                const aiAnalysis = await analyzeTransactionWithAI({
                    hash: latestTx.hash,
                    from: latestTx.from,
                    to: latestTx.to || '',
                    value: latestTx.valueInEth,
                    chain: wallet.chain,
                    timestamp: latestTx.timestamp
                });

                // Send Telegram alert
                await sendTelegramAlert(
                    userId,
                    wallet.address,
                    wallet.chain,
                    {
                        hash: latestTx.hash,
                        from: latestTx.from,
                        to: latestTx.to || '',
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

// Export for manual trigger
export async function triggerScan() {
    await scanWatchedWallets();
}
