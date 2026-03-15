/**
 * Workspace Store - Manages workspaces, files, and their associations
 * Files are stored in VFS (sandbox) for unified file system
 */

import { storage } from '$lib/services/storage';
import { vfs } from '$lib/services/sandbox.svelte';
import { clearFileCache, clearAllFileCache } from '$lib/tools/fileTools';
import type { Workspace, WorkspaceFile } from '$lib/types/workspace';

const STORAGE_KEY = 'workspaces';
const FILES_KEY = 'workspaceFiles';
const CURRENT_WORKSPACE_KEY = 'currentWorkspaceId';

function generateId(): string {
  return `ws_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function generateFileId(): string {
  return `file_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

class WorkspaceStore {
  #workspaces = $state<Workspace[]>([]);
  #currentWorkspaceId = $state<string | null>(null);
  #files = $state<Map<string, WorkspaceFile>>(new Map());

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    const savedWorkspaces = storage.get<Workspace[]>(STORAGE_KEY, []);
    const savedFiles = storage.get<[string, WorkspaceFile][]>(FILES_KEY, []);
    const savedCurrentId = storage.get<string | null>(CURRENT_WORKSPACE_KEY, null);

    this.#workspaces = savedWorkspaces;
    this.#files = new Map(savedFiles);
    this.#currentWorkspaceId = savedCurrentId;

    // Create default workspace if none exists
    if (this.#workspaces.length === 0) {
      this.createDefaultWorkspace();
    }

    // Ensure current workspace is valid
    if (!this.#currentWorkspaceId || !this.#workspaces.find(w => w.id === this.#currentWorkspaceId)) {
      this.#currentWorkspaceId = this.#workspaces[0]?.id || null;
    }
  }

  private saveToStorage(): void {
    storage.set(STORAGE_KEY, this.#workspaces);
    storage.set(FILES_KEY, Array.from(this.#files.entries()));
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

  get files(): WorkspaceFile[] {
    const workspace = this.currentWorkspace;
    if (!workspace) return [];
    return workspace.files.map(id => this.#files.get(id)).filter(Boolean) as WorkspaceFile[];
  }

  // Workspace actions
  createDefaultWorkspace(): Workspace {
    const defaultWorkspace: Workspace = {
      id: 'default',
      name: '默认工作空间',
      description: '默认的工作空间',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      files: [],
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
      files: [],
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

    // Delete associated files
    for (const fileId of workspace.files) {
      this.#files.delete(fileId);
    }

    this.#workspaces = this.#workspaces.filter(w => w.id !== id);

    // Switch to default workspace if current was deleted
    if (this.#currentWorkspaceId === id) {
      this.#currentWorkspaceId = this.#workspaces[0]?.id || null;
    }

    this.saveToStorage();
  }

  setCurrentWorkspace(id: string): void {
    if (this.#workspaces.find(w => w.id === id)) {
      this.#currentWorkspaceId = id;
      storage.set(CURRENT_WORKSPACE_KEY, id);
    }
  }

  // File actions - files are stored in VFS for unified file system
  async addFile(file: File): Promise<WorkspaceFile> {
    const currentWs = this.currentWorkspace;
    if (!currentWs) throw new Error('No current workspace');

    // Check if file is binary (PDF, images, Word, Excel, etc.)
    const isBinary = file.type === 'application/pdf' ||
                     file.type.startsWith('image/') ||
                     file.type.includes('word') ||
                     file.type.includes('excel') ||
                     file.type.includes('spreadsheet') ||
                     file.type.includes('powerpoint') ||
                     file.name.endsWith('.pdf') ||
                     file.name.endsWith('.docx') ||
                     file.name.endsWith('.doc') ||
                     file.name.endsWith('.xlsx') ||
                     file.name.endsWith('.xls') ||
                     file.name.endsWith('.pptx') ||
                     /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(file.name);

    let vfsPath: string | undefined;

    console.log('Adding file to workspace:', file.name, 'type:', file.type, 'isBinary:', isBinary);

    if (isBinary) {
      // For binary files, convert to base64 using FileReader
      const base64 = await fileToBase64(file);
      vfsPath = `/uploads/${file.name}`;
      await vfs.writeFile(vfsPath, base64);
      console.log('Stored binary file in VFS:', vfsPath);
    } else {
      // For text files, use text() as before
      const content = await file.text();
      vfsPath = `/uploads/${file.name}`;
      await vfs.writeFile(vfsPath, content);
      console.log('Stored text file in VFS:', vfsPath);
    }

    const workspaceFile: WorkspaceFile = {
      id: generateFileId(),
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      uploadedAt: Date.now(),
      vfsPath,
      rawFile: file, // Keep for backward compatibility
      isBinary
    };

    this.#files.set(workspaceFile.id, workspaceFile);
    this.#workspaces = this.#workspaces.map(w =>
      w.id === currentWs.id
        ? { ...w, files: [...w.files, workspaceFile.id], updatedAt: Date.now() }
        : w
    );

    this.saveToStorage();
    return workspaceFile;
  }

  async removeFile(fileId: string): Promise<void> {
    const currentWs = this.currentWorkspace;
    if (!currentWs) return;

    const file = this.#files.get(fileId);
    if (file?.vfsPath) {
      // Delete from VFS
      try {
        await vfs.delete(file.vfsPath);
      } catch (e) {
        // Ignore error if file doesn't exist in VFS
      }
    }

    // Clear processed cache
    clearFileCache(fileId);

    this.#files.delete(fileId);
    this.#workspaces = this.#workspaces.map(w =>
      w.id === currentWs.id
        ? { ...w, files: w.files.filter(id => id !== fileId), updatedAt: Date.now() }
        : w
    );

    this.saveToStorage();
  }

  getFile(fileId: string): WorkspaceFile | undefined {
    return this.#files.get(fileId);
  }

  getFileByName(name: string): WorkspaceFile | undefined {
    return this.files.find(f => f.name === name);
  }

  // Conversation actions
  addConversation(conversationId: string): void {
    const currentWs = this.currentWorkspace;
    if (!currentWs) return;

    this.#workspaces = this.#workspaces.map(w =>
      w.id === currentWs.id
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

  // Migration: Import old conversations to default workspace
  migrateOldConversations(conversationIds: string[]): void {
    const defaultWs = this.#workspaces.find(w => w.isDefault);
    if (!defaultWs) return;

    this.#workspaces = this.#workspaces.map(w =>
      w.id === defaultWs.id
        ? { ...w, conversations: [...new Set([...w.conversations, ...conversationIds])], updatedAt: Date.now() }
        : w
    );

    this.saveToStorage();
  }

  // Get all conversation IDs for current workspace
  getConversationIds(): string[] {
    return this.currentWorkspace?.conversations || [];
  }

  // Clear all files in current workspace
  async clearFiles(): Promise<void> {
    const currentWs = this.currentWorkspace;
    if (!currentWs) return;

    // Delete files from VFS
    for (const fileId of currentWs.files) {
      const file = this.#files.get(fileId);
      if (file?.vfsPath) {
        try {
          await vfs.delete(file.vfsPath);
        } catch (e) {
          // Ignore error
        }
      }
      this.#files.delete(fileId);
    }

    // Clear all processed cache
    clearAllFileCache();

    this.#workspaces = this.#workspaces.map(w =>
      w.id === currentWs.id
        ? { ...w, files: [], updatedAt: Date.now() }
        : w
    );

    this.saveToStorage();
  }
}

/**
 * Convert File to base64 string using FileReader
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:application/pdf;base64,")
      const base64 = result.split(',')[1];
      if (!base64) {
        reject(new Error('Failed to extract base64 from FileReader result'));
        return;
      }
      console.log('Converted file to base64:', file.name, 'type:', file.type, 'base64 length:', base64.length);
      resolve(base64);
    };
    reader.onerror = () => reject(new Error(`FileReader error for ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export const workspaceStore = new WorkspaceStore();
