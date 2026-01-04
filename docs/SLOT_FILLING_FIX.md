# 槽位填充功能恢复 - Slot Filling Fix

## 🐛 问题描述

**"细节过载"现象**：
- 用户提供了详细回答（如"外卖算法报道"）
- 但右侧槽位仍显示"正在询问"
- 没有自动提取和填充信息到槽位
- "量化证据"也未同步更新

## 🔍 根本原因

在简化 `useInterviewMachine` 时，移除了 **Extract-Update-Decide 循环**：

❌ **原问题**：
```javascript
// 简化后的代码 - 只有 Ask，没有 Extract 和 Update
const response = await callAgentA([...]); // 生成问题
addMessage('assistant', assistantMessage, ''); // 只添加消息
// 没有提取信息！没有更新槽位！
```

✅ **应该的流程**：
```
用户回答 → Extract (Agent B 提取信息) → Update (更新槽位) → Ask (下一个问题)
```

---

## ✅ 修复方案

### 1. 恢复完整的 Extract-Update-Decide 循环

**文件**：`src/hooks/useInterviewMachine.js`

```javascript
const sendMessage = useCallback(async (userText) => {
  // === Step 1: Extract (从用户回答中提取信息) ===
  const extractedInfo = await extractFromUserMessage(userText, state);
  console.log('[Interview Machine] Extracted:', extractedInfo);

  // === Step 2: Update (更新槽位状态) ===
  let newSlots = [...state.slots];
  if (extractedInfo.updates && extractedInfo.updates.length > 0) {
    newSlots = state.slots.map(slot => {
      const update = extractedInfo.updates.find(u => u.key === slot.key);
      if (update && update.value) {
        console.log(`[Interview Machine] Updating slot ${slot.key}:`, update.value);
        return {
          ...slot,
          value: update.value,
          status: "complete",
          filled: true
        };
      }
      return slot;
    });

    setState(prev => ({ ...prev, slots: newSlots }));
  }

  // === Step 3: Ask (生成下一个问题) ===
  const response = await callAgentA([...]);

  // === Step 4: Update State ===
  // ...
}, [state, messages, addMessage]);
```

### 2. 优化 Agent B 提取逻辑

**关键改进**：
- ✅ **动态槽位列表**：根据当前状态动态生成
- ✅ **槽位验证**：只更新存在的槽位
- ✅ **详细日志**：追踪提取过程
- ✅ **低温度**：temperature: 0.1（确保稳定性）

```javascript
async function extractFromUserMessage(userMessage, state) {
  const systemPrompt = `你是一个数据提取专家。分析用户回答，提取信息填入对应的槽位。

# 槽位列表
${state.slots.map(s => `- ${s.key} (${s.label}): ${s.description}`).join('\n')}

# 用户回答
${userMessage}

# 输出格式
{
  "updates": [
    {"key": "槽位key", "value": "提取的内容"}
  ]
}`;

  // 验证提取的槽位是否存在
  if (result.updates && result.updates.length > 0) {
    result.updates = result.updates.filter(update => {
      const slotExists = state.slots.some(s => s.key === update.key);
      return slotExists; // 过滤掉不存在的槽位
    });
  }

  return result;
}
```

### 3. 添加下一个槽位决策

```javascript
function determineNextSlot(slots) {
  // 优先问必填的空槽位
  const missingRequired = slots.filter(s => s.required && s.value === null);
  if (missingRequired.length > 0) {
    return missingRequired[0].key;
  }

  // 如果必填都完成了，问选填的
  const missingOptional = slots.filter(s => !s.required && s.value === null);
  if (missingOptional.length > 0) {
    return missingOptional[0].key;
  }

  return null;
}
```

---

## 🧪 测试结果

### 测试案例

**用户输入**：
```
我完成了外卖算法报道，这个报道在社交媒体上引起了很大反响，
阅读量超过了100万。我们还优化了前端性能，将加载时间从3秒降到了1秒。
```

**提取结果**：
```json
{
  "updates": [
    {"key": "achievement_1", "value": "完成外卖算法报道，在社交媒体上引起反响"},
    {"key": "achievement_2", "value": "优化前端性能，缩短加载时间"},
    {"key": "metrics_achievement", "value": "报道阅读量超100万，加载时间从3秒降至1秒"}
  ]
}
```

✅ **完美提取**：成功识别并填充了 3 个槽位！

---

## 📊 修复效果对比

