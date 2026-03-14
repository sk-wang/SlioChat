<script lang="ts">
  import { uiStore } from '$lib/stores/ui.svelte';
  import { themeStore } from '$lib/stores/theme.svelte';
  import { conversationsStore } from '$lib/stores/conversations.svelte';
  import { agentStore } from '$lib/stores/agent.svelte';
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

<header class="flex items-center justify-between px-2 md:px-4 py-2 md:py-3 border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
  <div class="flex items-center gap-2 md:gap-3">
    <button
      id="menu-toggle"
      onclick={toggleMobileSidebar}
      class="md:hidden p-1.5 text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] rounded-lg transition-colors"
      aria-label="Toggle sidebar"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

    <div class="flex items-center gap-1 md:gap-2">
      {#if isEditingTitle}
        <input
          bind:this={titleInputEl}
          type="text"
          bind:value={editingTitleValue}
          onblur={saveTitle}
          onkeydown={handleTitleKeydown}
          class="text-base md:text-lg font-medium text-[var(--text-primary)] bg-transparent border-b-2 border-[var(--button-primary-bg)] focus:outline-none max-w-[80px] md:max-w-[320px]"
        />
      {:else}
        <h1
          id="current-conversation-title"
          class="text-sm md:text-lg font-medium text-[var(--text-primary)] truncate max-w-[80px] md:max-w-none cursor-pointer hover:text-[var(--button-primary-bg)]"
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

  <div class="flex items-center gap-1 md:gap-2">
    <!-- YOLO Mode Toggle -->
    <button
      class="p-1.5 md:p-2 rounded-lg transition-colors {agentStore.yoloMode ? 'text-orange-500 bg-orange-100 dark:bg-orange-900/30' : 'text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]'}"
      onclick={() => agentStore.toggleYoloMode()}
      title={agentStore.yoloMode ? 'YOLO 模式已开启 (自动执行工具)' : 'YOLO 模式已关闭 (需确认工具)'}
    >
      <svg class="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {#if agentStore.yoloMode}
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        {:else}
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        {/if}
      </svg>
    </button>

    <!-- Sandbox Toggle -->
    <button
      class="p-1.5 md:p-2 text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] rounded-lg transition-colors"
      class:bg-[var(--accent-color)]={agentStore.showSandbox}
      class:text-white={agentStore.showSandbox}
      onclick={() => agentStore.toggleSandbox()}
      title="切换沙箱面板"
    >
      <svg class="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    </button>
    <ModelSelector />
  </div>
</header>
