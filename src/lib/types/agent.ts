/**
 * Agent type definitions - Inspired by OpenAI Codex SDK
 * Supports Thread/Turn lifecycle and Item-based event system
 */

import type { ToolCall, ToolResult } from './tool';

// ============================================================================
// Thread & Turn Types
// ============================================================================

/**
 * Thread - A conversation session with the agent
 */
export interface Thread {
  id: string;
  conversationId: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Turn - A single interaction cycle (user input → agent response)
 */
export interface Turn {
  id: string;
  threadId: string;
  status: TurnStatus;
  startedAt: number;
  completedAt?: number;
  usage?: Usage;
}

export type TurnStatus = 'in_progress' | 'completed' | 'failed';

/**
 * Token usage statistics
 */
export interface Usage {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
}

// ============================================================================
// Item Types - Unified item system for agent outputs
// ============================================================================

export type ItemStatus = 'in_progress' | 'completed' | 'failed';

/**
 * Base item interface
 */
interface BaseItem {
  id: string;
  status: ItemStatus;
}

/**
 * Agent's text response
 */
export interface AgentMessageItem extends BaseItem {
  type: 'agent_message';
  text: string;
}

/**
 * Agent's reasoning/thinking content
 */
export interface ReasoningItem extends BaseItem {
  type: 'reasoning';
  text: string;
}

/**
 * Tool call execution with status tracking
 */
export interface ToolCallItem extends BaseItem {
  type: 'tool_call';
  call: ToolCall;
  result?: ToolResult;
}

/**
 * Error item
 */
export interface ErrorItem extends BaseItem {
  type: 'error';
  message: string;
}

/**
 * Todo list item for task tracking
 */
export interface TodoItem {
  text: string;
  completed: boolean;
}

export interface TodoListItem extends BaseItem {
  type: 'todo_list';
  items: TodoItem[];
}

/**
 * Union type for all thread items
 */
export type ThreadItem =
  | AgentMessageItem
  | ReasoningItem
  | ToolCallItem
  | ErrorItem
  | TodoListItem;

// ============================================================================
// Event Types - Lifecycle events for thread, turn, and items
// ============================================================================

/**
 * Emitted when a new thread is started
 */
export interface ThreadStartedEvent {
  type: 'thread.started';
  threadId: string;
}

/**
 * Emitted when a turn starts
 */
export interface TurnStartedEvent {
  type: 'turn.started';
  turnId: string;
}

/**
 * Emitted when a turn completes successfully
 */
export interface TurnCompletedEvent {
  type: 'turn.completed';
  turnId: string;
  usage: Usage;
}

/**
 * Emitted when a turn fails
 */
export interface TurnFailedEvent {
  type: 'turn.failed';
  turnId: string;
  error: string;
}

/**
 * Emitted when a new item is added (initially in_progress)
 */
export interface ItemStartedEvent {
  type: 'item.started';
  item: ThreadItem;
}

/**
 * Emitted when an item is updated
 */
export interface ItemUpdatedEvent {
  type: 'item.updated';
  item: ThreadItem;
}

/**
 * Emitted when an item reaches terminal state
 */
export interface ItemCompletedEvent {
  type: 'item.completed';
  item: ThreadItem;
}

/**
 * Streaming content event (for real-time display)
 */
export interface ContentStreamEvent {
  type: 'content.stream';
  delta: string;
}

/**
 * Streaming thinking event (for real-time display)
 */
export interface ThinkingStreamEvent {
  type: 'thinking.stream';
  delta: string;
}

/**
 * Max iterations reached
 */
export interface MaxIterationsEvent {
  type: 'max_iterations';
  iterations: number;
}

/**
 * Thread error event
 */
export interface ThreadErrorEvent {
  type: 'error';
  message: string;
}

/**
 * Union type for all agent events
 */
export type AgentEvent =
  | ThreadStartedEvent
  | TurnStartedEvent
  | TurnCompletedEvent
  | TurnFailedEvent
  | ItemStartedEvent
  | ItemUpdatedEvent
  | ItemCompletedEvent
  | ContentStreamEvent
  | ThinkingStreamEvent
  | MaxIterationsEvent
  | ThreadErrorEvent;

// ============================================================================
// Legacy types (for backward compatibility)
// ============================================================================

/**
 * @deprecated Use AgentEvent instead
 */
export type AgentEventType =
  | 'start'
  | 'thinking'
  | 'content'
  | 'tool_calls'
  | 'tool_executing'
  | 'tool_result'
  | 'tool_confirmation_required'
  | 'tool_rejected'
  | 'messages_updated'
  | 'final_response'
  | 'error'
  | 'max_iterations';

/**
 * @deprecated Use specific event types instead
 */
export interface LegacyAgentEvent {
  type: AgentEventType;
  content?: string;
  calls?: ToolCall[];
  call?: ToolCall;
  result?: ToolResult;
  error?: string;
  messages?: import('$lib/types').Message[];
}

export interface AgentSession {
  id: string;
  conversationId: string;
  startTime: number;
  toolCallHistory: Array<{
    call: ToolCall;
    result: ToolResult;
    timestamp: number;
  }>;
}

export interface AgentCallbacks {
  onThinking?: (content: string) => void;
  onContent?: (content: string) => void;
  onToolCalls?: (calls: ToolCall[]) => void;
  onToolExecuting?: (call: ToolCall) => void;
  onToolResult?: (call: ToolCall, result: ToolResult) => void;
  onError?: (error: string) => void;
}

// ============================================================================
// System Prompt
// ============================================================================

/**
 * Default system prompt for agent
 */
export const AGENT_SYSTEM_PROMPT = `你是一个智能助手，可以通过工具调用来帮助用户完成任务。

# 核心原则

1. **立即行动** - 当需要使用工具时，立即调用工具，不要只在思考中说"我来..."或"让我..."。思考后必须紧跟实际的工具调用。
2. **执行优先** - 不要在思考中规划完就停下，必须实际执行工具调用。
3. **多轮执行** - 完成一个工具调用后，根据结果决定是否需要更多工具调用，直到任务完成。

# 可用工具

## 文件操作
- file_list: 列出用户上传的文件
- file_read: 读取文件内容（支持 PDF、Word、Excel、图片、文本等）
  - 默认读取前8000字符，大文件需分多次读取
  - 可用参数: start_line/end_line 按行读取，offset/length 按字符读取

## 联网搜索
- web_search: 搜索互联网获取最新信息
- web_fetch: 获取指定网页的内容

## 沙箱文件系统
- fs_read: 读取沙箱中的文件
- fs_write: 在沙箱中创建或修改文件
- fs_delete: 删除沙箱中的文件
- fs_list: 列出沙箱目录内容
- fs_mkdir: 在沙箱中创建目录

# 工作流程

1. 分析用户请求，确定需要哪些工具
2. 立即调用所需工具（不要只是说要做）
3. 根据工具结果继续处理或调用更多工具
4. 完成任务后给出最终回复

# 示例

用户: "帮我读取 report.pdf 文件"
错误做法: 只在思考中说"我来读取文件"但不调用工具
正确做法: 思考后立即调用 file_read(filename="report.pdf")

用户: "创建一个文档总结"
错误做法: 在思考中规划内容但不执行
正确做法: 思考内容后立即调用 fs_write 创建文件`;
