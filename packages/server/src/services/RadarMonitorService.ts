/**
 * Radar Monitoring Service
 * Polls for wallet activity and sends alerts
 */
import fetch from 'node-fetch';
import { alertService, RadarAlert } from '../services/AlertService.js';
import { sendEmail } from '../services/EmailService.js';
import { buildRadarAlertEmail } from '../services/RadarEmailService.js';

const RADAR_FROM = 'Fundtracer Radar <alert@fundtracer.xyz>';
const POLL_INTERVAL = 30000; // 30 seconds

const ALCHEMY_SOLANA_API = 'https://solana-mainnet.g.alchemy.com/v2';

interface SolanaTransaction {
    signature: string;
    slot: number;
    blockTime: number;
    fee: number;
    status: { Ok: any } | { Err: any };
}

class RadarMonitorService {
    private running = false;
    private intervals: Map<string, NodeJS.Timeout> = new Map();
    private lastChecked: Map<string, number> = new Map();
    private apiKey: string;

    constructor() {
        this.apiKey = process.env.ALCHEMY_SOLANA_API_KEY || '';
    }

    /**
     * Start monitoring all enabled alerts for a chain
     */
    async startMonitoring(chain: 'solana' | 'evm' = 'solana'): Promise<void> {
        if (this.running) {
            console.log(`[RadarMonitor] Already running`);
            return;
        }

        if (!this.apiKey) {
            console.log(`[RadarMonitor] No ALCHEMY_SOLANA_API_KEY configured`);
            return;
        }

        this.running = true;
        console.log(`[RadarMonitor] Starting monitoring for ${chain}...`);

        // Initial check
        await this.checkAlerts(chain);

        // Set up interval
        const interval = setInterval(async () => {
            try {
                await this.checkAlerts(chain);
            } catch (error) {
                console.error('[RadarMonitor] Check error:', error);
            }
        }, POLL_INTERVAL);

        this.intervals.set(chain, interval);
        console.log(`[RadarMonitor] Started polling every ${POLL_INTERVAL / 1000}s`);
    }

    /**
     * Stop monitoring
     */
    stopMonitoring(chain?: 'solana' | 'evm'): void {
        if (chain) {
            const interval = this.intervals.get(chain);
            if (interval) {
                clearInterval(interval);
                this.intervals.delete(chain);
                console.log(`[RadarMonitor] Stopped ${chain}`);
            }
        } else {
            this.intervals.forEach((interval) => {
                clearInterval(interval);
            });
            this.intervals.clear();
            this.running = false;
            console.log('[RadarMonitor] Stopped all');
        }
    }

    /**
     * Check all alerts for new activity
     */
    private async checkAlerts(chain: 'solana' | 'evm'): Promise<void> {
        const alerts = await alertService.getEnabledAlerts(chain);
        
        if (alerts.length === 0) {
            return;
        }

        console.log(`[RadarMonitor] Checking ${alerts.length} ${chain} alerts...`);

        for (const alert of alerts) {
            try {
                await this.checkAlert(alert);
            } catch (error) {
                console.error(`[RadarMonitor] Error checking alert ${alert.id}:`, error);
            }
        }
    }

    /**
     * Check a single alert for new transactions using Alchemy
     */
    private async checkAlert(alert: RadarAlert): Promise<void> {
        if (alert.chain !== 'solana') {
            console.log(`[RadarMonitor] EVM not yet supported`);
            return;
        }

        const lastCheck = this.lastChecked.get(alert.id) || Math.floor(Date.now() / 1000) - 300;
        
        try {
            // Get recent transactions using getTransactionsForAddress
            const url = `${ALCHEMY_SOLANA_API}/${this.apiKey}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'getTransactionsForAddress',
                    params: [
                        alert.address,
                        {
                            transactionDetails: 'signatures',
                            sortOrder: 'desc',
                            limit: 10,
                            filters: {
                                status: 'succeeded'
                            }
                        }
                    ]
                })
            });

            const data = await response.json() as any;
            const transactions: SolanaTransaction[] = data.result?.data || [];

            if (transactions.length === 0) {
                return;
            }

            // Process each transaction
            for (const tx of transactions) {
                if (tx.blockTime <= lastCheck) {
                    continue; // Already checked
                }

                await this.processTransaction(alert, tx.signature, tx.blockTime);
            }

            // Update last checked time
            this.lastChecked.set(alert.id, Math.floor(Date.now() / 1000));

        } catch (error) {
            console.error(`[RadarMonitor] Error fetching transactions:`, error);
        }
    }

    /**
     * Process a detected transaction and send alert if needed
     */
    async processTransaction(
        alert: RadarAlert,
        txHash: string,
        timestamp: number
    ): Promise<void> {
        // Check for duplicate
        const isDuplicate = await alertService.isDuplicateActivity(alert.id, txHash, 60);
        if (isDuplicate) {
            console.log(`[RadarMonitor] Duplicate tx ${txHash}, skipping`);
            return;
        }

        // For now, send a generic transaction notification
        // In production, you'd parse the transaction to get actual amounts
        const type = 'other';
        const amount = 0;
        const amountUSD = 0;

        // Check threshold for large transfers
        if (alert.alertType === 'large_transfer' && alert.threshold) {
            // Would need to fetch tx details to check amount
            // For now, skip threshold check
            console.log(`[RadarMonitor] Skipping threshold check - need tx details`);
        }

        // Record activity
        const activityId = await alertService.recordActivity({
            alertId: alert.id,
            address: alert.address,
            type: type as any,
            amount,
            amountUSD,
            txHash,
            timestamp: timestamp as any
        });

        console.log(`[RadarMonitor] Recorded activity ${activityId}`);

        // Send email notification
        try {
            const { subject, html } = buildRadarAlertEmail(
                alert.address,
                alert.label || 'Wallet',
                'Transaction',
                '1',
                '0',
                txHash,
                alert.customMessage
            );

            await sendEmail({
                to: alert.email,
                subject,
                html,
                from: RADAR_FROM
            });

            console.log(`[RadarMonitor] Sent alert email for ${txHash}`);
        } catch (error) {
            console.error(`[RadarMonitor] Failed to send email:`, error);
        }
    }
}

export const radarMonitorService = new RadarMonitorService();