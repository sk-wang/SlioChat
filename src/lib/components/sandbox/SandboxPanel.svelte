<script lang="ts">
  import { vfs, type VFSEntry } from '$lib/services/sandbox.svelte';
  import { agentStore } from '$lib/stores/agent.svelte';
  import { workspaceStore } from '$lib/stores/workspace.svelte';
  import { uiStore } from '$lib/stores/ui.svelte';
  import { onMount } from 'svelte';

  let activeTab = $state<'files' | 'editor'>('files');
  let currentPath = $state('/');
  let fileContent = $state('');
  let selectedFile = $state<string | null>(null);
  let isEditing = $state(false);
  let currentEntries = $state<VFSEntry[]>([]);

  // Initialize VFS on mount and load initial entries
  onMount(async () => {
    await vfs.init();
    await refreshCurrentEntries();
  });

  // Refresh entries when path changes
  $effect(() => {
    if (vfs.isReady) {
      refreshCurrentEntries();
    }
  });

  async function refreshCurrentEntries() {
    try {
      currentEntries = await vfs.listDir(currentPath);
    } catch (e) {
      console.error('Failed to list directory:', e);
      currentEntries = [];
    }
  }

  async function handleFileClick(entry: VFSEntry) {
    if (entry.type === 'directory') {
      currentPath = entry.path;
      selectedEntry = null; // Clear selection when navigating
    } else {
      // Toggle selection for files
      if (selectedEntry?.path === entry.path) {
        // If already selected, open in editor
        selectedFile = entry.path;
        fileContent = await vfs.readFile(entry.path);
        activeTab = 'editor';
      } else {
        selectedEntry = entry;
      }
    }
  }

  function handleFileDblClick(entry: VFSEntry) {
    // Double click directly opens file
    if (entry.type === 'file') {
      selectedFile = entry.path;
      vfs.readFile(entry.path).then(content => {
        fileContent = content;
        activeTab = 'editor';
      });
    }
  }

  async function handleSave() {
    if (selectedFile && fileContent) {
      await vfs.writeFile(selectedFile, fileContent);
      isEditing = false;
    }
  }

  function handleBack() {
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    currentPath = '/' + parts.join('/') || '/';
    selectedEntry = null; // Clear selection when navigating
  }

  async function handleRefresh() {
    await vfs.refreshFileTree();
    await refreshCurrentEntries();
    selectedEntry = null; // Clear selection on refresh
  }

  async function handleClear() {
    if (confirm('确定要清空所有文件吗？此操作不可恢复。')) {
      await vfs.clear();
      // Also clear workspace file records
      await workspaceStore.clearFiles();
      await refreshCurrentEntries();
    }
  }

  // Get current file name for display
  const currentFileName = $derived(selectedFile?.split('/').pop() || '');

  // File operations
  let editingEntry = $state<VFSEntry | null>(null);
  let editName = $state('');
  let selectedEntry = $state<VFSEntry | null>(null); // For mobile-friendly selection

  async function handleDelete(entry: VFSEntry) {
    if (confirm(`确定要删除 "${entry.name}" 吗？`)) {
      try {
        await vfs.delete(entry.path);
        if (selectedFile === entry.path) {
          selectedFile = null;
          fileContent = '';
        }
        await refreshCurrentEntries();
        uiStore.showToast('删除成功', 'success');
      } catch (e) {
        uiStore.showToast('删除失败: ' + (e as Error).message, 'error');
      }
    }
  }

  function startRename(entry: VFSEntry) {
    editingEntry = entry;
    editName = entry.name;
  }

  async function handleRename() {
    if (!editingEntry || !editName.trim()) {
      editingEntry = null;
      return;
    }

    const newPath = currentPath === '/' ? `/${editName.trim()}` : `${currentPath}/${editName.trim()}`;

    try {
      await vfs.rename(editingEntry.path, newPath);
      if (selectedFile === editingEntry.path) {
        selectedFile = newPath;
      }
      await refreshCurrentEntries();
      uiStore.showToast('重命名成功', 'success');
    } catch (e) {
      uiStore.showToast('重命名失败: ' + (e as Error).message, 'error');
    }
    editingEntry = null;
  }

  async function handleMove(entry: VFSEntry) {
    const destPath = prompt('请输入目标目录路径 (例如: /uploads):', '/uploads');
    if (!destPath) return;

    try {
      await vfs.move(entry.path, destPath);
      await refreshCurrentEntries();
      uiStore.showToast('移动成功', 'success');
    } catch (e) {
      uiStore.showToast('移动失败: ' + (e as Error).message, 'error');
    }
  }
</script>

