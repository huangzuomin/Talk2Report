import { AudioRecorder } from './recorder.js';
import * as api from './api.js';

// --- 1. 状态与配置 ---
const recorder = new AudioRecorder();
const SESSION_ID = 's_' + Math.random().toString(36).substr(2, 9);
const QUESTIONS = [
    "Q1：过去这一年，你最想分享哪三个关键成果？",
    "Q2：在实现这些成果的过程中，你克服了哪些具体的挑战？",
    "Q3：这些成果对公司或团队产生了怎样的实际价值？",
    "Q4：你在这个过程中运用了哪些核心技能或新学习的知识？",
    "Q5：有没有哪件事让你觉得有遗憾，或者如果重来会做得更好？",
    "Q6：这一年你最大的个人成长点是什么？",
    "Q7：你得到的反馈（来自同事/客户/领导）中最让你深刻的是什么？",
    "Q8：你为团队文化或他人成长做出了哪些贡献？",
    "Q9：面对明年的业务目标，你个人的核心重点在哪里？",
    "Q10：你需要公司或上级提供哪些具体支持来达成明年的目标？",
    "Q11：你对自己下一阶段的职业抱负或转型方向有什么思考？",
    "Q12：最后，用三个关键词来总结你的这一年吧。"
];

let state = {
    view: 'setup', // setup | interview | result
    currentIndex: 0,
    params: {
        audience: 'leader',
        tone: 'plain',
        length: 1200
    },
    answers: {}, // { Q1: { transcript: '', edited: '' } }
    outputs: {}
};

// --- 2. DOM 元素 ---
const views = {
    setup: document.getElementById('setup-view'),
    interview: document.getElementById('interview-view'),
    result: document.getElementById('result-view')
};

const setupInputs = {
    audience: document.getElementById('audience'),
    tone: document.getElementById('tone'),
    length: document.getElementById('length'),
    startBtn: document.getElementById('start-btn')
};

const interviewUI = {
    progress: document.getElementById('progress-fill'),
    index: document.getElementById('question-index'),
    text: document.getElementById('question-text'),
    input: document.getElementById('answer-input'),
    recordBtn: document.getElementById('record-btn'),
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'),
    status: document.getElementById('status-msg')
};

const resultUI = {
    text: document.getElementById('result-text'),
    tabs: document.querySelectorAll('.tab-btn'),
    copyBtn: document.getElementById('copy-btn'),
    downloadBtn: document.getElementById('download-btn'),
    resetBtn: document.getElementById('reset-btn')
};

// --- 3. 初始化 ---
function init() {
    loadFromLocal();
    renderView();

    // 事件绑定
    setupInputs.startBtn.onclick = startInterview;
    interviewUI.prevBtn.onclick = prevQuestion;
    interviewUI.nextBtn.onclick = nextQuestion;

    // 录音逻辑 (Push-to-talk)
    interviewUI.recordBtn.onmousedown = startRecording;
    interviewUI.recordBtn.onmouseup = stopRecording;
    interviewUI.recordBtn.ontouchstart = (e) => { e.preventDefault(); startRecording(); };
    interviewUI.recordBtn.ontouchend = (e) => { e.preventDefault(); stopRecording(); };

    resultUI.tabs.forEach(tab => {
        tab.onclick = () => switchResultTab(tab.dataset.target);
    });

    resultUI.resetBtn.onclick = resetApp;
    resultUI.copyBtn.onclick = copyToClipboard;
    resultUI.downloadBtn.onclick = downloadMarkdown;
}

// --- 4. 逻辑控制 ---
function renderView() {
    Object.keys(views).forEach(v => {
        views[v].classList.toggle('hidden', v !== state.view);
    });

    if (state.view === 'interview') {
        renderQuestion();
    } else if (state.view === 'result') {
        renderResult();
    }
}

function renderQuestion() {
    const qText = QUESTIONS[state.currentIndex];
    interviewUI.index.innerText = `Q${state.currentIndex + 1} / ${QUESTIONS.length}`;
    interviewUI.text.innerText = qText;

    const currentAnswer = state.answers[`Q${state.currentIndex + 1}`] || { transcript: '', edited: '' };
    interviewUI.input.value = currentAnswer.edited || currentAnswer.transcript || '';

    const progress = ((state.currentIndex + 1) / QUESTIONS.length) * 100;
    interviewUI.progress.style.width = `${progress}%`;

    interviewUI.prevBtn.disabled = state.currentIndex === 0;
    interviewUI.nextBtn.innerText = state.currentIndex === QUESTIONS.length - 1 ? '一键生成报告' : '下一题 / 跳过';
}

