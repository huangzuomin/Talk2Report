# 前端对话容错机制修复报告

## 修复时间
2026-01-03 23:45

---

## 📋 修复任务清单

根据 `迭代/纠偏.md` 的反馈，实施以下修复：

- [x] A. 引入"双重验证"消息处理机制
- [x] B. 槽位提取的实时反馈（已在UI中实现）
- [x] C. 增强System Prompt的"约束力"

---

## 🔧 实施的修复

### 修复1: 输入意图验证层

**文件**: `src/hooks/useInterviewMachine.js`
**位置**: 第388-470行

**新增函数**: `validateUserInput(userInput, currentFocusSlot, slots)`

#### 功能
在发送消息给LLM之前，先验证用户输入的有效性：

1. **判断标准**:
   - ✅ 有效：与工作、项目、成就相关；包含数字指标；合理的不确定表达
   - ❌ 无效：完全乱码；与职场无关；明显恶搞

2. **输出格式**:
   ```json
   {
     "is_valid": true/false,
     "reason": "原因说明",
     "severity": "low/medium/high"
   }
   ```

#### 示例

**有效输入**:
- "我完成了三个主要项目" → `{"is_valid": true}`
- "我不太记得具体数字了" → `{"is_valid": true}`

**无效输入**:
- "皇帝的女人飞机发热" → `{"is_valid": false, "severity": "high"}`
- "asdfghjkl" → `{"is_valid": false, "severity": "high"}`

---

### 修复2: 硬纠偏回归机制

**文件**: `src/hooks/useInterviewMachine.js`
**位置**: 第90-115行

**修改函数**: `sendMessage`

#### 工作流程

```javascript
// Step 0: Validate (新增)
const validationResult = await validateUserInput(userText, ...);

// 如果无效，应用硬纠偏
if (!validationResult.is_valid && validationResult.severity === 'high') {
  // 固定话术，不尝试美化
  const correctionMessage = `抱歉，我未能理解这段内容与您年度工作的关联。
  我们还是回到关于**[当前槽位]**的讨论吧。

  能否请您分享一下：
  [槽位描述]`;

  // 直接返回，不继续后续流程
  return { message: correctionMessage, correctionApplied: true };
}

// Step 1: Extract (只有验证通过才执行)
// Step 2: Update
// Step 3: Ask
```

#### 效果
- ❌ **修复前**: 输入"皇帝的女人飞机发热" → AI试图用"意象跳跃"合理化
- ✅ **修复后**: 输入"皇帝的女人飞机发热" → 直接拒绝并引导回正题

---

### 修复3: 增强System Prompt约束力

**文件**: `src/hooks/useInterviewMachine.js`
**修改位置**:
- 第43-61行：启动访谈的Prompt
- 第188-209行：正常提问模式的Prompt

#### 修改内容

**修复前**:
```
你是年终总结访谈助手。通过简短提问收集用户信息。
每次只问一个简短问题，直接引导式提问。
```

**修复后**:
```
你是一名**严谨的职场顾问**。你的核心目标是收集结构化信息。

# ⚠️ 重要约束
1. **专注职场价值**：只收集与工作相关的信息
2. **拒绝文学意象**：如果用户输入无意义内容，不要试图通过修辞将其合理化
3. **引导回归正轨**：当用户偏离主题时，立即引导回职场话题
4. **量化优先**：引导用户提供具体数字、指标、百分比
5. **简洁提问**：每次只问一个简短问题，直接引导

# 输出风格
- 语气：专业、鼓励、但不失严谨
- 长度：1-2句话，不超过50字
- 避免：过度共情、文学修辞、发散性联想
```

#### 关键改进
1. ✅ 明确角色定位：严谨的职场顾问，而非聊天机器人
2. ✅ 添加负面约束：拒绝文学意象、过度共情
3. ✅ 强调量化优先：引导用户提供具体数字
4. ✅ 限制输出长度：不超过50字

---

## 📊 修复效果对比

### 场景1: 乱码输入

**修复前**:
```
用户: "皇帝的女人飞机发热"
AI: "我理解这背后可能蕴含着某种意象波动..."
问题: 试图美化无意义内容 ❌
```

