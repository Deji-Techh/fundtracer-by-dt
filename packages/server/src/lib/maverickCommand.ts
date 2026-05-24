import type { ParsedMaverickCommand } from '@fundtracer/core';

const COMMAND_REGEX = /@FT\s+MAVERIICK\s+(analyze|compare|risk|trace)\s+(0x[a-fA-F0-9]{40}|[1-9A-HJ-NP-Za-km-z]{32,44})(?:\s+on\s+(\w+))?/i;

const CHAIN_MAP: Record<string, string> = {
  eth: 'ethereum', arb: 'arbitrum', opt: 'optimism', poly: 'polygon',
  matic: 'polygon', binance: 'bsc', sol: 'solana',
};

function normalizeChain(input: string = 'ethereum'): string {
  const lower = input.toLowerCase();
  return CHAIN_MAP[lower] || lower;
}

export function parseMaverickCommand(text: string): ParsedMaverickCommand | null {
  const match = text.match(COMMAND_REGEX);
  if (!match) return null;

  const [, command, address, chainRaw] = match;
  return {
    type: command.toLowerCase() as ParsedMaverickCommand['type'],
    address,
    chain: normalizeChain(chainRaw),
    rawCommand: match[0],
  };
}

export function hasMaverickTrigger(text: string): boolean {
  return /@FT\s+MAVERIICK/i.test(text);
}
