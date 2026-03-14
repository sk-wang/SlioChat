/**
 * File System Tools for Agent
 */

import type { ToolExecutor } from '$lib/types/tool';
import { vfs } from '$lib/services/sandbox.svelte';

/**
 * Read file tool
 */
export const fsReadTool: ToolExecutor = {
  name: 'fs_read',
  definition: {
    name: 'fs_read',
    description: '读取沙箱文件系统中指定文件的内容。返回文件的完整内容。',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: '要读取的文件路径，例如: /src/index.js 或 /README.md'
        }
      },
      required: ['path']
    }
  },
  async execute(args) {
    const path = args.path as string;
    try {
      const content = await vfs.readFile(path);
      return content;
    } catch (error) {
      return `Error: ${(error as Error).message}`;
    }
  }
};

/**
 * Write file tool
 */
export const fsWriteTool: ToolExecutor = {
  name: 'fs_write',
  definition: {
    name: 'fs_write',
    description: '在沙箱文件系统中写入或创建文件。如果文件不存在会自动创建，如果存在则覆盖内容。会自动创建所需的父目录。',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: '要写入的文件路径，例如: /src/index.js'
        },
        content: {
          type: 'string',
          description: '要写入的文件内容'
        }
      },
      required: ['path', 'content']
    }
  },
  async execute(args) {
    const path = args.path as string;
    const content = args.content as string;
    try {
      await vfs.writeFile(path, content);
      return `Successfully wrote ${content.length} characters to ${path}`;
    } catch (error) {
      return `Error: ${(error as Error).message}`;
    }
  }
};

/**
 * Delete file/directory tool
 */
export const fsDeleteTool: ToolExecutor = {
  name: 'fs_delete',
  definition: {
    name: 'fs_delete',
    description: '删除沙箱文件系统中的文件或目录。如果是目录，会递归删除其中所有内容。',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: '要删除的文件或目录路径'
        }
      },
      required: ['path']
    }
  },
  async execute(args) {
    const path = args.path as string;
    try {
      await vfs.delete(path);
      return `Successfully deleted ${path}`;
    } catch (error) {
      return `Error: ${(error as Error).message}`;
    }
  }
};

/**
 * List directory tool
 */
export const fsListTool: ToolExecutor = {
  name: 'fs_list',
  definition: {
    name: 'fs_list',
    description: '列出沙箱文件系统中指定目录下的所有文件和子目录。不指定路径时默认列出根目录。',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: '要列出的目录路径，默认为根目录 /'
        }
      },
      required: []
    }
  },
  async execute(args) {
    const path = (args.path as string) || '/';
    try {
      const entries = await vfs.listDir(path);
      if (entries.length === 0) {
        return `Directory ${path} is empty`;
      }
      const lines = entries.map(e => {
        const type = e.type === 'directory' ? '📁' : '📄';
        const size = e.size ? ` (${formatSize(e.size)})` : '';
        return `${type} ${e.name}${size}`;
      });
      return `Contents of ${path}:\n${lines.join('\n')}`;
    } catch (error) {
      return `Error: ${(error as Error).message}`;
    }
  }
};

/**
 * Create directory tool
 */
export const fsMkdirTool: ToolExecutor = {
  name: 'fs_mkdir',
  definition: {
    name: 'fs_mkdir',
    description: '在沙箱文件系统中创建新目录。',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: '要创建的目录路径'
        }
      },
      required: ['path']
    }
  },
  async execute(args) {
    const path = args.path as string;
    try {
      await vfs.mkdir(path);
      return `Successfully created directory ${path}`;
    } catch (error) {
      return `Error: ${(error as Error).message}`;
    }
  }
};

/**
 * Check file exists tool
 */
export const fsExistsTool: ToolExecutor = {
  name: 'fs_exists',
  definition: {
    name: 'fs_exists',
    description: '检查沙箱文件系统中是否存在指定的文件或目录。',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: '要检查的路径'
        }
      },
      required: ['path']
    }
  },
  async execute(args) {
    const path = args.path as string;
    try {
      const exists = await vfs.exists(path);
      return exists ? `Path ${path} exists` : `Path ${path} does not exist`;
    } catch (error) {
      return `Error: ${(error as Error).message}`;
    }
  }
};

/**
 * Format file size
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * All file system tools
 */
export const sandboxTools: ToolExecutor[] = [
  fsReadTool,
  fsWriteTool,
  fsDeleteTool,
  fsListTool,
  fsMkdirTool,
  fsExistsTool
];

/**
 * Register all sandbox tools
 * Note: Tools are auto-registered via index.ts
 */
export function registerSandboxTools(): void {
  // Tools are automatically registered in index.ts
  // This function is kept for backwards compatibility
}
