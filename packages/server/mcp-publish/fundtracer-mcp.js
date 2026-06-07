#!/usr/bin/env node

// src/mcp/stdio.ts
import * as dotenv from "dotenv";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// src/mcp/server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// src/mcp/tools.ts
var ALL_MCP_TOOLS = [
  {
    name: "analyze_wallet",
    description: "Perform a full blockchain wallet analysis including balance, transactions, risk score, suspicious indicators, and project interactions.",
    inputSchema: {
      type: "object",
      properties: {
        address: { type: "string", description: "Wallet address to analyze (0x... for EVM, base58 for Solana)" },
        chainId: {
          type: "string",
          description: "Blockchain to analyze",
          enum: ["ethereum", "base", "arbitrum", "optimism", "polygon", "linea", "bsc", "solana"]
        },
        transactionLimit: {
          type: "number",
          description: "Max transactions to fetch (default: 500)",
          default: 500
        }
      },
      required: ["address", "chainId"]
    }
  },
  {
    name: "trace_funds",
    description: "Trace funding sources and destinations for a wallet address, building a recursive funding tree.",
    inputSchema: {
      type: "object",
      properties: {
        address: { type: "string", description: "Wallet address to trace" },
        chainId: {
          type: "string",
          description: "Blockchain to trace on",
          enum: ["ethereum", "base", "arbitrum", "optimism", "polygon", "linea", "bsc", "solana"]
        },
        maxDepth: {
          type: "number",
          description: "How many levels deep to trace (default: 3)",
          default: 3
        },
        direction: {
          type: "string",
          description: "Which direction to trace",
          enum: ["sources", "destinations", "both"],
          default: "both"
        }
      },
      required: ["address", "chainId"]
    }
  },
  {
    name: "compare_wallets",
    description: "Compare multiple wallet addresses for common funding sources, shared project interactions, and sybil correlation scoring.",
    inputSchema: {
      type: "object",
      properties: {
        addresses: {
          type: "string",
          description: "Comma-separated list of wallet addresses to compare (2-20 wallets)"
        },
        chainId: {
          type: "string",
          description: "Blockchain to compare on",
          enum: ["ethereum", "base", "arbitrum", "optimism", "polygon", "linea", "bsc", "solana"]
        }
      },
      required: ["addresses", "chainId"]
    }
  },
  {
    name: "analyze_contract",
    description: "Analyze all addresses that have interacted with a smart contract, detecting sybil clusters and shared funding sources.",
    inputSchema: {
      type: "object",
      properties: {
        contractAddress: { type: "string", description: "Smart contract address to analyze" },
        chainId: {
          type: "string",
          description: "Blockchain the contract is on",
          enum: ["ethereum", "base", "arbitrum", "optimism", "polygon", "linea", "bsc"]
        },
        maxInteractors: {
          type: "number",
          description: "Max interactors to analyze (default: 100)",
          default: 100
        }
      },
      required: ["contractAddress", "chainId"]
    }
  },
  {
    name: "detect_sybil_clusters",
    description: "Detect sybil (fake) accounts by clustering wallets that share common funding sources.",
    inputSchema: {
      type: "object",
      properties: {
        addresses: {
          type: "string",
          description: "Comma-separated list of wallet addresses to check for sybil clustering"
        },
        chainId: {
          type: "string",
          description: "Blockchain to analyze on",
          enum: ["ethereum", "base", "arbitrum", "optimism", "polygon", "bsc"]
        }
      },
      required: ["addresses", "chainId"]
    }
  },
  {
    name: "get_portfolio",
    description: "Get the token portfolio, DeFi positions, and NFT holdings for a wallet address.",
    inputSchema: {
      type: "object",
      properties: {
        address: { type: "string", description: "Wallet address" },
        chainId: {
          type: "string",
          description: "Blockchain",
          enum: ["ethereum", "solana", "base", "arbitrum", "optimism", "polygon", "linea"]
        }
      },
      required: ["address", "chainId"]
    }
  },
  {
    name: "get_portfolio_tokens",
    description: "Get only the token holdings for a wallet address.",
    inputSchema: {
      type: "object",
      properties: {
        address: { type: "string", description: "Wallet address" },
        chainId: {
          type: "string",
          description: "Blockchain",
          enum: ["ethereum", "solana", "base", "arbitrum", "optimism", "polygon", "linea"]
        }
      },
      required: ["address", "chainId"]
    }
  },
  {
    name: "get_portfolio_nfts",
    description: "Get only the NFT holdings for a wallet address.",
    inputSchema: {
      type: "object",
      properties: {
        address: { type: "string", description: "Wallet address" },
        chainId: {
          type: "string",
          description: "Blockchain",
          enum: ["ethereum", "solana", "base", "arbitrum", "optimism", "polygon", "linea"]
        }
      },
      required: ["address", "chainId"]
    }
  },
  {
    name: "get_portfolio_activity",
    description: "Get portfolio activity summary for a wallet address.",
    inputSchema: {
      type: "object",
      properties: {
        address: { type: "string", description: "Wallet address" },
        chainId: {
          type: "string",
          description: "Blockchain",
          enum: ["ethereum", "solana", "base", "arbitrum", "optimism", "polygon", "linea"]
        }
      },
      required: ["address", "chainId"]
    }
  },
  {
    name: "get_portfolio_stablecoins",
    description: "Get stablecoin balances for a wallet address.",
    inputSchema: {
      type: "object",
      properties: {
        address: { type: "string", description: "Wallet address" },
        chainId: {
          type: "string",
          description: "Blockchain",
          enum: ["ethereum", "solana", "base", "arbitrum", "optimism", "polygon", "linea"]
        }
      },
      required: ["address", "chainId"]
    }
  },
  {
    name: "get_transactions",
    description: "Get recent transaction history for a wallet address.",
    inputSchema: {
      type: "object",
      properties: {
        address: { type: "string", description: "Wallet address" },
        chainId: {
          type: "string",
          description: "Blockchain",
          enum: ["ethereum", "base", "arbitrum", "optimism", "polygon", "linea", "bsc", "solana"]
        },
        limit: {
          type: "number",
          description: "Number of transactions to return (default: 50)",
          default: 50
        }
      },
      required: ["address", "chainId"]
    }
  },
  {
    name: "lookup_entity",
    description: "Look up a known blockchain entity, protocol, or address label.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Entity name, address, or label to look up" },
        chainId: {
          type: "string",
          description: "Blockchain to search (optional)",
          enum: ["ethereum", "solana", "base", "arbitrum", "optimism", "polygon", "linea", "bsc", ""],
          default: ""
        }
      },
      required: ["query"]
    }
  },
  {
    name: "get_gas_prices",
    description: "Get current gas prices across supported blockchain networks.",
    inputSchema: {
      type: "object",
      properties: {
        chainId: {
          type: "string",
          description: "Specific chain (optional, returns all if omitted)",
          enum: ["ethereum", "base", "arbitrum", "optimism", "polygon", "linea", "bsc", ""],
          default: ""
        }
      },
      required: []
    }
  },
  {
    name: "get_token_info",
    description: "Get market data and information for a token by address or symbol.",
    inputSchema: {
      type: "object",
      properties: {
        tokenAddress: { type: "string", description: "Token contract address" },
        chainId: {
          type: "string",
          description: "Blockchain the token is on",
          enum: ["ethereum", "base", "arbitrum", "optimism", "polygon", "linea", "bsc", "solana"]
        }
      },
      required: ["tokenAddress", "chainId"]
    }
  },
  {
    name: "resolve_name",
    description: "Resolve an ENS, Basename, or Linea name to an address.",
    inputSchema: {
      type: "object",
      properties: {
        input: { type: "string", description: "ENS or address-like input to resolve" }
      },
      required: ["input"]
    }
  },
  {
    name: "get_transaction_detail",
    description: "Fetch full transaction details, logs, gas costs, and decoded events.",
    inputSchema: {
      type: "object",
      properties: {
        chainId: { type: "string", description: "Blockchain to inspect", enum: ["ethereum", "base", "arbitrum", "optimism", "polygon", "linea", "bsc"] },
        hash: { type: "string", description: "Transaction hash" }
      },
      required: ["chainId", "hash"]
    }
  },
  {
    name: "get_transaction_history",
    description: "Fetch transaction history for a wallet with optional pagination and filters.",
    inputSchema: {
      type: "object",
      properties: {
        address: { type: "string", description: "Wallet address to inspect" },
        chainId: { type: "string", description: "Blockchain", enum: ["ethereum", "base", "arbitrum", "optimism", "polygon", "linea", "bsc", "solana"] },
        pageToken: { type: "string", description: "Pagination token returned by the history endpoint" },
        filters: { type: "object", description: "Optional history filters", default: {} }
      },
      required: ["address", "chainId"]
    }
  },
  {
    name: "analyze_cex_flow",
    description: "Analyze exchange inflows/outflows and connected wallets for a target wallet.",
    inputSchema: {
      type: "object",
      properties: {
        walletAddress: { type: "string", description: "Wallet address to analyze" },
        chainId: { type: "string", description: "Blockchain", enum: ["ethereum", "base", "arbitrum", "optimism", "polygon", "linea", "bsc"] },
        cexName: { type: "string", description: "Optional exchange name filter" },
        depth: { type: "number", description: "Traversal depth", default: 3 }
      },
      required: ["walletAddress", "chainId"]
    }
  },
  {
    name: "analyze_sybil_addresses",
    description: "Analyze a list of wallet addresses for Sybil or coordination patterns.",
    inputSchema: {
      type: "object",
      properties: {
        addresses: { type: "string", description: "Comma-separated wallet addresses" },
        chainId: { type: "string", description: "Blockchain", enum: ["ethereum", "base", "arbitrum", "optimism", "polygon", "linea", "bsc"] },
        txHash: { type: "string", description: "Optional transaction hash for context" }
      },
      required: ["addresses", "chainId"]
    }
  },
  {
    name: "search_contracts",
    description: "Search the contract database by name or symbol.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search term" }
      },
      required: ["query"]
    }
  },
  {
    name: "lookup_contract",
    description: "Look up contract metadata and labels by address.",
    inputSchema: {
      type: "object",
      properties: {
        address: { type: "string", description: "Contract address to look up" }
      },
      required: ["address"]
    }
  },
  {
    name: "batch_lookup_contracts",
    description: "Look up multiple contract addresses at once.",
    inputSchema: {
      type: "object",
      properties: {
        addresses: { type: "string", description: "Comma-separated list of contract addresses" }
      },
      required: ["addresses"]
    }
  },
  {
    name: "get_contract_stats",
    description: "Get contract database statistics.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "refresh_contracts",
    description: "Trigger a contract database refresh.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "search_tokens",
    description: "Search token metadata by keyword.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Token search query" }
      },
      required: ["query"]
    }
  },
  {
    name: "get_market_stats",
    description: "Fetch market overview statistics.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "get_market_coins",
    description: "Get top market coins with optional chain filtering.",
    inputSchema: {
      type: "object",
      properties: {
        chainId: { type: "string", description: "Optional chain filter", enum: ["ethereum", "linea", "arbitrum", "optimism", "base", "polygon", "bsc", "all"], default: "all" },
        page: { type: "number", description: "Page number", default: 1 },
        perPage: { type: "number", description: "Results per page", default: 100 }
      }
    }
  },
  {
    name: "get_token_chart",
    description: "Fetch token chart/price history from the token endpoint.",
    inputSchema: {
      type: "object",
      properties: {
        tokenAddress: { type: "string", description: "Token address" },
        chainId: { type: "string", description: "Blockchain", enum: ["ethereum", "base", "arbitrum", "optimism", "polygon", "linea", "bsc"] },
        coinId: { type: "string", description: "CoinGecko coin ID" },
        days: { type: "number", description: "Number of days of history", default: 7 }
      },
      required: ["tokenAddress", "chainId", "coinId"]
    }
  },
  {
    name: "get_dexscreener_latest_profiles",
    description: "Get the latest DEX Screener token profiles.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "get_dexscreener_top_boosts",
    description: "Get top boosted tokens from DEX Screener.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "search_dexscreener_pairs",
    description: "Search DEX Screener pairs by query.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "Search term" } },
      required: ["query"]
    }
  },
  {
    name: "get_dexscreener_token_details",
    description: "Get detailed DEX Screener information for a token.",
    inputSchema: {
      type: "object",
      properties: {
        chainId: { type: "string", description: "Chain ID", enum: ["ethereum", "linea", "arbitrum", "optimism", "base", "polygon", "bsc"] },
        tokenAddress: { type: "string", description: "Token address" }
      },
      required: ["chainId", "tokenAddress"]
    }
  },
  {
    name: "get_dexscreener_token_pairs",
    description: "Get DEX Screener pairs for a token.",
    inputSchema: {
      type: "object",
      properties: {
        chainId: { type: "string", description: "Chain ID", enum: ["ethereum", "linea", "arbitrum", "optimism", "base", "polygon", "bsc"] },
        tokenAddress: { type: "string", description: "Token address" }
      },
      required: ["chainId", "tokenAddress"]
    }
  },
  {
    name: "get_dexscreener_trending",
    description: "Get trending DEX Screener tokens.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "get_scan_history",
    description: "Get the authenticated user scan history.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "get_scan_history_stats",
    description: "Get aggregate scan history stats.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "save_scan_history_item",
    description: "Save a scan history item for the authenticated user.",
    inputSchema: {
      type: "object",
      properties: {
        address: { type: "string", description: "Address being saved" },
        chain: { type: "string", description: "Chain name", default: "ethereum" },
        label: { type: "string", description: "Optional label" },
        type: { type: "string", description: "Item type", enum: ["wallet", "contract", "compare", "sybil"], default: "wallet" },
        timestamp: { type: "number", description: "Unix timestamp", default: 0 },
        riskScore: { type: "number", description: "Optional risk score" },
        riskLevel: { type: "string", description: "Optional risk level" },
        totalTransactions: { type: "number", description: "Optional transaction count" },
        totalValueSentEth: { type: "number", description: "Optional sent value" },
        totalValueReceivedEth: { type: "number", description: "Optional received value" },
        activityPeriodDays: { type: "number", description: "Optional activity period" },
        balanceInEth: { type: "number", description: "Optional balance" }
      },
      required: ["address"]
    }
  },
  {
    name: "sync_scan_history",
    description: "Bulk sync scan history items.",
    inputSchema: {
      type: "object",
      properties: {
        items: { type: "array", description: "History items to sync" }
      },
      required: ["items"]
    }
  },
  {
    name: "delete_scan_history_item",
    description: "Delete a scan history item by address.",
    inputSchema: {
      type: "object",
      properties: {
        address: { type: "string", description: "Address to delete" }
      },
      required: ["address"]
    }
  },
  {
    name: "clear_scan_history",
    description: "Clear all scan history for the authenticated user.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "list_rooms",
    description: "List investigation rooms the user belongs to.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "get_room_details",
    description: "Get room details and members.",
    inputSchema: {
      type: "object",
      properties: { roomId: { type: "string", description: "Room ID" } },
      required: ["roomId"]
    }
  },
  {
    name: "create_room",
    description: "Create a new investigation room.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Room name" },
        description: { type: "string", description: "Room description" },
        seedAddress: { type: "string", description: "Seed wallet or contract address" },
        seedChain: { type: "string", description: "Seed chain" },
        seedSnapshot: { type: "object", description: "Optional seed snapshot" }
      },
      required: ["name"]
    }
  },
  {
    name: "update_room",
    description: "Update room metadata.",
    inputSchema: {
      type: "object",
      properties: {
        roomId: { type: "string", description: "Room ID" },
        name: { type: "string", description: "New room name" },
        description: { type: "string", description: "New room description" }
      },
      required: ["roomId"]
    }
  },
  {
    name: "delete_room",
    description: "Delete a room.",
    inputSchema: {
      type: "object",
      properties: { roomId: { type: "string", description: "Room ID" } },
      required: ["roomId"]
    }
  },
  {
    name: "list_room_messages",
    description: "List room messages.",
    inputSchema: {
      type: "object",
      properties: {
        roomId: { type: "string", description: "Room ID" },
        limit: { type: "number", description: "Message limit", default: 50 },
        before: { type: "number", description: "Load messages before this timestamp" }
      },
      required: ["roomId"]
    }
  },
  {
    name: "send_room_message",
    description: "Send a message to a room.",
    inputSchema: {
      type: "object",
      properties: {
        roomId: { type: "string", description: "Room ID" },
        content: { type: "string", description: "Message content" },
        tempId: { type: "string", description: "Optional client temp ID" }
      },
      required: ["roomId", "content"]
    }
  },
  {
    name: "join_room",
    description: "Join a room, optionally with an invite code.",
    inputSchema: {
      type: "object",
      properties: {
        roomId: { type: "string", description: "Room ID" },
        inviteCode: { type: "string", description: "Optional invite code" }
      },
      required: ["roomId"]
    }
  },
  {
    name: "leave_room",
    description: "Leave a room.",
    inputSchema: {
      type: "object",
      properties: { roomId: { type: "string", description: "Room ID" } },
      required: ["roomId"]
    }
  },
  {
    name: "remove_room_member",
    description: "Remove a member from a room.",
    inputSchema: {
      type: "object",
      properties: {
        roomId: { type: "string", description: "Room ID" },
        uid: { type: "string", description: "User ID to remove" }
      },
      required: ["roomId", "uid"]
    }
  },
  {
    name: "promote_room_member",
    description: "Change a room member role.",
    inputSchema: {
      type: "object",
      properties: {
        roomId: { type: "string", description: "Room ID" },
        uid: { type: "string", description: "User ID to promote" },
        role: { type: "string", description: "Target role", enum: ["admin", "member", "owner"] }
      },
      required: ["roomId", "uid", "role"]
    }
  },
  {
    name: "create_room_invite",
    description: "Create or refresh a room invite code.",
    inputSchema: {
      type: "object",
      properties: {
        roomId: { type: "string", description: "Room ID" },
        expiresInHours: { type: "number", description: "Invite expiry in hours" },
        maxUses: { type: "number", description: "Optional max uses" }
      },
      required: ["roomId"]
    }
  },
  {
    name: "list_room_pins",
    description: "List pinned evidence items in a room.",
    inputSchema: {
      type: "object",
      properties: { roomId: { type: "string", description: "Room ID" } },
      required: ["roomId"]
    }
  },
  {
    name: "pin_room_message",
    description: "Pin a room message as evidence.",
    inputSchema: {
      type: "object",
      properties: {
        roomId: { type: "string", description: "Room ID" },
        messageId: { type: "string", description: "Message ID" },
        category: { type: "string", description: "Pin category", default: "evidence" },
        note: { type: "string", description: "Optional note" }
      },
      required: ["roomId", "messageId"]
    }
  },
  {
    name: "unpin_room_message",
    description: "Remove a pinned message from the evidence board.",
    inputSchema: {
      type: "object",
      properties: {
        roomId: { type: "string", description: "Room ID" },
        messageId: { type: "string", description: "Message ID" }
      },
      required: ["roomId", "messageId"]
    }
  },
  {
    name: "edit_room_message",
    description: "Edit a room message.",
    inputSchema: {
      type: "object",
      properties: {
        roomId: { type: "string", description: "Room ID" },
        messageId: { type: "string", description: "Message ID" },
        content: { type: "string", description: "Updated content" }
      },
      required: ["roomId", "messageId", "content"]
    }
  },
  {
    name: "delete_room_message",
    description: "Delete a room message.",
    inputSchema: {
      type: "object",
      properties: {
        roomId: { type: "string", description: "Room ID" },
        messageId: { type: "string", description: "Message ID" }
      },
      required: ["roomId", "messageId"]
    }
  },
  {
    name: "export_room",
    description: "Export a room as structured evidence data.",
    inputSchema: {
      type: "object",
      properties: { roomId: { type: "string", description: "Room ID" } },
      required: ["roomId"]
    }
  },
  {
    name: "get_polymarket_markets",
    description: "List Polymarket markets with filters.",
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string", description: "Search query" },
        active: { type: "boolean", description: "Only active markets" },
        closed: { type: "boolean", description: "Only closed markets" },
        limit: { type: "number", description: "Limit", default: 20 },
        offset: { type: "number", description: "Offset", default: 0 },
        order: { type: "string", description: "Sort order", enum: ["volume24hr", "liquidity", "endDate", "startDate"] }
      }
    }
  },
  {
    name: "get_polymarket_market",
    description: "Get a Polymarket market by slug.",
    inputSchema: {
      type: "object",
      properties: { slug: { type: "string", description: "Market slug" } },
      required: ["slug"]
    }
  },
  {
    name: "get_polymarket_trending",
    description: "Get trending Polymarket markets.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number", description: "Limit", default: 10 } }
    }
  },
  {
    name: "get_polymarket_spikes",
    description: "Detect Polymarket volume spikes.",
    inputSchema: {
      type: "object",
      properties: {
        threshold: { type: "number", description: "Spike threshold", default: 2 },
        minVolume: { type: "number", description: "Minimum volume", default: 1e4 }
      }
    }
  },
  {
    name: "get_polymarket_movers",
    description: "Get Polymarket markets with large price movements.",
    inputSchema: {
      type: "object",
      properties: { minChange: { type: "number", description: "Minimum percentage change", default: 0.05 } }
    }
  },
  {
    name: "get_polymarket_events",
    description: "Get Polymarket events.",
    inputSchema: {
      type: "object",
      properties: {
        active: { type: "boolean", description: "Only active events" },
        limit: { type: "number", description: "Limit", default: 20 },
        offset: { type: "number", description: "Offset", default: 0 }
      }
    }
  },
  {
    name: "get_polymarket_leaderboard",
    description: "Get top Polymarket traders.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number", description: "Limit", default: 20 } }
    }
  },
  {
    name: "get_polymarket_trader",
    description: "Get a Polymarket trader profile.",
    inputSchema: {
      type: "object",
      properties: { address: { type: "string", description: "Trader address" } },
      required: ["address"]
    }
  },
  {
    name: "get_polymarket_order_book",
    description: "Get a Polymarket order book.",
    inputSchema: {
      type: "object",
      properties: { tokenId: { type: "string", description: "Order book token ID" } },
      required: ["tokenId"]
    }
  },
  {
    name: "get_polymarket_trades",
    description: "Get Polymarket trades for a condition.",
    inputSchema: {
      type: "object",
      properties: {
        conditionId: { type: "string", description: "Condition ID" },
        limit: { type: "number", description: "Limit", default: 20 }
      },
      required: ["conditionId"]
    }
  },
  {
    name: "get_polymarket_history",
    description: "Get Polymarket price history.",
    inputSchema: {
      type: "object",
      properties: {
        conditionId: { type: "string", description: "Condition ID" },
        interval: { type: "string", description: "History interval", enum: ["hour", "day"] },
        limit: { type: "number", description: "Limit", default: 50 }
      },
      required: ["conditionId"]
    }
  },
  {
    name: "fetch_dune_interactors",
    description: "Fetch contract interactors from Dune Analytics.",
    inputSchema: {
      type: "object",
      properties: {
        contractAddress: { type: "string", description: "Contract address" },
        chain: { type: "string", description: "Chain name", enum: ["ethereum", "polygon", "arbitrum", "optimism", "base", "linea"] },
        limit: { type: "number", description: "Row limit", default: 1e3 },
        customApiKey: { type: "string", description: "Optional Dune API key override" }
      },
      required: ["contractAddress", "chain"]
    }
  }
];

