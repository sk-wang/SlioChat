/**
 * Agent Service - Core orchestration for Agent mode with tool calling
 * Inspired by OpenAI Codex SDK architecture
 * Supports Thread/Turn lifecycle and Item-based event system
 */

import type { Message } from '$lib/types';
import type {
  AgentEvent,
  ThreadItem,
  AgentMessageItem,
  ReasoningItem,
  ToolCallItem,
  Turn,
  Usage,
  Thread,
  ItemStatus
} from '$lib/types/agent';
import type { ToolCall, ToolResult } from '$lib/types/tool';
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
  private currentItems: Map<string, ThreadItem> = new Map();
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
      conversationId: messages[0]?.conversationId || '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    agentStore.startProcessing();

    // Yield thread started event
    yield { type: 'thread.started', threadId };

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

      // Yield turn started event
      yield { type: 'turn.started', turnId };
      console.log(`[Agent] Starting turn ${iteration}/${maxIterations}`);

      try {
        // Stream LLM response with tools
        let streamResult: { thinking: string; content: string; toolCalls?: ToolCall[]; usage?: Usage } | null = null;
        const eventQueue: AgentEvent[] = [];

        let resolveStreamComplete: () => void;
        const streamCompletePromise = new Promise<void>((resolve) => {
          resolveStreamComplete = resolve;
        });

        // Create streaming items for tracking
        let reasoningItem: ReasoningItem | null = null;
        let messageItem: AgentMessageItem | null = null;
        const toolCallItems: Map<string, ToolCallItem> = new Map();

        streamChatCompletionWithTools(
          this.currentMessages,
          fullSystemPrompt,
          tools,
          {
            onThinking: (thinking) => {
              // Create or update reasoning item
              if (!reasoningItem) {
                reasoningItem = {
                  id: generateId(),
                  type: 'reasoning',
                  status: 'in_progress',
                  text: ''
                };
                eventQueue.push({ type: 'item.started', item: reasoningItem });
              }
              reasoningItem.text += thinking;
              eventQueue.push({ type: 'thinking.stream', delta: thinking });
            },
            onContent: (content) => {
              // Create or update message item
              if (!messageItem) {
                messageItem = {
                  id: generateId(),
                  type: 'agent_message',
                  status: 'in_progress',
                  text: ''
                };
                eventQueue.push({ type: 'item.started', item: messageItem });
              }
              messageItem.text += content;
              eventQueue.push({ type: 'content.stream', delta: content });
            },
            onToolCalls: (calls) => {
              // Tool calls are handled after streaming completes
            }
          }
        ).then((result) => {
          streamResult = result ? {
            thinking: result.thinking,
            content: result.content,
            toolCalls: result.toolCalls,
            usage: result.usage ? {
              inputTokens: result.usage.input_tokens || 0,
              cachedInputTokens: result.usage.cached_input_tokens || 0,
              outputTokens: result.usage.output_tokens || 0
            } : undefined
          } : null;
          resolveStreamComplete!();
        }).catch((err) => {
          eventQueue.push({ type: 'error', message: err.message });
          streamResult = null;
          resolveStreamComplete!();
        });

        // Process events as they come in
        let isStreamComplete = false;
        while (!isStreamComplete || eventQueue.length > 0) {
          if (streamResult !== undefined) {
            isStreamComplete = true;
          }

          while (eventQueue.length > 0) {
            const event = eventQueue.shift()!;
            yield event;
          }

          if (!isStreamComplete) {
            await Promise.race([
              streamCompletePromise,
              new Promise((r) => setTimeout(r, 10))
            ]);
          }
        }

        const result = streamResult;

        // Complete reasoning item
        if (reasoningItem) {
          reasoningItem.status = 'completed';
          yield { type: 'item.completed', item: reasoningItem };
        }

        if (!result) {
          // Stream was aborted
          yield { type: 'error', message: 'Generation was stopped' };
          yield { type: 'turn.failed', turnId, error: 'Generation was stopped' };
          agentStore.stopProcessing();
          return;
        }

        // Check for tool calls
        if (result.toolCalls && result.toolCalls.length > 0) {
          console.log(`[Agent] Tool calls found:`, result.toolCalls.map(t => t.function.name));

          // Complete message item if exists
          if (messageItem) {
            messageItem.status = 'completed';
            yield { type: 'item.completed', item: messageItem };
          }

          // Process each tool call
          for (const call of result.toolCalls) {
            const toolCallItem: ToolCallItem = {
              id: generateId(),
              type: 'tool_call',
              status: 'in_progress',
              call
            };

            // Yield tool call started
            yield { type: 'item.started', item: toolCallItem };
            agentStore.addToolCalls([call]);

            try {
              console.log(`[Agent] Executing tool: ${call.function.name}`);
              const toolResult = await this.executeToolCall(call);
              console.log(`[Agent] Tool result:`, toolResult.status);

              // Update item with result
              toolCallItem.status = 'completed';
              toolCallItem.result = toolResult;
              yield { type: 'item.completed', item: toolCallItem };
              agentStore.addToolResult(call.id, toolResult);
            } catch (toolError) {
              console.error(`[Agent] Tool execution error:`, toolError);
              const errorResult: ToolResult = {
                tool_call_id: call.id,
                role: 'tool',
                content: `Error: ${toolError instanceof Error ? toolError.message : String(toolError)}`,
                status: 'error'
              };
              toolCallItem.status = 'failed';
              toolCallItem.result = errorResult;
              yield { type: 'item.completed', item: toolCallItem };
              agentStore.addToolResult(call.id, errorResult);
            }
          }

          // Add assistant message with tool calls
          this.currentMessages.push({
            role: 'assistant',
            content: result.content || null,
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

          // Complete turn and continue to next iteration
          const usage = result.usage || { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0 };
          yield { type: 'turn.completed', turnId, usage };
        } else {
          // No tool calls - this is the final response
          console.log(`[Agent] No more tool calls, returning final response`);

          // Complete message item
          if (messageItem) {
            messageItem.status = 'completed';
            yield { type: 'item.completed', item: messageItem };
          }

          const usage = result.usage || { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0 };
          yield { type: 'turn.completed', turnId, usage };

          agentStore.stopProcessing();
          streamingStore.stop();
          return;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        yield { type: 'error', message: errorMessage };
        yield { type: 'turn.failed', turnId, error: errorMessage };
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
        case 'thinking.stream':
          callbacks.onThinking?.(event.delta);
          break;
        case 'content.stream':
          callbacks.onContent?.(event.delta);
          break;
        case 'item.started':
        case 'item.completed':
          if (event.item.type === 'tool_call') {
            if (event.item.status === 'in_progress') {
              callbacks.onToolExecuting?.(event.item.call);
            } else if (event.item.result) {
              callbacks.onToolResult?.(event.item.call, event.item.result);
            }
          }
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
