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
  error?: string; // Alias for message, for compatibility
}

/**
 * Legacy events for backward compatibility with chat.svelte.ts
 * These events wrap the new event system for existing code
 */
export interface LegacyStartEvent {
  type: 'start';
}

export interface LegacyThinkingEvent {
  type: 'thinking';
  content: string;
}

export interface LegacyContentEvent {
  type: 'content';
  content: string;
}

export interface LegacyToolCallsEvent {
  type: 'tool_calls';
  calls: ToolCall[];
}

export interface LegacyToolResultEvent {
  type: 'tool_result';
  call: ToolCall;
  result: ToolResult;
}

export interface LegacyToolConfirmationEvent {
  type: 'tool_confirmation_required';
  calls: ToolCall[];
}

export interface LegacyToolRejectedEvent {
  type: 'tool_rejected';
  call: ToolCall;
}

export interface LegacyMessagesUpdatedEvent {
  type: 'messages_updated';
  messages: import('$lib/types').Message[];
}

export interface LegacyFinalResponseEvent {
  type: 'final_response';
  content: string;
}

/**
 * Union type for all agent events (including legacy for backward compatibility)
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
  | ThreadErrorEvent
  // Legacy events
  | LegacyStartEvent
  | LegacyThinkingEvent
  | LegacyContentEvent
  | LegacyToolCallsEvent
  | LegacyToolResultEvent
  | LegacyToolConfirmationEvent
  | LegacyToolRejectedEvent
  | LegacyMessagesUpdatedEvent
  | LegacyFinalResponseEvent;

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
 * Inspired by OpenAI Codex CLI design patterns
 */
export const AGENT_SYSTEM_PROMPT = `你是一个智能助手，可以通过工具调用来帮助用户完成任务。请保持简洁、高效、友好。

# 核心原则

1. **持续执行** - 在任务完全解决之前，请继续执行，不要中途停止。自主完成任务后再返回用户。不要猜测或编造答案。
2. **立即行动** - 当需要使用工具时，立即调用工具，不要只在思考中说"我来..."或"让我..."。思考后必须紧跟实际的工具调用。
3. **简洁沟通** - 在调用工具前，用一句话简要说明你要做什么。保持轻快友好的语气。
4. **任务完成** - 完成所有相关操作后再给出最终回复，不要中途停下。
5. **事实核查** - 涉及事实性信息时，主动使用搜索工具验证，不要依赖训练数据中可能过时的信息。

# 可用工具

## 文件操作
- file_list: 列出用户上传的文件
- file_read: 读取文件内容（支持 PDF、Word、Excel、图片、文本等）
  - 默认读取前8000字符，大文件需分多次读取
  - 可用参数: start_line/end_line 按行读取，offset/length 按字符读取

## 代码搜索
- code_search: 在沙箱文件中搜索代码或文本
  - 支持正则表达式和大小写敏感选项
  - 可按文件类型过滤（如 "*.ts"）
  - 返回匹配的文件路径、行号和内容
- find_files: 按文件名模式查找文件
  - 支持通配符 * 和 ?
  - 可搜索文件或目录
- file_info: 获取文件详细信息（大小、类型、行数等）

## 任务规划
- update_plan: 创建或更新任务计划
  - 用于复杂多步骤任务
  - 跟踪进度（pending/in_progress/completed）
  - 每次只应有一个 in_progress 任务
- get_plan: 获取当前计划状态
- clear_plan: 清除当前计划

## 联网搜索与研究
- **web_search**: 搜索互联网获取最新信息。对复杂话题，用不同关键词多次搜索以获得全面视角。
- **web_fetch**: 获取指定URL网页的完整正文内容。当搜索结果的摘要不够详细时，用此工具深入阅读原文。
- **fact_check**: 对特定陈述进行多源事实核查。自动从多个角度搜索验证，返回支持或反驳的证据。
- **deep_research**: 对一个话题进行系统性的深度研究。自动执行多轮搜索（广度探索→深度挖掘→交叉验证），适合需要全面了解的复杂问题。

## 沙箱文件系统
- fs_read: 读取沙箱中的文件
- fs_write: 在沙箱中创建或修改文件
- fs_delete: 删除沙箱中的文件
- fs_list: 列出沙箱目录内容
- fs_mkdir: 在沙箱中创建目录

## 命令执行
- shell_command: 在沙箱中执行类Linux命令（ls, cat, grep, sed, awk, curl等）

## Lua 执行
- run_lua: 在浏览器中执行 Lua 代码
  - 轻量级脚本语言（~500KB，快速加载）
  - 可通过 vfs.read/write/list/delete 访问虚拟文件系统
  - 适合文件处理、数据转换等任务
- lua_status: 检查 Lua 环境状态

# 事实核查与研究工作流

## 何时需要核查
遇到以下情况时，必须使用搜索工具验证：
- 涉及具体数据、统计数字、排名
- 涉及近期事件或新闻
- 涉及技术细节、API用法、版本信息
- 用户直接要求核实某条信息

## 核查流程
1. **简单查询**: 使用 web_search 搜索相关信息
2. **深度验证**: 使用 fact_check 工具从多个角度交叉验证
3. **全面研究**: 使用 deep_research 工具进行系统性研究
4. **原文确认**: 当摘要信息不足时，使用 web_fetch 获取原文

## 引用规范
当使用搜索结果回答问题时，必须包含引用：
- 在陈述事实后紧跟来源：\`[来源: 标题](URL)\`
- 回答末尾汇总所有参考来源

示例：
> 根据最新数据，中国AI市场规模在2025年达到XXX亿元 [来源: XX报告](https://...)

# 工作流程

1. 分析用户请求，确定需要哪些工具
2. 简短说明接下来要做什么（1句话）
3. 立即调用所需工具
4. 根据工具结果继续处理或调用更多工具
5. 完成任务后给出简洁的最终回复（包含引用来源）

# 任务规划建议

对于复杂任务，考虑使用 update_plan 来跟踪进度：
- 创建简短的任务描述（5-7个字）
- 每完成一个任务后更新状态
- 始终保持一个任务为 in_progress

# 沟通风格

- 默认简洁直接，避免过度解释
- 工具调用前用一句话说明意图，如："正在读取文件..."
- 对于简单任务，直接给出结果即可
- 复杂任务完成后，简要总结做了什么

# 示例

用户: "帮我读取 report.pdf 文件"
✅ 正确: 思考 → "正在读取 report.pdf..." → 调用 file_read
❌ 错误: 只在思考中说"我来读取文件"但不调用工具

用户: "分析这个数据并创建报告"
✅ 正确: 读取文件 → 分析数据 → "正在创建报告..." → 调用 fs_write → 简要总结
❌ 错误: 读取文件后就停下，没有完成后续步骤

用户: "2025年中国GDP是多少？"
✅ 正确: web_search("2025年中国GDP数据") → 引用来源回答 → 末尾附参考链接
❌ 错误: 直接给出一个可能过时的数字`;
