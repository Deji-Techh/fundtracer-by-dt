import { JsonRpcProvider, keccak256, toUtf8Bytes } from 'ethers';

const ETH_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

// Base L2 Basename resolver contract
const BASENAME_RESOLVER = '0xC6d566A56A1aFf6508b41f6c90ff131615583BCD';
const BASE_RPC = 'https://mainnet.base.org';

// Linea Name Service registry
const LNS_REGISTRY = '0x50130b669B28C339991d8676FA73CF122a121267';
const LNS_ADDR_SELECTOR = '0x3b3b57de'; // addr(bytes32)

// -- In-memory LRU cache ------------------------------------------------------

interface CacheEntry {
  address: string;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 500;

function getFromCache(name: string): string | null {
  const key = name.toLowerCase();
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  cache.delete(key);
  cache.set(key, entry); // bump to end (LRU)
  return entry.address;
}

function setCache(name: string, address: string): void {
  if (cache.size >= MAX_CACHE_SIZE) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  cache.set(name.toLowerCase(), { address, timestamp: Date.now() });
}

// -- Name detection -----------------------------------------------------------

export function isEnsName(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  if (ETH_ADDRESS_RE.test(input)) return false;
  return /\.(eth|base\.eth|linea\.eth)$/i.test(input.trim());
}

// -- namehash (ENS EIP-137 spec via ethers keccak256) -------------------------

function namehash(name: string): string {
  let node = '0000000000000000000000000000000000000000000000000000000000000000';
  if (!name) return '0x' + node;

  const labels = name.split('.');
  for (let i = labels.length - 1; i >= 0; i--) {
    const labelHash = keccak256(toUtf8Bytes(labels[i])).slice(2); // strip 0x
    node = keccak256('0x' + node + labelHash).slice(2);
  }

  return '0x' + node;
}

// -- RPC call helper ----------------------------------------------------------

async function resolveViaContract(rpcUrl: string, resolverAddress: string, name: string): Promise<string | null> {
  try {
    const node = namehash(name);
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{
          to: resolverAddress,
          data: LNS_ADDR_SELECTOR + node.slice(2),
        }, 'latest'],
      }),
    });
    const data = await res.json() as { result?: string };
    const raw = data?.result;
    if (!raw || raw === '0x' || raw === ('0x' + '0'.repeat(64))) return null;
    return '0x' + raw.slice(26);
  } catch {
    return null;
  }
}

// -- Resolvers ----------------------------------------------------------------

async function resolveEns(name: string): Promise<string | null> {
  const key = process.env.DEFAULT_ALCHEMY_API_KEY || process.env.ALCHEMY_API_KEY || '';
  if (!key) {
    console.error('[nameResolver] No Alchemy API key configured for ENS resolution');
    return null;
  }
  const provider = new JsonRpcProvider(`https://eth-mainnet.g.alchemy.com/v2/${key}`);
  try {
    const resolved = await Promise.race([
      provider.resolveName(name),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error('ENS resolution timed out after 8s')), 8000)),
    ]);
    return resolved || null;
  } catch (err: any) {
    console.error(`[nameResolver] ENS resolveName("${name}") failed:`, err.message || err);
    return null;
  }
}

async function resolveBasename(name: string): Promise<string | null> {
  // Try CCIP-Read via Ethereum mainnet first
  try {
    const ensResult = await resolveEns(name);
    if (ensResult) return ensResult;
  } catch { /* fall through */ }

  // Fallback: direct Basename resolver on Base L2
  return resolveViaContract(BASE_RPC, BASENAME_RESOLVER, name);
}

async function resolveLineaName(name: string): Promise<string | null> {
  // Try Ethereum mainnet ENS first (CCIP-Read may handle it)
  try {
    const ensResult = await resolveEns(name);
    if (ensResult) return ensResult;
  } catch { /* fall through to direct contract call */ }

  // Fallback: direct LNS registry call on Linea
  const rpcUrl = process.env.LINEA_RPC_URL || 'https://rpc.linea.build';
  return resolveViaContract(rpcUrl, LNS_REGISTRY, name);
}

// -- Primary API --------------------------------------------------------------

export interface ResolveResult {
  resolved: string;
  error?: string;
}

/**
 * Try to resolve an ENS/basename/Linea name to a 0x address.
 * - Hex addresses pass through unchanged.
 * - Non-name strings pass through unchanged.
 * - Unresolvable names return the original input with an error field.
 *
 * Never throws.
 */
export async function tryResolveAddress(input: string): Promise<ResolveResult> {
  if (!input || typeof input !== 'string') {
    return { resolved: input || '', error: 'Address is required' };
  }

  const trimmed = input.trim();

  // Already a hex address — pass through
  if (ETH_ADDRESS_RE.test(trimmed)) {
    return { resolved: trimmed.toLowerCase() };
  }

  // Not an ENS-like name — pass through (downstream validation will reject)
  if (!isEnsName(trimmed)) {
    return { resolved: trimmed };
  }

  // Check cache
  const cached = getFromCache(trimmed);
  if (cached) return { resolved: cached };

  // Resolve based on suffix
  const lower = trimmed.toLowerCase();
  let resolved: string | null = null;

  try {
    if (lower.endsWith('.base.eth')) {
      resolved = await resolveBasename(trimmed);
    } else if (lower.endsWith('.linea.eth')) {
      resolved = await resolveLineaName(trimmed);
    } else {
      resolved = await resolveEns(trimmed);
    }
  } catch {
    resolved = null;
  }

  if (!resolved) {
    const hints: Record<string, string> = {
      '.base.eth': 'Basename may not be registered on Base. Register at base.org/names.',
      '.linea.eth': 'Linea name may not be registered. Register via Linea Name Service.',
      '.eth': 'ENS name may not be registered. Check at app.ens.domains.',
    };
    const hint = hints[lower.match(/\.(?:base\.eth|linea\.eth|eth)$/)?.[0] || ''] ||
      'ENS name may not be registered or is not resolvable.';

    return {
      resolved: trimmed,
      error: `Could not resolve "${trimmed}": ${hint}`,
    };
  }

  setCache(trimmed, resolved);
  return { resolved };
}

// -- Express middleware factory ------------------------------------------------

const DEFAULT_FIELDS = ['address', 'addresses', 'contractAddress', 'walletAddress'];

/**
 * Create Express middleware that resolves ENS names in request body fields.
 * Mutates req.body in place — downstream handlers see resolved hex addresses.
 *
 * @param fields Body fields to check for addresses (default: address, addresses, contractAddress, walletAddress)
 */
export function createNameResolutionMiddleware(fields: string[] = DEFAULT_FIELDS) {
  return async (req: any, _res: any, next: any) => {
    try {
      for (const field of fields) {
        const value = req.body?.[field];
        if (!value) continue;

        if (typeof value === 'string') {
          const { resolved, error } = await tryResolveAddress(value);
          if (error) {
            return _res.status(400).json({ error });
          }
          req.body[field] = resolved;
        } else if (Array.isArray(value)) {
          const resolvedList: string[] = [];
          for (const item of value) {
            if (typeof item === 'string') {
              const { resolved, error } = await tryResolveAddress(item);
              if (error) {
                return _res.status(400).json({ error });
              }
              resolvedList.push(resolved);
            } else {
              resolvedList.push(item);
            }
          }
          req.body[field] = resolvedList;
        }
      }
      next();
    } catch (err: any) {
      _res.status(500).json({ error: 'Name resolution failed', message: err.message });
    }
  };
}
