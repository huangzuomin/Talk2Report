import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * 思考过程折叠组件 - 增强版
 * 用于展示DeepSeek-R1的思考过程
 * 
 * 新增功能:
 * - 折叠时显示简短摘要
 * - 更醒目的视觉设计
 * - 平滑的展开/收起动画
 */
export function ThinkingProcess({ content }) {
  const [isOpen, setIsOpen] = useState(false);

  // 提取简短摘要 (取前100个字符或第一行)
  const summary = useMemo(() => {
    if (!content || !content.trim()) return '';
    const firstLine = content.split('\n')[0];
    const truncated = firstLine.length > 100 ? firstLine.slice(0, 100) + '...' : firstLine;
    return truncated || '查看AI的推理过程...';
  }, [content]);

  if (!content || !content.trim()) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className="thinking-process-container"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="thinking-process-header"
      >
        <div className="thinking-process-header-left">
          <motion.div
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight size={16} className="text-yellow-600" />
          </motion.div>
          <Brain size={16} className="text-yellow-600" />
          <span className="thinking-process-title">🧠 AI 思考过程</span>
        </div>
        <span className="thinking-process-toggle">
          {isOpen ? '收起' : '展开'}
        </span>
      </button>

      {/* 折叠时显示摘要 */}
      {!isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="thinking-process-summary"
        >
          {summary}
        </motion.div>
      )}

      {/* 展开时显示完整内容 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="thinking-process-content-wrapper"
          >
            <pre className="thinking-process-content">{content}</pre>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

