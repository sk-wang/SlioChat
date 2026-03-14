import type { ToolCall } from './tool';

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  type?: 'thinking' | 'normal';
  searchResults?: string;
  metadata?: {
    type: 'files';
    files: Array<{
      fileName: string;
      fileType: string;
      fileSize: number;
    }>;
  };
  // Agent mode: tool calls from assistant
  toolCalls?: ToolCall[];
  // Agent mode: tool result reference
  toolCallId?: string;
}

export interface ThinkingContent {
  thinking?: string;
  content: string;
}
