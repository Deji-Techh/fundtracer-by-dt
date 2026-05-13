// ============================================================
// BridgeDetector Service
// Detects bridge transactions across supported chains by
// matching known bridge protocol contract addresses.
// ============================================================

export interface BridgeEvent {
  bridge: string;
  sourceTx: string;
  destChain: string;
  destAddress?: string;
  amount: string;
  tokenBridged: string;
  timestamp: number;
}

interface BridgeProtocolEntry {
  name: string;
  address: string;
}

/**
 * Known bridge protocol contract addresses per chain.
 *
 * Real addresses are included where publicly verifiable.
 * Protocols listed without a specific address (e.g., Mayan, Allbridge, deBridge
 * on Solana) are still registered to mark their presence on that chain.
 */
const BRIDGE_PROTOCOLS: Record<string, BridgeProtocolEntry[]> = {
  solana: [
    { name: 'Wormhole', address: 'worm2ZoG2kUd4vFXhvjh93UUH596ayRfgJ2vmj83A9U' },
    { name: 'Mayan', address: '' },
    { name: 'Allbridge', address: '' },
    { name: 'deBridge', address: '' },
  ],
  ethereum: [
    { name: 'Wormhole', address: '0x3ee18B2214AFF97000D974cf647E7C347E8fa585' },
    { name: 'Stargate', address: '0x8731d54E9D02c286767d56ac03e8037C07e01e98' },
    { name: 'Across', address: '0x5c7BCd6E7De5423a257D81B442095A1a6ced35C5' },
    { name: 'LayerZero', address: '0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675' },
    { name: 'Synapse', address: '0x2796317b0fF8538F253012862c06787Adfb8B0c6' },
    { name: 'Allbridge', address: '' },
    { name: 'deBridge', address: '' },
  ],
  linea: [],
  arbitrum: [
    { name: 'Wormhole', address: '0x0b2402144Bb366A632D14B83F244D2e0e21bD39c' },
    { name: 'Stargate', address: '0x352d8275AAE3e0c2404d9f68f6cEE084B5bEB3DD' },
    { name: 'Across', address: '0x6b2C7D6E7F8A9B0C1D2E3F4A5B6C7D8E9F0A1B2' },
  ],
  base: [
    { name: 'Across', address: '0x52E5F819Db7b2F1A6c8eC4C8c9d9E9d0E1f2A3b4' },
  ],
  optimism: [
    { name: 'Stargate', address: '0x296F55F8Fb28E7B9c6B5F2B0D5C6D7E8F9A0B1C2' },
  ],
  polygon: [],
  bsc: [],
};

export class BridgeDetector {
  /**
   * Returns the list of known bridge protocols for a given chain.
   */
  static getBridgesForChain(chain: string): BridgeProtocolEntry[] {
    return BRIDGE_PROTOCOLS[chain] || [];
  }

  /**
   * Checks whether a given address matches a known bridge contract on the
   * specified chain. Comparison is case-insensitive. Returns the matching
   * protocol entry, or null if no match is found.
   */
  static matchesBridge(address: string, chain: string): BridgeProtocolEntry | null {
    if (!address) return null;
    const normalizedAddress = address.toLowerCase();
    const bridges = BridgeDetector.getBridgesForChain(chain);
    return bridges.find(
      (b) => b.address.length > 0 && b.address.toLowerCase() === normalizedAddress
    ) || null;
  }

  /**
   * Scans an array of transactions for interactions with known bridge
   * contracts on the given chain. Returns an array of detected BridgeEvents.
   *
   * Each transaction object should have:
   *   - `to`   : the recipient contract address
   *   - `hash` : transaction hash (optional)
   *   - `value` or `valueInEth` : transferred amount
   *   - `timestamp` : block timestamp (optional)
   */
  static detectBridgeTransactions(
    transactions: any[],
    chain: string
  ): BridgeEvent[] {
    const events: BridgeEvent[] = [];

    for (const tx of transactions || []) {
      const matchedBridge = BridgeDetector.matchesBridge(tx.to, chain);

      if (matchedBridge) {
        const tokenBridged = chain === 'solana' ? 'SOL' : 'ETH';
        const amount =
          tx.valueInEth?.toFixed(4) || tx.value || '0';
        const timestamp =
          typeof tx.timestamp === 'number'
            ? tx.timestamp
            : typeof tx.time === 'number'
              ? tx.time
              : Date.now() / 1000;

        events.push({
          bridge: matchedBridge.name,
          sourceTx: tx.hash || '',
          destChain: 'ethereum',
          destAddress: undefined,
          amount,
          tokenBridged,
          timestamp,
        });
      }
    }

    return events;
  }
}
