/**
 * Context Manager - Intelligent context compression and management
 * Inspired by Codex context handling
 */

import type { Message } from '$lib/types';

// Approximate tokens per character (rough estimate for most models)
const TOKENS_PER_CHAR = 0.25;
const TOKENS_PER_WORD = 1.3;

// Default context limits
const DEFAULT_MAX_TOKENS = 128000;
const DEFAULT_RESERVE_TOKENS = 4000; // Reserve for response

export interface ContextStats {
  totalMessages: number;
  estimatedTokens: number;
  maxTokens: number;
  utilization: number;
  needsCompression: boolean;
}

export interface CompressionResult {
  messages: Message[];
  wasCompressed: boolean;
  originalTokenCount: number;
  newTokenCount: number;
  summary?: string;
}

/**
 * Estimate token count for a text
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // Use word-based estimation for better accuracy
  const words = text.split(/\s+/).filter(w => w.length > 0).length;
  const chars = text.length;
  // Blend both methods for better estimation
  return Math.ceil((words * TOKENS_PER_WORD + chars * TOKENS_PER_CHAR) / 2);
}

/**
 * Estimate tokens for a message
 */
export function estimateMessageTokens(message: Message): number {
  let tokens = estimateTokens(message.content);

  // Add overhead for message structure
  tokens += 4; // role, content wrappers

  // Add tokens for tool calls if present
  if (message.toolCalls) {
    for (const call of message.toolCalls) {
      tokens += estimateTokens(JSON.stringify(call.function.arguments));
      tokens += estimateTokens(call.function.name);
      tokens += 10; // structure overhead
    }
  }

  // Add tokens for metadata
  if (message.metadata) {
    tokens += estimateTokens(JSON.stringify(message.metadata));
  }

  return tokens;
}

/**
 * Get context statistics
 */
export function getContextStats(
  messages: Message[],
  maxTokens: number = DEFAULT_MAX_TOKENS,
  reserveTokens: number = DEFAULT_RESERVE_TOKENS
): ContextStats {
  const estimatedTokens = messages.reduce(
    (sum, msg) => sum + estimateMessageTokens(msg),
    0
  );
  const availableTokens = maxTokens - reserveTokens;
  const utilization = estimatedTokens / availableTokens;

  return {
    totalMessages: messages.length,
    estimatedTokens,
    maxTokens: availableTokens,
    utilization,
    needsCompression: utilization > 0.8
  };
}

/**
 * Compress context by summarizing old messages
 * Keeps recent messages intact, summarizes older ones
 */
export function compressContext(
  messages: Message[],
  maxTokens: number = DEFAULT_MAX_TOKENS,
  reserveTokens: number = DEFAULT_RESERVE_TOKENS
): CompressionResult {
  const stats = getContextStats(messages, maxTokens, reserveTokens);

  if (!stats.needsCompression) {
    return {
      messages,
      wasCompressed: false,
      originalTokenCount: stats.estimatedTokens,
      newTokenCount: stats.estimatedTokens
    };
  }

  const availableTokens = maxTokens - reserveTokens;
  const targetTokens = availableTokens * 0.6; // Target 60% utilization

  // Strategy: Keep recent messages, truncate/summarize older ones
  // Always keep the first message (usually contains important context)
  // Keep last N messages that fit within target

  const result: Message[] = [];
  let currentTokens = 0;

  // Keep first user message if it exists (often contains the main request)
  if (messages.length > 0 && messages[0].role === 'user') {
    const firstMsg = messages[0];
    const firstTokens = estimateMessageTokens(firstMsg);
    if (firstTokens < targetTokens * 0.3) { // Don't keep if too long
      result.push(firstMsg);
      currentTokens += firstTokens;
    }
  }

  // Add a summary message for truncated content
  const truncatedCount = messages.length - 1;
  let summaryAdded = false;

  // Work backwards from the end, adding messages until we hit the limit
  const recentMessages: Message[] = [];
  let recentTokens = 0;

  for (let i = messages.length - 1; i >= 1; i--) {
    const msg = messages[i];
    const msgTokens = estimateMessageTokens(msg);

    if (currentTokens + recentTokens + msgTokens < targetTokens) {
      recentMessages.unshift(msg);
      recentTokens += msgTokens;
    } else {
      // Can't fit more, need to add summary
      if (!summaryAdded && i > 0) {
        const summaryMsg: Message = {
          role: 'assistant',
          content: `[ Earlier conversation context (${i} messages) has been compressed to save space. Key information is retained in the recent messages below. ]`,
          type: 'normal'
        };
        const summaryTokens = estimateMessageTokens(summaryMsg);
        if (currentTokens + recentTokens + summaryTokens < targetTokens) {
          recentMessages.unshift(summaryMsg);
          recentTokens += summaryTokens;
          summaryAdded = true;
        }
      }
      break;
    }
  }

  result.push(...recentMessages);

  const newTokenCount = result.reduce(
    (sum, msg) => sum + estimateMessageTokens(msg),
    0
  );

  return {
    messages: result,
    wasCompressed: true,
    originalTokenCount: stats.estimatedTokens,
    newTokenCount,
    summary: summaryAdded ? `Compressed ${truncatedCount - recentMessages.length + 1} earlier messages` : undefined
  };
}

/**
 * Smart context window management
 * Returns messages that fit within the context window
 */
export function getMessagesForContextWindow(
  messages: Message[],
  maxTokens: number = DEFAULT_MAX_TOKENS,
  reserveTokens: number = DEFAULT_RESERVE_TOKENS
): { messages: Message[]; stats: ContextStats } {
  const stats = getContextStats(messages, maxTokens, reserveTokens);

  if (!stats.needsCompression) {
    return { messages, stats };
  }

  const compression = compressContext(messages, maxTokens, reserveTokens);
  const newStats = getContextStats(compression.messages, maxTokens, reserveTokens);

  return {
    messages: compression.messages,
    stats: newStats
  };
}

/**
 * Format context stats for display
 */
export function formatContextStats(stats: ContextStats): string {
  const percent = Math.round(stats.utilization * 100);
  const usedK = (stats.estimatedTokens / 1000).toFixed(1);
  const maxK = (stats.maxTokens / 1000).toFixed(0);

  if (stats.utilization < 0.5) {
    return `${usedK}k / ${maxK}k tokens (${percent}%)`;
  } else if (stats.utilization < 0.8) {
    return `${usedK}k / ${maxK}k tokens (${percent}%) ⚠️`;
  } else {
    return `${usedK}k / ${maxK}k tokens (${percent}%) 🔴`;
  }
}
