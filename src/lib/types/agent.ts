/**
 * Agent type definitions
 */

import type { ToolCall, ToolResult } from './tool';

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

export interface AgentEvent {
  type: AgentEventType;
  content?: string;
  calls?: ToolCall[];
  call?: ToolCall;
  result?: ToolResult;
  error?: string;
  messages?: import('$lib/types').Message[];
}

export interface AgentCallbacks {
  onThinking?: (content: string) => void;
  onContent?: (content: string) => void;
  onToolCalls?: (calls: ToolCall[]) => void;
  onToolExecuting?: (call: ToolCall) => void;
  onToolResult?: (call: ToolCall, result: ToolResult) => void;
  onError?: (error: string) => void;
}

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
