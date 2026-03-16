/**
 * Plan Tools - Task planning and progress tracking for Agent
 * Inspired by Codex update_plan tool
 */

import type { ToolExecutor } from '$lib/types/tool';
import { agentStore, type PlanItem } from '$lib/stores/agent.svelte';

// Re-export PlanItem for external use
export type { PlanItem } from '$lib/stores/agent.svelte';

/**
 * Update or get the current plan
 */
export const updatePlanTool: ToolExecutor = {
  name: 'update_plan',
  definition: {
    name: 'update_plan',
    description: `创建或更新任务计划。用于跟踪多步骤任务的进度。

使用场景：
- 任务需要多个步骤完成
- 用户要求使用计划工具
- 复杂任务需要分阶段执行

计划项状态：
- pending: 待执行
- in_progress: 进行中（应该只有一个）
- completed: 已完成

调用时会返回当前计划状态。`,
    parameters: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          description: '计划项列表，每项包含 text 和 status',
          items: {
            type: 'object',
            description: '单个计划项',
            properties: {
              text: {
                type: 'string',
                description: '任务描述（5-7个字以内）'
              },
              status: {
                type: 'string',
                enum: ['pending', 'in_progress', 'completed'],
                description: '任务状态'
              }
            },
            required: ['text', 'status']
          }
        },
        explanation: {
          type: 'string',
          description: '计划变更的说明（可选）'
        }
      },
      required: ['items']
    }
  },
  isMutating: false,
  async execute(args) {
    const items = args.items as PlanItem[];
    const explanation = args.explanation as string | undefined;

    // Update plan in agentStore (reactive)
    agentStore.setPlan(items);

    // Format plan display
    const statusEmoji = {
      'pending': '⏳',
      'in_progress': '🔄',
      'completed': '✅'
    };

    const planDisplay = items.map((item, i) => {
      const emoji = statusEmoji[item.status];
      return `${i + 1}. ${emoji} ${item.text}`;
    }).join('\n');

    // Count statuses
    const completed = items.filter(i => i.status === 'completed').length;
    const inProgress = items.filter(i => i.status === 'in_progress').length;
    const pending = items.filter(i => i.status === 'pending').length;

    let response = `📋 当前计划 (${completed}/${items.length} 完成):\n\n${planDisplay}`;

    if (explanation) {
      response += `\n\n💡 ${explanation}`;
    }

    // Add progress summary
    if (completed === items.length && items.length > 0) {
      response += '\n\n🎉 所有任务已完成！';
    } else if (inProgress === 0 && pending > 0) {
      response += '\n\n👉 准备开始下一个任务...';
    }

    return response;
  }
};

/**
 * Get current plan status
 */
export const getPlanTool: ToolExecutor = {
  name: 'get_plan',
  definition: {
    name: 'get_plan',
    description: '获取当前任务计划的状态。如果没有计划则返回空。',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  isMutating: false,
  async execute() {
    const currentPlan = agentStore.plan;

    if (currentPlan.length === 0) {
      return '当前没有活动计划。使用 update_plan 创建一个新计划。';
    }

    const statusEmoji = {
      'pending': '⏳',
      'in_progress': '🔄',
      'completed': '✅'
    };

    const planDisplay = currentPlan.map((item, i) => {
      const emoji = statusEmoji[item.status];
      return `${i + 1}. ${emoji} ${item.text}`;
    }).join('\n');

    const completed = currentPlan.filter(i => i.status === 'completed').length;

    return `📋 当前计划 (${completed}/${currentPlan.length} 完成):\n\n${planDisplay}`;
  }
};

/**
 * Clear the current plan
 */
export const clearPlanTool: ToolExecutor = {
  name: 'clear_plan',
  definition: {
    name: 'clear_plan',
    description: '清除当前任务计划。',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  isMutating: false,
  async execute() {
    agentStore.clearPlan();
    return '✅ 计划已清除。';
  }
};

// Export plan tools
export const planTools: ToolExecutor[] = [
  updatePlanTool,
  getPlanTool,
  clearPlanTool
];
