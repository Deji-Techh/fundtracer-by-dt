
import { JsonRpcProvider, Contract, formatUnits } from 'ethers';
import { getFirestore } from '../firebase.js';

const LINEA_RPC = 'https://rpc.linea.build';
const USDT_ADDRESS = '0xA219439258ca9da29E9Cc4cE5596924745e12B93';
const TARGET_WALLET = process.env.PAYMENT_WALLET || '0xFF1A1D11CB6bad91C6d9250082D1DF44d84e4b87';

const USDT_ABI = [
    "event Transfer(address indexed from, address indexed to, uint256 value)"
];

export class PaymentListener {
    private provider: JsonRpcProvider;
    private contract: Contract;
    private isRunning: boolean = false;

    constructor() {
        this.provider = new JsonRpcProvider(LINEA_RPC);
        this.contract = new Contract(USDT_ADDRESS, USDT_ABI, this.provider);
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log('[PaymentListener] Starting USDT payment listener on Linea...');

        // Listen for Transfer events to our target wallet
        // from: any (null), to: TARGET_WALLET
        const filter = this.contract.filters.Transfer(null, TARGET_WALLET);

        this.contract.on(filter, async (from, to, value, event) => {
            try {
                // value is BigInt, USDT has 6 decimals
                const amount = parseFloat(formatUnits(value, 6));
                console.log(`[PaymentListener] Detected transfer: ${amount} USDT from ${from}`);

                await this.handlePayment(from, amount, event.log.transactionHash);
            } catch (error) {
                console.error('[PaymentListener] Error processing event:', error);
            }
        });
    }

    private async handlePayment(from: string, amount: number, txHash: string) {
        const db = getFirestore();
        const userRef = db.collection('users').doc(from.toLowerCase());

        let newTier = '';
        if (amount >= 20) {
            newTier = 'max';
        } else if (amount >= 5) {
            newTier = 'pro';
        } else {
            return; // Ignore small amounts
        }

        const now = Date.now();
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        const expiry = now + thirtyDays;

        await userRef.set({
            tier: newTier,
            subscriptionExpiry: expiry,
            lastPaymentTx: txHash,
            updatedAt: now
        }, { merge: true });

        console.log(`[PaymentListener] Upgraded user ${from} to ${newTier} until ${new Date(expiry).toISOString()}`);
    }
}
