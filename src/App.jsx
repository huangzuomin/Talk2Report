import { useState, useEffect } from 'react';
import { ChatInterface } from './components/chat/ChatInterface';
import { ChatInterfaceV2 } from './components/chat/ChatInterfaceV2';
import { ChatInterfaceV4 } from './components/chat/ChatInterfaceV4';
import { ReportViewer } from './components/report/ReportViewer';
import { AgentTerminal } from './components/common/AgentTerminal';
import { useReportGeneration, useConversationPersistence } from './hooks/useDeepSeek';
import { Settings, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const STORAGE_KEY = 'talk2report_v2_state';

function App() {
  const [view, setView] = useState('setup'); // setup | chat | generating | result
  const [preferences, setPreferences] = useState({
    role: '',
    audience: 'leader',
    tone: 'plain',
    length_main_chars: 1200,
  });
  const [conversationHistory, setConversationHistory] = useState([]);

  const {
    status,
    progress,
    currentAgent,
    agentLogs,
    result,
    error: generationError,
    generate,
    addLog,
    reset: resetGeneration,
  } = useReportGeneration();

  const { save, load, clear } = useConversationPersistence(STORAGE_KEY);

  // 加载保存的状态
  useEffect(() => {
    const saved = load();
    if (saved) {
      setView(saved.view || 'setup');
      setPreferences(saved.preferences || preferences);
      setConversationHistory(saved.conversationHistory || []);
    }
  }, [load]);

  // 保存状态
  useEffect(() => {
    save({
      view,
      preferences,
      conversationHistory,
    });
  }, [view, preferences, conversationHistory, save]);

  const handleStartChat = () => {
    console.log('[App] handleStartChat called, current view:', view);
    setView('chat');
    addLog('System', '开始访谈...', 'info');
  };

  const handleInterviewComplete = (data) => {
    // 兼容两种格式：旧版本直接传messages，新版本传{conversationHistory, slots, completion}
    if (data && data.conversationHistory) {
      setConversationHistory(data.conversationHistory);
    } else {
      setConversationHistory(data);
    }

    // 保存 sessionId（如果有）
    if (data?.sessionId) {
      console.log('[App] Using interview sessionId:', data.sessionId);
    }

    // 开始生成报告
    handleGenerateReport(data);
  };

  const handleGenerateReport = async (data) => {
    setView('generating');

    try {
      // 使用 interview 的 sessionId，如果没有则生成新的
      const sessionId = data?.sessionId || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      console.log('[App] Generate report with sessionId:', sessionId);

      // 传递数据给生成器
      const payload = {
        conversationHistory: data?.conversationHistory || data,
        preferences,
        sessionId,
      };

      if (data?.slots) {
        payload.extractedData = data.slots;
      }

      await generate(payload);

      setView('result');
    } catch (err) {
      console.error('Generation failed:', err);
      addLog('System', `生成失败: ${err.message}`, 'error');
    }
  };

  const handleBackToSetup = () => {
    setView('setup');
    resetGeneration();
    setConversationHistory([]);
  };

  const handleReset = () => {
    clear();
    setView('setup');
    setPreferences({
      role: '',
      audience: 'leader',
      tone: 'plain',
      length_main_chars: 1200,
    });
    setConversationHistory([]);
    resetGeneration();
  };

  return (
    <div id="app" className={view === 'chat' ? "h-screen overflow-hidden" : "min-h-screen"}>
      {/* ChatInterfaceV4: 始终挂载以保持状态，只在非chat阶段隐藏 */}
      <div className={view === 'chat' ? 'block' : 'hidden'}>
        <ChatInterfaceV4 onComplete={handleInterviewComplete} />
      </div>

      {view === 'setup' && (
        <div className="min-h-screen bg-linen-texture">
          <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-8 md:py-12">
            <div className="text-center mb-6 md:mb-8">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 seal-gilded rounded-full mb-3 md:mb-4 shadow-elegant"
              >
                <Sparkles className="text-white" size={24} />
              </motion.div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif font-bold mb-1.5">
                <span className="text-gilded">Talk2Report 2.0</span>
              </h1>
              <p className="text-sm md:text-base text-text-secondary">
                AI驱动的年终总结助手 · 深度访谈版
              </p>
            </div>

            <div className="bg-parchment border border-gilded rounded-2xl shadow-elegant p-5 md:p-6">
              <div className="flex items-center gap-2 mb-5">
                <Settings className="text-primary" size={20} />
                <h2 className="text-lg md:text-xl font-serif font-bold text-primary">配置参数</h2>
              </div>

              <div className="space-y-4">
                {/* 职位 */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">
                    你的职位 <span className="text-text-tertiary">(可选)</span>
                  </label>
                  <input
                    type="text"
                    value={preferences.role}
                    onChange={(e) =>
                      setPreferences({ ...preferences, role: e.target.value })
                    }
                    placeholder="例如: 产品经理、前端工程师、销售经理..."
                    className="w-full px-3.5 py-2.5 border-2 border-border-medium rounded-lg focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all bg-background-primary text-text-primary placeholder:text-text-tertiary text-sm"
                  />
                </div>

                {/* 受众对象 */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">
                    主要受众
                  </label>
                  <select
                    value={preferences.audience}
                    onChange={(e) =>
                      setPreferences({ ...preferences, audience: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 border-2 border-border-medium rounded-lg focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all bg-background-primary text-text-primary text-sm"
                  >
                    <option value="leader">领导 / 决策层</option>
                    <option value="hr">HR / 考评委员会</option>
                    <option value="team">团队成员</option>
                    <option value="public">公开 / 朋友圈</option>
                  </select>
                </div>

                {/* 文风风格 */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">
                    文风风格
                  </label>
                  <select
                    value={preferences.tone}
                    onChange={(e) =>
                      setPreferences({ ...preferences, tone: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 border-2 border-border-medium rounded-lg focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all bg-background-primary text-text-primary text-sm"
                  >
                    <option value="plain">平实稳重</option>
                    <option value="official">正式商务</option>
                    <option value="warm">温和感性</option>
                  </select>
                </div>

                {/* 字数期望 */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">
                    正式稿字数
                  </label>
                  <input
                    type="number"
                    value={preferences.length_main_chars}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        length_main_chars: Number(e.target.value),
                      })
                    }
                    min="800"
                    max="2000"
                    step="100"
                    className="w-full px-3.5 py-2.5 border-2 border-border-medium rounded-lg focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all bg-background-primary text-text-primary text-sm"
                  />
                  <p className="text-xs text-text-secondary mt-1">
                    建议: 800-1500字
                  </p>
                </div>

                {/* Start Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={(e) => {
                    console.log('[App] Button clicked');
                    e.preventDefault();
                    e.stopPropagation();
                    handleStartChat();
                  }}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-amber-700 transition-all shadow-lg hover:shadow-xl text-sm"
                  type="button"
                >
                  开始访谈
                </motion.button>
              </div>
            </div>

            {/* Info Box */}
            <div className="mt-5 bg-gradient-to-br from-amber-50/80 to-orange-50/80 border-2 border-amber-200/50 rounded-xl p-4 shadow-elegant">
              <h3 className="font-serif font-semibold text-amber-800 mb-2.5 text-sm flex items-center gap-2">
                <span className="text-lg">💡</span>
                Talk2Report 2.0 新特性
              </h3>
              <ul className="text-xs text-amber-900/80 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 mt-0.5">✨</span>
                  <span><strong className="text-amber-900">深度访谈:</strong> AI通过苏格拉底式提问挖掘成就</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 mt-0.5">🧠</span>
                  <span><strong className="text-amber-900">思考过程:</strong> 展示AI推理,增强透明度</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 mt-0.5">⚖️</span>
                  <span><strong className="text-amber-900">质量审查:</strong> 专业审稿确保逻辑自洽</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 mt-0.5">📊</span>
                  <span><strong className="text-amber-900">多版本输出:</strong> 汇报/晋升/社交版一应俱全</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {view === 'chat' && (
        <ChatInterfaceV4 onComplete={handleInterviewComplete} />
      )}

      {view === 'generating' && (
        <div className="min-h-screen bg-white">
          <div className="w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="py-6 md:py-8 lg:py-10 w-full"
            >
              <h2 className="text-xl md:text-2xl font-serif font-bold text-primary mb-6 text-center">
                正在生成你的年终总结
              </h2>

              <AgentTerminal
                logs={agentLogs}
                status={status}
                progress={progress}
              />

              {generationError && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-6 bg-error/10 border border-error/30 rounded-xl p-4"
                >
                  <p className="text-small text-error">
                    ❌ {generationError}
                  </p>
                  <button
                    onClick={handleBackToSetup}
                    className="mt-3 px-4 py-2 bg-error text-white rounded-lg hover:bg-error/90 transition-colors text-small font-medium"
                  >
                    返回配置
                  </button>
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>
      )}

      {view === 'result' && result && (
        <>
          {result.success === false ? (
            <div className="min-h-screen bg-white">
              <div className="w-full">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 md:p-8 text-center w-full"
                >
                  <div className="text-5xl md:text-6xl mb-4">⚠️</div>
                  <h2 className="text-xl md:text-2xl font-serif font-bold text-primary mb-4">
                    生成报告失败
                  </h2>
                  <div className="bg-error/10 border border-error/30 rounded-xl p-4 mb-6 text-left">
                    <p className="text-error font-medium mb-2 text-small">错误信息：</p>
                    <p className="text-error text-body">{result.error}</p>
                  </div>
                  <div className="space-y-3 md:space-y-4">
                    <p className="text-text-secondary text-body">
                      很抱歉，报告生成过程中遇到了问题。这可能是由于以下原因：
                    </p>
                    <ul className="text-left text-text-secondary space-y-2 mb-6 text-small">
                      <li>• n8n 工作流中 Agent B 数据提取失败（已知问题）</li>
                      <li>• 对话内容过少，无法提取足够的信息</li>
                      <li>• DeepSeek API 服务异常</li>
                    </ul>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleBackToSetup}
                        className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors font-medium"
                      >
                        返回配置
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          // 返回chat视图，由于ChatInterfaceV4保持挂载，对话状态会保留
                          setView('chat');
                        }}
                        className="px-6 py-3 bg-background-tertiary text-text-primary rounded-xl hover:bg-border-medium transition-colors font-medium"
                      >
                        继续访谈
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          ) : (
            <ReportViewer
              drafts={result.drafts}
              review={result.review}
              onBack={handleBackToSetup}
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;
