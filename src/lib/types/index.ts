export * from './message';
export * from './conversation';
export * from './model';
export * from './config';

export interface PendingFile {
  fileName: string;
  content: string;
  type: string;
  size: number;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
