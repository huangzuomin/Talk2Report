# Talk2Report 2.0 实施总览

## 🎉 项目状态: Phase 2 完成

Talk2Report 2.0 是一个基于**多智能体协作**的AI驱动年终总结助手。

---

## 📋 快速开始

### 前置要求
- Node.js 18+
- npm 或 yarn
- DeepSeek API Key ([获取](https://platform.deepseek.com/))

### 安装步骤

```bash
# 1. 克隆项目
cd Talk2Report

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local, 添加 DEEPSEEK_API_KEY

# 4. 启动开发服务器
npm run dev

# 5. 访问 http://localhost:5173
```

---

## ✨ 核心特性

### 1. 深度访谈
- 🕵️ **Agent A (Interviewer)**: 使用DeepSeek-R1进行苏格拉底式提问
- 🧠 **思考过程展示**: 可展开查看AI的推理过程
- 💬 **自然对话**: 不像填表,更轻松

### 2. 多智能体协作
```
访谈 → 提取 → 写作 → 审查 → (如需要)重写 → 输出
```

| Agent | 模型 | 职责 |
|-------|------|------|
| 🕵️ Interviewer | DeepSeek-R1 | 深度提问 |
| 🗂️ Archivist | DeepSeek-V3 | 结构化提取 |
| ✍️ Writers (×3) | DeepSeek-V3 | 并行生成3版本 |
| ⚖️ Critic | DeepSeek-R1 | 逻辑审查 |

### 3. 质量闭环
- ⚖️ **逻辑审查**: 验证因果关系,数据支撑
- 📊 **质量评分**: 0-100分, <80分自动重写
- 🔍 **问题定位**: 标记具体的逻辑谬误和缺失证据

### 4. 多版本输出
- 📱 **200字电梯汇报**: 精简有力
- 📄 **正式年度述职**: 800-1500字,金字塔结构
- 💬 **朋友圈文案**: 感性表达,emoji点缀
- 📝 **结构化大纲**: Markdown格式
- 📊 **PPT提纲**: 10页幻灯片

---

## 🏗️ 架构设计

### 技术栈
```
前端: React 18 + Tailwind CSS + Lucide React
BFF层: Vercel Serverless Functions
AI模型: DeepSeek-R1 (推理) + DeepSeek-V3 (生成)
```

### 数据流
```
用户输入
  ↓
BFF Layer (/api/deepseek/*)
  ↓
DeepSeek API
  ├─ deepseek-reasoner (Agent A, D)
  └─ deepseek-chat (Agent B, C)
```

---

## 📁 项目结构

```
Talk2Report/
├── src/
│   ├── components/         # React组件
│   │   ├── ThinkingProcess.jsx    # 思考过程折叠
│   │   ├── MessageBubble.jsx      # 消息气泡
│   │   ├── AgentTerminal.jsx      # Agent终端
│   │   ├── ChatInterface.jsx      # 聊天界面
│   │   ├── InputArea.jsx          # 输入区域
│   │   └── ReportViewer.jsx       # 报告查看器
│   ├── hooks/              # React Hooks
│   │   └── useDeepSeek.js         # 访谈/生成控制器
│   ├── lib/                # 工具库
│   │   └── deepseek-client.js     # DeepSeek客户端
│   ├── App.jsx             # 主应用
│   ├── main.jsx            # 入口
│   ├── index.css           # Tailwind样式
│   └── style.css           # 原有样式(兼容)
├── api/
│   └── deepseek/           # BFF层API
│       ├── chat.js               # 通用DeepSeek代理
│       ├── agent-archivist.js    # Agent B端点
│       ├── agent-writers.js      # Agent C端点
│       └── agent-critic.js       # Agent D端点
├── prompts/
│   └── agents/            # Agent Prompt模板
│       ├── agent_a_interviewer.md
│       ├── agent_b_archivist.md
│       ├── agent_c_writer.md
│       └── agent_d_critic.md
├── .env.example           # 环境变量模板
├── tailwind.config.js     # Tailwind配置
├── postcss.config.js      # PostCSS配置
├── package.json           # 依赖配置
├── PHASE1_COMPLETION_REPORT.md   # Phase 1完成报告
└── PHASE2_COMPLETION_REPORT.md   # Phase 2完成报告
```

---

## 🚀 使用指南

### 1. 配置参数
- **职位**: 可选,帮助AI理解你的角色
- **受众**: 选择主要受众(领导/HR/团队/公开)
- **文风**: 选择报告风格(平实/正式/感性)
- **字数**: 正式稿的字数期望

### 2. 深度访谈
- 像聊天一样回答问题
- AI会根据你的回答进行追问
- 查看AI的思考过程,了解其推理
- 完成10-15轮对话后,可生成报告

### 3. 生成报告
- 自动触发多智能体协作
- Agent Terminal实时显示进度
- 包含提取、写作、审查三个阶段
- 审查未通过会自动重写

### 4. 查看结果
- 5个版本可供选择
- 查看质量评分和审查报告
- 一键复制或下载Markdown

---

## 🔧 开发指南

### 可用脚本
```bash
npm run dev      # 启动开发服务器
npm run build    # 构建生产版本
npm run preview  # 预览生产构建
```

### 环境变量
```bash
# 必需
DEEPSEEK_API_KEY=your_key_here
DEEPSEEK_API_BASE=https://api.deepseek.com

# 可选 (如使用n8n)
N8N_INTERVIEW_URL=
N8N_GENERATE_URL=
N8N_AUTH_TOKEN=
```

### 添加新组件
1. 在 `src/components/` 创建组件文件
2. 使用Tailwind类名进行样式
3. 从 `lucide-react` 导入图标
4. 在 `App.jsx` 中引入和使用

### 修改Agent Prompt
1. 编辑 `prompts/agents/` 中的 `.md` 文件
2. 系统会自动读取最新的Prompt
3. 无需重启开发服务器

---

## 📊 实施进度

```
Phase 1 (核心替换): ████████████████████ 100% ✅
  ✅ 多智能体Prompt系统
  ✅ DeepSeek API集成
  ✅ BFF层代理端点
  ✅ 前端客户端库

Phase 2 (Chat UI):   ████████████████████ 100% ✅
  ✅ Tailwind CSS配置
  ✅ 6个核心组件
  ✅ App.jsx完全重构
  ✅ 响应式布局

Phase 3 (多智能体):  ░░░░░░░░░░░░░░░░░░░░   0%
  ⏳ n8n工作流设计
  ⏳ 访谈循环配置
  ⏳ 质量闭环路由

Phase 4 (质量闭环):  ░░░░░░░░░░░░░░░░░░░░   0%
  ⏳ 完整流程测试
  ⏳ 性能优化
  ⏳ 部署配置

总体进度: ████████░░░░░░░░░░░░░░ 50%
```

---

## 🐛 故障排除

### 样式问题
```bash
# 清除Vite缓存
rm -rf node_modules/.vite

# 重新安装依赖
rm -rf node_modules
npm install
```

### API调用失败
- 检查 `.env.local` 是否配置了API Key
- 确认API Key有效且有余额
- 查看浏览器控制台错误信息

### 组件渲染错误
- 确认所有依赖已安装
- 检查React版本是否为18.3.1
- 查看开发服务器错误日志

---

## 📝 相关文档

- [Phase 1 完成报告](./PHASE1_COMPLETION_REPORT.md)
- [Phase 2 完成报告](./PHASE2_COMPLETION_REPORT.md)
- [项目规格说明书 2.0](./项目规格说明书2.md)
- [原版README](./README.md)

---

## 🎯 下一步

### Phase 3: n8n工作流设计
- [ ] 设计工作流架构图
- [ ] 配置Agent A的访谈循环
- [ ] 配置Agent B/C/D调用链
- [ ] 实现质量闭环回环
- [ ] 创建工作流测试脚本

### Phase 4: 质量闭环测试
- [ ] 端到端流程测试
- [ ] 性能优化
- [ ] 部署到Vercel
- [ ] 生产环境验证

---

## 📄 许可证

本项目遵循原有许可证。

---

**版本**: v2.0-Phase2
**最后更新**: 2026-01-02
**维护者**: Claude Code Assistant
