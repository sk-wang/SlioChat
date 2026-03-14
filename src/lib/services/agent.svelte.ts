/**
 * Agent Service - Core orchestration for Agent mode with tool calling
 * Supports YOLO mode (auto-execute) and human confirmation mode
 */

import type { Message } from '$lib/types';
import type { AgentEvent, AgentCallbacks } from '$lib/types/agent';
import type { ToolCall, ToolResult } from '$lib/types/tool';
import { toolRegistry } from '$lib/tools';
import { agentStore } from '$lib/stores/agent.svelte';
import { streamChatCompletionWithTools } from './api';
import { AGENT_SYSTEM_PROMPT } from '$lib/types/agent';

export interface AgentRunOptions {
  maxIterations?: number;
  onEvent?: (event: AgentEvent) => void;
}

class AgentService {
  private currentMessages: Message[] = [];
  private currentSystemPrompt = '';
  private pendingToolCalls: ToolCall[] = [];
  private resolveToolExecution: ((approved: boolean) => void) | null = null;

  /**
   * Run agent conversation with tool calling loop
   */
  async *runAgentConversation(
    messages: Message[],
    systemPrompt: string = '',
    options: AgentRunOptions = {}
  ): AsyncGenerator<AgentEvent, void, unknown> {
    const maxIterations = options.maxIterations || agentStore.maxIterations;
    let iteration = 0;
    let currentMessages = [...messages];

    // Store for tool confirmation
    this.currentMessages = currentMessages;
    this.currentSystemPrompt = systemPrompt;

    agentStore.startProcessing();

    // Combine custom system prompt with agent system prompt
    const fullSystemPrompt = systemPrompt
      ? `${systemPrompt}\n\n${AGENT_SYSTEM_PROMPT}`
      : AGENT_SYSTEM_PROMPT;

    // Get available tools
    const tools = toolRegistry.getDefinitions();

    while (iteration < maxIterations) {
      iteration++;

      // Yield start event for first iteration
      if (iteration === 1) {
        yield { type: 'start' };
      }

      try {
        // Stream LLM response with tools
        const result = await streamChatCompletionWithTools(
          currentMessages,
          fullSystemPrompt,
          tools
        );

        if (!result) {
          // Stream was aborted
          yield { type: 'error', error: 'Generation was stopped' };
          agentStore.stopProcessing();
          return;
        }

        // Handle thinking content
        if (result.thinking) {
          yield { type: 'thinking', content: result.thinking };
        }

        // Handle content
        if (result.content) {
          yield { type: 'content', content: result.content };
        }

        // Check for tool calls
        if (result.toolCalls && result.toolCalls.length > 0) {
          // Yield tool calls event
          yield { type: 'tool_calls', calls: result.toolCalls };
          agentStore.addToolCalls(result.toolCalls);

          // Store pending tool calls
          this.pendingToolCalls = result.toolCalls;

          // Check if YOLO mode or need confirmation
          if (agentStore.yoloMode) {
            // YOLO mode - auto-execute all tools
            for (const call of result.toolCalls) {
              yield { type: 'tool_executing', call };

              const toolResult = await this.executeToolCall(call);

              yield { type: 'tool_result', call, result: toolResult };
              agentStore.addToolResult(call.id, toolResult);
            }

            // Add assistant message with tool calls
            currentMessages.push({
              role: 'assistant',
              content: result.content || '',
              toolCalls: result.toolCalls
            });

            // Add tool results to messages
            for (const call of result.toolCalls) {
              const toolResult = agentStore.getToolResult(call.id);
              if (toolResult) {
                currentMessages.push({
                  role: 'tool',
                  content: toolResult.content,
                  toolCallId: toolResult.tool_call_id
                });
              }
            }
          } else {
            // Human confirmation mode - add pending confirmations
            for (const call of result.toolCalls) {
              try {
                const args = JSON.parse(call.function.arguments);
                agentStore.addPendingConfirmation(call, args);
              } catch {
                agentStore.addPendingConfirmation(call, {});
              }
            }

            // Yield waiting for confirmation
            yield { type: 'tool_confirmation_required', calls: result.toolCalls };

            // Wait for user confirmation (this is handled by resumeWithConfirmation)
            // The generator will pause here until confirmation is provided
            const approved = await this.waitForConfirmation();

            if (!approved) {
              // User rejected - add rejection as tool result
              yield { type: 'tool_rejected', calls: result.toolCalls };
              agentStore.stopProcessing();
              return;
            }

            // User approved - execute tools
            for (const call of result.toolCalls) {
              if (!agentStore.isToolCallConfirmed(call.id)) {
                continue; // Skip rejected tools
              }

              yield { type: 'tool_executing', call };

              const toolResult = await this.executeToolCall(call);

              yield { type: 'tool_result', call, result: toolResult };
              agentStore.addToolResult(call.id, toolResult);
            }

            // Add assistant message with tool calls
            currentMessages.push({
              role: 'assistant',
              content: result.content || '',
              toolCalls: result.toolCalls
            });

            // Add tool results to messages
            for (const call of result.toolCalls) {
              const toolResult = agentStore.getToolResult(call.id);
              if (toolResult) {
                currentMessages.push({
                  role: 'tool',
                  content: toolResult.content,
                  toolCallId: toolResult.tool_call_id
                });
              }
            }

            // Clear confirmations for next iteration
            agentStore.clearConfirmations();
          }
        } else {
          // No tool calls - this is the final response
          yield { type: 'final_response', content: result.content };
          agentStore.stopProcessing();
          return;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        yield { type: 'error', error: errorMessage };
        agentStore.setError(errorMessage);
        return;
      }
    }

    // Max iterations reached
    yield { type: 'max_iterations' };
    agentStore.stopProcessing();
  }

  /**
   * Wait for user confirmation
   */
  private waitForConfirmation(): Promise<boolean> {
    return new Promise((resolve) => {
      this.resolveToolExecution = resolve;
    });
  }

  /**
   * Resume agent after user confirms or rejects tools
   */
  resumeWithConfirmation(approved: boolean): void {
    if (this.resolveToolExecution) {
      this.resolveToolExecution(approved);
      this.resolveToolExecution = null;
    }
  }

  /**
   * Approve a specific tool call
   */
  approveToolCall(callId: string): void {
    agentStore.approveToolCall(callId);
  }

  /**
   * Reject a specific tool call
   */
  rejectToolCall(callId: string): void {
    agentStore.rejectToolCall(callId);
  }

  /**
   * Approve all pending tool calls
   */
  approveAllToolCalls(): void {
    agentStore.approveAllPending();
  }

  /**
   * Reject all pending tool calls
   */
  rejectAllToolCalls(): void {
    agentStore.rejectAllPending();
  }

  /**
   * Execute a single tool call
   */
  private async executeToolCall(call: ToolCall): Promise<ToolResult> {
    return toolRegistry.executeToolCall(call);
  }

  /**
   * Run agent with callbacks instead of generator
   */
  async runWithCallbacks(
    messages: Message[],
    callbacks: AgentCallbacks,
    systemPrompt?: string,
    options?: AgentRunOptions
  ): Promise<void> {
    for await (const event of this.runAgentConversation(messages, systemPrompt, options)) {
      switch (event.type) {
        case 'thinking':
          callbacks.onThinking?.(event.content || '');
          break;
        case 'content':
          callbacks.onContent?.(event.content || '');
          break;
        case 'tool_calls':
          callbacks.onToolCalls?.(event.calls || []);
          break;
        case 'tool_executing':
          callbacks.onToolExecuting?.(event.call!);
          break;
        case 'tool_result':
          callbacks.onToolResult?.(event.call!, event.result!);
          break;
        case 'error':
          callbacks.onError?.(event.error || 'Unknown error');
          break;
      }
    }
  }
}

// Global agent service instance
export const agentService = new AgentService();
