import type { ModelConfig, ChatTypeConfig } from './model';

export interface SearchConfig {
  url: string;
  enabled: boolean;
  token: string;
}

export interface ApiConfig {
  defaultUrl: string;
  defaultKey: string;
  defaultModel: string;
  defaultVlm: string;
  titleGenerationModel: string;
  searchJudgerModel: string;
  defaultSystemPrompt: string;
  models: Record<string, ModelConfig>;
  contextCount: number;
  chatTypes: Record<string, ChatTypeConfig>;
  search: SearchConfig;
}
