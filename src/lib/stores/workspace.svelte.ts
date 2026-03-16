/**
 * Workspace Store - Manages workspaces and pinned file references
 * All files are stored in VFS for unified file system
 */

import { storage } from '$lib/services/storage';
import { vfs } from '$lib/services/sandbox.svelte';
import type { Workspace } from '$lib/types/workspace';

const STORAGE_KEY = 'workspaces';
const CURRENT_WORKSPACE_KEY = 'currentWorkspaceId';
const PINNED_FILES_KEY = 'pinnedFiles';

function generateId(): string {
  return `ws_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

class WorkspaceStore {
  #workspaces = $state<Workspace[]>([]);
  #currentWorkspaceId = $state<string | null>(null);
  #pinnedFiles = $state<Map<string, Set<string>>>(new Map()); // workspaceId -> Set<filePath>

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    const savedWorkspaces = storage.get<Workspace[]>(STORAGE_KEY, []);
    const savedCurrentId = storage.get<string | null>(CURRENT_WORKSPACE_KEY, null);
    const savedPinnedFiles = storage.get<[string, string[]][]>(PINNED_FILES_KEY, []);

    this.#workspaces = savedWorkspaces;
    this.#currentWorkspaceId = savedCurrentId;
    this.#pinnedFiles = new Map(savedPinnedFiles.map(([wsId, paths]) => [wsId, new Set(paths)]));

    // Create default workspace if none exists
    if (this.#workspaces.length === 0) {
      this.createDefaultWorkspace();
    }

    // Ensure current workspace is valid
    if (!this.#currentWorkspaceId || !this.#workspaces.find(w => w.id === this.#currentWorkspaceId)) {
      this.#currentWorkspaceId = this.#workspaces[0]?.id || null;
    }

    // Set VFS workspace
    if (this.#currentWorkspaceId) {
      vfs.setWorkspace(this.#currentWorkspaceId);
    }
  }

  private saveToStorage(): void {
    storage.set(STORAGE_KEY, this.#workspaces);

    // Serialize pinned files
    const serializablePinnedFiles = Array.from(this.#pinnedFiles.entries()).map(([wsId, paths]) => [
      wsId,
      Array.from(paths)
    ]);
    storage.set(PINNED_FILES_KEY, serializablePinnedFiles);

    if (this.#currentWorkspaceId) {
      storage.set(CURRENT_WORKSPACE_KEY, this.#currentWorkspaceId);
    }
  }

  // Getters
  get workspaces(): Workspace[] {
    return this.#workspaces;
  }

  get currentWorkspace(): Workspace | null {
    return this.#workspaces.find(w => w.id === this.#currentWorkspaceId) || null;
  }

  get currentWorkspaceId(): string | null {
    return this.#currentWorkspaceId;
  }

  get pinnedFilePaths(): string[] {
    if (!this.#currentWorkspaceId) return [];
    const paths = this.#pinnedFiles.get(this.#currentWorkspaceId) || new Set();
    return Array.from(paths);
  }

  // Workspace actions
  createDefaultWorkspace(): Workspace {
    const defaultWorkspace: Workspace = {
      id: 'default',
      name: '默认工作空间',
      description: '默认的工作空间',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      conversations: [],
      isDefault: true
    };

    this.#workspaces = [defaultWorkspace, ...this.#workspaces.filter(w => w.id !== 'default')];
    this.#currentWorkspaceId = defaultWorkspace.id;
    this.saveToStorage();

    return defaultWorkspace;
  }

  createWorkspace(name: string, description?: string): Workspace {
    const workspace: Workspace = {
      id: generateId(),
      name,
      description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      conversations: []
    };

    this.#workspaces = [...this.#workspaces, workspace];
    this.saveToStorage();

    return workspace;
  }

  updateWorkspace(id: string, updates: Partial<Pick<Workspace, 'name' | 'description'>>): void {
    this.#workspaces = this.#workspaces.map(w =>
      w.id === id ? { ...w, ...updates, updatedAt: Date.now() } : w
    );
    this.saveToStorage();
  }

  deleteWorkspace(id: string): void {
    const workspace = this.#workspaces.find(w => w.id === id);
    if (!workspace || workspace.isDefault) return;

    // Delete associated conversations
    import('./conversations.svelte').then(({ conversationsStore }) => {
      for (const convId of workspace.conversations) {
        conversationsStore.delete(convId);
      }
    });

    // Delete pinned files for this workspace
    this.#pinnedFiles.delete(id);

    this.#workspaces = this.#workspaces.filter(w => w.id !== id);

    // Switch to default workspace if current was deleted
    if (this.#currentWorkspaceId === id) {
      this.#currentWorkspaceId = this.#workspaces[0]?.id || null;
      if (this.#currentWorkspaceId) {
        vfs.setWorkspace(this.#currentWorkspaceId);
      }
    }

    this.saveToStorage();
  }

  setCurrentWorkspace(id: string): void {
    if (this.#workspaces.find(w => w.id === id)) {
      this.#currentWorkspaceId = id;
      storage.set(CURRENT_WORKSPACE_KEY, id);

      // Switch VFS workspace
      vfs.setWorkspace(id);

      // Switch to the first conversation in the workspace (if any)
      import('./conversations.svelte').then(({ conversationsStore }) => {
        const workspaceConvs = conversationsStore.getByWorkspace(id);
        if (workspaceConvs.length > 0) {
          conversationsStore.select(workspaceConvs[0].id);
        }
      });
    }
  }

  // Pinned files management
  pinFile(filePath: string): void {
    if (!this.#currentWorkspaceId) return;

    let pinnedSet = this.#pinnedFiles.get(this.#currentWorkspaceId);
    if (!pinnedSet) {
      pinnedSet = new Set();
      this.#pinnedFiles.set(this.#currentWorkspaceId, pinnedSet);
    }

    pinnedSet.add(filePath);
    this.saveToStorage();
  }

  unpinFile(filePath: string): void {
    if (!this.#currentWorkspaceId) return;

    const pinnedSet = this.#pinnedFiles.get(this.#currentWorkspaceId);
    if (pinnedSet) {
      pinnedSet.delete(filePath);
      this.saveToStorage();
    }
  }

  togglePinFile(filePath: string): void {
    if (this.isPinned(filePath)) {
      this.unpinFile(filePath);
    } else {
      this.pinFile(filePath);
    }
  }

  isPinned(filePath: string): boolean {
    if (!this.#currentWorkspaceId) return false;
    const pinnedSet = this.#pinnedFiles.get(this.#currentWorkspaceId);
    return pinnedSet ? pinnedSet.has(filePath) : false;
  }

  clearPinnedFiles(): void {
    if (!this.#currentWorkspaceId) return;
    this.#pinnedFiles.set(this.#currentWorkspaceId, new Set());
    this.saveToStorage();
  }

  // Conversation management
  addConversation(conversationId: string): void {
    if (!this.#currentWorkspaceId) return;

    this.#workspaces = this.#workspaces.map(w =>
      w.id === this.#currentWorkspaceId
        ? { ...w, conversations: [...w.conversations, conversationId], updatedAt: Date.now() }
        : w
    );
    this.saveToStorage();
  }

  removeConversation(conversationId: string): void {
    this.#workspaces = this.#workspaces.map(w =>
      w.conversations.includes(conversationId)
        ? { ...w, conversations: w.conversations.filter(id => id !== conversationId), updatedAt: Date.now() }
        : w
    );
    this.saveToStorage();
  }

  // Migration helper
  migrateOldConversations(conversations: Array<{ id: string; workspaceId?: string }>): void {
    for (const conv of conversations) {
      const targetWorkspaceId = conv.workspaceId || this.#currentWorkspaceId;
      if (!targetWorkspaceId) continue;

      this.#workspaces = this.#workspaces.map(w =>
        w.id === targetWorkspaceId && !w.conversations.includes(conv.id)
          ? { ...w, conversations: [...w.conversations, conv.id], updatedAt: Date.now() }
          : w
      );
    }
    this.saveToStorage();
  }
}

// Global workspace store instance
export const workspaceStore = new WorkspaceStore();
