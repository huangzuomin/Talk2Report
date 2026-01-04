import { useState, useEffect, useRef } from 'react';
import { SLOT_CATEGORIES } from '../../config/ReportState';
import { CheckCircle2, Circle, AlertCircle, SkipForward, ChevronRight, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * 素材收集板 - 响应式设计 + 增强动效
 * PC端：右侧面板（38%宽度）
 * 移动端：Tab页面（全屏）
 * 
 * 新增功能:
 * - 三态指示灯 (未触及/提取中/已填充)
 * - 槽位填充时的高亮闪烁动画
 * - 更明显的编辑入口提示
 */
export function MaterialDashboard({ slots, completion, currentFocus, onEditSlot }) {
  // 按分类组织槽位
  const categorizedSlots = Object.entries(SLOT_CATEGORIES).map(([key, category]) => ({
    key,
    ...category,
    slots: slots.filter(s => s.category === key)
  }));

  return (
    <div className="flex flex-col h-full w-full bg-white border-l border-gray-300 overflow-hidden">
      {/* Header - PC端显示，移动端简化 */}
      <div className="px-4 py-3 border-b border-gray-300 bg-gray-50">
        <h2 className="text-lg font-bold text-black mb-2">
          📊 素材收集板
        </h2>

        {/* 进度条 */}
        <div className="mb-1">
          <div className="flex items-center justify-between text-xs mb-1 text-gray-600">
            <span>完成度</span>
            <motion.span
              className="font-bold text-black"
              key={completion.percentage}
              initial={{ scale: 1.2, color: '#3b82f6' }}
              animate={{ scale: 1, color: '#000000' }}
              transition={{ duration: 0.3 }}
            >
              {completion.completed}/{completion.total} ({completion.percentage}%)
            </motion.span>
          </div>
          <div className="w-full rounded h-2 bg-gray-200 overflow-hidden">
            <motion.div
              className="h-full bg-blue-600"
              initial={{ width: 0 }}
              animate={{ width: `${completion.percentage}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      {/* Slots List - 可滚动 */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {categorizedSlots.map((category) => (
          <div key={category.key} className="mb-4">
            {/* Category Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{category.icon}</span>
                <h3 className="font-bold text-black text-sm">
                  {category.label}
                </h3>
              </div>
              <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                {category.slots.filter(s => s.value && s.value !== "SKIPPED").length}/{category.slots.length}
              </span>
            </div>

            {/* Slots Grid */}
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {category.slots.map(slot => (
                  <SlotCard
                    key={slot.key}
                    slot={slot}
                    isFocused={currentFocus === slot.key}
                    onClick={() => slot.value && onEditSlot && onEditSlot(slot)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Tips - PC端显示 */}
      <div className="hidden md:block px-4 py-3 border-t border-gray-300 bg-gray-50">
        <div className="text-xs text-gray-600">
          <p className="font-bold text-black mb-2">💡 操作提示</p>
          <p>• AI 会根据您的回答自动提取信息</p>
          <p>• 点击已填充的卡片可以手动修正</p>
        </div>
      </div>
    </div>
  );
}

/**
 * 槽位卡片组件 - 增强版动效
 */
function SlotCard({ slot, isFocused, onClick }) {
  const [isHovered, setIsHovered] = useState(false);
  const [justFilled, setJustFilled] = useState(false);
  const prevValueRef = useRef(slot.value);

  // 检测槽位刚被填充
  useEffect(() => {
    if (!prevValueRef.current && slot.value && slot.value !== "SKIPPED") {
      setJustFilled(true);
      const timer = setTimeout(() => setJustFilled(false), 1500);
      return () => clearTimeout(timer);
    }
    prevValueRef.current = slot.value;
  }, [slot.value]);

  // 三态指示灯: 未触及/提取中/已填充
  const getStatusIcon = () => {
    if (slot.value === "SKIPPED") {
      return <SkipForward size={14} className="text-gray-400 flex-shrink-0" />;
    }
    if (slot.value) {
      // 已填充 - 绿色勾选
      return (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          <CheckCircle2 size={14} className="text-green-600 flex-shrink-0" />
        </motion.div>
      );
    }
    if (isFocused) {
      // 提取中 - 脉冲蓝色圆圈
      return (
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [1, 0.7, 1]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        >
          <Circle size={14} className="text-blue-500 flex-shrink-0" fill="currentColor" fillOpacity={0.3} />
        </motion.div>
      );
    }
    if (slot.required) {
      return <AlertCircle size={14} className="text-orange-500 flex-shrink-0" />;
    }
    // 未触及 - 灰色空心圆
    return <Circle size={14} className="text-gray-400 flex-shrink-0" />;
  };

  const getCardStyle = () => {
    if (slot.value === "SKIPPED") {
      return 'bg-gray-100 border-gray-300';
    }
    if (slot.value) {
      return 'bg-yellow-50 border-yellow-400';
    }
    if (isFocused) {
      return 'bg-blue-50 border-blue-400 shadow-md';
    }
    if (slot.required) {
      return 'bg-orange-50 border-orange-400';
    }
    return 'bg-white border-gray-300';
  };

  const isClickable = slot.value && slot.value !== "SKIPPED" && onClick;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{
        opacity: 1,
        y: 0,
        boxShadow: justFilled
          ? ['0 0 0 0 rgba(59, 130, 246, 0)', '0 0 0 4px rgba(59, 130, 246, 0.4)', '0 0 0 0 rgba(59, 130, 246, 0)']
          : '0 0 0 0 rgba(0, 0, 0, 0)'
      }}
      transition={{
        layout: { duration: 0.3 },
        boxShadow: { duration: 1, times: [0, 0.5, 1] }
      }}
      onClick={isClickable ? onClick : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`px-3 py-2 rounded-lg border-2 transition-all relative ${getCardStyle()} ${isClickable ? 'cursor-pointer hover:shadow-lg' : ''}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex-shrink-0">{getStatusIcon()}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold truncate text-black">
                {slot.label}
              </span>
              {slot.required && (
                <span className="text-xs flex-shrink-0 text-yellow-600">✦</span>
              )}
            </div>
          </div>
        </div>

        {/* Edit Indicator - 增强版 */}
        {isClickable && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0.5 }}
            className="hidden md:flex items-center gap-1 flex-shrink-0 ml-1"
          >
            {isHovered && (
              <motion.span
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xs text-blue-600 font-medium"
              >
                编辑
              </motion.span>
            )}
            <Edit3 size={12} className="text-blue-600" />
          </motion.div>
        )}
      </div>

      {/* Value */}
      {slot.value && slot.value !== "SKIPPED" && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm leading-relaxed text-gray-700"
        >
          {slot.value}
        </motion.p>
      )}

      {/* Skipped */}
      {slot.value === "SKIPPED" && (
        <p className="text-sm italic text-gray-400">
          已跳过
        </p>
      )}

      {/* Empty State */}
      {!slot.value && (
        <motion.p
          className="text-sm italic text-gray-400"
          animate={isFocused ? { opacity: [0.5, 1, 0.5] } : { opacity: 1 }}
          transition={isFocused ? { duration: 2, repeat: Infinity } : {}}
        >
          {isFocused ? '🔍 正在询问...' : '待收集'}
        </motion.p>
      )}
    </motion.div>
  );
}
