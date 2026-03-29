export * from './message';
export * from './conversation';
export * from './model';
export * from './config';
export * from './tool';
export * from './agent';
export * from './workspace';
export * from './memory';

export interface PendingFile {
  fileName: string;
  type: string;
  size: number;
  // Store raw File object for agent to process on-demand
  rawFile: File;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

export interface ConfirmData {
  title: string;
  message: string;
}
