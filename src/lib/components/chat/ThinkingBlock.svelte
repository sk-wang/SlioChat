<script lang="ts">
  import { renderMarkdown } from '$lib/services/markdown';
  import type { ToolCall } from '$lib/types/tool';
  import ToolCallDisplay from '$lib/components/agent/ToolCallDisplay.svelte';

  const { thinking, content, toolCalls, isHistorical = false }: { thinking: string; content: string; toolCalls?: ToolCall[]; isHistorical?: boolean } = $props();

  let isExpanded = $state(true);
  let contentEl: HTMLElement;

  const renderedThinking = $derived(renderMarkdown(thinking));
  const renderedContent = $derived(renderMarkdown(content));

  $effect(() => {
    if (!contentEl) return;
    
    if (isExpanded) {
      contentEl.style.display = 'block';
      // Use double RAF to ensure display:block is applied before removing class
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          contentEl.classList.remove('collapsed');
        });
      });
    } else {
      contentEl.classList.add('collapsed');
      const handler = (e: TransitionEvent) => {
        if (e.target !== contentEl) return;
        if (contentEl.classList.contains('collapsed')) {
          contentEl.style.display = 'none';
        }
        contentEl.removeEventListener('transitionend', handler);
      };
      contentEl.addEventListener('transitionend', handler);
    }
  });
</script>

<div class="think-container">
  <div 
    class="think-header" 
    onclick={() => isExpanded = !isExpanded}
    role="button"
    tabindex="0"
    onkeydown={(e) => e.key === 'Enter' && (isExpanded = !isExpanded)}
  >
    <svg 
      class="think-header-icon w-4 h-4 text-[var(--text-secondary)]" 
      viewBox="0 0 20 20" 
      fill="currentColor"
      style:transform={isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)'}
    >
      <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
    </svg>
    <span class="text-[var(--text-secondary)]">🤔 思考过程</span>
  </div>
  <div
    bind:this={contentEl}
    class="think-content"
  >
    <div class="markdown-body text-[var(--text-primary)]">
      {@html renderedThinking}
    </div>

    <!-- Tool calls in thinking process -->
    {#if toolCalls && toolCalls.length > 0}
      <div class="tool-calls-in-thinking mt-3 border-t border-[var(--border-color)] pt-2">
        <div class="text-xs text-[var(--text-secondary)] mb-2">🛠️ 调用的工具</div>
        {#each toolCalls as call}
          <ToolCallDisplay {call} {isHistorical} />
        {/each}
      </div>
    {/if}
  </div>
</div>

<div class="response-content markdown-body text-[var(--text-primary)] mt-4">
  {@html renderedContent}
</div>
