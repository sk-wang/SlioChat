import type { PendingFile } from '$lib/types';

class FilesStore {
  #pendingFiles = $state<PendingFile[]>([]);

  get files() { return this.#pendingFiles; }
  get hasFiles() { return this.#pendingFiles.length > 0; }

  add(file: PendingFile): void {
    this.#pendingFiles = [...this.#pendingFiles, file];
  }

  remove(index: number): void {
    this.#pendingFiles = this.#pendingFiles.filter((_, i) => i !== index);
  }

  clear(): void {
    this.#pendingFiles = [];
  }

  getAndClear(): PendingFile[] {
    const files = [...this.#pendingFiles];
    this.#pendingFiles = [];
    return files;
  }
}

export const filesStore = new FilesStore();
