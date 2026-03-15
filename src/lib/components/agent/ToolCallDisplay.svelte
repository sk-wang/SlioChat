<script lang="ts">
  import type { ToolCall } from '$lib/types/tool';
  import { agentStore } from '$lib/stores/agent.svelte';

  const { call }: { call: ToolCall } = $props();

  const result = $derived(agentStore.getToolResult(call.id));
  const isExecuting = $derived(!result);
  const status = $derived(result?.status || 'pending');
  const args = $derived(formatArgs(call.function.arguments));

  // Fold state for long content
  let isArgsExpanded = $state(false);
  let isResultExpanded = $state(false);
  const ARGS_FOLD_THRESHOLD = 200;
  const RESULT_FOLD_THRESHOLD = 300;

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

  function toggleArgs() {
    isArgsExpanded = !isArgsExpanded;
  }

  function toggleResult() {
    isResultExpanded = !isResultExpanded;
  }
</script>

<div class="tool-call-block border border-[var(--border-color)] rounded-lg overflow-hidden my-1.5 text-xs sm:text-sm min-w-0 w-full max-w-full">
  <!-- Header -->
  <div class={headerClass()}>
    {#if status === 'success'}
      <svg class="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
    {:else if status === 'error'}
      <svg class="w-3 h-3 sm:w-4 sm:h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
    {:else}
      <!-- Pending state - no spinner, just a dot -->
      <div class="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0"></div>
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
  {#if args && args !== '{}' && args !== 'null'}
    {@const argsTooLong = args.length > ARGS_FOLD_THRESHOLD}
    <div class="tool-args px-2 py-1.5 sm:px-3 sm:py-2 bg-[var(--bg-tertiary)] border-t border-[var(--border-color)]">
      <pre class="text-[10px] sm:text-xs overflow-x-auto text-[var(--text-secondary)] font-mono whitespace-pre-wrap break-all">{isArgsExpanded || !argsTooLong ? args : args.slice(0, ARGS_FOLD_THRESHOLD) + '...'}</pre>
      {#if argsTooLong}
        <button
          onclick={toggleArgs}
          class="mt-1 text-[10px] text-[var(--text-secondary)] hover:text-[var(--button-primary-bg)] flex items-center gap-1 transition-colors"
        >
          <svg class="w-3 h-3 transition-transform" class:rotate-180={isArgsExpanded} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
          {isArgsExpanded ? '收起' : '展开'} ({args.length} 字符)
        </button>
      {/if}
    </div>
  {/if}

  <!-- Result -->
  {#if result}
    {@const resultTooLong = result.content.length > RESULT_FOLD_THRESHOLD}
    <div class={resultClass()}>
      <pre class="text-[10px] sm:text-xs overflow-x-auto whitespace-pre-wrap text-[var(--text-secondary)] break-all">{isResultExpanded || !resultTooLong ? result.content : truncateContent(result.content, RESULT_FOLD_THRESHOLD)}</pre>
      {#if resultTooLong}
        <button
          onclick={toggleResult}
          class="mt-1 text-[10px] text-[var(--text-secondary)] hover:text-[var(--button-primary-bg)] flex items-center gap-1 transition-colors"
        >
          <svg class="w-3 h-3 transition-transform" class:rotate-180={isResultExpanded} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
          {isResultExpanded ? '收起' : '展开'} ({result.content.length} 字符)
        </button>
      {/if}
    </div>
  {/if}
</div>
