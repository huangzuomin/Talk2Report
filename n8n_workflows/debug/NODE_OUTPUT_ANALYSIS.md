# n8n 节点输出数据分析

## 📸 节点 1: Set Metadata

**节点名称**: Set Metadata
**执行状态**: ✅ 成功

### 输出数据结构
```json
{
  "conversation_history": null,
  "preferences": null,
  "extracted_data": null,
  "session_id": "test-rewrite-1767420808064"
}
```

### 字段分析
- **conversation_history**: `null` - 来自 `$json.body.conversation_history`，未设置
- **preferences**: `null` - 来自 `$json.body.preferences`，未设置
- **extracted_data**: `null` - 来自 `$json.body.extracted_data`，未设置
- **session_id**: `"test-rewrite-1767420808064"` - 从当前节点的输入中提取

### ⚠️ 问题发现

**所有业务字段都是 null！**

这说明 Webhook 接收到的请求 body 中**没有 conversation_history、preferences 等字段**。

### 数据流
```
Webhook → Set Metadata
输入: { start_timestamp, session_id }
输出: { conversation_history: null, preferences: null, extracted_data: null, session_id: "..." }
```

---

## 📸 节点 2: Agent B - Extract Factsheet

**节点名称**: Agent B - Extract Factsheet (HTTP Request to DeepSeek)
**执行状态**: ✅ 成功

### 输出数据结构
```json
{
  "id": "clee260e-9b85-43a7-8cbb-bf79637273be",
  "object": "chat.completion",
  "created": 1767428087,
  "model": "deepseek-chat",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "{\"basic_info\":null,\"highlights\":null,\"challenges\":null,\"growth\":null,\"team_contribution\":null,\"future_goals\":null}"
      },
      "logprobs": null,
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 165,
    "completion_tokens": 34,
    "total_tokens": 199,
    "prompt_tokens_details": {
      "cached_tokens": 128
    },
    "prompt_cache_hit_tokens": 128,
    "prompt_cache_miss_tokens": 37
  },
  "system_fingerprint": "fp_eaab8d114b_prod0820_fp8_kvcache"
}
```

### 关键发现

**Agent B 返回全 null 的根本原因找到了！**

看 `choices[0].message.content`:
```json
{"basic_info":null,"highlights":null,"challenges":null,"growth":null,"team_contribution":null,"future_goals":null}
```

**问题**: Agent B 接收到的输入数据是：
```json
{
  "conversation_history": null,
  "preferences": null,
  "extracted_data": null,
  "session_id": "test-rewrite-1767420808064"
}
```

**因为 Set Metadata 节点输出的是全 null（除了 session_id），所以 Agent B 收到的 conversation_history 是 null，自然返回全 null！**

---

## 🎯 根本原因分析

### 问题链条

```
测试请求数据
  ↓
Webhook 接收
  ↓
Set Metadata 节点
  输出: { conversation_history: null, preferences: null, ... }
  ↓
Extract Request Data 节点
  输出: { conversation_history: null, preferences: null, ... }
  ↓
Agent B 节点
  输入: { conversation_history: null, ... }
  输出: { basic_info: null, ... }
```

### 真正的问题

**不是 Agent B 的配置问题，而是 Set Metadata 节点的配置问题！**

Set Metadata 节点尝试从 `$json.body.conversation_history` 提取数据，但实际请求的 body 中可能：
1. 字段名不匹配
2. 数据嵌套层级不对
3. Webhook 接收到的数据格式不对

---

## 🔍 需要检查的内容

### 1. Webhook 节点的实际输出

需要查看 Webhook 节点接收到的原始请求数据格式。

### 2. Set Metadata 节点的字段映射

当前配置：
```javascript
conversation_history: {{ $json.body.conversation_history }}
preferences: {{ $json.body.preferences }}
extracted_data: {{ $json.body.extracted_data }}
```

可能需要改为：
```javascript
conversation_history: {{ $json.conversation_history }}
preferences: {{ $json.preferences }}
extracted_data: {{ $json.extracted_data }}
```

### 3. 测试请求的 body 格式

确认测试脚本发送的数据格式：
```json
{
  "session_id": "...",
  "conversation_history": [...],
  "preferences": {...}
}
```

---

## ✅ 结论

**问题根源**: Set Metadata 节点从错误的路径提取数据（`$json.body.*` 而不是 `$json.*`）

**修复方案**:
1. 修改 Set Metadata 节点的字段映射
2. 或者修改 Extract Request Data 节点的字段映射
3. 确保 Webhook → Set Metadata → Extract Request Data → Agent B 的数据流正确

**下一步**:
1. 查看 Webhook 节点的输出
2. 修复字段映射
3. 重新测试
