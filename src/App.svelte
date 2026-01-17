<script lang="ts">
  import { themeStore } from '$lib/stores/theme.svelte';
  import { conversationsStore } from '$lib/stores/conversations.svelte';
  import { uiStore } from '$lib/stores/ui.svelte';
  import Sidebar from '$lib/components/layout/Sidebar.svelte';
  import MainContent from '$lib/components/layout/MainContent.svelte';
  import Toast from '$lib/components/ui/Toast.svelte';
  import SettingsModal from '$lib/components/modals/SettingsModal.svelte';
  import ConfirmModal from '$lib/components/modals/ConfirmModal.svelte';
  import ChatTypeModal from '$lib/components/modals/ChatTypeModal.svelte';
  import EditMessageModal from '$lib/components/modals/EditMessageModal.svelte';
  import HtmlPreviewModal from '$lib/components/modals/HtmlPreviewModal.svelte';
</script>

<div class="app-container flex h-[100dvh] bg-[var(--bg-primary)] overflow-hidden">
  <Sidebar />
  
  <div
    id="sidebar-overlay"
    class="sidebar-overlay"
    class:active={uiStore.sidebarOpen}
    onclick={() => uiStore.toggleSidebar()}
    onkeydown={(e) => e.key === 'Escape' && uiStore.toggleSidebar()}
    role="button"
    tabindex="-1"
    aria-label="Close sidebar"
  ></div>
  
  <MainContent />
</div>

{#if uiStore.toasts.length > 0}
  <div class="fixed bottom-4 right-4 z-50 space-y-2">
    {#each uiStore.toasts as toast (toast.id)}
      <Toast {toast} />
    {/each}
  </div>
{/if}

{#if uiStore.modals.settings}
  <SettingsModal />
{/if}

{#if uiStore.modals.confirm}
  <ConfirmModal />
{/if}

{#if uiStore.modals.chatType}
  <ChatTypeModal />
{/if}

{#if uiStore.modals.editMessage !== null}
  <EditMessageModal />
{/if}

{#if uiStore.modals.htmlPreview}
  <HtmlPreviewModal />
{/if}
