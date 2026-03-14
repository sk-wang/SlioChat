/**
 * Web Tools - Web search and fetch for Agent
 */

import type { ToolExecutor } from '$lib/types/tool';
import { performSearch, formatSearchResults } from '$lib/services/search';
import { settingsStore } from '$lib/stores/settings.svelte';

/**
 * Web search tool
 */
export const webSearchTool: ToolExecutor = {
  name: 'web_search',
  definition: {
    name: 'web_search',
    description: '联网搜索获取最新信息。当用户询问实时新闻、最新数据、或需要从互联网获取信息时使用。返回搜索结果的标题、链接和摘要。',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索关键词或查询语句'
        }
      },
      required: ['query']
    }
  },
  async execute(args) {
    const query = args.query as string;
    const searchConfig = settingsStore.config.search;

    if (!searchConfig.enabled) {
      return '错误: 联网搜索功能未启用。请在设置中开启搜索功能。';
    }

    if (!searchConfig.token) {
      return '错误: 未配置搜索 API Token。请在设置中配置。';
    }

    try {
      const results = await performSearch(query);

      if (results.length === 0) {
        return `搜索 "${query}" 没有找到相关结果。`;
      }

      const formatted = formatSearchResults(results);

      // Limit results
      const maxResults = 5;
      const limitedResults = results.slice(0, maxResults);
      const output = limitedResults.map((r, i) => {
        const summary = r.summary ? `\n摘要: ${r.summary}` : '';
        return `${i + 1}. ${r.name}\n链接: ${r.url}${summary}`;
      }).join('\n\n');

      return `搜索 "${query}" 找到 ${results.length} 个结果（显示前 ${limitedResults.length} 个）:\n\n${output}`;
    } catch (error) {
      return `搜索失败: ${(error as Error).message}`;
    }
  }
};

/**
 * Web fetch tool - fetch content from URL
 */
export const webFetchTool: ToolExecutor = {
  name: 'web_fetch',
  definition: {
    name: 'web_fetch',
    description: '从指定 URL 获取网页内容。当需要读取某个网页的详细内容时使用。',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: '要获取的网页 URL'
        }
      },
      required: ['url']
    }
  },
  async execute(args) {
    const url = args.url as string;

    try {
      // Use a CORS proxy or the URL directly
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
      });

      if (!response.ok) {
        return `获取失败: HTTP ${response.status}`;
      }

      const text = await response.text();

      // Simple HTML to text conversion
      let content = text
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Limit content length
      const maxLength = 5000;
      if (content.length > maxLength) {
        content = content.slice(0, maxLength) + `\n\n[内容已截断，共 ${content.length} 字符]`;
      }

      return `URL: ${url}\n\n内容:\n${content}`;
    } catch (error) {
      return `获取网页失败: ${(error as Error).message}`;
    }
  }
};

/**
 * All web tools
 */
export const webTools: ToolExecutor[] = [
  webSearchTool,
  webFetchTool
];
