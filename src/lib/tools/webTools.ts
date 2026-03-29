/**
 * Web Tools - Enhanced web search, fetch, fact-check, and deep research for Agent
 * Inspired by DeerFlow's search/research architecture
 */

import type { ToolExecutor } from '$lib/types/tool';
import { performSearch, type SearchResult } from '$lib/services/search';
import { settingsStore } from '$lib/stores/settings.svelte';

// ==================== Web Search (Enhanced) ====================

export const webSearchTool: ToolExecutor = {
  name: 'web_search',
  definition: {
    name: 'web_search',
    description: '联网搜索获取最新信息。支持多次搜索不同关键词来全面了解一个话题。返回搜索结果的标题、链接和摘要。对于复杂问题，建议用不同角度的关键词多次搜索。',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索关键词。尽量具体，包含时间、地点等限定词以获得更精确的结果。例如："2025年中国AI行业报告" 而非 "AI"'
        },
        max_results: {
          type: 'number',
          description: '返回结果数量，默认5，最多10'
        }
      },
      required: ['query']
    }
  },
  timeout: 30000,
  async execute(args) {
    const query = args.query as string;
    const maxResults = Math.min((args.max_results as number) || 5, 10);
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
        return `搜索 "${query}" 没有找到相关结果。建议：1) 换用不同的关键词 2) 减少限定条件 3) 使用英文搜索`;
      }

      const limited = results.slice(0, maxResults);
      const output = limited.map((r, i) => {
        const snippet = r.snippet ? `\n摘要: ${r.snippet}` : '';
        const summary = r.summary ? `\n总结: ${r.summary}` : '';
        return `${i + 1}. **${r.name}**\n   链接: ${r.url}${snippet}${summary}`;
      }).join('\n\n');

      return `搜索 "${query}" 找到 ${results.length} 个结果:\n\n${output}\n\n提示: 如需更详细信息，可使用 web_fetch 获取某篇文章的完整内容。`;
    } catch (error) {
      return `搜索失败: ${(error as Error).message}`;
    }
  }
};

// ==================== Web Fetch (Enhanced with Jina Reader) ====================

export const webFetchTool: ToolExecutor = {
  name: 'web_fetch',
  definition: {
    name: 'web_fetch',
    description: '获取指定URL网页的正文内容，自动提取主要文章内容并转为易读的文本格式。当搜索结果中有重要来源需要深入了解时使用。',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: '要获取的网页URL。必须是完整的URL，包含协议头(https://)'
        },
        max_length: {
          type: 'number',
          description: '返回内容的最大字符数，默认8000'
        }
      },
      required: ['url']
    }
  },
  timeout: 30000,
  async execute(args) {
    const url = args.url as string;
    const maxLength = (args.max_length as number) || 8000;

    // Try Jina Reader API first (better content extraction)
    try {
      const jinaResult = await fetchViaJina(url, maxLength);
      if (jinaResult) return jinaResult;
    } catch {
      // Jina failed, fall through to direct fetch
    }

    // Fallback: direct fetch with HTML cleaning
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (compatible; SlioChat/1.0)',
        }
      });

      if (!response.ok) {
        return `获取失败: HTTP ${response.status} ${response.statusText}`;
      }

      const text = await response.text();
      const content = extractMainContent(text, maxLength);

      return `URL: ${url}\n\n${content}`;
    } catch (error) {
      return `获取网页失败: ${(error as Error).message}\n\n提示: 可能是跨域(CORS)限制导致无法直接访问。建议搜索该网站的其他可用页面。`;
    }
  }
};

// ==================== Fact Check Tool ====================

export const factCheckTool: ToolExecutor = {
  name: 'fact_check',
  definition: {
    name: 'fact_check',
    description: '对一条陈述进行事实核查。通过多个搜索查询从不同角度验证信息的准确性，返回支持、反驳或无法验证的结论。',
    parameters: {
      type: 'object',
      properties: {
        claim: {
          type: 'string',
          description: '需要验证的陈述或事实，例如："中国GDP在2024年超过了美国"'
        }
      },
      required: ['claim']
    }
  },
  timeout: 60000,
  async execute(args) {
    const claim = args.claim as string;
    const searchConfig = settingsStore.config.search;

    if (!searchConfig.enabled || !searchConfig.token) {
      return '错误: 需要启用联网搜索功能才能进行事实核查。';
    }

    try {
      // Strategy: search from multiple angles
      const searchQueries = [
        claim,
        `${claim} 争议 辟谣`,
        `${claim} 官方 数据 证实`,
      ];

      const allResults: Array<{ query: string; results: SearchResult[] }> = [];

      for (const query of searchQueries) {
        const results = await performSearch(query);
        allResults.push({ query, results: results.slice(0, 3) });
      }

      // Format results
      const formatted = allResults.map(({ query, results }) => {
        if (results.length === 0) return `查询 "${query}": 无结果`;
        const items = results.map((r, i) =>
          `${i + 1}. ${r.name}\n   ${r.url}\n   ${r.snippet || '无摘要'}`
        ).join('\n');
        return `## 查询: "${query}"\n${items}`;
      }).join('\n\n');

      // Fetch the most relevant source for deeper analysis
      const topResult = allResults[0]?.results[0];
      let deepContent = '';
      if (topResult?.url) {
        try {
          const response = await fetch(`https://r.jina.ai/${topResult.url}`, {
            headers: { 'Accept': 'text/plain' },
            signal: AbortSignal.timeout(10000),
          });
          if (response.ok) {
            const text = await response.text();
            deepContent = text.slice(0, 3000);
          }
        } catch {
          // Deep fetch optional
        }
      }

      let output = `# 事实核查: "${claim}"\n\n${formatted}`;

      if (deepContent) {
        output += `\n\n## 主要来源详情 (${topResult.url})\n${deepContent}`;
      }

      output += `\n\n---\n请根据以上多个来源的信息，判断该陈述的准确性。注意比较不同来源的说法是否一致。`;

      return output;
    } catch (error) {
      return `事实核查失败: ${(error as Error).message}`;
    }
  }
};

