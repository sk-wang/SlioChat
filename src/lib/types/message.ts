export interface Message {
  role: 'user' | 'assistant' | 'system';
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
}

export interface ThinkingContent {
  thinking?: string;
  content: string;
}
