<script lang="ts">
  import { workspaceStore } from '$lib/stores/workspace.svelte';
  import { uiStore } from '$lib/stores/ui.svelte';
  import { fade } from 'svelte/transition';

  let isExpanded = $state(false);
  let isCreating = $state(false);
  let newWorkspaceName = $state('');

  function toggleExpanded() {
    isExpanded = !isExpanded;
  }

  function selectWorkspace(id: string) {
    workspaceStore.setCurrentWorkspace(id);
    isExpanded = false;
  }

  function startCreating() {
    isCreating = true;
    newWorkspaceName = '';
  }

  function cancelCreating() {
    isCreating = false;
    newWorkspaceName = '';
  }

  function createWorkspace() {
    const name = newWorkspaceName.trim();
    if (name) {
      workspaceStore.createWorkspace(name);
      newWorkspaceName = '';
      isCreating = false;
      uiStore.showToast(`工作空间 "${name}" 已创建`, 'success');
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      createWorkspace();
    } else if (event.key === 'Escape') {
      cancelCreating();
    }
  }

  function deleteWorkspace(id: string, event: MouseEvent) {
    event.stopPropagation();
    const workspace = workspaceStore.workspaces.find(w => w.id === id);
    if (!workspace || workspace.isDefault) return;

    if (confirm(`确定要删除工作空间 "${workspace.name}" 吗？其中的对话将被删除。`)) {
      workspaceStore.deleteWorkspace(id);
      uiStore.showToast(`工作空间 "${workspace.name}" 已删除`, 'success');
    }
  }
</script>

<div class="workspace-selector">
  <!-- Current workspace display -->
  <button
    onclick={toggleExpanded}
    class="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-[var(--hover-bg)] rounded-lg transition-colors"
  >
    <div class="flex items-center gap-2 min-w-0">
      <svg class="w-4 h-4 text-[var(--text-secondary)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
      <span class="truncate text-[var(--text-primary)]">
        {workspaceStore.currentWorkspace?.name || '默认工作空间'}
      </span>
    </div>
    <svg
      class="w-4 h-4 text-[var(--text-secondary)] transition-transform"
      class:rotate-180={isExpanded}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
    </svg>
  </button>

  <!-- Workspace dropdown -->
  {#if isExpanded}
    <div
      class="absolute left-2 right-2 mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg shadow-lg z-50"
      transition:fade={{ duration: 150 }}
    >
      <!-- Workspace list -->
      <div class="max-h-48 overflow-y-auto py-1">
        {#each workspaceStore.workspaces as workspace}
          <div class="flex items-center group">
            <button
              onclick={() => selectWorkspace(workspace.id)}
              class="flex-1 flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--hover-bg)] transition-colors"
              class:bg-[var(--hover-bg)]={workspace.id === workspaceStore.currentWorkspaceId}
            >
              <svg class="w-4 h-4 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span class="truncate text-[var(--text-primary)]">{workspace.name}</span>
              {#if workspace.isDefault}
                <span class="text-xs text-[var(--text-secondary)]">(默认)</span>
              {/if}
              {#if workspace.id === workspaceStore.currentWorkspaceId}
                <svg class="w-4 h-4 text-[var(--button-primary-bg)] ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              {/if}
            </button>
            {#if !workspace.isDefault}
              <button
                onclick={(e) => deleteWorkspace(workspace.id, e)}
                class="px-2 py-2 text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                title="删除工作空间"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            {/if}
          </div>
        {/each}
      </div>

      <!-- Divider -->
      <div class="border-t border-[var(--border-color)]"></div>

      <!-- Create new workspace -->
      {#if isCreating}
        <div class="p-2">
          <input
            type="text"
            bind:value={newWorkspaceName}
            onkeydown={handleKeydown}
            placeholder="工作空间名称"
            class="w-full px-3 py-1.5 text-sm bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-[var(--button-primary-bg)]"
          />
          <div class="flex gap-2 mt-2">
            <button
              onclick={cancelCreating}
              class="flex-1 px-3 py-1.5 text-sm border border-[var(--border-color)] rounded-lg hover:bg-[var(--hover-bg)] transition-colors"
            >
              取消
            </button>
            <button
              onclick={createWorkspace}
              disabled={!newWorkspaceName.trim()}
              class="flex-1 px-3 py-1.5 text-sm bg-[var(--button-primary-bg)] text-white rounded-lg hover:bg-[var(--button-primary-hover)] transition-colors disabled:opacity-50"
            >
              创建
            </button>
          </div>
        </div>
      {:else}
        <button
          onclick={startCreating}
          class="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          新建工作空间
        </button>
      {/if}
    </div>
  {/if}
</div>

<!-- Click outside to close -->
{#if isExpanded}
  <button
    class="fixed inset-0 z-40"
    onclick={() => isExpanded = false}
    aria-label="Close workspace selector"
  ></button>
{/if}
