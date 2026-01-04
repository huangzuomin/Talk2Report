# Talk2Report 2.0 项目结构说明

## 📁 目录结构

```
Talk2Report/
├── api/                      # Vercel serverless functions (生产环境)
│   └── deepseek/             # DeepSeek API代理
│
├── docs/                     # 项目文档
│   ├── architecture/         # 架构文档
│   │   └── CLAUDE.md        # 项目指南和开发规范
│   ├── development/         # 开发文档
│   │   ├── PROJECT_STRUCTURE.md  # 本文件
│   │   └── 本地测试指南.md  # 开发环境设置
│   ├── deployment/          # 部署文档
│   │   └── DEPLOYMENT.md   # Vercel部署指南
│   ├── optimization/        # UI/UX优化记录
│   │   ├── SPACE_OPTIMIZATION.md
│   │   ├── PADDING_DENSITY_OPTIMIZATION.md
│   │   └── ...
│   └── legacy/             # 历史文档
│
├── n8n_workflows/           # n8n工作流配置
│   ├── config/             # 工作流JSON配置
│   ├── debug/              # 调试文件
│   └── tests/              # 测试文件
│
├── prompts/                 # AI系统提示词
│   └── agents/             # Agent A/B/C/D的提示词
│
├── schema/                  # 数据模型和JSON Schema
│   └── YearEndSummary.json
│
├── src/                     # 源代码
│   ├── assets/             # 静态资源（未来扩展）
│   │
│   ├── components/         # React组件
│   │   ├── chat/          # 聊天相关组件
│   │   │   ├── ChatInterface.jsx
│   │   │   ├── ChatInterfaceV2.jsx
│   │   │   ├── ChatInterfaceV3.jsx
│   │   │   ├── ChatInterfaceV4.jsx  # 当前使用
│   │   │   ├── InputArea.jsx
│   │   │   ├── MessageBubble.jsx
│   │   │   ├── ThinkingProcess.jsx
│   │   │   └── MobileTabNav.jsx
│   │   │
│   │   ├── common/        # 通用组件
│   │   │   ├── AgentTerminal.jsx
│   │   │   └── MaterialDashboard.jsx
│   │   │
│   │   └── report/        # 报告相关组件
│   │       └── ReportViewer.jsx
│   │
│   ├── config/            # 配置文件
│   │   └── ReportState.js # 访谈状态机配置
│   │
│   ├── hooks/             # 自定义React Hooks
│   │   ├── useDeepSeek.js     # 核心hooks
│   │   └── useInterviewMachine.js  # 状态机hooks
│   │
│   ├── services/          # API服务层
│   │   ├── client.js           # 通用API客户端
│   │   └── deepseek-client.js  # DeepSeek集成
│   │
│   ├── styles/            # 样式文件
│   │   ├── index.css         # Tailwind基础样式
│   │   ├── style.css         # 自定义样式
│   │   └── archival-elegance.css  # 档案雅致美学
│   │
│   ├── utils/             # 工具函数
│   │   └── recorder.js      # 录音功能
│   │
│   ├── App.jsx            # 根组件
│   └── main.jsx           # 应用入口
│
├── tests/                  # 测试文件（待扩展）
│
├── .gitignore             # Git忽略规则
├── package.json           # 项目配置
├── vite.config.js         # Vite配置
├── vercel.json           # Vercel部署配置
└── README.md             # 项目说明
```

## 🎯 组件组织原则

### 按功能分类
- **chat/**: 所有与访谈界面相关的组件
- **report/**: 报告展示和生成相关组件
- **common/**: 跨页面使用的通用组件

### 命名规范
- **组件文件**: PascalCase (如 `ChatInterfaceV4.jsx`)
- **工具文件**: camelCase (如 `deepseek-client.js`)
- **样式文件**: kebab-case (如 `archival-elegance.css`)
- **目录名**: kebab-case 或 camelCase

### 导入路径
```jsx
// 推荐
import { ChatInterfaceV4 } from './components/chat/ChatInterfaceV4';
import { useInterview } from './hooks/useDeepSeek';
import { callAgentA } from './services/deepseek-client';

// 避免
import { Something } from '../../../components/...';
```

## 📦 模块职责

### services/ - API服务层
负责所有外部API调用：
- `client.js`: 通用HTTP客户端
- `deepseek-client.js`: DeepSeek API集成，包含Agent编排逻辑

### hooks/ - 自定义Hooks
封装React状态逻辑：
- `useDeepSeek.js`: 提供访谈和报告生成的hooks
- `useInterviewMachine.js`: 基于状态机的结构化访谈

### config/ - 配置文件
应用级配置：
- `ReportState.js`: 访谈槽位定义和完成度计算

### components/ - UI组件
按功能划分子目录，便于维护和查找。

## 🔄 当前使用的版本

- **访谈界面**: `ChatInterfaceV4.jsx` (档案雅致美学)
- **状态管理**: `useInterviewMachine.js` (槽位驱动)
- **样式系统**: `archival-elegance.css` (烫金+纹理)

## 📝 扩展指南

### 添加新组件
1. 确定组件类型（chat/report/common）
2. 在对应目录创建文件
3. 使用PascalCase命名
4. 添加JSDoc注释说明用途

### 添加新服务
1. 在`services/`目录创建文件
2. 导出函数或类
3. 在hooks中调用

### 添加新Hook
1. 在`hooks/`目录创建文件
2. 使用`use`前缀命名
3. 提供清晰的TS类型注释（如使用TypeScript）

## 🚀 开发工作流

1. 功能开发 → `src/` 对应目录
2. 文档编写 → `docs/` 对应子目录
3. 优化记录 → `docs/optimization/`
4. 测试文件 → `tests/`

保持目录结构清晰，便于团队协作！
