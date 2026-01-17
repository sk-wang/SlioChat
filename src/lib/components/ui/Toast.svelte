<script lang="ts">
  import { onMount } from 'svelte';
  import { uiStore, type Toast } from '$lib/stores/ui.svelte';

  const { toast }: { toast: Toast } = $props();

  onMount(() => {
    const timer = setTimeout(() => {
      uiStore.removeToast(toast.id);
    }, toast.duration || 3000);

    return () => clearTimeout(timer);
  });

  function handleClose() {
    uiStore.removeToast(toast.id);
  }

  const bgColor = $derived(toast.type === 'error' ? 'bg-red-500' : toast.type === 'success' ? 'bg-green-500' : 'bg-[var(--bg-secondary)]');
  const textColor = $derived(toast.type === 'error' || toast.type === 'success' ? 'text-white' : 'text-[var(--text-primary)]');
</script>

<div
  class="toast flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border border-[var(--border-color)] {bgColor} {textColor}"
  role="alert"
>
  {#if toast.type === 'success'}
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
    </svg>
  {:else if toast.type === 'error'}
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  {:else}
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  {/if}

  <span class="flex-1">{toast.message}</span>

  <button
    class="p-1 hover:opacity-70 transition-opacity"
    onclick={handleClose}
    aria-label="Close"
  >
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  </button>
</div>
