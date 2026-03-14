/**
 * Agent Store - Reactive state management for Agent mode
 * Agent is always enabled - tools are available in all conversations
 */

import type { ToolCall, ToolResult } from '$lib/types/tool';
import { storage } from '$lib/services/storage';

// Tool confirmation status
export type ToolConfirmationStatus = 'pending' | 'approved' | 'rejected';

export interface ToolConfirmation {
  call: ToolCall;
  status: ToolConfirmationStatus;
  args: Record<string, unknown>;
}

class AgentStore {
  // Reactive state using Svelte 5 runes
  private _isProcessing = $state(false);
  private _currentToolCalls = $state<ToolCall[]>([]);
  private _toolResults = $state<Map<string, ToolResult>>(new Map());
  private _iteration = $state(0);
  private _error = $state<string | null>(null);
  private _maxIterations = $state(100);
  private _showSandbox = $state(false);

  // YOLO mode - auto-execute tools without confirmation
  private _yoloMode = $state(storage.get('agentYoloMode', false));

  // Tool confirmations - for human-in-the-loop
  private _pendingConfirmations = $state<Map<string, ToolConfirmation>>(new Map());

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

  get yoloMode(): boolean {
    return this._yoloMode;
  }

  get pendingConfirmations(): Map<string, ToolConfirmation> {
    return this._pendingConfirmations;
  }

  get hasPendingConfirmations(): boolean {
    return this._pendingConfirmations.size > 0;
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

  setYoloMode(enabled: boolean): void {
    this._yoloMode = enabled;
    storage.set('agentYoloMode', enabled);
  }

  toggleYoloMode(): void {
    this.setYoloMode(!this._yoloMode);
  }

  startProcessing(): void {
    this._isProcessing = true;
    this._currentToolCalls = [];
    this._toolResults = new Map();
    this._pendingConfirmations = new Map();
    this._iteration = 0;
    this._error = null;
  }

  stopProcessing(): void {
    this._isProcessing = false;
    this._pendingConfirmations = new Map();
  }

  addToolCalls(calls: ToolCall[]): void {
    this._currentToolCalls = calls;
    this._iteration++;
  }

  addToolResult(callId: string, result: ToolResult): void {
    this._toolResults.set(callId, result);
    // Remove from pending confirmations if exists
    this._pendingConfirmations.delete(callId);
  }

  setError(error: string): void {
    this._error = error;
    this._isProcessing = false;
    this._pendingConfirmations = new Map();
  }

  clearToolCalls(): void {
    this._currentToolCalls = [];
    this._toolResults = new Map();
    this._pendingConfirmations = new Map();
  }

  reset(): void {
    this._isProcessing = false;
    this._currentToolCalls = [];
    this._toolResults = new Map();
    this._pendingConfirmations = new Map();
    this._iteration = 0;
    this._error = null;
  }

  // Tool confirmation methods
  addPendingConfirmation(call: ToolCall, args: Record<string, unknown>): void {
    this._pendingConfirmations.set(call.id, {
      call,
      status: 'pending',
      args
    });
  }

  approveToolCall(callId: string): void {
    const confirmation = this._pendingConfirmations.get(callId);
    if (confirmation) {
      confirmation.status = 'approved';
      this._pendingConfirmations.set(callId, confirmation);
    }
  }

  rejectToolCall(callId: string): void {
    const confirmation = this._pendingConfirmations.get(callId);
    if (confirmation) {
      confirmation.status = 'rejected';
      this._pendingConfirmations.set(callId, confirmation);
    }
  }

  approveAllPending(): void {
    for (const [id, confirmation] of this._pendingConfirmations) {
      if (confirmation.status === 'pending') {
        confirmation.status = 'approved';
        this._pendingConfirmations.set(id, confirmation);
      }
    }
  }

  rejectAllPending(): void {
    for (const [id, confirmation] of this._pendingConfirmations) {
      if (confirmation.status === 'pending') {
        confirmation.status = 'rejected';
        this._pendingConfirmations.set(id, confirmation);
      }
    }
  }

  getConfirmationStatus(callId: string): ToolConfirmationStatus | undefined {
    return this._pendingConfirmations.get(callId)?.status;
  }

  isToolCallConfirmed(callId: string): boolean {
    const status = this.getConfirmationStatus(callId);
    return status === 'approved';
  }

  isToolCallRejected(callId: string): boolean {
    const status = this.getConfirmationStatus(callId);
    return status === 'rejected';
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

  // Clear confirmations
  clearConfirmations(): void {
    this._pendingConfirmations = new Map();
  }
}

// Global agent store instance
export const agentStore = new AgentStore();
