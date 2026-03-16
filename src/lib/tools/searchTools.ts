/**
 * Search Tools - Code search and pattern matching for Agent
 * Inspired by Codex grep_files and tool_search
 */

import type { ToolExecutor, ToolDefinition } from '$lib/types/tool';
import { vfs } from '$lib/services/sandbox.svelte';

/**
 * Recursively get all files in VFS
 */
async function getAllFiles(dirPath: string = '/'): Promise<string[]> {
  const entries = await vfs.listDir(dirPath);
  let allFiles: string[] = [];

  for (const entry of entries) {
    if (entry.type === 'file') {
      allFiles.push(entry.path);
    } else if (entry.type === 'directory') {
      const subFiles = await getAllFiles(entry.path);
      allFiles = allFiles.concat(subFiles);
    }
  }

  return allFiles;
}

/**
 * Escape regex special characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Check if file path matches glob pattern
 */
function matchesFilePattern(filePath: string, pattern: string): boolean {
  const regexPattern = pattern
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  const regex = new RegExp(`${regexPattern}$`, 'i');
  return regex.test(filePath);
}

/**
 * Code search tool definition
 */
const codeSearchDefinition: ToolDefinition = {
  name: 'code_search',
  description: '在沙箱文件中搜索代码或文本。支持正则表达式和大小写敏感选项。返回匹配的文件路径、行号和内容。',
  parameters: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: '要搜索的模式（支持正则表达式）'
      },
      path: {
        type: 'string',
        description: '搜索的起始目录，默认为根目录 /'
      },
      file_pattern: {
        type: 'string',
        description: '文件名模式过滤，例如 "*.ts" 或 "*.js"'
      },
      case_sensitive: {
        type: 'boolean',
        description: '是否区分大小写，默认 false'
      },
      max_results: {
        type: 'number',
        description: '最大返回结果数，默认 50'
      }
    },
    required: ['pattern']
  }
};

/**
 * Code search tool executor
 */
export const codeSearchTool: ToolExecutor = {
  name: 'code_search',
  definition: codeSearchDefinition,
  isMutating: false,
  timeout: 30000,
  async execute(args) {
    const pattern = args.pattern as string;
    const startPath = (args.path as string) || '/';
    const filePattern = args.file_pattern as string | undefined;
    const caseSensitive = (args.case_sensitive as boolean) ?? false;
    const maxResults = (args.max_results as number) ?? 50;

    try {
      const allFiles = await getAllFiles(startPath);
      const targetFiles = filePattern
        ? allFiles.filter(f => matchesFilePattern(f, filePattern))
        : allFiles;

      const flags = caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(escapeRegExp(pattern), flags);

      const results: Array<{
        file: string;
        line: number;
        content: string;
        match: string;
      }> = [];

      for (const filePath of targetFiles) {
        if (results.length >= maxResults) break;

        try {
          const content = await vfs.readFile(filePath);
          const lines = content.split('\n');

          for (let i = 0; i < lines.length; i++) {
            if (results.length >= maxResults) break;

            const line = lines[i];
            const match = line.match(regex);

            if (match) {
              results.push({
                file: filePath,
                line: i + 1,
                content: line.trim().substring(0, 200),
                match: match[0]
              });
            }
          }
        } catch {
          continue;
        }
      }

      if (results.length === 0) {
        return `未找到匹配 "${pattern}" 的结果。`;
      }

      const output = results.map(r =>
        `${r.file}:${r.line}: ${r.content}`
      ).join('\n');

      return `找到 ${results.length} 个匹配结果:\n\n${output}`;
    } catch (error) {
      return `搜索错误: ${(error as Error).message}`;
    }
  }
};

/**
 * Find files tool definition
 */
const findFilesDefinition: ToolDefinition = {
  name: 'find_files',
  description: '在沙箱中按文件名模式查找文件。支持通配符 * 和 ?。',
  parameters: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: '文件名模式，例如 "*.ts" 或 "test*"'
      },
      path: {
        type: 'string',
        description: '搜索的起始目录，默认为根目录 /'
      },
      type: {
        type: 'string',
        enum: ['file', 'directory', 'all'],
        description: '搜索类型：file(文件)、directory(目录)、all(全部)'
      }
    },
    required: ['pattern']
  }
};

/**
 * Find files tool executor
 */
export const findFilesTool: ToolExecutor = {
  name: 'find_files',
  definition: findFilesDefinition,
  isMutating: false,
  async execute(args) {
    const pattern = args.pattern as string;
    const startPath = (args.path as string) || '/';
    const type = (args.type as string) || 'file';

    try {
      const regexPattern = pattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      const regex = new RegExp(`^${regexPattern}$`, 'i');

      const results: string[] = [];

      async function searchRecursive(dirPath: string) {
        const entries = await vfs.listDir(dirPath);

        for (const entry of entries) {
          if (type === 'all' ||
              (type === 'file' && entry.type === 'file') ||
              (type === 'directory' && entry.type === 'directory')) {
            if (regex.test(entry.name)) {
              results.push(entry.path);
            }
          }

          if (entry.type === 'directory') {
            await searchRecursive(entry.path);
          }
        }
      }

      await searchRecursive(startPath);

      if (results.length === 0) {
        return `未找到匹配 "${pattern}" 的文件。`;
      }

      return `找到 ${results.length} 个匹配项:\n\n${results.join('\n')}`;
    } catch (error) {
      return `搜索错误: ${(error as Error).message}`;
    }
  }
};

/**
 * File info tool definition
 */
const fileInfoDefinition: ToolDefinition = {
  name: 'file_info',
  description: '获取文件的详细信息，包括大小、类型、行数等。',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: '文件路径'
      }
    },
    required: ['path']
  }
};

/**
 * File info tool executor
 */
export const fileInfoTool: ToolExecutor = {
  name: 'file_info',
  definition: fileInfoDefinition,
  isMutating: false,
  async execute(args) {
    const path = args.path as string;

    try {
      const content = await vfs.readFile(path);
      const lines = content.split('\n');
      const size = new Blob([content]).size;

      const ext = path.split('.').pop()?.toLowerCase() || '';
      const typeMap: Record<string, string> = {
        'ts': 'TypeScript',
        'js': 'JavaScript',
        'svelte': 'Svelte',
        'json': 'JSON',
        'md': 'Markdown',
        'css': 'CSS',
        'html': 'HTML',
        'py': 'Python',
        'rs': 'Rust',
        'go': 'Go'
      };
      const fileType = typeMap[ext] || 'Text';

      return `文件: ${path}
类型: ${fileType}
大小: ${(size / 1024).toFixed(2)} KB
行数: ${lines.length}
字符数: ${content.length}`;
    } catch (error) {
      return `获取文件信息失败: ${(error as Error).message}`;
    }
  }
};

// Export all search tools
export const searchTools: ToolExecutor[] = [
  codeSearchTool,
  findFilesTool,
  fileInfoTool
];
