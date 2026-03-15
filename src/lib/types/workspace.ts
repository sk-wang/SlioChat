/**
 * Workspace type definitions
 */

export interface WorkspaceFile {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: number;
  // VFS path for unified file system
  vfsPath?: string;
  // Store raw File object for on-demand processing (backward compatibility)
  rawFile?: File;
  // Whether this file is binary (PDF, images, etc.)
  isBinary?: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  // File IDs belonging to this workspace
  files: string[];
  // Conversation IDs belonging to this workspace
  conversations: string[];
  // Is this the default workspace?
  isDefault?: boolean;
}

export interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspaceId: string | null;
  files: Map<string, WorkspaceFile>;
}