// src/mcp/api-handlers.ts
import { default as axios } from "axios";

// src/mcp/mcpLogger.ts
var mcpLogWarnings = 0;
async function logMcpRequest(entry) {
  if (process.env.FUNDTRACER_MCP_DISABLE_LOGGING === "1") {
    return;
  }
  try {
    const { getFirestore } = await import("../firebase.js");
    const db = getFirestore();
    if (!db) {
      console.warn("[MCP-LOGGER] getFirestore() returned null");
      return;
    }
    await db.collection("mcpLogs").add(entry);
    console.log("[MCP-LOGGER] Logged:", entry.toolName, "for user:", entry.userId, "status:", entry.status);
  } catch (err2) {
    mcpLogWarnings++;
    if (mcpLogWarnings <= 3 || mcpLogWarnings % 10 === 0) {
      console.error("[MCP-LOGGER] Failed to log MCP request:", err2?.message || err2);
    }
  }
}

// src/utils/nameResolver.ts
import { JsonRpcProvider, keccak256, toUtf8Bytes } from "ethers";
var ETH_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
var BASENAME_RESOLVER = "0xC6d566A56A1aFf6508b41f6c90ff131615583BCD";
var BASE_RPC = "https://mainnet.base.org";
var LNS_REGISTRY = "0x50130b669B28C339991d8676FA73CF122a121267";
var LNS_ADDR_SELECTOR = "0x3b3b57de";
var cache = /* @__PURE__ */ new Map();
var CACHE_TTL = 5 * 60 * 1e3;
var MAX_CACHE_SIZE = 500;
function getFromCache(name) {
  const key = name.toLowerCase();
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  cache.delete(key);
  cache.set(key, entry);
  return entry.address;
}
function setCache(name, address) {
  if (cache.size >= MAX_CACHE_SIZE) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  cache.set(name.toLowerCase(), { address, timestamp: Date.now() });
}
function isEnsName(input) {
  if (!input || typeof input !== "string") return false;
  if (ETH_ADDRESS_RE.test(input)) return false;
  return /\.(eth|base\.eth|linea\.eth)$/i.test(input.trim());
}
function namehash(name) {
  let node = "0000000000000000000000000000000000000000000000000000000000000000";
  if (!name) return "0x" + node;
  const labels = name.split(".");
  for (let i = labels.length - 1; i >= 0; i--) {
    const labelHash = keccak256(toUtf8Bytes(labels[i])).slice(2);
    node = keccak256("0x" + node + labelHash).slice(2);
  }
  return "0x" + node;
}
async function resolveViaContract(rpcUrl, resolverAddress, name) {
  try {
    const node = namehash(name);
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [{
          to: resolverAddress,
          data: LNS_ADDR_SELECTOR + node.slice(2)
        }, "latest"]
      })
    });
    const data = await res.json();
    const raw = data?.result;
    if (!raw || raw === "0x" || raw === "0x" + "0".repeat(64)) return null;
    return "0x" + raw.slice(26);
  } catch {
    return null;
  }
}
async function resolveEns(name) {
  const key = process.env.DEFAULT_ALCHEMY_API_KEY || process.env.ALCHEMY_API_KEY || "";
  if (!key) {
    console.error("[nameResolver] No Alchemy API key configured for ENS resolution");
    return null;
  }
  const provider = new JsonRpcProvider(`https://eth-mainnet.g.alchemy.com/v2/${key}`);
  try {
    const resolved = await Promise.race([
      provider.resolveName(name),
      new Promise((_, reject) => setTimeout(() => reject(new Error("ENS resolution timed out after 8s")), 8e3))
    ]);
    return resolved || null;
  } catch (err2) {
    console.error(`[nameResolver] ENS resolveName("${name}") failed:`, err2.message || err2);
    return null;
  }
}
async function resolveBasename(name) {
  try {
    const ensResult = await resolveEns(name);
    if (ensResult) return ensResult;
  } catch {
  }
  return resolveViaContract(BASE_RPC, BASENAME_RESOLVER, name);
}
async function resolveLineaName(name) {
  try {
    const ensResult = await resolveEns(name);
    if (ensResult) return ensResult;
  } catch {
  }
  const rpcUrl = process.env.LINEA_RPC_URL || "https://rpc.linea.build";
  return resolveViaContract(rpcUrl, LNS_REGISTRY, name);
}
async function tryResolveAddress(input) {
  if (!input || typeof input !== "string") {
    return { resolved: input || "", error: "Address is required" };
  }
  const trimmed = input.trim();
  if (ETH_ADDRESS_RE.test(trimmed)) {
    return { resolved: trimmed.toLowerCase() };
  }
  if (!isEnsName(trimmed)) {
    return { resolved: trimmed };
  }
  const cached = getFromCache(trimmed);
  if (cached) return { resolved: cached };
  const lower = trimmed.toLowerCase();
  let resolved = null;
  try {
    if (lower.endsWith(".base.eth")) {
      resolved = await resolveBasename(trimmed);
    } else if (lower.endsWith(".linea.eth")) {
      resolved = await resolveLineaName(trimmed);
    } else {
      resolved = await resolveEns(trimmed);
    }
  } catch {
    resolved = null;
  }
  if (!resolved) {
    const hints = {
      ".base.eth": "Basename may not be registered on Base. Register at base.org/names.",
      ".linea.eth": "Linea name may not be registered. Register via Linea Name Service.",
      ".eth": "ENS name may not be registered. Check at app.ens.domains."
    };
    const hint = hints[lower.match(/\.(?:base\.eth|linea\.eth|eth)$/)?.[0] || ""] || "ENS name may not be registered or is not resolvable.";
    return {
      resolved: trimmed,
      error: `Could not resolve "${trimmed}": ${hint}`
    };
  }
  setCache(trimmed, resolved);
  return { resolved };
}

