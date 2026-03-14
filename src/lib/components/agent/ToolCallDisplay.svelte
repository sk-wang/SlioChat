<script lang="ts">
  import type { ToolCall } from '$lib/types/tool';
  import { agentStore } from '$lib/stores/agent.svelte';

  const { call }: { call: ToolCall } = $props();

  const result = $derived(agentStore.getToolResult(call.id));
  const isExecuting = $derived(!result);
  const status = $derived(result?.status || 'pending');
  const args = $derived(formatArgs(call.function.arguments));

  // Compute header class based on status
  const headerClass = $derived(() => {
    let cls = 'tool-header flex items-center gap-1.5 sm:gap-2 px-2 py-1.5 sm:px-3 sm:py-2 ';
    if (isExecuting) cls += 'bg-yellow-50 dark:bg-yellow-900/20';
    else if (status === 'success') cls += 'bg-green-50 dark:bg-green-900/20';
    else if (status === 'error') cls += 'bg-red-50 dark:bg-red-900/20';
    return cls;
  });

  // Compute result class based on status
  const resultClass = $derived(() => {
    let cls = 'tool-result px-2 py-1.5 sm:px-3 sm:py-2 border-t border-[var(--border-color)] max-h-32 sm:max-h-40 overflow-y-auto ';
    if (status === 'success') cls += 'bg-green-50/50 dark:bg-green-900/10';
    else if (status === 'error') cls += 'bg-red-50/50 dark:bg-red-900/10';
    return cls;
  });

  function formatArgs(args: string): string {
    try {
      const parsed = JSON.parse(args);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return args;
    }
  }

  function truncateContent(content: string, maxLength: number = 500): string {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + '...\n[内容已截断，共 ' + content.length + ' 字符]';
  }
</script>

<div class="tool-call-block border border-[var(--border-color)] rounded-lg overflow-hidden my-1.5 text-xs sm:text-sm min-w-0 w-full max-w-full">
  <!-- Header -->
  <div class={headerClass()}>
    {#if isExecuting}
      <div class="spinner animate-spin w-3 h-3 sm:w-4 sm:h-4 border-2 border-current border-t-transparent rounded-full"></div>
    {:else if status === 'success'}
      <svg class="w-3 h-3 sm:w-4 sm:h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
    {:else}
      <svg class="w-3 h-3 sm:w-4 sm:h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
    {/if}

    <span class="tool-name font-mono font-medium text-[var(--text-primary)] truncate">
      {call.function.name}
    </span>

    {#if result?.executionTime}
      <span class="text-[10px] sm:text-xs text-[var(--text-secondary)] ml-auto flex-shrink-0">
        {result.executionTime}ms
      </span>
    {/if}
  </div>

  <!-- Arguments -->
  {#if args && args !== '{}'}
    <div class="tool-args px-2 py-1.5 sm:px-3 sm:py-2 bg-[var(--bg-tertiary)] border-t border-[var(--border-color)]">
      <pre class="text-[10px] sm:text-xs overflow-x-auto text-[var(--text-secondary)] font-mono whitespace-pre-wrap break-all">{args}</pre>
    </div>
  {/if}

  <!-- Result -->
  {#if result}
    <div class={resultClass()}>
      <pre class="text-[10px] sm:text-xs overflow-x-auto whitespace-pre-wrap text-[var(--text-secondary)] break-all">{truncateContent(result.content, 300)}</pre>
    </div>
  {/if}
</div>
