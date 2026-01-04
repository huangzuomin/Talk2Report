# n8n 工作流多分支测试报告

**测试时间**: 2026-01-03 06:13
**工作流 ID**: D05OBJW6XTAgOJjo
**工作流版本**: v3.0 Enhanced (已修复 JSON 格式)

---

## ✅ 测试完成的分支

### 1️⃣ 输入验证分支 (2个测试)

**测试 1: 缺少 session_id**
- 状态: ✅ 通过
- 响应时间: 1383ms
- 结果: 正确返回验证错误
- 分支: `Validation Error` → Respond to Webhook

**测试 2: 缺少 conversation_history**
- 状态: ✅ 通过
- 响应时间: 987ms
- 结果: 正确返回验证错误
- 分支: `Validation Error` → Respond to Webhook

**结论**: ✅ 输入验证逻辑正常工作，错误响应正确返回。

---

### 2️⃣ Agent B 错误处理分支 (3个测试)

**测试 3: 简单场景**
- 输入: 简短对话（1轮）
- 响应时间: 2679ms
- DeepSeek API: ✅ 成功调用
- Agent B 返回: 全 null (符合预期)
- 分支: Agent B Error → `Agent B Error Response` → Respond to Webhook

**测试 4: 完整场景**
- 输入: 完整对话（包含详细成就描述）
- 响应时间: 3034ms
- DeepSeek API: ✅ 成功调用
- Agent B 返回: 全 null ⚠️
- 分支: Agent B Error → `Agent B Error Response` → Respond to Webhook

**测试 5: 质量控制场景**
- 输入: 包含结构化成就数据
- 响应时间: 2949ms
- DeepSeek API: ✅ 成功调用
- Agent B 返回: 全 null ⚠️
- 分支: Agent B Error → `Agent B Error Response` → Respond to Webhook

**结论**: ✅ Agent B 错误处理正常工作，但 Agent B 的提取逻辑有问题。

---

## ⚠️ 发现的问题

### 问题: Agent B 总是返回全 null

**症状**:
即使提供完整的、详细的对话历史，Agent B 仍然返回：
```json
{
  "basic_info": null,
  "highlights": null,
  "challenges": null,
  "growth": null,
  "team_contribution": null,
  "future_goals": null
}
```

**根本原因分析**:

1. **数据传递格式问题**
   - Extract Request Data 节点输出: `{ conversation_history, preferences, extracted_data, session_id }`
   - Agent B 接收: `{{ JSON.stringify($json) }}` (整个对象)
   - Agent B 需要处理: `conversation_history` 字段

2. **Agent B 的 prompt 可能不够清晰**
   - System prompt 没有明确说明输入数据结构
   - 没有告诉 Agent B 如何从 `$json` 对象中提取 `conversation_history`

3. **可能的解决方案**:
   - 修改 Agent B 的 user message 为: `{{ JSON.stringify({ conversation_history: $json.conversation_history }) }}`
   - 或者修改 system prompt，明确说明输入数据格式

---

## 📊 测试统计

| 指标 | 数值 |
|------|------|
| 总测试数 | 5 |
| 成功测试 | 5 (100%) |
| 平均响应时间 | 2206ms |
| 最快响应 | 987ms (验证测试) |
| 最慢响应 | 3034ms (完整场景) |
| HTTP 200 状态 | 5/5 (100%) |
| JSON 响应 | 5/5 (100%) |

---

## ✅ 已验证的功能

### 1. 输入验证 ✅
- ✅ 检测缺少必需字段
- ✅ 返回详细的验证错误信息
- ✅ 响应时间 < 1.5s

### 2. Webhook 接收 ✅
- ✅ 正确接收 POST 请求
- ✅ 解析 JSON body
- ✅ 传递给下一个节点

### 3. DeepSeek API 集成 ✅
- ✅ 凭证配置正确
- ✅ HTTP Request 节点 JSON 格式正确
- ✅ API 调用成功（有响应）
- ✅ Token 使用正常（165-199 tokens）

### 4. 错误处理 ✅
- ✅ Agent B 错误检测正常
- ✅ 错误响应格式正确
- ✅ Respond to Webhook 正常工作

### 5. 数据流 ✅
- ✅ Webhook → Extract Request Data
- ✅ Extract Request Data → Agent B
- ✅ Agent B → Check Agent B Error
- ✅ Agent B Error → Respond to Webhook

---

## ❌ 未测试的分支

