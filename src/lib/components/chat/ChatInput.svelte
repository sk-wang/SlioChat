<script lang="ts">
  import { conversationsStore } from '$lib/stores/conversations.svelte';
  import { streamingStore } from '$lib/stores/streaming.svelte';
  import { workspaceStore } from '$lib/stores/workspace.svelte';
  import { chatService } from '$lib/services/chat.svelte';
  import { uiStore } from '$lib/stores/ui.svelte';
  import { vfs } from '$lib/services/sandbox.svelte';
  import CodeEditor from '$lib/components/ui/CodeEditor.svelte';

  interface FileSuggestion {
    name: string;
    path: string;
  }

  let inputValue = $state('');
  let editorEl: CodeEditor;
  let fileInputEl: HTMLInputElement;
  let showFileSuggestions = $state(false);
  let mentionStartPos = $state(-1);
  let filteredFiles = $state<FileSuggestion[]>([]);
  let selectedSuggestionIndex = $state(0);

  function adjustHeight() {
    // CodeEditor handles its own height
  }

  function handleInput(value: string) {
    inputValue = value;
    checkForMention();
  }

  function checkForMention() {
    const cursorPos = editorEl?.getSelectionStart() || 0;
    const textBeforeCursor = inputValue.slice(0, cursorPos);

    // Find the last @ symbol before cursor
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex === -1) {
      showFileSuggestions = false;
      return;
    }

    // Check if there's a space between @ and cursor (if so, don't show suggestions)
    const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
    if (textAfterAt.includes(' ')) {
      showFileSuggestions = false;
      return;
    }

    // Show suggestions
    mentionStartPos = lastAtIndex;
    const searchQuery = textAfterAt.toLowerCase();

    // Get all files from VFS (only files, not directories)
    const suggestions: FileSuggestion[] = [];
    vfs.files.forEach(entry => {
      if (entry.type === 'file' && entry.name.toLowerCase().includes(searchQuery)) {
        suggestions.push({
          name: entry.name,
          path: entry.path
        });
      }
    });

    filteredFiles = suggestions;
    showFileSuggestions = filteredFiles.length > 0;
    selectedSuggestionIndex = 0;
  }

  function selectFile(fileSuggestion: FileSuggestion) {
    // Pin the file
    workspaceStore.pinFile(fileSuggestion.path);

    // Replace @mention with file name
    const cursorPos = editorEl?.getSelectionStart() || inputValue.length;
    const beforeMention = inputValue.slice(0, mentionStartPos);
    const afterCursor = inputValue.slice(cursorPos);
    inputValue = beforeMention + `@${fileSuggestion.name} ` + afterCursor;

    // Close suggestions
    showFileSuggestions = false;

    // Focus back on editor
    editorEl?.focus();

    // Set cursor position after the inserted text
    setTimeout(() => {
      const newPos = beforeMention.length + fileSuggestion.name.length + 2;
      editorEl?.setSelectionRange(newPos, newPos);
    }, 0);
  }

  async function handleSend() {
    if (streamingStore.isGenerating) return;
    if (!inputValue.trim()) return;

    const message = inputValue.trim();
    inputValue = '';
    adjustHeight();

    await chatService.sendMessage(message);
  }

  function handleKeydown(event: KeyboardEvent) {
    // Handle file suggestion navigation
    if (showFileSuggestions) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, filteredFiles.length - 1);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, 0);
        return;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        if (filteredFiles[selectedSuggestionIndex]) {
          selectFile(filteredFiles[selectedSuggestionIndex]);
        }
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        showFileSuggestions = false;
        return;
      }
    }

    // Normal enter to send
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  function handleStop() {
    chatService.stop();
  }

  async function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const uploadedFileNames: string[] = [];

    for (const file of input.files) {
      try {
        // Write file directly to VFS /uploads/ directory
        const filePath = `/uploads/${file.name}`;

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

        // Auto-pin the uploaded file
        workspaceStore.pinFile(filePath);
        uploadedFileNames.push(file.name);
        uiStore.showToast(`已上传: ${file.name}`, 'success');
      } catch (error) {
        console.error('File processing error:', error);
        uiStore.showToast(`文件处理失败: ${file.name}`, 'error');
      }
    }

    // Auto-insert @ mentions for uploaded files
    if (uploadedFileNames.length > 0) {
      const mentions = uploadedFileNames.map(name => `@${name}`).join(' ');
      const cursorPos = editorEl?.getSelectionStart() || inputValue.length;
      const beforeCursor = inputValue.slice(0, cursorPos);
      const afterCursor = inputValue.slice(cursorPos);

      // Add space before if needed
      const needsSpaceBefore = beforeCursor.length > 0 && !beforeCursor.endsWith(' ');
      const prefix = needsSpaceBefore ? ' ' : '';

      inputValue = beforeCursor + prefix + mentions + ' ' + afterCursor;

      // Set cursor position after the inserted mentions
      setTimeout(() => {
        const newPos = cursorPos + prefix.length + mentions.length + 1;
        editorEl?.setSelectionRange(newPos, newPos);
        editorEl?.focus();
      }, 0);
    }

    input.value = '';
  }

  function triggerFileInput() {
    fileInputEl?.click();
  }

  async function handleClearChat() {
    if (streamingStore.isGenerating) return;
    const confirmed = await uiStore.confirm('清空确认', '确定要清空当前对话吗？');
    if (confirmed) {
      conversationsStore.clearMessages();
    }
  }
