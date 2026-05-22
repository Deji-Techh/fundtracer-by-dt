import type { McpToolDefinition } from './types.js';

export const ALL_MCP_TOOLS: McpToolDefinition[] = [
  {
    name: 'analyze_wallet',
    description: 'Perform a full blockchain wallet analysis including balance, transactions, risk score, suspicious indicators, and project interactions.',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Wallet address to analyze (0x... for EVM, base58 for Solana)' },
        chainId: {
          type: 'string',
          description: 'Blockchain to analyze',
          enum: ['ethereum', 'base', 'arbitrum', 'optimism', 'polygon', 'linea', 'bsc', 'solana'],
        },
        transactionLimit: {
          type: 'number',
          description: 'Max transactions to fetch (default: 500)',
          default: 500,
        },
      },
      required: ['address', 'chainId'],
    },
  },
  {
    name: 'trace_funds',
    description: 'Trace funding sources and destinations for a wallet address, building a recursive funding tree.',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Wallet address to trace' },
        chainId: {
          type: 'string',
          description: 'Blockchain to trace on',
          enum: ['ethereum', 'base', 'arbitrum', 'optimism', 'polygon', 'linea', 'bsc', 'solana'],
        },
        maxDepth: {
          type: 'number',
          description: 'How many levels deep to trace (default: 3)',
          default: 3,
        },
        direction: {
          type: 'string',
          description: 'Which direction to trace',
          enum: ['sources', 'destinations', 'both'],
          default: 'both',
        },
      },
      required: ['address', 'chainId'],
    },
  },
  {
    name: 'compare_wallets',
    description: 'Compare multiple wallet addresses for common funding sources, shared project interactions, and sybil correlation scoring.',
    inputSchema: {
      type: 'object',
      properties: {
        addresses: {
          type: 'string',
          description: 'Comma-separated list of wallet addresses to compare (2-20 wallets)',
        },
        chainId: {
          type: 'string',
          description: 'Blockchain to compare on',
          enum: ['ethereum', 'base', 'arbitrum', 'optimism', 'polygon', 'linea', 'bsc', 'solana'],
        },
      },
      required: ['addresses', 'chainId'],
    },
  },
  {
    name: 'analyze_contract',
    description: 'Analyze all addresses that have interacted with a smart contract, detecting sybil clusters and shared funding sources.',
    inputSchema: {
      type: 'object',
      properties: {
        contractAddress: { type: 'string', description: 'Smart contract address to analyze' },
        chainId: {
          type: 'string',
          description: 'Blockchain the contract is on',
          enum: ['ethereum', 'base', 'arbitrum', 'optimism', 'polygon', 'linea', 'bsc'],
        },
        maxInteractors: {
          type: 'number',
          description: 'Max interactors to analyze (default: 100)',
          default: 100,
        },
      },
      required: ['contractAddress', 'chainId'],
    },
  },
  {
    name: 'detect_sybil_clusters',
    description: 'Detect sybil (fake) accounts by clustering wallets that share common funding sources.',
    inputSchema: {
      type: 'object',
      properties: {
        addresses: {
          type: 'string',
          description: 'Comma-separated list of wallet addresses to check for sybil clustering',
        },
        chainId: {
          type: 'string',
          description: 'Blockchain to analyze on',
          enum: ['ethereum', 'base', 'arbitrum', 'optimism', 'polygon', 'bsc'],
        },
      },
      required: ['addresses', 'chainId'],
    },
  },
  {
    name: 'get_portfolio',
    description: 'Get the token portfolio, DeFi positions, and NFT holdings for a wallet address.',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Wallet address' },
        chainId: {
          type: 'string',
          description: 'Blockchain',
          enum: ['ethereum', 'solana', 'base', 'arbitrum', 'optimism', 'polygon', 'linea'],
        },
      },
      required: ['address', 'chainId'],
    },
  },
  {
    name: 'get_transactions',
    description: 'Get recent transaction history for a wallet address.',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Wallet address' },
        chainId: {
          type: 'string',
          description: 'Blockchain',
          enum: ['ethereum', 'base', 'arbitrum', 'optimism', 'polygon', 'linea', 'bsc', 'solana'],
        },
        limit: {
          type: 'number',
          description: 'Number of transactions to return (default: 50)',
          default: 50,
        },
      },
      required: ['address', 'chainId'],
    },
  },
  {
    name: 'lookup_entity',
    description: 'Look up a known blockchain entity, protocol, or address label.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Entity name, address, or label to look up' },
        chainId: {
          type: 'string',
          description: 'Blockchain to search (optional)',
          enum: ['ethereum', 'solana', 'base', 'arbitrum', 'optimism', 'polygon', 'linea', 'bsc', ''],
          default: '',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_gas_prices',
    description: 'Get current gas prices across supported blockchain networks.',
    inputSchema: {
      type: 'object',
      properties: {
        chainId: {
          type: 'string',
          description: 'Specific chain (optional, returns all if omitted)',
          enum: ['ethereum', 'base', 'arbitrum', 'optimism', 'polygon', 'linea', 'bsc', ''],
          default: '',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_token_info',
    description: 'Get market data and information for a token by address or symbol.',
    inputSchema: {
      type: 'object',
      properties: {
        tokenAddress: { type: 'string', description: 'Token contract address' },
        chainId: {
          type: 'string',
          description: 'Blockchain the token is on',
          enum: ['ethereum', 'base', 'arbitrum', 'optimism', 'polygon', 'linea', 'bsc', 'solana'],
        },
      },
      required: ['tokenAddress', 'chainId'],
    },
  },
];

export function getToolByName(name: string): McpToolDefinition | undefined {
  return ALL_MCP_TOOLS.find(t => t.name === name);
}
