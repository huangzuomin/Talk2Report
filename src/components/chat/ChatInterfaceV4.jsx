import { useRef, useEffect, useState } from 'react';
import { MessageBubble } from './MessageBubble';
import { InputArea } from './InputArea';
import { MobileTabNav } from './MobileTabNav';
import { useInterviewMachine } from '../../hooks/useInterviewMachine';
import { Send, RotateCcw, CheckCircle2, ArrowLeft, Lightbulb, SkipForward, Trophy, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * EDITORIAL LUXURY MAGAZINE 风格访谈界面
 *
 * 设计理念：年终总结是一场成就的策展
 * - 视觉风格：高端访谈杂志 + 博物馆展签
 * - 布局：60/40 非对称双栏
 * - 字体：Playfair Display (标题) + IBM Plex Serif (正文)
 * - 色彩：Stone 中性基调 + Amber 金色点缀
 * - 记忆点：成就填充时的"盖章"仪式感
 */
export function ChatInterfaceV4({ onComplete, onBack }) {
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
  } = useInterviewMachine();

  const [activeTab, setActiveTab] = useState('chat');
  const messagesEndRef = useRef(null);
  const initializingRef = useRef(false);

  // 自动滚动
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentThinking]);

  // 自动启动
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

  return (
    <div className="flex flex-col md:flex-row w-full h-full bg-linen-texture overflow-hidden font-serif">
      {/* 左侧：深度对话区域 (70%) */}
      <div className={`
        flex flex-col
        ${activeTab === 'chat' ? '' : 'hidden md:flex'}
        w-full md:w-[70%]
        h-full
        bg-white
        relative
        min-w-0
      `}>
        {/* 极简顶栏 - 档案雅致版 */}
        <header className="h-14 sm:h-16 bg-parchment border-b border-gilded px-3 sm:px-5 flex-shrink-0 shadow-elegant">
          <div className="flex items-center justify-between h-full gap-2">
            {/* Logo */}
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              {onBack && (
                <button onClick={onBack} className="md:hidden p-1.5 text-stone-600 flex-shrink-0">
                  <ArrowLeft size={18} />
                </button>
              )}
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <div className="seal-gilded w-7 h-7 sm:w-8 sm:h-9 rounded-full flex items-center justify-center flex-shrink-0">
                  <Trophy size={16} className="text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-sm sm:text-base font-bold leading-tight truncate">
                    <span className="text-gilded">Talk2Report</span>
                  </h1>
                  <p className="text-[8px] sm:text-[9px] text-soft-gray uppercase tracking-wider hidden sm:block">
                    Achievement Interview
                  </p>
                </div>
              </div>
            </div>

            {/* 进度 - 烫金光效 */}
            {completion.total > 0 && (
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <div className="hidden lg:flex items-center gap-2">
                  <div className="w-32 sm:w-40 progress-gilded">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${completion.percentage}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="progress-gilded-bar animate-shimmer-gold"
                    />
                  </div>
                  <span className="text-xs font-bold text-gilded whitespace-nowrap">
                    {completion.percentage}%
                  </span>
                </div>

                {/* 移动端进度 */}
                <div className="lg:hidden text-xs font-bold text-gilded whitespace-nowrap">
                  {completion.percentage}%
                </div>

                <button
                  onClick={handleReset}
                  className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-all duration-200 flex-shrink-0"
                  title="重置访谈"
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            )}
          </div>
        </header>

        {/* 对话区域 - 杂志式对话流 */}
        <div className="flex-1 overflow-y-auto py-4 sm:py-6 px-4 sm:px-5 pb-16 md:pb-5 min-w-0">
          {/* 欢迎消息 - 编辑式排版 */}
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center py-12 sm:py-16"
            >
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-6 sm:mb-8 rounded-full bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 flex items-center justify-center shadow-xl">
                  <Target className="text-white" size={32} />
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 mb-4 tracking-tight">
                  成就访谈
                </h2>
                <p className="text-base sm:text-lg text-stone-600 leading-relaxed max-w-md mx-auto">
                  AI 顾问将通过深度对话<br />帮您梳理这一年的职业亮点
                </p>
                {isLoading && initializingRef.current && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mt-8 sm:mt-10 flex items-center justify-center gap-2"
                  >
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-amber-600 rounded-full animate-bounce" />
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-amber-600 rounded-full animate-bounce [animation-delay:0.15s]" />
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-amber-600 rounded-full animate-bounce [animation-delay:0.3s]" />
                  </motion.div>
                )}
              </motion.div>
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

            {/* 当前思考 - 优雅提示 */}
            {isLoading && currentThinking && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6"
              >
                <div className="inline-flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200 rounded-lg shadow-sm">
                  <div className="relative">
                    <div className="w-2 h-2 bg-amber-600 rounded-full" />
                    <div className="absolute inset-0 w-2 h-2 bg-amber-600 rounded-full animate-ping opacity-75" />
                  </div>
                  <span className="text-sm text-amber-900 font-medium">
                    AI 正在思考...
                  </span>
                </div>
              </motion.div>
            )}

            {/* 加载指示器 - 精致动画 */}
            {isLoading && !currentThinking && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-6"
              >
                <div className="flex items-center gap-2 text-stone-500">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                    <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                  </div>
                  <span className="text-sm">正在分析...</span>
                </div>
              </motion.div>
            )}

            {/* 错误提示 */}
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-6 bg-red-50 border-l-4 border-red-400 rounded-r-lg p-4"
              >
                <p className="text-sm text-red-800 font-medium">❌ {error}</p>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
        </div>

        {/* 输入区域 - 编辑工作台 */}
        <div className="border-t border-stone-100 py-6 sm:py-7 px-4 sm:px-5 bg-white flex-shrink-0">
          {/* 当前话题提示 - 优雅卡片 */}
          {!state.is_finished && !isLoading && state.current_focus_slot && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-amber-50 to-white border-l-4 border-amber-500 rounded-r-lg shadow-sm"
            >
                <div className="flex-shrink-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-100 flex items-center justify-center">
                    <Lightbulb size={16} className="text-amber-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] sm:text-xs text-amber-700 font-medium uppercase tracking-wide">
                    当前话题
                  </span>
                  <div className="text-sm sm:text-base font-semibold text-stone-900 truncate">
                    {state.current_focus_slot}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 输入框 */}
            <InputArea
              onSend={handleSendMessage}
              disabled={isLoading || state.is_finished}
              placeholder={
                state.is_finished
                  ? "访谈已完成"
                  : "分享你的成就和故事..."
              }
            />

            {/* 操作按钮 - 右对齐 */}
            {!state.is_finished && (
              <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row justify-end items-center gap-2 sm:gap-3">
                {state.conversation_round >= 5 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleFinish}
                    disabled={isLoading}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2.5 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white text-sm font-bold rounded-lg hover:from-amber-600 hover:via-amber-700 hover:to-amber-800 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <CheckCircle2 size={18} />
                    <span>完成访谈</span>
                  </motion.button>
                )}

                {state.current_focus_slot && (
                  <button
                    onClick={handleSkip}
                    disabled={isLoading}
                    className="w-full sm:w-auto px-4 sm:px-5 py-2.5 text-sm text-stone-600 hover:text-stone-900 hover:bg-stone-200 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-all duration-200 font-medium"
                  >
                    <span>跳过此问题</span>
                    <SkipForward size={16} />
                  </button>
                )}
              </div>
            )}
        </div>
      </div>

      <div className="hidden md:flex md:w-[30%] h-full bg-stone-50 min-w-0" style={{ display: window.innerWidth >= 768 || activeTab === 'material' ? 'flex' : 'none' }}>
        <MaterialEditorialBoard
          slots={state.slots}
          completion={completion}
          currentFocus={state.current_focus_slot}
        />
      </div>

      {/* 移动端底部导航 */}
      <MobileTabNav activeTab={activeTab} onChange={setActiveTab} />
    </div>
  );
}

