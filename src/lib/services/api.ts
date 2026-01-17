import { settingsStore } from '$lib/stores/settings.svelte';
import { streamingStore } from '$lib/stores/streaming.svelte';
import type { Message } from '$lib/types';

export interface StreamResult {
  thinking: string;
  content: string;
  type: 'thinking' | 'normal';
}

export interface StreamCallbacks {
  onThinking?: (content: string) => void;
  onContent?: (content: string) => void;
  onFirstToken?: () => void;
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