</script>

<div class="input-area">
  <div class="max-w-3xl mx-auto flex flex-col space-y-4">
    
    <div class="relative bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] shadow-sm focus-within:ring-1 focus-within:ring-[var(--border-color)] focus-within:border-[var(--border-color)]">
      
      <div class="absolute bottom-2 left-2">
        <input
          bind:this={fileInputEl}
          type="file"
          multiple
          accept=".pdf,.xlsx,.xls,.docx,.txt,.md,.json,.csv,.png,.jpg,.jpeg,.gif,.webp"
          class="hidden"
          onchange={handleFileSelect}
        />
        <button
          onclick={triggerFileInput}
          class="p-2 text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] rounded-full transition-colors duration-200"
          title="上传一个或多个文件"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <CodeEditor
        bind:this={editorEl}
        bind:value={inputValue}
        oninput={handleInput}
        onkeydown={handleKeydown}
        placeholder="给 AI 发送消息..."
        language="markdown"
      />

      <!-- File mention suggestions -->
      {#if showFileSuggestions}
        <div class="absolute bottom-full left-0 right-0 mb-2 mx-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">
          <div class="p-2">
            <div class="text-xs text-[var(--text-secondary)] px-2 py-1 mb-1">选择文件引用</div>
            {#each filteredFiles as fileSuggestion, index}
              <button
                class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors"
                class:bg-[var(--hover-bg)]={index === selectedSuggestionIndex}
                onclick={() => selectFile(fileSuggestion)}
                onmouseenter={() => selectedSuggestionIndex = index}
              >
                <span class="text-lg">📄</span>
                <div class="flex-1 min-w-0">
                  <div class="text-sm text-[var(--text-primary)] truncate">{fileSuggestion.name}</div>
                  <div class="text-xs text-[var(--text-secondary)] truncate">{fileSuggestion.path}</div>
                </div>
                {#if workspaceStore.isPinned(fileSuggestion.path)}
                  <span class="text-xs text-blue-600 dark:text-blue-400">已引用</span>
                {/if}
              </button>
            {/each}
          </div>
        </div>
      {/if}

      <div class="absolute bottom-2 right-2 flex items-center space-x-1">
        <button
          onclick={handleClearChat}
          class="p-2 text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] rounded-full transition-colors duration-200"
          title="清空对话"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>

        {#if streamingStore.isGenerating}
          <button
            onclick={handleStop}
            class="p-2 text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] rounded-full transition-colors duration-200"
            title="停止生成"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </button>
        {/if}

        <button
          onclick={handleSend}
          disabled={!inputValue.trim()}
          class="p-2 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-full hover:opacity-90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title="发送消息"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>

    <div class="text-center text-xs text-[var(--text-secondary)]">
      AI 可能会犯错。请核对重要信息。
    </div>
  </div>
</div>
<div style="height: env(safe-area-inset-bottom, 0px); width: 100%;"></div>
