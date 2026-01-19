import { storage } from '$lib/services/storage';
import { uiStore } from './ui.svelte';

class ThemeStore {
  private _isDark = $state(false);

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = storage.get<'dark' | 'light' | null>('theme', null);
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this._isDark = stored === 'dark' || (!stored && mediaQuery.matches);
      this._applyTheme();

      const handleChange = (e: MediaQueryListEvent) => {
        if (!storage.get('theme', null)) {
          this._isDark = e.matches;
          this._applyTheme();
        }
      };

      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', handleChange);
      } else if (typeof mediaQuery.addListener === 'function') {
        mediaQuery.addListener(handleChange);
      }
    }
  }

  get isDark() { return this._isDark; }

  private _applyTheme() {
    const html = document.documentElement;
    if (this._isDark) {
      html.classList.add('dark');
      html.setAttribute('data-theme', 'dark');
    } else {
      html.classList.remove('dark');
      html.setAttribute('data-theme', 'light');
    }
  }

  toggle(): void {
    this._isDark = !this._isDark;
    storage.set('theme', this._isDark ? 'dark' : 'light');
    this._applyTheme();
    uiStore.showToast(`已切换至${this._isDark ? '暗色' : '亮色'}主题`, 'info');
  }

  set(dark: boolean): void {
    this._isDark = dark;
    storage.set('theme', dark ? 'dark' : 'light');
    this._applyTheme();
  }
}

export const themeStore = new ThemeStore();
