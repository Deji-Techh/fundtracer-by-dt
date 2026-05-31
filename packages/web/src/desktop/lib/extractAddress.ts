// Extract a wallet/contract address from various input formats
export function extractAddress(input: string): string | null {
  const trimmed = input.trim();

  // Direct EVM address
  if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  // Solana address (base58, 32-44 chars)
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed)) {
    return trimmed;
  }

  // ENS name
  if (/^[a-zA-Z0-9][a-zA-Z0-9-]*\.eth$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  // Etherscan URL
  const etherscanMatch = trimmed.match(/etherscan\.io\/address\/(0x[a-fA-F0-9]{40})/);
  if (etherscanMatch) return etherscanMatch[1].toLowerCase();

  // Solscan URL
  const solscanMatch = trimmed.match(/solscan\.io\/account\/([1-9A-HJ-NP-Za-km-z]{32,44})/);
  if (solscanMatch) return solscanMatch[1];

  // Other block explorer URLs
  const explorerMatch = trimmed.match(/\/(?:address|token)\/(0x[a-fA-F0-9]{40})/);
  if (explorerMatch) return explorerMatch[1].toLowerCase();

  return null;
}
