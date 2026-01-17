<script lang="ts">
  import { conversationsStore } from '$lib/stores/conversations.svelte';
  import { uiStore } from '$lib/stores/ui.svelte';
  import { streamingStore } from '$lib/stores/streaming.svelte';
  import { chatService } from '$lib/services/chat.svelte';
  import { renderMarkdown } from '$lib/services/markdown';
  import type { Message } from '$lib/types';
  import ThinkingBlock from './ThinkingBlock.svelte';
  import { fade } from 'svelte/transition';

  const { message, index }: { message: Message; index: number } = $props();

  function parseThinkingContent(content: string): { thinking: string; content: string } | null {
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  const isUser = $derived(message.role === 'user');
  const isThinking = $derived(message.type === 'thinking');
  const parsedContent = $derived(isThinking ? parseThinkingContent(message.content) : null);
  const renderedContent = $derived(isThinking ? null : renderMarkdown(message.content));
  const isLastAssistant = $derived(!isUser && index === (conversationsStore.current?.messages.length ?? 0) - 1);
  const isGeneratingThis = $derived(isLastAssistant && streamingStore.isGenerating);

  function copyMessage() {
    navigator.clipboard.writeText(message.content);
    uiStore.showToast('复制成功', 'success');
  }

  function editMessage() {
    uiStore.openEditModal(index);
  }

  async function deleteMessage() {
    const confirmed = await uiStore.confirm('删除确认', '确定要删除这条消息吗？');
    if (confirmed) {
      conversationsStore.deleteMessage(index);
    }
  }

  function regenerateMessage() {
    chatService.regenerateMessage(index);
  }

  function handleContentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const btn = target.closest('button');
    
    if (!btn) return;
    
    if (btn.classList.contains('code-copy-btn')) {
      const code = btn.parentElement?.previousElementSibling?.textContent;
      if (code) {
        navigator.clipboard.writeText(code);
        uiStore.showToast('代码已复制', 'success');
        
        // Add copied class for visual feedback if needed
        btn.classList.add('copied');
        setTimeout(() => btn.classList.remove('copied'), 1000);
      }
    } else if (btn.classList.contains('html-preview-btn')) {
      const code = btn.parentElement?.previousElementSibling?.textContent;
      if (code) {
        uiStore.openHtmlPreview(code);
      }
    }
  }
</script>

<div
  class="message-container w-full flex mb-4 md:mb-6"
  class:justify-end={isUser}
  class:justify-start={!isUser}
  data-index={index}
  data-role={message.role}
>
  <div class="flex max-w-[92%] md:max-w-[80%] gap-2 md:gap-4" class:flex-row-reverse={isUser}>
    {#if !isUser}
      <div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-[var(--button-primary-bg)]">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5">
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 11c.9 0 1.8-.1 2.6-.4"/>
          <path d="M17.6 14.2c-.8.8-1.3 2-1.1 3.2.2 1.2 1.1 2.2 2.3 2.4 1.2.2 2.4-.3 3.2-1.1.8-.8 1.3-2 1.1-3.2-.2-1.2-1.1-2.2-2.3-2.4-1.2-.2-2.4.3-3.2 1.1z"/>
          <path d="M9.4 9.8c.8-.8 1.3-2 1.1-3.2-.2-1.2-1.1-2.2-2.3-2.4-1.2-.2-2.4.3-3.2 1.1-.8.8-1.3 2-1.1 3.2.2 1.2 1.1 2.2 2.3 2.4 1.2.2 2.4-.3 3.2-1.1z"/>
          <path d="M14.5 8.5l-5 7"/>
        </svg>
      </div>
    {/if}

    <div class="message-content-wrapper min-w-0" class:flex-1={!isUser}>
      <div class="flex flex-col">
        <div 
          class="markdown-body text-[var(--text-primary)]"
          onclick={handleContentClick}
          role="presentation"
        >
          {#if isThinking && parsedContent}
            <ThinkingBlock thinking={parsedContent.thinking} content={parsedContent.content} />
          {:else}
            {@html renderedContent}
          {/if}
        </div>

        {#if !isGeneratingThis}
          <div 
            class="message-actions flex items-center gap-1 mt-1" 
            class:justify-end={isUser} 
            class:justify-start={!isUser}
            transition:fade={{ duration: 200 }}
          >
            <button
              class="p-1 text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] rounded transition-colors"
              title="复制消息"
              onclick={copyMessage}
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
            </button>

            {#if isLastAssistant}
              <button
                class="p-1 text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] rounded transition-colors"
                title="重新生成"
                onclick={regenerateMessage}
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            {/if}

            <button
              class="p-1 text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] rounded transition-colors"
              title="编辑消息"
              onclick={editMessage}
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>

            <button
              class="p-1 text-[var(--text-secondary)] hover:text-red-500 hover:bg-[var(--hover-bg)] rounded transition-colors"
              title="删除消息"
              onclick={deleteMessage}
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>
