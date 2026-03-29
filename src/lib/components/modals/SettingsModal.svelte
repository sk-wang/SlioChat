<script lang="ts">
  import { uiStore } from '$lib/stores/ui.svelte';
  import { settingsStore, API_PROVIDERS, type ApiProvider } from '$lib/stores/settings.svelte';
  import { chatService } from '$lib/services/chat.svelte';
  import { conversationsStore } from '$lib/stores/conversations.svelte';
  import { fetchModelList, type ModelInfo } from '$lib/services/api';
  import type { ModelConfig } from '$lib/types';
  import MemoryPanel from '$lib/components/memory/MemoryPanel.svelte';

  let activeTab = $state('general');
  let fileInput: HTMLInputElement;
  let selectedProviders: Record<string, string> = $state({});
  let availableModels: Record<string, ModelInfo[]> = $state({});
  let loadingModels: Record<string, boolean> = $state({});

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

  function handleProviderChange(modelId: string, providerId: string) {
    selectedProviders[modelId] = providerId;
    const provider = API_PROVIDERS.find(p => p.id === providerId);
    if (provider && provider.url) {
      updateModel(modelId, 'url', provider.url);
    }
    // Clear available models when provider changes
    delete availableModels[modelId];
  }

  async function fetchModels(modelId: string) {
    const modelInfo = settingsStore.config.models[modelId];
    if (!modelInfo?.url) return;

    loadingModels[modelId] = true;
    try {
      const models = await fetchModelList(modelInfo.url, modelInfo.key || '');
      availableModels[modelId] = models;
    } catch (e) {
      console.error('Failed to fetch models:', e);
      availableModels[modelId] = [];
    } finally {
      loadingModels[modelId] = false;
    }
  }

  function selectModel(modelId: string, modelName: string) {
    updateModel(modelId, 'name', modelName);
  }

  function getProviderForModel(modelInfo: ModelConfig): ApiProvider {
    // Try to auto-detect provider from URL
    const url = modelInfo.url || '';
    try {
      const matched = API_PROVIDERS.find(p =>
        p.id !== 'custom' && p.url && url.includes(new URL(p.url).hostname)
      );
      return matched || API_PROVIDERS[0];
    } catch {
      return API_PROVIDERS[0];
    }
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
  const modelIds = $derived(Object.keys(settingsStore.config.models));
  const vlmModel = $derived(settingsStore.config.defaultVlm);
  const titleModel = $derived(settingsStore.config.titleGenerationModel);
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
        class="p-2 text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--button-primary-bg)] focus:ring-inset"
        onclick={handleClose}
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <div class="flex border-b border-[var(--border-color)]">
      <button
        class="px-4 py-3 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--button-primary-bg)] focus:ring-inset rounded-t"
        class:text-[var(--button-primary-bg)]={activeTab === 'general'}
        class:border-b-2={activeTab === 'general'}
        class:border-[var(--button-primary-bg)]={activeTab === 'general'}
        class:text-[var(--text-secondary)]={activeTab !== 'general'}
        onclick={() => activeTab = 'general'}
      >
        通用设置
      </button>
      <button
        class="px-4 py-3 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--button-primary-bg)] focus:ring-inset rounded-t"
        class:text-[var(--button-primary-bg)]={activeTab === 'models'}
        class:border-b-2={activeTab === 'models'}
        class:border-[var(--button-primary-bg)]={activeTab === 'models'}
        class:text-[var(--text-secondary)]={activeTab !== 'models'}
        onclick={() => activeTab = 'models'}
      >
        模型设置
      </button>
      <button
        class="px-4 py-3 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--button-primary-bg)] focus:ring-inset rounded-t"
        class:text-[var(--button-primary-bg)]={activeTab === 'search'}
        class:border-b-2={activeTab === 'search'}
        class:border-[var(--button-primary-bg)]={activeTab === 'search'}
        class:text-[var(--text-secondary)]={activeTab !== 'search'}
        onclick={() => activeTab = 'search'}
      >
        搜索设置
      </button>
      <button
        class="px-4 py-3 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--button-primary-bg)] focus:ring-inset rounded-t"
        class:text-[var(--button-primary-bg)]={activeTab === 'memory'}
        class:border-b-2={activeTab === 'memory'}
        class:border-[var(--button-primary-bg)]={activeTab === 'memory'}
        class:text-[var(--text-secondary)]={activeTab !== 'memory'}
        onclick={() => activeTab = 'memory'}
      >
        记忆
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
            {@const provider = getProviderForModel(modelInfo)}
            <div class="p-4 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
              <div class="flex items-center justify-between mb-3">
                <span class="font-medium text-[var(--text-primary)]">{modelInfo.name}</span>
                <button
                  class="p-1 text-red-500 hover:bg-red-500/10 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                  onclick={() => removeModel(modelId)}
                  title="删除模型"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              <div class="space-y-3">
                <div class="grid grid-cols-2 gap-3">
                  <!-- Model Selection -->
                  <div class="col-span-2 flex gap-2">
                    {#if availableModels[modelId]?.length > 0}
                      <select
                        value={modelInfo.name}
                        class="flex-1 px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]"
                        onchange={(e) => selectModel(modelId, (e.target as HTMLSelectElement).value)}
                      >
                        <option value="">选择模型</option>
                        {#each availableModels[modelId] as m}
                          <option value={m.id}>{m.id}</option>
                        {/each}
                      </select>
                    {:else}
                      <input
                        type="text"
                        value={modelInfo.name}
                        placeholder="模型名称"
                        class="flex-1 px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]"
                        oninput={(e) => updateModel(modelId, 'name', (e.target as HTMLInputElement).value)}
                      />
                    {/if}
                    <select
                      value={modelInfo.type}
                      class="w-28 px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]"
                      onchange={(e) => updateModel(modelId, 'type', (e.target as HTMLSelectElement).value)}
                    >
                      <option value="normal">普通</option>
                      <option value="thinking">思考</option>
                    </select>
                  </div>
                </div>

                <!-- Provider Selection -->
                <div class="grid grid-cols-2 gap-3">
                  <select
                    value={selectedProviders[modelId] || provider.id}
                    class="px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]"
                    onchange={(e) => handleProviderChange(modelId, (e.target as HTMLSelectElement).value)}
                  >
                    <option value="" disabled>选择服务商</option>
                    {#each API_PROVIDERS as p}
                      <option value={p.id}>{p.name}</option>
                    {/each}
                  </select>
                  <input
                    type="password"
                    value={modelInfo.key || ''}
                    placeholder={provider.keyPlaceholder || 'API Key'}
                    class="px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]"
                    oninput={(e) => updateModel(modelId, 'key', (e.target as HTMLInputElement).value)}
                  />
                </div>

                <!-- API URL (editable) -->
                <div class="flex gap-2">
                  <input
                    type="text"
                    value={modelInfo.url}
                    placeholder="API URL"
                    class="flex-1 px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]"
                    oninput={(e) => updateModel(modelId, 'url', (e.target as HTMLInputElement).value)}
                  />
                  <button
                    class="px-3 py-2 text-sm bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-colors whitespace-nowrap flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[var(--button-primary-bg)] focus:ring-offset-1"
                    onclick={() => fetchModels(modelId)}
                    disabled={loadingModels[modelId] || !modelInfo.url}
                    title="获取可用模型列表"
                  >
                    {#if loadingModels[modelId]}
                      <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>加载中</span>
                    {:else}
                      <span>获取模型</span>
                    {/if}
                  </button>
                </div>

                {#if provider.keyHelp}
                  <div class="text-xs text-[var(--text-secondary)]">
                    {provider.keyHelp}
                  </div>
                {/if}
              </div>
            </div>
          {/each}
          
          <button
            class="w-full p-3 border-2 border-dashed border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] hover:border-[var(--button-primary-bg)] hover:text-[var(--button-primary-bg)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--button-primary-bg)] focus:ring-offset-1"
            onclick={addModel}
          >
            + 添加模型
          </button>

          <!-- Special Purpose Models -->
          <div class="p-4 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] mt-4">
            <h4 class="text-sm font-medium text-[var(--text-primary)] mb-3">专用模型配置</h4>
            <div class="space-y-3">
              <!-- VLM Model -->
              <div>
                <label class="block text-xs text-[var(--text-secondary)] mb-1">视觉模型 (VLM)</label>
                <select
                  value={vlmModel}
                  class="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]"
                  onchange={(e) => settingsStore.setVlmModel((e.target as HTMLSelectElement).value)}
                >
                  <option value="">选择模型</option>
                  {#each models as [id, modelInfo]}
                    <option value={id}>{modelInfo.name}</option>
                  {/each}
                </select>
                <div class="text-xs text-[var(--text-secondary)] mt-1">
                  用于图片理解和视觉任务
                </div>
              </div>

              <!-- Title Generation Model -->
              <div>
                <label class="block text-xs text-[var(--text-secondary)] mb-1">标题生成模型</label>
                <select
                  value={titleModel}
                  class="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]"
                  onchange={(e) => settingsStore.setTitleModel((e.target as HTMLSelectElement).value)}
                >
                  <option value="">选择模型</option>
                  {#each models as [id, modelInfo]}
                    <option value={id}>{modelInfo.name}</option>
                  {/each}
                </select>
                <div class="text-xs text-[var(--text-secondary)] mt-1">
                  用于自动生成对话标题
                </div>
              </div>
            </div>
          </div>
        </div>
      {:else if activeTab === 'search'}
        <div class="space-y-4">
          <div class="flex items-center justify-between p-4 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
            <div>
              <div class="font-medium text-[var(--text-primary)]">启用博查搜索</div>
              <div class="text-sm text-[var(--text-secondary)]">允许AI在需要时进行网络搜索</div>
            </div>
            <button
              class="relative w-12 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--button-primary-bg)] focus:ring-offset-2"
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
      {:else if activeTab === 'memory'}
        <MemoryPanel />
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
          class="px-4 py-2 text-sm text-[var(--text-primary)] bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--hover-bg)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--button-primary-bg)] focus:ring-offset-1"
        >
          导入对话
        </button>
        <button
          onclick={handleExport}
          class="px-4 py-2 text-sm text-[var(--text-primary)] bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--hover-bg)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--button-primary-bg)] focus:ring-offset-1"
        >
          导出对话
        </button>
      </div>
      <button
        onclick={handleClose}
        class="px-4 py-2 text-sm text-white bg-[var(--button-primary-bg)] hover:bg-[var(--button-primary-hover)] rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--button-primary-bg)] focus:ring-offset-1"
      >
        关闭
      </button>
    </div>
  </div>
</div>
