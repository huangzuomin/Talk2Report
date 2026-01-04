# Bug 修复：跳过槽位 + 完成访谈按钮

## 🐛 问题描述

### 问题1：跳过问题后槽位清零
**现象**：用户点击"跳过当前问题"后，右侧已填充的槽位全部被清空，显示为"正在询问"

### 问题2：没有生成报告按钮
**现象**：访谈进行到8轮后，仍然没有显示"生成报告"按钮，用户无法进入下一阶段

---

## 🔍 根本原因

### 问题1分析：状态更新竞争

**原代码**（`useInterviewMachine.js` lines 188-206）：
```javascript
const skipCurrentSlot = useCallback(async () => {
  // 标记当前槽位为 SKIPPED
  const newSlots = state.slots.map(slot => {
    if (slot.key === state.current_focus_slot) {
      return { ...slot, value: "SKIPPED", status: "skipped" };
    }
    return slot;
  });

  setState(prev => ({ ...prev, slots: newSlots }));

  // 触发下一轮，让AI决定下一个问题
  return sendMessage("跳过这个问题"); // ❌ 问题所在！
}, [state.current_focus_slot, state.slots, sendMessage]);
```

**问题**：
1. `skipCurrentSlot` 调用 `sendMessage("跳过这个问题")`
2. `sendMessage` 触发完整的 Extract-Update-Decide 循环
3. Extract 阶段：Agent B 尝试从"跳过这个问题"提取信息
4. Update 阶段：使用的是**旧的 state**（由于异步更新）
5. 结果：已填充的槽位被覆盖或清空

**时序问题**：
```
t0: skipCurrentSlot() 调用 setState(newSlots)
t1: sendMessage() 读取旧的 state.slots
t2: Agent B 提取（无信息）
t3: setState() 用旧数据覆盖新数据 ❌
```

### 问题2分析：依赖 AI 触发完成

**原逻辑**：
```javascript
// 只有 AI 消息包含特定短语才会设置 is_finished = true
const shouldEnd = newRound >= minRounds && (
  assistantMessage.includes('访谈完成') ||
  assistantMessage.includes('结束访谈') ||
  assistantMessage.includes('感谢你的分享')
);
```

**问题**：
- 完全依赖 AI 消息内容
- 用户无法主动结束访谈
- 即使已经聊了8轮，如果 AI 没说特定短语，就不显示按钮

---

## ✅ 修复方案

### 修复1：重写跳过逻辑

**文件**：`src/hooks/useInterviewMachine.js`

```javascript
const skipCurrentSlot = useCallback(async () => {
  if (!state.current_focus_slot) return;

  console.log('[Interview Machine] Skipping slot:', state.current_focus_slot);

  // 1. 标记当前槽位为 SKIPPED（保持其他槽位不变）
  const newSlots = state.slots.map(slot => {
    if (slot.key === state.current_focus_slot) {
      return {
        ...slot,
        value: "SKIPPED",
        status: "skipped",
        filled: false
      };
    }
    // ✅ 关键：保持其他槽位不变
    return slot;
  });

  console.log('[Interview Machine] Slots after skip:', newSlots.map(s => ({
    key: s.key,
    value: s.value
  })));

  setState(prev => ({ ...prev, slots: newSlots }));

  // 2. 直接调用 callAgentA，避免 Extract-Update-Decide 循环
  try {
    const history = messages.map(m => ({ role: m.role, content: m.content }));
    history.push({ role: 'user', content: '[用户跳过了这个问题]' });

    const systemPrompt = `你是年终总结访谈助手。
用户刚刚跳过了关于 ${state.slots.find(s => s.key === state.current_focus_slot)?.label} 的问题。
请继续询问下一个问题。`;

    const response = await callAgentA([
      { role: 'system', content: systemPrompt },
      ...history.slice(-6)
    ], (thinking) => {});

    const assistantMessage = response.choices?.[0]?.message?.content || '';

    // 3. 添加消息到 UI
    addMessage('user', '[跳过当前问题]');
    addMessage('assistant', assistantMessage, '');

    // 4. 更新状态
    const newRound = state.conversation_round + 1;
    setState(prev => ({
      ...prev,
      conversation_round: newRound,
      current_focus_slot: determineNextSlot(newSlots)
    }));

    return {
      message: assistantMessage,
      finished: false,
      updatedSlots: []
    };
  } catch (err) {
    console.error('[Interview Machine] Skip failed:', err);
    throw err;
  }
}, [state, messages, addMessage]);
```

**关键改进**：
- ✅ 不再调用 `sendMessage`，避免 Extract 循环
- ✅ 直接调用 `callAgentA`，只生成下一个问题
- ✅ 使用函数式 map，确保其他槽位不被修改
- ✅ 添加详细日志，便于调试

### 修复2：添加手动完成功能

**文件**：`src/hooks/useInterviewMachine.js`

```javascript
/**
 * 手动完成访谈
 */
const finishInterview = useCallback(() => {
  console.log('[Interview Machine] Manually finishing interview');

  setState(prev => ({
    ...prev,
    is_finished: true,
    current_focus_slot: null
  }));

  // 添加结束语
  addMessage('assistant', '好的，我们已完成访谈。现在可以为您生成年终总结了。', '');

  return {
    finished: true,
    conversationHistory: messages,
    slots: state.slots,
    completion
  };
}, [messages, state.slots, completion, addMessage]);
```

### 修复3：UI 添加完成按钮

**文件**：`src/components/ChatInterfaceV2.jsx`

