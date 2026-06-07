import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ALL_MCP_TOOLS } from './tools.js';
import { TOOL_HANDLERS } from './api-handlers.js';
import { validateMcpApiKey } from './mcpAuth.js';
import type { McpContext } from './types.js';

type ContextResolver = (requestContext: any) => Promise<McpContext>;

export function createFundTracerMcpServer(resolveContext: ContextResolver, options: { logRegistrations?: boolean } = {}) {
  const logRegistrations = options.logRegistrations ?? true;
  const server = new McpServer({
    name: 'FundTracer MCP',
    version: '1.1.0',
  });

  for (const toolDef of ALL_MCP_TOOLS) {
    const handler = TOOL_HANDLERS[toolDef.name];
    if (!handler) {
      console.error(`[MCP] No handler for tool: ${toolDef.name}`);
      continue;
    }

    server.registerTool(toolDef.name, {
      description: toolDef.description,
      inputSchema: jsonSchemaObjectToZodShape(toolDef.inputSchema),
    }, async (args: any, requestContext: any) => {
      let ctx: McpContext;
      try {
        ctx = await resolveContext(requestContext);
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Authentication failed: ${err.message}` }],
          isError: true,
        };
      }

      return handler(args, ctx) as any;
    });

    if (logRegistrations) {
      console.error(`[MCP] Registered tool: ${toolDef.name}`);
    }
  }

  return server;
}

function jsonSchemaObjectToZodShape(schema: any) {
  const required = new Set<string>(Array.isArray(schema?.required) ? schema.required : []);
  const properties = schema?.properties || {};
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const [name, propertySchema] of Object.entries(properties)) {
    let field = jsonSchemaPropertyToZod(propertySchema as any);
    if (!required.has(name)) field = field.optional();
    shape[name] = field;
  }

  return shape;
}

function jsonSchemaPropertyToZod(schema: any): z.ZodTypeAny {
  let field: z.ZodTypeAny;

  if (Array.isArray(schema?.enum) && schema.enum.length > 0) {
    const values = schema.enum.filter((value: unknown): value is string => typeof value === 'string');
    field = values.length > 0
      ? z.enum(values as [string, ...string[]])
      : z.string();
  } else {
    switch (schema?.type) {
      case 'number':
      case 'integer':
        field = z.number();
        break;
      case 'boolean':
        field = z.boolean();
        break;
      case 'array':
        field = z.array(z.unknown());
        break;
      case 'object':
        field = z.record(z.unknown());
        break;
      case 'string':
      default:
        field = z.string();
        break;
    }
  }

  if (schema?.description && typeof field.describe === 'function') {
    field = field.describe(schema.description);
  }

  if (schema?.default !== undefined) {
    field = field.default(schema.default);
  }

  return field;
}

export async function resolveStdioMcpContext() {
  const apiKey = process.env.FUNDTRACER_MCP_API_KEY;
  if (!apiKey) {
    throw new Error('FUNDTRACER_MCP_API_KEY environment variable not set');
  }

  return validateMcpApiKey(apiKey);
}