// src/mcp/api-handlers.ts
function ok(text) {
  return { content: [{ type: "text", text }] };
}
function err(message) {
  return { content: [{ type: "text", text: message }], isError: true };
}
function extractApiError(error) {
  return error?.response?.data?.error || error?.response?.data?.message || error?.message || "Unknown error";
}
async function resolveAddressInput(input) {
  const { resolved, error } = await tryResolveAddress(input);
  if (error) return { error: err(error) };
  return { resolved };
}
async function routeGet(path, params) {
  return api().get(path, { params });
}
async function routePost(path, body, params) {
  return api().post(path, body, { params });
}
async function routePatch(path, body, params) {
  return api().patch(path, body, { params });
}
async function routeDelete(path, params) {
  return api().delete(path, { params });
}
var API_BASE = process.env.FUNDTRACER_API_URL || "https://api.fundtracer.xyz";
var _mcpCtx = null;
function api() {
  const key = _mcpCtx?.apiKey || process.env.FUNDTRACER_MCP_API_KEY || "";
  const headers = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json"
  };
  if (_mcpCtx?.userId) {
    headers["X-MCP-UserId"] = _mcpCtx.userId;
    headers["x-auth-token"] = `${key}:${_mcpCtx.userId}`;
  }
  return axios.create({
    baseURL: API_BASE,
    timeout: 6e4,
    headers
  });
}
var analyzeWallet = async (args, ctx) => {
  const { address, chainId, transactionLimit } = args;
  try {
    const res = await api().post("/api/analyze/wallet", {
      address,
      chain: chainId,
      options: { limit: transactionLimit || 500 }
    });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    const msg = error.response?.data?.error || error.message;
    return err(`Wallet analysis failed: ${msg}`);
  }
};
var traceFunds = async (args, ctx) => {
  const { address, chainId, maxDepth = 3, direction = "both" } = args;
  try {
    const res = await api().post("/api/analyze/funding-tree", {
      address,
      chain: chainId,
      maxDepth,
      direction
    });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    const msg = error.response?.data?.error || error.message;
    return err(`Fund tracing failed: ${msg}`);
  }
};
var compareWallets = async (args, ctx) => {
  const { addresses, chainId } = args;
  const addrList = addresses.split(",").map((a) => a.trim()).filter(Boolean);
  if (addrList.length < 2) return err("At least 2 addresses required");
  try {
    const res = await api().post("/api/analyze/compare", {
      addresses: addrList,
      chain: chainId
    });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    const msg = error.response?.data?.error || error.message;
    return err(`Wallet comparison failed: ${msg}`);
  }
};
var analyzeContract = async (args, ctx) => {
  const { contractAddress, chainId, maxInteractors = 100 } = args;
  try {
    const res = await api().post("/api/analyze/contract", {
      contractAddress,
      chain: chainId,
      maxInteractors
    });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    const msg = error.response?.data?.error || error.message;
    return err(`Contract analysis failed: ${msg}`);
  }
};
var detectSybilClusters = async (args, ctx) => {
  const { addresses, chainId } = args;
  const addrList = addresses.split(",").map((a) => a.trim()).filter(Boolean);
  if (addrList.length < 3) return err("At least 3 addresses required for cluster detection");
  try {
    const res = await api().post("/api/analyze/sybil", {
      addresses: addrList,
      chain: chainId
    });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    const msg = error.response?.data?.error || error.message;
    return err(`Sybil detection failed: ${msg}`);
  }
};
var getPortfolio = async (args, ctx) => {
  const { address, chainId } = args;
  const { resolved: resolvedAddr, error: resolveErr } = await resolveAddressInput(address);
  if (resolveErr) return resolveErr;
  try {
    const res = await api().get(`/api/portfolio/${encodeURIComponent(resolvedAddr || address)}`, {
      params: { chain: chainId }
    });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    const msg = extractApiError(error);
    return err(`Portfolio fetch failed: ${msg}`);
  }
};
var getTransactions = async (args, ctx) => {
  const { address, chainId, limit = 50 } = args;
  const { resolved: resolvedAddr, error: resolveErr } = await resolveAddressInput(address);
  if (resolveErr) return resolveErr;
  try {
    const res = await api().post("/api/history", {
      wallet: resolvedAddr || address,
      blockchain: chainId,
      pageToken: null,
      filters: {}
    });
    const txs = (res.data.transactions || []).slice(0, limit);
    return ok(JSON.stringify({
      address,
      chainId,
      transactions: txs,
      totalCount: res.data.transactions?.length || 0
    }, null, 2));
  } catch (error) {
    const msg = extractApiError(error);
    return err(`Transaction fetch failed: ${msg}`);
  }
};
var lookupEntity = async (args, ctx) => {
  const { query, chainId } = args;
  const chain = chainId || "ethereum";
  const { resolved: resolvedQuery } = await resolveAddressInput(query);
  const lookupValue = resolvedQuery || query;
  try {
    if (/^0x[a-fA-F0-9]{40}$/.test(lookupValue) || /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(lookupValue)) {
      const res2 = await api().get(`/api/entities/${lookupValue}`, {
        params: { chain }
      });
      return ok(JSON.stringify(res2.data, null, 2));
    }
    const res = await api().get("/api/entities/search", {
      params: { q: lookupValue, chain }
    });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    if (error.response?.status === 404) {
      return ok(JSON.stringify({ query: lookupValue, label: "Unknown address", chain }, null, 2));
    }
    const msg = error.response?.data?.error || error.message;
    return err(`Entity lookup failed: ${msg}`);
  }
};
var getGasPrices = async (args, ctx) => {
  const { chainId } = args;
  try {
    const res = await api().get("/api/gas", {
      params: chainId ? { chain: chainId } : {}
    });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    const msg = error.response?.data?.error || error.message;
    return err(`Gas price fetch failed: ${msg}`);
  }
};
var getTokenInfo = async (args, ctx) => {
  const { tokenAddress, chainId } = args;
  const { resolved: resolvedAddr, error: resolveErr } = await resolveAddressInput(tokenAddress);
  if (resolveErr) return resolveErr;
  try {
    const res = await routeGet(`/api/tokens/${encodeURIComponent(resolvedAddr || tokenAddress)}`, {
      chain: chainId
    });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    const msg = extractApiError(error);
    return err(`Token info fetch failed: ${msg}`);
  }
};
var resolveName = async (args, ctx) => {
  const { input } = args;
  const { resolved, error } = await tryResolveAddress(input);
  const normalizedInput = typeof input === "string" ? input.trim().toLowerCase() : "";
  const normalizedResolved = typeof resolved === "string" ? resolved.toLowerCase() : "";
  return ok(JSON.stringify({
    input,
    resolved,
    isAddress: /^0x[a-fA-F0-9]{40}$/.test(resolved),
    isResolvedName: normalizedResolved !== normalizedInput,
    ...error ? { warning: error } : {}
  }, null, 2));
};
var getTransactionDetail = async (args, ctx) => {
  const { chainId, hash } = args;
  try {
    const res = await routeGet(`/api/tx/${encodeURIComponent(chainId)}/${encodeURIComponent(hash)}`);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Transaction detail fetch failed: ${extractApiError(error)}`);
  }
};
var getTransactionHistory = async (args, ctx) => {
  const { address, chainId, pageToken = null, filters = {} } = args;
  const { resolved: resolvedAddr, error: resolveErr } = await resolveAddressInput(address);
  if (resolveErr) return resolveErr;
  try {
    const res = await routePost("/api/history", {
      wallet: resolvedAddr || address,
      blockchain: chainId,
      pageToken,
      filters
    });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Transaction history fetch failed: ${extractApiError(error)}`);
  }
};
var analyzeCEXFlow = async (args, ctx) => {
  const { walletAddress, chainId, cexName, depth } = args;
  const { resolved: resolvedAddr, error: resolveErr } = await resolveAddressInput(walletAddress);
  if (resolveErr) return resolveErr;
  try {
    const res = await routePost("/api/analyze/cex-flow", {
      walletAddress: resolvedAddr || walletAddress,
      chain: chainId,
      ...cexName ? { cexName } : {},
      ...depth !== void 0 ? { depth } : {}
    });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`CEX flow analysis failed: ${extractApiError(error)}`);
  }
};
var analyzeSybilAddresses = async (args, ctx) => {
  const { addresses, chainId, txHash } = args;
  const list = addresses.split(",").map((a) => a.trim()).filter(Boolean);
  const resolved = [];
  for (const a of list) {
    const r = await resolveAddressInput(a);
    if (r.error) return r.error;
    resolved.push(r.resolved || a);
  }
  try {
    const res = await routePost("/api/analyze/sybil-addresses", {
      addresses: resolved,
      chain: chainId,
      ...txHash ? { txHash } : {}
    });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Sybil address analysis failed: ${extractApiError(error)}`);
  }
};
var searchContracts = async (args) => {
  const { query } = args;
  try {
    const res = await routeGet("/api/contracts/search", { q: query });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Contract search failed: ${extractApiError(error)}`);
  }
};
var lookupContract = async (args) => {
  const { address } = args;
  const { resolved: resolvedAddr, error: resolveErr } = await resolveAddressInput(address);
  if (resolveErr) return resolveErr;
  try {
    const res = await routeGet(`/api/contracts/lookup/${encodeURIComponent(resolvedAddr || address)}`);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Contract lookup failed: ${extractApiError(error)}`);
  }
};
var getContractStats = async () => {
  try {
    const res = await routeGet("/api/contracts/stats");
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Contract stats fetch failed: ${extractApiError(error)}`);
  }
};
var searchTokens = async (args) => {
  const { query } = args;
  try {
    const res = await routeGet("/api/tokens/search", { q: query });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Token search failed: ${extractApiError(error)}`);
  }
};
var getMarketStats = async () => {
  try {
    const res = await routeGet("/api/market/stats");
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Market stats fetch failed: ${extractApiError(error)}`);
  }
};
var getMarketCoins = async (args) => {
  const { chainId, page = 1, perPage = 100 } = args;
  try {
    const res = await routeGet("/api/market/coins", {
      chain: chainId || "all",
      page,
      per_page: perPage
    });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Market coins fetch failed: ${extractApiError(error)}`);
  }
};
var getTokenChart = async (args) => {
  const { tokenAddress, chainId, coinId, days = 7 } = args;
  const { resolved: resolvedAddr, error: resolveErr } = await resolveAddressInput(tokenAddress);
  if (resolveErr) return resolveErr;
  try {
    const res = await routeGet(`/api/tokens/${encodeURIComponent(resolvedAddr || tokenAddress)}/chart`, {
      chain: chainId,
      coinId,
      days
    });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Token chart fetch failed: ${extractApiError(error)}`);
  }
};
var getDexScreenerLatestProfiles = async () => {
  try {
    const res = await routeGet("/api/dexscreener/profiles/latest");
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`DEX Screener profiles fetch failed: ${extractApiError(error)}`);
  }
};
var getDexScreenerBoosts = async () => {
  try {
    const res = await routeGet("/api/dexscreener/boosts/top");
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`DEX Screener boosts fetch failed: ${extractApiError(error)}`);
  }
};
var searchDexScreenerPairs = async (args) => {
  const { query } = args;
  try {
    const res = await routeGet("/api/dexscreener/search", { q: query });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`DEX Screener search failed: ${extractApiError(error)}`);
  }
};
var getDexScreenerTokenDetails = async (args) => {
  const { chainId, tokenAddress } = args;
  const { resolved: resolvedAddr, error: resolveErr } = await resolveAddressInput(tokenAddress);
  if (resolveErr) return resolveErr;
  try {
    const res = await routeGet(`/api/dexscreener/token/${encodeURIComponent(chainId)}/${encodeURIComponent(resolvedAddr || tokenAddress)}`);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`DEX Screener token fetch failed: ${extractApiError(error)}`);
  }
};
var getDexScreenerTokenPairs = async (args) => {
  const { chainId, tokenAddress } = args;
  const { resolved: resolvedAddr, error: resolveErr } = await resolveAddressInput(tokenAddress);
  if (resolveErr) return resolveErr;
  try {
    const res = await routeGet(`/api/dexscreener/pairs/${encodeURIComponent(chainId)}/${encodeURIComponent(resolvedAddr || tokenAddress)}`);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`DEX Screener pairs fetch failed: ${extractApiError(error)}`);
  }
};
var getDexScreenerTrending = async () => {
  try {
    const res = await routeGet("/api/dexscreener/trending");
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`DEX Screener trending fetch failed: ${extractApiError(error)}`);
  }
};
var getScanHistory = async () => {
  try {
    const res = await routeGet("/api/scan-history");
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Scan history fetch failed: ${extractApiError(error)}`);
  }
};
var getScanHistoryStats = async () => {
  try {
    const res = await routeGet("/api/scan-history/stats");
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Scan history stats fetch failed: ${extractApiError(error)}`);
  }
};
var saveScanHistoryItem = async (args) => {
  try {
    const res = await routePost("/api/scan-history", args);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Scan history save failed: ${extractApiError(error)}`);
  }
};
var syncScanHistory = async (args) => {
  const { items } = args;
  try {
    const res = await routePost("/api/scan-history/sync", { items });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Scan history sync failed: ${extractApiError(error)}`);
  }
};
var deleteScanHistoryItem = async (args) => {
  const { address } = args;
  const { resolved: resolvedAddr, error: resolveErr } = await resolveAddressInput(address);
  if (resolveErr) return resolveErr;
  try {
    const res = await routeDelete(`/api/scan-history/${encodeURIComponent(resolvedAddr || address)}`);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Scan history delete failed: ${extractApiError(error)}`);
  }
};
var clearScanHistory = async () => {
  try {
    const res = await routeDelete("/api/scan-history");
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Scan history clear failed: ${extractApiError(error)}`);
  }
};
var listRooms = async () => {
  try {
    const res = await routeGet("/api/rooms");
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Room listing failed: ${extractApiError(error)}`);
  }
};
var getRoomDetails = async (args) => {
  const { roomId } = args;
  try {
    const res = await routeGet(`/api/rooms/${encodeURIComponent(roomId)}`);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Room details fetch failed: ${extractApiError(error)}`);
  }
};
var createRoom = async (args) => {
  try {
    const res = await routePost("/api/rooms", args);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Room creation failed: ${extractApiError(error)}`);
  }
};
var updateRoom = async (args) => {
  const { roomId, ...body } = args;
  try {
    const res = await routePatch(`/api/rooms/${encodeURIComponent(roomId)}`, body);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Room update failed: ${extractApiError(error)}`);
  }
};
var deleteRoom = async (args) => {
  const { roomId } = args;
  try {
    const res = await routeDelete(`/api/rooms/${encodeURIComponent(roomId)}`);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Room delete failed: ${extractApiError(error)}`);
  }
};
var listRoomMessages = async (args) => {
  const { roomId, limit = 50, before } = args;
  try {
    const params = { limit };
    if (before !== void 0) params.before = before;
    const res = await routeGet(`/api/rooms/${encodeURIComponent(roomId)}/messages`, params);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Room messages fetch failed: ${extractApiError(error)}`);
  }
};
var sendRoomMessage = async (args) => {
  const { roomId, content, tempId } = args;
  try {
    const res = await routePost(`/api/rooms/${encodeURIComponent(roomId)}/messages`, { content, tempId });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Room message send failed: ${extractApiError(error)}`);
  }
};
var joinRoom = async (args) => {
  const { roomId, inviteCode } = args;
  try {
    const res = await routePost(`/api/rooms/${encodeURIComponent(roomId)}/join`, inviteCode ? { inviteCode } : {});
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Room join failed: ${extractApiError(error)}`);
  }
};
var leaveRoom = async (args) => {
  const { roomId } = args;
  try {
    const res = await routePost(`/api/rooms/${encodeURIComponent(roomId)}/leave`, {});
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Room leave failed: ${extractApiError(error)}`);
  }
};
var removeRoomMember = async (args) => {
  const { roomId, uid } = args;
  try {
    const res = await routeDelete(`/api/rooms/${encodeURIComponent(roomId)}/members/${encodeURIComponent(uid)}`);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Room member removal failed: ${extractApiError(error)}`);
  }
};
var promoteRoomMember = async (args) => {
  const { roomId, uid, role } = args;
  try {
    const res = await routePost(`/api/rooms/${encodeURIComponent(roomId)}/members/${encodeURIComponent(uid)}/role`, { role });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Room member promotion failed: ${extractApiError(error)}`);
  }
};
var createRoomInvite = async (args) => {
  const { roomId, expiresInHours, maxUses } = args;
  try {
    const body = {};
    if (expiresInHours !== void 0) body.expiresInHours = expiresInHours;
    if (maxUses !== void 0) body.maxUses = maxUses;
    const res = await routePost(`/api/rooms/${encodeURIComponent(roomId)}/invite`, body);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Room invite creation failed: ${extractApiError(error)}`);
  }
};
var listRoomPins = async (args) => {
  const { roomId } = args;
  try {
    const res = await routeGet(`/api/rooms/${encodeURIComponent(roomId)}/pins`);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Room pins fetch failed: ${extractApiError(error)}`);
  }
};
var pinRoomMessage = async (args) => {
  const { roomId, messageId, category, note } = args;
  try {
    const res = await routePost(`/api/rooms/${encodeURIComponent(roomId)}/messages/${encodeURIComponent(messageId)}/pin`, { category, note });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Room pin failed: ${extractApiError(error)}`);
  }
};
var unpinRoomMessage = async (args) => {
  const { roomId, messageId } = args;
  try {
    const res = await routeDelete(`/api/rooms/${encodeURIComponent(roomId)}/messages/${encodeURIComponent(messageId)}/pin`);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Room unpin failed: ${extractApiError(error)}`);
  }
};
var editRoomMessage = async (args) => {
  const { roomId, messageId, content } = args;
  try {
    const res = await routePatch(`/api/rooms/${encodeURIComponent(roomId)}/messages/${encodeURIComponent(messageId)}`, { content });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Room message edit failed: ${extractApiError(error)}`);
  }
};
var deleteRoomMessage = async (args) => {
  const { roomId, messageId } = args;
  try {
    const res = await routeDelete(`/api/rooms/${encodeURIComponent(roomId)}/messages/${encodeURIComponent(messageId)}`);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Room message delete failed: ${extractApiError(error)}`);
  }
};
var exportRoom = async (args) => {
  const { roomId } = args;
  try {
    const res = await routeGet(`/api/rooms/${encodeURIComponent(roomId)}/export`);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Room export failed: ${extractApiError(error)}`);
  }
};
var getPolymarketMarkets = async (args) => {
  const options = args;
  try {
    const res = await routeGet("/api/polymarket/markets", options);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Polymarket markets fetch failed: ${extractApiError(error)}`);
  }
};
var getPolymarketMarket = async (args) => {
  const { slug } = args;
  try {
    const res = await routeGet(`/api/polymarket/markets/${encodeURIComponent(slug)}`);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Polymarket market fetch failed: ${extractApiError(error)}`);
  }
};
var getPolymarketTrending = async (args) => {
  const { limit } = args;
  try {
    const res = await routeGet("/api/polymarket/trending", limit ? { limit } : void 0);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Polymarket trending fetch failed: ${extractApiError(error)}`);
  }
};
var getPolymarketSpikes = async (args) => {
  const { threshold, minVolume } = args;
  try {
    const params = {};
    if (threshold !== void 0) params.threshold = threshold;
    if (minVolume !== void 0) params.minVolume = minVolume;
    const res = await routeGet("/api/polymarket/spikes", params);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Polymarket spikes fetch failed: ${extractApiError(error)}`);
  }
};
var getPolymarketMovers = async (args) => {
  const { minChange } = args;
  try {
    const res = await routeGet("/api/polymarket/movers", minChange ? { minChange } : void 0);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Polymarket movers fetch failed: ${extractApiError(error)}`);
  }
};
var getPolymarketEvents = async (args) => {
  const options = args;
  try {
    const res = await routeGet("/api/polymarket/events", options);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Polymarket events fetch failed: ${extractApiError(error)}`);
  }
};
var getPolymarketLeaderboard = async (args) => {
  const { limit } = args;
  try {
    const res = await routeGet("/api/polymarket/leaderboard", limit ? { limit } : void 0);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Polymarket leaderboard fetch failed: ${extractApiError(error)}`);
  }
};
var getPolymarketTrader = async (args) => {
  const { address } = args;
  try {
    const res = await routeGet(`/api/polymarket/trader/${encodeURIComponent(address)}`);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Polymarket trader fetch failed: ${extractApiError(error)}`);
  }
};
var getPolymarketOrderBook = async (args) => {
  const { tokenId } = args;
  try {
    const res = await routeGet(`/api/polymarket/orderbook/${encodeURIComponent(tokenId)}`);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Polymarket order book fetch failed: ${extractApiError(error)}`);
  }
};
var getPolymarketTrades = async (args) => {
  const { conditionId, limit } = args;
  try {
    const res = await routeGet(`/api/polymarket/trades/${encodeURIComponent(conditionId)}`, limit ? { limit } : void 0);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Polymarket trades fetch failed: ${extractApiError(error)}`);
  }
};
var getPolymarketHistory = async (args) => {
  const { conditionId, interval, limit } = args;
  const params = {};
  if (interval) params.interval = interval;
  if (limit !== void 0) params.limit = limit;
  try {
    const res = await routeGet(`/api/polymarket/history/${encodeURIComponent(conditionId)}`, params);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Polymarket history fetch failed: ${extractApiError(error)}`);
  }
};
var getPortfolioTokens = async (args) => {
  const { address, chainId } = args;
  const { resolved: resolvedAddr, error: resolveErr } = await resolveAddressInput(address);
  if (resolveErr) return resolveErr;
  try {
    const res = await routeGet(`/api/portfolio/${encodeURIComponent(resolvedAddr || address)}/tokens`, {
      chain: chainId
    });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Portfolio tokens fetch failed: ${extractApiError(error)}`);
  }
};
var getPortfolioNfts = async (args) => {
  const { address, chainId } = args;
  const { resolved: resolvedAddr, error: resolveErr } = await resolveAddressInput(address);
  if (resolveErr) return resolveErr;
  try {
    const res = await routeGet(`/api/portfolio/${encodeURIComponent(resolvedAddr || address)}/nfts`, {
      chain: chainId
    });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Portfolio NFTs fetch failed: ${extractApiError(error)}`);
  }
};
var getPortfolioActivity = async (args) => {
  const { address, chainId } = args;
  const { resolved: resolvedAddr, error: resolveErr } = await resolveAddressInput(address);
  if (resolveErr) return resolveErr;
  try {
    const res = await routeGet(`/api/portfolio/${encodeURIComponent(resolvedAddr || address)}/activity`, {
      chain: chainId
    });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Portfolio activity fetch failed: ${extractApiError(error)}`);
  }
};
var getPortfolioStablecoins = async (args) => {
  const { address, chainId } = args;
  const { resolved: resolvedAddr, error: resolveErr } = await resolveAddressInput(address);
  if (resolveErr) return resolveErr;
  try {
    const res = await routeGet(`/api/portfolio/${encodeURIComponent(resolvedAddr || address)}/stablecoins`, {
      chain: chainId
    });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Portfolio stablecoins fetch failed: ${extractApiError(error)}`);
  }
};
var batchLookupContracts = async (args) => {
  const { addresses } = args;
  const list = addresses.split(",").map((a) => a.trim()).filter(Boolean);
  const resolved = [];
  for (const a of list) {
    const r = await resolveAddressInput(a);
    if (r.error) return r.error;
    resolved.push(r.resolved || a);
  }
  try {
    const res = await routePost("/api/contracts/batch", { addresses: resolved });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Batch contract lookup failed: ${extractApiError(error)}`);
  }
};
var refreshContracts = async () => {
  try {
    const res = await routePost("/api/contracts/refresh", {});
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Contract refresh failed: ${extractApiError(error)}`);
  }
};
var fetchDuneInteractors = async (args) => {
  const { contractAddress, chain, limit, customApiKey } = args;
  const { resolved: resolvedAddr, error: resolveErr } = await resolveAddressInput(contractAddress);
  if (resolveErr) return resolveErr;
  try {
    const res = await routePost("/api/dune/fetch", {
      contractAddress: resolvedAddr || contractAddress,
      chain,
      ...limit !== void 0 ? { limit } : {},
      ...customApiKey ? { customApiKey } : {}
    });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error) {
    return err(`Dune interactor fetch failed: ${extractApiError(error)}`);
  }
};
function withLogging(toolName, handler) {
  return async (args, ctx) => {
    _mcpCtx = ctx;
    const start = Date.now();
    try {
      const result = await handler(args, ctx);
      logMcpRequest({
        userId: ctx.userId,
        toolName,
        args: JSON.stringify(args).substring(0, 500),
        status: result.isError ? "error" : "success",
        responsePreview: JSON.stringify(result).substring(0, 300),
        duration: Date.now() - start,
        createdAt: Date.now(),
        keyPrefix: ctx.apiKeyPrefix
      });
      return result;
    } catch (error) {
      logMcpRequest({
        userId: ctx.userId,
        toolName,
        args: JSON.stringify(args).substring(0, 500),
        status: "error",
        responsePreview: error.message.substring(0, 300),
        duration: Date.now() - start,
        createdAt: Date.now(),
        keyPrefix: ctx.apiKeyPrefix
      });
      throw error;
    } finally {
      _mcpCtx = null;
    }
  };
}
var TOOL_HANDLERS = {
  analyze_wallet: withLogging("analyze_wallet", analyzeWallet),
  trace_funds: withLogging("trace_funds", traceFunds),
  compare_wallets: withLogging("compare_wallets", compareWallets),
  analyze_contract: withLogging("analyze_contract", analyzeContract),
  detect_sybil_clusters: withLogging("detect_sybil_clusters", detectSybilClusters),
  analyze_cex_flow: withLogging("analyze_cex_flow", analyzeCEXFlow),
  analyze_sybil_addresses: withLogging("analyze_sybil_addresses", analyzeSybilAddresses),
  resolve_name: withLogging("resolve_name", resolveName),
  get_portfolio: withLogging("get_portfolio", getPortfolio),
  get_portfolio_tokens: withLogging("get_portfolio_tokens", getPortfolioTokens),
  get_portfolio_nfts: withLogging("get_portfolio_nfts", getPortfolioNfts),
  get_portfolio_activity: withLogging("get_portfolio_activity", getPortfolioActivity),
  get_portfolio_stablecoins: withLogging("get_portfolio_stablecoins", getPortfolioStablecoins),
  get_transactions: withLogging("get_transactions", getTransactions),
  get_transaction_history: withLogging("get_transaction_history", getTransactionHistory),
  get_transaction_detail: withLogging("get_transaction_detail", getTransactionDetail),
  lookup_entity: withLogging("lookup_entity", lookupEntity),
  search_contracts: withLogging("search_contracts", searchContracts),
  lookup_contract: withLogging("lookup_contract", lookupContract),
  batch_lookup_contracts: withLogging("batch_lookup_contracts", batchLookupContracts),
  get_contract_stats: withLogging("get_contract_stats", getContractStats),
  refresh_contracts: withLogging("refresh_contracts", refreshContracts),
  search_tokens: withLogging("search_tokens", searchTokens),
  get_market_stats: withLogging("get_market_stats", getMarketStats),
  get_market_coins: withLogging("get_market_coins", getMarketCoins),
  get_gas_prices: withLogging("get_gas_prices", getGasPrices),
  get_token_info: withLogging("get_token_info", getTokenInfo),
  get_token_chart: withLogging("get_token_chart", getTokenChart),
  get_dexscreener_latest_profiles: withLogging("get_dexscreener_latest_profiles", getDexScreenerLatestProfiles),
  get_dexscreener_top_boosts: withLogging("get_dexscreener_top_boosts", getDexScreenerBoosts),
  search_dexscreener_pairs: withLogging("search_dexscreener_pairs", searchDexScreenerPairs),
  get_dexscreener_token_details: withLogging("get_dexscreener_token_details", getDexScreenerTokenDetails),
  get_dexscreener_token_pairs: withLogging("get_dexscreener_token_pairs", getDexScreenerTokenPairs),
  get_dexscreener_trending: withLogging("get_dexscreener_trending", getDexScreenerTrending),
  get_scan_history: withLogging("get_scan_history", getScanHistory),
  get_scan_history_stats: withLogging("get_scan_history_stats", getScanHistoryStats),
  save_scan_history_item: withLogging("save_scan_history_item", saveScanHistoryItem),
  sync_scan_history: withLogging("sync_scan_history", syncScanHistory),
  delete_scan_history_item: withLogging("delete_scan_history_item", deleteScanHistoryItem),
  clear_scan_history: withLogging("clear_scan_history", clearScanHistory),
  list_rooms: withLogging("list_rooms", listRooms),
  get_room_details: withLogging("get_room_details", getRoomDetails),
  create_room: withLogging("create_room", createRoom),
  update_room: withLogging("update_room", updateRoom),
  delete_room: withLogging("delete_room", deleteRoom),
  list_room_messages: withLogging("list_room_messages", listRoomMessages),
  send_room_message: withLogging("send_room_message", sendRoomMessage),
  join_room: withLogging("join_room", joinRoom),
  leave_room: withLogging("leave_room", leaveRoom),
  remove_room_member: withLogging("remove_room_member", removeRoomMember),
  promote_room_member: withLogging("promote_room_member", promoteRoomMember),
  create_room_invite: withLogging("create_room_invite", createRoomInvite),
  list_room_pins: withLogging("list_room_pins", listRoomPins),
  pin_room_message: withLogging("pin_room_message", pinRoomMessage),
  unpin_room_message: withLogging("unpin_room_message", unpinRoomMessage),
  edit_room_message: withLogging("edit_room_message", editRoomMessage),
  delete_room_message: withLogging("delete_room_message", deleteRoomMessage),
  export_room: withLogging("export_room", exportRoom),
  get_polymarket_markets: withLogging("get_polymarket_markets", getPolymarketMarkets),
  get_polymarket_market: withLogging("get_polymarket_market", getPolymarketMarket),
  get_polymarket_trending: withLogging("get_polymarket_trending", getPolymarketTrending),
  get_polymarket_spikes: withLogging("get_polymarket_spikes", getPolymarketSpikes),
  get_polymarket_movers: withLogging("get_polymarket_movers", getPolymarketMovers),
  get_polymarket_events: withLogging("get_polymarket_events", getPolymarketEvents),
  get_polymarket_leaderboard: withLogging("get_polymarket_leaderboard", getPolymarketLeaderboard),
  get_polymarket_trader: withLogging("get_polymarket_trader", getPolymarketTrader),
  get_polymarket_order_book: withLogging("get_polymarket_order_book", getPolymarketOrderBook),
  get_polymarket_trades: withLogging("get_polymarket_trades", getPolymarketTrades),
  get_polymarket_history: withLogging("get_polymarket_history", getPolymarketHistory),
  fetch_dune_interactors: withLogging("fetch_dune_interactors", fetchDuneInteractors)
};

// src/mcp/mcpAuth.ts
async function validateMcpApiKey(rawKey) {
  if (!rawKey.startsWith("ft_")) throw new Error("Invalid MCP API key format");
  let firestoreResult = null;
  try {
    firestoreResult = await validateWithFirestore(rawKey);
    if (firestoreResult) return firestoreResult;
  } catch {
  }
  return validateViaHttp(rawKey);
}
async function validateWithFirestore(rawKey) {
  const { getFirestore } = await import("../firebase.js");
  const db = getFirestore();
  if (!db) return null;
  const keyDoc = await db.collection("apiKeys").doc(rawKey).get();
  if (keyDoc.exists) {
    const data = keyDoc.data();
    if (!data) throw new Error("Invalid MCP API key");
    if (data.expiresAt && data.expiresAt < Date.now()) throw new Error("MCP API key has expired");
    if (data.active === false) throw new Error("MCP API key has been revoked");
    const scopes = data.scopes || [];
    if (data.keyType !== "mcp" && !scopes.includes("mcp")) {
      throw new Error("This API key does not have MCP access");
    }
    trackUsage(data.userId, rawKey);
    return {
      userId: data.userId,
      tier: data.tier || "free",
      apiKeyPrefix: rawKey.substring(0, 15),
      apiKey: rawKey
    };
  }
  const { hashAPIKey } = await import("../models/apiKey.js");
  const keyHash = hashAPIKey(rawKey);
  const snapshot = await db.collection("apiKeys").where("isActive", "==", true).get();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.keyHash === keyHash) {
      if (data.expiresAt && data.expiresAt < Date.now()) throw new Error("MCP API key has expired");
      if (!data.isActive) throw new Error("MCP API key has been revoked");
      const scopes = data.scopes || [];
      if (data.keyType !== "mcp" && !scopes.includes("mcp")) {
        throw new Error("This API key does not have MCP access");
      }
      trackUsage(data.userId, rawKey);
      return {
        userId: data.userId,
        tier: data.tier || "free",
        apiKeyPrefix: rawKey.substring(0, 15),
        apiKey: rawKey
      };
    }
  }
  return null;
}
async function validateViaHttp(rawKey) {
  const API_URL = process.env.FUNDTRACER_API_URL || "https://api.fundtracer.xyz";
  const { default: fetch2 } = await import("node-fetch");
  const res = await fetch2(`${API_URL}/api/mcp/validate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${rawKey}`
    }
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body ? JSON.parse(body).error || body : `Validation failed (HTTP ${res.status})`);
  }
  const data = await res.json();
  return {
    userId: data.userId,
    tier: data.tier || "free",
    apiKeyPrefix: rawKey.substring(0, 15),
    apiKey: rawKey
  };
}
async function trackUsage(userId, rawKey) {
  try {
    const { incrementAPIKeyUsage } = await import("../models/apiKey.js");
    await incrementAPIKeyUsage(userId, rawKey);
  } catch {
  }
}

// src/mcp/server.ts
function createFundTracerMcpServer(resolveContext, options = {}) {
  const logRegistrations = options.logRegistrations ?? true;
  const server = new McpServer({
    name: "FundTracer MCP",
    version: "1.1.0"
  });
  for (const toolDef of ALL_MCP_TOOLS) {
    const handler = TOOL_HANDLERS[toolDef.name];
    if (!handler) {
      console.error(`[MCP] No handler for tool: ${toolDef.name}`);
      continue;
    }
    server.registerTool(toolDef.name, {
      description: toolDef.description,
      inputSchema: jsonSchemaObjectToZodShape(toolDef.inputSchema)
    }, async (args, requestContext) => {
      let ctx;
      try {
        ctx = await resolveContext(requestContext);
      } catch (err2) {
        return {
          content: [{ type: "text", text: `Authentication failed: ${err2.message}` }],
          isError: true
        };
      }
      return handler(args, ctx);
    });
    if (logRegistrations) {
      console.error(`[MCP] Registered tool: ${toolDef.name}`);
    }
  }
  return server;
}
function jsonSchemaObjectToZodShape(schema) {
  const required = new Set(Array.isArray(schema?.required) ? schema.required : []);
  const properties = schema?.properties || {};
  const shape = {};
  for (const [name, propertySchema] of Object.entries(properties)) {
    let field = jsonSchemaPropertyToZod(propertySchema);
    if (!required.has(name)) field = field.optional();
    shape[name] = field;
  }
  return shape;
}
function jsonSchemaPropertyToZod(schema) {
  let field;
  if (Array.isArray(schema?.enum) && schema.enum.length > 0) {
    const values = schema.enum.filter((value) => typeof value === "string");
    field = values.length > 0 ? z.enum(values) : z.string();
  } else {
    switch (schema?.type) {
      case "number":
      case "integer":
        field = z.number();
        break;
      case "boolean":
        field = z.boolean();
        break;
      case "array":
        field = z.array(z.unknown());
        break;
      case "object":
        field = z.record(z.unknown());
        break;
      case "string":
      default:
        field = z.string();
        break;
    }
  }
  if (schema?.description && typeof field.describe === "function") {
    field = field.describe(schema.description);
  }
  if (schema?.default !== void 0) {
    field = field.default(schema.default);
  }
  return field;
}
async function resolveStdioMcpContext() {
  const apiKey = process.env.FUNDTRACER_MCP_API_KEY;
  if (!apiKey) {
    throw new Error("FUNDTRACER_MCP_API_KEY environment variable not set");
  }
  return validateMcpApiKey(apiKey);
}

// src/mcp/stdio.ts
dotenv.config();
console.log = console.error.bind(console);
process.env.FUNDTRACER_MCP_DISABLE_LOGGING = process.env.FUNDTRACER_MCP_DISABLE_LOGGING || "1";
async function main() {
  let firebaseAvailable = false;
  try {
    const { initializeFirebase } = await import("../firebase.js");
    initializeFirebase();
    firebaseAvailable = true;
    console.error("[MCP] Firebase initialized");
  } catch (err2) {
    console.error("[MCP] Firebase not available \u2014 key validation will fail. Set Firebase credentials in env.");
  }
  const server = createFundTracerMcpServer(resolveStdioMcpContext);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stdin.resume();
  console.error("[MCP] FundTracer MCP server running on stdio");
}
main().catch((err2) => {
  console.error("[MCP] Fatal error:", err2);
  process.exit(1);
});
process.on("SIGINT", async () => {
  console.error("[MCP] Shutting down...");
  process.exit(0);
});
process.on("SIGTERM", async () => {
  console.error("[MCP] Shutting down...");
  process.exit(0);
});
