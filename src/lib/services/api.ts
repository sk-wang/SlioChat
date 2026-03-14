import { settingsStore } from '$lib/stores/settings.svelte';
import { streamingStore } from '$lib/stores/streaming.svelte';
import type { Message } from '$lib/types';
import type { ToolDefinition, ToolCall } from '$lib/types/tool';

export interface StreamResult {
  thinking: string;
  content: string;
  type: 'thinking' | 'normal';
  toolCalls?: ToolCall[];
}

export interface ModelInfo {
  id: string;
  object: string;
  owned_by?: string;
}

export interface ModelsResponse {
  data: ModelInfo[];
  object: string;
}

export async function fetchModelList(url: string, apiKey: string): Promise<ModelInfo[]> {
  try {
    // Derive models URL from chat completions URL
    const baseUrl = url.replace('/chat/completions', '');
    const modelsUrl = `${baseUrl}/models`;

    const response = await fetch(modelsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey || 'none'}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data: ModelsResponse = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching models:', error);
    return [];
  }
}

export interface StreamCallbacks {
  onThinking?: (content: string) => void;
  onContent?: (content: string) => void;
  onFirstToken?: () => void;
  onToolCalls?: (calls: ToolCall[]) => void;
}

export async function streamChatCompletion(
  messages: Message[],
  systemPrompt: string,
  callbacks?: StreamCallbacks
): Promise<StreamResult | null> {
  const modelId = settingsStore.selectedModel;
  const modelConfig = settingsStore.currentModelConfig;

  if (!modelConfig) {
    throw new Error('Model not configured');
  }

  streamingStore.start();

  try {
    const requestMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const response = await fetch(modelConfig.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + (modelConfig.key || settingsStore.config.defaultKey),
        'X-DashScope-SSE': 'enable',
      },
      signal: streamingStore.getSignal(),
      body: JSON.stringify({
        model: modelConfig.name,
        messages: requestMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error('Request failed: ' + response.status + ' ' + errorText);
    }

    return await parseSSEStream(response, callbacks);
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return null;
    }
    throw error;
  } finally {
    streamingStore.stop();
  }
}

async function parseSSEStream(
  response: Response,
  callbacks?: StreamCallbacks
): Promise<StreamResult | null> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  let thinkingContent = '';
  let finalContent = '';
  let firstTokenReceived = false;

  while (true) {
    while (streamingStore.isPaused) {
      if (!streamingStore.isGenerating) return null;
      await new Promise((r) => setTimeout(r, 50));
    }

    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      if (isStreamDone(trimmed)) break;
      if (!trimmed.startsWith('data:')) continue;

      try {
        const jsonStr = trimmed.slice(5).trim();
        if (!jsonStr) continue;

        const data = JSON.parse(jsonStr);
        if (!data.choices?.[0]) continue;

        const delta = data.choices[0].delta;
        const content = delta.content || delta.reasoning_content;

        if (content) {
          if (!firstTokenReceived) {
            firstTokenReceived = true;
            callbacks?.onFirstToken?.();
          }

          if (delta.reasoning_content) {
            thinkingContent += content;
            callbacks?.onThinking?.(thinkingContent);
          } else {
            finalContent += content;
            callbacks?.onContent?.(finalContent);
          }
        }
      } catch {
        continue;
      }
    }
  }

  return {
    thinking: thinkingContent,
    content: finalContent,
    type: thinkingContent ? 'thinking' : 'normal',
  };
}

function isStreamDone(line: string): boolean {
  const doneMarker = String.fromCharCode(91, 68, 79, 78, 69, 93);
  return line.includes(doneMarker);
}

