/**
 * Workspace type definitions
 */

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  // Conversation IDs belonging to this workspace
  conversations: string[];
  // Is this the default workspace?
  isDefault?: boolean;
}

export interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspaceId: string | null;
}
