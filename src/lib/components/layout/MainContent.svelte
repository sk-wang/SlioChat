<script lang="ts">
  import { uiStore } from '$lib/stores/ui.svelte';
  import { conversationsStore } from '$lib/stores/conversations.svelte';
  import { themeStore } from '$lib/stores/theme.svelte';
  import Header from './Header.svelte';
  import ChatContainer from '$lib/components/chat/ChatContainer.svelte';
  import ChatInput from '$lib/components/chat/ChatInput.svelte';
</script>

<main class="main-content flex-1 flex flex-col h-[100dvh] bg-[var(--bg-primary)]" class:sidebar-collapsed={uiStore.sidebarCollapsed}>
  <Header />
  
  <ChatContainer />
  
  <ChatInput />
</main>
