export interface Memory {
  id: string;
  type: 'fact' | 'preference' | 'context';
  content: string;
  keywords: string[];
  createdAt: number;
  updatedAt: number;
}

export interface MemoryConfig {
  enabled: boolean;
  autoInject: boolean;
  maxMemories: number;
}

export const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
  enabled: true,
  autoInject: true,
  maxMemories: 50,
};