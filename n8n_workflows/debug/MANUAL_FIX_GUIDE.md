# 工作流修复指南 - 手动修复步骤

## 🐛 问题诊断

**错误信息**: "JSON parameter needs to be valid JSON"

**根本原因**:
3 个 HTTP Request 节点的 `jsonBody` 参数配置为**表达式字符串**（以 `=` 开头），而不是**JSON 对象**，导致 n8n 无法正确解析。

**影响的节点**:
1. Agent B - Extract Factsheet
2. Call Writer
3. Agent D - Validate Quality

---

## 🔧 手动修复步骤

### 方法 1: 在 n8n UI 中修复（推荐）

#### 修复 Agent B 节点

1. **打开工作流编辑器**
   ```
   http://192.168.50.224:30109/workflow/D05OBJW6XTAgOJjo
   ```

2. **选择 "Agent B - Extract Factsheet" 节点**
   - 点击节点以选中
   - 右侧会显示节点参数

3. **找到 JSON Body 配置**
   - 在参数面板中找到 "Body" 部分
   - 找到 "JSON" 编辑框

4. **当前配置** (错误):
   ```json
   ={
     "model": "deepseek-chat",
     "temperature": 0.0,
     "response_format": {
       "type": "json_object"
     },
     "messages": [
       {
         "role": "system",
         "content": "你是一个专业的归档员..."
       },
       {
         "role": "user",
         "content": "{{ JSON.stringify($json) }}"
       }
     ]
   }
   ```
   注意：开头有 `=` 符号

5. **修复步骤**:
   - **删除开头的 `=` 符号**
   - 确保其余内容是有效的 JSON 格式
   - 保存节点

6. **修复后的配置** (正确):
   ```json
   {
     "model": "deepseek-chat",
     "temperature": 0.0,
     "response_format": {
       "type": "json_object"
     },
     "messages": [
       {
         "role": "system",
         "content": "你是一个专业的归档员..."
       },
       {
         "role": "user",
         "content": "{{ JSON.stringify($json) }}"
       }
     ]
   }
   ```

#### 修复 Call Writer 节点

1. **选择 "Call Writer" 节点**
2. **找到 JSON Body 配置**
3. **删除开头的 `=` 符号**

**当前配置** (错误):
```json
={
  "model": "deepseek-chat",
  "temperature": 0.7,
  "messages": [...]
}
```

**修复后的配置** (正确):
```json
{
  "model": "deepseek-chat",
  "temperature": 0.7,
  "messages": [...]
}
```

#### 修复 Agent D 节点

1. **选择 "Agent D - Validate Quality" 节点**
2. **找到 JSON Body 配置**
3. **删除开头的 `=` 符号**

**当前配置** (错误):
```json
={
  "model": "deepseek-chat",
  "temperature": 0.0,
  "response_format": {...},
  "messages": [...]
}
```

**修复后的配置** (正确):
```json
{
  "model": "deepseek-chat",
  "temperature": 0.0,
  "response_format": {...},
  "messages": [...]
}
```

#### 保存并测试

1. **点击工作流编辑器右上角的 "Save" 按钮**
2. **确认工作流仍然处于激活状态**
3. **运行测试**:
   ```bash
   node n8n_workflows/tests/debug_request.js
   ```

---

### 方法 2: 重新导入工作流（备选）

如果方法 1 不起作用，可以重新导入修复后的工作流文件：

1. **下载修复后的工作流**
   - 文件位置: `n8n_workflows/debug/fixed_workflow.json`
   - 该文件中的 jsonBody 已经是对象格式

2. **在 n8n 中导入**
   - 访问: `http://192.168.50.224:30109/workflows`
   - 点击 "Import from File"
   - 选择 `fixed_workflow.json`
   - 点击 "Import"

3. **激活工作流**
   - 打开导入的工作流
   - 点击右上角的 "Active" 开关

4. **测试**
   ```bash
   node n8n_workflows/tests/debug_request.js
   ```

---

## 🧪 验证修复

### 运行测试脚本

```bash
# 测试 webhook
node n8n_workflows/tests/debug_request.js

# 检查执行日志
node n8n_workflows/tests/check_new_execs.js
```

### 预期结果

**修复前**:
```
Response Status: 200 OK
Response Length: 0 字符
Execution Status: error
```

**修复后**:
```
Response Status: 200 OK
Response Length: > 0 字符
Execution Status: success
```

---

## 📝 技术说明

### 为什么会出现这个问题？

在 n8n HTTP Request 节点中，当 `specifyBody` 设置为 `"json"` 时：

- **正确配置**: `jsonBody` 应该是一个 **JSON 对象**
- **错误配置**: `jsonBody` 是一个以 `=` 开头的字符串

当 `jsonBody` 是字符串时，n8n 会尝试：
1. 移除 `=` 前缀（表达式语法）
2. 解析剩余的字符串为 JSON
3. 如果解析失败，就会报错 "JSON parameter needs to be valid JSON"

### 为什么我们的 API 修复失败？

n8n 的 PUT API 似乎对工作流 JSON 有严格的 schema 验证。虽然我们只修改了 jsonBody 的类型（从 string 到 object），但 API 仍然拒绝更新，错误信息是 "must NOT have additional properties"。

这可能是因为：
1. n8n API 期望 jsonBody 保持字符串格式
2. 或者需要使用 PATCH 而不是 PUT
3. 或者需要特定的 API 参数来控制字段验证

因此，**在 n8n UI 中手动修复是最可靠的方法**。

---

## ✅ 检查清单

修复完成后，请确认：

- [ ] Agent B 节点的 JSON Body 没有 `=` 前缀
- [ ] Call Writer 节点的 JSON Body 没有 `=` 前缀
- [ ] Agent D 节点的 JSON Body 没有 `=` 前缀
- [ ] 工作流已保存
- [ ] 工作流处于激活状态
- [ ] 测试脚本运行成功
- [ ] 返回非空响应

---

## 🆘 如果修复后仍有问题

1. **检查 n8n 执行日志**
   - 在 n8n UI 中打开工作流
   - 点击 "Executions" 标签
   - 查看最新的执行记录
   - 点击失败的节点查看详细错误

2. **检查 DeepSeek API 凭证**
   - 访问: `http://192.168.50.224:30109/credentials`
   - 确认 "DeepSeek account" 凭证存在
   - 测试连接是否成功

3. **联系 AI 助手**
   - 提供执行日志截图
   - 提供测试脚本输出
   - 描述具体的错误信息

---

## 📁 相关文件

- `n8n_workflows/debug/current_workflow.json` - 当前工作流（有问题的版本）
- `n8n_workflows/debug/fixed_workflow.json` - 修复后的工作流（jsonBody 是对象）
- `n8n_workflows/debug/DIAGNOSIS_REPORT.md` - 完整诊断报告
- `n8n_workflows/tests/debug_request.js` - 测试脚本
- `n8n_workflows/tests/check_new_execs.js` - 执行日志检查脚本
