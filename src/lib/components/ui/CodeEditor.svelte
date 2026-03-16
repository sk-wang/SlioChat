<!--
  Simple Code Editor with syntax highlighting
  Uses overlay technique: transparent textarea over highlighted code
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import hljs from 'highlight.js';

  let {
    value = $bindable(''),
    placeholder = '',
    language = 'plaintext',
    oninput,
    onkeydown,
    disabled = false
  }: {
    value?: string;
    placeholder?: string;
    language?: string;
    oninput?: (value: string) => void;
    onkeydown?: (event: KeyboardEvent) => void;
    disabled?: boolean;
  } = $props();

  let textareaEl: HTMLTextAreaElement;
  let highlightEl: HTMLElement;
  let containerEl: HTMLElement;

  // Highlighted code
  const highlightedCode = $derived(getHighlightedCode(value, language));

  function getHighlightedCode(code: string, lang: string): string {
    if (!code) return '';

    try {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
      }
      return escapeHtml(code);
    } catch {
      return escapeHtml(code);
    }
  }

  function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function handleInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    value = target.value;
    oninput?.(target.value);
    syncScroll();
  }

  function handleScroll() {
    syncScroll();
  }

  function syncScroll() {
    if (!textareaEl || !highlightEl) return;
    highlightEl.scrollTop = textareaEl.scrollTop;
    highlightEl.scrollLeft = textareaEl.scrollLeft;
  }

  // Handle tab key for indentation
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textareaEl.selectionStart;
      const end = textareaEl.selectionEnd;

      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      value = newValue;
      oninput?.(newValue);

      // Set cursor position after tab
      setTimeout(() => {
        textareaEl.selectionStart = textareaEl.selectionEnd = start + 2;
      }, 0);
    }
    onkeydown?.(e);
  }

  // Auto-resize textarea
  function adjustHeight() {
    if (!textareaEl || !containerEl) return;
    textareaEl.style.height = 'auto';
    const newHeight = Math.max(52, Math.min(textareaEl.scrollHeight, 300));
    textareaEl.style.height = newHeight + 'px';
    containerEl.style.height = newHeight + 'px';
  }

  $effect(() => {
    if (value !== undefined) {
      adjustHeight();
    }
  });

  onMount(() => {
    adjustHeight();
  });

  export function focus() {
    textareaEl?.focus();
  }

  export function getSelectionStart(): number {
    return textareaEl?.selectionStart ?? 0;
  }

  export function setSelectionRange(start: number, end: number) {
    textareaEl?.setSelectionRange(start, end);
  }
</script>

<div
  bind:this={containerEl}
  class="code-editor-container"
  class:disabled
>
  <!-- Highlighted code layer (background) -->
  <pre
    bind:this={highlightEl}
    class="code-highlight-layer"
    aria-hidden="true"
  ><code class="hljs">{@html highlightedCode || '<span class="placeholder">' + (placeholder || '') + '</span>'}</code></pre>

  <!-- Transparent textarea layer (foreground) -->
  <textarea
    bind:this={textareaEl}
    {disabled}
    class="code-textarea-layer"
    oninput={handleInput}
    onkeydown={handleKeyDown}
    onscroll={handleScroll}
    placeholder=""
    rows="1"
    spellcheck="false"
  >{value}</textarea>
</div>

<style>
  .code-editor-container {
    position: relative;
    width: 100%;
    min-height: 52px;
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
    font-size: 14px;
    line-height: 1.5;
    border-radius: 8px;
    overflow: hidden;
  }

  .code-highlight-layer,
  .code-textarea-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 14px 48px 14px 48px;
    border: none;
    border-radius: 8px;
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow-wrap: break-word;
    overflow: auto;
    tab-size: 2;
  }

  .code-highlight-layer {
    pointer-events: none;
    background-color: var(--bg-secondary, #f9f9f9);
    color: var(--text-primary, #0d0d0d);
  }

  .code-highlight-layer code {
    font-family: inherit;
    font-size: inherit;
    background: transparent;
    padding: 0;
  }

  .code-textarea-layer {
    resize: none;
    background-color: transparent;
    color: transparent;
    caret-color: var(--text-primary, #0d0d0d);
    outline: none;
    z-index: 1;
  }

  .code-textarea-layer::selection {
    background-color: rgba(16, 163, 127, 0.3);
  }

  .code-textarea-layer::placeholder {
    color: transparent;
  }

  .placeholder {
    color: var(--text-secondary, #8e8ea0);
    pointer-events: none;
  }

  .disabled {
    opacity: 0.6;
    pointer-events: none;
  }

  .disabled .code-textarea-layer {
    cursor: not-allowed;
  }
</style>
