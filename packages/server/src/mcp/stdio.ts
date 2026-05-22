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

import { McpServer, StdioServerTransport, fromJsonSchema } from '@modelcontextprotocol/server';

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

  const { ALL_MCP_TOOLS } = await import('./tools.js');
  const { TOOL_HANDLERS } = await import('./handlers.js');
  const { validateMcpApiKey } = await import('./mcpAuth.js');

  const server = new McpServer({
    name: 'FundTracer MCP',
    version: '1.0.0',
  });

  for (const toolDef of ALL_MCP_TOOLS) {
    const handler = TOOL_HANDLERS[toolDef.name];
    if (!handler) {
      console.error(`[MCP] No handler for tool: ${toolDef.name}`);
      continue;
    }

    server.registerTool(toolDef.name, {
      description: toolDef.description,
      inputSchema: fromJsonSchema(toolDef.inputSchema),
    }, async (args: any) => {
      const apiKey = process.env.FUNDTRACER_MCP_API_KEY;
      if (!apiKey) {
        return {
          content: [{ type: 'text', text: 'FUNDTRACER_MCP_API_KEY environment variable not set' }],
          isError: true,
        };
      }

      let ctx;
      try {
        ctx = await validateMcpApiKey(apiKey);
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Authentication failed: ${err.message}` }],
          isError: true,
        };
      }

      return handler(args, ctx);
    });

    console.error(`[MCP] Registered tool: ${toolDef.name}`);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MCP] FundTracer MCP server running on stdio');
}

main().catch((err: any) => {
  console.error('[MCP] Fatal error:', err);
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.error('[MCP] Shutting down...');
  const { McpServer } = await import('@modelcontextprotocol/server');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('[MCP] Shutting down...');
  process.exit(0);
});
