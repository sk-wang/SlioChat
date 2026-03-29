/**
 * Command Tools - Linux-like command execution in browser environment
 * Simulates common Linux commands using VFS and JavaScript
 */

import type { ToolExecutor } from '$lib/types/tool';
import { vfs } from '$lib/services/sandbox.svelte';

/**
 * Execute shell-like command
 */
export const shellCommandTool: ToolExecutor = {
  name: 'shell_command',
  definition: {
    name: 'shell_command',
    description: '执行类 Linux 命令，支持 ls, cat, grep, sed, awk, pwd, echo, mkdir, rm, cp, mv, touch, curl, head, tail, wc, sort, uniq, find 等常用命令。命令在沙箱文件系统中执行。',
    parameters: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: '要执行的命令，例如: "ls -la", "cat file.txt", "grep pattern *.js"'
        },
        working_dir: {
          type: 'string',
          description: '工作目录，默认为根目录 /'
        }
      },
      required: ['command']
    }
  },
  timeout: 30000,
  isMutating: true,
  async execute(args) {
    const commandLine = (args.command as string).trim();
    const workingDir = (args.working_dir as string) || '/';

    if (!commandLine) {
      return 'Error: Empty command';
    }

    try {
      const result = await executeCommand(commandLine, workingDir);
      return result;
    } catch (error) {
      return `Error: ${(error as Error).message}`;
    }
  }
};

/**
 * Parse and execute a command line
 */
async function executeCommand(commandLine: string, workingDir: string): Promise<string> {
  // Parse command line (simple parsing, respects quotes)
  const tokens = parseCommandLine(commandLine);
  if (tokens.length === 0) {
    return '';
  }

  const [cmd, ...args] = tokens;
  const command = cmd.toLowerCase();

  // Route to specific command handler
  switch (command) {
    case 'ls':
      return await cmdLs(args, workingDir);
    case 'cat':
      return await cmdCat(args, workingDir);
    case 'pwd':
      return workingDir;
    case 'echo':
      return cmdEcho(args);
    case 'mkdir':
      return await cmdMkdir(args, workingDir);
    case 'rm':
      return await cmdRm(args, workingDir);
    case 'cp':
      return await cmdCp(args, workingDir);
    case 'mv':
      return await cmdMv(args, workingDir);
    case 'touch':
      return await cmdTouch(args, workingDir);
    case 'grep':
      return await cmdGrep(args, workingDir);
    case 'rg':
      return await cmdRg(args, workingDir);
    case 'sed':
      return await cmdSed(args, workingDir);
    case 'awk':
      return await cmdAwk(args, workingDir);
    case 'head':
      return await cmdHead(args, workingDir);
    case 'tail':
      return await cmdTail(args, workingDir);
    case 'wc':
      return await cmdWc(args, workingDir);
    case 'sort':
      return await cmdSort(args, workingDir);
    case 'uniq':
      return await cmdUniq(args, workingDir);
    case 'find':
      return await cmdFind(args, workingDir);
    case 'curl':
      return await cmdCurl(args);
    case 'cd':
      return await cmdCd(args, workingDir);
    case 'which':
    case 'type':
      return cmdWhich(args);
    case 'help':
      return cmdHelp();
    default:
      return `Unknown command: ${cmd}. Type 'help' for available commands.`;
  }
}

/**
 * Parse command line into tokens, respecting quotes
 */
function parseCommandLine(line: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuote: string | null = null;
  let escaped = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"' || char === "'") {
      if (inQuote === char) {
        inQuote = null;
      } else if (!inQuote) {
        inQuote = char;
      } else {
        current += char;
      }
      continue;
    }

    if (char === ' ' && !inQuote) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Resolve path relative to working directory
 */
function resolvePath(path: string, workingDir: string): string {
  if (!path || path === '/') return '/';
  if (path.startsWith('/')) return path;

  const parts = workingDir.split('/').filter(p => p);
  const pathParts = path.split('/').filter(p => p);

  for (const part of pathParts) {
    if (part === '..') {
      parts.pop();
    } else if (part !== '.') {
      parts.push(part);
    }
  }

  return '/' + parts.join('/');
}

/**
 * Get parent directory
 */
