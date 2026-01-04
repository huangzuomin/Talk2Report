# n8n 工作流调试 - 最终分析报告

**调试时间**: 2026-01-03
**工作流**: Talk2Report - Generate Report v3.0 (Enhanced)
**工作流 ID**: D05OBJW6XTAgOJjo

---

## 📊 调试历程总结

### 已完成的修复

1. ✅ **JSON 格式问题** - jsonBody 对象格式（n8n UI 中正常）
2. ✅ **输入验证分支** - 100% 正常工作
3. ✅ **Set Metadata 节点** - 字段映射修复
4. ✅ **Agent B 错误处理** - 错误响应正常
5. ✅ **DeepSeek API 集成** - 凭证正常，调用成功

### 当前问题

**Agent B 返回空对象 `{}` 而不是提取的数据**

---

## 🔍 深度分析

### n8n jsonBody 存储机制

**重要发现**：
- n8n HTTP Request 节点的 `jsonBody` 在 JSON 文件中以**字符串格式**存储
- 这是**正常行为**，不是错误
- n8n UI 会正确解析和显示这个字符串

**证据**：
```json
"jsonBody": "={\n  \"model\": \"deepseek-chat\",\n  ...\n}"
```

在 n8n UI 中，这会被正确解析为对象。

---

### Agent B 的实际问题

#### 执行 1124（返回 `{}` 的那次）

**时间**: 2026-01-03T06:40:06.819Z
**状态**: success
**耗时**: 896ms
**Agent B 响应**: `{}` (空对象)

**分析**：
- 工作流执行成功（status: success）
- Agent B 调用了 DeepSeek API
- 但返回的是空对象 `{}`

**可能原因**：

1. **数据传递问题**
   - Extract Request Data 节点输出可能仍有问题
   - conversation_history 字段可能是 null 或空数组

2. **Agent B prompt 问题**
   - System prompt 可能不够清晰
   - User message 格式可能不对

3. **DeepSeek API 解析问题**
   - `{{ JSON.stringify($json.conversation_history) }}` 可能被 n8n 错误解析
   - 需要使用不同的表达式语法

---

## 🎯 根本原因推断

基于测试结果，最可能的原因是：

### **n8n 表达式解析问题**

**当前配置**：
```javascript
"content": "{{ JSON.stringify($json.conversation_history) }}"
```

**问题**：
- n8n 可能在运行时无法正确解析 `JSON.stringify()` 函数调用
- 导致发送给 DeepSeek 的数据格式不正确

**解决方案**：

**选项 1**: 使用 n8n 的内置 JSON 序列化
```javascript
"content": "={{ JSON.stringify($json.conversation_history) }}"
```

**选项 2**: 直接传递字段（让 n8n 自动序列化）
```javascript
"content": "={{ $json.conversation_history }}"
```

**选项 3**: 使用 Code 节点预处理数据
```javascript
// 在 Agent B 之前添加一个 Code 节点
return {
  conversation_history: $json.conversation_history
};
```

然后在 Agent B 中：
```javascript
"content": "={{ $json.conversation_history }}"
```

---

## 📝 测试结果汇总

### 测试覆盖的分支

| 分支 | 测试状态 | 结果 |
|------|---------|------|
| 输入验证（缺少字段） | ✅ 已测试 | 正常 |
| Agent B 错误处理 | ✅ 已测试 | 正常 |
| Agent C 并行分支 | ❌ 未触发 | Agent B 返回空 |
| Agent D 验证分支 | ❌ 未触发 | Agent C 未执行 |
| 成功响应分支 | ❌ 未触发 | 主流程未完成 |

**覆盖率**: 33%（2/6 个分支）

---

## 🔧 最终建议

### 立即行动

1. **在 n8n UI 中直接测试 Agent B 节点**
   - 打开 Agent B 节点
   - 查看 "JSON Body" 配置
   - 检查 messages 数组中的 user message
   - 使用 n8n 的表达式测试功能验证 `{{ $json.conversation_history }}`

2. **使用最简单的表达式**
   - 将 user message 改为：`={{ $json.conversation_history }}`
   - 让 n8n 自动处理 JSON 序列化

3. **添加调试节点**
   - 在 Agent B 之前添加一个 Set 节点
   - 输出 conversation_history 的值
   - 手动执行查看数据是否正确

### 长期优化

1. **配置 n8n 执行数据保存**
   ```bash
   EXECUTIONS_DATA_SAVE_ON_SUCCESS=all
   EXECUTIONS_DATA_SAVE_ON_ERROR=all
   ```

2. **添加更详细的错误日志**
   - 在每个关键节点后添加日志
   - 记录数据传递状态

3. **优化 Agent B 的 prompt**
   - 添加更多示例
   - 明确输入数据格式
   - 提供清晰的提取规则

---

## ✅ 已解决的问题

1. ✅ HTTP Request 节点 JSON 格式
2. ✅ 输入验证逻辑
3. ✅ 错误处理机制
4. ✅ DeepSeek API 凭证配置
5. ✅ Respond to Webhook 响应

### ❌ 仍未解决的问题

1. ❌ Agent B 数据提取逻辑
2. ❌ Agent C 并行分支（未触发）
3. ❌ Agent D 验证分支（未触发）
4. ❌ 完整主流程（未完成）

---

## 🎯 结论

**当前状态**: 工作流的基础架构已经正确，但 Agent B 的数据提取逻辑需要进一步调试。

**建议**: 在 n8n UI 中直接调试 Agent B 节点，使用表达式测试功能验证数据传递，然后逐步调整配置。

**下一步**: 聚焦于修复 Agent B 的 user message，使其能正确传递 conversation_history 数据给 DeepSeek API。

---

**报告生成**: 2026-01-03 06:55 UTC
**调试工具**: Claude Code (n8n Automation Protocol)
