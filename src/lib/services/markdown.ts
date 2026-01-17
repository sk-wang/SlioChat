import { marked } from 'marked';
import hljs from 'highlight.js';

marked.setOptions({
  gfm: true,
  breaks: true,
});

const renderer = new marked.Renderer();

renderer.code = function (codeBlock: { text: string; lang?: string } | string, language?: string) {
  let code: string;
  let lang: string;
  
  if (typeof codeBlock === 'object' && codeBlock !== null) {
    code = codeBlock.text || '';
    lang = codeBlock.lang || 'plaintext';
  } else {
    code = String(codeBlock || '');
    lang = language || 'plaintext';
  }
  
  let highlighted: string;
  
  try {
    if (lang && hljs.getLanguage(lang)) {
      highlighted = hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
    } else {
      highlighted = escapeHtml(code);
    }
  } catch {
    highlighted = escapeHtml(code);
  }
  
  const isHtml = lang === 'html' || isHtmlCode(code);
  
  const previewBtn = isHtml 
    ? `<button class="html-preview-btn" title="预览HTML">
         <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
         </svg>
       </button>` 
    : '';

  const copyBtn = `<button class="code-copy-btn" title="复制代码">
      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
      </svg>
    </button>`;
  
  return `<div class="code-block-wrapper relative group">
            <pre><code class="hljs language-${lang}">${highlighted}</code></pre>
            <div class="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              ${previewBtn}
              ${copyBtn}
            </div>
          </div>`;
};

marked.use({ renderer });

export function renderMarkdown(content: string): string {
  if (!content) return '';
  return marked.parse(content) as string;
}

export function highlightCode(element: HTMLElement): void {
  element.querySelectorAll('pre code').forEach((block) => {
    hljs.highlightElement(block as HTMLElement);
  });
}

export function isHtmlCode(code: string): boolean {
  const trimmed = code.trim();
  return (
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.startsWith('<html') ||
    trimmed.startsWith('<!doctype')
  );
}

export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
