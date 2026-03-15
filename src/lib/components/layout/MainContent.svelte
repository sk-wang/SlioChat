<script lang="ts">
  import { uiStore } from '$lib/stores/ui.svelte';
  import { conversationsStore } from '$lib/stores/conversations.svelte';
  import { themeStore } from '$lib/stores/theme.svelte';
  import { agentStore } from '$lib/stores/agent.svelte';
  import Header from './Header.svelte';
  import ChatContainer from '$lib/components/chat/ChatContainer.svelte';
  import ChatInput from '$lib/components/chat/ChatInput.svelte';
  import SandboxPanel from '$lib/components/sandbox/SandboxPanel.svelte';
  import FileReferencePanel from '$lib/components/workspace/FileReferencePanel.svelte';
</script>

<main class="main-content flex-1 flex h-[100dvh] bg-[var(--bg-primary)]" class:sidebar-collapsed={uiStore.sidebarCollapsed}>
  <div class="flex-1 flex flex-col min-w-0">
    <Header />
    <ChatContainer />
    <FileReferencePanel />
    <ChatInput />
  </div>

  {#if agentStore.showSandbox}
    <!-- Mobile backdrop -->
    <button
      class="fixed inset-0 bg-black/50 z-40 md:hidden"
      onclick={() => agentStore.setShowSandbox(false)}
      aria-label="关闭沙箱"
    ></button>
    <SandboxPanel />
  {/if}
</main>