/**
 * 编辑式成就展示板
 * 像博物馆展签或杂志信息卡
 */
function MaterialEditorialBoard({ slots, completion, currentFocus }) {
  // 按分类组织
  const categories = [
    { key: 'achievements', label: '核心成就', icon: '🏆', slots: slots.filter(s => s.category === 'achievements') },
    { key: 'challenges', label: '挑战突破', icon: '💪', slots: slots.filter(s => s.category === 'challenges') },
    { key: 'growth', label: '成长收获', icon: '🌱', slots: slots.filter(s => s.category === 'growth') },
    { key: 'team', label: '团队协作', icon: '🤝', slots: slots.filter(s => s.category === 'team') },
    { key: 'future', label: '未来规划', icon: '🎯', slots: slots.filter(s => s.category === 'future') },
  ].filter(cat => cat.slots.length > 0);

  return (
    <div className="flex flex-col h-full overflow-hidden min-w-0 border-l border-stone-100 w-full">
      {/* 顶部：数据洞察卡片 */}
      <div className="py-4 sm:py-5 px-4 sm:px-5 bg-white border-b border-stone-100">
        <div className="flex items-center justify-between mb-3 sm:mb-4 gap-3">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-stone-900 truncate">成就收集板</h2>
            <p className="text-[9px] sm:text-[10px] text-stone-500 uppercase tracking-wide">
              Achievement Collection
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-xl sm:text-2xl font-bold text-amber-600">
              {completion.completed}
              <span className="text-sm sm:text-base text-stone-400 font-normal">/{completion.total}</span>
            </div>
            <div className="text-[9px] sm:text-[10px] text-stone-500 uppercase tracking-wide">
              已收集
            </div>
          </div>
        </div>

        {/* 进度条 - 金色渐变 */}
        <div className="h-2 bg-stone-200 rounded-full overflow-hidden shadow-inner">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completion.percentage}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 rounded-full relative"
          >
            {/* 光泽效果 */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent" />
          </motion.div>
        </div>
      </div>

      {/* 卡片列表 */}
      <div className="flex-1 overflow-y-auto py-5 sm:py-6 px-4 space-y-5 sm:space-y-6 custom-scrollbar">
        {categories.map((category) => (
          <div key={category.key} className="min-w-0">
            {/* 分类标题 - 杂志式 */}
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 pb-2 sm:pb-2.5 border-b border-stone-200">
              <span className="text-lg sm:text-xl filter drop-shadow-sm flex-shrink-0">{category.icon}</span>
              <h3 className="text-sm sm:text-base font-bold text-stone-800 flex-1 uppercase tracking-wide min-w-0 truncate">
                {category.label}
              </h3>
              <div className="text-[9px] sm:text-[10px] font-semibold text-stone-500 bg-stone-100 px-1.5 sm:px-2 py-0.5 rounded-full flex-shrink-0">
                {category.slots.filter(s => s.value && s.value !== "SKIPPED").length}/{category.slots.length}
              </div>
            </div>

            {/* 卡片网格 */}
            <div className="space-y-3 sm:space-y-3.5">
              {category.slots.map(slot => (
                <AchievementCard
                  key={slot.key}
                  slot={slot}
                  isFocused={currentFocus === slot.key}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 底部：提示 */}
      <div className="py-3 sm:py-4 px-4 sm:px-5 bg-white border-t border-stone-100">
        <p className="text-[9px] sm:text-[10px] text-stone-500 leading-relaxed font-medium">
          💡 AI 会根据你的回答自动提取关键信息
        </p>
      </div>
    </div>
  );
}

/**
 * 成就卡片 - 档案证书式设计
 * 每个成就是一份烫金证书
 */
function AchievementCard({ slot, isFocused }) {
  const getStatus = () => {
    if (slot.value === "SKIPPED") return 'skipped';
    if (slot.value) return 'filled';
    if (slot.required) return 'required';
    return 'empty';
  };

  const status = getStatus();

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`
        relative overflow-hidden rounded-xl border-2 transition-all duration-300
        ${status === 'filled' ? 'achievement-card-filled' : ''}
        ${status === 'skipped' ? 'bg-stone-100 border-stone-300' : ''}
        ${status === 'required' ? 'bg-orange-50 border-orange-300' : ''}
        ${status === 'empty' && !isFocused ? 'achievement-card-empty' : ''}
        ${isFocused && status === 'empty' ? 'bg-amber-50 border-amber-400 shadow-sm' : ''}
      `}
    >
      {/* 左侧状态指示条 - 渐变效果 */}
      <div className={`
        absolute top-0 left-0 w-1.5 h-full
        ${status === 'filled' ? 'bg-gradient-to-b from-amber-400 to-amber-600' : ''}
        ${status === 'skipped' ? 'bg-gradient-to-b from-stone-300 to-stone-400' : ''}
        ${status === 'required' ? 'bg-gradient-to-b from-orange-300 to-orange-500' : ''}
        ${status === 'empty' && !isFocused ? 'bg-gradient-to-b from-stone-200 to-stone-300' : ''}
        ${isFocused && status === 'empty' ? 'bg-gradient-to-b from-amber-300 to-amber-500 animate-pulse' : ''}
      `} />

      <div className="pl-4 sm:pl-5 pr-3.5 sm:pr-4.5 py-2.5 sm:py-3.5">
        {/* 标题行 */}
        <div className="flex items-start justify-between mb-1.5 sm:mb-2">
          <div className="flex items-center gap-2 sm:gap-2.5 flex-1 min-w-0">
            {/* 状态图标 - 烫金印章 */}
            {status === 'filled' && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 20,
                  delay: 0.1
                }}
                className="stamp-seal w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0"
              >
                <CheckCircle2 size={14} className="text-white" />
              </motion.div>
            )}
            {status === 'skipped' && (
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-stone-300 to-stone-400 flex items-center justify-center flex-shrink-0">
                <SkipForward size={14} className="text-white" />
              </div>
            )}
            {(status === 'empty' || status === 'required') && (
              <div className={`
                w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0
                ${status === 'required' ? 'border-orange-400 bg-orange-50' : 'border-stone-300'}
              `}>
                <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isFocused ? 'bg-amber-500 animate-pulse' : 'bg-stone-300'}`} />
              </div>
            )}

            {/* 标题 */}
            <span className="text-xs sm:text-sm font-bold text-stone-900 truncate leading-tight">
              {slot.label}
            </span>

            {/* 必填标记 */}
            {slot.required && (
              <span className="text-amber-600 text-[10px] sm:text-xs flex-shrink-0 font-bold">✦</span>
            )}
          </div>
        </div>

        {/* 内容 */}
        {slot.value && slot.value !== "SKIPPED" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mt-2 sm:mt-3"
          >
            <div className="relative pl-7 sm:pl-8 pr-2">
              {/* 左侧装饰线 */}
              <div className="absolute left-4 sm:left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-gold to-transparent opacity-30" />
              <p className="text-xs sm:text-sm text-ink-black leading-relaxed font-normal break-words">
                {slot.value}
              </p>
            </div>
          </motion.div>
        )}

        {/* 状态提示 */}
        {!slot.value && (
          <p className="text-[10px] sm:text-xs text-stone-400 italic pl-7 sm:pl-8 mt-1 sm:mt-1.5">
            {isFocused ? '正在询问...' : '待收集'}
          </p>
        )}

        {slot.value === "SKIPPED" && (
          <p className="text-[10px] sm:text-xs text-stone-400 italic pl-7 sm:pl-8 mt-1 sm:mt-1.5">
            已跳过
          </p>
        )}
      </div>

      {/* 装饰性右上角纹理 - 仅填充状态 */}
      {status === 'filled' && (
        <div className="absolute top-0 right-0 w-16 h-16 opacity-5">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <path
              d="M0 0 L100 0 L100 100 Z"
              fill="url(#goldGradient)"
            />
            <defs>
              <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      )}
    </motion.div>
  );
}
