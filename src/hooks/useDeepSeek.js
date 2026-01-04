/**
 * React Hooks for DeepSeek Integration
 */

import { useState, useCallback, useRef } from 'react';
import {
  callAgentA,
  callAgentAWithN8N,
  generateReportWithCritic,
  generateReportWithN8N,
} from '../services/deepseek-client';

/**
 * Hook: 访谈控制器
 */
export function useInterview() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentThinking, setCurrentThinking] = useState('');
  const [error, setError] = useState(null);
  const [isStarted, setIsStarted] = useState(false);
  const thinkingRef = useRef(''); // 用ref保存完整的思考过程
  const [currentTopic, setCurrentTopic] = useState('achievements'); // 当前主题
  const [questionCount, setQuestionCount] = useState(0); // 问题计数
  const [sessionId, setSessionId] = useState(null); // n8n 会话ID

  // 访谈主题框架（防止偏离）
  const interviewTopics = [
    'achievements', // 核心成果
    'challenges',   // 挑战应对
    'growth',       // 个人成长
    'team',         // 团队贡献
    'future',       // 未来规划
  ];

  const addMessage = useCallback((role, content, think = null) => {
    setMessages((prev) => [...prev, { role, content, think }]);
  }, []);

  const startInterview = useCallback(async () => {
    if (isStarted) return;
    setIsStarted(true);
    setIsLoading(true);
    setError(null);
    setCurrentThinking('');
    thinkingRef.current = '';

    try {
      // 生成 sessionId（用于后续 Generate 阶段）
      const newSessionId = `interview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);

      // 调用本地 DeepSeek API (使用 chat 模型，快速)
      const initialMessages = [
        {
          role: 'system',
          content: `你是一位专业的年终总结访谈助手。通过简短、直接的提问收集用户的年度工作经历。

访谈框架：
1. 核心成果（项目、业绩、成就）
2. 挑战应对（困难、解决方案）
3. 个人成长（新技能、反思）
4. 团队贡献（协作、指导）
5. 未来规划（目标、需求）

约束：
- 每个主题问1-2个问题
- 全程控制在8-12个问题
- 问题简短、引导性强
- 直接开始，不需要寒暄

请发送开场白和第一个问题。`
        }
      ];

      const response = await callAgentA(initialMessages, (thinking) => {
        // 不显示思考过程（chat 模型没有 reasoning_content）
      });

      const assistantMessage = response.choices?.[0]?.message?.content || '';

      console.log('[Interview Local] Session:', newSessionId);
      console.log('[Interview Local] Model: deepseek-chat');
      console.log('[Interview Local] Question:', assistantMessage.slice(0, 100));

      addMessage('assistant', assistantMessage, '');

      return {
        message: assistantMessage,
        thinking: '',
        finished: false,
      };
    } catch (err) {
      setError(err.message);
      setIsStarted(false);
      throw err;
    } finally {
      setIsLoading(false);
      setCurrentThinking('');
    }
  }, [isStarted, addMessage]);

  const sendMessage = useCallback(
    async (userMessage) => {
      if (!userMessage.trim()) return;

      // 添加用户消息
      addMessage('user', userMessage);
      setIsLoading(true);
      setError(null);
      setCurrentThinking('');
      thinkingRef.current = '';

      try {
        // 计算当前轮次
        const newCount = questionCount + 1;
        setQuestionCount(newCount);

        // 动态生成当前进度提示
        const getCurrentTopic = (count) => {
          if (count <= 3) return '核心成果';
          if (count <= 5) return '挑战应对';
          if (count <= 7) return '个人成长';
          if (count <= 9) return '团队贡献';
          return '未来规划';
        };

        const currentTopicName = getCurrentTopic(newCount);
        const shouldEnd = newCount >= 10;

        // 准备对话历史
        const history = [
          {
            role: 'system',
            content: `**当前进度**：第 ${newCount} 轮对话
**当前主题**：${currentTopicName}
${shouldEnd ? '**重要**：对话已接近尾声，这应该是最后一个问题。询问完后，感谢用户并总结访谈完成。' : ''}

**持续约束**：
- 紧扣当前主题，不要跳跃
- 询问具体细节、数据、案例
- 如果用户回答简短，追问细节
- 避免重复已问过的内容
- 保持职业咨询师的专业语气`,
          },
          ...messages,
          { role: 'user', content: userMessage },
        ];

        // 调用本地 DeepSeek API (快速)
        const response = await callAgentA(history, (thinking) => {
          // chat 模型不显示思考过程
        });

        // 添加AI回复
        const assistantMessage = response.choices?.[0]?.message?.content || '';

        console.log('[Interview Local] Round:', newCount);
        console.log('[Interview Local] Question:', assistantMessage.slice(0, 100));

        addMessage('assistant', assistantMessage, '');

        // 检查是否应该结束访谈
        const isFinished = shouldEnd || (assistantMessage.includes('访谈') && assistantMessage.includes('完成'));

        return {
          message: assistantMessage,
          thinking: '',
          finished: isFinished,
        };
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setIsLoading(false);
        setCurrentThinking('');
      }
    },
    [messages, addMessage, questionCount]
  );

  const resetInterview = useCallback(() => {
    setMessages([]);
    setCurrentThinking('');
    thinkingRef.current = '';
    setError(null);
    setIsStarted(false);
    setCurrentTopic('achievements');
    setQuestionCount(0);
    setSessionId(null);
  }, []);

  return {
    messages,
    isLoading,
    currentThinking,
    error,
    isStarted,
    sendMessage,
    addMessage,
    resetInterview,
    startInterview,
  };
}

/**
 * Hook: 报告生成控制器
 */
export function useReportGeneration() {
  const [status, setStatus] = useState('idle'); // idle | extracting | writing | reviewing | complete | error
  const [progress, setProgress] = useState(0);
  const [currentAgent, setCurrentAgent] = useState(null);
  const [agentLogs, setAgentLogs] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const addLog = useCallback((agent, message, type = 'info') => {
    setAgentLogs((prev) => [
      ...prev,
      {
        timestamp: new Date().toISOString(),
        agent,
        message,
        type, // info | warning | error | success
      },
    ]);
  }, []);

  const generate = useCallback(
    async ({ conversationHistory, preferences, sessionId }) => {
      setStatus('extracting');
      setProgress(0);
      setResult(null);
      setError(null);

      try {
        // 使用 n8n 工作流生成报告
        const response = await generateReportWithN8N({
          conversationHistory,
          preferences,
          sessionId,
          progressCallbacks: {
            onArchivistStart: () => {
              setCurrentAgent('Archivist');
              addLog('Archivist', '开始提取结构化数据...', 'info');
              setProgress(10);
            },
            onArchivistComplete: (factsheet) => {
              const extractedFields = Object.values(factsheet || {}).filter(v => v).length;
              addLog(
                'Archivist',
                `✅ 提取完成: ${extractedFields}/6 个字段`,
                'success'
              );
              setProgress(30);
            },
            onWriterStart: () => {
              setCurrentAgent('Writer');
              addLog('Writer', '开始并行生成3个版本...', 'info');
              setProgress(40);
            },
            onWriterComplete: (drafts) => {
              addLog('Writer', `✅ 所有版本生成完成 (${drafts?.length || 0}个版本)`, 'success');
              setProgress(70);
            },
            onCriticStart: () => {
              setCurrentAgent('Critic');
              addLog('Critic', '开始逻辑审查...', 'info');
              setProgress(80);
            },
            onCriticComplete: (review) => {
              if (review?.passed) {
                addLog('Critic', `✅ 审查通过 (${review.score || 'N/A'}分)`, 'success');
              } else {
                addLog('Critic', `⚠️ 审查未通过 (${review?.score || 'N/A'}分)`, 'warning');
              }
              setProgress(100);
            },
          },
        });

        setStatus('complete');
        setResult(response);
        return response;
      } catch (err) {
        setStatus('error');
        setError(err.message);
        addLog('System', `❌ 错误: ${err.message}`, 'error');
        throw err;
      } finally {
        setCurrentAgent(null);
      }
    },
    [addLog]
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setProgress(0);
    setCurrentAgent(null);
    setAgentLogs([]);
    setResult(null);
    setError(null);
  }, []);

  return {
    status,
    progress,
    currentAgent,
    agentLogs,
    result,
    error,
    generate,
    addLog,
    reset,
  };
}

/**
 * Hook: 对话持久化
 */
export function useConversationPersistence(storageKey) {
  const save = useCallback((data) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (err) {
      console.warn('Failed to save conversation:', err);
    }
  }, [storageKey]);

  const load = useCallback(() => {
    try {
      const data = localStorage.getItem(storageKey);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.warn('Failed to load conversation:', err);
      return null;
    }
  }, [storageKey]);

  const clear = useCallback(() => {
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return { save, load, clear };
}
