/**
 * Tool Registry - Central management for all agent tools
 */

import type { ToolDefinition, ToolExecutor, ToolCall, ToolResult } from '$lib/types/tool';
import { fileTools } from './fileTools';
import { webTools } from './webTools';
import { sandboxTools } from './sandboxTools';

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
   * Execute a tool call
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
      return {
        tool_call_id: call.id,
        role: 'tool',
        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
        status: 'error',
        executionTime: Date.now() - startTime
      };
    }
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

    // Register file tools
    for (const tool of fileTools) {
      this.register(tool);
    }

    // Register web tools
    for (const tool of webTools) {
      this.register(tool);
    }

    // Register sandbox tools (file system operations)
    for (const tool of sandboxTools) {
      this.register(tool);
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
export { fileTools, webTools, sandboxTools };
