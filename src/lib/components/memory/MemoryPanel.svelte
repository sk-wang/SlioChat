<script lang="ts">
  import { memoryStore } from '$lib/stores/memory.svelte';
  import type { Memory } from '$lib/types/memory';

  let searchQuery = $state('');
  let newMemoryContent = $state('');
  let newMemoryType = $state<Memory['type']>('fact');
  let editingId = $state<string | null>(null);
  let editContent = $state('');

  const filteredMemories = $derived(
    searchQuery
      ? memoryStore.searchMemories(searchQuery)
      : memoryStore.getRecentMemories(20)
  );

  function handleAddMemory() {
    if (!newMemoryContent.trim()) return;
    memoryStore.addMemory(newMemoryContent.trim(), newMemoryType);
    newMemoryContent = '';
  }

  function startEdit(memory: Memory) {
    editingId = memory.id;
    editContent = memory.content;
  }

  function saveEdit() {
    if (editingId && editContent.trim()) {
      memoryStore.updateMemory(editingId, { content: editContent.trim() });
    }
    editingId = null;
    editContent = '';
  }

  function cancelEdit() {
    editingId = null;
    editContent = '';
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleAddMemory();
    }
  }

  function handleEditKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveEdit();
    } else if (event.key === 'Escape') {
      cancelEdit();
    }
  }

  function getTypeLabel(type: Memory['type']): string {
    switch (type) {
      case 'fact': return '事实';
      case 'preference': return '偏好';
      case 'context': return '上下文';
    }
  }

  function getTypeColor(type: Memory['type']): string {
    switch (type) {
      case 'fact': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'preference': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'context': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    }
  }

  function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 1) {
      const mins = Math.floor(diffMs / (1000 * 60));
      return `${mins}分钟前`;
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}小时前`;
    } else if (diffHours < 168) {
      return `${Math.floor(diffHours / 24)}天前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  }
</script>

<div class="space-y-4">
  <!-- Header with toggle -->
  <div class="flex items-center justify-between p-4 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
    <div>
      <div class="font-medium text-[var(--text-primary)]">记忆功能</div>
      <div class="text-sm text-[var(--text-secondary)]">存储重要的用户信息和偏好设置</div>
    </div>
    <button
      onclick={() => memoryStore.updateConfig({ enabled: !memoryStore.enabled })}
      class="relative w-12 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--button-primary-bg)] focus:ring-offset-2"
      class:bg-[var(--button-primary-bg)]={memoryStore.enabled}
      class:bg-[var(--border-color)]={!memoryStore.enabled}
    >
      <span
        class="absolute top-1 w-4 h-4 bg-white rounded-full transition-transform"
        class:left-1={!memoryStore.enabled}
        class:left-7={memoryStore.enabled}
      ></span>
    </button>
  </div>

  {#if memoryStore.enabled}
    <!-- Add new memory -->
    <div class="p-4 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
      <div class="flex gap-2 mb-3">
        <select
          bind:value={newMemoryType}
          class="px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--button-primary-bg)]"
        >
          <option value="fact">事实</option>
          <option value="preference">偏好</option>
          <option value="context">上下文</option>
        </select>
      </div>
      <div class="flex gap-2">
        <input
          type="text"
          bind:value={newMemoryContent}
          onkeydown={handleKeydown}
          placeholder="输入记忆内容，按回车添加..."
          class="flex-1 px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--button-primary-bg)]"
        />
        <button
          onclick={handleAddMemory}
          disabled={!newMemoryContent.trim()}
          class="px-4 py-2 bg-[var(--button-primary-bg)] hover:bg-[var(--button-primary-hover)] text-white rounded-lg transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--button-primary-bg)] focus:ring-offset-1"
        >
          添加
        </button>
      </div>
    </div>

    <!-- Auto-inject toggle -->
    <div class="flex items-center justify-between p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
      <div class="text-sm text-[var(--text-primary)]">自动注入到对话</div>
      <button
        onclick={() => memoryStore.updateConfig({ autoInject: !memoryStore.autoInject })}
        class="relative w-10 h-5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--button-primary-bg)] focus:ring-offset-2"
        class:bg-[var(--button-primary-bg)]={memoryStore.autoInject}
        class:bg-[var(--border-color)]={!memoryStore.autoInject}
      >
        <span
          class="absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform"
          class:left-0.5={!memoryStore.autoInject}
          class:left-5={memoryStore.autoInject}
        ></span>
      </button>
    </div>

    <!-- Search -->
    <div class="relative">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="搜索记忆..."
        class="w-full pl-10 pr-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--button-primary-bg)]"
      />
    </div>

    <!-- Memory list -->
    <div class="space-y-2 max-h-96 overflow-y-auto">
      {#if filteredMemories.length === 0}
        <div class="text-center py-8 text-[var(--text-secondary)]">
          <svg class="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <p class="text-sm">暂无记忆</p>
          <p class="text-xs opacity-50 mt-1">添加第一条记忆开始使用</p>
        </div>
      {:else}
        {#each filteredMemories as memory (memory.id)}
          <div class="p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] group">
            {#if editingId === memory.id}
              <div class="space-y-2">
                <textarea
                  bind:value={editContent}
                  onkeydown={handleEditKeydown}
                  rows="2"
                  class="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--button-primary-bg)]"
                ></textarea>
                <div class="flex justify-end gap-2">
                  <button
                    onclick={cancelEdit}
                    class="px-3 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] rounded transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--button-primary-bg)]"
                  >
                    取消
                  </button>
                  <button
                    onclick={saveEdit}
                    class="px-3 py-1 text-xs bg-[var(--button-primary-bg)] text-white rounded transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--button-primary-bg)]"
                  >
                    保存
                  </button>
                </div>
              </div>
            {:else}
              <div class="flex items-start justify-between gap-2">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-xs px-2 py-0.5 rounded-full {getTypeColor(memory.type)}">
                      {getTypeLabel(memory.type)}
                    </span>
                    <span class="text-xs text-[var(--text-tertiary)]">
                      {formatDate(memory.updatedAt)}
                    </span>
                  </div>
                  <p class="text-sm text-[var(--text-primary)]">{memory.content}</p>
                  {#if memory.keywords.length > 0}
                    <div class="flex flex-wrap gap-1 mt-2">
                      {#each memory.keywords as keyword}
                        <span class="text-xs px-1.5 py-0.5 bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded">
                          {keyword}
                        </span>
                      {/each}
                    </div>
                  {/if}
                </div>
                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onclick={() => startEdit(memory)}
                    class="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] rounded transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--button-primary-bg)]"
                    title="编辑"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onclick={() => memoryStore.deleteMemory(memory.id)}
                    class="p-1 text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                    title="删除"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            {/if}
          </div>
        {/each}
      {/if}
    </div>

    <!-- Memory count -->
    <div class="text-xs text-[var(--text-tertiary)] text-center">
      共 {memoryStore.memories.length} 条记忆
    </div>
  {/if}
</div>