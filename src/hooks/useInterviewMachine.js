/**
 * useInterviewMachine - 混合式访谈状态机
 * 核心逻辑：Extract -> Update -> Decide -> Ask
 */

import { useState, useCallback, useRef } from 'react';
import { callAgentA, callAgentAWithN8N, callAgentB } from '../services/deepseek-client';
import { INITIAL_STATE, calculateCompletion } from '../config/ReportState';

export function useInterviewMachine() {
  const [state, setState] = useState(INITIAL_STATE);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentThinking, setCurrentThinking] = useState('');
  const [error, setError] = useState(null);
  const [isStarted, setIsStarted] = useState(false);
  const thinkingRef = useRef('');
  const [sessionId, setSessionId] = useState(null); // n8n 会话ID

  /**
   * 添加消息到UI
   */
  const addMessage = useCallback((role, content, think = null) => {
    setMessages((prev) => [...prev, { role, content, think, timestamp: new Date().toISOString() }]);
  }, []);

  /**
   * 启动访谈
   */
  const startInterview = useCallback(async () => {
    if (isStarted) return;
    setIsStarted(true);
    setIsLoading(true);
    setError(null);
    thinkingRef.current = '';

    try {
      // 生成 sessionId（用于后续 Generate 阶段）
      const newSessionId = `machine-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);

      // 调用本地 DeepSeek API (快速)
      const systemPrompt = `你是一名**严谨的职场顾问**。你的核心目标是收集结构化信息。

# 核心任务
通过简短提问收集用户5个方面的信息：
1. 核心成果 2. 挑战应对 3. 个人成长 4. 团队贡献 5. 未来规划

# ⚠️ 重要约束
1. **专注职场价值**：只收集与工作相关的信息
2. **拒绝文学意象**：如果用户输入无意义内容，不要试图通过修辞将其合理化
3. **引导回归正轨**：当用户偏离主题时，立即引导回职场话题
4. **量化优先**：引导用户提供具体数字、指标、百分比
5. **简洁提问**：每次只问一个简短问题，直接引导

# 输出风格
- 语气：专业、鼓励、但不失严谨
- 长度：1-2句话，不超过50字
- 避免：过度共情、文学修辞、发散性联想

请开始访谈，直接提问。`;

      const response = await callAgentA([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: '请开始访谈。' }
      ], (thinking) => {
        // chat 模型不显示思考过程
      });

      const assistantMessage = response.choices?.[0]?.message?.content || '';

      console.log('[Interview Machine Local] Session:', newSessionId);
      console.log('[Interview Machine Local] Model: deepseek-chat');

      addMessage('assistant', assistantMessage, '');

      // 更新当前聚焦的槽位
      const firstSlot = state.slots.find(s => s.value === null);
      setState(prev => ({ ...prev, current_focus_slot: firstSlot?.key }));

      return { message: assistantMessage, finished: false };
    } catch (err) {
      setError(err.message);
      setIsStarted(false);
      throw err;
    } finally {
      setIsLoading(false);
      setCurrentThinking('');
    }
  }, [isStarted, state.slots, addMessage]);

  /**
   * 发送消息并执行 Extract-Update-Decide 循环
   */
  const sendMessage = useCallback(async (userText) => {
    if (!userText.trim()) return;

    addMessage('user', userText);
    setIsLoading(true);
    setError(null);
    setCurrentThinking('');
    thinkingRef.current = '';

    try {
      // === Step 0: Validate (输入意图验证) ===
      console.log('[Interview Machine] Validating input...');
      const validationResult = await validateUserInput(userText, state.current_focus_slot, state.slots);

      // 如果输入无效，使用硬纠偏回归
      if (!validationResult.is_valid && validationResult.severity === 'high') {
        console.log('[Interview Machine] Invalid input detected, applying hard correction');

        const currentSlotLabel = state.slots.find(s => s.key === state.current_focus_slot)?.label || '工作内容';

        // 生成纠偏消息
        const correctionMessage = `抱歉，我未能理解这段内容与您年度工作的关联。我们还是回到关于**${currentSlotLabel}**的讨论吧。

能否请您分享一下：
${state.slots.find(s => s.key === state.current_focus_slot)?.description || '您本年度的主要工作成果是什么？'}`;

        addMessage('assistant', correctionMessage, '');

        setIsLoading(false);
        return {
          message: correctionMessage,
          finished: false,
          updatedSlots: [],
          correctionApplied: true
        };
      }

      // === Step 1: Extract (从用户回答中提取信息) ===
      const extractedInfo = await extractFromUserMessage(userText, state);
      console.log('[Interview Machine] Extracted:', extractedInfo);

      // === Step 2: Update (更新槽位状态) ===
      let newSlots = [...state.slots];
      if (extractedInfo.updates && extractedInfo.updates.length > 0) {
        newSlots = state.slots.map(slot => {
          const update = extractedInfo.updates.find(u => u.key === slot.key);
          if (update && update.value) {
            console.log(`[Interview Machine] Updating slot ${slot.key}:`, update.value);
            return {
              ...slot,
              value: update.value,
              status: "complete",
              filled: true
            };
          }
          return slot;
        });

        setState(prev => ({ ...prev, slots: newSlots }));
      }

      // === Step 3: Ask (生成下一个问题) ===
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      history.push({ role: 'user', content: userText });

      // === 智能检查点（每5轮） ===
      const newRound = state.conversation_round + 1;
      const completion = calculateCompletion(newSlots);
      const isCheckpoint = newRound % 5 === 0 && newRound >= 5;
      const shouldPromptContinue = isCheckpoint && completion.percentage >= 60;

      let systemPrompt = '';

      if (shouldPromptContinue) {
        // 检查点模式：询问用户是否继续
        systemPrompt = `你是年终总结访谈助手。

当前进度：第 ${newRound} 轮
完成度：${completion.percentage}%
已填充：${completion.completed} / ${completion.total} 个槽位

用户已经提供了丰富的信息。请礼貌地询问用户是否：
1. 继续深入挖掘更多细节
2. 或者现在就生成年终总结

不要生成长篇大论，用1-2句话简洁表达。

**示例**：
"您已完成 ${completion.percentage}% 的信息收集。我们可以继续深入，或者现在就为您生成报告。您希望如何继续？"

根据用户回答自然过渡。`;
      } else {
        // 正常提问模式
        systemPrompt = `你是一名**严谨的职场顾问**。你的核心目标是收集结构化信息。

# 当前状态
- 进度：第 ${newRound} 轮
- 完成度：${completion.percentage}%
- 已填充：${completion.completed} / ${completion.total} 个槽位

# ⚠️ 核心约束
1. **专注职场价值**：只收集与工作相关的信息
2. **拒绝文学意象**：不要试图用修辞美化无意义内容
3. **引导回归正轨**：当用户偏离主题时，立即引导回职场话题
4. **量化优先**：引导用户提供具体数字、指标、百分比
5. **简洁提问**：每次只问一个简短问题，直接引导

# 对话要求
- 第1-10轮必须继续提问，不要提前结束
- 只有在第10轮以后，才考虑总结并结束访谈
- 不要在问题中使用"总结"这个词
- 语气：专业、鼓励、但不失严谨

根据用户回答，提出下一个简短问题。`;
      }

      const response = await callAgentA([
        { role: 'system', content: systemPrompt },
        ...history.slice(-6)
      ], (thinking) => {});

      const assistantMessage = response.choices?.[0]?.message?.content || '';

      console.log('[Interview Machine Local] Round:', newRound);
      console.log('[Interview Machine Local] Question:', assistantMessage.slice(0, 100));

      if (shouldPromptContinue) {
        console.log('[Interview] Checkpoint reached:', {
          round: newRound,
          completion: completion.percentage + '%',
          filled: completion.completed + '/' + completion.total
        });
      }

      addMessage('assistant', assistantMessage, '');

      // === Step 4: Update State ===
      // newRound 已在前面定义（line 119）

      // 严格判断是否结束（至少8轮后才考虑结束）
      const minRounds = 8;
      const shouldEnd = newRound >= minRounds && (
        assistantMessage.includes('访谈完成') ||
        assistantMessage.includes('结束访谈') ||
        assistantMessage.includes('感谢你的分享')
      );

      console.log('[Interview Machine Local] shouldEnd:', shouldEnd, '| newRound:', newRound, '| minRounds:', minRounds);

      if (shouldEnd) {
        setState(prev => ({
          ...prev,
          conversation_round: newRound,
          is_finished: true,
          current_focus_slot: null
        }));
      } else {
        const nextSlot = determineNextSlot(newSlots, newRound);

        // 如果智能退出返回null，设置current_focus_slot为null
        // 这样会触发"完成访谈"按钮显示
        setState(prev => ({
          ...prev,
          conversation_round: newRound,
          current_focus_slot: nextSlot
        }));
      }

      return {
        message: assistantMessage,
        finished: shouldEnd,
        updatedSlots: extractedInfo.updates || []
      };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
      setCurrentThinking('');
    }
  }, [state, messages, addMessage]);

  /**
   * 跳过当前槽位
   */
  const skipCurrentSlot = useCallback(async () => {
    if (!state.current_focus_slot) return;

    console.log('[Interview Machine] Skipping slot:', state.current_focus_slot);

    // 标记当前槽位为 SKIPPED
    const newSlots = state.slots.map(slot => {
      if (slot.key === state.current_focus_slot) {
        return {
          ...slot,
          value: "SKIPPED",
          status: "skipped",
          filled: false
        };
      }
      // 保持其他槽位不变
      return slot;
    });

    console.log('[Interview Machine] Slots after skip:', newSlots.map(s => ({key: s.key, value: s.value})));

    setState(prev => ({ ...prev, slots: newSlots }));

    // 生成下一个问题，但使用特殊的标志避免提取逻辑
    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      history.push({ role: 'user', content: '[用户跳过了这个问题]' });

      const systemPrompt = `你是年终总结访谈助手。通过简短提问收集用户信息。

当前进度：第 ${state.conversation_round + 1} 轮
完成度：${calculateCompletion(newSlots)}%

用户刚刚跳过了关于 ${state.slots.find(s => s.key === state.current_focus_slot)?.label} 的问题。

请继续询问下一个问题。

**重要约束**：
- 不要提前结束访谈，除非已经收集了至少5-8轮的信息
- 第1-10轮必须继续提问
- 只有在第10轮以后，才考虑总结并结束访谈
- 不要在问题中使用"总结"这个词`;

      const response = await callAgentA([
        { role: 'system', content: systemPrompt },
        ...history.slice(-6)
      ], (thinking) => {});

      const assistantMessage = response.choices?.[0]?.message?.content || '';

      console.log('[Interview Machine Local] Question after skip:', assistantMessage.slice(0, 100));

      addMessage('user', '[跳过当前问题]');
      addMessage('assistant', assistantMessage, '');

      // 更新状态
      const newRound = state.conversation_round + 1;
      const nextSlot = determineNextSlot(newSlots, newRound);

      setState(prev => ({
        ...prev,
        conversation_round: newRound,
        current_focus_slot: nextSlot
      }));

      return {
        message: assistantMessage,
        finished: false,
        updatedSlots: []
      };
    } catch (err) {
      console.error('[Interview Machine] Skip failed:', err);
      throw err;
    }
  }, [state, messages, addMessage]);

  // 计算 completion（移到前面，避免引用错误）
  const completion = calculateCompletion(state.slots);

  /**
   * 手动完成访谈
   */
  const finishInterview = useCallback(() => {
    console.log('[Interview Machine] Manually finishing interview');
    setState(prev => ({
      ...prev,
      is_finished: true,
      current_focus_slot: null
    }));

    // 添加结束语
    addMessage('assistant', '好的，我们已完成访谈。现在可以为您生成年终总结了。', '');

    return {
      finished: true,
      conversationHistory: messages,
      slots: state.slots,
      completion: calculateCompletion(state.slots) // 重新计算，避免闭包问题
    };
  }, [messages, state.slots, addMessage]);

  /**
   * 重置访谈
   */
  const resetInterview = useCallback(() => {
    setState(INITIAL_STATE);
    setMessages([]);
    setCurrentThinking('');
    thinkingRef.current = '';
    setError(null);
    setIsStarted(false);
    setSessionId(null);
  }, []);

  /**
   * 手动更新槽位（未来功能：允许用户直接编辑）
   */
  const updateSlot = useCallback((key, value) => {
    const newSlots = state.slots.map(slot => {
      if (slot.key === key) {
        return {
          ...slot,
          value: value || null,
          status: value ? "complete" : "empty"
        };
      }
      return slot;
    });
    setState(prev => ({ ...prev, slots: newSlots }));
  }, [state.slots]);

  return {
    // 状态
    state,
    messages,
    isLoading,
    currentThinking,
    error,
    isStarted,
    completion,
    sessionId,

    // 方法
    startInterview,
    sendMessage,
    skipCurrentSlot,
    finishInterview,
    resetInterview,
    updateSlot,
    addMessage
  };
}

// ==================== 辅助函数 ====================

/**
 * A. 输入意图验证 (Intent Validation)
 * 判断用户输入是否属于"无效乱码"或"极度偏离职场场景"
 */
async function validateUserInput(userInput, currentFocusSlot, slots) {
  const API_BASE = '/api/deepseek';

  const systemPrompt = `你是一个对话意图分析专家。你的任务是判断用户输入是否与年终总结访谈相关。

# 当前槽位
${currentFocusSlot ? `正在询问：${slots.find(s => s.key === currentFocusSlot)?.label}` : '无特定槽位'}

# 判断标准
1. **有效输入**：
   - 与工作、项目、任务、成就相关
   - 包含具体的数字、指标、结果
   - 描述团队合作、个人成长、技能提升
   - 合理的"不确定"、"不知道"、"跳过"等表达

2. **无效输入**：
   - 完全的乱码、无意义字符组合
   - 与职场完全无关的内容（如："皇帝的女人飞机发热"）
   - 明显的恶搞、胡言乱语

# 输出格式
只输出JSON，不要有任何其他文字：
\`\`\`json
{
  "is_valid": true/false,
  "reason": "简短原因说明",
  "severity": "low/medium/high"
}
\`\`\`

# 示例

**示例1：有效输入**
用户："我完成了三个主要项目"
输出：{"is_valid": true, "reason": "描述了工作成果", "severity": "low"}

**示例2：有效输入 - 不确定**
用户："我不太记得具体数字了"
输出：{"is_valid": true, "reason": "合理的表达", "severity": "low"}

**示例3：无效输入 - 乱码**
用户："皇帝的女人飞机发热"
输出：{"is_valid": false, "reason": "与职场无关的乱码", "severity": "high"}

**示例4：无效输入 - 无意义**
用户："asdfghjkl"
输出：{"is_valid": false, "reason": "无意义字符", "severity": "high"}`;

  try {
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userInput }
        ],
        temperature: 0.1
      })
    });

    if (!response.ok) {
      console.error('[Validate] API error:', response.status);
      return { is_valid: true, severity: 'low' }; // 默认有效
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      console.log('[Validate] Result:', result);
      return result;
    }

    return { is_valid: true, severity: 'low' };
  } catch (err) {
    console.error('[Validate] Error:', err);
    return { is_valid: true, severity: 'low' }; // 默认有效
  }
}

