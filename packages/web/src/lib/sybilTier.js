// ============================================================
// Sybil Tier System & Payment Configuration
// ============================================================

// Tier configurations
export const SYBIL_TIERS = {
  free: {
    id: 'free',
    name: 'Free Tier',
    price: 0,
    monthly: false,
    dailyLimit: 7,
    requiresGasPayment: true,
    paymentAddress: '0x4436977aCe641EdfE5A83b0d974Bd48443a448fd',
    benefits: [
      '7 operations per day',
      'Basic Sybil detection',
      'Manual address input',
      'Network graph view',
    ],
    color: '#6b7280',
    bgColor: 'rgba(107, 114, 128, 0.1)',
  },
  pro: {
    id: 'pro',
    name: 'Pro Tier',
    price: 5,
    monthly: true,
    dailyLimit: 25,
    requiresGasPayment: false,
    paymentAddress: '0xFF1A1D11CB6bad91C6d9250082D1DF44d84e4b87',
    benefits: [
      '25 operations per day',
      'Advanced Sybil detection',
      'Auto-fetch from contracts',
      'Export to CSV/JSON/PDF',
      'Priority support',
    ],
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
  },
  max: {
    id: 'max',
    name: 'Max Tier',
    price: 10,
    monthly: true,
    dailyLimit: 'unlimited',
    requiresGasPayment: false,
    paymentAddress: '0xFF1A1D11CB6bad91C6d9250082D1DF44d84e4b87',
    benefits: [
      'Unlimited operations',
      'All Pro features',
      'API access',
      'Custom branding',
      'Priority processing',
    ],
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.1)',
  },
};

// Local storage keys
const SYBIL_USAGE_KEY = 'fundtracer_sybil_usage';
const SYBIL_PAYMENT_KEY = 'fundtracer_sybil_payment';

// Get midnight UTC timestamp for today
function getMidnightUTC() {
  const now = new Date();
  const midnight = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  return midnight.getTime();
}

// Check if usage needs reset (daily)
function shouldResetUsage() {
  const stored = localStorage.getItem(SYBIL_USAGE_KEY);
  if (!stored) return true;

  try {
    const usage = JSON.parse(stored);
    const midnight = getMidnightUTC();
    return usage.lastReset < midnight;
  } catch {
    return true;
  }
}

// Get current usage
export function getSybilUsage() {
  if (shouldResetUsage()) {
    const fresh = {
      operations: 0,
      lastReset: getMidnightUTC(),
    };
    localStorage.setItem(SYBIL_USAGE_KEY, JSON.stringify(fresh));
    return fresh;
  }

  const stored = localStorage.getItem(SYBIL_USAGE_KEY);
  if (!stored) {
    const fresh = {
      operations: 0,
      lastReset: getMidnightUTC(),
    };
    localStorage.setItem(SYBIL_USAGE_KEY, JSON.stringify(fresh));
    return fresh;
  }

  try {
    return JSON.parse(stored);
  } catch {
    return {
      operations: 0,
      lastReset: getMidnightUTC(),
    };
  }
}

// Increment usage counter
export function incrementSybilUsage() {
  const usage = getSybilUsage();
  const updated = {
    operations: usage.operations + 1,
    lastReset: usage.lastReset,
  };
  localStorage.setItem(SYBIL_USAGE_KEY, JSON.stringify(updated));
  return updated.operations;
}

// Check if user can perform operation
export function canPerformSybilOperation(tier) {
  const config = SYBIL_TIERS[tier];
  if (!config) return false;

  const usage = getSybilUsage();

  if (config.dailyLimit === 'unlimited') return true;
  return usage.operations < config.dailyLimit;
}

// Get remaining operations
export function getRemainingOperations(tier) {
  const config = SYBIL_TIERS[tier];
  if (!config) return 0;

  if (config.dailyLimit === 'unlimited') return 'unlimited';

  const usage = getSybilUsage();
  return Math.max(0, config.dailyLimit - usage.operations);
}

// Store payment for verification
export function storePaymentVerification(walletAddress, txHash) {
  const key = `${SYBIL_PAYMENT_KEY}_${walletAddress}`;
  localStorage.setItem(key, JSON.stringify({
    isPaid: false,
    txHash,
    timestamp: Date.now(),
  }));
}

// Get stored payment verification
export function getStoredPaymentVerification(walletAddress) {
  const key = `${SYBIL_PAYMENT_KEY}_${walletAddress}`;
  const stored = localStorage.getItem(key);
  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

// Clear payment verification
export function clearPaymentVerification(walletAddress) {
  const key = `${SYBIL_PAYMENT_KEY}_${walletAddress}`;
  localStorage.removeItem(key);
}
