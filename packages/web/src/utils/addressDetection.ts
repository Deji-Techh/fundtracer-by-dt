// ============================================================
// FundTracer by DT - Address Detection Utility
// Detects whether an address is EVM or Solana
// ============================================================

export function detectAddressChain(input: string): 'evm' | 'solana' | null {
  if (!input) return null;

  const trimmed = input.trim();
  
  if (trimmed.endsWith('.sol')) return 'solana';
  if (trimmed.endsWith('.eth')) return 'evm';
  
  if (trimmed.startsWith('0x') && trimmed.length === 42) {
    return 'evm';
  }
  
  if (trimmed.length >= 32 && trimmed.length <= 44) {
    const base58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    if ([...trimmed].every(c => base58Chars.includes(c))) {
      return 'solana';
    }
  }
  
  return null;
}

export function isValidSolanaAddress(address: string): boolean {
  try {
    if (!address) return false;
    if (address.length < 32 || address.length > 44) return false;
    
    const base58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    return [...address].every(c => base58Chars.includes(c));
  } catch {
    return false;
  }
}

export function isValidEvmAddress(address: string): boolean {
  if (!address) return false;
  return address.startsWith('0x') && address.length === 42;
}

export function formatSolanaAddress(address: string, chars: number = 4): string {
  if (!address || address.length < chars * 2) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}
