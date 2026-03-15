/**
 * Virtual File System - IndexedDB-based sandbox filesystem
 */

const DB_NAME = 'slio-sandbox';
const DB_VERSION = 1;
const STORE_NAME = 'files';

export interface VFSFile {
  path: string;
  content: string;
  type: 'file' | 'directory';
  createdAt: number;
  updatedAt: number;
  size: number;
}

export interface VFSEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  updatedAt?: number;
}

class VirtualFileSystem {
  private db: IDBDatabase | null = null;
  private _isReady = $state(false);
  private _error = $state<string | null>(null);
  private _files = $state<VFSEntry[]>([]);
  private _currentFile = $state<string | null>(null);
  private _currentContent = $state('');
  private _currentWorkspaceId = $state<string | null>(null);

  get isReady(): boolean {
    return this._isReady;
  }

  get error(): string | null {
    return this._error;
  }

  get files(): VFSEntry[] {
    return this._files;
  }

  get currentFile(): string | null {
    return this._currentFile;
  }

  get currentContent(): string {
    return this._currentContent;
  }

  get currentWorkspaceId(): string | null {
    return this._currentWorkspaceId;
  }

  /**
   * Set current workspace ID for file isolation
   */
  setWorkspace(workspaceId: string): void {
    this._currentWorkspaceId = workspaceId;
    this.refreshFileTree();
  }

  /**
   * Get workspace prefix for file paths
   */
  private getWorkspacePrefix(): string {
    if (!this._currentWorkspaceId) {
      return '/default';
    }
    return `/ws-${this._currentWorkspaceId}`;
  }

  /**
   * Add workspace prefix to path
   */
  private addWorkspacePrefix(path: string): string {
    const prefix = this.getWorkspacePrefix();
    if (path.startsWith(prefix)) {
      return path;
    }
    // Normalize path first
    const normalized = this.normalizePath(path);
    return prefix + normalized;
  }

  /**
   * Remove workspace prefix from path for display
   */
  private removeWorkspacePrefix(path: string): string {
    const prefix = this.getWorkspacePrefix();
    if (path.startsWith(prefix)) {
      return path.slice(prefix.length) || '/';
    }
    return path;
  }

