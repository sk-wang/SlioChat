/**
 * File Tools - File reading and processing for Agent
 * Files are stored in VFS and processed on-demand when tools are called
 */

import type { ToolExecutor } from '$lib/types/tool';
import { processFile, type FileContent } from '$lib/services/fileHandlers';
import { workspaceStore } from '$lib/stores/workspace.svelte';
import { vfs, type VFSEntry } from '$lib/services/sandbox.svelte';

// Cache for processed file contents
const processedCache: Map<string, FileContent> = new Map();

/**
 * Clear processed cache for a specific file
 */
export function clearFileCache(fileId: string): void {
  processedCache.delete(fileId);
}

/**
 * Clear all processed file cache
 */
export function clearAllFileCache(): void {
  processedCache.clear();
}

/**
 * Process a file and cache the result
 */
async function processAndCacheFile(file: File, fileId: string): Promise<FileContent> {
  // Validate file object
  if (!file) {
    throw new Error('Cannot process file: file object is null or undefined');
  }
  if (!file.name) {
    throw new Error('Cannot process file: file.name is missing');
  }

  // Check cache first
  if (processedCache.has(fileId)) {
    return processedCache.get(fileId)!;
  }

  try {
    const content = await processFile(file);
    processedCache.set(fileId, content);
    return content;
  } catch (error) {
    console.error(`Failed to process file ${file.name || '(unknown)'}:`, error);
    throw error;
  }
}

/**
 * Recursively get all files from VFS
 */
async function getAllFilesRecursively(dirPath: string = '/'): Promise<VFSEntry[]> {
  const entries = await vfs.listDir(dirPath);
  let allFiles: VFSEntry[] = [];

  for (const entry of entries) {
    if (entry.type === 'file') {
      allFiles.push(entry);
    } else if (entry.type === 'directory') {
      // Recursively get files from subdirectory
      const subFiles = await getAllFilesRecursively(entry.path);
      allFiles = allFiles.concat(subFiles);
    }
  }

  return allFiles;
}

/**
 * List available files tool
 */
