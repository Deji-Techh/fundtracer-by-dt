import { Router } from 'express';
import { ALL_MCP_TOOLS } from './tools.js';
import { TOOL_HANDLERS } from './api-handlers.js';
import { mcpApiKeyAuth } from './mcpAuth.js';

const router = Router();

/**
 * GET /api/mcp/tools
 * List all available MCP tools (no auth required)
 */
router.get('/tools', (_req, res) => {
  const tools = ALL_MCP_TOOLS.map(t => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  }));
  res.json({ tools, count: tools.length });
});

/**
 * POST /api/mcp/tools/:toolName
 * Call a specific MCP tool (requires API key auth)
 * Note: Logging to mcpLogs is handled inside the tool handler wrapper in api-handlers.ts
 */
router.post('/tools/:toolName', mcpApiKeyAuth, async (req: any, res) => {
  const { toolName } = req.params;
  const handler = TOOL_HANDLERS[toolName];

  if (!handler) {
    return res.status(404).json({
      error: `Tool not found: ${toolName}`,
      availableTools: ALL_MCP_TOOLS.map(t => t.name),
    });
  }

  try {
    const result = await handler(req.body || {}, req.mcpContext);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      content: [{ type: 'text', text: `Internal error: ${error.message}` }],
      isError: true,
    });
  }
});


/**
 * GET /api/mcp/health
 * MCP server health check
 */
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    tools: ALL_MCP_TOOLS.length,
  });
});

export { router as mcpRoutes };
