/**
 * File Tools - File reading and processing for Agent
 * Files are stored in workspace and processed on-demand when tools are called
 */

import type { ToolExecutor } from '$lib/types/tool';
import { processFile, type FileContent } from '$lib/services/fileHandlers';
import { workspaceStore } from '$lib/stores/workspace.svelte';
import { vfs } from '$lib/services/sandbox.svelte';

// Temporary store for raw files being uploaded (cleared after processing)
const uploadingFiles: Map<string, File> = new Map();

// Cache for processed file contents
const processedCache: Map<string, FileContent> = new Map();

/**
 * Register a raw file being uploaded
 * This is temporary - file will be stored in workspace after upload
 */
export function registerUploadingFile(file: File): string {
  const tempId = `temp_${Date.now()}_${file.name}`;
  uploadingFiles.set(tempId, file);
  return tempId;
}

/**
 * Get uploading file by temp ID
 */
export function getUploadingFile(tempId: string): File | undefined {
  return uploadingFiles.get(tempId);
}

/**
 * Clear uploading files cache
 */
export function clearUploadingFiles(): void {
  uploadingFiles.clear();
}

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
 * List available files tool
 */
export const fileListTool: ToolExecutor = {
  name: 'file_list',
  definition: {
    name: 'file_list',
    description: '列出当前工作空间中的所有文件。返回文件名列表、文件类型和大小信息。使用此工具查看有哪些文件可供读取。',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  async execute() {
    const files = workspaceStore.files;

    if (files.length === 0) {
      return '当前工作空间没有文件。用户需要先上传文件到工作空间。';
    }

    const fileList = files.map(file => {
      const sizeKB = (file.size / 1024).toFixed(1);
      const type = file.type || '未知类型';
      return `- ${file.name} (${sizeKB} KB, ${type})`;
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
    const files = workspaceStore.files;

    console.log('file_read tool called for:', filename, 'available files:', files.map(f => f.name).join(', '));

    if (files.length === 0) {
      return '当前工作空间没有文件。用户需要先上传文件。';
    }

    // Try exact match first
    let matchedFile = files.find(f => f.name === filename);
    let matchedName = filename;

    // Try partial match if exact match fails
    if (!matchedFile) {
      for (const file of files) {
        if (file.name.includes(filename) || filename.includes(file.name)) {
          matchedFile = file;
          matchedName = file.name;
          break;
        }
      }
    }

    if (!matchedFile) {
      const available = files.map(f => f.name).join(', ');
      return `错误: 找不到文件 "${filename}"。可用文件: ${available}。\n\n请先使用 file_list 查看可用文件列表。`;
    }

    try {
      // Get raw file - either from workspace file or from uploading cache
      let rawFile: File | undefined;

      if (matchedFile.rawFile) {
        rawFile = matchedFile.rawFile;
      } else if (matchedFile.vfsPath) {
        // Reconstruct File from VFS (for both binary and text files)
        try {
          const vfsContent = await vfs.readFile(matchedFile.vfsPath);
          if (vfsContent) {
            const mimeType = matchedFile.type && matchedFile.type.trim() !== '' ? matchedFile.type : 'application/octet-stream';

            if (matchedFile.isBinary) {
              // Binary file: vfsContent is base64, convert to blob
              const response = await fetch(`data:${mimeType};base64,${vfsContent}`);
              const blob = await response.blob();
              rawFile = new File([blob], matchedFile.name, { type: mimeType });
              console.log('Reconstructed binary file from VFS:', matchedFile.name, 'type:', mimeType, 'size:', rawFile.size);
            } else {
              // Text file: vfsContent is plain text, create File directly
              const blob = new Blob([vfsContent], { type: mimeType });
              rawFile = new File([blob], matchedFile.name, { type: mimeType });
              console.log('Reconstructed text file from VFS:', matchedFile.name, 'type:', mimeType, 'size:', rawFile.size);
            }
          }
        } catch (e) {
          console.error('Failed to reconstruct file from VFS:', e);
        }
      }

      // Fallback: try to get from uploading files (for recently uploaded)
      if (!rawFile) {
        for (const [tempId, file] of uploadingFiles) {
          if (file.name === matchedFile.name) {
            rawFile = file;
            console.log('Found file in uploadingFiles cache:', matchedFile.name);
            break;
          }
        }
      }

      if (!rawFile) {
        console.error('Failed to get raw file for:', matchedName, 'isBinary:', matchedFile.isBinary, 'vfsPath:', matchedFile.vfsPath);
        return `错误: 文件 "${matchedName}" 的原始数据不可用。请重新上传文件。`;
      }

      console.log('Processing file with processAndCacheFile:', matchedName, 'rawFile size:', rawFile.size);
      const content = await processAndCacheFile(rawFile, matchedFile.id);
      const fullContent = content.content;
      const totalChars = fullContent.length;
      const lines = fullContent.split('\n');
      const totalLines = lines.length;

      const sizeKB = (matchedFile.size / 1024).toFixed(1);
      let output = `文件: ${content.fileName}\n类型: ${content.type || '未知'}\n大小: ${sizeKB} KB\n总行数: ${totalLines}\n总字符: ${totalChars}\n\n`;

      let resultContent: string;
      let rangeInfo = '';

      // Determine read mode: line-based or character-based
      if (startLine !== undefined || endLine !== undefined) {
        // Line-based reading
        const start = Math.max(1, startLine || 1);
        const end = Math.min(totalLines, endLine || totalLines);

        if (start > totalLines) {
          return output + `错误: 起始行 ${start} 超出文件总行数 ${totalLines}`;
        }

        const selectedLines = lines.slice(start - 1, end);
        resultContent = selectedLines.join('\n');
        rangeInfo = `[读取第 ${start} - ${end} 行，共 ${selectedLines.length} 行]\n\n`;
      } else if (offset !== undefined || length !== undefined) {
        // Character-based reading
        const start = Math.max(0, offset || 0);
        const readLength = Math.min(length || 8000, totalChars - start);

        if (start >= totalChars) {
          return output + `错误: 偏移量 ${start} 超出文件总字符数 ${totalChars}`;
        }

        resultContent = fullContent.slice(start, start + readLength);
        rangeInfo = `[读取字符 ${start} - ${start + readLength}，共 ${readLength} 字符]\n\n`;
      } else {
        // Default: read first 8000 characters
        const defaultLength = Math.min(8000, totalChars);
        resultContent = fullContent.slice(0, defaultLength);
        rangeInfo = `[读取前 ${defaultLength} 字符，共 ${totalChars} 字符]\n\n`;
      }

      // Add continuation hint if there's more content
      if (resultContent.length < totalChars && !rangeInfo.includes('超出')) {
        const readInfo = startLine !== undefined || endLine !== undefined
          ? `如需继续读取，请使用 start_line=${(endLine || totalLines) + 1}`
          : `如需继续读取，请使用 offset=${(offset || 0) + resultContent.length}`;
        rangeInfo += `提示: ${readInfo}\n\n`;
      }

      return output + rangeInfo + `内容:\n${resultContent}`;
    } catch (error) {
      return `读取文件失败: ${(error as Error).message}`;
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
