/**
 * Payment Configuration
 * All payment addresses are loaded from environment variables
 * This prevents hardcoding sensitive addresses in the codebase
 */

// Payment wallet addresses from environment
export const PAYMENT_CONFIG = {
  // Primary payment wallet (USDT payments)
  primaryAddress: process.env.VITE_PAYMENT_ADDRESS || process.env.PAYMENT_ADDRESS,
  
  // Secondary/Gas payment wallet
  gasAddress: process.env.VITE_GAS_PAYMENT_ADDRESS || process.env.GAS_PAYMENT_ADDRESS,
  
  // Target wallet for analysis payments
  targetAddress: process.env.VITE_TARGET_WALLET || process.env.TARGET_WALLET,
  
  // USDT Contract on Linea
  usdtContract: process.env.USDT_CONTRACT || '0xA219439258ca9da29E9Cc4cE5596924745e12B93'
};

// Validate that required addresses are set
export function validatePaymentConfig(): void {
  const missing: string[] = [];
  
  if (!PAYMENT_CONFIG.primaryAddress) {
    missing.push('VITE_PAYMENT_ADDRESS / PAYMENT_ADDRESS');
  }
  
  if (!PAYMENT_CONFIG.gasAddress) {
    missing.push('VITE_GAS_PAYMENT_ADDRESS / GAS_PAYMENT_ADDRESS');
  }
  
  if (!PAYMENT_CONFIG.targetAddress) {
    missing.push('VITE_TARGET_WALLET / TARGET_WALLET');
  }
  
  if (missing.length > 0) {
    console.error('CRITICAL: Missing required payment configuration:');
    missing.forEach(key => console.error(`  - ${key}`));
    console.error('Please set these environment variables');
    
    // In production, fail hard. In development, warn but continue
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}

// Tier pricing configuration
export const TIER_CONFIG = {
  basic: {
    name: 'Basic',
    price: 5,
    walletLimit: 1,
    get paymentAddress() { return PAYMENT_CONFIG.primaryAddress; }
  },
  pro: {
    name: 'Pro',
    price: 10,
    walletLimit: 5,
    get paymentAddress() { return PAYMENT_CONFIG.gasAddress; }
  },
  max: {
    name: 'Max',
    price: 20,
    walletLimit: 20,
    get paymentAddress() { return PAYMENT_CONFIG.gasAddress; }
  }
};

export default PAYMENT_CONFIG;