export async function generateTitle(
  userMessage: string,
  assistantMessage: string
): Promise<string | null> {
  const titleModel = settingsStore.config.titleGenerationModel;
  const modelConfig = settingsStore.config.models[titleModel];
  
  if (!modelConfig) return null;

  try {
    const response = await fetch(modelConfig.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + (modelConfig.key || settingsStore.config.defaultKey),
      },
      body: JSON.stringify({
        model: modelConfig.name,
        messages: [
          {
            role: 'system',
            content: '你是一个对话标题生成器。请根据用户的消息和AI的回复生成一个简短的标题（不超过15个字），直接返回标题文本，不要任何多余的话。',
          },
          {
            role: 'user',
            content: '用户问题：' + userMessage + '\nAI回复：' + assistantMessage,
          },
        ],
      }),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Format a message for API request, handling tool calls
 */
function formatMessageForAPI(m: Message): Record<string, unknown> {
  const formatted: Record<string, unknown> = {
    role: m.role,
    content: m.content
  };

  // Handle tool calls in assistant messages
  if (m.toolCalls && m.toolCalls.length > 0) {
    formatted.tool_calls = m.toolCalls;
  }

  // Handle tool result messages
  if (m.role === 'tool' && m.toolCallId) {
    formatted.tool_call_id = m.toolCallId;
  }

  return formatted;
}

/**
 * Stream chat completion with tool support
 */
export async function streamChatCompletionWithTools(
  messages: Message[],
  systemPrompt: string,
  tools: ToolDefinition[],
  callbacks?: StreamCallbacks
): Promise<StreamResult | null> {
  const modelConfig = settingsStore.currentModelConfig;

  if (!modelConfig) {
    throw new Error('Model not configured');
  }

  streamingStore.start();

  try {
    const requestMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(formatMessageForAPI),
    ];

    const requestBody: Record<string, unknown> = {
      model: modelConfig.name,
      messages: requestMessages,
      stream: true,
    };

    // Add tools if provided
    if (tools.length > 0) {
      requestBody.tools = tools.map(t => ({
        type: 'function',
        function: t
      }));
    }

    const response = await fetch(modelConfig.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + (modelConfig.key || settingsStore.config.defaultKey),
        'X-DashScope-SSE': 'enable',
      },
      signal: streamingStore.getSignal(),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error('Request failed: ' + response.status + ' ' + errorText);
    }

    return await parseSSEStreamWithTools(response, callbacks);
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return null;
    }
    throw error;
  } finally {
    streamingStore.stop();
  }
}

/**
 * Parse SSE stream with tool call support
 */
async function parseSSEStreamWithTools(
  response: Response,
  callbacks?: StreamCallbacks
): Promise<StreamResult | null> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  let thinkingContent = '';
  let finalContent = '';
  let firstTokenReceived = false;
  const toolCalls: ToolCall[] = [];
  const toolCallBuffers: Map<string, { name: string; arguments: string }> = new Map();

  while (true) {
    while (streamingStore.isPaused) {
      if (!streamingStore.isGenerating) return null;
      await new Promise((r) => setTimeout(r, 50));
    }

    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      if (isStreamDone(trimmed)) break;
      if (!trimmed.startsWith('data:')) continue;

      try {
        const jsonStr = trimmed.slice(5).trim();
        if (!jsonStr) continue;

        const data = JSON.parse(jsonStr);
        if (!data.choices?.[0]) continue;

        const delta = data.choices[0].delta;

        // Handle content
        const content = delta.content || delta.reasoning_content;
        if (content) {
          if (!firstTokenReceived) {
            firstTokenReceived = true;
            callbacks?.onFirstToken?.();
          }

          if (delta.reasoning_content) {
            thinkingContent += content;
            callbacks?.onThinking?.(thinkingContent);
          } else {
            finalContent += content;
            callbacks?.onContent?.(finalContent);
          }
        }

        // Handle tool calls
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const id = tc.id;
            const func = tc.function;

            if (id) {
              // New tool call
              if (!toolCallBuffers.has(id)) {
                toolCallBuffers.set(id, { name: '', arguments: '' });
              }
              const buffer = toolCallBuffers.get(id)!;

              if (func?.name) {
                buffer.name = func.name;
              }
              if (func?.arguments) {
                buffer.arguments += func.arguments;
              }
            } else if (tc.index !== undefined && func) {
              // Index-based tool call (some APIs use this)
              const virtualId = `tc_${tc.index}`;
              if (!toolCallBuffers.has(virtualId)) {
                toolCallBuffers.set(virtualId, { name: '', arguments: '' });
              }
              const buffer = toolCallBuffers.get(virtualId)!;
              if (func.name) buffer.name = func.name;
              if (func.arguments) buffer.arguments += func.arguments;
            }
          }
        }
      } catch {
        continue;
      }
    }
  }

  // Build final tool calls array
  for (const [id, buffer] of toolCallBuffers) {
    if (buffer.name) {
      toolCalls.push({
        id,
        type: 'function',
        function: {
          name: buffer.name,
          arguments: buffer.arguments
        }
      });
    }
  }

  // Notify tool calls callback
  if (toolCalls.length > 0) {
    callbacks?.onToolCalls?.(toolCalls);
  }

  return {
    thinking: thinkingContent,
    content: finalContent,
    type: thinkingContent ? 'thinking' : 'normal',
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined
  };
}