```javascript
// 1. 导入 finishInterview
const {
  state,
  messages,
  // ...
  finishInterview,  // ✅ 新增
  resetInterview,
} = useInterviewMachine();

// 2. 添加处理函数
const handleFinish = () => {
  const result = finishInterview();
  if (result?.finished) {
    setTimeout(() => {
      onComplete?.({
        conversationHistory: messages,
        slots: state.slots,
        completion,
        sessionId
      });
    }, 500);
  }
};

// 3. UI 添加按钮（输入框上方）
{!state.is_finished && (
  <div className="mb-3 flex justify-between items-center">
    {/* 完成按钮 - 显示条件：访谈轮数 >= 5 */}
    {state.conversation_round >= 5 && (
      <button
        onClick={handleFinish}
        disabled={isLoading}
        className="text-sm px-4 py-2 bg-green-600 text-white rounded-lg
                   hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
      >
        <CheckCircle2 size={14} />
        完成访谈并生成报告 →
      </button>
    )}

    {/* 跳过按钮 */}
    {state.current_focus_slot && (
      <button onClick={handleSkip} ...>
        跳过当前问题 →
      </button>
    )}
  </div>
)}

// 4. 进度区域添加视觉提示
{state.conversation_round >= 5 && !state.is_finished && (
  <span className="text-xs text-green-700 ml-2">
    ✓ 可完成访谈
  </span>
)}
```

---

## 🧪 验证步骤

### 测试案例1：跳过问题

**操作步骤**：
1. 开始访谈
2. 回答几个问题，填充一些槽位
3. 点击"跳过当前问题"

**预期结果**：
- ✅ 当前槽位标记为"已跳过"
- ✅ 其他已填充槽位保持不变
- ✅ AI 生成下一个问题
- ✅ 控制台显示：
  ```
  [Interview Machine] Skipping slot: achievement_1
  [Interview Machine] Slots after skip: [...]
  ```

### 测试案例2：完成访谈

**操作步骤**：
1. 进行至少 5 轮访谈
2. 观察 Header 进度区域

**预期结果**：
- ✅ 显示 "✓ 可完成访谈" 提示
- ✅ 输入框上方出现绿色"完成访谈并生成报告"按钮
- ✅ 点击按钮后，自动跳转到生成报告页面

### 测试案例3：早期访谈

**操作步骤**：
1. 开始访谈
2. 只进行 1-2 轮

**预期结果**：
- ✅ 不显示"完成访谈"按钮
- ✅ 只显示"跳过当前问题"按钮（如果有当前槽位）

---

## 📊 修复效果对比

| 功能 | 修复前 | 修复后 |
|------|--------|--------|
| 跳过问题 | ❌ 清空所有槽位 | ✅ 只标记当前槽位 |
| 槽位保持 | ❌ 丢失已填充内容 | ✅ 保留所有内容 |
| 完成访谈 | ❌ 被动等待 AI | ✅ 主动按钮控制 |
| 按钮显示 | ❌ 无明确入口 | ✅ 5轮后显示 |
| 用户体验 | 😕 困惑 | 😊 清晰 |

---

## 💡 设计考虑

### 为什么选择 5 轮作为阈值？

1. **信息量充足**：5 轮对话通常能覆盖核心槽位
2. **用户耐心**：大多数用户不愿回答超过 10 个问题
3. **灵活性**：既不会太早（信息不足），也不会太晚（用户疲劳）

### 按钮布局设计

**左侧：完成按钮**（绿色，主要操作）
- 只在轮数 >= 5 时显示
- 醒目的绿色引导用户完成

**右侧：跳过按钮**（灰色，次要操作）
- 始终可用（如果有当前槽位）
- 不干扰主流程

### 视觉提示

**进度区域**：
```
5/12 (42%) ✓ 可完成访谈
```

**按钮区域**：
```
[完成访谈并生成报告 →]        [跳过当前问题 →]
```

---

## 📝 相关文件

| 文件 | 修改内容 |
|------|---------|
| `src/hooks/useInterviewMachine.js` | 重写 `skipCurrentSlot`，添加 `finishInterview` |
| `src/components/ChatInterfaceV2.jsx` | 添加完成按钮，优化布局 |
| `src/components/ChatInterfaceV2.jsx` | 添加视觉提示 |

---

## 🎯 后续优化建议

### 短期

✅ 已完成：
- 修复跳过逻辑
- 添加完成按钮
- 优化 UI 布局

### 中期（可选）

1. **智能建议**：根据槽位填充情况，建议用户是否继续
   ```
   您已完成 5 个核心槽位，可以开始生成报告了。
   ```

2. **槽位质量检查**：标记"必填但未填充"的槽位
   ```
   ⚠️ 建议补充：量化证据、核心成果二
   ```

3. **进度预览**：显示完成访谈后的大致时间
   ```
   完成访谈后，预计 30 秒生成报告
   ```

### 长期（考虑中）

4. **自适应阈值**：根据用户回答质量动态调整
   - 回答详细 → 可以更早完成
   - 回答简单 → 建议继续访谈

5. **分段完成**：允许用户暂停和恢复
   ```
   保存进度，稍后继续
   ```

---

## 🔧 调试帮助

如果问题仍然存在，请查看控制台日志：

```javascript
// 跳过操作
[Interview Machine] Skipping slot: achievement_1
[Interview Machine] Slots after skip: [{key: "...", value: "..."}, ...]

// 完成操作
[Interview Machine] Manually finishing interview
```

**快速诊断**：
```bash
# 检查槽位状态
# 在浏览器控制台运行：
window.__INTERVIEW_STATE__?.slots
```

---

**最后更新**: 2026-01-03
**状态**: ✅ 已修复
**测试**: 通过所有验证案例
