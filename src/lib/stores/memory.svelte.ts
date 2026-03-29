import type { Memory, MemoryConfig } from '$lib/types/memory';
import { DEFAULT_MEMORY_CONFIG } from '$lib/types/memory';
import { storage } from '$lib/services/storage';

class MemoryStore {
  private _memories = $state<Memory[]>(storage.get<Memory[]>('memories', []));
  private _config = $state<MemoryConfig>({
    ...DEFAULT_MEMORY_CONFIG,
    ...storage.get<Partial<MemoryConfig>>('memoryConfig', {}),
  });

  constructor() {}

  get memories() { return this._memories; }
  get config() { return this._config; }
  get enabled() { return this._config.enabled; }
  get autoInject() { return this._config.autoInject; }

  private _save() {
    storage.set('memories', this._memories);
  }

  private _saveConfig() {
    storage.set('memoryConfig', this._config);
  }

  addMemory(content: string, type: Memory['type'] = 'fact', keywords: string[] = []): string {
    const id = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Extract keywords from content if not provided
    const extractedKeywords = keywords.length > 0
      ? keywords
      : content.split(/[,，.。!！?？\s]+/).filter(w => w.length > 1).slice(0, 5);

    const memory: Memory = {
      id,
      type,
      content,
      keywords: extractedKeywords,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this._memories = [memory, ...this._memories];
    this._save();
    return id;
  }

  updateMemory(id: string, updates: Partial<Pick<Memory, 'content' | 'type' | 'keywords'>>): void {
    const idx = this._memories.findIndex(m => m.id === id);
    if (idx !== -1) {
      this._memories[idx] = {
        ...this._memories[idx],
        ...updates,
        updatedAt: Date.now(),
      };
      this._memories = [...this._memories];
      this._save();
    }
  }

  deleteMemory(id: string): void {
    this._memories = this._memories.filter(m => m.id !== id);
    this._save();
  }

  searchMemories(query: string): Memory[] {
    const lowerQuery = query.toLowerCase();
    return this._memories.filter(m =>
      m.content.toLowerCase().includes(lowerQuery) ||
      m.keywords.some(k => k.toLowerCase().includes(lowerQuery))
    );
  }

  getMemoriesByType(type: Memory['type']): Memory[] {
    return this._memories.filter(m => m.type === type);
  }

  getRecentMemories(count: number = 10): Memory[] {
    return [...this._memories]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, count);
  }

  getRelevantMemories(message: string, count: number = 5): Memory[] {
    const words = message.toLowerCase().split(/[,，.。!！?？\s]+/).filter(w => w.length > 1);

    const scored = this._memories.map(m => {
      let score = 0;
      // Check content match
      const lowerContent = m.content.toLowerCase();
      words.forEach(w => {
        if (lowerContent.includes(w)) score += 2;
      });
      // Check keyword match
      m.keywords.forEach(k => {
        if (words.some(w => k.toLowerCase().includes(w))) score += 3;
      });
      // Recency boost
      const hoursAge = (Date.now() - m.updatedAt) / (1000 * 60 * 60);
      if (hoursAge < 24) score += 5;
      else if (hoursAge < 168) score += 2; // 1 week

      return { memory: m, score };
    });

    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map(s => s.memory);
  }

  formatMemoriesForPrompt(memories: Memory[]): string {
    if (memories.length === 0) return '';
    return memories.map(m => `[记忆: ${m.content}]`).join('\n');
  }

  updateConfig(updates: Partial<MemoryConfig>): void {
    this._config = { ...this._config, ...updates };
    this._saveConfig();
  }

  clearAllMemories(): void {
    this._memories = [];
    this._save();
  }

  importMemories(memories: Memory[]): void {
    const existingIds = new Set(this._memories.map(m => m.id));
    const newMemories = memories.filter(m => !existingIds.has(m.id));
    this._memories = [...newMemories, ...this._memories];
    this._save();
  }

  exportMemories(): Memory[] {
    return [...this._memories];
  }
}

export const memoryStore = new MemoryStore();