function getParentDir(path: string): string {
  const parts = path.split('/').filter(p => p);
  parts.pop();
  return '/' + parts.join('/');
}

/**
 * Get filename from path
 */
function getFileName(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] || '';
}

// ==================== Command Implementations ====================

/**
 * ls - List directory contents
 */
async function cmdLs(args: string[], workingDir: string): Promise<string> {
  let path = workingDir;
  let showAll = false;
  let longFormat = false;
  let humanReadable = false;

  for (const arg of args) {
    if (arg.startsWith('-')) {
      if (arg.includes('a')) showAll = true;
      if (arg.includes('l')) longFormat = true;
      if (arg.includes('h')) humanReadable = true;
    } else {
      path = resolvePath(arg, workingDir);
    }
  }

  try {
    const entries = await vfs.listDir(path);
    entries.sort((a, b) => a.name.localeCompare(b.name));

    if (!showAll) {
      // Filter out hidden files
      // entries = entries.filter(e => !e.name.startsWith('.'));
    }

    if (longFormat) {
      const lines = entries.map(e => {
        const type = e.type === 'directory' ? 'drwxr-xr-x' : '-rw-r--r--';
        const size = humanReadable && e.size
          ? formatBytes(e.size)
          : (e.size || 0).toString();
        const date = new Date().toLocaleDateString();
        return `${type} 1 user user ${size.padStart(8)} ${date} ${e.name}`;
      });
      return lines.join('\n') || 'total 0';
    } else {
      return entries.map(e => e.name).join('  ') || '(empty directory)';
    }
  } catch (error) {
    return `ls: ${(error as Error).message}`;
  }
}

/**
 * cat - Concatenate and print files
 */
async function cmdCat(args: string[], workingDir: string): Promise<string> {
  if (args.length === 0) {
    return 'cat: missing file argument';
  }

  const contents: string[] = [];
  for (const arg of args) {
    if (arg.startsWith('-')) continue; // Skip options
    const path = resolvePath(arg, workingDir);
    try {
      const content = await vfs.readFile(path);
      contents.push(content);
    } catch (error) {
      return `cat: ${arg}: ${(error as Error).message}`;
    }
  }

  return contents.join('\n');
}

/**
 * echo - Print arguments
 */
function cmdEcho(args: string[]): string {
  // Handle -n option (no newline)
  let noNewline = false;
  let startIdx = 0;

  if (args.length > 0 && args[0] === '-n') {
    noNewline = true;
    startIdx = 1;
  }

  // Handle escape sequences
  let result = args.slice(startIdx).join(' ');
  result = result
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\');

  return noNewline ? result : result + '\n';
}

/**
 * mkdir - Create directories
 */
async function cmdMkdir(args: string[], workingDir: string): Promise<string> {
  let createParents = false;
  const paths: string[] = [];

  for (const arg of args) {
    if (arg === '-p' || arg === '--parents') {
      createParents = true;
    } else if (!arg.startsWith('-')) {
      paths.push(arg);
    }
  }

  if (paths.length === 0) {
    return 'mkdir: missing operand';
  }

  for (const path of paths) {
    const resolved = resolvePath(path, workingDir);
    try {
      await vfs.mkdir(resolved);
    } catch (error) {
      if (!createParents) {
        return `mkdir: ${path}: ${(error as Error).message}`;
      }
    }
  }

  return '';
}

/**
 * rm - Remove files or directories
 */
async function cmdRm(args: string[], workingDir: string): Promise<string> {
  let recursive = false;
  let force = false;
  const paths: string[] = [];

  for (const arg of args) {
    if (arg.startsWith('-')) {
      if (arg.includes('r')) recursive = true;
      if (arg.includes('f')) force = true;
    } else {
      paths.push(arg);
    }
  }

  if (paths.length === 0) {
    return 'rm: missing operand';
  }

  for (const path of paths) {
    const resolved = resolvePath(path, workingDir);
    try {
      // Check if it's a directory
      const entries = await vfs.listDir(resolved).catch(() => null);
      if (entries !== null && !recursive) {
        if (!force) {
          return `rm: ${path}: is a directory`;
        }
        continue;
      }
      await vfs.delete(resolved);
    } catch (error) {
      if (!force) {
        return `rm: ${path}: ${(error as Error).message}`;
      }
    }
  }

  return '';
}

