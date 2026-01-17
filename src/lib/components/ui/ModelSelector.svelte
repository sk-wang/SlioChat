<script lang="ts">
  import { settingsStore } from '$lib/stores/settings.svelte';

  let isOpen = $state(false);

  function toggleDropdown() {
    isOpen = !isOpen;
  }

  function closeDropdown() {
    isOpen = false;
  }

  function selectModel(modelId: string) {
    settingsStore.selectModel(modelId);
    closeDropdown();
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.model-selector')) {
      closeDropdown();
    }
  }

  const models = $derived(Object.entries(settingsStore.config.models));
  const currentModel = $derived(settingsStore.config.models[settingsStore.selectedModel]);
</script>

<svelte:window onclick={handleClickOutside} />

<div class="model-selector relative">
  <button
    id="model-select-btn"
    class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--hover-bg)] transition-colors"
    onclick={toggleDropdown}
  >
    <span id="model-select-label" class="text-sm text-[var(--text-primary)] font-medium truncate max-w-[120px]">
      {currentModel?.name || '选择模型'}
    </span>
    <svg
      id="model-select-arrow"
      class="w-4 h-4 text-[var(--text-secondary)] transition-transform"
      class:rotate-180={isOpen}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
    </svg>
  </button>

  {#if isOpen}
    <div
      id="model-dropdown"
      class="absolute right-0 mt-2 w-64 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl shadow-xl z-50 overflow-hidden"
    >
      {#each models as [modelId, modelInfo]}
        <button
          class="w-full text-left px-4 py-3 hover:bg-[var(--hover-bg)] flex items-start space-x-3 transition-colors group border-b border-[var(--border-color)] last:border-0"
          onclick={() => selectModel(modelId)}
        >
          <div class="flex-shrink-0">
            {#if modelInfo.type === 'thinking'}
              <svg class="w-5 h-5 mt-0.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            {:else}
              <svg class="w-5 h-5 mt-0.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            {/if}
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-[var(--text-primary)] text-sm flex items-center justify-between">
              <span class="truncate">{modelInfo.name}</span>
              {#if modelId === settingsStore.selectedModel}
                <svg class="w-4 h-4 text-[var(--button-primary-bg)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              {/if}
            </div>
            <div class="text-xs text-[var(--text-secondary)] mt-0.5 truncate">
              {modelInfo.type === 'thinking' ? '深度思考模型' : '通用对话模型'}
            </div>
          </div>
        </button>
      {/each}
    </div>
  {/if}
</div>
