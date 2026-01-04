import { useRef, useEffect, useState } from 'react';
import { MessageBubble } from './MessageBubble';
import { InputArea } from './InputArea';
import { MaterialDashboard } from '../common/MaterialDashboard';
import { MobileTabNav } from './MobileTabNav';
import { useInterviewMachine } from '../../hooks/useInterviewMachine';
import { Send, RotateCcw, CheckCircle2, ArrowLeft, SkipForward, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Talk2Report 2.0 访谈界面 - 重构版
 *
 * 设计理念：现代专业编辑风格
 * - PC端：严格的62/38双栏布局，充分利用屏幕空间
 * - 移动端：Tab切换，每个Tab占据全屏
 * - 视觉层级：进度 → 对话 → 输入
 */
export function ChatInterfaceV3({ onComplete, onBack }) {
  const {
    state,
    messages,
    isLoading,
    currentThinking,
    error,
    isStarted,
    completion,
    sessionId,
    startInterview,
    sendMessage,
    skipCurrentSlot,
    finishInterview,
    resetInterview,
    updateSlot,
  } = useInterviewMachine();

  const [activeTab, setActiveTab] = useState('chat');
  const [editingSlot, setEditingSlot] = useState(null);
  const [showSkipSuggestion, setShowSkipSuggestion] = useState(false);
  const messagesEndRef = useRef(null);
  const initializingRef = useRef(false);
  const focusSlotRoundsRef = useRef({ slot: null, rounds: 0 });

  // 追踪同一槽位停留轮次
  useEffect(() => {
    if (state.current_focus_slot) {
      if (focusSlotRoundsRef.current.slot === state.current_focus_slot) {
        focusSlotRoundsRef.current.rounds += 1;
        // 同一槽位停留3轮以上,显示跳过建议
        if (focusSlotRoundsRef.current.rounds >= 3) {
          setShowSkipSuggestion(true);
        }
      } else {
        // 切换到新槽位,重置计数
        focusSlotRoundsRef.current = {
          slot: state.current_focus_slot,
          rounds: 1
        };
        setShowSkipSuggestion(false);
      }
    }
  }, [state.current_focus_slot, state.conversation_round]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentThinking]);

  // 自动启动访谈
  useEffect(() => {
    if (!isStarted && !initializingRef.current && !error) {
      initializingRef.current = true;
      startInterview().catch((err) => {
        console.error('Failed to start interview:', err);
        initializingRef.current = false;
      });
    }
  }, [isStarted, error, startInterview]);

  const handleSendMessage = async (content) => {
    try {
      const response = await sendMessage(content);
      if (response?.finished) {
        setTimeout(() => {
          onComplete?.({
            conversationHistory: messages,
            slots: state.slots,
            completion,
            sessionId
          });
        }, 1500);
      }
    } catch (err) {
      console.error('Send message failed:', err);
    }
  };

  const handleSkip = () => {
    setShowSkipSuggestion(false);
    focusSlotRoundsRef.current = { slot: null, rounds: 0 };
    skipCurrentSlot().catch(console.error);
  };

  const handleFinish = () => {
    const result = finishInterview();
    if (result?.finished) {
      setTimeout(() => {
        onComplete?.({
          conversationHistory: messages,
          slots: state.slots,
          completion,
          sessionId
        });
      }, 500);
    }
  };

  const handleReset = () => {
    if (confirm('确定要清除所有对话记录并重新开始吗?')) {
      resetInterview();
    }
  };

  const handleEditSlot = (slot) => {
    setEditingSlot(slot);
  };

  const handleSaveSlot = async (key, value) => {
    if (updateSlot) {
      updateSlot(key, value);
    }
    setEditingSlot(null);
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  // 计算进度百分比
  const progressPercentage = completion.total > 0
    ? Math.round((completion.completed / completion.total) * 100)
    : 0;

  return (
    <div className="interview-container">
      {/* ==================== 顶部固定 Header ==================== */}
      <header className="interview-header">
        <div className="header-content">
          {/* 左侧：标题 */}
          <div className="header-left">
            {onBack && (
              <button
                onClick={onBack}
                className="back-button md:hidden"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div>
              <h1 className="header-title">Talk2Report 2.0</h1>
              <p className="header-subtitle hidden md:block">
                AI驱动的年终总结助手 · 深度访谈进行中
              </p>
            </div>
          </div>

          {/* 中间：进度条 */}
          {completion.total > 0 && (
            <div className="header-center">
              <div className="progress-container">
                <div className="progress-bar-wrapper">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="progress-bar"
                  />
                </div>
              </div>
              <div className="progress-text">
                第 {state.conversation_round || 1} 轮 · {completion.completed}/{completion.total} 项
                <span className="progress-percentage">{progressPercentage}%</span>
                {state.current_focus_slot && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="current-topic"
                  >
                    · 正在收集: {state.current_focus_slot}
                  </motion.span>
                )}
              </div>
            </div>
          )}

          {/* 右侧：操作按钮 */}
          <div className="header-right">
            {completion.percentage >= 70 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="completion-badge"
              >
                <CheckCircle2 size={16} />
                <span>可以完成访谈了</span>
              </motion.div>
            )}
            <button onClick={handleReset} className="reset-button">
              <RotateCcw size={14} />
              <span className="hidden md:inline">重置</span>
            </button>
          </div>
        </div>
      </header>

      {/* ==================== 主内容区 ==================== */}
      <div className="interview-main">
        {/* ==================== 左侧：对话区 (62%) ==================== */}
        <section className={`
          chat-section
          ${activeTab === 'chat' ? 'flex' : 'hidden md:flex'}
        `}>
          {/* 消息列表 */}
          <div className="messages-container">
            <div className="messages-content">
              {/* 欢迎消息 */}
              {messages.length === 0 && (
                <div className="welcome-message">
                  {isLoading || initializingRef.current ? (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <div className="welcome-icon">
                        <Send className="animate-pulse" size={40} />
                      </div>
                      <h2>AI 顾问正在准备...</h2>
                      <p>正在为您启动深度访谈</p>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="welcome-icon">
                        <Send size={40} />
                      </div>
                      <h2>欢迎使用 Talk2Report 2.0</h2>
                      <p>我是您的AI顾问，会通过深度对话帮您梳理这一年</p>
                    </motion.div>
                  )}
                </div>
              )}

              {/* 消息列表 */}
              <AnimatePresence mode="popLayout">
                {messages.map((message, index) => (
                  <MessageBubble
                    key={index}
                    role={message.role}
                    content={message.content}
                    thinking={message.think}
                    timestamp={message.timestamp}
                  />
                ))}
              </AnimatePresence>

              {/* 当前思考中 */}
              {isLoading && currentThinking && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="thinking-indicator"
                >
                  <div className="spinner" />
                  <span>AI 正在思考...</span>
                </motion.div>
              )}

              {/* 加载动画 */}
              {isLoading && !currentThinking && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="loading-indicator"
                >
                  <div className="typing-dots">
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </div>
                  <span>AI 正在分析...</span>
                </motion.div>
              )}

              {/* 错误消息 */}
              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="error-message"
                >
                  ❌ {error}
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* ==================== 输入区 ==================== */}
          <div className="input-section">
            {/* 智能跳过建议 */}
            <AnimatePresence>
              {showSkipSuggestion && !state.is_finished && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className="skip-suggestion"
                >
                  <div className="skip-suggestion-content">
                    <div className="skip-suggestion-icon">💡</div>
                    <div className="skip-suggestion-text">
                      <p className="skip-suggestion-title">看来这一块已经聊得很深了</p>
                      <p className="skip-suggestion-subtitle">是否直接跳到下一环节?</p>
                    </div>
                  </div>
                  <div className="skip-suggestion-actions">
                    <button
                      onClick={() => setShowSkipSuggestion(false)}
                      className="skip-suggestion-btn skip-suggestion-btn-secondary"
                    >
                      继续当前话题
                    </button>
                    <button
                      onClick={handleSkip}
                      className="skip-suggestion-btn skip-suggestion-btn-primary"
                    >
                      <SkipForward size={16} />
                      跳到下一环节
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 当前话题提示 */}
            {!state.is_finished && !isLoading && state.current_focus_slot && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="topic-hint"
              >
                <div className="hint-icon">
                  <Lightbulb size={16} />
                </div>
                <div className="hint-content">
                  <span className="hint-label">当前话题:</span>
                  <span className="hint-value">{state.current_focus_slot}</span>
                </div>
              </motion.div>
            )}

            {/* 操作按钮组 */}
            {!state.is_finished && (
              <div className="action-buttons">
                {state.conversation_round >= 5 && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleFinish}
                    disabled={isLoading}
                    className="btn-finish"
                  >
                    <CheckCircle2 size={18} />
                    <span>完成访谈</span>
                  </motion.button>
                )}

                {state.current_focus_slot && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSkip}
                    disabled={isLoading}
                    className="btn-skip"
                  >
                    <span>跳过此问题</span>
                    <SkipForward size={18} />
                  </motion.button>
                )}
              </div>
            )}

            {/* 输入框 */}
            <InputArea
              onSend={handleSendMessage}
              disabled={isLoading || state.is_finished}
              placeholder={
                state.is_finished
                  ? "访谈已完成"
                  : "在这里输入你的回答... (按 Enter 发送，Shift+Enter 换行)"
              }
            />
          </div>
        </section>

        {/* ==================== 右侧：素材板 (38%) ==================== */}
        <section className={`
          materials-section
          ${activeTab === 'material' ? 'flex' : 'hidden md:flex'}
        `}>
          <MaterialDashboard
            slots={state.slots}
            completion={completion}
            currentFocus={state.current_focus_slot}
            onEditSlot={handleEditSlot}
          />
        </section>
      </div>

      {/* ==================== 移动端 Tab 导航 ==================== */}
      <MobileTabNav activeTab={activeTab} onChange={handleTabChange} />
    </div>
  );
}

