# n8n 多智能体工作流架构设计

## 概述

本文档描述 Talk2Report 2.0 的 n8n 多智能体工作流架构，实现从访谈到报告生成的完整自动化流程。

## 工作流架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                         n8n Workflow Layer                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐      ┌──────────────────┐                        │
│  │   Webhook    │─────▶│  Agent A         │                        │
│  │  /interview  │      │  (Interviewer)   │◀─────┐                 │
│  └──────────────┘      └──────────────────┘      │                 │
│                                │                 │                 │
│                                ▼                 │ 循环             │
│                         ┌──────────────┐         │                 │
│                         │  Slot State  │─────────┘                 │
│                         │  Machine     │                           │
│                         └──────────────┘                            │
│                                │                                    │
│                                ▼                                    │
│  ┌──────────────┐      ┌──────────────────┐                        │
│  │   Webhook    │─────▶│  Agent B         │                        │
│  │  /generate   │      │  (Archivist)     │                        │
│  └──────────────┘      └──────────────────┘                        │
│                                │                                    │
│                                ▼                                    │
│                         ┌──────────────────┐                        │
│                         │  Agent C         │                        │
│                         │  (Writers x3)    │                        │
│                         │  ┌────────────┐  │                        │
│                         │  │ Writer 1   │  │                        │
│                         │  ├────────────┤  │                        │
│                         │  │ Writer 2   │  │                        │
│                         │  ├────────────┤  │                        │
│                         │  │ Writer 3   │  │                        │
│                         │  └────────────┘  │                        │
│                         └──────────────────┘                        │
│                                │                                    │
│                                ▼                                    │
│                         ┌──────────────────┐                        │
│                         │  Agent D         │─────┐                 │
│                         │  (Critic)        │     │ 质量不合格       │
│                         └──────────────────┘     │ 回到 Agent C     │
│                                │                 │                 │
│                                ▼                 │                 │
│                         ┌──────────────┐        │                 │
│                         │   Response   │────────┘                 │
│                         └──────────────┘                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## 工作流清单

### 1. Interview Workflow (访谈工作流)

**Webhook**: `/webhook/interview/next_step`

**流程**:
1. 接收客户端请求: `{ session_id, user_answer, current_state }`
2. 加载会话状态 (从 n8n 内存或外部存储)
3. **Agent A (Interviewer)** 执行:
   - 提取关键信息 (使用 Agent B 的能力)
   - 更新 Slot 状态
   - 决定下一个问题
4. 调用 DeepSeek Reasoner API
5. 流式返回 AI 思考过程和问题
6. 更新会话状态
7. 返回: `{ question, thinking, completion_rate, filled_slots }`

### 2. Generate Workflow (生成工作流)

**Webhook**: `/webhook/generate`

**流程**:
1. 接收客户端请求: `{ conversation_history, preferences }`
2. **Agent B (Archivist)** 执行:
   - 分析对话历史
   - 提取结构化数据 (YearEndSummary schema)
   - 验证数据完整性
3. **Agent C (Writers)** 并行执行:
   - Writer 1: 200字电梯汇报版
   - Writer 2: 正式述职版 (800-1500字)
   - Writer 3: 朋友圈文案版
4. **Agent D (Critic)** 执行:
   - 验证逻辑一致性
   - 评分 (0-100)
   - 如果分数 < 80，触发重写循环
5. 返回最终报告: `{ versions, quality_score, verdict }`

## Agent 详细设计

### Agent A: Interviewer (访谈智能体)

**模型**: DeepSeek Reasoner

**职责**:
- 通过苏格拉底式提问收集信息
- 维护对话上下文
- 实时提取和更新结构化数据
- 决定下一个问题或结束访谈