{#if agentStore.showSandbox}
  <div class="sandbox-panel fixed inset-0 z-50 flex flex-col bg-[var(--bg-primary)] border-l border-[var(--border-color)] md:relative md:inset-auto md:z-auto md:w-80">
    <!-- Header -->
    <div class="sandbox-header flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
      <h3 class="text-base font-semibold">沙箱</h3>
      <div class="flex items-center gap-4">
        <button
          class="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          onclick={handleRefresh}
          title="刷新"
        >
          🔄
        </button>
        <button
          class="text-xs text-[var(--text-secondary)] hover:text-red-500"
          onclick={handleClear}
          title="清空"
        >
          🗑️
        </button>
        <button
          class="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          onclick={() => agentStore.setShowSandbox(false)}
        >
          ✕
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex border-b border-[var(--border-color)]">
      <button
        class="flex-1 px-4 py-2 text-sm transition-colors"
        class:text-[var(--text-primary)]={activeTab === 'files'}
        class:border-b-2={activeTab === 'files'}
        class:border-[var(--accent-color)]={activeTab === 'files'}
        class:text-[var(--text-secondary)]={activeTab !== 'files'}
        onclick={() => activeTab = 'files'}
      >
        文件
      </button>
      <button
        class="flex-1 px-4 py-2 text-sm transition-colors"
        class:text-[var(--text-primary)]={activeTab === 'editor'}
        class:border-b-2={activeTab === 'editor'}
        class:border-[var(--accent-color)]={activeTab === 'editor'}
        class:text-[var(--text-secondary)]={activeTab !== 'editor'}
        onclick={() => activeTab = 'editor'}
      >
        编辑器
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-hidden">
      {#if activeTab === 'files'}
        <!-- File Browser -->
        <div class="h-full overflow-y-auto">
          <!-- Path breadcrumb -->
          <div class="px-3 py-2 bg-[var(--bg-secondary)] text-xs text-[var(--text-secondary)] flex items-center gap-2">
            {#if currentPath !== '/'}
              <button onclick={handleBack} class="hover:text-[var(--text-primary)]">⬅️</button>
            {/if}
            <span class="font-mono">{currentPath}</span>
          </div>

          <!-- File list -->
          <div class="p-2" onclick={(e) => {
            // Clear selection when clicking on empty space
            if (e.target === e.currentTarget) {
              selectedEntry = null;
            }
          }}>
            {#if vfs.isReady}
              {#if currentEntries.length === 0}
                <div class="text-center text-[var(--text-secondary)] text-sm py-8">
                  暂无文件<br/>
                  <span class="text-xs">上传文件或让 Agent 生成文件</span>
                </div>
              {:else}
                {#each currentEntries as entry}
                  {@const isSelected = selectedEntry?.path === entry.path}
                  <div
                    class="flex flex-col rounded-lg hover:bg-[var(--bg-secondary)] min-h-[48px]"
                    class:bg-[var(--hover-bg)]={selectedFile === entry.path}
                  >
                    <!-- File row -->
                    <div class="flex items-center gap-2 px-3 py-2">
                      <button
                        class="flex-1 flex items-center gap-3 text-left"
                        onclick={() => handleFileClick(entry)}
                        ondblclick={() => handleFileDblClick(entry)}
                      >
                        <span>{entry.type === 'directory' ? '📁' : '📄'}</span>
                        {#if editingEntry?.path === entry.path}
                          <input
                            type="text"
                            bind:value={editName}
                            class="flex-1 px-2 py-1 text-sm bg-[var(--bg-primary)] border border-[var(--border-color)] rounded"
                            onkeydown={(e) => e.key === 'Enter' && handleRename()}
                            onblur={handleRename}
                            autofocus
                          />
                        {:else}
                          <span class="truncate" class:font-medium={isSelected}>{entry.name}</span>
                        {/if}
                        {#if entry.size && entry.type !== 'directory'}
                          <span class="text-xs text-[var(--text-secondary)]">
                            {entry.size < 1024 ? entry.size + 'B' : (entry.size / 1024).toFixed(1) + 'KB'}
                          </span>
                        {/if}
                      </button>

                      <!-- Quick action indicator for selected item on mobile -->
                      {#if isSelected && editingEntry?.path !== entry.path}
                        <span class="text-xs text-[var(--accent-color)] md:hidden">已选择</span>
                      {/if}
                    </div>

                    <!-- File actions - show for selected file -->
                    {#if isSelected && editingEntry?.path !== entry.path}
                      <div class="flex items-center gap-1 px-3 pb-2 border-b border-[var(--border-color)]/50">
                        <button
                          class="flex-1 flex items-center justify-center gap-1 p-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] rounded transition-colors"
                          onclick={() => startRename(entry)}
                          title="重命名"
                        >
                          ✏️ 重命名
                        </button>
                        <button
                          class="flex-1 flex items-center justify-center gap-1 p-2 text-xs text-[var(--text-secondary)] hover:text-blue-500 hover:bg-blue-500/10 rounded transition-colors"
                          onclick={() => handleMove(entry)}
                          title="移动"
                        >
                          📤 移动
                        </button>
                        <button
                          class="flex-1 flex items-center justify-center gap-1 p-2 text-xs text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                          onclick={() => handleDelete(entry)}
                          title="删除"
                        >
                          🗑️ 删除
                        </button>
                      </div>
                    {/if}
                  </div>
                {/each}
              {/if}
            {:else}
              <div class="text-center text-[var(--text-secondary)] text-sm py-8">
                加载中...
              </div>
            {/if}
          </div>
        </div>
      {:else}
        <!-- Editor -->
        <div class="h-full flex flex-col">
          {#if selectedFile}
            <div class="px-3 py-3 bg-[var(--bg-secondary)] text-sm font-mono text-[var(--text-secondary)] flex items-center justify-between">
              <span class="truncate max-w-[200px] md:max-w-[180px]" title={selectedFile}>
                {currentFileName}
              </span>
              <button
                class="hover:text-[var(--text-primary)] p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                class:opacity-50={!isEditing}
                onclick={handleSave}
                disabled={!isEditing}
                title="保存"
              >
                💾
              </button>
            </div>
            <textarea
              class="flex-1 w-full p-4 bg-transparent text-base font-mono resize-none focus:outline-none"
              bind:value={fileContent}
              oninput={() => isEditing = true}
              placeholder="文件内容..."
            ></textarea>
          {:else}
            <div class="flex-1 flex items-center justify-center text-[var(--text-secondary)] text-base">
              选择一个文件来编辑
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}