// ==================== CSS-in-JS 样式 (内联样式) ====================
const styles = `
.interview-container {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  background: #ffffff;
  overflow: hidden;
}

/* ==================== 顶部 Header ==================== */
.interview-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  height: 82px;
  z-index: 50;
  background: #ffffff;
  border-bottom: 2px solid #e8ecf0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
  width: 100%;
  height: 100%;
  padding: 1rem 1.5rem;
  box-sizing: border-box;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
}

.header-title {
  font-family: 'IBM Plex Serif', Georgia, serif;
  font-size: 1.5rem;
  font-weight: 600;
  color: #1e3a5f;
  line-height: 1.2;
}

.header-subtitle {
  font-size: 0.875rem;
  color: #8d99ae;
  margin-top: 0.25rem;
}

/* ==================== 进度条 ==================== */
.header-center {
  flex: 1;
  max-width: 500px;
}

.progress-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.progress-bar-wrapper {
  width: 100%;
  height: 8px;
  background: #f1f3f5;
  border-radius: 9999px;
  overflow: hidden;
  position: relative;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #1e3a5f 0%, #c9a961 100%);
  border-radius: 9999px;
  position: relative;
}

.progress-bar::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.progress-text {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #1e3a5f;
  flex-wrap: wrap;
}

.progress-percentage {
  font-weight: 700;
  color: #c9a961;
}

.current-topic {
  color: #3b82f6;
  font-weight: 600;
  font-size: 0.8125rem;
}

/* ==================== 右侧操作 ==================== */
.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
}

.completion-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #22c55e;
}

.reset-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: transparent;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: #8d99ae;
  cursor: pointer;
  transition: all 0.2s;
}

.reset-button:hover {
  background: #f1f3f5;
  color: #1e3a5f;
}

.back-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  background: transparent;
  border: none;
  color: #8d99ae;
  cursor: pointer;
}

/* ==================== 主内容区 ==================== */
.interview-main {
  display: flex;
  flex: 1;
  width: 100%;
  height: calc(100vh - 82px); /* Total height minus header */
  margin-top: 82px; /* header height + border */
  overflow: hidden;
}

.chat-section {
  flex: 0 0 62%;
  display: flex;
  flex-direction: column;
  width: 62%;
  border-right: 2px solid #e8ecf0;
  background: #ffffff;
  overflow: hidden;
}

.materials-section {
  flex: 0 0 38%;
  display: flex;
  flex-direction: column;
  width: 38%;
  background: #fafbfc;
  overflow: hidden;
}

/* ==================== 消息列表 ==================== */
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.messages-content {
  max-width: 800px;
  margin: 0 auto;
}

/* ==================== 欢迎消息 ==================== */
.welcome-message {
  text-align: center;
  padding: 3rem 1rem;
}

.welcome-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8f 100%);
  border-radius: 9999px;
  margin-bottom: 1.5rem;
  color: #c9a961;
}

.welcome-message h2 {
  font-family: 'IBM Plex Serif', Georgia, serif;
  font-size: 1.75rem;
  font-weight: 600;
  color: #1e3a5f;
  margin-bottom: 0.5rem;
}

.welcome-message p {
  color: #5c6b7f;
  font-size: 1rem;
}

/* ==================== 思考/加载指示器 ==================== */
.thinking-indicator,
.loading-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  background: #fafbfc;
  border: 1px solid #e8ecf0;
  border-radius: 0.75rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  color: #5c6b7f;
}

.typing-dots {
  display: flex;
  gap: 0.25rem;
}

.typing-dots .dot {
  width: 8px;
  height: 8px;
  background: #c9a961;
  border-radius: 9999px;
  animation: bounce 1.4s infinite ease-in-out both;
}

.typing-dots .dot:nth-child(1) { animation-delay: -0.32s; }
.typing-dots .dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

/* ==================== 错误消息 ==================== */
.error-message {
  padding: 1rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  color: #ef4444;
}

/* ==================== 输入区 ==================== */
.input-section {
  padding: 1rem 1.5rem;
  background: #ffffff;
  border-top: 2px solid #e8ecf0;
}

/* 智能跳过建议 */
.skip-suggestion {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 197, 253, 0.05) 100%);
  border: 2px solid rgba(59, 130, 246, 0.3);
  border-radius: 0.75rem;
  padding: 1rem;
  margin-bottom: 1rem;
  overflow: hidden;
}

.skip-suggestion-content {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.skip-suggestion-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.skip-suggestion-text {
  flex: 1;
}

.skip-suggestion-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #1e3a5f;
  margin-bottom: 0.25rem;
}

.skip-suggestion-subtitle {
  font-size: 0.8125rem;
  color: #5c6b7f;
}

.skip-suggestion-actions {
  display: flex;
  gap: 0.5rem;
}

.skip-suggestion-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  flex: 1;
}

.skip-suggestion-btn-primary {
  background: #3b82f6;
  color: #ffffff;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
}

.skip-suggestion-btn-primary:hover {
  background: #2563eb;
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
  transform: translateY(-1px);
}

.skip-suggestion-btn-secondary {
  background: #ffffff;
  color: #5c6b7f;
  border: 2px solid #e8ecf0;
}

.skip-suggestion-btn-secondary:hover {
  border-color: #3b82f6;
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.05);
}

.topic-hint {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, rgba(201, 169, 97, 0.1) 0%, rgba(201, 169, 97, 0.05) 100%);
  border: 1px solid rgba(201, 169, 97, 0.2);
  border-radius: 0.5rem;
  margin-bottom: 1rem;
}

.hint-icon {
  flex-shrink: 0;
  color: #c9a961;
}

.hint-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.hint-label {
  color: #c9a961;
  font-weight: 500;
}

.hint-value {
  color: #1e3a5f;
  font-weight: 600;
}

.action-buttons {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.btn-finish,
.btn-skip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-finish {
  background: #22c55e;
  color: #ffffff;
  flex: 1;
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
}

.btn-finish:hover:not(:disabled) {
  background: #16a34a;
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
}

.btn-finish:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-skip {
  background: #ffffff;
  color: #5c6b7f;
  border: 2px solid #e8ecf0;
  flex: 0 0 auto;
}

.btn-skip:hover:not(:disabled) {
  border-color: #c9a961;
  color: #c9a961;
  background: rgba(201, 169, 97, 0.05);
}

.btn-skip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ==================== 响应式设计 ==================== */
@media (max-width: 1023px) {
  .interview-main {
    flex-direction: column;
    height: calc(100vh - 82px);
  }

  .chat-section,
  .materials-section {
    flex: 1;
    width: 100%;
    border-right: none;
  }

  .header-content {
    padding: 0.75rem 1rem;
    gap: 1rem;
  }

  .header-center {
    max-width: 250px;
  }

  .header-right {
    gap: 0.5rem;
  }

  .completion-badge span {
    display: none;
  }

  .action-buttons {
    flex-direction: column;
  }

  .btn-finish,
  .btn-skip {
    width: 100%;
  }

  .messages-container {
    padding: 1rem;
  }

  .input-section {
    padding: 0.75rem 1rem;
  }
}

@media (max-width: 639px) {
  .header-center {
    display: none;
  }

  .header-subtitle {
    display: none;
  }

  .header-title {
    font-size: 1.25rem;
  }
}

/* ==================== 滚动条样式 ==================== */
.messages-container::-webkit-scrollbar {
  width: 6px;
}

.messages-container::-webkit-scrollbar-track {
  background: transparent;
}

.messages-container::-webkit-scrollbar-thumb {
  background: #d1d9e0;
  border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
`;

// 注入样式
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.type = 'text/css';
  styleSheet.innerText = styles;
  if (!document.head.querySelector('[data-interview-styles]')) {
    styleSheet.setAttribute('data-interview-styles', 'true');
    document.head.appendChild(styleSheet);
  }
}
