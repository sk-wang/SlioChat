<script lang="ts">
  import { uiStore } from '$lib/stores/ui.svelte';
  import { settingsStore } from '$lib/stores/settings.svelte';
  import { chatService } from '$lib/services/chat.svelte';
  import { conversationsStore } from '$lib/stores/conversations.svelte';

  let activeTab = $state('general');
  let fileInput: HTMLInputElement;

  function handleClose() {
    uiStore.closeModal('settings');
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }

  function addModel() {
    const newId = 'model_' + Date.now();
    settingsStore.addModel(newId, {
      name: '新模型',
      type: 'normal',
      url: '',
      key: '',
    });
  }

  function removeModel(modelId: string) {
    settingsStore.removeModel(modelId);
  }

  function updateModel(modelId: string, field: string, value: string) {
    settingsStore.updateModel(modelId, { [field]: value });
  }

  function updateSearch(field: string, value: string | boolean) {
    if (field === 'enabled') {
        settingsStore.updateSearch({ enabled: value as boolean });
    } else if (field === 'token') {
        settingsStore.updateSearch({ token: value as string });
    }
  }

  function updateSystemPrompt(value: string) {
    conversationsStore.updateSystemPrompt(value);
  }

  function handleExport() {
    chatService.exportConversation();
  }

  function handleImportClick() {
    fileInput?.click();
  }

  function handleFileChange(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files?.[0]) {
      chatService.importConversation(target.files[0]);
      target.value = '';
      handleClose();
    }
  }

  const models = $derived(Object.entries(settingsStore.config.models));
  const searchConfig = $derived(settingsStore.config.search);
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
  onclick={handleBackdropClick}
  onkeydown={(e) => e.key === 'Escape' && handleClose()}
  role="dialog"
  aria-modal="true"
  tabindex="-1"
>
  <div class="bg-[var(--bg-secondary)] rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
    <div class="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
      <h2 class="text-xl font-semibold text-[var(--text-primary)]">设置</h2>
      <button
        class="p-2 text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] rounded-lg transition-colors"
        onclick={handleClose}
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <div class="flex border-b border-[var(--border-color)]">
      <button
        class="px-4 py-3 text-sm font-medium transition-colors"
        class:text-[var(--button-primary-bg)]={activeTab === 'general'}
        class:border-b-2={activeTab === 'general'}
        class:border-[var(--button-primary-bg)]={activeTab === 'general'}
        class:text-[var(--text-secondary)]={activeTab !== 'general'}
        onclick={() => activeTab = 'general'}
      >
        通用设置
      </button>
      <button
        class="px-4 py-3 text-sm font-medium transition-colors"
        class:text-[var(--button-primary-bg)]={activeTab === 'models'}
        class:border-b-2={activeTab === 'models'}
        class:border-[var(--button-primary-bg)]={activeTab === 'models'}
        class:text-[var(--text-secondary)]={activeTab !== 'models'}
        onclick={() => activeTab = 'models'}
      >
        模型设置
      </button>
      <button
        class="px-4 py-3 text-sm font-medium transition-colors"
        class:text-[var(--button-primary-bg)]={activeTab === 'search'}
        class:border-b-2={activeTab === 'search'}
        class:border-[var(--button-primary-bg)]={activeTab === 'search'}
        class:text-[var(--text-secondary)]={activeTab !== 'search'}
        onclick={() => activeTab = 'search'}
      >
        搜索设置
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-4">
      {#if activeTab === 'general'}
        <div class="space-y-4">
          <div class="p-4 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
            <label class="block text-sm font-medium text-[var(--text-primary)] mb-2">当前对话系统提示词</label>
            <textarea
              value={conversationsStore.current?.systemPrompt || ''}
              rows="6"
              placeholder="设置AI助手的行为和风格..."
              class="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] resize-none"
              oninput={(e) => updateSystemPrompt((e.target as HTMLTextAreaElement).value)}
            ></textarea>
          </div>
        </div>
      {:else if activeTab === 'models'}
        <div class="space-y-4">
          {#each models as [modelId, modelInfo]}
            <div class="p-4 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
              <div class="flex items-center justify-between mb-3">
                <span class="font-medium text-[var(--text-primary)]">{modelInfo.name}</span>
                <button
                  class="p-1 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                  onclick={() => removeModel(modelId)}
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={modelInfo.name}
                  placeholder="模型名称"
                  class="px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]"
                  oninput={(e) => updateModel(modelId, 'name', (e.target as HTMLInputElement).value)}
                />
                <select
                  value={modelInfo.type}
                  class="px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]"
                  onchange={(e) => updateModel(modelId, 'type', (e.target as HTMLSelectElement).value)}
                >
                  <option value="normal">普通模型</option>
                  <option value="thinking">思考模型</option>
                </select>
                <input
                  type="text"
                  value={modelInfo.url}
                  placeholder="API URL"
                  class="col-span-2 px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]"
                  oninput={(e) => updateModel(modelId, 'url', (e.target as HTMLInputElement).value)}
                />
                <input
                  type="password"
                  value={modelInfo.key || ''}
                  placeholder="API Key"
                  class="col-span-2 px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]"
                  oninput={(e) => updateModel(modelId, 'key', (e.target as HTMLInputElement).value)}
                />
              </div>
            </div>
          {/each}
          
          <button
            class="w-full p-3 border-2 border-dashed border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] hover:border-[var(--button-primary-bg)] hover:text-[var(--button-primary-bg)] transition-colors"
            onclick={addModel}
          >
            + 添加模型
          </button>
        </div>
      {:else if activeTab === 'search'}
        <div class="space-y-4">
          <div class="flex items-center justify-between p-4 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
            <div>
              <div class="font-medium text-[var(--text-primary)]">启用博查搜索</div>
              <div class="text-sm text-[var(--text-secondary)]">允许AI在需要时进行网络搜索</div>
            </div>
            <button
              class="relative w-12 h-6 rounded-full transition-colors"
              class:bg-[var(--button-primary-bg)]={searchConfig.enabled}
              class:bg-[var(--border-color)]={!searchConfig.enabled}
              onclick={() => updateSearch('enabled', !searchConfig.enabled)}
            >
              <span
                class="absolute top-1 w-4 h-4 bg-white rounded-full transition-transform"
                class:left-1={!searchConfig.enabled}
                class:left-7={searchConfig.enabled}
              ></span>
            </button>
          </div>
          
          <div class="p-4 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
            <label class="block text-sm font-medium text-[var(--text-primary)] mb-2">博查 API Token</label>
            <input
              type="password"
              value={searchConfig.token}
              placeholder="输入博查API Token"
              class="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]"
              oninput={(e) => updateSearch('token', (e.target as HTMLInputElement).value)}
            />
          </div>
        </div>
      {/if}
    </div>

    <div class="p-4 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] rounded-b-xl flex justify-between items-center">
      <div class="flex gap-2">
        <input
          bind:this={fileInput}
          type="file"
          accept=".json"
          class="hidden"
          onchange={handleFileChange}
        />
        <button
          onclick={handleImportClick}
          class="px-4 py-2 text-sm text-[var(--text-primary)] bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--hover-bg)] transition-colors"
        >
          导入对话
        </button>
        <button
          onclick={handleExport}
          class="px-4 py-2 text-sm text-[var(--text-primary)] bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--hover-bg)] transition-colors"
        >
          导出对话
        </button>
      </div>
      <button
        onclick={handleClose}
        class="px-4 py-2 text-sm text-white bg-[var(--button-primary-bg)] hover:bg-[var(--button-primary-hover)] rounded-lg transition-colors"
      >
        关闭
      </button>
    </div>
  </div>
</div>
