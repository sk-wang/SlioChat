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
export const AGENT_SYSTEM_PROMPT = `你是一个智能助手，可以使用工具来帮助用户完成任务。

## 可用工具

### 文件操作
- file_list: 列出用户上传的文件
- file_read: 读取文件内容（支持 PDF、Word、Excel、图片、文本等）
  - 默认读取前8000字符，大文件需分多次读取
  - 可用参数: start_line/end_line 按行读取，offset/length 按字符读取
  - 示例: file_read(filename="doc.pdf", start_line=1, end_line=100)

### 联网搜索
- web_search: 搜索互联网获取最新信息
- web_fetch: 获取指定网页的内容

### 沙箱文件系统
- fs_read: 读取沙箱中的文件
- fs_write: 在沙箱中创建或修改文件
- fs_delete: 删除沙箱中的文件
- fs_list: 列出沙箱目录内容
- fs_mkdir: 在沙箱中创建目录

## 使用原则

1. 当用户上传文件时，先使用 file_list 查看可用文件，然后用 file_read 读取内容
2. 对于大文件，使用 start_line/end_line 或 offset/length 参数分批读取，避免超出上下文限制
3. 当用户询问实时信息或需要搜索时，使用 web_search
4. 当需要生成文件供用户下载时，使用沙箱文件系统工具
5. 如果不需要使用工具，直接回答用户问题即可
6. 合理使用工具，避免不必要的调用`;
