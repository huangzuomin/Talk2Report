/**
 * DeepSeek API Client (前端版本)
 * 用途: 通过BFF层调用DeepSeek API
 */

const API_BASE = '/api/deepseek';

/**
 * 调用DeepSeek Chat API
 * @param {Object} params
 * @param {string} params.model - 模型名称 (deepseek-chat | deepseek-reasoner)
 * @param {Array} params.messages - 对话历史
 * @param {number} params.temperature - 温度参数
 * @param {boolean} params.stream - 是否流式返回
 * @param {Function} params.onChunk - 流式回调函数 (可选)
 * @returns {Promise<Object>}
 */
export async function callDeepSeek({
  model = 'deepseek-chat',
  messages = [],
  temperature = 1.0,
  stream = false,
  onChunk = null,
}) {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      stream,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} - ${error}`);
  }

  // 流式响应
  if (stream) {
    return handleStreamResponse(response, onChunk);
  }

  // 普通响应
  return response.json();
}

/**
 * 处理流式响应
 * @param {Response} response
 * @param {Function} onChunk - 回调函数
 * @returns {Promise<Object>}
 */
async function handleStreamResponse(response, onChunk) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let result = null;
  let fullContent = '';
  let fullReasoning = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n').filter(line => line.trim() !== '');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);

          // 累积content和reasoning
          if (parsed.choices?.[0]?.delta?.content) {
            fullContent += parsed.choices[0].delta.content;
          }
          if (parsed.choices?.[0]?.delta?.reasoning_content) {
            fullReasoning += parsed.choices[0].delta.reasoning_content;
          }

          // 调试日志
          if (parsed.choices?.[0]?.delta?.content) {
            console.log('[DeepSeek] Content chunk:', parsed.choices[0].delta.content.slice(0, 50));
          }

          if (onChunk) {
            onChunk(parsed);
          }

          // 保存最后一个完整的chunk作为结果，但更新累积的content
          result = {
            ...parsed,
            choices: parsed.choices ? [{
              ...parsed.choices[0],
              message: {
                ...parsed.choices[0].message,
                content: fullContent || parsed.choices[0].message?.content || '',
                reasoning_content: fullReasoning || parsed.choices[0].message?.reasoning_content || '',
              },
              delta: {
                ...parsed.choices[0].delta,
                content: fullContent,
              }
            }] : [],
          };
        } catch (e) {
          console.warn('Failed to parse SSE data:', data);
        }
      }
    }
  }

  return result;
}

/**
 * 调用 Agent A (Interviewer) - 使用 n8n 工作流 (推荐)
 * @param {Array} conversationHistory - 对话历史
 * @param {string} sessionId - 会话ID
 * @returns {Promise<Object>}
 */
export async function callAgentAWithN8N(conversationHistory, sessionId) {
  const N8N_INTERVIEW_URL = import.meta.env.N8N_INTERVIEW_URL || 'https://n8n.neican.ai/webhook/interview/next-step';
  const N8N_AUTH_TOKEN = import.meta.env.N8N_AUTH_TOKEN || 'NeicanSTT2025Secret';

  const response = await fetch(N8N_INTERVIEW_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${N8N_AUTH_TOKEN}`,
    },
    body: JSON.stringify({
      session_id: sessionId,
      conversation_history: conversationHistory,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`n8n interview error: ${response.status} - ${error}`);
  }

  const result = await response.json();

  // 转换 n8n 响应格式为 DeepSeek API 格式
  return {
    choices: [{
      message: {
        content: result.question || '',
        reasoning_content: result.thinking || '',
      },
      delta: {
        content: result.question || '',
        reasoning_content: result.thinking || '',
      }
    }],
    finish_reason: result.finished ? 'stop' : null,
    extracted_info: result.extracted_info,
    finished: result.finished,
    updated_state: result.updated_state,
  };
}

/**
 * 调用Agent A (Interviewer) - 使用本地 DeepSeek API
 * @param {Array} conversationHistory - 对话历史
 * @param {Function} onThink - 思考过程回调 (用于显示``)
 * @returns {Promise<Object>}
 */
export async function callAgentA(conversationHistory, onThink) {
  return callDeepSeek({
    model: 'deepseek-chat', // 使用 chat 模型，快速响应
    messages: conversationHistory,
    temperature: 0.7,
    stream: false, // 不使用流式，chat 模型没有 reasoning_content
  });
}

/**
 * 调用Agent B (Archivist)
 * @param {Object} conversationData - 对话数据
 * @returns {Promise<Object>}
 */
export async function callAgentB(conversationData) {
  const response = await fetch(`${API_BASE}/agent/archivist`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(conversationData),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Agent B error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * 调用Agent C (Writers) - 并行生成3个版本
 * @param {Object} factsheet - Agent B的输出
 * @param {Object} preferences - 用户偏好
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<Object>}
 */
export async function callAgentC(factsheet, preferences, onProgress) {
  const response = await fetch(`${API_BASE}/agent/writers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      factsheet,
      preferences,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Agent C error: ${response.status} - ${error}`);
  }

  // 处理流式进度
  if (onProgress) {
    return handleStreamResponse(response, onProgress);
  }

  return response.json();
}

/**
 * 调用Agent D (Critic)
 * @param {Object} factsheet - 事实数据
 * @param {Object} drafts - 3个版本的草稿
 * @returns {Promise<Object>}
 */
