export type ModelType = 'thinking' | 'normal';

export interface ModelConfig {
  name: string;
  type: ModelType;
  url: string;
  key: string;
}

export interface ChatTypeConfig {
  name: string;
  systemPrompt: string;
}
