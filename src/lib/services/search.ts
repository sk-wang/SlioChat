import { settingsStore } from '$lib/stores/settings.svelte';

export interface SearchResult {
  name: string;
  url: string;
  snippet: string;
  summary?: string;
}

export async function performSearch(query: string): Promise<SearchResult[]> {
  const searchConfig = settingsStore.config.search;
  
  if (!searchConfig.enabled || !searchConfig.token) {
    return [];
  }

  try {
    const response = await fetch(searchConfig.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + searchConfig.token,
      },
      body: JSON.stringify({
        query,
        freshness: 'oneWeek',
        summary: true,
      }),
    });

    if (!response.ok) {
      throw new Error('Search request failed');
    }

    const data = await response.json();
    return data.data?.webPages?.value || [];
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

export async function shouldSearch(message: string): Promise<boolean> {
  const searchConfig = settingsStore.config.search;
  if (!searchConfig.enabled) return false;

  const judgerModel = settingsStore.config.searchJudgerModel;
  const modelConfig = settingsStore.config.models[judgerModel];
  
  if (!modelConfig) return false;

  try {
    const response = await fetch(modelConfig.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + (modelConfig.key || settingsStore.config.defaultKey),
      },
      body: JSON.stringify({
        model: judgerModel,
        messages: [
          {
            role: 'system',
            content: '你是一个搜索判断器。请根据用户的消息判断是否需要联网搜索。如果需要搜索，请直接返回"true"，否则返回"false"。不要任何多余的话。',
          },
          {
            role: 'user',
            content: message,
          },
        ],
      }),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content === 'true';
  } catch {
    return false;
  }
}

export async function generateSearchQuery(message: string): Promise<string> {
  const judgerModel = settingsStore.config.searchJudgerModel;
  const modelConfig = settingsStore.config.models[judgerModel];
  
  if (!modelConfig) return message;

  try {
    const response = await fetch(modelConfig.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + (modelConfig.key || settingsStore.config.defaultKey),
      },
      body: JSON.stringify({
        model: judgerModel,
        messages: [
          {
            role: 'system',
            content: '你是一个搜索请求生成器。请根据用户的消息生成一个适合搜索的简洁查询语句，直接返回查询语句，不要任何多余的话。',
          },
          {
            role: 'user',
            content: message,
          },
        ],
      }),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || message;
  } catch {
    return message;
  }
}

export function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) return '';
  
  return results
    .map((result, index) => {
      const summary = result.summary ? '\n摘要: ' + result.summary : '';
      return '来源' + (index + 1) + ': ' + result.name + '\n链接: ' + result.url + summary;
    })
    .join('\n\n');
}