/**
 * cp - Copy files
 */
async function cmdCp(args: string[], workingDir: string): Promise<string> {
  let recursive = false;
  const paths: string[] = [];

  for (const arg of args) {
    if (arg === '-r' || arg === '-R') {
      recursive = true;
    } else if (!arg.startsWith('-')) {
      paths.push(arg);
    }
  }

  if (paths.length < 2) {
    return 'cp: missing destination file operand';
  }

  const dest = resolvePath(paths[paths.length - 1], workingDir);
  const sources = paths.slice(0, -1);

  for (const src of sources) {
    const srcPath = resolvePath(src, workingDir);
    try {
      const content = await vfs.readFile(srcPath);
      const destPath = sources.length > 1 || await isDirectory(dest)
        ? `${dest}/${getFileName(srcPath)}`
        : dest;
      await vfs.writeFile(destPath, content);
    } catch (error) {
      return `cp: ${src}: ${(error as Error).message}`;
    }
  }

  return '';
}

/**
 * Check if path is a directory
 */
async function isDirectory(path: string): Promise<boolean> {
  try {
    // First check if path exists as a file
    try {
      await vfs.readFile(path);
      // If readFile succeeds, it's a file, not a directory
      return false;
    } catch {
      // Not a file, check if it's a directory
    }
    // Try to list directory
    await vfs.listDir(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * mv - Move/rename files
 */
async function cmdMv(args: string[], workingDir: string): Promise<string> {
  const paths: string[] = args.filter(a => !a.startsWith('-'));

  if (paths.length < 2) {
    return 'mv: missing destination file operand';
  }

  const dest = resolvePath(paths[paths.length - 1], workingDir);
  const sources = paths.slice(0, -1);

  for (const src of sources) {
    const srcPath = resolvePath(src, workingDir);
    try {
      const content = await vfs.readFile(srcPath);
      const destPath = sources.length > 1 || await isDirectory(dest)
        ? `${dest}/${getFileName(srcPath)}`
        : dest;
      await vfs.writeFile(destPath, content);
      await vfs.delete(srcPath);
    } catch (error) {
      return `mv: ${src}: ${(error as Error).message}`;
    }
  }

  return '';
}

/**
 * touch - Create empty file or update timestamp
 */
async function cmdTouch(args: string[], workingDir: string): Promise<string> {
  const paths = args.filter(a => !a.startsWith('-'));

  if (paths.length === 0) {
    return 'touch: missing file operand';
  }

  for (const path of paths) {
    const resolved = resolvePath(path, workingDir);
    try {
      // Try to read first
      await vfs.readFile(resolved);
    } catch {
      // File doesn't exist, create it
      try {
        await vfs.writeFile(resolved, '');
      } catch (error) {
        return `touch: ${path}: ${(error as Error).message}`;
      }
    }
  }

  return '';
}

/**
 * grep - Search text patterns
 */
async function cmdGrep(args: string[], workingDir: string): Promise<string> {
  let pattern = '';
  let caseSensitive = true;
  let lineNumbers = false;
  let recursive = false;
  let invert = false;
  const paths: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-i') {
      caseSensitive = false;
    } else if (arg === '-n') {
      lineNumbers = true;
    } else if (arg === '-r' || arg === '-R') {
      recursive = true;
    } else if (arg === '-v') {
      invert = true;
    } else if (arg === '-e' && i + 1 < args.length) {
      pattern = args[++i];
    } else if (!arg.startsWith('-')) {
      if (!pattern) {
        pattern = arg;
      } else {
        paths.push(arg);
      }
    }
  }

  if (!pattern) {
    return 'grep: missing pattern';
  }

  // If no paths, search all files
  const searchPaths = paths.length > 0
    ? paths.map(p => resolvePath(p, workingDir))
    : recursive ? [workingDir] : [workingDir];

  const results: string[] = [];
  const flags = caseSensitive ? 'g' : 'gi';

  try {
    const regex = new RegExp(pattern, flags);

    for (const searchPath of searchPaths) {
      // Check if searchPath is a file or directory
      let files: string[] = [];
      try {
        // Try to read as file first
        await vfs.readFile(searchPath);
        files = [searchPath];
      } catch {
        // If not a file, treat as directory
        files = await getFilesRecursive(searchPath);
      }

      for (const file of files) {
        try {
          const content = await vfs.readFile(file);
          const lines = content.split('\n');

          for (let i = 0; i < lines.length; i++) {
            const matches = regex.test(lines[i]);
            if (matches !== invert) {
              const prefix = paths.length > 1 || recursive ? `${file}:` : '';
              const lineNum = lineNumbers ? `${i + 1}:` : '';
              results.push(`${prefix}${lineNum}${lines[i]}`);
            }
          }
        } catch {
          // Skip files that can't be read
        }
      }
    }

    return results.join('\n') || '(no matches)';
  } catch (error) {
    return `grep: invalid pattern: ${(error as Error).message}`;
  }
}

/**
 * rg - Ripgrep-like search (simplified)
 */
async function cmdRg(args: string[], workingDir: string): Promise<string> {
  // rg is similar to grep -r by default
  const grepArgs = ['-r', ...args];
  return await cmdGrep(grepArgs, workingDir);
}

/**
 * sed - Stream editor
 */
async function cmdSed(args: string[], workingDir: string): Promise<string> {
  if (args.length === 0) {
    return 'sed: missing command';
  }

  let script = '';
  const files: string[] = [];
  let inPlace = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-i') {
      inPlace = true;
    } else if (arg === '-e' && i + 1 < args.length) {
      script = args[++i];
    } else if (!arg.startsWith('-')) {
      if (!script) {
        script = arg;
      } else {
        files.push(arg);
      }
    }
  }

  if (!script) {
    return 'sed: missing script';
  }

  // Parse basic s/// substitution
  const subMatch = script.match(/^s(.)(.+?)\1(.+?)\1([gi]*)$/);
  if (!subMatch) {
    return `sed: unsupported command: ${script}`;
  }

  const [, , pattern, replacement, flags] = subMatch;
  const global = flags.includes('g');
  const caseInsensitive = flags.includes('i');

  const processContent = (content: string): string => {
    const regex = new RegExp(pattern, global ? (caseInsensitive ? 'gi' : 'g') : (caseInsensitive ? 'i' : ''));
    // Handle capture groups like \1, \2, etc.
    let repl = replacement.replace(/\\(\d)/g, '$$$1');
    return content.replace(regex, repl);
  };

  if (files.length === 0) {
    return 'sed: requires input file in this environment';
  }

  const results: string[] = [];
  for (const file of files) {
    const path = resolvePath(file, workingDir);
    try {
      const content = await vfs.readFile(path);
      const processed = processContent(content);
      if (inPlace) {
        await vfs.writeFile(path, processed);
      } else {
        results.push(processed);
      }
    } catch (error) {
      return `sed: ${file}: ${(error as Error).message}`;
    }
  }

  return results.join('\n');
}

