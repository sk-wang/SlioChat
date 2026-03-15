<script lang="ts">
  import { conversationsStore } from '$lib/stores/conversations.svelte';
  import { workspaceStore } from '$lib/stores/workspace.svelte';
  import { streamingStore } from '$lib/stores/streaming.svelte';
  import ConversationItem from './ConversationItem.svelte';

  interface ConversationGroup {
    label: string;
    items: Array<{ id: string; title: string }>;
  }

  function getGroupedConversations(): ConversationGroup[] {
    const currentWorkspaceId = workspaceStore.currentWorkspaceId;
    if (!currentWorkspaceId) return [];

    const now = new Date();
    const groups: Record<string, ConversationGroup> = {
      today: { label: '今天', items: [] },
      week: { label: '最近一周', items: [] },
      earlier: { label: '更早', items: [] },
    };

    Object.entries(conversationsStore.conversations).forEach(([id, conv]) => {
      // Filter by current workspace
      if (conv.workspaceId !== currentWorkspaceId) return;

      const timestamp = parseInt(id.split('_')[1]);
      const date = new Date(timestamp);
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

      const item = { id, title: conv.title };
      if (diffDays < 1) {
        groups.today.items.push(item);
      } else if (diffDays <= 7) {
        groups.week.items.push(item);
      } else {
        groups.earlier.items.push(item);
      }
    });

    Object.values(groups).forEach((group) => {
      group.items.sort((a, b) => {
        const timeA = parseInt(a.id.split('_')[1]);
        const timeB = parseInt(b.id.split('_')[1]);
        return timeB - timeA;
      });
    });

    return Object.values(groups).filter((g) => g.items.length > 0);
  }

  const groupedConversations = $derived(getGroupedConversations());
</script>

<div id="conversation-list" class="p-2 space-y-1">
  {#if groupedConversations.length === 0}
    <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
      <svg class="w-16 h-16 text-[var(--text-secondary)] opacity-30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      <p class="text-sm text-[var(--text-secondary)] opacity-75 mb-2">暂无会话</p>
      <p class="text-xs text-[var(--text-secondary)] opacity-50">点击上方按钮创建新会话</p>
    </div>
  {:else}
    {#each groupedConversations as group}
      <div class="px-2 py-1.5 text-xs text-[var(--text-secondary)] opacity-75">
        {group.label}
      </div>
      {#each group.items as item (item.id)}
        <ConversationItem
          id={item.id}
          title={item.title}
          isActive={conversationsStore.currentId === item.id}
          isDisabled={streamingStore.isGenerating && conversationsStore.currentId !== item.id}
        />
      {/each}
    {/each}
  {/if}
</div>
