import { storage } from '$lib/services/storage';
import type { ToastMessage } from '$lib/types';

class UIStore {
  #sidebarOpen = $state(false);
  #sidebarCollapsed = $state(storage.get('pc-sidebar-collapsed', false));
  #settingsOpen = $state(false);
  #editModalOpen = $state(false);
  #editingMessageIndex = $state<number | null>(null);
  #chatTypeDialogOpen = $state(false);
  #htmlPreviewOpen = $state(false);
  #htmlPreviewContent = $state('');
  #chatTypeResolve: ((type: string | null) => void) | null = null;

  #confirmDialog = $state<{
    open: boolean;
    title: string;
    message: string;
    resolve?: (v: boolean) => void;
  }>({ open: false, title: '', message: '' });

  #toasts = $state<ToastMessage[]>([]);

  get sidebarOpen() { return this.#sidebarOpen; }
  get sidebarCollapsed() { return this.#sidebarCollapsed; }
  get settingsOpen() { return this.#settingsOpen; }
  get editModalOpen() { return this.#editModalOpen; }
  get editingMessageIndex() { return this.#editingMessageIndex; }
  get chatTypeDialogOpen() { return this.#chatTypeDialogOpen; }
  get confirmDialog() { return this.#confirmDialog; }
  get toasts() { return this.#toasts; }
  get htmlPreviewContent() { return this.#htmlPreviewContent; }

  // Modals getter for App.svelte compatibility
  get modals() {
    return {
      settings: this.#settingsOpen,
      confirm: this.#confirmDialog.open,
      chatType: this.#chatTypeDialogOpen,
      editMessage: this.#editingMessageIndex,
      htmlPreview: this.#htmlPreviewOpen,
    };
  }

  toggleSidebar(): void { this.#sidebarOpen = !this.#sidebarOpen; }
  closeSidebar(): void { this.#sidebarOpen = false; }
  
  togglePCSidebar(): void {
    this.#sidebarCollapsed = !this.#sidebarCollapsed;
    storage.set('pc-sidebar-collapsed', this.#sidebarCollapsed);
  }

  openSettings(): void { this.#settingsOpen = true; }
  closeSettings(): void { this.#settingsOpen = false; }

  openEditModal(index: number): void {
    this.#editingMessageIndex = index;
    this.#editModalOpen = true;
  }

  closeEditModal(): void {
    this.#editModalOpen = false;
    this.#editingMessageIndex = null;
  }

  selectChatType(): Promise<string | null> {
    return new Promise((resolve) => {
      this.#chatTypeResolve = resolve;
      this.#chatTypeDialogOpen = true;
    });
  }

  resolveChatType(type: string | null): void {
    this.#chatTypeResolve?.(type);
    this.#chatTypeResolve = null;
    this.#chatTypeDialogOpen = false;
  }

  confirm(title: string, message: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.#confirmDialog = { open: true, title, message, resolve };
    });
  }

  resolveConfirm(value: boolean): void {
    this.#confirmDialog.resolve?.(value);
    this.#confirmDialog = { open: false, title: '', message: '' };
  }

  openHtmlPreview(content: string): void {
    this.#htmlPreviewContent = content;
    this.#htmlPreviewOpen = true;
  }

  closeHtmlPreview(): void {
    this.#htmlPreviewOpen = false;
    this.#htmlPreviewContent = '';
  }

  openModal(name: 'settings' | 'confirm' | 'chatType' | 'htmlPreview'): void {
    if (name === 'settings') this.#settingsOpen = true;
    else if (name === 'chatType') this.#chatTypeDialogOpen = true;
    else if (name === 'htmlPreview') this.#htmlPreviewOpen = true;
  }

  closeModal(name: 'settings' | 'confirm' | 'chatType' | 'htmlPreview' | 'editMessage'): void {
    if (name === 'settings') this.#settingsOpen = false;
    else if (name === 'chatType') this.#chatTypeDialogOpen = false;
    else if (name === 'htmlPreview') this.closeHtmlPreview();
    else if (name === 'editMessage') this.closeEditModal();
  }

  showToast(message: string, type: ToastMessage['type'] = 'info'): void {
    const id = `toast_${Date.now()}`;
    this.#toasts = [...this.#toasts, { id, message, type }];

    setTimeout(() => {
      this.#toasts = this.#toasts.filter((t) => t.id !== id);
    }, 3000);
  }

  removeToast(id: string): void {
    this.#toasts = this.#toasts.filter((t) => t.id !== id);
  }
}

export const uiStore = new UIStore();
