<script lang="ts">
  import { uiStore } from '$lib/stores/ui.svelte';

  function handleConfirm() {
    uiStore.resolveConfirm(true);
  }

  function handleCancel() {
    uiStore.resolveConfirm(false);
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
  <div class="bg-[var(--bg-secondary)] rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
    <h3 class="text-lg font-medium text-[var(--text-primary)] mb-2">
      {uiStore.confirmData?.title || '确认'}
    </h3>
    <p class="text-[var(--text-secondary)] mb-6">
      {uiStore.confirmData?.message || '确定要执行此操作吗？'}
    </p>
    
    <div class="flex justify-end gap-3">
      <button
        class="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] rounded-lg transition-colors"
        onclick={handleCancel}
      >
        取消
      </button>
      <button
        class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
        onclick={handleConfirm}
      >
        确定
      </button>
    </div>
  </div>
</div>
