import { storage } from '$lib/services/storage';
import { uiStore } from './ui.svelte';

class ThemeStore {
  #isDark = $state(false);

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = storage.get<'dark' | 'light' | null>('theme', null);
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.#isDark = stored === 'dark' || (!stored && systemPrefersDark);
      this.#applyTheme();

      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!storage.get('theme', null)) {
          this.#isDark = e.matches;
          this.#applyTheme();
        }
      });
    }
  }

  get isDark() { return this.#isDark; }

  #applyTheme() {
    const html = document.documentElement;
    if (this.#isDark) {
      html.classList.add('dark');
      html.setAttribute('data-theme', 'dark');
    } else {
      html.classList.remove('dark');
      html.setAttribute('data-theme', 'light');
    }
  }

  toggle(): void {
    this.#isDark = !this.#isDark;
    storage.set('theme', this.#isDark ? 'dark' : 'light');
    this.#applyTheme();
    uiStore.showToast(`已切换至${this.#isDark ? '暗色' : '亮色'}主题`, 'info');
  }

  set(dark: boolean): void {
    this.#isDark = dark;
    storage.set('theme', dark ? 'dark' : 'light');
    this.#applyTheme();
  }
}

export const themeStore = new ThemeStore();
