// Input validation utilities for security

export const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
export const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function isValidEthAddress(address: string): boolean {
  return ETH_ADDRESS_REGEX.test(address);
}

export function isValidSolanaAddress(address: string): boolean {
  return SOLANA_ADDRESS_REGEX.test(address);
}

export function isValidAddress(address: string, chain: string): boolean {
  const normalizedChain = chain.toLowerCase();
  
  if (normalizedChain === 'solana' || normalizedChain === 'sol') {
    return isValidSolanaAddress(address);
  }
  
  return isValidEthAddress(address);
}

export function sanitizeString(input: unknown, maxLength: number = 1000): string {
  if (typeof input !== 'string') return '';
  return input.slice(0, maxLength).replace(/[<>\"'&]/g, '');
}

export function validateNumberRange(value: unknown, min: number, max: number): boolean {
  if (typeof value !== 'number') return false;
  return value >= min && value <= max;
}

export function validateArrayLength(value: unknown, maxLength: number): boolean {
  if (!Array.isArray(value)) return false;
  return value.length <= maxLength;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateAddressInput(address: unknown, chain: unknown): ValidationResult {
  if (!address || typeof address !== 'string') {
    return { valid: false, error: 'Address is required' };
  }
  
  if (address.length < 40 || address.length > 120) {
    return { valid: false, error: 'Invalid address length' };
  }
  
  if (!chain || typeof chain !== 'string') {
    return { valid: false, error: 'Chain is required' };
  }
  
  const normalizedChain = chain.toLowerCase();
  const allowedChains = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'bsc', 'avalanche', 'linea', 'solana'];
  
  if (!allowedChains.includes(normalizedChain)) {
    return { valid: false, error: `Invalid chain. Allowed: ${allowedChains.join(', ')}` };
  }
  
  if (!isValidAddress(address, normalizedChain)) {
    return { valid: false, error: 'Invalid address format' };
  }
  
  return { valid: true };
}

export function validateSearchInput(query: unknown, maxLength: number = 200): ValidationResult {
  if (!query || typeof query !== 'string') {
    return { valid: false, error: 'Search query is required' };
  }
  
  const sanitized = sanitizeString(query, maxLength);
  
  if (sanitized.length === 0) {
    return { valid: false, error: 'Search query is empty after sanitization' };
  }
  
  return { valid: true };
}
