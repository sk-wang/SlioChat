import type { Conversation, Message, ChatType } from '$lib/types';
import { storage } from '$lib/services/storage';

class ConversationsStore {
  #conversations = $state<Record<string, Conversation>>(
    storage.get<Record<string, Conversation>>('conversations', {})
  );
  #currentId = $state<string | null>(null);

  constructor() {
    const initial = this.#conversations;
    const lastSelected = storage.get<string | null>('lastSelectedConversation', null);
    this.#currentId = lastSelected && initial[lastSelected] ? lastSelected : Object.keys(initial)[0] || null;
  }

  get conversations() { return this.#conversations; }
  get currentId() { return this.#currentId; }
  get current() { return this.#currentId ? this.#conversations[this.#currentId] : null; }
  
  get list() {
    return Object.values(this.#conversations).sort((a, b) => b.createdAt - a.createdAt);
  }

  get isEmpty() { return Object.keys(this.#conversations).length === 0; }

  get grouped() {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    const groups = {
      today: { label: '今天', items: [] as Conversation[] },
      week: { label: '最近一周', items: [] as Conversation[] },
      earlier: { label: '更早', items: [] as Conversation[] },
    };

    this.list.forEach((conv) => {
      const age = now - conv.createdAt;
      if (age < dayMs) groups.today.items.push(conv);
      else if (age < 7 * dayMs) groups.week.items.push(conv);
      else groups.earlier.items.push(conv);
    });

    return Object.values(groups).filter((g) => g.items.length > 0);
  }

  #save() {
    storage.set('conversations', this.#conversations);
  }

  #saveCurrentId() {
    if (this.#currentId) {
      storage.set('lastSelectedConversation', this.#currentId);
    }
  }

  create(type: ChatType, systemPrompt: string, typeName: string): string {
    const id = `conv_${Date.now()}`;
    const count = this.list.filter((c) => c.type === type).length + 1;

    this.#conversations[id] = {
      id,
      title: `${typeName} ${count}`,
      messages: [],
      systemPrompt,
      type,
      createdAt: Date.now(),
    };

    this.#currentId = id;
    this.#save();
    this.#saveCurrentId();
    return id;
  }

  select(id: string): void {
    if (this.#conversations[id]) {
      this.#currentId = id;
      this.#saveCurrentId();
    }
  }

  delete(id: string): void {
    const ids = Object.keys(this.#conversations);
    const idx = ids.indexOf(id);

    delete this.#conversations[id];
    this.#conversations = { ...this.#conversations };

    if (this.#currentId === id) {
      this.#currentId = ids[idx - 1] || ids[idx + 1] || null;
      this.#saveCurrentId();
    }
    this.#save();
  }

  updateTitle(id: string, title: string): void {
    if (this.#conversations[id]) {
      this.#conversations[id].title = title;
      this.#save();
    }
  }

  addMessage(message: Message): void {
    const current = this.current;
    if (current) {
      current.messages = [...current.messages, message];
      this.#save();
    }
  }

  updateLastMessage(content: string, type?: 'thinking' | 'normal'): void {
    const current = this.current;
    if (current && current.messages.length > 0) {
      const lastIdx = current.messages.length - 1;
      current.messages[lastIdx] = {
        ...current.messages[lastIdx],
        content,
        ...(type && { type }),
      };
      this.#save();
    }
  }

  updateLastMessageFields(fields: Partial<Message>): void {
    const current = this.current;
    if (current && current.messages.length > 0) {
      const lastIdx = current.messages.length - 1;
      current.messages[lastIdx] = {
        ...current.messages[lastIdx],
        ...fields,
      };
      this.#save();
    }
  }

  updateMessage(index: number, content: string): void {
    const current = this.current;
    if (current?.messages[index]) {
      current.messages[index].content = content;
      this.#save();
    }
  }

  deleteMessage(index: number): void {
    const current = this.current;
    if (current) {
      current.messages = current.messages.filter((_, i) => i !== index);
      this.#save();
    }
  }

  deleteMessagesFrom(index: number): void {
    const current = this.current;
    if (current) {
      current.messages = current.messages.slice(0, index);
      this.#save();
    }
  }

  clearMessages(): void {
    const current = this.current;
    if (current) {
      current.messages = [];
      this.#save();
    }
  }

  updateSystemPrompt(prompt: string): void {
    const current = this.current;
    if (current) {
      current.systemPrompt = prompt;
      this.#save();
    }
  }

  setMessages(id: string, messages: Message[]): void {
    if (this.#conversations[id]) {
      this.#conversations[id].messages = messages;
      this.#save();
    }
  }

  getMessagesForContext(contextCount: number): Message[] {
    const current = this.current;
    if (!current) return [];
    const msgs = current.messages;
    if (msgs.length <= contextCount) return [...msgs];
    return msgs.slice(-contextCount);
  }
}

export const conversationsStore = new ConversationsStore();
