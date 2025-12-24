import { useEffect, useMemo, useRef, useState } from 'react';
import './style.css';
import { apiConfig, generateReport, nextInterviewStep } from './api/client';

const QUESTIONS = [
  'Q1：过去这一年，你最想分享哪三个关键成果？',
  'Q2：在实现这些成果的过程中，你克服了哪些具体的挑战？',
  'Q3：这些成果对公司或团队产生了怎样的实际价值？',
  'Q4：你在这个过程中运用了哪些核心技能或新学习的知识？',
  'Q5：有没有哪件事让你觉得有遗憾，或者如果重来会做得更好？',
  'Q6：这一年你最大的个人成长点是什么？',
  'Q7：你得到的反馈（来自同事/客户/领导）中最让你深刻的是什么？',
  'Q8：你为团队文化或他人成长做出了哪些贡献？',
  'Q9：面对明年的业务目标，你个人的核心重点在哪里？',
  'Q10：你需要公司或上级提供哪些具体支持来达成明年的目标？',
  'Q11：你对自己下一阶段的职业抱负或转型方向有什么思考？',
  'Q12：最后，用三个关键词来总结你的这一年吧。',
];

const STORAGE_KEY = 'talk2report_state';
const DEFAULT_PARAMS = {
  audience: 'leader',
  tone: 'plain',
  length: 1200,
};

const RESULT_TABS = [
  { key: 'draft_main', label: '正式稿' },
  { key: 'draft_short', label: '精简版' },
  { key: 'outline', label: '结构大纲' },
  { key: 'ppt_outline', label: 'PPT 提纲' },
];

