import { useRef, useEffect, useState } from 'react';
import { MessageBubble } from './MessageBubble';
import { InputArea } from './InputArea';
import { MaterialDashboard } from './MaterialDashboard';
import { MobileTabNav } from './MobileTabNav';
import { useInterviewMachine } from '../hooks/useInterviewMachine';
import { Send, RotateCcw, CheckCircle2, ArrowLeft, Lightbulb, SkipForward } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * 混合式访谈界面 - 响应式设计
 * PC端：左侧聊天(65%) + 右侧素材板(35%)
 * 移动端：Tab 切换（对话 | 素材 | 完成 | 设置）
 */
export function ChatInterfaceV2({ onComplete, onBack }) {
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

  const [activeTab, setActiveTab] = useState('chat'); // 移动端 Tab 状态
  const [editingSlot, setEditingSlot] = useState(null); // 正在编辑的槽位

  const messagesEndRef = useRef(null);
  const initializingRef = useRef(false);

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

  // 编辑槽位
  const handleEditSlot = (slot) => {
    setEditingSlot(slot);
  };

  const handleSaveSlot = async (key, value) => {
    if (updateSlot) {
      updateSlot(key, value);
    }
    setEditingSlot(null);
  };

  // 移动端切换 Tab
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  return (
    <div className="flex flex-col md:flex-row w-screen h-screen bg-background-primary overflow-hidden">
      {/* PC端：左侧聊天窗口 (60%) */}
      {/* 移动端：全屏，根据Tab显示 */}
      <div className={`
        flex flex-col
        ${activeTab === 'chat' ? 'flex' : 'hidden md:flex'}
        w-full md:w-[60%]
        h-full
        border-r md:border-r border-border-light
      `}>
        {/* Header - 单行紧凑布局 */}
        <header className="bg-background-secondary border-b border-border-light px-4 md:px-6 py-2.5 flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            {/* 左侧：Logo/Title */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* 移动端返回按钮 */}
              {onBack && (
                <button
                  onClick={onBack}
                  className="md:hidden p-2 -ml-2"
                  style={{ color: '#5c6b7f' }}
                >
                  <ArrowLeft size={20} />
                </button>
              )}

              <h1 className="text-lg md:text-xl font-serif font-semibold" style={{ color: '#1e3a5f' }}>
                Talk2Report 2.0
              </h1>
            </div>

            {/* 中间：进度条 - PC端显示 */}
            {completion.total > 0 && (
              <div className="hidden md:flex-1 mx-8 max-w-xl">
                <div className="flex items-center gap-3">
                  <div className="flex-1 rounded-full h-2 overflow-hidden relative" style={{ backgroundColor: '#f1f3f5' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${completion.percentage}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{
                        background: 'linear-gradient(90deg, #1e3a5f 0%, #c9a961 100%)',
                        position: 'relative'
                      }}
                    >
                      {/* Shimmer效果 */}
                      <div
                        className="absolute inset-0"
                        style={{
                          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                          backgroundSize: '200% 100%',
                          animation: 'shimmer 2s infinite'
                        }}
                      />
                    </motion.div>
                  </div>
                  <span className="text-xs font-semibold whitespace-nowrap" style={{ color: '#1e3a5f', minWidth: '80px' }}>
                    {completion.completed}/{completion.total} ({completion.percentage}%)
                  </span>
                </div>
              </div>
            )}

            {/* 右侧：操作按钮 */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* PC端：完成提示徽章 */}
              {completion.total > 0 && completion.percentage >= 70 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border"
                  style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.3)' }}
                >
                  <CheckCircle2 size={14} style={{ color: '#22c55e' }} />
                  <span className="text-xs font-semibold" style={{ color: '#22c55e' }}>
                    可完成
                  </span>
                </motion.div>
              )}

              {/* 移动端进度显示 */}
              {completion.total > 0 && (
                <div className="md:hidden text-xs font-medium" style={{ color: '#5c6b7f' }}>
                  {completion.percentage}%
                </div>
              )}

              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition-colors"
                style={{ color: '#5c6b7f' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f3f5'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <RotateCcw size={14} />
                <span className="hidden md:inline">重置</span>
              </button>
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 custom-scrollbar">
          <div className="w-full">
            {/* Welcome Message */}
            {messages.length === 0 && (
              <div className="text-center py-12">
                {isLoading || initializingRef.current ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                      <Send className="text-primary animate-pulse" size={32} />
                    </div>
                    <h2 className="text-h2 font-serif text-primary mb-2">
                      AI 顾问正在准备...
                    </h2>
                    <p className="text-text-secondary">
                      正在为您启动深度访谈
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                      <Send className="text-primary" size={32} />
                    </div>
                    <h2 className="text-h2 font-serif text-primary mb-2">
                      欢迎使用 Talk2Report 2.0
                    </h2>
                    <p className="text-text-secondary mb-6">
                      我是您的AI顾问,会通过深度对话帮您梳理这一年
                    </p>
                  </motion.div>
                )}
              </div>
            )}

            {/* Messages */}
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

            {/* Current Thinking */}
            {isLoading && currentThinking && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-warning/10 border border-warning/30 rounded-lg">
                  <div className="spinner" />
                  <span className="text-small text-warning-text">
                    AI 正在思考...
                  </span>
                </div>
              </motion.div>
            )}

            {/* Loading Indicator */}
            {isLoading && !currentThinking && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start mb-4"
              >
                <div className="bg-background-secondary rounded-2xl px-4 py-3 border border-border-light">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce" />
                    </div>
                    <span className="text-small text-text-secondary">
                      AI 正在分析...
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-4 rounded-lg p-4"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
              >
                <p className="text-small" style={{ color: '#ef4444' }}>
                  ❌ {error}
                </p>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-background-secondary border-t border-border-light px-4 md:px-6 py-3 md:py-4 flex-shrink-0">
          <div className="w-full">
            {/* 当前话题提示 */}
            {!state.is_finished && !isLoading && state.current_focus_slot && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg border"
                style={{
                  background: 'linear-gradient(135deg, rgba(201, 169, 97, 0.1) 0%, rgba(201, 169, 97, 0.05) 100%)',
                  borderColor: 'rgba(201, 169, 97, 0.2)'
                }}
              >
                <Lightbulb size={16} style={{ color: '#c9a961', flexShrink: 0 }} />
                <span className="text-xs" style={{ color: '#c9a961' }}>当前话题：</span>
                <span className="text-xs font-semibold" style={{ color: '#1e3a5f' }}>{state.current_focus_slot}</span>
              </motion.div>
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

            {/* Action Buttons - 右对齐 */}
            {!state.is_finished && (
              <div className="mt-3 flex justify-end items-center gap-2">
                {/* Skip Button */}
                {state.current_focus_slot && (
                  <button
                    onClick={handleSkip}
                    disabled={isLoading}
                    className="px-3 py-1.5 text-xs text-text-secondary hover:text-primary hover:bg-background-tertiary rounded-lg disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                  >
                    <span>跳过此问题</span>
                    <SkipForward size={14} />
                  </button>
                )}

                {/* Finish Button */}
                {state.conversation_round >= 5 && (
                  <button
                    onClick={handleFinish}
                    disabled={isLoading}
                    className="px-4 py-1.5 bg-success text-white text-xs font-semibold rounded-lg hover:bg-success/90 disabled:opacity-50 flex items-center gap-1.5 shadow-md transition-colors"
                  >
                    <CheckCircle2 size={14} />
                    <span>完成访谈</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PC端：右侧素材收集板 (40%) */}
      {/* 移动端：根据Tab显示 */}
      <div
        className={`hidden md:flex w-full md:w-[40%] h-full bg-white border-l border-gray-300 ${
          activeTab === 'material' ? '!flex' : ''
        }`}
        style={{ display: window.innerWidth >= 768 ? 'flex' : (activeTab === 'material' ? 'flex' : 'none') }}
      >
        <MaterialDashboard
          slots={state.slots}
          completion={completion}
          currentFocus={state.current_focus_slot}
          onEditSlot={handleEditSlot}
        />
      </div>

      {/* 移动端底部 Tab 导航 */}
      <MobileTabNav activeTab={activeTab} onChange={handleTabChange} />
    </div>
  );
}
