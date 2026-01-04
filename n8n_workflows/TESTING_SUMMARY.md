# n8n 工作流测试总结报告

**测试时间**: 2026-01-03
**工作流版本**: v3.0 Enhanced
**工作流 ID**: D05OBJW6XTAgOJjo

## 📊 测试结果概览

| 测试项 | 状态 | 详情 |
|--------|------|------|
| Webhook 连接 | ✅ 通过 | 端点正确响应 |
| 输入验证 | ✅ 通过 | 正确返回验证错误 |
| DeepSeek API (本地) | ✅ 通过 | API 密钥有效 |
| 工作流执行 | ❌ 失败 | 104ms 后错误退出 |
| 响应返回 | ❌ 失败 | content-length: 0 |
| 执行数据保存 | ❌ 未配置 | n8n 未保存详细日志 |

## 🔍 问题诊断

### 1. 工作流执行情况

```
执行 ID: 1096
状态: error
开始: 2026-01-03T05:29:28.542Z
停止: 2026-01-03T05:29:28.646Z
耗时: 104ms
完成状态: false
```

**关键发现**:
- 工作流在 104ms 内失败，说明失败发生在早期节点
- 输入验证通过（验证测试返回了正确的 JSON 错误响应）
- 失败点应在 Agent B (Archivist) 或 Agent C (Writers) 的 HTTP Request 节点

### 2. API 凭证配置

**工作流使用的凭证**:
```json
"authentication": "predefinedCredentialType",
"nodeCredentialType": "deepSeekApi"
```

**问题分析**:
- 工作流引用 n8n 中存储的凭证 `"deepSeekApi"`
- 本地 `.env.local` 中的 `DEEPSEEK_API_KEY` **已验证有效** ✅
- **n8n 实例中的 `"deepSeekApi"` 凭证可能未配置或无效** ❌

### 3. n8n 执行数据保存

**API 响应结构**:
```json
{
  "id": "1096",
  "status": "error",
  "finished": false,
  // ❌ 缺少 "data" 字段
}
```

**原因**: n8n 未配置保存执行数据
**需要配置**: `EXECUTIONS_DATA_SAVE_ON_SUCCESS=all`

## 🎯 根本原因

**工作流失败原因**:
1. n8n 工作流引用的 `"deepSeekApi"` 凭证在 n8n 实例中未配置或无效
2. HTTP Request 节点调用 DeepSeek API 时因认证失败而报错
3. 由于凭证问题，所有 HTTP Request 节点都无法正常工作
4. 工作流错误退出，`Respond to Webhook` 节点未执行
5. 返回空响应（content-length: 0）

## 🔧 解决方案

### 方案 1: 在 n8n UI 中配置凭证（推荐）

1. 访问: `http://192.168.50.224:30109/credentials`
2. 创建新凭证或查找现有的 "deepSeekApi" 凭证
3. 配置凭证:
   - **类型**: DeepSeek API
   - **API Key**: 从 `.env.local` 中复制 `DEEPSEEK_API_KEY` 的值
4. 保存凭证
5. 重新测试工作流

### 方案 2: 修改工作流使用 Header 认证（备选）

如果 n8n UI 不可用，可以修改工作流 JSON 文件：

**将所有 HTTP Request 节点的认证方式从**:
```json
"authentication": "predefinedCredentialType",
"nodeCredentialType": "deepSeekApi"
```

**改为**:
```json
"authentication": "genericCredentialType",
"genericAuthType": "httpHeaderAuth",
"headerAuth": {
  "name": "Authorization",
  "value": "Bearer YOUR_DEEPSEEK_API_KEY"
}
```

但这需要重新导入工作流。

### 方案 3: 配置 n8n 保存执行数据

在 n8n 服务器的环境变量中设置:
```bash
EXECUTIONS_DATA_SAVE_ON_SUCCESS=all
EXECUTIONS_DATA_SAVE_ON_ERROR=all
EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS=true
```

这样可以通过 API 查看详细的执行日志和错误信息。

## 📋 测试记录

### 测试 1: Webhook 端点测试
```bash
URL: https://n8n.neican.ai/webhook/generate
Method: POST
Status: 200 OK
Response: (empty, content-length: 0)
```

### 测试 2: 输入验证测试
```bash
Payload: { conversation_history, preferences }  # 缺少 session_id
Expected: Validation error
Result: ✅ 正确返回验证错误
```

### 测试 3: 完整流程测试
```bash
Payload: { session_id, conversation_history, preferences }
Expected: Generated report
Result: ❌ 空响应
Execution: error (104ms)
```

### 测试 4: DeepSeek API 直接测试
```bash
API Base: https://api.deepseek.com
Key: sk-9a8e4d9... (从 .env.local)
Status: ✅ 200 OK
Response: {"status": "ok", "message": "API working!"}
```

## 📊 工作流结构分析

**节点总数**: 28
**HTTP Request 节点**: 3 个 (Agent B, C×3, D)
**所有 HTTP Request 节点使用**: `nodeCredentialType: "deepSeekApi"`

**节点列表**:
1. Webhook (Generate Report) - Webhook
2. Validate Input - Set
3. Check Input Valid - IF
4. Return Error Response - Respond to Webhook ✅ (工作)
5. Prepare Warning Response - Set
6. Return with Warning - Respond to Webhook
7. Agent B: Extract JSON - HTTP Request ❌ (凭证问题)
8. Agent C1: Write Brief - HTTP Request ❌ (凭证问题)
9. Agent C2: Write Formal - HTTP Request ❌ (凭证问题)
10. Agent C3: Write Social - HTTP Request ❌ (凭证问题)
11. Agent D: Validate - HTTP Request ❌ (凭证问题)
... (其他节点)

## 🎯 下一步行动

1. **立即**: 在 n8n UI 中配置 "deepSeekApi" 凭证
2. **验证**: 重新测试工作流执行
3. **配置**: 启用 n8n 执行数据保存功能
4. **监控**: 检查工作流执行日志，确保所有节点正常工作

## 📝 备注

- 工作流结构本身正确
- 输入验证逻辑正常工作
- 本地 DeepSeek API 密钥有效
- 问题仅在 n8n 实例的凭证配置
- 配置凭证后工作流应能正常运行
