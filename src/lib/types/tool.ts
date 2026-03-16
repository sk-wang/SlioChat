/**
 * Tool type definitions for Agent mode
 */

export type ToolParameterType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';

export interface ToolParameter {
  type: ToolParameterType;
  description: string;
  enum?: string[];
  items?: ToolParameter;
  properties?: Record<string, ToolParameter>;
  required?: string[];
  default?: unknown;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ToolParameter>;
    required: string[];
  };
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolResult {
  tool_call_id: string;
  role: 'tool';
  content: string;
  status: 'success' | 'error';
  executionTime?: number;
}

/**
 * Tool executor interface
 * Inspired by Codex ToolHandler design
 */
export interface ToolExecutor {
  name: string;
  definition: ToolDefinition;
  execute(args: Record<string, unknown>): Promise<string>;
  /**
   * Whether this tool mutates the environment (writes files, etc.)
   * Used for approval and logging decisions
   */
  isMutating?: boolean;
  /**
   * Whether this tool requires sandbox isolation
   */
  requiresSandbox?: boolean;
  /**
   * Execution timeout in milliseconds
   */
  timeout?: number;
  /**
   * Maximum retry attempts on failure
   */
  maxRetries?: number;
}

/**
 * Format tool definitions for OpenAI-compatible API
 */
export function formatToolsForAPI(tools: ToolDefinition[]): Array<{
  type: 'function';
  function: ToolDefinition;
}> {
  return tools.map(tool => ({
    type: 'function' as const,
    function: tool
  }));
}

/**
 * Parse tool call arguments safely
 */
export function parseToolArgs(argsString: string): Record<string, unknown> {
  try {
    return JSON.parse(argsString);
  } catch {
    return {};
  }
}