/**
 * Agent B: 提取用户输入中的信息
 */
async function extractFromUserMessage(userMessage, state) {
  const API_BASE = '/api/deepseek';

  // 构建槽位映射表
  const slotMap = {};
  state.slots.forEach(slot => {
    slotMap[slot.label] = slot.key;
    slotMap[slot.key] = slot.key;
  });

  const systemPrompt = `你是一个专业的数据提取专家。你的任务是从用户的访谈回答中提取关键信息，并填入对应的槽位。

# 槽位列表
${state.slots.map(s => `- ${s.key} (${s.label}): ${s.description}`).join('\n')}

# 当前已填充的槽位
${state.slots.filter(s => s.value && s.value !== "SKIPPED").map(s => `- ${s.key}: ${s.value}`).join('\n') || '(暂无)'}

# 提取规则
1. **精准匹配**：仔细分析用户回答，判断它属于哪个槽位
2. **精简总结**：提取核心信息，用1-2句话总结（不要照搬原话）
3. **量化优先**：优先提取数字、指标、百分比等量化信息
4. **多槽位提取**：一个回答可能包含多个槽位的信息，全部提取出来
5. **忽略已填充**：如果槽位已有内容，只在新信息更详细时才更新

# 🔍 语义映射规则（识别隐性贡献）

**团队贡献（team_contribution）的隐性信号**：
- 基础设施/平台/系统建设 → "构建公司基础设施"
- 数据网络/中台/框架 → "为团队提供技术基础设施"
- 帮助/协助/支持其他团队 → "跨团队协作支持"
- 工具开发/效率提升 → "为团队开发工具提升效率"
- 文档/规范/流程建设 → "建立团队规范和流程"

**个人成长（personal_growth）的隐性信号**：
- 培训/指导/带新人 → "培养团队成员"
- 学习新技术/新技能 → "拓展技术能力"
- 认证/考试/评估 → "获得专业认证"
- 分享/演讲/写作 → "知识分享和传播"

**量化证据（metrics_achievement）的隐性信号**：
- 性能提升/优化 → "性能改善指标"
- 时间缩短/效率提高 → "效率提升数据"
- 成本降低/资源节约 → "成本优化效果"
- 用户增长/满意度 → "业务增长指标"

# 输出格式
只输出 JSON，不要有任何其他文字：
\`\`\`json
{
  "updates": [
    {"key": "槽位key", "value": "精简的提取内容"}
  ]
}
\`\`\`

# 提取示例

**示例1：单个槽位**
用户："我完成了外卖算法报道，这个报道在社交媒体上引起了很大反响，阅读量超过了100万。"
输出：
{
  "updates": [
    {"key": "achievement_1", "value": "完成外卖算法报道，在社交媒体上引起反响，阅读量超100万"},
    {"key": "metrics_achievement", "value": "报道阅读量超100万"}
  ]
}

**示例2：多个槽位**
用户："我们还优化了前端性能，将加载时间从3秒降到了1秒。"
输出：
{
  "updates": [
    {"key": "achievement_2", "value": "优化前端性能，缩短加载时间"},
    {"key": "metrics_achievement", "value": "加载时间从3秒降至1秒"}
  ]
}

**示例3：隐性贡献 - 基础设施**
用户："我搭建了500人的数据网络，作为公司的基础设施"
输出：
{
  "updates": [
    {"key": "team_contribution", "value": "构建500人数据网络基础设施"},
    {"key": "metrics_achievement", "value": "覆盖500人规模"}
  ]
}

**示例4：隐性贡献 - 培训**
用户："我培训了3个新人，帮助他们快速上手"
输出：
{
  "updates": [
    {"key": "team_contribution", "value": "培养3名新人快速成长"},
    {"key": "personal_growth", "value": "锻炼团队管理和培训能力"}
  ]
}

**示例5：隐性贡献 - 效率工具**
用户："开发了一个自动化工具，帮大家节省了每周5小时"
输出：
{
  "updates": [
    {"key": "team_contribution", "value": "开发自动化工具提升团队效率"},
    {"key": "metrics_achievement", "value": "每周节省5小时工作时间"}
  ]
}

**示例6：跳过**
用户："这个我不知道，跳过吧"
输出：
{
  "updates": []
}

**示例7：无新信息**
用户："好的，没问题"
输出：
{
  "updates": []
}

# 用户回答
${userMessage}

请严格按照上述规则提取信息并输出 JSON。特别注意识别隐性贡献和量化数据。`;

  try {
    console.log('[Extract] Sending request for:', userMessage.slice(0, 50) + '...');

    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }  // ✅ 修复：发送用户消息
        ],
        temperature: 0.1
      })
    });

    if (!response.ok) {
      console.error('[Extract] API error:', response.status);
      return { updates: [] };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';

    // 尝试解析JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);

      // 验证提取的槽位是否存在
      if (result.updates && result.updates.length > 0) {
        result.updates = result.updates.filter(update => {
          const slotExists = state.slots.some(s => s.key === update.key);
          if (!slotExists) {
            console.warn(`[Extract] Unknown slot: ${update.key}`);
          }
          return slotExists;
        });
      }

      console.log('[Extract] Success:', result.updates);
      return result;
    }

    console.log('[Extract] No JSON found, returning empty');
    return { updates: [] };
  } catch (err) {
    console.error('[Extract] Error:', err);
    return { updates: [] };
  }
}

