<script lang="ts">
  import { uiStore } from '$lib/stores/ui.svelte';

  function handleClose() {
    uiStore.closeModal('htmlPreview');
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }

  const htmlContent = $derived(uiStore.htmlPreviewContent || '');
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
  onclick={handleBackdropClick}
  onkeydown={(e) => e.key === 'Escape' && handleClose()}
  role="dialog"
  aria-modal="true"
  tabindex="-1"
>
  <div class="bg-[var(--bg-secondary)] rounded-xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
    <div class="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
      <h2 class="text-lg font-semibold text-[var(--text-primary)]">HTML 预览</h2>
      <button
        class="p-2 text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] rounded-lg transition-colors"
        onclick={handleClose}
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <div class="flex-1 overflow-hidden p-4">
      <iframe
        title="HTML Preview"
        srcdoc={htmlContent}
        class="w-full h-full min-h-[400px] bg-white rounded-lg border border-[var(--border-color)]"
        sandbox="allow-scripts"
      ></iframe>
    </div>
  </div>
</div>