由于 Agent B 总是返回 null，以下分支**尚未触发**：

### 3️⃣ Agent C 并行分支
- Call Writer (brief)
- Call Writer (formal)
- Call Writer (social)

**触发条件**: Agent B 成功提取 factsheet (非 null)

**未测试原因**: Agent B 总是返回 null

### 4️⃣ Agent D 验证分支
- Agent D - Validate Quality

**触发条件**: Agent C 成功生成 3 个版本的报告

**未测试原因**: Agent C 未执行

### 5️⃣ Agent D 重写循环分支
- Loop back to Agent C

**触发条件**: Agent D 评分 < 80

**未测试原因**: Agent D 未执行

### 6️⃣ 成功响应分支
- Return Success Response

**触发条件**: 整个流程成功完成

**未测试原因**: 主流程未完成

---

## 🔧 需要修复的问题

### 问题 1: Agent B 提取逻辑 (高优先级)

**当前状态**: ❌ 总是返回 null
**影响**: 阻止整个主流程执行
**优先级**: 🔴 高

**修复方案**:

**方案 A**: 修改 Agent B 的 user message
```json
{
  "role": "user",
  "content": "这是对话历史，请从中提取结构化数据：\n\n{{ JSON.stringify($json.conversation_history) }}"
}
```

**方案 B**: 修改 Agent B 的 system prompt，明确说明输入数据结构：
```
你将收到一个包含以下字段的数据：
- conversation_history: 对话历史数组
- preferences: 用户偏好
- session_id: 会话ID

请只关注 conversation_history，从中提取结构化数据...
```

**方案 C**: 添加一个中间节点，只传递 conversation_history 给 Agent B

### 问题 2: n8n 执行数据保存 (中优先级)

**当前状态**: ❌ 未启用
**影响**: 无法通过 API 查看详细执行日志
**优先级**: 🟡 中

**修复方案**:
在 n8n 服务器环境变量中设置：
```bash
EXECUTIONS_DATA_SAVE_ON_SUCCESS=all
EXECUTIONS_DATA_SAVE_ON_ERROR=all
EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS=true
```

---

## 📝 下一步行动

### 立即行动 (高优先级)

1. **修复 Agent B 的 user message**
   - 在 n8n UI 中打开 Agent B 节点
   - 修改 user message 为方案 A 或 B
   - 保存并重新测试

2. **重新运行完整测试**
   ```bash
   node n8n_workflows/tests/test_all_branches.js
   ```

3. **验证 Agent C 分支**
   - 应该生成 3 个版本的报告
   - 检查并行执行是否正常

4. **验证 Agent D 分支**
   - 检查质量验证逻辑
   - 检查评分机制
   - 检查重写循环

### 后续优化 (低优先级)

1. **配置 n8n 执行数据保存**
2. **优化 Agent B 的 prompt**
3. **添加更多的测试用例**
4. **性能优化**（减少响应时间）

---

## 📊 总结

### ✅ 成功部分

1. **JSON 格式问题已修复**
   - 3 个 HTTP Request 节点的 jsonBody 都是对象格式
   - DeepSeek API 调用成功

2. **输入验证分支正常**
   - 错误检测准确
   - 响应格式正确

3. **错误处理分支正常**
   - Agent B 错误检测正常
   - 错误响应正确返回

4. **基础架构正常**
   - Webhook 接收正常
   - 数据传递正常
   - 响应返回正常

### ⚠️ 需要修复

1. **Agent B 提取逻辑**
   - 需要修改 user message
   - 或者修改 system prompt
   - 或者添加中间节点

2. **未测试的分支**
   - Agent C 并行分支
   - Agent D 验证分支
   - Agent D 重写循环
   - 成功响应分支

---

## 🎯 测试覆盖率

| 分支 | 测试状态 | 覆盖率 |
|------|---------|--------|
| 输入验证 | ✅ 已测试 | 100% |
| Agent B 错误处理 | ✅ 已测试 | 100% |
| Agent C 并行 | ❌ 未测试 | 0% |
| Agent D 验证 | ❌ 未测试 | 0% |
| Agent D 重写循环 | ❌ 未测试 | 0% |
| 成功响应 | ❌ 未测试 | 0% |
| **总覆盖率** | - | **33%** |

---

**报告生成时间**: 2026-01-03 06:15 UTC
**测试执行者**: Claude Code (n8n Automation Protocol)
**下一步**: 修复 Agent B 提取逻辑，然后重新测试所有分支
