import { useState, useRef, useEffect } from 'react';
import { Send, Mic } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * 输入区域组件
 */
export function InputArea({ onSend, disabled, placeholder }) {
  const [content, setContent] = useState('');
  const textareaRef = useRef(null);

  // 自动调整高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [content]);

  const handleSubmit = (e) => {
    e?.preventDefault();

    const trimmed = content.trim();
    if (!trimmed || disabled) {
      return;
    }

    onSend(trimmed);
    setContent('');

    // 重置高度
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        rows={1}
        className="chat-input pr-24"
        style={{ minHeight: '48px', maxHeight: '200px' }}
      />

      {/* Actions */}
      <div className="absolute right-2 bottom-2 flex items-center gap-2">
        {/* Voice Input Hint (for future) */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="button"
          className="p-2 text-text-tertiary hover:text-text-secondary transition-colors disabled:opacity-50"
          title="语音输入 (暂未启用)"
          disabled
        >
          <Mic size={20} />
        </motion.button>

        {/* Send Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="submit"
          disabled={!content.trim() || disabled}
          className="p-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
        >
          <Send size={20} />
        </motion.button>
      </div>
    </form>
  );
}
