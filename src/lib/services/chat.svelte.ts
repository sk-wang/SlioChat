import { conversationsStore } from '$lib/stores/conversations.svelte';
import { streamingStore } from '$lib/stores/streaming.svelte';
import { settingsStore } from '$lib/stores/settings.svelte';
import { uiStore } from '$lib/stores/ui.svelte';
import { streamChatCompletion, generateTitle } from './api';
import { shouldSearch, generateSearchQuery, performSearch, formatSearchResults } from './search';
import type { PendingFile, Message } from '$lib/types';

class ChatService {
  async sendMessage(text: string, files: PendingFile[]) {
    if (streamingStore.isGenerating) return;
    
    const current = conversationsStore.current;
    if (!current) return;

    let content = text;
    let metadata: Message['metadata'] | undefined;

    if (files.length > 0) {
      const fileContents = files.map(f => `[文件: ${f.fileName}]\n${f.content}`).join('\n\n');
      content = fileContents + '\n\n' + text;
      
      metadata = {
        type: 'files',
        files: files.map(f => ({
          fileName: f.fileName,
          fileType: f.type,
          fileSize: f.size
        }))
      };
    }

    const userMessage: Message = { 
      role: 'user', 
      content, 
      type: 'normal',
      metadata
    };
    conversationsStore.addMessage(userMessage);

    let searchResults = '';
    if (settingsStore.config.search.enabled && !files.length) {
      try {
        const needsSearch = await shouldSearch(text);
        if (needsSearch) {
          const query = await generateSearchQuery(text);
          const results = await performSearch(query);
          if (results.length > 0) {
            searchResults = formatSearchResults(results);
          }
        }
      } catch (e) {
        console.error('Search failed', e);
      }
    }

    if (searchResults) {
        conversationsStore.updateLastMessageFields({ searchResults });
    }

    conversationsStore.addMessage({ role: 'assistant', content: '', type: 'normal' });

    const contextMessages = conversationsStore.getMessagesForContext(settingsStore.config.contextCount);
    const messagesToSend = contextMessages.slice(0, -1);

    let systemPrompt = current.systemPrompt || settingsStore.config.defaultSystemPrompt;
    if (searchResults) {
        systemPrompt += `\n\n以下是与用户问题相关的搜索结果，你可以参考这些信息来回答。在引用信息时，请使用markdown格式的链接，例如：根据[来源1](链接)显示...。这样可以让用户直接点击查看原始来源：\n${searchResults}`;
    }

    try {
      const result = await streamChatCompletion(
        messagesToSend,
        systemPrompt,
        {
          onThinking: (thinkingContent) => {
            streamingStore.setThinking(thinkingContent);
            const content = JSON.stringify({
              thinking: thinkingContent,
              content: ''
            });
            conversationsStore.updateLastMessage(content, 'thinking');
          },
          onContent: (responseContent) => {
            const thinking = streamingStore.thinkingContent;
            let content = responseContent;
            let type: 'normal' | 'thinking' = 'normal';

            if (thinking) {
              content = JSON.stringify({
                thinking,
                content: responseContent
              });
              type = 'thinking';
            }

            conversationsStore.updateLastMessage(content, type);
          },
        }
      );

      if (result && current.messages.length === 2) {
        const title = await generateTitle(text, result.content);
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

    let systemPrompt = current.systemPrompt || settingsStore.config.defaultSystemPrompt;
    if (userMessage.searchResults) {
        systemPrompt += `\n\n以下是与用户问题相关的搜索结果，你可以参考这些信息来回答。在引用信息时，请使用markdown格式的链接，例如：根据[来源1](链接)显示...。这样可以让用户直接点击查看原始来源：\n${userMessage.searchResults}`;
    }

    conversationsStore.addMessage({ role: 'assistant', content: '', type: 'normal' });

    try {
      await streamChatCompletion(
        contextMessages,
        systemPrompt,
        {
          onThinking: (thinkingContent) => {
            streamingStore.setThinking(thinkingContent);
            const content = JSON.stringify({
              thinking: thinkingContent,
              content: ''
            });
            conversationsStore.updateLastMessage(content, 'thinking');
          },
          onContent: (responseContent) => {
            const thinking = streamingStore.thinkingContent;
            let content = responseContent;
            let type: 'normal' | 'thinking' = 'normal';

            if (thinking) {
              content = JSON.stringify({
                thinking,
                content: responseContent
              });
              type = 'thinking';
            }

            conversationsStore.updateLastMessage(content, type);
          },
        }
      );
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