/**
 * awk - Pattern scanning and processing
 */
async function cmdAwk(args: string[], workingDir: string): Promise<string> {
  if (args.length === 0) {
    return 'awk: missing program';
  }

  let program = '';
  let fieldSeparator = ' ';
  const files: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-F' && i + 1 < args.length) {
      fieldSeparator = args[++i];
    } else if (!arg.startsWith('-')) {
      if (!program) {
        program = arg;
      } else {
        files.push(arg);
      }
    }
  }

  if (!program) {
    return 'awk: missing program';
  }

  // Simplified awk - supports basic {print $1, $2, ...} and $0
  const printMatch = program.match(/\{print\s+(.+)\}/);
  if (!printMatch) {
    return `awk: unsupported program: ${program}`;
  }

  const printExpr = printMatch[1];
  const fields = printExpr.split(',').map(s => s.trim());

  const processLine = (line: string): string => {
    const parts = line.split(fieldSeparator);
    const outputs: string[] = [];

    for (const field of fields) {
      if (field === '$0') {
        outputs.push(line);
      } else if (field.startsWith('$')) {
        const idx = parseInt(field.slice(1), 10) - 1;
        outputs.push(parts[idx] || '');
      } else {
        outputs.push(field.replace(/"/g, ''));
      }
    }

    return outputs.join(' ');
  };

  if (files.length === 0) {
    return 'awk: requires input file in this environment';
  }

  const results: string[] = [];
  for (const file of files) {
    const path = resolvePath(file, workingDir);
    try {
      const content = await vfs.readFile(path);
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.trim()) {
          results.push(processLine(line));
        }
      }
    } catch (error) {
      return `awk: ${file}: ${(error as Error).message}`;
    }
  }

  return results.join('\n');
}

