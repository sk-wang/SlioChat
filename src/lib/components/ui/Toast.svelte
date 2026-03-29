<script lang="ts">
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';
  import { uiStore } from '$lib/stores/ui.svelte';
  import type { ToastMessage } from '$lib/types';

  const { toast }: { toast: ToastMessage } = $props();

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
  aria-live="polite"
  in:fly={{ y: -20, duration: 200 }}
  out:fly={{ y: -20, duration: 150 }}
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
    class="p-1 hover:opacity-70 transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--button-primary-bg)] focus:ring-inset rounded"
    onclick={handleClose}
    aria-label="关闭提示"
  >
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  </button>
</div>
