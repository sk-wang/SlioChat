import { conversationsStore } from '$lib/stores/conversations.svelte';
import { streamingStore } from '$lib/stores/streaming.svelte';
import { settingsStore } from '$lib/stores/settings.svelte';
import { uiStore } from '$lib/stores/ui.svelte';
import { workspaceStore } from '$lib/stores/workspace.svelte';
import { generateTitle } from './api';
import { agentService } from './agent.svelte';
import type { Message } from '$lib/types';

class ChatService {
  async sendMessage(text: string) {
    if (streamingStore.isGenerating) return;

    const current = conversationsStore.current;
    if (!current) return;

    // Check workspace files
    const workspaceFiles = workspaceStore.files;

    let content = text;
    let metadata: Message['metadata'] | undefined;

    if (workspaceFiles.length > 0) {
      metadata = {
        type: 'files',
        files: workspaceFiles.map(f => ({
          fileName: f.name,
          fileType: f.type,
          fileSize: f.size
        }))
      };
      // Agent will use tools to discover and read files when needed
    }

    const userMessage: Message = {
      role: 'user',
      content,
      type: 'normal',
      metadata
    };
    conversationsStore.addMessage(userMessage);

    // Add empty assistant message
    conversationsStore.addMessage({ role: 'assistant', content: '', type: 'normal' });

    const contextMessages = conversationsStore.getMessagesForContext(settingsStore.config.contextCount);
    const messagesToSend = contextMessages.slice(0, -1);

    const systemPrompt = current.systemPrompt || settingsStore.config.defaultSystemPrompt;

    try {
      let finalContent = '';
      let finalThinking = '';

      // Use agent service for all conversations
      for await (const event of agentService.runAgentConversation(messagesToSend, systemPrompt)) {
        switch (event.type) {
          case 'thinking':
            // API callbacks send accumulated content, use = not +=
            finalThinking = event.content || '';
            streamingStore.setThinking(finalThinking);
            const thinkingContent = JSON.stringify({
              thinking: finalThinking,
              content: finalContent
            });
            conversationsStore.updateLastMessage(thinkingContent, 'thinking');
            break;

          case 'content':
            // API callbacks send accumulated content, use = not +=
            finalContent = event.content || '';
            if (finalThinking) {
              const msgContent = JSON.stringify({
                thinking: finalThinking,
                content: finalContent
              });
              conversationsStore.updateLastMessage(msgContent, 'thinking');
            } else {
              conversationsStore.updateLastMessage(finalContent, 'normal');
            }
            break;

          case 'tool_calls':
            // Save tool calls to the message so ToolCallDisplay can show them
            if (event.calls && event.calls.length > 0) {
              conversationsStore.updateLastMessageFields({
                toolCalls: event.calls
              });
            }
            break;

          case 'tool_result':
            // Tool results are displayed in UI via ToolCallDisplay
            // Results are stored in agentStore
            break;

          case 'tool_confirmation_required':
            // Tool confirmation UI is shown via ToolConfirmation component
            // Also save tool calls to message for display
            if (event.calls && event.calls.length > 0) {
              conversationsStore.updateLastMessageFields({
                toolCalls: event.calls
              });
            }
            break;

          case 'tool_rejected':
            // Tool was rejected by user
            break;

          case 'messages_updated':
            // Agent has added tool messages to the conversation context
            // These are used for multi-turn tool calling but not persisted to store
            // The final response will be saved as the assistant message
            break;

          case 'final_response':
            finalContent = event.content || finalContent;
            if (finalThinking) {
              const msgContent = JSON.stringify({
                thinking: finalThinking,
                content: finalContent
              });
              conversationsStore.updateLastMessage(msgContent, 'thinking');
            } else {
              conversationsStore.updateLastMessage(finalContent, 'normal');
            }
            // Ensure processing state is cleared
            streamingStore.finish();
            break;

          case 'error':
            conversationsStore.updateLastMessage('发生错误: ' + (event.error || '未知错误'));
            // Ensure processing state is cleared on error
            streamingStore.finish();
            break;
        }
      }

      // Generate title if this is the first exchange (only one user message)
      const userMessageCount = current.messages.filter(m => m.role === 'user').length;
      if (userMessageCount === 1 && finalContent) {
        const title = await generateTitle(text, finalContent);
        if (title) {
          conversationsStore.updateTitle(current.id, title);
        }
      }
    } catch (error) {
      console.error('Send message error:', error);
      conversationsStore.updateLastMessage('发生错误: ' + (error as Error).message);
    }
  }