  /**
   * Initialize the database
   */
  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        this._error = 'Failed to open database';
        reject(new Error(this._error));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this._isReady = true;
        this.refreshFileTree();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'path' });
          store.createIndex('type', 'type', { unique: false });
        }
      };
    });
  }

  /**
   * Get a transaction
   */
  private getTransaction(mode: IDBTransactionMode = 'readonly'): IDBTransaction {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.transaction(STORE_NAME, mode);
  }

  /**
   * Read file content
   */
  async readFile(path: string): Promise<string> {
    await this.ensureReady();

    const fullPath = this.addWorkspacePrefix(path);

    return new Promise((resolve, reject) => {
      const tx = this.getTransaction();
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(fullPath);

      request.onsuccess = () => {
        const file = request.result as VFSFile | undefined;
        if (!file) {
          reject(new Error(`File not found: ${path}`));
          return;
        }
        if (file.type === 'directory') {
          reject(new Error(`Cannot read directory: ${path}`));
          return;
        }
        resolve(file.content);
      };

      request.onerror = () => {
        reject(new Error(`Failed to read file: ${path}`));
      };
    });
  }

  /**
   * Write file content
   */
  async writeFile(path: string, content: string): Promise<void> {
    await this.ensureReady();

    const fullPath = this.addWorkspacePrefix(path);
    const now = Date.now();

    // Check if file exists
    const existing = await this.getFile(fullPath);

    const file: VFSFile = {
      path: fullPath,
      content,
      type: 'file',
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      size: new Blob([content]).size
    };

    return new Promise((resolve, reject) => {
      const tx = this.getTransaction('readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(file);

      request.onsuccess = () => {
        this._currentFile = fullPath;
        this._currentContent = content;
        this.refreshFileTree();
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to write file: ${path}`));
      };
    });
  }

  /**
   * Delete file or directory
   */
  async delete(path: string): Promise<void> {
    await this.ensureReady();

    const fullPath = this.addWorkspacePrefix(path);

    return new Promise((resolve, reject) => {
      const tx = this.getTransaction('readwrite');
      const store = tx.objectStore(STORE_NAME);

      // If it's a directory, delete all files inside
      const range = IDBKeyRange.lowerBound(fullPath);
      const cursorRequest = store.openCursor(range);

      const toDelete: string[] = [];

      cursorRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const file = cursor.value as VFSFile;
          if (file.path === fullPath || file.path.startsWith(fullPath + '/')) {
            toDelete.push(file.path);
          }
          cursor.continue();
        } else {
          // Delete all collected paths
          let deleted = 0;
          for (const p of toDelete) {
            const deleteRequest = store.delete(p);
            deleteRequest.onsuccess = () => {
              deleted++;
              if (deleted === toDelete.length) {
                if (this._currentFile && toDelete.includes(this._currentFile)) {
                  this._currentFile = null;
                  this._currentContent = '';
                }
                this.refreshFileTree();
                resolve();
              }
            };
            deleteRequest.onerror = () => {
              reject(new Error(`Failed to delete: ${p}`));
            };
          }
          if (toDelete.length === 0) {
            resolve();
          }
        }
      };

      cursorRequest.onerror = () => {
        reject(new Error(`Failed to delete: ${path}`));
      };
    });
  }

  /**
   * Create directory
   */
  async mkdir(path: string): Promise<void> {
    await this.ensureReady();

    const fullPath = this.addWorkspacePrefix(path);
    const now = Date.now();

    const dir: VFSFile = {
      path: fullPath,
      content: '',
      type: 'directory',
      createdAt: now,
      updatedAt: now,
      size: 0
    };

    return new Promise((resolve, reject) => {
      const tx = this.getTransaction('readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(dir);

      request.onsuccess = () => {
        this.refreshFileTree();
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to create directory: ${path}`));
      };
    });
  }

  /**
   * List directory contents - includes subdirectories as virtual entries
   * Only shows files from current workspace
   */
  async listDir(path: string = '/'): Promise<VFSEntry[]> {
    await this.ensureReady();

    const workspacePrefix = this.getWorkspacePrefix();
    const fullPath = this.addWorkspacePrefix(path);
    const normalizedPath = this.normalizePath(path);
    const prefix = normalizedPath === '/' ? '' : normalizedPath.slice(1) + '/';

    return new Promise((resolve, reject) => {
      const tx = this.getTransaction();
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const allFiles = request.result as VFSFile[];
        const entryMap = new Map<string, VFSEntry>();

        // Filter files by workspace
        const workspaceFiles = allFiles.filter(file => file.path.startsWith(workspacePrefix));

        for (const file of workspaceFiles) {
          // Remove workspace prefix for processing
          const pathWithoutWorkspace = file.path.slice(workspacePrefix.length);
          const relativePath = pathWithoutWorkspace.slice(1); // Remove leading /

          if (normalizedPath === '/') {
            // Root: collect first-level items
            const parts = relativePath.split('/').filter(Boolean);
            if (parts.length === 0) continue;

            const firstPart = parts[0];

            if (parts.length === 1) {
              // Direct file in root
              entryMap.set(firstPart, {
                name: firstPart,
                path: '/' + firstPart,
                type: file.type,
                size: file.size,
                updatedAt: file.updatedAt
              });
            } else if (parts.length > 1) {
              // File in subdirectory - show directory
              const dirName = firstPart;
              if (!entryMap.has(dirName)) {
                entryMap.set(dirName, {
                  name: dirName,
                  path: '/' + dirName,
                  type: 'directory',
                  size: 0,
                  updatedAt: file.updatedAt
                });
              }
            }
          } else {
            // Subdirectory: show direct children
            if (relativePath.startsWith(prefix)) {
              const remainingPath = relativePath.slice(prefix.length);
              const parts = remainingPath.split('/').filter(Boolean);

              if (parts.length === 1) {
                // Direct child
                entryMap.set(parts[0], {
                  name: parts[0],
                  path: normalizedPath + '/' + parts[0],
                  type: file.type,
                  size: file.size,
                  updatedAt: file.updatedAt
                });
              } else if (parts.length > 1) {
                // Nested subdirectory
                const dirName = parts[0];
                if (!entryMap.has(dirName)) {
                  entryMap.set(dirName, {
                    name: dirName,
                    path: normalizedPath + '/' + dirName,
                    type: 'directory',
                    size: 0,
                    updatedAt: file.updatedAt
                  });
                }
              }
            }
          }
        }

        const entries = Array.from(entryMap.values());

        // Sort: directories first, then by name
        entries.sort((a, b) => {
          if (a.type !== b.type) {
            return a.type === 'directory' ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });

        resolve(entries);
      };

      request.onerror = () => {
        reject(new Error(`Failed to list directory: ${path}`));
      };
    });
  }

  /**
   * Check if file exists
   */
  async exists(path: string): Promise<boolean> {
    await this.ensureReady();

    const fullPath = this.addWorkspacePrefix(path);
    const file = await this.getFile(fullPath);
    return file !== undefined;
  }

  /**
   * Get file info
   */
  private async getFile(path: string): Promise<VFSFile | undefined> {
    return new Promise((resolve, reject) => {
      const tx = this.getTransaction();
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(path);

      request.onsuccess = () => {
        resolve(request.result as VFSFile | undefined);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get file: ${path}`));
      };
    });
  }

  /**
   * Refresh file tree
   */
  async refreshFileTree(): Promise<void> {
    try {
      const allFiles = await this.listDir('/');
      this._files = allFiles;
    } catch (error) {
      console.error('Failed to refresh file tree:', error);
    }
  }

  /**
   * Clear all files
   */
  async clear(): Promise<void> {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const tx = this.getTransaction('readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        this._files = [];
        this._currentFile = null;
        this._currentContent = '';
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to clear files'));
      };
    });
  }

  /**
   * Set current file for editing
   */
  async setCurrentFile(path: string): Promise<void> {
    const content = await this.readFile(path);
    this._currentFile = path;
    this._currentContent = content;
  }

  /**
   * Rename file or directory
   */
  async rename(oldPath: string, newPath: string): Promise<void> {
    await this.ensureReady();

    const normalizedOldPath = this.normalizePath(oldPath);
    const normalizedNewPath = this.normalizePath(newPath);

    // Check if source exists
    const sourceFile = await this.getFile(normalizedOldPath);
    if (!sourceFile) {
      throw new Error(`Source not found: ${oldPath}`);
    }

    // Check if destination already exists
    const destExists = await this.exists(normalizedNewPath);
    if (destExists) {
      throw new Error(`Destination already exists: ${newPath}`);
    }

    return new Promise((resolve, reject) => {
      const tx = this.getTransaction('readwrite');
      const store = tx.objectStore(STORE_NAME);

      // If it's a directory, rename all files inside
      if (sourceFile.type === 'directory') {
        const range = IDBKeyRange.lowerBound(normalizedOldPath);
        const cursorRequest = store.openCursor(range);
        const toRename: { oldPath: string; newPath: string; file: VFSFile }[] = [];

        cursorRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            const file = cursor.value as VFSFile;
            if (file.path === normalizedOldPath || file.path.startsWith(normalizedOldPath + '/')) {
              const relativePath = file.path.slice(normalizedOldPath.length);
              const newFilePath = normalizedNewPath + relativePath;
              toRename.push({ oldPath: file.path, newPath: newFilePath, file });
            }
            cursor.continue();
          } else {
            // Rename all collected files
            let renamed = 0;
            for (const item of toRename) {
              const newFile: VFSFile = { ...item.file, path: item.newPath };
              store.delete(item.oldPath);
              const putRequest = store.put(newFile);
              putRequest.onsuccess = () => {
                renamed++;
                if (renamed === toRename.length) {
                  this.refreshFileTree();
                  resolve();
                }
              };
              putRequest.onerror = () => reject(new Error(`Failed to rename: ${item.oldPath}`));
            }
            if (toRename.length === 0) resolve();
          }
        };
        cursorRequest.onerror = () => reject(new Error(`Failed to rename directory: ${oldPath}`));
      } else {
        // Single file rename
        const newFile: VFSFile = { ...sourceFile, path: normalizedNewPath };
        store.delete(normalizedOldPath);
        const request = store.put(newFile);
        request.onsuccess = () => {
          if (this._currentFile === normalizedOldPath) {
            this._currentFile = normalizedNewPath;
          }
          this.refreshFileTree();
          resolve();
        };
        request.onerror = () => reject(new Error(`Failed to rename: ${oldPath}`));
      }
    });
  }

  /**
   * Move file or directory to a different directory
   */
  async move(sourcePath: string, destDir: string): Promise<void> {
    await this.ensureReady();

    const normalizedSource = this.normalizePath(sourcePath);
    const normalizedDestDir = this.normalizePath(destDir);

    // Get the file name
    const fileName = normalizedSource.split('/').pop() || '';
    const newPath = normalizedDestDir === '/' ? `/${fileName}` : `${normalizedDestDir}/${fileName}`;

    await this.rename(normalizedSource, newPath);
  }

  /**
   * Update current content (for editor)
   */
  setCurrentContent(content: string): void {
    this._currentContent = content;
  }

  /**
   * Ensure database is ready
   */
  private async ensureReady(): Promise<void> {
    if (!this._isReady) {
      await this.init();
    }
  }

  /**
   * Normalize path
   */
  private normalizePath(path: string): string {
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    // Remove trailing slash (except for root)
    if (path !== '/' && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    return path;
  }
}

// Global VFS instance
export const vfs = new VirtualFileSystem();
