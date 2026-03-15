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
  let previewImage = $state<{ path: string; data: string } | null>(null);
  let fileInputEl: HTMLInputElement;

  // Check if file is an image
  function isImageFile(filename: string): boolean {
    return /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(filename);
  }

  // Handle file upload from sandbox
  async function handleSandboxFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    for (const file of input.files) {
      try {
        // Write file directly to VFS
        const filePath = `/${file.name}`;

        // Read file content - handle both text and binary files
        let content: string;
        if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.json') || file.name.endsWith('.csv')) {
          // Text file
          content = await file.text();
        } else {
          // Binary file - convert to base64
          const arrayBuffer = await file.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          content = btoa(binary);
        }

        await vfs.writeFile(filePath, content);
        // Don't auto-pin files uploaded from sandbox
        uiStore.showToast(`已上传: ${file.name}`, 'success');
      } catch (error) {
        console.error('File upload error:', error);
        uiStore.showToast(`上传失败: ${file.name}`, 'error');
      }
    }

    input.value = '';
    await refreshCurrentEntries();
  }

  function triggerFileUpload() {
    fileInputEl?.click();
  }

  // Pin/reference file from sandbox
  async function handlePinFile(entry: VFSEntry) {
    try {
      // Toggle pin status using file path
      workspaceStore.togglePinFile(entry.path);
      const isPinned = workspaceStore.isPinned(entry.path);
      uiStore.showToast(isPinned ? '已引用到对话' : '已取消引用', 'success');
    } catch (error) {
      console.error('Pin file error:', error);
      uiStore.showToast('操作失败', 'error');
    }
  }

  // Initialize VFS on mount and load initial entries
  onMount(async () => {
    await vfs.init();
    // Set current workspace for VFS isolation
    const currentWorkspaceId = workspaceStore.currentWorkspaceId;
    if (currentWorkspaceId) {
      vfs.setWorkspace(currentWorkspaceId);
    }
    await refreshCurrentEntries();
  });

  // Refresh entries when path changes or workspace changes
  $effect(() => {
    if (vfs.isReady) {
      const currentWorkspaceId = workspaceStore.currentWorkspaceId;
      if (currentWorkspaceId && vfs.currentWorkspaceId !== currentWorkspaceId) {
        vfs.setWorkspace(currentWorkspaceId);
        currentPath = '/'; // Reset to root when switching workspace
      }
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
        // Delete from VFS
        await vfs.delete(entry.path);

        // Also remove from workspace file references
        const fileToRemove = workspaceStore.currentWorkspace?.files.find(fileId => {
          const file = workspaceStore.getFile(fileId);
          return file?.vfsPath === entry.path;
        });

        if (fileToRemove) {
          await workspaceStore.removeFile(fileToRemove);
        }

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

  async function handleDownload(entry: VFSEntry) {
    try {
      const content = await vfs.readFile(entry.path);
      const blob = new Blob([content], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = entry.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      uiStore.showToast('下载开始', 'success');
    } catch (e) {
      uiStore.showToast('下载失败: ' + (e as Error).message, 'error');
    }
  }

  async function handlePreviewImage(entry: VFSEntry) {
    try {
      const content = await vfs.readFile(entry.path);
      // Check if content is base64 or data URL
      const imageData = content.startsWith('data:') ? content : `data:image/png;base64,${content}`;
      previewImage = { path: entry.path, data: imageData };
    } catch (e) {
      uiStore.showToast('预览失败: ' + (e as Error).message, 'error');
    }
  }

  function closeImagePreview() {
    previewImage = null;
  }

</script>

{#if agentStore.showSandbox}
  <div class="sandbox-panel fixed inset-0 z-50 flex flex-col bg-[var(--bg-primary)] border-l border-[var(--border-color)] md:relative md:inset-auto md:z-auto md:w-80">
    <!-- Header -->
    <div class="sandbox-header flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
      <h3 class="text-base font-semibold">沙箱</h3>
      <div class="flex items-center gap-1">
        <input
          bind:this={fileInputEl}
          type="file"
          multiple
          accept=".pdf,.xlsx,.xls,.docx,.txt,.md,.json,.csv,.png,.jpg,.jpeg,.gif,.webp"
          class="hidden"
          onchange={handleSandboxFileUpload}
        />
        <button
          class="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] rounded transition-colors"
          onclick={triggerFileUpload}
          title="上传文件"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </button>
        <button
          class="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] rounded transition-colors"
          onclick={handleRefresh}
          title="刷新"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
            <path d="M21 3v5h-5"/>
          </svg>
        </button>
        <button
          class="p-2 text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
          onclick={handleClear}
          title="清空"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18"/>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
          </svg>
        </button>
        <button
          class="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] rounded transition-colors"
          onclick={() => agentStore.setShowSandbox(false)}
          title="关闭"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex border-b border-[var(--border-color)]">
      <button
        class="flex-1 px-4 py-2 text-sm transition-colors"
        class:text-[var(--text-primary)]={activeTab === 'files'}
        class:border-b-2={activeTab === 'files'}
        class:border-[var(--button-primary-bg)]={activeTab === 'files'}
        class:text-[var(--text-secondary)]={activeTab !== 'files'}
        onclick={() => activeTab = 'files'}
      >
        文件
      </button>
      <button
        class="flex-1 px-4 py-2 text-sm transition-colors"
        class:text-[var(--text-primary)]={activeTab === 'editor'}
        class:border-b-2={activeTab === 'editor'}
        class:border-[var(--button-primary-bg)]={activeTab === 'editor'}
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
              <button onclick={handleBack} class="p-1 hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] rounded transition-colors" title="返回">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M19 12H5"/>
                  <path d="M12 19l-7-7 7-7"/>
                </svg>
              </button>
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
                        {#if entry.type === 'directory'}
                          <svg class="w-4 h-4 text-yellow-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                          </svg>
                        {:else}
                          <svg class="w-4 h-4 text-[var(--text-secondary)] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <path d="M14 2v6h6"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                            <line x1="10" y1="9" x2="8" y2="9"/>
                          </svg>
                        {/if}
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
                        <span class="text-xs text-[var(--button-primary-bg)] md:hidden">已选择</span>
                      {/if}
                    </div>

                    <!-- File actions - show for selected file -->
                    {#if isSelected && editingEntry?.path !== entry.path}
                      <div class="flex items-center gap-1 px-3 pb-2 border-b border-[var(--border-color)]/50">
                        {#if entry.type === 'file'}
                          {@const isPinned = workspaceStore.isPinned(entry.path)}
                          <button
                            class="flex-1 flex items-center justify-center gap-1 p-2 text-xs transition-colors rounded {isPinned ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900' : 'text-[var(--text-secondary)] hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900'}"
                            onclick={() => handlePinFile(entry)}
                            title={isPinned ? "取消引用" : "引用到对话"}
                          >
                            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill={isPinned ? "currentColor" : "none"} stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M12 17v5"/>
                              <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>
                            </svg>
                            {isPinned ? "已引用" : "引用"}
                          </button>
                        {/if}
                        <button
                          class="flex-1 flex items-center justify-center gap-1 p-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] rounded transition-colors"
                          onclick={() => startRename(entry)}
                          title="重命名"
                        >
                          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                          重命名
                        </button>
                        <button
                          class="flex-1 flex items-center justify-center gap-1 p-2 text-xs text-[var(--text-secondary)] hover:text-blue-500 hover:bg-blue-500/10 rounded transition-colors"
                          onclick={() => handleMove(entry)}
                          title="移动"
                        >
                          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M5 9l-3 3 3 3"/>
                            <path d="M9 5l3-3 3 3"/>
                            <path d="M15 19l-3 3-3-3"/>
                            <path d="M19 9l3 3-3 3"/>
                            <line x1="2" y1="12" x2="22" y2="12"/>
                            <line x1="12" y1="2" x2="12" y2="22"/>
                          </svg>
                          移动
                        </button>
                        {#if entry.type === 'file'}
                          {#if isImageFile(entry.name)}
                            <button
                              class="flex-1 flex items-center justify-center gap-1 p-2 text-xs text-[var(--text-secondary)] hover:text-purple-500 hover:bg-purple-500/10 rounded transition-colors"
                              onclick={() => handlePreviewImage(entry)}
                              title="预览图片"
                            >
                              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                <circle cx="8.5" cy="8.5" r="1.5"/>
                                <polyline points="21 15 16 10 5 21"/>
                              </svg>
                              预览
                            </button>
                          {/if}
                          <button
                            class="flex-1 flex items-center justify-center gap-1 p-2 text-xs text-[var(--text-secondary)] hover:text-green-500 hover:bg-green-500/10 rounded transition-colors"
                            onclick={() => handleDownload(entry)}
                            title="下载"
                          >
                            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                              <polyline points="7 10 12 15 17 10"/>
                              <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                            下载
                          </button>
                        {/if}
                        <button
                          class="flex-1 flex items-center justify-center gap-1 p-2 text-xs text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                          onclick={() => handleDelete(entry)}
                          title="删除"
                        >
                          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 6h18"/>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                          </svg>
                          删除
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
                class="hover:text-[var(--text-primary)] p-2 hover:bg-[var(--hover-bg)] rounded transition-colors flex items-center justify-center"
                class:opacity-50={!isEditing}
                onclick={handleSave}
                disabled={!isEditing}
                title="保存"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/>
                  <polyline points="7 3 7 8 15 8"/>
                </svg>
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

<!-- Image Preview Modal -->
{#if previewImage}
  <div
    class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
    onclick={closeImagePreview}
  >
    <div
      class="relative max-w-[90vw] max-h-[90vh] bg-[var(--bg-primary)] rounded-lg shadow-2xl overflow-hidden"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <h3 class="text-sm font-medium truncate max-w-[300px]" title={previewImage.path}>
          {previewImage.path.split('/').pop()}
        </h3>
        <button
          class="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] rounded transition-colors"
          onclick={closeImagePreview}
          title="关闭"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <!-- Image -->
      <div class="p-4 overflow-auto max-h-[calc(90vh-60px)]">
        <img
          src={previewImage.data}
          alt={previewImage.path}
          class="max-w-full h-auto mx-auto"
        />
      </div>
    </div>
  </div>
{/if}