/**
 * head - Output first part of files
 */
async function cmdHead(args: string[], workingDir: string): Promise<string> {
  let lines = 10;
  const files: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-n' && i + 1 < args.length) {
      lines = parseInt(args[++i], 10);
    } else if (arg.startsWith('-n')) {
      lines = parseInt(arg.slice(2), 10);
    } else if (!arg.startsWith('-')) {
      files.push(arg);
    }
  }

  if (files.length === 0) {
    return 'head: requires file operand';
  }

  const results: string[] = [];
  for (const file of files) {
    const path = resolvePath(file, workingDir);
    try {
      const content = await vfs.readFile(path);
      const allLines = content.split('\n');
      results.push(allLines.slice(0, lines).join('\n'));
    } catch (error) {
      return `head: ${file}: ${(error as Error).message}`;
    }
  }

  return results.join('\n');
}

/**
 * tail - Output last part of files
 */
async function cmdTail(args: string[], workingDir: string): Promise<string> {
  let lines = 10;
  const files: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-n' && i + 1 < args.length) {
      lines = parseInt(args[++i], 10);
    } else if (arg.startsWith('-n')) {
      lines = parseInt(arg.slice(2), 10);
    } else if (!arg.startsWith('-')) {
      files.push(arg);
    }
  }

  if (files.length === 0) {
    return 'tail: requires file operand';
  }

  const results: string[] = [];
  for (const file of files) {
    const path = resolvePath(file, workingDir);
    try {
      const content = await vfs.readFile(path);
      const allLines = content.split('\n');
      results.push(allLines.slice(-lines).join('\n'));
    } catch (error) {
      return `tail: ${file}: ${(error as Error).message}`;
    }
  }

  return results.join('\n');
}

/**
 * wc - Word, line, character count
 */
async function cmdWc(args: string[], workingDir: string): Promise<string> {
  let countLines = false;
  let countWords = false;
  let countChars = false;
  const files: string[] = [];

  for (const arg of args) {
    if (arg === '-l') countLines = true;
    else if (arg === '-w') countWords = true;
    else if (arg === '-c' || arg === '-m') countChars = true;
    else if (!arg.startsWith('-')) files.push(arg);
  }

  // Default: count all
  if (!countLines && !countWords && !countChars) {
    countLines = countWords = countChars = true;
  }

  if (files.length === 0) {
    return 'wc: requires file operand';
  }

  const results: string[] = [];
  for (const file of files) {
    const path = resolvePath(file, workingDir);
    try {
      const content = await vfs.readFile(path);
      const stats: string[] = [];

      if (countLines) stats.push(content.split('\n').length.toString());
      if (countWords) stats.push(content.split(/\s+/).filter(w => w).length.toString());
      if (countChars) stats.push(content.length.toString());

      results.push(`${stats.join(' ')} ${file}`);
    } catch (error) {
      return `wc: ${file}: ${(error as Error).message}`;
    }
  }

  return results.join('\n');
}

/**
 * sort - Sort lines
 */
async function cmdSort(args: string[], workingDir: string): Promise<string> {
  let reverse = false;
  let numeric = false;
  let unique = false;
  const files: string[] = [];

  for (const arg of args) {
    if (arg === '-r') reverse = true;
    else if (arg === '-n') numeric = true;
    else if (arg === '-u') unique = true;
    else if (!arg.startsWith('-')) files.push(arg);
  }

  if (files.length === 0) {
    return 'sort: requires file operand';
  }

  const allLines: string[] = [];
  for (const file of files) {
    const path = resolvePath(file, workingDir);
    try {
      const content = await vfs.readFile(path);
      allLines.push(...content.split('\n'));
    } catch (error) {
      return `sort: ${file}: ${(error as Error).message}`;
    }
  }

  allLines.sort((a, b) => {
    if (numeric) {
      const na = parseFloat(a);
      const nb = parseFloat(b);
      if (!isNaN(na) && !isNaN(nb)) {
        return reverse ? nb - na : na - nb;
      }
    }
    return reverse ? b.localeCompare(a) : a.localeCompare(b);
  });

  if (unique) {
    const seen = new Set<string>();
    const uniqueLines: string[] = [];
    for (const line of allLines) {
      if (!seen.has(line)) {
        seen.add(line);
        uniqueLines.push(line);
      }
    }
    return uniqueLines.join('\n');
  }

  return allLines.join('\n');
}

