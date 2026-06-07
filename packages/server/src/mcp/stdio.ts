#!/usr/bin/env node

/**
 * FundTracer MCP Server — stdio transport
 *
 * Run:
 *   FUNDTRACER_MCP_API_KEY=ft_mcp_xxx tsx src/mcp/stdio.ts
 *
 * All application logging MUST go to console.error (stdout is reserved for
 * JSON-RPC messages).
 */

import * as dotenv from 'dotenv';
dotenv.config();

// stdout is reserved for MCP JSON-RPC frames. Some shared server modules use
// console.log during initialization, so route all stdio server logs to stderr.
console.log = console.error.bind(console);
process.env.FUNDTRACER_MCP_DISABLE_LOGGING = process.env.FUNDTRACER_MCP_DISABLE_LOGGING || '1';

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createFundTracerMcpServer, resolveStdioMcpContext } from './server.js';

async function main() {
  // Bootstrap Firestore (needed for API key validation)
  let firebaseAvailable = false;
  try {
    const { initializeFirebase } = await import('../firebase.js');
    initializeFirebase();
    firebaseAvailable = true;
    console.error('[MCP] Firebase initialized');
  } catch (err) {
    console.error('[MCP] Firebase not available — key validation will fail. Set Firebase credentials in env.');
  }

  const server = createFundTracerMcpServer(resolveStdioMcpContext);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stdin.resume();
  console.error('[MCP] FundTracer MCP server running on stdio');
}

main().catch((err: any) => {
  console.error('[MCP] Fatal error:', err);
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.error('[MCP] Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('[MCP] Shutting down...');
  process.exit(0);
});