/**
 * 选择下一个要问的槽位
 */
function selectNextSlot(slots, missingRequired) {
  // 优先问必填的空槽位
  if (missingRequired.length > 0) {
    return missingRequired[0];
  }

  // 如果必填都完成了，问选填的
  const missingOptional = slots.filter(s => !s.required && s.value === null);
  if (missingOptional.length > 0) {
    return missingOptional[0];
  }

  return null;
}

/**
 * 确定下一个要询问的槽位（智能版本）
 * @param {Array} slots - 槽位数组
 * @param {number} conversationRound - 当前对话轮数
 * @returns {string|null} - 下一个槽位的key，或null表示可以结束
 */
function determineNextSlot(slots, conversationRound = 0) {
  const completion = calculateCompletion(slots);

  // === 智能退出判断 ===
  // 条件1：至少进行了5轮访谈
  // 条件2：完成度 >= 70% 或 已填充槽位 >= 8个
  const minRoundsMet = conversationRound >= 5;
  const hasHighCompletion = completion.percentage >= 70;
  const hasManyFilled = completion.completed >= 8;

  if (minRoundsMet && (hasHighCompletion || hasManyFilled)) {
    console.log(`[Interview] Smart exit triggered: round=${conversationRound}, completion=${completion.percentage}%`);
    return null; // 返回null，触发"完成访谈"选项
  }

  // === 原有逻辑：继续提问 ===
  // 找出所有未填充的必填槽位
  const missingRequired = slots.filter(s => s.required && s.value === null);

  // 优先问必填的空槽位
  if (missingRequired.length > 0) {
    return missingRequired[0].key;
  }

  // 如果必填都完成了，问选填的
  const missingOptional = slots.filter(s => !s.required && s.value === null);
  if (missingOptional.length > 0) {
    return missingOptional[0].key;
  }

  return null;
}