function App() {
  const [view, setView] = useState('setup');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentQuestionId, setCurrentQuestionId] = useState('Q1');
  const [currentQuestionText, setCurrentQuestionText] = useState(QUESTIONS[0]);
  const [isFollowUp, setIsFollowUp] = useState(false);
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [answers, setAnswers] = useState({});
  const [outputs, setOutputs] = useState({});
  const [activeTab, setActiveTab] = useState(RESULT_TABS[0].key);
  const [status, setStatus] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [followUpHistory, setFollowUpHistory] = useState([]);

  const getSafeIndex = (index) => {
    const numeric = Number.isFinite(index) ? index : 0;
    return Math.min(Math.max(numeric, 0), QUESTIONS.length - 1);
  };

  const normalizeQuestionId = (id, indexFallback = currentIndex) => {
    const trimmed = typeof id === 'string' ? id.trim() : '';
    if (trimmed && /^Q\d+$/.test(trimmed)) return trimmed;
    const safeIndex = getSafeIndex(indexFallback);
    return `Q${safeIndex + 1}`;
  };

  const sessionIdRef = useRef(`s_${Math.random().toString(36).slice(2, 11)}`);

  useEffect(() => {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (!cached) return;

    try {
      const parsed = JSON.parse(cached);
      if (parsed.sessionId) sessionIdRef.current = parsed.sessionId;
      setView(parsed.view || 'setup');
      setCurrentIndex(parsed.currentIndex || 0);
      setParams(parsed.params || DEFAULT_PARAMS);
      setAnswers(parsed.answers || {});
      setOutputs(parsed.outputs || {});
      setActiveTab(parsed.activeTab || RESULT_TABS[0].key);
      setCurrentQuestionId(parsed.currentQuestionId || 'Q1');
      setCurrentQuestionText(parsed.currentQuestionText || QUESTIONS[0]);
      setIsFollowUp(parsed.isFollowUp || false);
      setFollowUpHistory(parsed.followUpHistory || []);
    } catch (err) {
      console.warn('Failed to load cache, resetting state', err);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        sessionId: sessionIdRef.current,
        view,
        currentIndex,
        params,
        answers,
        outputs,
        activeTab,
        currentQuestionId,
        currentQuestionText,
        isFollowUp,
        followUpHistory,
      })
    );
  }, [view, currentIndex, params, answers, outputs, activeTab, currentQuestionId, currentQuestionText, isFollowUp, followUpHistory]);

  const progress = useMemo(() => {
    const baseAnswered = Object.keys(answers || {}).filter((id) => id.startsWith('Q')).length;
    return Math.min((baseAnswered / QUESTIONS.length) * 100, 100);
  }, [answers]);

  const currentAnswer = answers[currentQuestionId] || { edited: '' };
  const currentAnswerText = currentAnswer.edited || '';

  const handleParamChange = (key) => (event) => {
    const value = key === 'length' ? Number(event.target.value) : event.target.value;
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const handleTextChange = (event) => {
    const value = event.target.value;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestionId]: {
        ...(prev[currentQuestionId] || { transcript: '', edited: '' }),
        edited: value,
      },
    }));
  };

  const handleStartInterview = () => {
    setView('interview');
    setStatus('请直接在输入框输入或使用输入法语音输入');
  };

  const handlePrev = () => {
    const safeIndex = getSafeIndex(currentIndex);
    if (safeIndex === 0) return;
    const prevIndex = getSafeIndex(safeIndex - 1);
    setCurrentIndex(prevIndex);
    setCurrentQuestionId(normalizeQuestionId(`Q${prevIndex + 1}`, prevIndex));
    setCurrentQuestionText(QUESTIONS[prevIndex]);
    setIsFollowUp(false);
  };

  const handleNext = async () => {
    const trimmed = currentAnswerText.trim();
    if (!trimmed) {
      skipToNextBase('已跳过本题，进入下一环节');
      return;
    }
    await handleAdvanceStep();
  };

  const handleSkipFollowUp = () => {
    skipToNextBase('已跳过本题，进入下一环节');
  };

  const skipToNextBase = (message) => {
    const safeIndex = getSafeIndex(currentIndex);
    const nextIndex = getSafeIndex(safeIndex + 1);
    setCurrentIndex(nextIndex);
    setCurrentQuestionId(normalizeQuestionId(`Q${nextIndex + 1}`, nextIndex));
    setCurrentQuestionText(QUESTIONS[nextIndex]);
    setIsFollowUp(false);
    setStatus(message);
  };

  const handleGenerate = async () => {
    setView('result');
    setActiveTab(RESULT_TABS[0].key);
    setOutputs({});
    setIsGenerating(true);
    setErrorMessage('');

    try {
      const payload = {
        session_id: sessionIdRef.current,
        params,
        answers: Object.fromEntries(
          Object.entries(answers).map(([key, value]) => [key, value.edited || value.transcript || ''])
        ),
      };

      const result = await generateReport(payload);
      setOutputs(result.outputs || {});
      setStatus('报告生成完成');
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || '生成失败，请稍后重试');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAdvanceStep = async () => {
    const currentText = currentAnswerText.trim();
    if (!currentText) {
      skipToNextBase('已跳过本题，进入下一环节');
      return;
    }

    const safeQuestionId = normalizeQuestionId(currentQuestionId, currentIndex);

    setAnswers((prev) => ({
      ...prev,
      [safeQuestionId]: {
        ...(prev[safeQuestionId] || {}),
        edited: currentText,
      },
    }));

    setIsLoadingNext(true);
    setStatus('AI 记者正在分析你的回答...');
    setErrorMessage('');

    try {
      const payload = {
        session_id: sessionIdRef.current,
        params,
        answers: Object.fromEntries(
          Object.entries({
            ...answers,
            [safeQuestionId]: { ...(answers[safeQuestionId] || {}), edited: currentText },
          }).map(([key, value]) => [key, value.edited || ''])
        ),
        current_question: {
          id: safeQuestionId,
          text: currentQuestionText,
        },
        follow_up_history: followUpHistory,
      };

      const result = await nextInterviewStep(payload);

      if (result.outputs) {
        setOutputs(result.outputs);
        setView('result');
        setStatus('已生成报告');
        return;
      }

      const nextQuestion = result.next_question || {};
      if (nextQuestion.id && nextQuestion.text) {
        const isDynamicFollowUp = Boolean(result.follow_up);
        const nextId = normalizeQuestionId(nextQuestion.id, currentIndex);
        setCurrentQuestionId(nextId);
        setCurrentQuestionText(nextQuestion.text);
        setIsFollowUp(isDynamicFollowUp);
        setCurrentIndex((index) =>
          nextId.startsWith('Q') ? getSafeIndex(Number(nextId.replace('Q', '')) - 1) : getSafeIndex(index)
        );
        if (isDynamicFollowUp) {
          setFollowUpHistory((prev) => [...prev, { id: nextId, text: nextQuestion.text }]);
        }
        setStatus(isDynamicFollowUp ? 'AI 追问：请补充细节' : '请继续下一题');
      } else if (result.done) {
        await handleGenerate();
      } else {
        // 后端未返回下一题，尝试顺序推进
        const safeIndex = getSafeIndex(currentIndex);
        const nextIndex = getSafeIndex(safeIndex + 1);
        const fallbackId = `Q${nextIndex + 1}`;
        setCurrentIndex(nextIndex);
        setCurrentQuestionId(normalizeQuestionId(fallbackId, nextIndex));
        setCurrentQuestionText(QUESTIONS[nextIndex]);
        setIsFollowUp(false);
        setStatus('请继续下一题');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || '推进访谈失败，请重试');
      setStatus('推进访谈失败，请重试');
    } finally {
      setIsLoadingNext(false);
    }
  };

  const handleCopy = async () => {
    const text = outputs[activeTab];
    if (!text) return;

    await navigator.clipboard.writeText(text);
    setStatus('内容已复制');
  };

  const handleDownload = () => {
    const content = outputs[activeTab];
    if (!content) return;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `Talk2Report_${activeTab}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    if (!confirm('确定要清除所有数据并重置吗？')) return;
    localStorage.removeItem(STORAGE_KEY);
    sessionIdRef.current = `s_${Math.random().toString(36).slice(2, 11)}`;
    setView('setup');
    setCurrentIndex(0);
    setParams(DEFAULT_PARAMS);
    setAnswers({});
    setOutputs({});
    setStatus('');
    setActiveTab(RESULT_TABS[0].key);
    setErrorMessage('');
    setCurrentQuestionId('Q1');
    setCurrentQuestionText(QUESTIONS[0]);
    setIsFollowUp(false);
    setFollowUpHistory([]);
  };

  const resultContent = outputs[activeTab];
  const isLoadingResult = !resultContent && isGenerating;

  return (
    <div id="app">
      <header>
        <h1>Talk2Report</h1>
        <p className="subtitle">动嘴成稿｜年终总结语音访谈助手</p>
      </header>

      <main id="main-content">
        {view === 'setup' && (
          <section className="view">
            <div className="card">
              <h2>访谈配置</h2>
              <div className="form-group">
                <label htmlFor="audience">受众对象</label>
                <select id="audience" value={params.audience} onChange={handleParamChange('audience')}>
                  <option value="leader">领导</option>
                  <option value="hr">HR / 考评组</option>
                  <option value="team">团队成员</option>
                  <option value="public">公开 / 朋友圈</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="tone">文风风格</label>
                <select id="tone" value={params.tone} onChange={handleParamChange('tone')}>
                  <option value="plain">平实稳重</option>
                  <option value="official">正式商务</option>
                  <option value="warm">温和感性</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="length">字数期望</label>
                <input
                  type="number"
                  id="length"
                  value={params.length}
                  onChange={handleParamChange('length')}
                  step="100"
                  min="200"
                />
              </div>

              <p className="env-hint">访谈接口：{apiConfig.interviewEndpoint}</p>
              <button id="start-btn" className="primary-btn" onClick={handleStartInterview}>
                开始访谈
              </button>
            </div>
          </section>
        )}

        {view === 'interview' && (
          <section className="view">
                <div className="interview-container">
                  <div className="progress-bar">
                    <div id="progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="question-card">
                    <div className="question-meta">
                      <span id="question-index">
                        {isFollowUp ? 'AI 追问' : currentQuestionId} / {QUESTIONS.length}
                      </span>
                      {isFollowUp && <span className="follow-up-chip">跟进挖掘</span>}
                    </div>
                    <h2 id="question-text">{currentQuestionText}</h2>

                    <div className="answer-area">
                      <div id="transcript-container" className="transcript-box">
                        <textarea
                          id="answer-input"
                          placeholder="请输入或使用输入法语音输入..."
                          value={currentAnswerText}
                          onChange={handleTextChange}
                        />
                      </div>
                      <p className="input-hint">
                        提示：使用手机/输入法自带语音输入或直接键入文字；AI 会在信息模糊时发起追问。
                      </p>
                    </div>

                    <div className="controls">
                      <div className="action-btns">
                        <button id="prev-btn" className="secondary-btn" onClick={handlePrev} disabled={currentIndex === 0 || isLoadingNext}>
                          上一题
                        </button>
                        <button id="next-btn" className="primary-btn" onClick={handleNext} disabled={isLoadingNext}>
                          {isLoadingNext ? 'AI 分析中...' : '提交本题 / 下一步'}
                        </button>
                        {isFollowUp && (
                          <button className="ghost-btn" onClick={handleSkipFollowUp} disabled={isLoadingNext}>
                            跳过追问，继续主线
                          </button>
                        )}
                      </div>
                    </div>

                    <div id="status-msg" className="status-msg">
                      {status || '请直接输入本题答案，或使用输入法语音输入'}
                    </div>
                  </div>
                </div>
              </section>
            )}

        {view === 'result' && (
          <section className="view">
            <div className="result-container">
              <h2>生成结果</h2>
              <div className="tabs">
                {RESULT_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                    data-target={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="tab-content">
                <div id="result-text" className={`result-box ${isLoadingResult ? 'loading' : ''}`}>
                  {errorMessage ? (
                    <div className="error-container">
                      <p>⚠️ 生成失败</p>
                      <small>{errorMessage}</small>
                      <button onClick={handleGenerate} className="secondary-btn" style={{ marginTop: '1rem' }}>
                        重试生成
                      </button>
                    </div>
                  ) : isLoadingResult ? (
                    <div className="loading-state">
                      <div className="spinner" />
                      <p>
                        AI 正在全力抽取精华并撰写稿件...
                        <br />
                        <small>大概需要 10-30 秒，请勿关闭页面</small>
                      </p>
                    </div>
                  ) : (
                    resultContent || '内容生成中...'
                  )}
                </div>
              </div>
              <div className="result-actions">
                <button id="copy-btn" className="primary-btn" onClick={handleCopy} disabled={!resultContent}>
                  复制内容
                </button>
                <button id="download-btn" className="secondary-btn" onClick={handleDownload} disabled={!resultContent}>
                  下载 Markdown
                </button>
                <button id="reset-btn" className="danger-btn" onClick={handleReset}>
                  清除并重置
                </button>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