| 功能 | 修复前 | 修复后 |
|------|--------|--------|
| 信息提取 | ❌ 无 | ✅ Agent B 自动提取 |
| 槽位更新 | ❌ 手动 | ✅ 自动填充 |
| 实时反馈 | ❌ 延迟 | ✅ 立即更新 |
| 量化证据 | ❌ 缺失 | ✅ 自动捕获 |
| 用户体验 | 😕 困惑 | 😊 清晰 |

---

## 🔄 完整数据流

```
┌─────────────────────────────────────────────────────────────┐
│  用户回答："我完成了外卖算法报道..."                       │
└─────────────────────────────────────────────────────────────┘
                          │
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Extract (Agent B - 数据提取)                        │
│                                                               │
│  调用 DeepSeek API (deepseek-chat, temperature=0.1)         │
│  提取关键信息并映射到槽位                                     │
│  - achievement_1: 外卖算法报道                                 │
│  - achievement_2: 前端优化                                   │
│  - metrics_achievement: 100万阅读量                           │
└─────────────────────────────────────────────────────────────┘
                          │
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 2: Update (更新槽位状态)                               │
│                                                               │
│  更新 state.slots 数组                                       │
│  - 设置 value: "完成外卖算法报道..."                          │
│  - 设置 status: "complete"                                  │
│  - 设置 filled: true                                         │
│  - 触发右侧 MaterialDashboard 重新渲染                       │
└─────────────────────────────────────────────────────────────┘
                          │
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 3: Ask (Agent A - 生成下一个问题)                      │
│                                                               │
│  根据更新的槽位状态，决定下一个问题                           │
│  - 如果 achievement_1 已完成 → 问 achievement_2               │
│  - 如果都完成 → 询问其他槽位                                 │
└─────────────────────────────────────────────────────────────┘
                          │
                          ↓
                    右侧面板实时更新 ✅
```

---

## 🎯 验证方法

### 1. 单元测试

```bash
node n8n_workflows/tests/test_slot_filling.js
```

**预期输出**：
```
✅ 解析成功
🎯 提取到的槽位:
   1. achievement_1
   2. achievement_2
   3. metrics_achievement
```

### 2. 集成测试

**在浏览器中**：

1. 刷新页面 (http://localhost:5173)
2. 开始访谈
3. 回答包含具体成果的问题（如"外卖算法报道"）
4. 观察右侧 "MaterialDashboard"
5. **预期**：槽位自动填充，从"正在询问"变为具体内容

### 3. 调试日志

打开浏览器控制台，查看日志：

```
[Interview Machine] Extracted: { updates: [...] }
[Interview Machine] Updating slot achievement_1: "完成外卖算法报道..."
[Interview Machine] Updating slot metrics_achievement: "报道阅读量超100万..."
```

---

## 💡 优化建议

### 已实现

✅ 恢复 Extract-Update-Decide 循环
✅ Agent B 自动提取信息
✅ 实时更新槽位状态
✅ 添加详细调试日志

### 可选优化

1. **提升提取准确度**
   - 优化 Agent B 的提示词
   - 添加更多提取示例
   - 使用 few-shot learning

2. **提高响应速度**
   - Agent B 使用缓存（常见回答）
   - 并行调用 Agent A 和 Agent B
   - 预提取可能的槽位

3. **用户反馈**
   - 显示"正在提取信息..."提示
   - 提取成功后显示✓图标
   - 允许用户手动编辑槽位

---

## 📝 相关文件

| 文件 | 修改内容 |
|------|---------|
| `src/hooks/useInterviewMachine.js` | 恢复 Extract-Update-Decide 循环 |
| `src/hooks/useInterviewMachine.js` | 优化 extractFromUserMessage 函数 |
| `src/hooks/useInterviewMachine.js` | 添加 determineNextSlot 函数 |
| `n8n_workflows/tests/test_slot_filling.js` | 添加单元测试 |

---

## 🎉 效果预览

**修复前**：
```
用户回答 → [无提取] → 槽位空白 → [用户困惑]
```

**修复后**：
```
用户回答 → [Agent B 提取] → 槽位自动填充 → [用户满意] ✅

右侧面板：
┌─────────────────────────────────┐
│ 核心成果一                        │
│ ✅ 完成外卖算法报道，在社交媒体  │
│    上引起反响                     │
│                                   │
│ 核心成果二                        │
│ ✅ 优化前端性能，缩短加载时间      │
│                                   │
│ 量化证据                          │
│ ✅ 报道阅读量超100万，加载时间     │
│    从3秒降至1秒                    │
└─────────────────────────────────┘
```

---

**最后更新**: 2026-01-03
**状态**: ✅ 已修复并测试通过