**输入**:
```json
{
  "conversation_history": [
    { "role": "system", "content": "system prompt" },
    { "role": "assistant", "content": "上一问题" },
    { "role": "user", "content": "用户回答" }
  ],
  "current_state": {
    "slots": [
      { "name": "achievements", "value": null, "filled": false },
      { "name": "challenges", "value": null, "filled": false }
    ],
    "completion_rate": 0.15
  }
}
```

**输出**:
```json
{
  "question": "下一个问题",
  "thinking": "AI思考过程",
  "extracted_info": {
    "achievements": ["完成X项目"],
    "challenges": ["克服Y困难"]
  },
  "updated_state": {
    "slots": [...],
    "completion_rate": 0.30
  },
  "finished": false
}
```

**n8n 节点配置**:
```
[Webhook] → [Load Session] → [Agent A: Extract] → [Agent A: Decide] → [DeepSeek API] → [Update State] → [Response]
                                      ↓                                      ↑
                                 [Slot Machine] ────────────────────────────┘
```

### Agent B: Archivist (档案管理员)

**模型**: DeepSeek Chat

**职责**:
- 从对话历史中提取结构化数据
- 映射到 YearEndSummary schema
- 验证数据完整性
- 填充缺失槽位 (仅提取明确提及的信息)

**输入**:
```json
{
  "conversation_history": [...],
  "user_profile": {
    "role": "前端工程师",
    "department": "技术部"
  }
}
```

**输出**:
```json
{
  "factsheet": {
    "basic_info": {
      "year": 2025,
      "role": "前端工程师",
      "department": "技术部"
    },
    "highlights": [
      {
        "title": "完成性能优化项目",
        "actions": ["分析性能瓶颈", "实施代码分割"],
        "results": ["加载速度提升50%"],
        "metrics": { "performance": "+50%" }
      }
    ],
    "challenges": [...],
    "growth": [...],
    "team_contribution": [...],
    "future_goals": [...]
  },
  "completeness": 0.85,
  "missing_sections": ["team_contribution"]
}
```

**n8n 节点配置**:
```
[Webhook] → [Validate Input] → [Agent B: Extract] → [Validate Output] → [Pass to Agent C]
```

### Agent C: Writers (写作智能体 - 并行)

**模型**: DeepSeek Chat

**职责**:
- 基于结构化数据和用户偏好生成报告
- 并行生成3个版本
- 支持重写循环

**输入**:
```json
{
  "factsheet": { ... },
  "preferences": {
    "audience": "leader",
    "tone": "formal",
    "length_main_chars": 1200
  },
  "rewrite_context": null  // 首次生成为 null，重写时包含 Critic 反馈
}
```

**输出**:
```json
{
  "versions": [
    {
      "type": "brief",
      "content": "200字...",
      "word_count": 198
    },
    {
      "type": "formal",
      "content": "正式述职报告...",
      "word_count": 1250
    },
    {
      "type": "social",
      "content": "🎉 年终总结...",
      "word_count": 350
    }
  ]
}
```

**n8n 节点配置** (并行执行):
```
                                    ┌─> [Writer 1: Brief] ─┐
                                    │                       │
[Agent B Output] ──> [Split] ──────┼─> [Writer 2: Formal] ─┼──> [Merge] ──> [Agent D]
                                    │                       │
                                    └─> [Writer 3: Social] ┘
```

### Agent D: Critic (评论家)

**模型**: DeepSeek Reasoner

**职责**:
- 验证逻辑一致性
- 检查因果关系和证据支撑
- 给出质量评分
- 决定是否需要重写

**输入**:
```json
{
  "factsheet": { ... },
  "drafts": [
    { "type": "brief", "content": "..." },
    { "type": "formal", "content": "..." },
    { "type": "social", "content": "..." }
  ]
}
```

**输出**:
```json
{
  "passed": true,
  "score": 87,
  "verdict": "报告质量良好，逻辑清晰，数据支撑充分",
  "issues": [],
  "rewrite_needed": false
}
```

