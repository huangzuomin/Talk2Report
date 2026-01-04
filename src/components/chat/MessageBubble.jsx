import { ThinkingProcess } from './ThinkingProcess';
import ReactMarkdown from 'react-markdown';
import { User, Bot } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * 消息气泡组件 - 带动效和新设计
 */
export function MessageBubble({ role, content, thinking, timestamp }) {
  const isUser = role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, x: isUser ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className={`max-w-[85%] md:max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        {/* Avatar */}
        <div className={`flex items-center gap-2 mb-1.5 px-1`}>
          {isUser ? (
            <>
              <span className="text-xs text-text-tertiary">
                {timestamp && new Date(timestamp).toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
              <User size={14} className="text-text-secondary" />
              <span className="text-small font-medium text-text-primary">你</span>
            </>
          ) : (
            <>
              <Bot size={14} className="text-primary" />
              <span className="text-small font-medium text-primary">
                AI 顾问
              </span>
              <span className="text-xs text-text-tertiary">
                {timestamp && new Date(timestamp).toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </>
          )}
        </div>

        {/* 思考过程 (仅AI消息) */}
        {!isUser && thinking && <ThinkingProcess content={thinking} />}

        {/* 消息内容 */}
        <div
          className={`
            px-5 py-3.5 rounded-2xl border-2
            ${isUser
              ? 'bg-primary text-white rounded-tr-none border-primary shadow-md'
              : 'bg-background-secondary text-text-primary rounded-tl-none border-border-light'
            }
          `}
        >
          {isUser ? (
            <p className="text-body leading-relaxed whitespace-pre-wrap">
              {content}
            </p>
          ) : (
            <div className="markdown-content text-body leading-relaxed">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
