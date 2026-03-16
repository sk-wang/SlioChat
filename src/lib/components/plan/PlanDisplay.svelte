<!--
  PlanDisplay - Shows current task plan with progress
  Inspired by Codex plan UI
-->
<script lang="ts">
  import { agentStore } from '$lib/stores/agent.svelte';

  // Get plan from store reactively
  const plan = $derived(agentStore.plan);
  const hasPlan = $derived(agentStore.hasPlan);
  const progress = $derived(agentStore.planProgress);

  // Status icons
  const statusIcons: Record<string, string> = {
    'pending': '○',
    'in_progress': '◐',
    'completed': '●'
  };

  const statusColors: Record<string, string> = {
    'pending': 'text-[var(--text-secondary)]',
    'in_progress': 'text-blue-500',
    'completed': 'text-green-500'
  };
</script>

{#if hasPlan}
  <div class="plan-container">
    <div class="plan-header">
      <span class="plan-title">Plan</span>
      <span class="plan-progress">{progress.completed}/{progress.total}</span>
    </div>

    <!-- Progress bar -->
    <div class="progress-bar-bg">
      <div
        class="progress-bar-fill"
        style="width: {progress.percentage}%"
      ></div>
    </div>

    <!-- Plan items -->
    <div class="plan-items">
      {#each plan as item, index}
        <div class="plan-item" class:active={item.status === 'in_progress'}>
          <span class="plan-item-icon {statusColors[item.status]}">
            {statusIcons[item.status]}
          </span>
          <span class="plan-item-text" class:completed={item.status === 'completed'}>
            {item.text}
          </span>
        </div>
      {/each}
    </div>
  </div>
{/if}

<style>
  .plan-container {
    padding: 8px 12px;
    background: var(--bg-secondary);
    border-radius: 8px;
    margin: 8px 0;
    font-size: 13px;
  }

  .plan-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  .plan-title {
    font-weight: 600;
    color: var(--text-primary);
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .plan-progress {
    font-size: 11px;
    color: var(--text-secondary);
    font-family: ui-monospace, monospace;
  }

  .progress-bar-bg {
    height: 3px;
    background: var(--border-color);
    border-radius: 2px;
    margin-bottom: 8px;
    overflow: hidden;
  }

  .progress-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #10a37f, #1a7f64);
    border-radius: 2px;
    transition: width 0.3s ease;
  }

  .plan-items {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .plan-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 2px 0;
  }

  .plan-item.active {
    background: rgba(59, 130, 246, 0.1);
    margin: 0 -8px;
    padding: 2px 8px;
    border-radius: 4px;
  }

  .plan-item-icon {
    font-size: 12px;
    width: 14px;
    text-align: center;
    flex-shrink: 0;
  }

  .plan-item-text {
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .plan-item-text.completed {
    text-decoration: line-through;
    color: var(--text-secondary);
  }
</style>