**n8n 节点配置**:
```
[Agent C Output] → [Agent D: Validate] → [Score Check] ──< score < 80 >──┐
       │                                                                  │
       ▼                                                                  │
[Return to Client] ◄─────────────────────────────────────────────────────┘
       │
       └──> [Save Result]
```

## 质量闭环机制

### 重写循环逻辑

```javascript
// n8n Function Node
let maxIterations = 3;
let currentIteration = 0;
let rewriteNeeded = true;
let finalDrafts = null;

while (rewriteNeeded && currentIteration < maxIterations) {
  currentIteration++;

  // 调用 Agent C 生成草稿
  drafts = await callAgentC({
    factsheet,
    preferences,
    rewrite_context: currentIteration > 1 ? lastCriticFeedback : null
  });

  // 调用 Agent D 验证
  critic = await callAgentD({
    factsheet,
    drafts
  });

  if (critic.score >= 80 && !critic.rewrite_needed) {
    rewriteNeeded = false;
    finalDrafts = drafts;
  } else {
    // 保存反馈用于下一轮重写
    lastCriticFeedback = {
      verdict: critic.verdict,
      issues: critic.issues,
      suggestions: critic.suggestions
    };
  }
}

if (currentIteration >= maxIterations && rewriteNeeded) {
  // 达到最大迭代次数，返回最后一次结果
  finalDrafts = drafts;
}
```

## n8n 工作流文件结构

```
n8n_workflows/
├── interview_workflow.json          # Agent A 访谈工作流
├── generate_workflow.json            # Agent B+C+D 生成工作流
├── subworkflows/
│   ├── agent_a_interviewer.json     # Agent A 子工作流
│   ├── agent_b_archivist.json       # Agent B 子工作流
│   ├── agent_c_writers.json         # Agent C 子工作流
│   ├── agent_d_critic.json          # Agent D 子工作流
│   └── quality_loop.json            # 质量闭环子工作流
└── tests/
    ├── test_interview.json          # 访谈工作流测试数据
    └── test_generate.json           # 生成工作流测试数据
```

## 环境变量配置

在 n8n 中设置 Credentials:

```javascript
// DeepSeek API Credential
{
  "name": "DeepSeek API",
  "type": "httpHeaderAuth",
  "data": {
    "name": "Authorization",
    "value": "Bearer sk-xxx"
  }
}

// DeepSeek API Base URL (Workflow Variable)
DEEPSEEK_API_BASE = "https://api.deepseek.com"
```

## 性能优化

### 1. 并行执行
- Agent C 的 3 个 Writer 使用 n8n 的 Split In Batches 节点并行执行
- 预计生成时间: ~15-30秒 (vs 串行的 45-90秒)

### 2. 流式响应
- Agent A 使用 SSE 流式返回思考过程
- 使用 n8n 的 Webhook response mode: "responseNode"

### 3. 状态缓存
- 访谈会话状态存储在 n8n 内存中
- 生产环境建议使用 Redis 或外部存储

## 监控和调试

### n8n 内置监控
- 每个节点的执行时间
- API 调用成功率
- 错误日志

### 自定义日志
```javascript
// 在 Function 节点中添加
console.log(`[Agent A] Interview round: ${round}, Completion: ${completion_rate}`);
console.log(`[Agent C] Generated 3 versions in ${duration}ms`);
console.log(`[Agent D] Quality score: ${score}, Rewrite needed: ${rewrite_needed}`);
```

## 安全考虑

1. **API 密钥保护**: 使用 n8n Credentials，不要硬编码
2. **输入验证**: 在 Webhook 节点后添加验证逻辑
3. **速率限制**: 使用 n8n 的限流功能防止滥用
4. **数据清理**: 不存储敏感个人信息

## 下一步

1. 创建 n8n 工作流 JSON 文件
2. 配置 DeepSeek API credentials
3. 测试各个 Agent 的独立功能
4. 测试完整流程端到端
5. 性能基准测试
6. 部署到生产环境