function startInterview() {
    state.params.audience = setupInputs.audience.value;
    state.params.tone = setupInputs.tone.value;
    state.params.length = setupInputs.length.value;

    state.view = 'interview';
    saveToLocal();
    renderView();
}

function nextQuestion() {
    // 保存当前答案
    saveCurrentAnswer();

    if (state.currentIndex < QUESTIONS.length - 1) {
        state.currentIndex++;
        renderQuestion();
        saveToLocal();
    } else {
        generateReports();
    }
}

function prevQuestion() {
    if (state.currentIndex > 0) {
        saveCurrentAnswer();
        state.currentIndex--;
        renderQuestion();
        saveToLocal();
    }
}

function saveCurrentAnswer() {
    const val = interviewUI.input.value;
    const qId = `Q${state.currentIndex + 1}`;
    if (!state.answers[qId]) state.answers[qId] = { transcript: '', edited: '' };
    state.answers[qId].edited = val;
}

async function startRecording() {
    try {
        interviewUI.recordBtn.classList.add('recording');
        interviewUI.status.innerText = '正在录音...';
        await recorder.start();
    } catch (err) {
        interviewUI.status.innerText = '录音失败，请检查麦克风权限';
        interviewUI.recordBtn.classList.remove('recording');
    }
}

async function stopRecording() {
    interviewUI.recordBtn.classList.remove('recording');
    interviewUI.status.innerText = '转写中...';

    try {
        const { blob } = await recorder.stop();
        const qId = `Q${state.currentIndex + 1}`;
        const result = await api.uploadAudio(blob, SESSION_ID, qId);

        const transcript = result.transcript || result.text;

        if (result && transcript) {
            if (!state.answers[qId]) state.answers[qId] = { transcript: '', edited: '' };
            state.answers[qId].transcript = transcript;
            state.answers[qId].edited = transcript; // 默认填充
            renderQuestion();
            interviewUI.status.innerText = '转写成功';
        } else {
            interviewUI.status.innerText = '转写未返回内容，请检查接口';
            console.warn('STT result missing content:', result);
        }
    } catch (err) {
        interviewUI.status.innerText = '转写失败，请重试';
        console.error(err);
    }
}

async function generateReports() {
    state.view = 'result';
    state.outputs = {}; // 清空旧结果
    renderView();

    try {
        const payload = {
            session_id: SESSION_ID,
            params: state.params,
            answers: Object.fromEntries(
                Object.entries(state.answers).map(([k, v]) => [k, v.edited || v.transcript])
            )
        };

        console.log('Generating report with payload:', payload);
        const result = await api.generateReport(payload);

        if (result && result.outputs) {
            state.outputs = result.outputs;
            renderResult();
        } else {
            throw new Error('Malformed response from generation service');
        }
    } catch (err) {
        console.error('Generation Error:', err);
        resultUI.text.innerHTML = `
            <div class="error-container">
                <p>⚠️ 生成失败</p>
                <small>${err.message || '请检查网络或配置'}</small>
                <button onclick="location.reload()" class="secondary-btn" style="margin-top: 1rem">刷新重试</button>
            </div>
        `;
    }
}

function copyToClipboard() {
    const text = resultUI.text.innerText;
    navigator.clipboard.writeText(text).then(() => {
        alert('内容已复制到剪贴板');
    });
}

function downloadMarkdown() {
    const activeTab = document.querySelector('.tab-btn.active').dataset.target;
    const content = resultUI.text.innerText;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Talk2Report_${activeTab}.md`;
    a.click();
    URL.revokeObjectURL(url);
}

function renderResult() {
    const activeTab = document.querySelector('.tab-btn.active').dataset.target;
    const content = state.outputs[activeTab];

    if (content) {
        resultUI.text.innerText = content;
        resultUI.text.classList.remove('loading');
    } else {
        resultUI.text.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>AI 正在全力抽取精华并撰写稿件...<br><small>大概需要 10-30 秒，请勿关闭页面</small></p>
            </div>
        `;
        resultUI.text.classList.add('loading');
    }
}

function switchResultTab(target) {
    resultUI.tabs.forEach(btn => btn.classList.toggle('active', btn.dataset.target === target));
    renderResult();
}

function resetApp() {
    if (confirm('确定要清除所有数据并重置吗？')) {
        localStorage.removeItem('talk2report_state');
        location.reload();
    }
}

// --- 5. 本地缓存 ---
function saveToLocal() {
    localStorage.setItem('talk2report_state', JSON.stringify(state));
}

function loadFromLocal() {
    const data = localStorage.getItem('talk2report_state');
    if (data) {
        const saved = JSON.parse(data);
        state = { ...state, ...saved };
    }
}

init();
