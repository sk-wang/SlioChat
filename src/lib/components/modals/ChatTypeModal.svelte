<script lang="ts">
  import { uiStore } from '$lib/stores/ui.svelte';
  import { conversationsStore } from '$lib/stores/conversations.svelte';
  import { settingsStore } from '$lib/stores/settings.svelte';

  function selectType(typeId: string) {
    const typeInfo = chatTypes[typeId];
    if (typeInfo) {
      conversationsStore.create(typeId, typeInfo.systemPrompt, typeInfo.name);
    }
    uiStore.closeModal('chatType');
    if (window.innerWidth < 768) {
      uiStore.closeSidebar();
    }
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      uiStore.closeModal('chatType');
    }
  }

  const chatTypes = $derived(settingsStore.config.chatTypes);
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
  onclick={handleBackdropClick}
  onkeydown={(e) => e.key === 'Escape' && uiStore.closeModal('chatType')}
  role="dialog"
  aria-modal="true"
  tabindex="-1"
>
  <div class="bg-[var(--bg-secondary)] rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
    <h3 class="text-lg font-medium text-[var(--text-primary)] mb-4">选择对话类型</h3>
    
    <div class="space-y-3">
      {#each Object.entries(chatTypes) as [typeId, typeInfo]}
        <button
          class="w-full p-4 text-left bg-[var(--bg-primary)] hover:bg-[var(--hover-bg)] rounded-lg border border-[var(--border-color)] transition-colors"
          onclick={() => selectType(typeId)}
        >
          <div class="font-medium text-[var(--text-primary)]">{typeInfo.name}</div>
          <div class="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">
            {typeInfo.systemPrompt.slice(0, 100) + '...'}
          </div>
        </button>
      {/each}
    </div>
    
    <div class="mt-4 flex justify-end">
      <button
        class="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] rounded-lg transition-colors"
        onclick={() => uiStore.closeModal('chatType')}
      >
        取消
      </button>
    </div>
  </div>
</div>
