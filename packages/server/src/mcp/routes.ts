import { Router } from 'express';
import { ALL_MCP_TOOLS } from './tools.js';
import { TOOL_HANDLERS } from './api-handlers.js';
import { mcpApiKeyAuth } from './mcpAuth.js';
import { logMcpRequest } from './mcpLogger.js';

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

  const start = Date.now();
  try {
    const result = await handler(req.body || {}, req.mcpContext);
    logMcpRequest({
      userId: req.mcpContext.userId,
      toolName,
      args: JSON.stringify(req.body).substring(0, 500),
      status: 'success',
      responsePreview: JSON.stringify(result).substring(0, 300),
      duration: Date.now() - start,
      createdAt: Date.now(),
      keyPrefix: req.mcpContext.apiKeyPrefix,
    });
    res.json(result);
  } catch (error: any) {
    logMcpRequest({
      userId: req.mcpContext.userId,
      toolName,
      args: JSON.stringify(req.body).substring(0, 500),
      status: 'error',
      responsePreview: error.message.substring(0, 300),
      duration: Date.now() - start,
      createdAt: Date.now(),
      keyPrefix: req.mcpContext.apiKeyPrefix,
    });
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
