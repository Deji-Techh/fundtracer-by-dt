import { Router } from 'express';
import { ALL_MCP_TOOLS } from './tools.js';
import { TOOL_HANDLERS } from './api-handlers.js';
import { mcpApiKeyAuth, validateMcpApiKey } from './mcpAuth.js';

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
 * POST /api/mcp/validate
 * Validate an MCP API key and return user info.
 * Used by stdio mode for HTTP-based key validation.
 * No mcpApiKeyAuth middleware — validates the key from the Authorization header.
 */
router.post('/validate', async (req: any, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'API key required' });
  }
  const rawKey = authHeader.slice(7).trim();
  if (!rawKey.startsWith('ft_')) {
    return res.status(401).json({ error: 'Invalid API key format' });
  }
  try {
    const ctx = await validateMcpApiKey(rawKey);
    res.json({ userId: ctx.userId, tier: ctx.tier });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
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