// ==================== Deep Research Tool ====================

export const deepResearchTool: ToolExecutor = {
  name: 'deep_research',
  definition: {
    name: 'deep_research',
    description: '对一个话题进行深度研究。自动执行多轮搜索，从广度探索到深度挖掘，再到多角度验证，最终返回全面的研究结果。适用于需要深入了解的复杂问题。',
    parameters: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: '需要深度研究的话题'
        },
        aspects: {
          type: 'array',
          items: { type: 'string' },
          description: '需要探索的具体方面（可选）。不提供则自动规划研究维度。例如: ["技术原理", "市场现状", "发展趋势"]'
        }
      },
      required: ['topic']
    }
  },
  timeout: 120000,
  maxRetries: 1,
  async execute(args) {
    const topic = args.topic as string;
    const aspects = args.aspects as string[] | undefined;
    const searchConfig = settingsStore.config.search;

    if (!searchConfig.enabled || !searchConfig.token) {
      return '错误: 需要启用联网搜索功能才能进行深度研究。';
    }

    try {
      // Phase 1: Broad exploration
      const broadQueries = [
        `${topic} 概述`,
        `${topic} 最新进展 2025`,
        `${topic} 分析 报告`,
      ];

      const broadResults: SearchResult[] = [];
      for (const q of broadQueries) {
        const results = await performSearch(q);
        broadResults.push(...results.slice(0, 3));
      }

      // Deduplicate by URL
      const seen = new Set<string>();
      const uniqueResults = broadResults.filter(r => {
        if (seen.has(r.url)) return false;
        seen.add(r.url);
        return true;
      });

      let output = `# 深度研究: "${topic}"\n\n`;

      // Phase 1 output
      output += `## Phase 1: 广度探索\n\n`;
      output += formatResearchResults(uniqueResults.slice(0, 8));

      // Phase 2: Deep dive into specific aspects
      const researchAspects = aspects || [
        `${topic} 数据 统计`,
        `${topic} 案例 实践`,
        `${topic} 挑战 问题`,
      ];

      output += `\n\n## Phase 2: 深度挖掘\n\n`;
      for (const aspect of researchAspects.slice(0, 3)) {
        const results = await performSearch(aspect);
        if (results.length > 0) {
          output += `### ${aspect}\n`;
          output += formatResearchResults(results.slice(0, 3));
          output += '\n';
        }
      }

      // Phase 3: Fetch top sources for details
      const topUrls = uniqueResults.slice(0, 2).map(r => r.url).filter(Boolean);
      if (topUrls.length > 0) {
        output += `\n\n## Phase 3: 重点来源详情\n\n`;
        for (const url of topUrls) {
          try {
            const content = await fetchViaJina(url, 2000);
            if (content) {
              output += `### ${url}\n${content}\n\n`;
            }
          } catch {
            // Skip failed fetches
          }
        }
      }

      // Quality check
      output += `\n---\n`;
      output += `## 研究覆盖度检查\n`;
      output += `- 搜索查询数: ${broadQueries.length + researchAspects.length}\n`;
      output += `- 来源数量: ${uniqueResults.length}\n`;
      output += `- 已获取详情: ${topUrls.length} 篇\n`;
      output += `\n如果覆盖不够全面，可以针对特定方面再次使用 web_search 深入搜索。`;

      return output;
    } catch (error) {
      return `深度研究失败: ${(error as Error).message}`;
    }
  }
};

// ==================== Helper Functions ====================

/**
 * Fetch URL via Jina Reader API (extracts main content as text)
 */
async function fetchViaJina(url: string, maxLength: number): Promise<string | null> {
  try {
    const response = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        'Accept': 'text/plain',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) return null;

    const text = await response.text();
    const content = text.slice(0, maxLength);

    if (content.trim().length < 50) return null;

    return content.length < text.length
      ? content + '\n\n[内容已截断]'
      : content;
  } catch {
    return null;
  }
}

/**
 * Extract main content from HTML (fallback when Jina is unavailable)
 */
function extractMainContent(html: string, maxLength: number): string {
  let content = html;

  // Remove unwanted elements
  content = content
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // Convert some HTML to readable format
  content = content
    .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, '\n## $1\n')
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();

  if (content.length > maxLength) {
    content = content.slice(0, maxLength) + `\n\n[内容已截断，共 ${content.length} 字符。可用 web_fetch 再次获取并指定 offset 参数读取后续内容]`;
  }

  return content;
}

/**
 * Format research results for display
 */
function formatResearchResults(results: SearchResult[]): string {
  return results.map((r, i) => {
    const summary = r.summary ? `\n   总结: ${r.summary}` : '';
    return `${i + 1}. **${r.name}**\n   链接: ${r.url}\n   摘要: ${r.snippet || '无'}${summary}`;
  }).join('\n\n');
}

// ==================== Export ====================

/**
 * All web tools
 */
export const webTools: ToolExecutor[] = [
  webSearchTool,
  webFetchTool,
  factCheckTool,
  deepResearchTool,
];
