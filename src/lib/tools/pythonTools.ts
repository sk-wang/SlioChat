/**
 * Python Execution Tool - Run Python code in browser using Pyodide
 * Allows users to write Python scripts to manipulate VFS files
 */

import type { ToolExecutor, ToolDefinition } from '$lib/types/tool';
import { vfs } from '$lib/services/sandbox.svelte';
import type { PyodideInterface } from 'pyodide';

// Pyodide instance (lazy loaded)
let pyodideInstance: PyodideInterface | null = null;
let loadingPromise: Promise<PyodideInterface> | null = null;

/**
 * Load Pyodide (only once, shared across calls)
 */
async function loadPyodide(): Promise<PyodideInterface> {
  if (pyodideInstance) {
    return pyodideInstance;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    console.log('[Python] Loading Pyodide...');
    const { loadPyodide } = await import('pyodide');
    pyodideInstance = await loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/',
    });

    // Setup VFS bridge for Python
    await setupVFSBridge(pyodideInstance);

    console.log('[Python] Pyodide loaded successfully');
    return pyodideInstance;
  })();

  return loadingPromise;
}

/**
 * Setup VFS bridge - expose VFS operations to Python
 */
async function setupVFSBridge(pyodide: PyodideInterface): Promise<void> {
  // Create Python module for VFS operations
  await pyodide.runPythonAsync(`
import sys
from io import StringIO

class VFS:
    """Virtual File System interface from Python"""

    @staticmethod
    def read_file(path):
        """Read file content from VFS"""
        return _vfs_read(path)

    @staticmethod
    def write_file(path, content):
        """Write content to file in VFS"""
        return _vfs_write(path, content)

    @staticmethod
    def delete_file(path):
        """Delete file from VFS"""
        return _vfs_delete(path)

    @staticmethod
    def list_dir(path='/'):
        """List directory contents"""
        return _vfs_list(path)

    @staticmethod
    def file_exists(path):
        """Check if file exists"""
        return _vfs_exists(path)

    @staticmethod
    def mkdir(path):
        """Create directory"""
        return _vfs_mkdir(path)

# Convenience functions
def read_file(path):
    """Read file content from VFS"""
    return VFS.read_file(path)

def write_file(path, content):
    """Write content to file in VFS"""
    return VFS.write_file(path, content)

def list_dir(path='/'):
    """List directory contents"""
    return VFS.list_dir(path)

def file_exists(path):
    """Check if file exists"""
    return VFS.file_exists(path)

print("🐍 Python environment ready!")
  `);

  // Expose JavaScript VFS functions to Python
  pyodide.globals.set('_vfs_read', async (path: string) => {
    try {
      return await vfs.readFile(path);
    } catch (e) {
      throw new Error(`VFS read error: ${(e as Error).message}`);
    }
  });

  pyodide.globals.set('_vfs_write', async (path: string, content: string) => {
    try {
      await vfs.writeFile(path, content);
      return True;
    } catch (e) {
      throw new Error(`VFS write error: ${(e as Error).message}`);
    }
  });

  pyodide.globals.set('_vfs_delete', async (path: string) => {
    try {
      await vfs.deleteFile(path);
      return True;
    } catch (e) {
      throw new Error(`VFS delete error: ${(e as Error).message}`);
    }
  });

  pyodide.globals.set('_vfs_list', async (path: string) => {
    try {
      const entries = await vfs.listDir(path);
      return entries.map(e => ({
        name: e.name,
        path: e.path,
        type: e.type
      }));
    } catch (e) {
      throw new Error(`VFS list error: ${(e as Error).message}`);
    }
  });

  pyodide.globals.set('_vfs_exists', async (path: string) => {
    try {
      await vfs.readFile(path);
      return true;
    } catch {
      return false;
    }
  });

  pyodide.globals.set('_vfs_mkdir', async (path: string) => {
    try {
      await vfs.mkdir(path);
      return True;
    } catch (e) {
      throw new Error(`VFS mkdir error: ${(e as Error).message}`);
    }
  });
}

/**
 * Run Python tool definition
 */