export const fileListTool: ToolExecutor = {
  name: 'file_list',
  definition: {
    name: 'file_list',
    description: '列出当前工作空间中的所有文件（包括子目录）。返回文件名列表、文件类型和大小信息。使用此工具查看有哪些文件可供读取。',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  async execute() {
    // Ensure VFS is initialized
    await vfs.init();

    // Ensure workspace is set
    const currentWorkspaceId = workspaceStore.currentWorkspaceId;
    if (currentWorkspaceId && vfs.currentWorkspaceId !== currentWorkspaceId) {
      vfs.setWorkspace(currentWorkspaceId);
    }

    // Get all files recursively from VFS
    const files = await getAllFilesRecursively('/');

    if (files.length === 0) {
      return '当前工作空间没有文件。用户需要先上传文件到工作空间。';
    }

    const fileList = files.map(file => {
      const sizeKB = file.size ? (file.size / 1024).toFixed(1) : '0';
      return `- ${file.name} (${sizeKB} KB, 路径: ${file.path})`;
    });

    const workspace = workspaceStore.currentWorkspace;
    return `工作空间"${workspace?.name || '默认'}"中的文件:\n${fileList.join('\n')}\n\n使用 file_read 工具读取文件内容。`;
  }
};

/**
 * Read file content tool
 */
export const fileReadTool: ToolExecutor = {
  name: 'file_read',
  definition: {
    name: 'file_read',
    description: '读取工作空间中的文件内容。支持 PDF、Word、Excel、PowerPoint、图片、文本、代码等多种格式。图片会返回 AI 生成的描述。可以指定行号范围或字符范围来读取部分内容。',
    parameters: {
      type: 'object',
      properties: {
        filename: {
          type: 'string',
          description: '要读取的文件名（支持模糊匹配）'
        },
        start_line: {
          type: 'number',
          description: '开始行号（从1开始），不指定则从头开始'
        },
        end_line: {
          type: 'number',
          description: '结束行号（包含），不指定则读到末尾'
        },
        offset: {
          type: 'number',
          description: '字符偏移量（从0开始），与行号参数二选一'
        },
        length: {
          type: 'number',
          description: '读取的字符数，默认8000字符'
        }
      },
      required: ['filename']
    }
  },
  async execute(args) {
    const filename = args.filename as string;
    const startLine = args.start_line as number | undefined;
    const endLine = args.end_line as number | undefined;
    const offset = args.offset as number | undefined;
    const length = args.length as number | undefined;

    // Ensure VFS is initialized
    await vfs.init();

    // Ensure workspace is set
    const currentWorkspaceId = workspaceStore.currentWorkspaceId;
    if (currentWorkspaceId && vfs.currentWorkspaceId !== currentWorkspaceId) {
      vfs.setWorkspace(currentWorkspaceId);
    }

    // Get all files recursively from VFS
    const files = await getAllFilesRecursively('/');

    console.log('file_read tool called for:', filename, 'available files:', files.map(f => f.name).join(', '));

    if (files.length === 0) {
      return '当前工作空间没有文件。用户需要先上传文件。';
    }

    // Try exact match first (by filename)
    let matchedFile = files.find(f => f.name === filename);

    // Try matching by path (for cases like "uploads/filename")
    if (!matchedFile) {
      matchedFile = files.find(f => f.path === filename || f.path.endsWith('/' + filename));
    }

    // Try partial match if exact match fails
    if (!matchedFile) {
      // Remove @ prefix if present (from @ mention)
      const cleanFilename = filename.startsWith('@') ? filename.slice(1) : filename;

      for (const file of files) {
        if (file.name.includes(cleanFilename) || cleanFilename.includes(file.name)) {
          matchedFile = file;
          break;
        }
      }
    }

    if (!matchedFile) {
      const available = files.map(f => f.name).join(', ');
      return `错误: 找不到文件 "${filename}"。可用文件: ${available}。\n\n请先使用 file_list 查看可用文件列表。`;
    }

    try {
      // Read file content from VFS
      const content = await vfs.readFile(matchedFile.path);

      // Determine if file is binary based on extension
      const isBinary = /\.(pdf|xlsx?|docx?|png|jpe?g|gif|webp)$/i.test(matchedFile.name);

      // Create File object for processing
      let rawFile: File;
      if (isBinary) {
        // Binary file - content is base64, convert to blob
        const response = await fetch(`data:application/octet-stream;base64,${content}`);
        const blob = await response.blob();
        rawFile = new File([blob], matchedFile.name, { type: 'application/octet-stream' });
      } else {
        // Text file - content is plain text
        const blob = new Blob([content], { type: 'text/plain' });
        rawFile = new File([blob], matchedFile.name, { type: 'text/plain' });
      }

      console.log('Processing file:', matchedFile.name, 'size:', rawFile.size, 'isBinary:', isBinary);

      // Use path as cache key
      const cacheKey = matchedFile.path;
      const processedFile = await processAndCacheFile(rawFile, cacheKey);
      const processedContent = processedFile.content;

      // Apply line/offset filtering if requested
      if (startLine !== undefined || endLine !== undefined) {
        const lines = processedContent.split('\n');
        const start = (startLine || 1) - 1;
        const end = endLine || lines.length;
        return lines.slice(start, end).join('\n');
      }

      if (offset !== undefined) {
        const maxLength = length || 8000;
        return processedContent.slice(offset, offset + maxLength);
      }

      return processedContent;
    } catch (error) {
      console.error('File read error:', error);
      return `错误: 无法读取文件 "${matchedFile.name}": ${error instanceof Error ? error.message : String(error)}`;
    }
  }
};

/**
 * All file tools
 */
export const fileTools: ToolExecutor[] = [
  fileListTool,
  fileReadTool
];
