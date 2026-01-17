<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { conversationsStore } from '$lib/stores/conversations.svelte';
  import { streamingStore } from '$lib/stores/streaming.svelte';
  import { filesStore } from '$lib/stores/files.svelte';
  import MessageItem from './MessageItem.svelte';

  let chatContainer: HTMLElement;
  let autoScroll = $state(true);
  let resizeObserver: ResizeObserver;

  function scrollToBottom(force = false) {
    if (!chatContainer) return;
    if (force || autoScroll) {
      // Immediate scroll for better stability during streaming
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  function handleScroll() {
    if (!chatContainer) return;
    const isNearBottom = chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 100;
    autoScroll = isNearBottom;
  }

  function removeFile(index: number) {
    filesStore.remove(index);
  }

  onMount(() => {
    scrollToBottom(true);

    const messagesEl = document.getElementById('messages');
    if (messagesEl) {
      resizeObserver = new ResizeObserver(() => {
        scrollToBottom();
      });
      resizeObserver.observe(messagesEl);
    }

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
    };
  });

  $effect(() => {
    if (conversationsStore.current?.messages) {
      tick().then(() => scrollToBottom());
    }
  });
</script>

<div
  bind:this={chatContainer}
  id="chat-container"
  class="flex-1 overflow-y-auto px-2 md:px-4 py-6"
  onscroll={handleScroll}
>
  <div id="messages" class="max-w-4xl mx-auto space-y-6">
    {#if conversationsStore.current}
      {#each conversationsStore.current.messages as message, index (index)}
        <MessageItem {message} {index} />
      {/each}
    {/if}

    {#if filesStore.files.length > 0}
      {#each filesStore.files as file, index}
        <div class="file-preview mb-2 p-3 bg-[var(--bg-secondary)] rounded-lg flex flex-col gap-2 border border-[var(--border-color)]">
          <div class="flex items-center gap-3">
            <div class="flex-shrink-0">
              <svg class="w-8 h-8 text-[var(--text-secondary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-[var(--text-primary)] truncate">{file.fileName}</p>
              <p class="text-xs text-[var(--text-secondary)]">{file.type} {(file.size / 1024).toFixed(1)}KB</p>
            </div>
            <button 
              class="file-close-btn p-1 text-[var(--text-secondary)] hover:text-[var(--button-primary-bg)] rounded-full hover:bg-[var(--hover-bg)] transition-colors"
              title="取消上传"
              onclick={() => removeFile(index)}
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      {/each}
    {/if}
  </div>

  <button
    id="scroll-to-bottom-btn"
    class="scroll-to-bottom-btn"
    class:visible={!autoScroll}
    onclick={() => scrollToBottom(true)}
    aria-label="Scroll to bottom"
  >
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  </button>
</div>
