/** Input schema for an MCP tool parameter */
export interface ToolParameter {
  type: string;
  description: string;
  enum?: string[];
  default?: unknown;
}

/** JSON Schema for MCP tool input */
export interface ToolInputSchema {
  type: 'object';
  properties: Record<string, ToolParameter>;
  required?: string[];
}

/** MCP tool definition (transport-agnostic) */
export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
}

/** Authenticated context passed to tool handlers */
export interface McpContext {
  userId: string;
  tier: string;
  apiKeyPrefix: string;
}

/** Result returned by a tool handler */
export interface McpToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

/** Tool handler signature */
export type McpToolHandler = (
  args: Record<string, unknown>,
  context: McpContext
) => Promise<McpToolResult>;