/**
 * uniq - Report or filter repeated lines
 */
async function cmdUniq(args: string[], workingDir: string): Promise<string> {
  let count = false;
  let uniqueOnly = false;
  let repeatedOnly = false;
  const files: string[] = [];

  for (const arg of args) {
    if (arg === '-c') count = true;
    else if (arg === '-u') uniqueOnly = true;
    else if (arg === '-d') repeatedOnly = true;
    else if (!arg.startsWith('-')) files.push(arg);
  }

  const file = files[0] || '';
  if (!file) {
    return 'uniq: requires file operand';
  }

  const path = resolvePath(file, workingDir);
  try {
    const content = await vfs.readFile(path);
    const lines = content.split('\n');
    const results: string[] = [];

    let prev = '';
    let prevCount = 0;

    for (let i = 0; i <= lines.length; i++) {
      const line = lines[i] ?? '';
      if (line === prev) {
        prevCount++;
      } else {
        if (prevCount > 0) {
          const isRepeated = prevCount > 1;
          if ((!uniqueOnly && !repeatedOnly) ||
              (uniqueOnly && !isRepeated) ||
              (repeatedOnly && isRepeated)) {
            const prefix = count ? `${prevCount.toString().padStart(4)} ` : '';
            results.push(`${prefix}${prev}`);
          }
        }
        prev = line;
        prevCount = 1;
      }
    }

    return results.join('\n');
  } catch (error) {
    return `uniq: ${file}: ${(error as Error).message}`;
  }
}

/**
 * find - Search for files
 */
async function cmdFind(args: string[], workingDir: string): Promise<string> {
  let startPath = workingDir;
  let namePattern: string | null = null;
  let typeFilter: string | null = null;
  let maxDepth = -1;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-name' && i + 1 < args.length) {
      namePattern = args[++i];
    } else if (arg === '-type' && i + 1 < args.length) {
      typeFilter = args[++i];
    } else if (arg === '-maxdepth' && i + 1 < args.length) {
      maxDepth = parseInt(args[++i], 10);
    } else if (!arg.startsWith('-') && i === 0) {
      startPath = resolvePath(arg, workingDir);
    }
  }

  const results: string[] = [];

  const searchRecursive = async (dir: string, depth: number) => {
    if (maxDepth >= 0 && depth > maxDepth) return;

    const entries = await vfs.listDir(dir);
    for (const entry of entries) {
      let matches = true;

      if (namePattern) {
        const regex = new RegExp('^' + namePattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
        matches = regex.test(entry.name);
      }

      if (typeFilter) {
        const entryType = entry.type === 'directory' ? 'd' : 'f';
        matches = matches && entryType === typeFilter;
      }

      if (matches) {
        results.push(entry.path);
      }

      if (entry.type === 'directory') {
        await searchRecursive(entry.path, depth + 1);
      }
    }
  };

  try {
    await searchRecursive(startPath, 0);
    return results.join('\n') || '(no matches)';
  } catch (error) {
    return `find: ${(error as Error).message}`;
  }
}

/**
 * curl - Transfer URL
 */
async function cmdCurl(args: string[]): Promise<string> {
  let url = '';
  let method = 'GET';
  let headers: Record<string, string> = {};
  let data: string | null = null;
  let followRedirects = true;
  let silent = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-X' && i + 1 < args.length) {
      method = args[++i];
    } else if (arg === '-H' && i + 1 < args.length) {
      const header = args[++i];
      const [key, ...valueParts] = header.split(':');
      if (key && valueParts.length > 0) {
        headers[key.trim()] = valueParts.join(':').trim();
      }
    } else if (arg === '-d' && i + 1 < args.length) {
      data = args[++i];
    } else if (arg === '-L') {
      followRedirects = true;
    } else if (arg === '-s' || arg === '--silent') {
      silent = true;
    } else if (!arg.startsWith('-')) {
      url = arg;
    }
  }

  if (!url) {
    return 'curl: missing URL';
  }

  // Ensure URL has protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  try {
    const options: RequestInit = {
      method,
      headers,
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = data;
    }

    const response = await fetch(url, options);

    if (!silent) {
      const info = `HTTP ${response.status} ${response.statusText}\n`;
      const body = await response.text();
      return info + body;
    }

    return await response.text();
  } catch (error) {
    return `curl: ${(error as Error).message}`;
  }
}

