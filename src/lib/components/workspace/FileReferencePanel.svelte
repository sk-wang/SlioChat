<script lang="ts">
  import { workspaceStore } from '$lib/stores/workspace.svelte';

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getFileIcon(type: string): string {
    if (type.startsWith('image/')) return '🖼️';
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('excel') || type.includes('spreadsheet')) return '📊';
    if (type.includes('text')) return '📃';
    return '📎';
  }
</script>

{#if workspaceStore.pinnedFiles.length > 0}
  <div class="file-references px-2 md:px-4 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
    <div class="max-w-3xl mx-auto">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-xs text-[var(--text-secondary)]">引用文件:</span>
        {#each workspaceStore.pinnedFiles as file}
          <div class="file-tag flex items-center gap-1.5 px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm">
            <span class="file-icon text-base">{getFileIcon(file.type)}</span>
            <span class="file-name text-[var(--text-primary)] truncate max-w-[150px]" title={file.name}>
              {file.name}
            </span>
            <span class="file-size text-xs text-[var(--text-secondary)]">
              {formatFileSize(file.size)}
            </span>
            <button
              onclick={() => workspaceStore.unpinFile(file.id)}
              class="unpin-btn p-0.5 hover:bg-[var(--hover-bg)] rounded transition-colors"
              title="取消引用"
            >
              <svg class="w-3.5 h-3.5 text-[var(--text-secondary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        {/each}
      </div>
    </div>
  </div>
{/if}