  async regenerateMessage(index: number) {
    if (streamingStore.isGenerating) return;

    const current = conversationsStore.current;
    if (!current) return;

    if (index !== current.messages.length - 1) {
      return;
    }

    const message = current.messages[index];
    if (message.role !== 'assistant') return;

    const userMessage = current.messages[index - 1];
    if (!userMessage || userMessage.role !== 'user') return;

    conversationsStore.deleteMessage(index);

    const contextMessages = conversationsStore.getMessagesForContext(settingsStore.config.contextCount);
    const systemPrompt = current.systemPrompt || settingsStore.config.defaultSystemPrompt;

    conversationsStore.addMessage({ role: 'assistant', content: '', type: 'normal' });

    try {
      let finalContent = '';
      let finalThinking = '';

      for await (const event of agentService.runAgentConversation(contextMessages, systemPrompt)) {
        switch (event.type) {
          case 'thinking':
            // API callbacks send accumulated content, use = not +=
            finalThinking = event.content || '';
            streamingStore.setThinking(finalThinking);
            const thinkingContent = JSON.stringify({
              thinking: finalThinking,
              content: finalContent
            });
            conversationsStore.updateLastMessage(thinkingContent, 'thinking');
            break;

          case 'content':
            // API callbacks send accumulated content, use = not +=
            finalContent = event.content || '';
            if (finalThinking) {
              const msgContent = JSON.stringify({
                thinking: finalThinking,
                content: finalContent
              });
              conversationsStore.updateLastMessage(msgContent, 'thinking');
            } else {
              conversationsStore.updateLastMessage(finalContent, 'normal');
            }
            break;

          case 'tool_calls':
            // Save tool calls to the message so ToolCallDisplay can show them
            if (event.calls && event.calls.length > 0) {
              conversationsStore.updateLastMessageFields({
                toolCalls: event.calls
              });
            }
            break;

          case 'tool_confirmation_required':
            // Tool confirmation UI is shown via ToolConfirmation component
            // Also save tool calls to message for display
            if (event.calls && event.calls.length > 0) {
              conversationsStore.updateLastMessageFields({
                toolCalls: event.calls
              });
            }
            break;

          case 'tool_rejected':
            // Tool was rejected by user
            break;

          case 'messages_updated':
            // Agent has added tool messages to the conversation context
            break;

          case 'final_response':
            finalContent = event.content || finalContent;
            if (finalThinking) {
              const msgContent = JSON.stringify({
                thinking: finalThinking,
                content: finalContent
              });
              conversationsStore.updateLastMessage(msgContent, 'thinking');
            } else {
              conversationsStore.updateLastMessage(finalContent, 'normal');
            }
            // Ensure processing state is cleared
            streamingStore.finish();
            break;

          case 'error':
            conversationsStore.updateLastMessage('发生错误: ' + (event.error || '未知错误'));
            // Ensure processing state is cleared on error
            streamingStore.finish();
            break;
        }
      }
    } catch (error) {
      console.error('Regenerate message error:', error);
      conversationsStore.updateLastMessage('发生错误: ' + (error as Error).message);
    }
  }

  stop() {
    streamingStore.stop();
  }

  exportConversation() {
    const current = conversationsStore.current;
    if (!current) {
      uiStore.showToast('没有可导出的对话', 'error');
      return;
    }

    const data = {
      title: current.title,
      messages: current.messages,
      systemPrompt: current.systemPrompt,
      type: current.type,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${current.title}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async importConversation(file: File) {
    try {
      const text = await readFileAsText(file);
      const data = JSON.parse(text);

      if (!data.title || !Array.isArray(data.messages)) {
        throw new Error('无效的对话文件格式');
      }

      const id = conversationsStore.create(
        data.type || 'normal',
        data.systemPrompt || '',
        '导入对话'
      );

      conversationsStore.updateTitle(id, data.title);
      conversationsStore.setMessages(id, data.messages);

      // Add to current workspace
      workspaceStore.addConversation(id);

      uiStore.showToast('导入成功', 'success');
    } catch (e) {
      console.error(e);
      uiStore.showToast('导入失败: ' + (e as Error).message, 'error');
    }
  }
}

export const chatService = new ChatService();

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
