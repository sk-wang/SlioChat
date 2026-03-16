/**
 * Agent Service - Core orchestration for Agent mode with tool calling
 * Inspired by OpenAI Codex SDK architecture
 * Supports Thread/Turn lifecycle and Item-based event system
 */

import type { Message } from '$lib/types';
import type {
  AgentEvent,
  Thread,
  Turn
} from '$lib/types/agent';
import type { ToolCall, ToolResult } from '$lib/types/tool';
import type { StreamResult } from './api';
import { toolRegistry } from '$lib/tools';
import { agentStore } from '$lib/stores/agent.svelte';
import { streamingStore } from '$lib/stores/streaming.svelte';
import { streamChatCompletionWithTools } from './api';
import { AGENT_SYSTEM_PROMPT } from '$lib/types/agent';

export interface AgentRunOptions {
  maxIterations?: number;
  threadId?: string;
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

class AgentService {
  private currentThread: Thread | null = null;
  private currentTurn: Turn | null = null;
  private currentMessages: Message[] = [];
  private currentSystemPrompt: string = '';

  /**
   * Run agent conversation with tool calling loop
   * Yields events following Codex SDK event system
   */
  async *runAgentConversation(
    messages: Message[],
    systemPrompt: string = '',
    options: AgentRunOptions = {}
  ): AsyncGenerator<AgentEvent, void, unknown> {
    const maxIterations = options.maxIterations || agentStore.maxIterations;
    let iteration = 0;
    this.currentMessages = [...messages];
    this.currentSystemPrompt = systemPrompt;

    // Initialize thread
    const threadId = options.threadId || generateId();
    this.currentThread = {
      id: threadId,
      conversationId: '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    agentStore.startProcessing();

    // Emit start event (legacy)
    yield { type: 'start' };

    // Combine custom system prompt with agent system prompt
    const fullSystemPrompt = systemPrompt
      ? `${systemPrompt}\n\n${AGENT_SYSTEM_PROMPT}`
      : AGENT_SYSTEM_PROMPT;

    // Get available tools
    const tools = toolRegistry.getDefinitions();

    while (iteration < maxIterations) {
      iteration++;
      const turnId = generateId();

      // Initialize turn
      this.currentTurn = {
        id: turnId,
        threadId,
        status: 'in_progress',
        startedAt: Date.now()
      };

      console.log(`[Agent] Starting turn ${iteration}/${maxIterations}`);

      try {
        // Collect streaming data
        let accumulatedThinking = '';
        let accumulatedContent = '';

        // Stream LLM response with tools
        const result = await streamChatCompletionWithTools(
          this.currentMessages,
          fullSystemPrompt,
          tools,
          {
            onThinking: (thinking) => {
              accumulatedThinking += thinking;
            },
            onContent: (content) => {
              accumulatedContent += content;
            },
            onToolCalls: (_calls) => {
              // Tool calls handled after streaming
            }
          }
        );

        // Emit thinking event if there was thinking
        if (accumulatedThinking) {
          yield { type: 'thinking', content: accumulatedThinking };
        }

        // Handle null result (aborted)
        if (!result) {
          yield { type: 'error', message: 'Generation was stopped' };
          agentStore.stopProcessing();
          return;
        }

        // Emit content event
        if (result.content || accumulatedContent) {
          yield { type: 'content', content: result.content || accumulatedContent };
        }

        // Check for tool calls
        if (result.toolCalls && result.toolCalls.length > 0) {
          console.log(`[Agent] Tool calls found:`, result.toolCalls.map((t: ToolCall) => t.function.name));

          // Emit tool_calls event (legacy)
          yield { type: 'tool_calls', calls: result.toolCalls };

          // Process each tool call
          for (const call of result.toolCalls) {
            agentStore.addToolCalls([call]);

            try {
              console.log(`[Agent] Executing tool: ${call.function.name}`);
              const toolResult = await this.executeToolCall(call);
              console.log(`[Agent] Tool result:`, toolResult.status);

              agentStore.addToolResult(call.id, toolResult);

              // Emit tool_result event (legacy)
              yield { type: 'tool_result', call, result: toolResult };
            } catch (toolError) {
              console.error(`[Agent] Tool execution error:`, toolError);
              const errorResult: ToolResult = {
                tool_call_id: call.id,
                role: 'tool',
                content: `Error: ${toolError instanceof Error ? toolError.message : String(toolError)}`,
                status: 'error'
              };
              agentStore.addToolResult(call.id, errorResult);

              // Emit tool_result event (legacy)
              yield { type: 'tool_result', call, result: errorResult };
            }
          }

          // Add assistant message with tool calls
          this.currentMessages.push({
            role: 'assistant',
            content: result.content || '',
            toolCalls: result.toolCalls
          });

          // Add tool results to messages
          for (const call of result.toolCalls) {
            const toolResult = agentStore.getToolResult(call.id);
            if (toolResult) {
              this.currentMessages.push({
                role: 'tool',
                content: toolResult.content,
                toolCallId: toolResult.tool_call_id
              });
            }
          }

          console.log(`[Agent] After tool execution, messages count:`, this.currentMessages.length);

          // Emit messages_updated event (legacy)
          yield { type: 'messages_updated', messages: [...this.currentMessages] };
        } else {
          // No tool calls - this is the final response
          console.log(`[Agent] No more tool calls, returning final response`);

          // Emit final_response event (legacy)
          yield { type: 'final_response', content: result.content || accumulatedContent };

          agentStore.stopProcessing();
          streamingStore.stop();
          return;
        }
      } catch (error) {
        console.error('[Agent] Error in turn:', error);
        console.error('[Agent] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
        const errorMessage = error instanceof Error ? error.message : String(error);
        yield { type: 'error', message: errorMessage };
        agentStore.setError(errorMessage);
        streamingStore.stop();
        return;
      }
    }

    // Max iterations reached
    console.log(`[Agent] Max iterations (${maxIterations}) reached`);
    yield { type: 'max_iterations', iterations: maxIterations };
    agentStore.stopProcessing();
    streamingStore.stop();
  }

  /**
   * Execute a single tool call
   */
  private async executeToolCall(call: ToolCall): Promise<ToolResult> {
    return toolRegistry.executeToolCall(call);
  }

  /**
   * Get current thread info
   */
  getThread(): Thread | null {
    return this.currentThread;
  }

  /**
   * Get current turn info
   */
  getTurn(): Turn | null {
    return this.currentTurn;
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use runAgentConversation instead
   */
  async runWithCallbacks(
    messages: Message[],
    callbacks: {
      onThinking?: (content: string) => void;
      onContent?: (content: string) => void;
      onToolCalls?: (calls: ToolCall[]) => void;
      onToolExecuting?: (call: ToolCall) => void;
      onToolResult?: (call: ToolCall, result: ToolResult) => void;
      onError?: (error: string) => void;
    },
    systemPrompt?: string,
    options?: AgentRunOptions
  ): Promise<void> {
    for await (const event of this.runAgentConversation(messages, systemPrompt, options)) {
      switch (event.type) {
        case 'thinking':
          callbacks.onThinking?.(event.content);
          break;
        case 'content':
          callbacks.onContent?.(event.content);
          break;
        case 'tool_calls':
          callbacks.onToolCalls?.(event.calls);
          break;
        case 'tool_result':
          callbacks.onToolResult?.(event.call, event.result);
          break;
        case 'error':
          callbacks.onError?.(event.message);
          break;
      }
    }
  }
}

// Global agent service instance
export const agentService = new AgentService();