const runPythonDefinition: ToolDefinition = {
  name: 'run_python',
  description: `在浏览器中执行 Python 代码。可以操作 VFS 中的文件。

可用函数:
- read_file(path) - 读取 VFS 文件
- write_file(path, content) - 写入 VFS 文件
- list_dir(path) - 列出目录内容
- file_exists(path) - 检查文件是否存在
- VFS.read_file/write_file/delete_file/list_dir/mkdir - 类方法形式

注意:
- 代码是异步执行的，文件操作需要 await
- 支持标准库（os, json, re, math 等）
- 输出使用 print() 函数`,
  parameters: {
    type: 'object',
    properties: {
      code: {
        type: 'string',
        description: '要执行的 Python 代码'
      },
      timeout: {
        type: 'number',
        description: '执行超时时间（毫秒），默认 30000'
      }
    },
    required: ['code']
  }
};

/**
 * Python version constants for True/False
 */
const True = true;
const False = false;

/**
 * Run Python tool executor
 */
export const runPythonTool: ToolExecutor = {
  name: 'run_python',
  definition: runPythonDefinition,
  isMutating: true, // Python code can modify files
  timeout: 60000,
  async execute(args) {
    const code = args.code as string;
    const timeoutMs = (args.timeout as number) ?? 30000;

    try {
      // Load Pyodide
      const pyodide = await loadPyodide();

      // Capture stdout
      await pyodide.runPythonAsync(`
import sys
from io import StringIO
_capture_buffer = StringIO()
_original_stdout = sys.stdout
sys.stdout = _capture_buffer
      `);

      // Execute user code with timeout
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Python 执行超时')), timeoutMs)
      );

      const resultPromise = pyodide.runPythonAsync(code);

      const result = await Promise.race([resultPromise, timeoutPromise]);

      // Get captured output
      const output = await pyodide.runPythonAsync(`
sys.stdout = _original_stdout
_capture_buffer.getvalue()
      `);

      // Format response
      let response = '';
      if (output && output.trim()) {
        response += `📤 输出:\n\`\`\`\n${output}\n\`\`\``;
      }
      if (result !== undefined && result !== null) {
        const resultStr = result.toString();
        if (resultStr && resultStr !== 'None') {
          if (response) response += '\n\n';
          response += `📊 返回值: ${resultStr}`;
        }
      }
      if (!response) {
        response = '✅ Python 代码执行成功（无输出）';
      }

      return response;
    } catch (error) {
      const err = error as Error;
      let errorMsg = err.message;

      // Clean up Python error messages
      if (errorMsg.includes('PythonError')) {
        errorMsg = errorMsg
          .replace(/PythonError: /g, '')
          .replace(/\n\s*at.*/g, '')
          .trim();
      }

      return `❌ Python 执行错误:\n\`\`\`\n${errorMsg}\n\`\`\``;
    }
  }
};

/**
 * Get Python status tool
 */
const pythonStatusDefinition: ToolDefinition = {
  name: 'python_status',
  description: '检查 Python 环境状态，包括是否已加载、可用版本等。',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  }
};

export const pythonStatusTool: ToolExecutor = {
  name: 'python_status',
  definition: pythonStatusDefinition,
  isMutating: false,
  async execute() {
    const status = {
      loaded: pyodideInstance !== null,
      loading: loadingPromise !== null && pyodideInstance === null
    };

    if (status.loaded) {
      const pyodide = pyodideInstance!;
      const version = await pyodide.runPythonAsync('import sys; sys.version');
      return `✅ Python 环境已就绪

🐍 版本信息:
${version.split('\n')[0]}

📦 可用模块:
- 标准库: os, json, re, math, datetime, collections, itertools...
- VFS 操作: read_file, write_file, list_dir, file_exists
- 类接口: VFS.read_file, VFS.write_file, VFS.list_dir 等`;
    } else if (status.loading) {
      return '⏳ Python 环境正在加载中...';
    } else {
      return '⚠️ Python 环境未加载。首次使用 run_python 时会自动加载。';
    }
  }
};

/**
 * Preload Python tool - start loading Pyodide in background
 */
const preloadPythonDefinition: ToolDefinition = {
  name: 'preload_python',
  description: '预加载 Python 环境。首次使用 Python 时会自动加载，但可以提前调用此工具在后台加载。',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  }
};

export const preloadPythonTool: ToolExecutor = {
  name: 'preload_python',
  definition: preloadPythonDefinition,
  isMutating: false,
  async execute() {
    if (pyodideInstance) {
      return '✅ Python 环境已经加载完成。';
    }

    // Start loading in background
    loadPyodide().catch(console.error);

    return '🔄 开始在后台加载 Python 环境...\n\n💡 这可能需要 10-20 秒，加载完成后会自动可用。';
  }
};

// Export all Python tools
export const pythonTools: ToolExecutor[] = [
  runPythonTool,
  pythonStatusTool,
  preloadPythonTool
];
