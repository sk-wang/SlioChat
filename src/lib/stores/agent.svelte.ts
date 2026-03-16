/**
 * Agent Store - Reactive state management for Agent mode
 * Inspired by OpenAI Codex SDK architecture
 * Supports Thread/Turn lifecycle and Item-based state management
 */

import type { ToolCall, ToolResult } from '$lib/types/tool';
import type { ThreadItem, Turn, Thread, Usage } from '$lib/types/agent';

class AgentStore {
  // Reactive state using Svelte 5 runes
  private _isProcessing = $state(false);
  private _currentToolCalls = $state<ToolCall[]>([]);
  private _toolResults = $state<Map<string, ToolResult>>(new Map());
  private _iteration = $state(0);
  private _error = $state<string | null>(null);
  private _maxIterations = $state(100);
  private _showSandbox = $state(false);

  // New: Thread/Turn state
  private _currentThread = $state<Thread | null>(null);
  private _currentTurn = $state<Turn | null>(null);
  private _items = $state<Map<string, ThreadItem>>(new Map());
  private _itemOrder = $state<string[]>([]);
  private _currentUsage = $state<Usage | null>(null);

  // Streaming state
  private _streamingContent = $state('');
  private _streamingThinking = $state('');

  // Getters
  get isProcessing(): boolean {
    return this._isProcessing;
  }

  get currentToolCalls(): ToolCall[] {
    return this._currentToolCalls;
  }

  get toolResults(): Map<string, ToolResult> {
    return this._toolResults;
  }

  get iteration(): number {
    return this._iteration;
  }

  get error(): string | null {
    return this._error;
  }

  get maxIterations(): number {
    return this._maxIterations;
  }

  get showSandbox(): boolean {
    return this._showSandbox;
  }

  get hasToolCalls(): boolean {
    return this._currentToolCalls.length > 0;
  }

  // New getters
  get currentThread(): Thread | null {
    return this._currentThread;
  }

  get currentTurn(): Turn | null {
    return this._currentTurn;
  }

  get items(): ThreadItem[] {
    return this._itemOrder.map(id => this._items.get(id)).filter((item): item is ThreadItem => item !== undefined);
  }

  get currentUsage(): Usage | null {
    return this._currentUsage;
  }

  get streamingContent(): string {
    return this._streamingContent;
  }

  get streamingThinking(): string {
    return this._streamingThinking;
  }

  // YOLO mode is always true now
  get yoloMode(): boolean {
    return true;
  }

  // No pending confirmations anymore
  get hasPendingConfirmations(): boolean {
    return false;
  }

  // Actions
  setMaxIterations(max: number): void {
    this._maxIterations = Math.max(1, Math.min(100, max));
  }

  setShowSandbox(show: boolean): void {
    this._showSandbox = show;
  }

  toggleSandbox(): void {
    this._showSandbox = !this._showSandbox;
  }

  // Thread/Turn management
  startThread(thread: Thread): void {
    this._currentThread = thread;
    this._items = new Map();
    this._itemOrder = [];
    this._currentUsage = null;
  }

  startTurn(turn: Turn): void {
    this._currentTurn = turn;
    this._streamingContent = '';
    this._streamingThinking = '';
  }

  completeTurn(usage: Usage): void {
    if (this._currentTurn) {
      this._currentTurn = {
        ...this._currentTurn,
        status: 'completed',
        completedAt: Date.now(),
        usage
      };
    }
    this._currentUsage = usage;
  }

  failTurn(error: string): void {
    if (this._currentTurn) {
      this._currentTurn = {
        ...this._currentTurn,
        status: 'failed',
        completedAt: Date.now()
      };
    }
    this._error = error;
  }

  // Item management
  addItem(item: ThreadItem): void {
    this._items.set(item.id, item);
    if (!this._itemOrder.includes(item.id)) {
      this._itemOrder.push(item.id);
    }
  }

  updateItem(item: ThreadItem): void {
    this._items.set(item.id, item);
  }

  getItem(id: string): ThreadItem | undefined {
    return this._items.get(id);
  }

  // Streaming
  appendContent(delta: string): void {
    this._streamingContent += delta;
  }

  appendThinking(delta: string): void {
    this._streamingThinking += delta;
  }

  clearStreaming(): void {
    this._streamingContent = '';
    this._streamingThinking = '';
  }

  // Legacy methods
  startProcessing(): void {
    this._isProcessing = true;
    this._currentToolCalls = [];
    this._toolResults = new Map();
    this._iteration = 0;
    this._error = null;
    this._items = new Map();
    this._itemOrder = [];
    this._streamingContent = '';
    this._streamingThinking = '';
  }

  stopProcessing(): void {
    this._isProcessing = false;
  }

  addToolCalls(calls: ToolCall[]): void {
    this._currentToolCalls = [...this._currentToolCalls, ...calls];
    this._iteration++;
  }

  addToolResult(callId: string, result: ToolResult): void {
    this._toolResults.set(callId, result);
  }

  setError(error: string): void {
    this._error = error;
    this._isProcessing = false;
  }

  clearToolCalls(): void {
    this._currentToolCalls = [];
    this._toolResults = new Map();
  }

  reset(): void {
    this._isProcessing = false;
    this._currentToolCalls = [];
    this._toolResults = new Map();
    this._iteration = 0;
    this._error = null;
    this._currentThread = null;
    this._currentTurn = null;
    this._items = new Map();
    this._itemOrder = [];
    this._currentUsage = null;
    this._streamingContent = '';
    this._streamingThinking = '';
  }

  // Get tool result by call ID
  getToolResult(callId: string): ToolResult | undefined {
    return this._toolResults.get(callId);
  }

  // Check if all tool calls have results
  allResultsReady(): boolean {
    return this._currentToolCalls.every(call =>
      this._toolResults.has(call.id)
    );
  }
}

// Global agent store instance
export const agentStore = new AgentStore();
