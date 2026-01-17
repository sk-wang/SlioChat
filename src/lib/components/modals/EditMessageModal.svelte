<script lang="ts">
  import { uiStore } from '$lib/stores/ui.svelte';
  import { conversationsStore } from '$lib/stores/conversations.svelte';

  let editValue = $state('');

  $effect(() => {
    if (uiStore.modals.editMessage !== null) {
      const msg = conversationsStore.currentConversation?.messages[uiStore.modals.editMessage];
      editValue = msg?.content || '';
    }
  });

  function handleSave() {
    if (uiStore.modals.editMessage !== null) {
      conversationsStore.editMessage(uiStore.modals.editMessage, editValue);
      uiStore.closeEditModal();
    }
  }

  function handleCancel() {
    uiStore.closeEditModal();
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleCancel();
    }
  }
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
  onclick={handleBackdropClick}
  onkeydown={(e) => e.key === 'Escape' && handleCancel()}
  role="dialog"
  aria-modal="true"
  tabindex="-1"
>
  <div class="bg-[var(--bg-secondary)] rounded-xl shadow-xl w-full max-w-2xl mx-4 p-6">
    <h3 class="text-lg font-medium text-[var(--text-primary)] mb-4">编辑消息</h3>
    
    <textarea
      bind:value={editValue}
      class="w-full h-64 px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[var(--button-primary-bg)] text-[var(--text-primary)]"
      placeholder="输入消息内容..."
    ></textarea>
    
    <div class="mt-4 flex justify-end gap-3">
      <button
        class="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] rounded-lg transition-colors"
        onclick={handleCancel}
      >
        取消
      </button>
      <button
        class="px-4 py-2 bg-[var(--button-primary-bg)] hover:bg-[var(--button-primary-hover)] text-white rounded-lg transition-colors"
        onclick={handleSave}
      >
        保存
      </button>
    </div>
  </div>
</div>