/**
 * 构建Interviewer的Prompt
 */
function buildInterviewerPrompt(recentHistory, slots, targetSlot, recentUpdates = []) {
  const filledSlots = slots.filter(s => s.value && s.value !== "SKIPPED");
  const missingSlots = slots.filter(s => s.value === null);

  let recentInfo = '';
  if (recentUpdates && recentUpdates.length > 0) {
    recentInfo = '\n\n**刚刚提取到的信息**：\n' +
      recentUpdates.map(u => {
        const slot = slots.find(s => s.key === u.key);
        return `- ${slot?.label}: ${u.value}`;
      }).join('\n');
  }

  return `# Role
你是一名专业的职业咨询师。

# Goal
通过苏格拉底式提问，引导用户分享本年度的工作经历，为生成年终总结收集素材。

# Context
**当前访谈进度**：已完成 ${filledSlots.length} / ${slots.length} 个槽位
**当前聚焦**：${targetSlot?.label || '访谈结束'}

**已收集的信息**：
${filledSlots.length > 0 ? filledSlots.map(s => `- ${s.label}: ${s.value}`).join('\n') : '(暂无)'}
${recentInfo}

**待收集的信息**：
${missingSlots.length > 0 ? missingSlots.map(s => `- ${s.label}: ${s.description}`).join('\n') : '(全部完成)'}

# Target Slot
当前需要询问：**${targetSlot?.label}**
说明：${targetSlot?.description}

# Constraints
1. **每次只针对1个槽位提问**，不要贪多
2. 结合"已收集的信息"进行追问，体现专业性
3. 语气要自然、鼓励、专业
4. 如果是量化指标，引导用户提供具体数字
5. 如果已完成所有必填槽位，询问用户是否还有补充，然后礼貌结束

# Output
直接输出给用户的回复文本。`;
}

/**
 * 构建结束语
 */
function buildEndMessage(slots, round) {
  const filled = slots.filter(s => s.value && s.value !== "SKIPPED");

  return `访谈已完成！我们进行了 ${round} 轮对话，收集了 ${filled.length} 个方面的信息。

现在可以为您生成年终总结了。点击下方按钮开始生成报告。`;
}
