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
      console.log(`[Agent] Starting iteration ${iteration}/${maxIterations}`);

      // Yield start event for first iteration
      if (iteration === 1) {
        yield { type: 'start' };
      }

      try {
        // Stream LLM response with tools
        // Use a queue to handle streaming events from callbacks
        const eventQueue: AgentEvent[] = [];
        let streamResult: { thinking: string; content: string; toolCalls?: ToolCall[] } | null | undefined = undefined;

        // Create a promise that resolves when streaming is complete
        let resolveStreamComplete: () => void;
        const streamCompletePromise = new Promise<void>((resolve) => {
          resolveStreamComplete = resolve;
        });

        streamChatCompletionWithTools(
          currentMessages,
          fullSystemPrompt,
          tools,
          {
            onThinking: (thinking) => {
              eventQueue.push({ type: 'thinking', content: thinking });
            },
            onContent: (content) => {
              eventQueue.push({ type: 'content', content: content });
            },
            onToolCalls: (calls) => {
              // Store tool calls in a temporary variable
            }
          }
        ).then((result) => {
          streamResult = result;
          resolveStreamComplete!();
        }).catch((err) => {
          eventQueue.push({ type: 'error', error: err.message });
          streamResult = null;
          resolveStreamComplete!();
        });

        // Process events as they come in
        let isStreamComplete = false;
        while (!isStreamComplete || eventQueue.length > 0) {
          // Check if stream is complete (undefined means not done yet)
          if (streamResult !== undefined) {
            isStreamComplete = true;
          }

          // Process all queued events
          while (eventQueue.length > 0) {
            const event = eventQueue.shift()!;
            yield event;
          }

          // If not complete, wait a bit and check again
          if (!isStreamComplete) {
            await Promise.race([
              streamCompletePromise,
              new Promise((r) => setTimeout(r, 10))
            ]);
          }
        }

        const result = streamResult;

        if (!result) {
          // Stream was aborted
          yield { type: 'error', error: 'Generation was stopped' };
          agentStore.stopProcessing();
          return;
        }

        // Check for tool calls
        console.log(`[Agent] Iteration ${iteration}: toolCalls=`, result.toolCalls?.length || 0);
        if (result.toolCalls && result.toolCalls.length > 0) {
          // Yield tool calls event
          console.log(`[Agent] Executing ${result.toolCalls.length} tool calls`);
          yield { type: 'tool_calls', calls: result.toolCalls };
          agentStore.addToolCalls(result.toolCalls);

          // Store pending tool calls
          this.pendingToolCalls = result.toolCalls;

          // Check if YOLO mode or need confirmation
          if (agentStore.yoloMode) {
            // YOLO mode - auto-execute all tools
            for (const call of result.toolCalls) {
              yield { type: 'tool_executing', call };
              console.log(`[Agent] Executing tool: ${call.function.name}`);

              try {
                const toolResult = await this.executeToolCall(call);
                console.log(`[Agent] Tool result:`, toolResult.status, toolResult.content?.substring(0, 100));
                yield { type: 'tool_result', call, result: toolResult };
                agentStore.addToolResult(call.id, toolResult);
              } catch (toolError) {
                console.error(`[Agent] Tool execution error:`, toolError);
                const errorResult: ToolResult = {
                  tool_call_id: call.id,
                  role: 'tool',
                  content: `Error: ${toolError instanceof Error ? toolError.message : String(toolError)}`,
                  status: 'error'
                };
                yield { type: 'tool_result', call, result: errorResult };
                agentStore.addToolResult(call.id, errorResult);
              }
            }

            // Add assistant message with tool calls
            currentMessages.push({
              role: 'assistant',
              content: result.content || null,
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

            console.log(`[Agent] After tool execution, currentMessages count:`, currentMessages.length);
            // Notify that messages have been updated
            yield { type: 'messages_updated', messages: [...currentMessages] };
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
              console.log(`[Agent] Executing tool (confirmation mode): ${call.function.name}`);

              try {
                const toolResult = await this.executeToolCall(call);
                console.log(`[Agent] Tool result:`, toolResult.status, toolResult.content?.substring(0, 100));
                yield { type: 'tool_result', call, result: toolResult };
                agentStore.addToolResult(call.id, toolResult);
              } catch (toolError) {
                console.error(`[Agent] Tool execution error:`, toolError);
                const errorResult: ToolResult = {
                  tool_call_id: call.id,
                  role: 'tool',
                  content: `Error: ${toolError instanceof Error ? toolError.message : String(toolError)}`,
                  status: 'error'
                };
                yield { type: 'tool_result', call, result: errorResult };
                agentStore.addToolResult(call.id, errorResult);
              }
            }

            // Add assistant message with tool calls
            currentMessages.push({
              role: 'assistant',
              content: result.content || null,
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

            console.log(`[Agent] After tool execution (confirmation mode), currentMessages count:`, currentMessages.length);
            // Notify that messages have been updated
            yield { type: 'messages_updated', messages: [...currentMessages] };
          }
        } else {
          // No tool calls - this is the final response
          console.log(`[Agent] Iteration ${iteration}: No more tool calls, returning final response`);
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
    console.log(`[Agent] Max iterations (${maxIterations}) reached`);
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
