<script lang="ts">
  import { uiStore } from '$lib/stores/ui.svelte';
  import { conversationsStore } from '$lib/stores/conversations.svelte';
  import { streamingStore } from '$lib/stores/streaming.svelte';
  import { themeStore } from '$lib/stores/theme.svelte';
  import { workspaceStore } from '$lib/stores/workspace.svelte';
  import { AGENT_SYSTEM_PROMPT } from '$lib/types/agent';
  import ConversationList from '$lib/components/sidebar/ConversationList.svelte';
  import WorkspaceSelector from '$lib/components/workspace/WorkspaceSelector.svelte';

  // Use derived state for reactive file list
  const workspaceFiles = $derived(workspaceStore.files);

  function handleNewConversation() {
    if (streamingStore.isGenerating) return;
    // Create conversation directly with agent system prompt
    const id = conversationsStore.create('agent', AGENT_SYSTEM_PROMPT, '新对话');
    // Add to current workspace
    workspaceStore.addConversation(id);
    // Close sidebar on mobile
    if (window.innerWidth < 768) {
      uiStore.closeSidebar();
    }
  }

  async function handleClearFiles() {
    await workspaceStore.clearFiles();
    uiStore.showToast('已清空工作空间文件', 'success');
  }
</script>

<aside
  id="sidebar"
  class="sidebar fixed md:relative z-30 h-full w-[85vw] max-w-[240px] md:w-72 md:max-w-none bg-[var(--bg-secondary)] border-r border-[var(--border-color)] flex flex-col transition-transform duration-300"
  class:active={uiStore.sidebarOpen}
  class:collapsed={uiStore.sidebarCollapsed}
>
  <div class="md:hidden flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)] mb-2">
    <span class="font-semibold text-lg text-[var(--text-primary)]">菜单</span>
    <button
      onclick={() => uiStore.closeSidebar()}
      class="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--hover-bg)] transition-colors"
      aria-label="Close sidebar"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>

  <!-- Workspace selector -->
  <div class="px-2 pt-2 relative">
    <WorkspaceSelector />
  </div>

  <!-- Current workspace files -->
  {#if workspaceFiles.length > 0}
    <div class="px-3 py-2 mx-2 mt-2 bg-[var(--bg-tertiary)] rounded-lg">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs text-[var(--text-secondary)]">工作空间文件</span>
        <button
          onclick={handleClearFiles}
          class="text-xs text-[var(--text-secondary)] hover:text-red-500 transition-colors"
          title="清空文件"
        >
          清空
        </button>
      </div>
      <div class="space-y-1 max-h-24 overflow-y-auto">
        {#each workspaceFiles as file}
          <div class="flex items-center gap-2 text-xs text-[var(--text-primary)]">
            <svg class="w-3 h-3 text-[var(--text-secondary)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span class="truncate">{file.name}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <div class="p-3 m-2">
    <button
      onclick={handleNewConversation}
      class="w-full px-4 py-3 bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--hover-bg)] transition-colors flex items-center justify-between group"
    >
      <span class="font-medium">新建对话</span>
      <svg class="w-5 h-5 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
      </svg>
    </button>
  </div>

  <div class="flex-1 overflow-y-auto px-2">
    <ConversationList />
  </div>

  <div class="p-2 border-t border-[var(--border-color)]">
    <button
      onclick={() => themeStore.toggle()}
      class="w-full flex items-center space-x-3 px-3 py-3 rounded-lg hover:bg-[var(--hover-bg)] text-[var(--text-primary)] transition-colors"
    >
      <div class="w-5 h-5 flex items-center justify-center text-[var(--text-secondary)]">
        {#if themeStore.isDark}
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        {:else}
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        {/if}
      </div>
      <span class="text-sm">切换主题</span>
    </button>

    <button
      onclick={() => uiStore.openModal('settings')}
      class="w-full flex items-center space-x-3 px-3 py-3 rounded-lg hover:bg-[var(--hover-bg)] text-[var(--text-primary)] transition-colors"
    >
      <div class="w-5 h-5 flex items-center justify-center text-[var(--text-secondary)]">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <span class="text-sm">设置</span>
    </button>
  </div>
</aside>
