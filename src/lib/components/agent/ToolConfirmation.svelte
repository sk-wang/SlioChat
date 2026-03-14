<script lang="ts">
  import type { ToolCall } from '$lib/types/tool';
  import type { ToolConfirmation } from '$lib/stores/agent.svelte';
  import { agentStore } from '$lib/stores/agent.svelte';
  import { agentService } from '$lib/services/agent.svelte';

  function formatArgs(args: string): string {
    try {
      const parsed = JSON.parse(args);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return args;
    }
  }

  function handleApprove(callId: string) {
    agentService.approveToolCall(callId);
  }

  function handleReject(callId: string) {
    agentService.rejectToolCall(callId);
  }

  function handleApproveAll() {
    agentService.approveAllToolCalls();
    agentService.resumeWithConfirmation(true);
  }

  function handleRejectAll() {
    agentService.rejectAllToolCalls();
    agentService.resumeWithConfirmation(false);
  }

  function handleConfirm() {
    // Resume with any approved tools
    const hasApproved = Array.from(agentStore.pendingConfirmations.values())
      .some(c => c.status === 'approved');
    agentService.resumeWithConfirmation(hasApproved);
  }
</script>

{#if agentStore.hasPendingConfirmations}
  <div class="tool-confirmation-container border border-yellow-300 dark:border-yellow-700 rounded-lg overflow-hidden my-3 bg-yellow-50 dark:bg-yellow-900/20">
    <!-- Header -->
    <div class="flex items-center gap-2 px-4 py-3 bg-yellow-100 dark:bg-yellow-900/40 border-b border-yellow-300 dark:border-yellow-700">
      <svg class="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <span class="font-medium text-yellow-800 dark:text-yellow-200">工具执行确认</span>
      <span class="text-sm text-yellow-600 dark:text-yellow-400 ml-auto">
        {#if agentStore.pendingConfirmations.size > 1}
          {agentStore.pendingConfirmations.size} 个工具待确认
        {:else}
          1 个工具待确认
        {/if}
      </span>
    </div>

    <!-- Tool calls list -->
    <div class="p-3 space-y-2">
      {#each Array.from(agentStore.pendingConfirmations.values()) as confirmation (confirmation.call.id)}
        <div class="tool-item border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] overflow-hidden">
          <!-- Tool header -->
          <div class="flex items-center gap-2 px-3 py-2 bg-[var(--bg-tertiary)]">
            <span class="font-mono font-medium text-[var(--text-primary)]">
              {confirmation.call.function.name}
            </span>

            <!-- Status indicator -->
            {#if confirmation.status === 'approved'}
              <span class="ml-auto text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                已批准
              </span>
            {:else if confirmation.status === 'rejected'}
              <span class="ml-auto text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                已拒绝
              </span>
            {:else}
              <div class="ml-auto flex items-center gap-1">
                <button
                  onclick={() => handleApprove(confirmation.call.id)}
                  class="px-2 py-1 text-xs bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
                >
                  批准
                </button>
                <button
                  onclick={() => handleReject(confirmation.call.id)}
                  class="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                >
                  拒绝
                </button>
              </div>
            {/if}
          </div>

          <!-- Arguments -->
          {#if confirmation.call.function.arguments && confirmation.call.function.arguments !== '{}'}
            <div class="px-3 py-2 border-t border-[var(--border-color)]">
              <pre class="text-xs overflow-x-auto text-[var(--text-secondary)] font-mono whitespace-pre-wrap">{formatArgs(confirmation.call.function.arguments)}</pre>
            </div>
          {/if}
        </div>
      {/each}
    </div>

    <!-- Action buttons -->
    <div class="flex items-center justify-end gap-2 px-4 py-3 border-t border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/10">
      <button
        onclick={handleRejectAll}
        class="px-3 py-1.5 text-sm border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
      >
        全部拒绝
      </button>
      <button
        onclick={handleApproveAll}
        class="px-3 py-1.5 text-sm border border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
      >
        全部批准
      </button>
      <button
        onclick={handleConfirm}
        class="px-4 py-1.5 text-sm bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors font-medium"
      >
        确认执行
      </button>
    </div>
  </div>
{/if}
