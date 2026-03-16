/**
 * Lua Execution Tool - Run Lua code in browser using Fengari
 * Lightweight alternative to Python (~500KB vs 10MB+)
 */

import type { ToolExecutor } from '$lib/types/tool';

// @ts-ignore - fengari-web doesn't have type definitions
let fengariInstance: any = null;
let loadingPromise: Promise<any> | null = null;

/**
 * Load Fengari (lazy loaded, shared across calls)
 */
async function loadFengari(): Promise<any> {
  if (fengariInstance) return fengariInstance;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    console.log('[Lua] Loading Fengari...');
    // @ts-ignore
    const fengariModule = await import('fengari-web');
    fengariInstance = fengariModule;
    console.log('[Lua] Fengari loaded successfully');
    return fengariInstance;
  })();

  return loadingPromise;
}

/**
 * Execute Lua code
 */
async function executeLua(code: string): Promise<string> {
  try {
    const fengari = await loadFengari();
    const { lua, laux } = fengari;

    // Wrap code with output capture
    const wrappedCode = `
local _output = ""
local _original_print = print
function print(...)
  local args = {...}
  local parts = {}
  for i, v in ipairs(args) do
    parts[i] = tostring(v)
  end
  _output = _output .. table.concat(parts, "\\t") .. "\\n"
end

${code}

-- Return output
return _output
`;

    // Execute code
    const status = laux.dostring(wrappedCode);

    if (status !== 0) {
      // Error occurred - get error message
      const errorMsg = lua.tostring(-1);
      lua.pop(1);
      throw new Error(errorMsg || 'Lua execution error');
    }

    // Get output result
    if (lua.isstring(-1)) {
      const output = lua.tostring(-1);
      lua.pop(1);
      return output || '(无输出)';
    }

    lua.pop(1);
    return '(无输出)';
  } catch (err) {
    throw new Error(`Lua 执行错误: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Get Lua status
 */
function getLuaStatus(): { loaded: boolean; loading: boolean } {
  return {
    loaded: fengariInstance !== null,
    loading: loadingPromise !== null && fengariInstance === null
  };
}

// Tool definitions
export const luaTools: ToolExecutor[] = [
  {
    name: 'run_lua',
    definition: {
      name: 'run_lua',
      description: '执行 Lua 脚本代码。Lua 是一种轻量级脚本语言（~500KB），适合文件处理、数据转换等任务。',
      parameters: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: '要执行的 Lua 代码'
          }
        },
        required: ['code']
      }
    },
    execute: async (args: Record<string, unknown>): Promise<string> => {
      const code = args.code as string;

      if (!code || typeof code !== 'string') {
        throw new Error('请提供有效的 Lua 代码');
      }

      return await executeLua(code);
    }
  },
  {
    name: 'lua_status',
    definition: {
      name: 'lua_status',
      description: '检查 Lua 执行环境的加载状态',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    },
    execute: async (_args: Record<string, unknown>): Promise<string> => {
      const status = getLuaStatus();
      return JSON.stringify({
        loaded: status.loaded,
        loading: status.loading,
        message: status.loaded
          ? 'Lua 环境已就绪'
          : status.loading
          ? 'Lua 环境正在加载...'
          : 'Lua 环境未加载，首次执行时将自动加载（约 1-2 秒）'
      }, null, 2);
    }
  }
];
