#!/usr/bin/env node
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/mcp/tools.ts
var tools_exports = {};
__export(tools_exports, {
  ALL_MCP_TOOLS: () => ALL_MCP_TOOLS,
  getToolByName: () => getToolByName
});
function getToolByName(name) {
  return ALL_MCP_TOOLS.find((t) => t.name === name);
}
var ALL_MCP_TOOLS;
var init_tools = __esm({
  "src/mcp/tools.ts"() {
    ALL_MCP_TOOLS = [
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
      }
    ];
  }
});

// src/mcp/mcpLogger.ts
async function logMcpRequest(entry) {
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
var mcpLogWarnings;
var init_mcpLogger = __esm({
  "src/mcp/mcpLogger.ts"() {
    mcpLogWarnings = 0;
  }
});

// src/mcp/api-handlers.ts
var api_handlers_exports = {};
__export(api_handlers_exports, {
  TOOL_HANDLERS: () => TOOL_HANDLERS
});
import { default as axios } from "axios";
function ok(text) {
  return { content: [{ type: "text", text }] };
}
function err(message) {
  return { content: [{ type: "text", text: message }], isError: true };
}
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
var API_BASE, _mcpCtx, analyzeWallet, traceFunds, compareWallets, analyzeContract, detectSybilClusters, getPortfolio, getTransactions, lookupEntity, getGasPrices, getTokenInfo, TOOL_HANDLERS;
var init_api_handlers = __esm({
  "src/mcp/api-handlers.ts"() {
    init_mcpLogger();
    API_BASE = process.env.FUNDTRACER_API_URL || "https://api.fundtracer.xyz";
    _mcpCtx = null;
    analyzeWallet = async (args, ctx) => {
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
    traceFunds = async (args, ctx) => {
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
    compareWallets = async (args, ctx) => {
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
    analyzeContract = async (args, ctx) => {
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
    detectSybilClusters = async (args, ctx) => {
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
    getPortfolio = async (args, ctx) => {
      const { address, chainId } = args;
      try {
        const res = await api().get(`/api/portfolio/${address}`, {
          params: { chain: chainId }
        });
        return ok(JSON.stringify(res.data, null, 2));
      } catch (error) {
        const msg = error.response?.data?.error || error.message;
        return err(`Portfolio fetch failed: ${msg}`);
      }
    };
    getTransactions = async (args, ctx) => {
      const { address, chainId, limit = 50 } = args;
      try {
        const res = await api().post("/api/history", {
          wallet: address,
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
        const msg = error.response?.data?.error || error.message;
        return err(`Transaction fetch failed: ${msg}`);
      }
    };
    lookupEntity = async (args, ctx) => {
      const { query, chainId } = args;
      const chain = chainId || "ethereum";
      try {
        if (/^0x[a-fA-F0-9]{40}$/.test(query) || /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(query)) {
          const res2 = await api().get(`/api/entities/${query}`, {
            params: { chain }
          });
          return ok(JSON.stringify(res2.data, null, 2));
        }
        const res = await api().get("/api/entities/search", {
          params: { q: query, chain }
        });
        return ok(JSON.stringify(res.data, null, 2));
      } catch (error) {
        if (error.response?.status === 404) {
          return ok(JSON.stringify({ query, label: "Unknown address", chain }, null, 2));
        }
        const msg = error.response?.data?.error || error.message;
        return err(`Entity lookup failed: ${msg}`);
      }
    };
    getGasPrices = async (args, ctx) => {
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
    getTokenInfo = async (args, ctx) => {
      const { tokenAddress, chainId } = args;
      try {
        const res = await api().get("/api/market/coins", {
          params: { address: tokenAddress, chainId }
        });
        return ok(JSON.stringify(res.data, null, 2));
      } catch (error) {
        const msg = error.response?.data?.error || error.message;
        return err(`Token info fetch failed: ${msg}`);
      }
    };
    TOOL_HANDLERS = {
      analyze_wallet: withLogging("analyze_wallet", analyzeWallet),
      trace_funds: withLogging("trace_funds", traceFunds),
      compare_wallets: withLogging("compare_wallets", compareWallets),
      analyze_contract: withLogging("analyze_contract", analyzeContract),
      detect_sybil_clusters: withLogging("detect_sybil_clusters", detectSybilClusters),
      get_portfolio: withLogging("get_portfolio", getPortfolio),
      get_transactions: withLogging("get_transactions", getTransactions),
      lookup_entity: withLogging("lookup_entity", lookupEntity),
      get_gas_prices: withLogging("get_gas_prices", getGasPrices),
      get_token_info: withLogging("get_token_info", getTokenInfo)
    };
  }
});

// src/mcp/mcpAuth.ts
var mcpAuth_exports = {};
__export(mcpAuth_exports, {
  mcpApiKeyAuth: () => mcpApiKeyAuth,
  validateMcpApiKey: () => validateMcpApiKey
});
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
  const { default: fetch } = await import("node-fetch");
  const res = await fetch(`${API_URL}/api/mcp/validate`, {
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
async function mcpApiKeyAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "MCP API key required (Authorization: Bearer ft_mcp_<key>)" });
  }
  const rawKey = authHeader.slice(7).trim();
  if (!rawKey.startsWith("ft_")) {
    return res.status(401).json({ error: "Invalid MCP API key format" });
  }
  try {
    const ctx = await validateMcpApiKey(rawKey);
    req.mcpContext = ctx;
    next();
  } catch (err2) {
    return res.status(401).json({ error: err2.message });
  }
}
var init_mcpAuth = __esm({
  "src/mcp/mcpAuth.ts"() {
  }
});

// src/mcp/stdio.ts
import * as dotenv from "dotenv";
import { McpServer, StdioServerTransport, fromJsonSchema } from "@modelcontextprotocol/server";
dotenv.config();
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
  const { ALL_MCP_TOOLS: ALL_MCP_TOOLS2 } = await Promise.resolve().then(() => (init_tools(), tools_exports));
  const { TOOL_HANDLERS: TOOL_HANDLERS2 } = await Promise.resolve().then(() => (init_api_handlers(), api_handlers_exports));
  const { validateMcpApiKey: validateMcpApiKey2 } = await Promise.resolve().then(() => (init_mcpAuth(), mcpAuth_exports));
  const server = new McpServer({
    name: "FundTracer MCP",
    version: "1.0.0"
  });
  for (const toolDef of ALL_MCP_TOOLS2) {
    const handler = TOOL_HANDLERS2[toolDef.name];
    if (!handler) {
      console.error(`[MCP] No handler for tool: ${toolDef.name}`);
      continue;
    }
    server.registerTool(toolDef.name, {
      description: toolDef.description,
      inputSchema: fromJsonSchema(toolDef.inputSchema)
    }, async (args) => {
      const apiKey = process.env.FUNDTRACER_MCP_API_KEY;
      if (!apiKey) {
        return {
          content: [{ type: "text", text: "FUNDTRACER_MCP_API_KEY environment variable not set" }],
          isError: true
        };
      }
      let ctx;
      try {
        ctx = await validateMcpApiKey2(apiKey);
      } catch (err2) {
        return {
          content: [{ type: "text", text: `Authentication failed: ${err2.message}` }],
          isError: true
        };
      }
      return handler(args, ctx);
    });
    console.error(`[MCP] Registered tool: ${toolDef.name}`);
  }
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[MCP] FundTracer MCP server running on stdio");
}
main().catch((err2) => {
  console.error("[MCP] Fatal error:", err2);
  process.exit(1);
});
process.on("SIGINT", async () => {
  console.error("[MCP] Shutting down...");
  const { McpServer: McpServer2 } = await import("@modelcontextprotocol/server");
  process.exit(0);
});
process.on("SIGTERM", async () => {
  console.error("[MCP] Shutting down...");
  process.exit(0);
});
