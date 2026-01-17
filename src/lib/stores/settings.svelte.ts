import type { ApiConfig, ModelConfig } from '$lib/types';
import { storage } from '$lib/services/storage';

const DEFAULT_CONFIG: ApiConfig = {
  defaultUrl: 'https://0f68edf33a3a4219a5ab9d9ae6b3034c-cn-hangzhou.alicloudapi.com/compatible-mode/v1/chat/completions',
  defaultKey: 'none',
  defaultModel: 'qwen2-57b-a14b-instruct',
  defaultVlm: 'qwen2.5-vl-3b-instruct',
  titleGenerationModel: 'qwen2-57b-a14b-instruct',
  searchJudgerModel: 'qwen2-57b-a14b-instruct',
  defaultSystemPrompt: '你是一位专业、友善且富有同理心的AI助手。你会根据问题的复杂程度调整回答方式：对于复杂问题，你会条理清晰地展示思考过程并给出详细解释；对于简单问题，你会直接给出准确简洁的答案。',
  models: {
    'deepseek-r1-distill-qwen-32b': {
      name: 'r1-fast',
      type: 'thinking',
      url: 'https://0f68edf33a3a4219a5ab9d9ae6b3034c-cn-hangzhou.alicloudapi.com/compatible-mode/v1/chat/completions',
      key: 'none',
    },
    'qwen2-57b-a14b-instruct': {
      name: 'qwen2-57b',
      type: 'normal',
      url: 'https://0f68edf33a3a4219a5ab9d9ae6b3034c-cn-hangzhou.alicloudapi.com/compatible-mode/v1/chat/completions',
      key: 'none',
    },
  },
  contextCount: 20,
  chatTypes: {
    normal: {
      name: '普通对话',
      systemPrompt: '你是一位专业、友善且富有同理心的AI助手。你会根据问题的复杂程度调整回答方式：对于复杂问题，你会条理清晰地展示思考过程并给出详细解释；对于简单问题，你会直接给出准确简洁的答案。',
    },
    translator: {
      name: '翻译助手',
      systemPrompt: '你是一个好用的翻译助手。请将我的中文翻译成英文，将所有非中文的翻译成中文。我发给你所有的话都是需要翻译的内容，你只需要回答翻译结果。翻译结果请符合中文的语言习惯。',
    },
    it: {
      name: 'IT专家',
      systemPrompt: '我希望你充当 IT 专家。我会向您提供有关我的技术问题所需的所有信息，而您的职责是解决我的问题。你应该使用你的项目管理知识，敏捷开发知识来解决我的问题。在您的回答中使用适合所有级别的人的智能、简单和易于理解的语言将很有帮助。用要点逐步解释您的解决方案很有帮助。我希望您回复解决方案，而不是写任何解释。',
    },
    redbook: {
      name: '小红书文案生成',
      systemPrompt: '小红书的风格是：很吸引眼球的标题，每个段落都加 emoji, 最后加一些 tag。请用小红书风格',
    },
    midjourney: {
      name: 'MJ提示词大师',
      systemPrompt: '从现在开始，你是一名中英翻译，你会根据我输入的中文内容，翻译成对应英文。请注意，你翻译后的内容主要服务于一个绘画AI，它只能理解具象的描述而非抽象的概念，同时根据你对绘画AI的理解，比如它可能的训练模型、自然语言处理方式等方面，进行翻译优化。由于我的描述可能会很散乱，不连贯，你需要综合考虑这些问题，然后对翻译后的英文内容再次优化或重组，从而使绘画AI更能清楚我在说什么。请严格按照此条规则进行翻译，也只输出翻译后的英文内容。',
    },
  },
  search: {
    url: 'https://api.bochaai.com/v1/web-search',
    enabled: false,
    token: '',
  },
};

class SettingsStore {
  #config: ApiConfig;
  #selectedModel = $state<string>('');

  constructor() {
    const storedModels = storage.get<Record<string, ModelConfig> | null>('models', null);
    const storedBochaKey = storage.get<string>('bochaApiKey', '');
    const storedSearchEnabled = storage.get<boolean>('bochaSearchEnabled', false);
    const storedTitleModel = storage.get<string | null>('titleGenerationModel', null);
    const storedSearchJudger = storage.get<string | null>('searchJudgerModel', null);
    const storedPreferredModel = storage.get<string>('preferred-model', DEFAULT_CONFIG.defaultModel);

    this.#config = $state<ApiConfig>({
      ...DEFAULT_CONFIG,
      models: storedModels || DEFAULT_CONFIG.models,
      titleGenerationModel: storedTitleModel || DEFAULT_CONFIG.titleGenerationModel,
      searchJudgerModel: storedSearchJudger || DEFAULT_CONFIG.searchJudgerModel,
      search: {
        ...DEFAULT_CONFIG.search,
        token: storedBochaKey,
        enabled: storedSearchEnabled,
      },
    });

    this.#selectedModel = storedPreferredModel;
  }

  get config() { return this.#config; }
  get selectedModel() { return this.#selectedModel; }
  get currentModelConfig() { return this.#config.models[this.#selectedModel]; }
  get modelList() { return Object.entries(this.#config.models); }
  get isThinkingModel() { return this.currentModelConfig?.type === 'thinking'; }

  selectModel(modelId: string): void {
    if (this.#config.models[modelId]) {
      this.#selectedModel = modelId;
      storage.set('preferred-model', modelId);
    }
  }

  addModel(id: string, model: ModelConfig): void {
    this.#config.models[id] = model;
    storage.set('models', this.#config.models);
  }

  updateModel(id: string, model: Partial<ModelConfig>): void {
    if (this.#config.models[id]) {
      this.#config.models[id] = { ...this.#config.models[id], ...model };
      storage.set('models', this.#config.models);
    }
  }

  removeModel(id: string): void {
    delete this.#config.models[id];
    this.#config.models = { ...this.#config.models };
    storage.set('models', this.#config.models);
  }

  updateSearch(updates: Partial<{ token: string; enabled: boolean; url: string }>): void {
    if (updates.token !== undefined) {
      this.#config.search.token = updates.token;
      storage.set('bochaApiKey', updates.token);
    }
    if (updates.enabled !== undefined) {
      this.#config.search.enabled = updates.enabled;
      storage.set('bochaSearchEnabled', updates.enabled);
    }
    if (updates.url !== undefined) {
      this.#config.search.url = updates.url;
    }
  }

  setTitleModel(modelId: string): void {
    this.#config.titleGenerationModel = modelId;
    storage.set('titleGenerationModel', modelId);
  }

  setSearchJudgerModel(modelId: string): void {
    this.#config.searchJudgerModel = modelId;
    storage.set('searchJudgerModel', modelId);
  }
}

export const settingsStore = new SettingsStore();
