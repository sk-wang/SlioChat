<script lang="ts">
  import { conversationsStore } from '$lib/stores/conversations.svelte';
  import { streamingStore } from '$lib/stores/streaming.svelte';
  import { filesStore } from '$lib/stores/files.svelte';
  import { processFile } from '$lib/services/fileHandlers';
  import { chatService } from '$lib/services/chat.svelte';
  import { uiStore } from '$lib/stores/ui.svelte';
  import type { PendingFile } from '$lib/types';

  let inputValue = $state('');
  let textareaEl: HTMLTextAreaElement;
  let fileInputEl: HTMLInputElement;

  function adjustHeight() {
    if (!textareaEl) return;
    textareaEl.style.height = 'auto';
    textareaEl.style.height = textareaEl.scrollHeight + 'px';
    if (!inputValue) {
      textareaEl.style.height = '52px';
    }
  }

  async function handleSend() {
    if (streamingStore.isGenerating) return;
    if (!inputValue.trim() && filesStore.files.length === 0) return;

    const message = inputValue.trim();
    inputValue = '';
    adjustHeight();

    await chatService.sendMessage(message, filesStore.files);
    filesStore.clear();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  function handleStop() {
    chatService.stop();
  }

  function handlePause() {
    streamingStore.togglePause();
  }

  async function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    for (const file of input.files) {
      try {
        const content = await processFile(file);
        filesStore.add(content);
      } catch (error) {
        console.error('File processing error:', error);
      }
    }

    input.value = '';
  }

  function triggerFileInput() {
    fileInputEl?.click();
  }

  async function handleClearChat() {
    if (streamingStore.isGenerating) return;
    const confirmed = await uiStore.confirm('清空确认', '确定要清空当前对话吗？');
    if (confirmed) {
      conversationsStore.clearMessages();
    }
  }
</script>

<div class="input-area">
  <div class="max-w-3xl mx-auto flex flex-col space-y-4">
    
    <div class="relative bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] shadow-sm focus-within:ring-1 focus-within:ring-[var(--border-color)] focus-within:border-[var(--border-color)]">
      
      <div class="absolute bottom-2 left-2">
        <input
          bind:this={fileInputEl}
          type="file"
          multiple
          accept=".pdf,.xlsx,.xls,.docx,.txt,.md,.json,.csv,.png,.jpg,.jpeg,.gif,.webp"
          class="hidden"
          onchange={handleFileSelect}
        />
        <button
          onclick={triggerFileInput}
          class="p-2 text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] rounded-full transition-colors duration-200"
          title="上传一个或多个文件"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <textarea
        bind:this={textareaEl}
        bind:value={inputValue}
        oninput={adjustHeight}
        onkeydown={handleKeydown}
        rows="1"
        class="w-full pl-12 pr-24 py-[14px] bg-transparent border-none text-[var(--text-primary)] focus:ring-0 resize-none max-h-[200px] overflow-y-auto leading-6 placeholder-[var(--text-secondary)] focus:outline-none"
        placeholder="给 AI 发送消息..."
        style="min-height: 52px;"
      ></textarea>

      <div class="absolute bottom-2 right-2 flex items-center space-x-1">
        <button
          onclick={handleClearChat}
          class="p-2 text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] rounded-full transition-colors duration-200"
          title="清空对话"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>

        {#if streamingStore.isGenerating}
          <button
            onclick={handlePause}
            class="p-2 text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] rounded-full transition-colors duration-200"
            title={streamingStore.isPaused ? '继续' : '暂停'}
          >
            {#if streamingStore.isPaused}
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            {:else}
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            {/if}
          </button>

          <button
            onclick={handleStop}
            class="p-2 text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] rounded-full transition-colors duration-200"
            title="停止生成"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </button>
        {/if}

        <button
          onclick={handleSend}
          disabled={!inputValue.trim() && filesStore.files.length === 0}
          class="p-2 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-full hover:opacity-90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title="发送消息"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>

    <div class="text-center text-xs text-[var(--text-secondary)]">
      AI 可能会犯错。请核对重要信息。
    </div>
  </div>
</div>
<div style="height: env(safe-area-inset-bottom, 0px); width: 100%;"></div>
