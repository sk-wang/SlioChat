<script lang="ts">
  import { conversationsStore } from '$lib/stores/conversations.svelte';
  import { streamingStore } from '$lib/stores/streaming.svelte';
  import ConversationItem from './ConversationItem.svelte';

  interface ConversationGroup {
    label: string;
    items: Array<{ id: string; title: string }>;
  }

  function getGroupedConversations(): ConversationGroup[] {
    const now = new Date();
    const groups: Record<string, ConversationGroup> = {
      today: { label: '今天', items: [] },
      week: { label: '最近一周', items: [] },
      earlier: { label: '更早', items: [] },
    };

    Object.entries(conversationsStore.conversations).forEach(([id, conv]) => {
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
</div>