export async function callAgentD(factsheet, drafts) {
  const response = await fetch(`${API_BASE}/agent/critic`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      factsheet,
      drafts,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Agent D error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * 使用 n8n 工作流生成报告 (推荐)
 * @param {Object} params
 * @param {Array} params.conversationHistory - 对话历史
 * @param {Object} params.preferences - 用户偏好
 * @param {string} params.sessionId - 会话ID
 * @param {Object} params.progressCallbacks - 进度回调
 * @returns {Promise<Object>}
 */
export async function generateReportWithN8N({
  conversationHistory,
  preferences,
  sessionId,
  progressCallbacks = {},
}) {
  const {
    onArchivistStart,
    onArchivistComplete,
    onWriterStart,
    onWriterComplete,
    onCriticStart,
    onCriticComplete,
  } = progressCallbacks;

  const N8N_GENERATE_URL = import.meta.env.N8N_GENERATE_URL || 'https://n8n.neican.ai/webhook/generate';
  const N8N_AUTH_TOKEN = import.meta.env.N8N_AUTH_TOKEN || 'NeicanSTT2025Secret';

  try {
    if (onArchivistStart) onArchivistStart();

    const response = await fetch(N8N_GENERATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${N8N_AUTH_TOKEN}`,
      },
      body: JSON.stringify({
        session_id: sessionId,
        conversation_history: conversationHistory,
        preferences,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`n8n workflow error: ${response.status} - ${error}`);
    }

    const result = await response.json();

    // 检查 n8n 是否返回错误
    if (!result.success || result.error) {
      console.error('[Generate n8n] Error:', result.error);
      console.error('[Generate n8n] Details:', result.details);

      // 返回错误信息，但不抛出异常（让前端处理）
      return {
        success: false,
        error: result.error || '生成失败',
        details: result.details,
        factsheet: {},
        drafts: {},
        review: {},
      };
    }

    // 转换 n8n 格式为前端期望的格式
    // n8n: versions: [{content: "..."}, {content: "..."}, {content: "..."}]
    // 前端: drafts: { brief: {...}, formal: {...}, social: {...} }

    const versionsMap = {
      0: 'brief',
      1: 'formal',
      2: 'social'
    };

    const drafts = {};
    if (result.versions && Array.isArray(result.versions)) {
      result.versions.forEach((version, index) => {
        const key = versionsMap[index] || `version_${index}`;
        drafts[key] = {
          content: version.content || version,
          title: ['200字电梯汇报', '正式年度述职', '朋友圈文案'][index] || `版本${index + 1}`
        };
      });
    }

    if (onArchivistComplete) onArchivistComplete(result.factsheet || {});
    if (onWriterStart) onWriterStart();
    if (onWriterComplete) onWriterComplete(result.versions || []);
    if (onCriticStart) onCriticStart();
    if (onCriticComplete) onCriticComplete(result.verdict || {});

    return {
      factsheet: result.factsheet || {},
      drafts: drafts,
      review: result.verdict || {},
      success: true,
      iterations: result.iterations || 1,
    };
  } catch (error) {
    console.error('Generate report (n8n) failed:', error);

    // 返回错误信息而不是抛出异常
    return {
      success: false,
      error: error.message,
      factsheet: {},
      drafts: {},
      review: {},
    };
  }
}

/**
 * 完整的访谈-生成-审稿流程 (使用本地 API)
 * @param {Object} params
 * @param {Array} params.conversationHistory - 对话历史
 * @param {Object} params.preferences - 用户偏好
 * @param {Object} params.progressCallbacks - 进度回调
 * @returns {Promise<Object>}
 */
export async function generateReportWithCritic({
  conversationHistory,
  preferences,
  progressCallbacks = {},
}) {
  const {
    onArchivistStart,
    onArchivistProgress,
    onArchivistComplete,
    onWriterStart,
    onWriterProgress,
    onWriterComplete,
    onCriticStart,
    onCriticComplete,
  } = progressCallbacks;

  try {
    // Step 1: Agent B - 提取结构化数据
    if (onArchivistStart) onArchivistStart();
    const factsheet = await callAgentB({
      conversation_history: conversationHistory,
      user_profile: { role: preferences.role, year: new Date().getFullYear() },
    });
    if (onArchivistComplete) onArchivistComplete(factsheet);

    // Step 2: Agent C - 并行生成3个版本
    if (onWriterStart) onWriterStart();
    const drafts = await callAgentC(factsheet, preferences, (chunk) => {
      if (onWriterProgress) onWriterProgress(chunk);
    });
    if (onWriterComplete) onWriterComplete(drafts);

    // Step 3: Agent D - 审查
    if (onCriticStart) onCriticStart();
    const review = await callAgentD(factsheet, drafts);
    if (onCriticComplete) onCriticComplete(review);

    // 如果需要重写
    if (review.rewrite_needed) {
      // 递归调用,直到通过审查
      return generateReportWithCritic({
        conversationHistory,
        preferences,
        progressCallbacks: {
          ...progressCallbacks,
          onWriterStart: () => {
            if (onWriterProgress) {
              onWriterProgress({ type: 'rewrite', reason: review.overall_assessment.verdict });
            }
          },
        },
      });
    }

    return {
      factsheet,
      drafts,
      review,
      success: true,
    };
  } catch (error) {
    console.error('Generate report failed:', error);
    throw error;
  }
}

export default {
  callDeepSeek,
  callAgentA,
  callAgentAWithN8N,
  callAgentB,
  callAgentC,
  callAgentD,
  generateReportWithCritic,
  generateReportWithN8N,
};
