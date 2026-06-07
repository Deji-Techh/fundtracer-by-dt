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
    name: 'get_portfolio_tokens',
    description: 'Get only the token holdings for a wallet address.',
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
    name: 'get_portfolio_nfts',
    description: 'Get only the NFT holdings for a wallet address.',
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
    name: 'get_portfolio_activity',
    description: 'Get portfolio activity summary for a wallet address.',
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
    name: 'get_portfolio_stablecoins',
    description: 'Get stablecoin balances for a wallet address.',
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
  {
    name: 'resolve_name',
    description: 'Resolve an ENS, Basename, or Linea name to an address.',
    inputSchema: {
      type: 'object',
      properties: {
        input: { type: 'string', description: 'ENS or address-like input to resolve' },
      },
      required: ['input'],
    },
  },
  {
    name: 'get_transaction_detail',
    description: 'Fetch full transaction details, logs, gas costs, and decoded events.',
    inputSchema: {
      type: 'object',
      properties: {
        chainId: { type: 'string', description: 'Blockchain to inspect', enum: ['ethereum', 'base', 'arbitrum', 'optimism', 'polygon', 'linea', 'bsc'] },
        hash: { type: 'string', description: 'Transaction hash' },
      },
      required: ['chainId', 'hash'],
    },
  },
  {
    name: 'get_transaction_history',
    description: 'Fetch transaction history for a wallet with optional pagination and filters.',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Wallet address to inspect' },
        chainId: { type: 'string', description: 'Blockchain', enum: ['ethereum', 'base', 'arbitrum', 'optimism', 'polygon', 'linea', 'bsc', 'solana'] },
        pageToken: { type: 'string', description: 'Pagination token returned by the history endpoint' },
        filters: { type: 'object', description: 'Optional history filters', default: {} },
      },
      required: ['address', 'chainId'],
    },
  },
  {
    name: 'analyze_cex_flow',
    description: 'Analyze exchange inflows/outflows and connected wallets for a target wallet.',
    inputSchema: {
      type: 'object',
      properties: {
        walletAddress: { type: 'string', description: 'Wallet address to analyze' },
        chainId: { type: 'string', description: 'Blockchain', enum: ['ethereum', 'base', 'arbitrum', 'optimism', 'polygon', 'linea', 'bsc'] },
        cexName: { type: 'string', description: 'Optional exchange name filter' },
        depth: { type: 'number', description: 'Traversal depth', default: 3 },
      },
      required: ['walletAddress', 'chainId'],
    },
  },
  {
    name: 'analyze_sybil_addresses',
    description: 'Analyze a list of wallet addresses for Sybil or coordination patterns.',
    inputSchema: {
      type: 'object',
      properties: {
        addresses: { type: 'string', description: 'Comma-separated wallet addresses' },
        chainId: { type: 'string', description: 'Blockchain', enum: ['ethereum', 'base', 'arbitrum', 'optimism', 'polygon', 'linea', 'bsc'] },
        txHash: { type: 'string', description: 'Optional transaction hash for context' },
      },
      required: ['addresses', 'chainId'],
    },
  },
  {
    name: 'search_contracts',
    description: 'Search the contract database by name or symbol.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search term' },
      },
      required: ['query'],
    },
  },
  {
    name: 'lookup_contract',
    description: 'Look up contract metadata and labels by address.',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Contract address to look up' },
      },
      required: ['address'],
    },
  },
  {
    name: 'batch_lookup_contracts',
    description: 'Look up multiple contract addresses at once.',
    inputSchema: {
      type: 'object',
      properties: {
        addresses: { type: 'string', description: 'Comma-separated list of contract addresses' },
      },
      required: ['addresses'],
    },
  },
  {
    name: 'get_contract_stats',
    description: 'Get contract database statistics.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'refresh_contracts',
    description: 'Trigger a contract database refresh.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'search_tokens',
    description: 'Search token metadata by keyword.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Token search query' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_market_stats',
    description: 'Fetch market overview statistics.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_market_coins',
    description: 'Get top market coins with optional chain filtering.',
    inputSchema: {
      type: 'object',
      properties: {
        chainId: { type: 'string', description: 'Optional chain filter', enum: ['ethereum', 'linea', 'arbitrum', 'optimism', 'base', 'polygon', 'bsc', 'all'], default: 'all' },
        page: { type: 'number', description: 'Page number', default: 1 },
        perPage: { type: 'number', description: 'Results per page', default: 100 },
      },
    },
  },
  {
    name: 'get_token_chart',
    description: 'Fetch token chart/price history from the token endpoint.',
    inputSchema: {
      type: 'object',
      properties: {
        tokenAddress: { type: 'string', description: 'Token address' },
        chainId: { type: 'string', description: 'Blockchain', enum: ['ethereum', 'base', 'arbitrum', 'optimism', 'polygon', 'linea', 'bsc'] },
        coinId: { type: 'string', description: 'CoinGecko coin ID' },
        days: { type: 'number', description: 'Number of days of history', default: 7 },
      },
      required: ['tokenAddress', 'chainId', 'coinId'],
    },
  },
  {
    name: 'get_dexscreener_latest_profiles',
    description: 'Get the latest DEX Screener token profiles.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_dexscreener_top_boosts',
    description: 'Get top boosted tokens from DEX Screener.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'search_dexscreener_pairs',
    description: 'Search DEX Screener pairs by query.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Search term' } },
      required: ['query'],
    },
  },
  {
    name: 'get_dexscreener_token_details',
    description: 'Get detailed DEX Screener information for a token.',
    inputSchema: {
      type: 'object',
      properties: {
        chainId: { type: 'string', description: 'Chain ID', enum: ['ethereum', 'linea', 'arbitrum', 'optimism', 'base', 'polygon', 'bsc'] },
        tokenAddress: { type: 'string', description: 'Token address' },
      },
      required: ['chainId', 'tokenAddress'],
    },
  },
  {
    name: 'get_dexscreener_token_pairs',
    description: 'Get DEX Screener pairs for a token.',
    inputSchema: {
      type: 'object',
      properties: {
        chainId: { type: 'string', description: 'Chain ID', enum: ['ethereum', 'linea', 'arbitrum', 'optimism', 'base', 'polygon', 'bsc'] },
        tokenAddress: { type: 'string', description: 'Token address' },
      },
      required: ['chainId', 'tokenAddress'],
    },
  },
  {
    name: 'get_dexscreener_trending',
    description: 'Get trending DEX Screener tokens.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_scan_history',
    description: 'Get the authenticated user scan history.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_scan_history_stats',
    description: 'Get aggregate scan history stats.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'save_scan_history_item',
    description: 'Save a scan history item for the authenticated user.',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Address being saved' },
        chain: { type: 'string', description: 'Chain name', default: 'ethereum' },
        label: { type: 'string', description: 'Optional label' },
        type: { type: 'string', description: 'Item type', enum: ['wallet', 'contract', 'compare', 'sybil'], default: 'wallet' },
        timestamp: { type: 'number', description: 'Unix timestamp', default: 0 },
        riskScore: { type: 'number', description: 'Optional risk score' },
        riskLevel: { type: 'string', description: 'Optional risk level' },
        totalTransactions: { type: 'number', description: 'Optional transaction count' },
        totalValueSentEth: { type: 'number', description: 'Optional sent value' },
        totalValueReceivedEth: { type: 'number', description: 'Optional received value' },
        activityPeriodDays: { type: 'number', description: 'Optional activity period' },
        balanceInEth: { type: 'number', description: 'Optional balance' },
      },
      required: ['address'],
    },
  },
  {
    name: 'sync_scan_history',
    description: 'Bulk sync scan history items.',
    inputSchema: {
      type: 'object',
      properties: {
        items: { type: 'array', description: 'History items to sync' },
      },
      required: ['items'],
    },
  },
  {
    name: 'delete_scan_history_item',
    description: 'Delete a scan history item by address.',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Address to delete' },
      },
      required: ['address'],
    },
  },
  {
    name: 'clear_scan_history',
    description: 'Clear all scan history for the authenticated user.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_rooms',
    description: 'List investigation rooms the user belongs to.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_room_details',
    description: 'Get room details and members.',
    inputSchema: {
      type: 'object',
      properties: { roomId: { type: 'string', description: 'Room ID' } },
      required: ['roomId'],
    },
  },
  {
    name: 'create_room',
    description: 'Create a new investigation room.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Room name' },
        description: { type: 'string', description: 'Room description' },
        seedAddress: { type: 'string', description: 'Seed wallet or contract address' },
        seedChain: { type: 'string', description: 'Seed chain' },
        seedSnapshot: { type: 'object', description: 'Optional seed snapshot' },
      },
      required: ['name'],
    },
  },
  {
    name: 'update_room',
    description: 'Update room metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: { type: 'string', description: 'Room ID' },
        name: { type: 'string', description: 'New room name' },
        description: { type: 'string', description: 'New room description' },
      },
      required: ['roomId'],
    },
  },
  {
    name: 'delete_room',
    description: 'Delete a room.',
    inputSchema: {
      type: 'object',
      properties: { roomId: { type: 'string', description: 'Room ID' } },
      required: ['roomId'],
    },
  },
  {
    name: 'list_room_messages',
    description: 'List room messages.',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: { type: 'string', description: 'Room ID' },
        limit: { type: 'number', description: 'Message limit', default: 50 },
        before: { type: 'number', description: 'Load messages before this timestamp' },
      },
      required: ['roomId'],
    },
  },
  {
    name: 'send_room_message',
    description: 'Send a message to a room.',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: { type: 'string', description: 'Room ID' },
        content: { type: 'string', description: 'Message content' },
        tempId: { type: 'string', description: 'Optional client temp ID' },
      },
      required: ['roomId', 'content'],
    },
  },
  {
    name: 'join_room',
    description: 'Join a room, optionally with an invite code.',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: { type: 'string', description: 'Room ID' },
        inviteCode: { type: 'string', description: 'Optional invite code' },
      },
      required: ['roomId'],
    },
  },
  {
    name: 'leave_room',
    description: 'Leave a room.',
    inputSchema: {
      type: 'object',
      properties: { roomId: { type: 'string', description: 'Room ID' } },
      required: ['roomId'],
    },
  },
  {
    name: 'remove_room_member',
    description: 'Remove a member from a room.',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: { type: 'string', description: 'Room ID' },
        uid: { type: 'string', description: 'User ID to remove' },
      },
      required: ['roomId', 'uid'],
    },
  },
  {
    name: 'promote_room_member',
    description: 'Change a room member role.',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: { type: 'string', description: 'Room ID' },
        uid: { type: 'string', description: 'User ID to promote' },
        role: { type: 'string', description: 'Target role', enum: ['admin', 'member', 'owner'] },
      },
      required: ['roomId', 'uid', 'role'],
    },
  },
  {
    name: 'create_room_invite',
    description: 'Create or refresh a room invite code.',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: { type: 'string', description: 'Room ID' },
        expiresInHours: { type: 'number', description: 'Invite expiry in hours' },
        maxUses: { type: 'number', description: 'Optional max uses' },
      },
      required: ['roomId'],
    },
  },
  {
    name: 'list_room_pins',
    description: 'List pinned evidence items in a room.',
    inputSchema: {
      type: 'object',
      properties: { roomId: { type: 'string', description: 'Room ID' } },
      required: ['roomId'],
    },
  },
  {
    name: 'pin_room_message',
    description: 'Pin a room message as evidence.',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: { type: 'string', description: 'Room ID' },
        messageId: { type: 'string', description: 'Message ID' },
        category: { type: 'string', description: 'Pin category', default: 'evidence' },
        note: { type: 'string', description: 'Optional note' },
      },
      required: ['roomId', 'messageId'],
    },
  },
  {
    name: 'unpin_room_message',
    description: 'Remove a pinned message from the evidence board.',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: { type: 'string', description: 'Room ID' },
        messageId: { type: 'string', description: 'Message ID' },
      },
      required: ['roomId', 'messageId'],
    },
  },
  {
    name: 'edit_room_message',
    description: 'Edit a room message.',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: { type: 'string', description: 'Room ID' },
        messageId: { type: 'string', description: 'Message ID' },
        content: { type: 'string', description: 'Updated content' },
      },
      required: ['roomId', 'messageId', 'content'],
    },
  },
  {
    name: 'delete_room_message',
    description: 'Delete a room message.',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: { type: 'string', description: 'Room ID' },
        messageId: { type: 'string', description: 'Message ID' },
      },
      required: ['roomId', 'messageId'],
    },
  },
  {
    name: 'export_room',
    description: 'Export a room as structured evidence data.',
    inputSchema: {
      type: 'object',
      properties: { roomId: { type: 'string', description: 'Room ID' } },
      required: ['roomId'],
    },
  },
  {
    name: 'get_polymarket_markets',
    description: 'List Polymarket markets with filters.',
    inputSchema: {
      type: 'object',
      properties: {
        q: { type: 'string', description: 'Search query' },
        active: { type: 'boolean', description: 'Only active markets' },
        closed: { type: 'boolean', description: 'Only closed markets' },
        limit: { type: 'number', description: 'Limit', default: 20 },
        offset: { type: 'number', description: 'Offset', default: 0 },
        order: { type: 'string', description: 'Sort order', enum: ['volume24hr', 'liquidity', 'endDate', 'startDate'] },
      },
    },
  },
  {
    name: 'get_polymarket_market',
    description: 'Get a Polymarket market by slug.',
    inputSchema: {
      type: 'object',
      properties: { slug: { type: 'string', description: 'Market slug' } },
      required: ['slug'],
    },
  },
  {
    name: 'get_polymarket_trending',
    description: 'Get trending Polymarket markets.',
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'number', description: 'Limit', default: 10 } },
    },
  },
  {
    name: 'get_polymarket_spikes',
    description: 'Detect Polymarket volume spikes.',
    inputSchema: {
      type: 'object',
      properties: {
        threshold: { type: 'number', description: 'Spike threshold', default: 2.0 },
        minVolume: { type: 'number', description: 'Minimum volume', default: 10000 },
      },
    },
  },
  {
    name: 'get_polymarket_movers',
    description: 'Get Polymarket markets with large price movements.',
    inputSchema: {
      type: 'object',
      properties: { minChange: { type: 'number', description: 'Minimum percentage change', default: 0.05 } },
    },
  },
  {
    name: 'get_polymarket_events',
    description: 'Get Polymarket events.',
    inputSchema: {
      type: 'object',
      properties: {
        active: { type: 'boolean', description: 'Only active events' },
        limit: { type: 'number', description: 'Limit', default: 20 },
        offset: { type: 'number', description: 'Offset', default: 0 },
      },
    },
  },
  {
    name: 'get_polymarket_leaderboard',
    description: 'Get top Polymarket traders.',
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'number', description: 'Limit', default: 20 } },
    },
  },
  {
    name: 'get_polymarket_trader',
    description: 'Get a Polymarket trader profile.',
    inputSchema: {
      type: 'object',
      properties: { address: { type: 'string', description: 'Trader address' } },
      required: ['address'],
    },
  },
  {
    name: 'get_polymarket_order_book',
    description: 'Get a Polymarket order book.',
    inputSchema: {
      type: 'object',
      properties: { tokenId: { type: 'string', description: 'Order book token ID' } },
      required: ['tokenId'],
    },
  },
  {
    name: 'get_polymarket_trades',
    description: 'Get Polymarket trades for a condition.',
    inputSchema: {
      type: 'object',
      properties: {
        conditionId: { type: 'string', description: 'Condition ID' },
        limit: { type: 'number', description: 'Limit', default: 20 },
      },
      required: ['conditionId'],
    },
  },
  {
    name: 'get_polymarket_history',
    description: 'Get Polymarket price history.',
    inputSchema: {
      type: 'object',
      properties: {
        conditionId: { type: 'string', description: 'Condition ID' },
        interval: { type: 'string', description: 'History interval', enum: ['hour', 'day'] },
        limit: { type: 'number', description: 'Limit', default: 50 },
      },
      required: ['conditionId'],
    },
  },
  {
    name: 'fetch_dune_interactors',
    description: 'Fetch contract interactors from Dune Analytics.',
    inputSchema: {
      type: 'object',
      properties: {
        contractAddress: { type: 'string', description: 'Contract address' },
        chain: { type: 'string', description: 'Chain name', enum: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'linea'] },
        limit: { type: 'number', description: 'Row limit', default: 1000 },
        customApiKey: { type: 'string', description: 'Optional Dune API key override' },
      },
      required: ['contractAddress', 'chain'],
    },
  },
];

export function getToolByName(name: string): McpToolDefinition | undefined {
  return ALL_MCP_TOOLS.find(t => t.name === name);
}
