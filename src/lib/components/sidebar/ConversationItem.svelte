<script lang="ts">
  import { conversationsStore } from '$lib/stores/conversations.svelte';
  import { uiStore } from '$lib/stores/ui.svelte';

  const { id, title, isActive = false, isDisabled = false }: { id: string; title: string; isActive?: boolean; isDisabled?: boolean } = $props();

  function handleClick() {
    if (isDisabled) return;
    conversationsStore.select(id);
    if (window.innerWidth < 768) {
      uiStore.closeSidebar();
    }
  }

  async function handleDelete(event: MouseEvent) {
    event.stopPropagation();
    const confirmed = await uiStore.confirm('删除确认', '确定要删除这个对话吗？');
    if (confirmed) {
      conversationsStore.delete(id);
    }
  }
</script>

<div
  class="conversation-item p-3 flex justify-between items-center rounded-lg cursor-pointer group"
  class:active={isActive}
  class:bg-[var(--hover-bg)]={isActive}
  class:hover:bg-[var(--hover-bg)]={!isActive}
  class:opacity-50={isDisabled}
  class:cursor-not-allowed={isDisabled}
  data-id={id}
  onclick={handleClick}
  onkeydown={(e) => e.key === 'Enter' && handleClick()}
  role="button"
  tabindex="0"
>
  <div class="flex-1 truncate mr-2 text-sm text-[var(--text-primary)]">
    {title}
  </div>
  
  <button
    class="p-1 text-[var(--text-secondary)] hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"
    title="删除对话"
    onclick={handleDelete}
  >
    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  </button>
</div>
