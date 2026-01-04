import { useState } from 'react';
import { Copy, Download, FileText, MessageSquare, Share2, Presentation, ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * 报告查看器组件 - 响应式设计
 * 显示生成的多个版本报告
 */
export function ReportViewer({ drafts, review, onBack }) {
  const [activeTab, setActiveTab] = useState('brief');
  const [copied, setCopied] = useState(false);

  const tabs = [
    { key: 'brief', label: '200字电梯汇报', icon: MessageSquare },
    { key: 'formal', label: '正式年度述职', icon: FileText },
    { key: 'social', label: '朋友圈文案', icon: Share2 },
    { key: 'outline', label: '结构化大纲', icon: FileText },
    { key: 'ppt_outline', label: 'PPT提纲', icon: Presentation },
  ];

  const handleCopy = async () => {
    const content = drafts[activeTab]?.content || drafts[activeTab];
    if (content) {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const content = drafts[activeTab]?.content || drafts[activeTab];
    if (!content) return;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `Talk2Report_${activeTab}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const activeContent = drafts[activeTab]?.content || drafts[activeTab] || '';

  return (
    <div className="min-h-screen bg-background-secondary">
      {/* Header */}
      <header className="bg-white border-b border-border-light px-4 md:px-6 py-3 md:py-4 sticky top-0 z-10">
        <div className="w-full px-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* 移动端返回按钮 */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onBack}
              className="md:hidden p-2 -ml-2 text-text-secondary hover:text-primary"
            >
              <ArrowLeft size={20} />
            </motion.button>

            <div>
              <h1 className="text-xl md:text-2xl font-serif font-bold text-primary">报告已生成</h1>
              <p className="text-small text-text-secondary">
                质量评分: <span className="font-semibold text-success">
                  {review?.overall_assessment?.score || 0}分
                </span>
                {' '}· 通过审查
              </p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onBack}
            className="hidden md:block px-4 py-2 text-text-primary hover:bg-background-tertiary rounded-xl transition-colors text-small font-medium"
          >
            返回
          </motion.button>
        </div>
      </header>

      <main className="w-full px-4 md:px-8 py-4 md:py-6 pb-20 md:pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Tabs - PC端左侧栏，移动端顶部横向滚动 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-border-light p-4">
              <h3 className="font-serif font-semibold text-primary mb-3 text-body">选择版本</h3>
              {/* 移动端：横向滚动 */}
              <div className="lg:hidden -mx-4 px-4 overflow-x-auto">
                <div className="flex gap-2 min-w-max">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <motion.button
                        key={tab.key}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-left transition-colors whitespace-nowrap ${activeTab === tab.key
                            ? 'bg-accent/10 text-accent font-medium border-2 border-accent/20'
                            : 'text-text-secondary hover:bg-background-tertiary border-2 border-transparent'
                          }`}
                      >
                        <Icon size={16} />
                        <span className="text-small">{tab.label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
              {/* PC端：垂直列表 */}
              <div className="hidden lg:block space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <motion.button
                      key={tab.key}
                      whileHover={{ scale: 1.01, x: 2 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setActiveTab(tab.key)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${activeTab === tab.key
                          ? 'bg-accent/10 text-accent font-medium border-2 border-accent/20'
                          : 'text-text-secondary hover:bg-background-tertiary border-2 border-transparent'
                        }`}
                    >
                      <Icon size={18} />
                      <span className="text-small">{tab.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Review Summary - 仅PC端显示 */}
            {review && (
              <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-border-light p-4 mt-4">
                <h3 className="font-serif font-semibold text-primary mb-3 text-body">审查报告</h3>
                <div className="space-y-2 text-small">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">事实准确性</span>
                    <span className="font-medium text-primary">
                      {review.version_reviews?.[activeTab]?.score || '-'}分
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">逻辑自洽性</span>
                    <span className="font-medium text-warning">
                      {review.statistics?.logical_fallacies || 0} 个问题
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">证据充分性</span>
                    <span className="font-medium text-error">
                      {review.statistics?.unsupported_claims || 0} 个缺失
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-xl shadow-sm border border-border-light"
            >
              {/* Toolbar */}
              <div className="border-b border-border-light px-4 py-3 flex items-center justify-between">
                <h2 className="font-serif font-semibold text-primary text-body">
                  {tabs.find((t) => t.key === activeTab)?.label}
                </h2>
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-3 py-1.5 text-small text-text-primary hover:bg-background-tertiary rounded-xl transition-colors"
                  >
                    <Copy size={16} />
                    <span className="hidden sm:inline">{copied ? '已复制!' : '复制'}</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-3 py-1.5 text-small text-text-primary hover:bg-background-tertiary rounded-xl transition-colors"
                  >
                    <Download size={16} />
                    <span className="hidden sm:inline">下载</span>
                  </motion.button>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 md:p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="markdown-content max-w-none">
                  <ReactMarkdown>{activeContent}</ReactMarkdown>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