/**
 * cd - Change directory (returns new path for context)
 */
async function cmdCd(args: string[], workingDir: string): Promise<string> {
  if (args.length === 0) {
    return '/';
  }

  const newPath = resolvePath(args[0], workingDir);
  try {
    await vfs.listDir(newPath); // Verify it's a directory
    return `Changed directory to: ${newPath}`;
  } catch (error) {
    return `cd: ${args[0]}: ${(error as Error).message}`;
  }
}

/**
 * which - Locate command
 */
function cmdWhich(args: string[]): string {
  if (args.length === 0) {
    return 'which: missing argument';
  }

  const builtins = ['ls', 'cat', 'pwd', 'echo', 'mkdir', 'rm', 'cp', 'mv', 'touch',
    'grep', 'rg', 'sed', 'awk', 'head', 'tail', 'wc', 'sort', 'uniq', 'find',
    'curl', 'cd', 'which', 'type', 'help'];

  const results: string[] = [];
  for (const cmd of args) {
    if (builtins.includes(cmd)) {
      results.push(`${cmd}: shell builtin`);
    } else {
      results.push(`which: no ${cmd} in (virtual environment)`);
    }
  }

  return results.join('\n');
}

/**
 * help - Show help information
 */
function cmdHelp(): string {
  return `Available commands:
  File Operations:
    ls [options] [path]     List directory contents
    cat [files...]          Display file contents
    touch [files...]        Create empty files
    mkdir [-p] [dirs...]    Create directories
    rm [-rf] [paths...]     Remove files or directories
    cp [-r] src dest        Copy files
    mv src dest             Move/rename files
    pwd                     Print working directory
    cd [dir]                Change directory
    find [path] [expr]      Search for files

  Text Processing:
    grep [options] pattern [files]  Search for patterns
    rg [options] pattern    Ripgrep search (recursive)
    sed [script] [files]    Stream editor
    awk [program] [files]   Pattern scanning
    head [-n N] [files]     Output first lines
    tail [-n N] [files]     Output last lines
    wc [-lwc] [files]       Word/line/char count
    sort [-nru] [files]     Sort lines
    uniq [-cdu] [file]      Filter repeated lines
    echo [text...]          Print text

  Network:
    curl [options] URL      Transfer data from URL

  Other:
    which [commands...]     Locate commands
    help                    Show this help

Options:
  ls: -a (all), -l (long), -h (human readable)
  grep: -i (ignore case), -n (line numbers), -r (recursive), -v (invert)
  sed: -i (in-place), -e (script)
  head/tail: -n N (number of lines)
  sort: -n (numeric), -r (reverse), -u (unique)
  rm: -r (recursive), -f (force)
  cp: -r (recursive)
  find: -name pattern, -type f/d, -maxdepth N
  curl: -X METHOD, -H header, -d data, -L (follow redirects)`;
}

// ==================== Utility Functions ====================

/**
 * Get all files recursively
 */
async function getFilesRecursive(dirPath: string): Promise<string[]> {
  const entries = await vfs.listDir(dirPath);
  let files: string[] = [];

  for (const entry of entries) {
    if (entry.type === 'file') {
      files.push(entry.path);
    } else if (entry.type === 'directory') {
      const subFiles = await getFilesRecursive(entry.path);
      files = files.concat(subFiles);
    }
  }

  return files;
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
}

// ==================== Export ====================

/**
 * All command tools
 */
export const commandTools: ToolExecutor[] = [
  shellCommandTool
];

/**
 * Register command tools
 */
export function registerCommandTools(registry: { register: (tool: ToolExecutor) => void }): void {
  for (const tool of commandTools) {
    registry.register(tool);
  }
}
