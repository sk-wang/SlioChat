import type { Message } from './message';

export type ChatType = string;

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  systemPrompt: string;
  type: ChatType;
  createdAt: number;
  workspaceId: string;
}

export interface ConversationGroup {
  label: string;
  items: Conversation[];
}