**修复后**:
```
用户: "皇帝的女人飞机发热"
验证: {"is_valid": false, "severity": "high"}
AI: "抱歉，我未能理解这段内容与您年度工作的关联。
      我们还是回到关于**核心成就**的讨论吧。

      能否请您分享一下：
      您本年度最重要的工作成果是什么？"
效果: 直接拒绝并引导回正题 ✅
```

### 场景2: 进度停滞

**修复前**:
```
问题: 当用户输入无效信息时，AI继续挖掘细节
结果: 进度条长期停滞在10%-57% ❌
```

**修复后**:
```
改进: 输入验证层拦截无效输入
      硬纠偏强制回到当前槽位
      System Prompt不再美化无意义内容
效果: 减少无效循环 ✅
```

### 场景3: 过度共情

**修复前**:
```
System Prompt: "你是年终总结访谈助手"
行为: 倾向于顺从用户，即使离题也试图共情 ❌
```

**修复后**:
```
System Prompt: "你是一名严谨的职场顾问"
约束: 拒绝文学意象，专注职场价值 ✅
```

---

## 🎯 技术实现细节

### 双重验证机制

```
用户输入
   ↓
[Layer 1] validateUserInput()
   - 判断是否与职场相关
   - 检测乱码/无意义内容
   - 返回 is_valid + severity
   ↓
┌─────────────┬─────────────┐
│  高严重度   │   低严重度   │
│ (is_valid=false) │ (is_valid=true) │
└─────────────┴─────────────┘
   ↓               ↓
硬纠偏         继续处理
固定话术       Extract → Update → Ask
```

### API调用顺序

**修复后**:
```javascript
// 1. 验证输入意图
const validation = await fetch('/api/deepseek/chat', {
  body: JSON.stringify({
    model: 'deepseek-chat',
    messages: [validationPrompt, userInput]
  })
});

// 2. 如果有效，提取信息
if (validation.is_valid) {
  const extraction = await fetch('/api/deepseek/chat', {
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [extractionPrompt, userInput]
    })
  });
}

// 3. 生成下一个问题
const nextQuestion = await fetch('/api/deepseek/chat', {
  body: JSON.stringify({
    model: 'deepseek-chat',
    messages: [interviewerPrompt, ...history]
  })
});
```

**性能影响**: 每次用户输入增加1次API调用（验证层）
- 修复前: 2次API调用（提取 + 提问）
- 修复后: 3次API调用（验证 + 提取 + 提问）
- 额外耗时: ~1-2秒（可接受）

---

## ✅ 待测试场景

根据反馈报告的测试要求：

### 测试1: 乱码测试
**输入**: "皇帝的女人飞机发热"
**预期**: 系统停止推进并重申问题

### 测试2: 角色切换测试
**输入**: "我是记者，今年发表了10篇深度报道"
**预期**: 准确抓取"篇数"、"阅读量"、"社会影响"等指标

### 测试3: 进度破局测试
**输入**: "没有更多细节了"
**预期**: 系统识别并跳转到下一模块（或显示"完成访谈"按钮）

---

## 🚀 部署状态

### 开发服务器
- **地址**: http://localhost:5178/
- **状态**: ✅ 运行中
- **HMR**: ✅ 修改已应用

### 下一步验证
1. 访问 http://localhost:5178/
2. 开始访谈
3. 测试无效输入（如："asdfgh"）
4. 观察是否正确拒绝并引导

---

## 📝 代码修改摘要

### 新增代码
- `validateUserInput()` 函数：82行
- `sendMessage()` 中的验证逻辑：26行

### 修改代码
- `startInterview()` 中的 System Prompt：18行
- `sendMessage()` 中的 System Prompt：22行

### 总计
- **新增**: ~108行
- **修改**: ~40行
- **影响范围**: `src/hooks/useInterviewMachine.js`

---

## 🔗 相关文档

- **反馈报告**: `迭代/纠偏.md` - 问题描述和修复要求
- **前端UI**: `src/components/ChatInterfaceV4.jsx` - 实时槽位看板
- **状态配置**: `src/config/ReportState.js` - 槽位定义

---

**修复完成时间**: 2026-01-03 23:45
**修复策略**: 双重验证 + 硬纠偏 + 增强约束
**状态**: 🟢 容错机制已实施，待测试验证
