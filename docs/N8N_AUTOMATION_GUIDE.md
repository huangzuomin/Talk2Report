# n8n 自动化协议 - 快速参考

## 📋 核心原则

让 Claude Code 自动调试/更新 n8n 工作流的 **5 大核心原则**:

1. **Read-Modify-Write Pattern**: 始终先读取现有工作流再修改
2. **Minimal Changes**: 只做必要的最小修改
3. **Schema Compliance**: 不添加 schema 外的字段
4. **Verification Required**: 每次修改后必须验证
5. **Idempotency**: 操作可重复执行无副作用

## 🔄 标准工作流程（5 步法）

### 1️⃣ READ - 读取当前状态
```javascript
const workflow = await fetch(`${N8N_API_BASE}/workflows/${id}`, {
  headers: { 'X-N8N-API-KEY': N8N_API_KEY }
}).then(r => r.json());
```

### 2️⃣ ANALYZE - 分析结构
```javascript
const analysis = {
  nodeCount: workflow.nodes.length,
  nodes: workflow.nodes.map(n => ({ name: n.name, type: n.type })),
  connections: workflow.connections
};
```

### 3️⃣ MODIFY - 最小化修改
```javascript
// ✅ 正确：保留所有字段，只修改需要的部分
const updated = {
  ...workflow,  // 保留所有原有数据
  nodes: workflow.nodes.map(n =>
    n.name === 'Target Node'
      ? { ...n, parameters: { ...n.parameters, fix: 'value' } }
      : n
  )
};
```

### 4️⃣ UPDATE - 通过 PUT API 更新
```javascript
await fetch(`${N8N_API_BASE}/workflows/${id}`, {
  method: 'PUT',
  headers: { 'X-N8N-API-KEY': N8N_API_KEY },
  body: JSON.stringify(updated)
});
```

### 5️⃣ VERIFY - 验证更改（必须）
```javascript
// a. 触发测试执行
// b. 检查执行日志
// c. 验证响应数据
```

## ✅ 正确做法 vs ❌ 错误做法

### ✅ 正确模式

```javascript
// 1. 总是先读取
const workflow = await getWorkflow(id);

// 2. 保留所有字段
const updated = { ...workflow, nodes: modifiedNodes };

// 3. 验证节点存在
if (!workflow.nodes.some(n => n.name === 'Target')) {
  throw new Error('Node not found');
}

// 4. 修改后测试
await updateWorkflow(updated);
await verifyWorkflow(id);
```

### ❌ 错误模式

```javascript
// 1. ❌ 不读取就创建
const newWorkflow = { name: '...', nodes: [...] };

// 2. ❌ 添加任意字段
workflow.myCustomField = 'value';

// 3. ❌ 删除元数据
delete workflow.id;

// 4. ❌ 假设节点存在
connections['A'] = [[{ node: 'B' }]];  // B 可能不存在

// 5. ❌ 跳过验证
await updateWorkflow(workflow);  // 缺少测试检查
```

## 🔧 常见调试场景

### 场景 1: 修复连接中的节点名称
```javascript
// 列出所有节点
const nodeNames = workflow.nodes.map(n => n.name);

// 修复连接
workflow.connections['Node A'].main[0][0].node = 'Correct Name';
```

### 场景 2: 更新 Webhook 路径
```javascript
const webhook = workflow.nodes.find(n => n.type === 'n8n-nodes-base.webhook');
webhook.parameters.path = 'new-path';
```

### 场景 3: 添加错误处理节点
```javascript
// 创建节点
const errorHandler = {
  name: 'Handle Errors',
  type: 'n8n-nodes-base.respondToWebhook',
  position: [800, 300],
  parameters: { respondWith: 'json', responseBody: '...' }
};

// 添加到工作流
workflow.nodes.push(errorHandler);

// 连接错误输出
workflow.connections['Some Node'].main[1] = [[{
  node: 'Handle Errors',
  type: 'main'
}]];
```

## 🧪 测试命令

```bash
# 测试 webhook
node n8n_workflows/tests/debug_request.js

# 检查执行日志
node n8n_workflows/tests/check_new_execs.js

# 测试 DeepSeek API
node n8n_workflows/tests/test_deepseek_api.js

# 验证工作流结构
node n8n_workflows/tests/fix_active_workflow.js
```

## 🚨 错误恢复

| HTTP 状态 | 原因 | 解决方案 |
|-----------|------|---------|
| 422 | Schema 验证失败 | 检查额外字段，确保所有必填字段存在 |
| 404 | 工作流不存在 | 验证工作流 ID，检查是否被删除 |
| 401 | API 密钥无效 | 检查 `N8N_API_KEY` 配置 |
| 执行失败 | 节点错误 | 获取执行详情，找到失败节点，修复参数 |

## 📚 必备文档

在 `CLAUDE.md` 中完整定义了：

1. **n8n Control Contract**: API 端点、认证、安全红线
2. **n8n Workflow Automation Protocol**: 完整的自动化流程
3. **Common Debugging Scenarios**: 3 种常见场景的解决方案
4. **Error Recovery**: 4 种错误类型的恢复步骤
5. **Testing Commands**: 所有可用的测试脚本

## 🎯 使用建议

### 给开发者的建议

1. **在 CLAUDE.md 中定义规则**
   - 提供完整的 API 文档链接
   - 包含工作流 JSON 示例
   - 明确操作协议和约束

2. **提供测试脚本**
   - webhook 测试脚本
   - 执行日志检查脚本
   - API 连接测试脚本

3. **设置安全红线**
   - 明确禁止的操作
   - 定义"明确指令"的标准
   - 要求用户确认敏感操作

### 给 AI 的建议

1. **遵循 5 步法**
   - READ → ANALYZE → MODIFY → UPDATE → VERIFY
   - 不可跳过任何步骤

2. **最小化原则**
   - 基于现有 JSON 做最小修改
   - 不凭空创建新工作流

3. **验证驱动**
   - 每次修改后必须验证
   - 失败后分析和重试（最多 3 次）
   - 失败 3 次后中止并报告用户

## 📖 相关资源

- **n8n 官方文档**: https://docs.n8n.io
- **n8n MCP Server**: https://docs.n8n.io/advanced-ai/accessing-n8n-mcp-server
- **REST API 参考**: https://docs.n8n.io/api/rest/
- **工作流自动化协议**: 见 `CLAUDE.md` 第 10 节

## 🔗 项目文件

| 文件 | 用途 |
|------|------|
| `CLAUDE.md` | 完整的 AI 指导文档（包含 n8n 自动化协议） |
| `n8n_workflows/generate_workflow_v3_enhanced.json` | 增强版工作流示例 |
| `n8n_workflows/TESTING_SUMMARY.md` | 测试总结报告 |
| `n8n_workflows/tests/*.js` | 各种测试脚本 |
