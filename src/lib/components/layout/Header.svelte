<script lang="ts">
  import { uiStore } from '$lib/stores/ui.svelte';
  import { themeStore } from '$lib/stores/theme.svelte';
  import { conversationsStore } from '$lib/stores/conversations.svelte';
  import ModelSelector from '$lib/components/ui/ModelSelector.svelte';
  import { tick } from 'svelte';

  let isEditingTitle = $state(false);
  let editingTitleValue = $state('');
  let titleInputEl: HTMLInputElement;

  function toggleMobileSidebar() {
    uiStore.toggleSidebar();
  }

  function togglePCSidebar() {
    uiStore.togglePCSidebar();
  }

  async function startEditingTitle() {
    editingTitleValue = conversationsStore.current?.title || '';
    isEditingTitle = true;
    await tick();
    titleInputEl?.focus();
    titleInputEl?.select();
  }

  function saveTitle() {
    const newTitle = editingTitleValue.trim();
    if (newTitle && conversationsStore.currentId) {
      conversationsStore.updateTitle(conversationsStore.currentId, newTitle);
    }
    isEditingTitle = false;
  }

  function handleTitleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveTitle();
    } else if (event.key === 'Escape') {
      isEditingTitle = false;
    }
  }
</script>

<header class="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
  <div class="flex items-center gap-3">
    <button
      id="menu-toggle"
      onclick={toggleMobileSidebar}
      class="md:hidden p-2 text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] rounded-lg transition-colors"
      aria-label="Toggle sidebar"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>

    <button
      onclick={togglePCSidebar}
      class="hidden md:block p-2 text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] rounded-lg transition-colors"
      aria-label="Toggle sidebar"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>

    <div class="flex items-center gap-2">
      {#if isEditingTitle}
        <input
          bind:this={titleInputEl}
          type="text"
          bind:value={editingTitleValue}
          onblur={saveTitle}
          onkeydown={handleTitleKeydown}
          class="text-lg font-medium text-[var(--text-primary)] bg-transparent border-b-2 border-[var(--button-primary-bg)] focus:outline-none max-w-[200px] md:max-w-[320px]"
        />
      {:else}
        <h1
          id="current-conversation-title"
          class="text-lg font-medium text-[var(--text-primary)] truncate max-w-[200px] md:max-w-none cursor-pointer hover:text-[var(--button-primary-bg)]"
          onclick={startEditingTitle}
          onkeydown={(e) => e.key === 'Enter' && startEditingTitle()}
          role="button"
          tabindex="0"
        >
          {conversationsStore.current?.title || '新对话'}
        </h1>
      {/if}
    </div>
  </div>

  <div class="flex items-center gap-2">
    <ModelSelector />
  </div>
</header>
