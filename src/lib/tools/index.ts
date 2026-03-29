/**
 * Tool Registry - Central management for all agent tools
 * Inspired by Codex ToolRegistry and Orchestrator patterns
 */

import type { ToolDefinition, ToolExecutor, ToolCall, ToolResult } from '$lib/types/tool';
import { fileTools } from './fileTools';
import { webTools } from './webTools';
import { sandboxTools } from './sandboxTools';
import { searchTools } from './searchTools';
import { planTools } from './planTools';
import { luaTools } from './luaTools';
import { commandTools } from './commandTools';

/**
 * Exponential backoff delay calculation
 * @param attempt Current attempt number (0-indexed)
 * @param baseDelay Base delay in milliseconds
 * @returns Delay in milliseconds
 */
function calculateBackoff(attempt: number, baseDelay: number = 1000): number {
  return Math.min(baseDelay * Math.pow(2, attempt), 10000);
}

class ToolRegistry {
  private tools: Map<string, ToolExecutor> = new Map();
  private initialized = false;

  /**
   * Register a tool executor
   */
  register(executor: ToolExecutor): void {
    if (this.tools.has(executor.name)) {
      console.warn(`Tool "${executor.name}" is already registered, overwriting.`);
    }
    this.tools.set(executor.name, executor);
  }

  /**
   * Unregister a tool by name
   */
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Get a tool executor by name
   */
  get(name: string): ToolExecutor | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Check if a tool is mutating (modifies environment)
   */
  isMutating(name: string): boolean {
    const executor = this.tools.get(name);
    return executor?.isMutating ?? false;
  }

  /**
   * Get all registered tool executors
   */
  getAll(): ToolExecutor[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get all tool definitions for API calls
   */
  getDefinitions(): ToolDefinition[] {
    return this.getAll().map(t => t.definition);
  }

  /**
   * Execute a tool call with retry support
   * Inspired by Codex orchestrator pattern
   */
  async executeToolCall(call: ToolCall): Promise<ToolResult> {
    const executor = this.tools.get(call.function.name);

    if (!executor) {
      return {
        tool_call_id: call.id,
        role: 'tool',
        content: `Error: Unknown tool '${call.function.name}'`,
        status: 'error'
      };
    }

    const startTime = Date.now();
    const maxRetries = executor.maxRetries ?? 0;
    let lastError: Error | null = null;

    // Try execution with optional retry
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const args = JSON.parse(call.function.arguments);
        const timeout = executor.timeout || 60000;

        // Execute with timeout
        const result = await Promise.race([
          executor.execute(args),
          new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error('Tool execution timeout')), timeout)
          )
        ]);

        return {
          tool_call_id: call.id,
          role: 'tool',
          content: result,
          status: 'success',
          executionTime: Date.now() - startTime
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on certain errors
        if (lastError.message.includes('timeout') || lastError.message.includes('Unknown tool')) {
          break;
        }

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          const delay = calculateBackoff(attempt);
          console.log(`[ToolRegistry] Retrying ${call.function.name} in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    return {
      tool_call_id: call.id,
      role: 'tool',
      content: `Error: ${lastError?.message || 'Unknown error'}`,
      status: 'error',
      executionTime: Date.now() - startTime
    };
  }

  /**
   * Execute multiple tool calls in parallel
   */
  async executeToolCalls(calls: ToolCall[]): Promise<ToolResult[]> {
    return Promise.all(calls.map(call => this.executeToolCall(call)));
  }

  /**
   * Clear all registered tools
   */
  clear(): void {
    this.tools.clear();
  }

  /**
   * Get tool names
   */
  getNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Initialize default tools
   */
  initializeDefaults(): void {
    if (this.initialized) return;

    // Register file tools (read-only)
    for (const tool of fileTools) {
      this.register({ ...tool, isMutating: false });
    }

    // Register web tools (read-only)
    for (const tool of webTools) {
      this.register({ ...tool, isMutating: false });
    }

    // Register sandbox tools
    // Write/delete operations are mutating, read/list are not
    for (const tool of sandboxTools) {
      const isMutating = ['fs_write', 'fs_delete', 'fs_mkdir'].includes(tool.name);
      this.register({ ...tool, isMutating });
    }

    // Register search tools (read-only)
    for (const tool of searchTools) {
      this.register({ ...tool, isMutating: false });
    }

    // Register plan tools (read-only, in-memory state)
    for (const tool of planTools) {
      this.register({ ...tool, isMutating: false });
    }

    // Register Lua tools
    // run_lua can be mutating if Lua code writes to VFS
    for (const tool of luaTools) {
      const isMutating = tool.name === 'run_lua';
      this.register({ ...tool, isMutating });
    }

    // Register command tools (shell-like commands)
    // Most are mutating as they can modify the VFS
    for (const tool of commandTools) {
      this.register({ ...tool });
    }

    this.initialized = true;
  }
}

// Global tool registry instance
export const toolRegistry = new ToolRegistry();

// Initialize default tools
toolRegistry.initializeDefaults();

// Re-export types and tools
export type { ToolExecutor, ToolDefinition, ToolCall, ToolResult };
export { fileTools, webTools, sandboxTools, commandTools };
