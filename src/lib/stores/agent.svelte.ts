/**
 * Agent Store - Reactive state management for Agent mode
 * Agent is always enabled - tools are available in all conversations
 * YOLO mode is always on - tools auto-execute without confirmation
 */

import type { ToolCall, ToolResult } from '$lib/types/tool';

class AgentStore {
  // Reactive state using Svelte 5 runes
  private _isProcessing = $state(false);
  private _currentToolCalls = $state<ToolCall[]>([]);
  private _toolResults = $state<Map<string, ToolResult>>(new Map());
  private _iteration = $state(0);
  private _error = $state<string | null>(null);
  private _maxIterations = $state(100);
  private _showSandbox = $state(false);

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

  startProcessing(): void {
    this._isProcessing = true;
    this._currentToolCalls = [];
    this._toolResults = new Map();
    this._iteration = 0;
    this._error = null;
  }

  stopProcessing(): void {
    this._isProcessing = false;
  }

  addToolCalls(calls: ToolCall[]): void {
    // Append new tool calls to existing ones (for multi-round execution)
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
