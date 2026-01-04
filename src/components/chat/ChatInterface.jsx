import { useRef, useEffect, useState } from 'react';
import { MessageBubble } from './MessageBubble';
import { InputArea } from './InputArea';
import { useInterview } from '../hooks/useDeepSeek';
import { Send, RotateCcw, Sparkles } from 'lucide-react';

/**
 * 聊天界面组件
 * 替代原有的StepWizard表单
 */
export function ChatInterface({ onComplete }) {
  const {
    messages,
    isLoading,
    currentThinking,
    error,
    isStarted,
    sendMessage,
    resetInterview,
    startInterview,
  } = useInterview();

  const messagesEndRef = useRef(null);
  const initializingRef = useRef(false); // 用ref防止StrictMode双重调用

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

      // 检查是否完成访谈
      if (response?.finished) {
        onComplete?.(messages);
      }
    } catch (err) {
      console.error('Send message failed:', err);
    }
  };

  const handleReset = () => {
    if (confirm('确定要清除所有对话记录并重新开始吗?')) {
      resetInterview();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Talk2Report</h1>
            <p className="text-sm text-gray-600">
              AI驱动的年终总结助手 · 深度访谈版
            </p>
          </div>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RotateCcw size={16} />
            重置对话
          </button>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-4xl mx-auto px-6 py-6">
          {/* Welcome Message / Initializing */}
          {messages.length === 0 && (
            <div className="text-center py-12">
              {isLoading || initializingRef.current ? (
                <>
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
                    <Sparkles className="text-primary-600 animate-pulse" size={32} />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    AI 顾问正在准备...
                  </h2>
                  <p className="text-gray-600">
                    正在为您启动深度访谈
                  </p>
                </>
              ) : (
                <>
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
                    <Send className="text-primary-600" size={32} />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    欢迎使用 Talk2Report 2.0
                  </h2>
                  <p className="text-gray-600 mb-6">
                    我是您的AI顾问,会通过深度对话帮您梳理这一年
                  </p>
                  <div className="inline-block bg-blue-50 border border-blue-200 rounded-lg p-4 text-left max-w-md">
                    <p className="text-sm text-blue-900">
                      <strong>💡 提示:</strong> 不需要像填表一样,就当是在聊天。
                      我会根据您的回答进行追问,帮您挖掘那些可能被忽略的成就。
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Messages */}
          {messages.map((message, index) => (
            <MessageBubble
              key={index}
              role={message.role}
              content={message.content}
              thinking={message.think}
              timestamp={message.timestamp}
            />
          ))}

          {/* Current Thinking */}
          {isLoading && currentThinking && (
            <div className="mb-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="spinner" />
                <span className="text-sm text-yellow-800">
                  AI 正在思考...
                </span>
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {isLoading && !currentThinking && (
            <div className="flex justify-start mb-4">
              <div className="bg-gray-100 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  </div>
                  <span className="text-sm text-gray-600">
                    AI 正在分析...
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-900">
                ❌ {error}
              </p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <InputArea
            onSend={handleSendMessage}
            disabled={isLoading}
            placeholder="在这里输入你的回答... (按 Enter 发送, Shift+Enter 换行)"
          />
          <p className="text-xs text-gray-500 mt-2 text-center">
            💡 提示: 可以使用手机输入法语音转文字,或直接键入
          </p>
        </div>
      </div>
    </div>
  );
}
