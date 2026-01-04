# 文字可见性问题修复记录

## 修复时间
2026-01-03

## 问题描述

用户反馈3个关键的文字可见性问题：
1. **卡槽不可见** - 素材板的槽位卡片文字看不见
2. **输入时文字不可见** - 输入框输入的文字颜色缺失
3. **首页设置文字不可见** - Setup页面的表单文字看不见

## 根本原因

### 1. CSS样式缺失
`.chat-input` 类缺少 `color` 属性定义，导致输入框文字颜色未设置。

### 2. 内联样式覆盖
MaterialDashboard卡片组件使用了内联样式（`style={{ color: '#1e3a5f' }}`），但这些颜色在某些背景下不够对比。

### 3. 表单元素默认样式
浏览器默认的 `input`, `select`, `textarea` 可能没有继承文字颜色。

---

## 修复内容

### 1. 修复输入框文字颜色

**文件**: `src/index.css`

**修改前**:
```css
.chat-input {
  width: 100%;
  padding: 1rem 1rem;
  border: 2px solid #d1d9e0;
  border-radius: 0.75rem;
  outline: none;
  transition: all 0.2s;
  resize: none;
  background-color: #ffffff;
  /* 缺少 color 属性 */
}
```

**修改后**:
```css
.chat-input {
  width: 100%;
  padding: 1rem 1rem;
  border: 2px solid #d1d9e0;
  border-radius: 0.75rem;
  outline: none;
  transition: all 0.2s;
  resize: none;
  background-color: #ffffff;
  color: #1a1a1a;  /* 新增：黑色文字 */
  font-size: 1rem;
  line-height: 1.5;
}

.chat-input::placeholder {
  color: #8d99ae;  /* 新增：灰色占位符 */
}
```

### 2. 修复素材板卡片文字颜色

**文件**: `src/components/MaterialDashboard.jsx`

**修改前**:
```jsx
<span className="text-small font-semibold truncate" style={{ color: '#1e3a5f' }}>
  {slot.label}
</span>

<p className="text-small leading-relaxed line-clamp-2" style={{ color: '#5c6b7f' }}>
  {slot.value}
</p>
```

**修改后**:
```jsx
<span className="text-small font-semibold truncate text-text-primary">
  {slot.label}
</span>

<p className="text-small leading-relaxed line-clamp-2 text-text-secondary">
  {slot.value}
</p>
```

**改进**:
- 移除内联样式，使用Tailwind颜色类
- `text-text-primary`: 主文字色 (#1a1a1a)
- `text-text-secondary`: 次文字色 (#5c6b7f)
- `text-text-tertiary`: 辅助文字色 (#8d99ae)
- `text-accent`: 强调色 (#c9a961)

**完整修改的元素**:
- 卡片标题: `text-text-primary`
- 卡片内容: `text-text-secondary`
- 卡片状态（已跳过/待收集）: `text-text-tertiary`
- 必填标记: `text-accent`
- 编辑指示器: `text-text-tertiary`

### 3. 修复首页设置表单文字颜色

**文件**: `src/App.jsx`

**修改内容**:

**职位输入框**:
```jsx
// Before
className="... text-body"

// After
className="... text-text-primary placeholder:text-text-tertiary"
```

**受众下拉框**:
```jsx
// Before
className="... text-body"

// After
className="... text-text-primary"
```

**文风风格下拉框**:
```jsx
// Before
className="... text-body"

// After
className="... text-text-primary"
```

**字数期望输入框**:
```jsx
// Before
className="... text-body"

// After
className="... text-text-primary"
```

**说明**:
- `text-body` 在Tailwind配置中定义为 `1rem` 字体大小，但不包含颜色
- 改为 `text-text-primary` 确保使用正确的颜色 (#1a1a1a)
- 添加 `placeholder:text-text-tertiary` 确保占位符可见

### 4. 添加全局表单元素文字颜色

**文件**: `src/index.css`

**新增**:
```css
/* Ensure form elements have default text color */
input,
select,
textarea {
  color: #1a1a1a;
}

input::placeholder,
textarea::placeholder {
  color: #8d99ae;
}

input:disabled,
select:disabled,
textarea:disabled {
  color: #8d99ae;
}
```

**目的**:
- 确保所有表单元素默认有黑色文字
- 占位符使用灰色
- 禁用状态使用浅灰色
- 作为兜底方案，防止任何遗漏

---

## 颜色系统参考

### Tailwind配置 (`tailwind.config.js`)

```javascript
colors: {
  text: {
    primary: '#1a1a1a',    // 主要文字 - 深黑
    secondary: '#5c6b7f',  // 次要文字 - 中灰蓝
    tertiary: '#8d99ae',   // 辅助文字 - 浅灰蓝
  },
  accent: {
    DEFAULT: '#c9a961',    // 强调色 - 古铜金
  },
}
```

### 使用场景

| 颜色类 | 用途 | 十六进制 |
|--------|------|----------|
| `text-text-primary` | 标题、主要内容、输入文字 | #1a1a1a |
| `text-text-secondary` | 描述、辅助内容、卡片值 | #5c6b7f |
| `text-text-tertiary` | 占位符、禁用文字、提示 | #8d99ae |
| `text-accent` | 强调、标记、必填标识 | #c9a961 |
| `text-primary` | 品牌标题 | #1e3a5f |

---

## 测试验证

### 1. 输入框测试
- [x] 输入文字显示为黑色
- [x] 占位符显示为灰色
- [x] Focus状态边框变为金色

### 2. 素材板卡片测试
- [x] 卡片标题（槽位名称）显示为黑色
- [x] 卡片内容（已填充值）显示为深灰
- [x] 空状态/跳过状态显示为浅灰
- [x] 必填标记显示为金色

### 3. 首页设置表单测试
- [x] 所有input输入框文字可见
- [x] 所有select下拉框文字可见
- [x] 占位符文字可见

---

## 构建验证

```bash
$ npm run build
✓ built in 34.66s
```

✅ 构建成功，无错误
✅ 热更新已应用

---

## 修改文件列表

1. **src/index.css**
   - 添加全局表单元素颜色
   - 修复 `.chat-input` 文字颜色

2. **src/components/MaterialDashboard.jsx**
   - 卡片标题: 改用 `text-text-primary`
   - 卡片内容: 改用 `text-text-secondary`
   - 卡片状态: 改用 `text-text-tertiary`
   - 必填标记: 改用 `text-accent`

3. **src/App.jsx**
   - 职位input: 改用 `text-text-primary`
   - 受众select: 改用 `text-text-primary`
   - 文风select: 改用 `text-text-primary`
   - 字数input: 改用 `text-text-primary`

---

## 预防措施

### 未来开发建议

1. **使用Tailwind颜色类**
   - ✅ 推荐: `className="text-text-primary"`
   - ❌ 避免: `style={{ color: '#1a1a1a' }}`

2. **定义全局样式**
   - 在 `index.css` 中为常用元素设置默认颜色
   - 特别是 `input`, `select`, `textarea`

3. **组件级颜色一致性**
   - 同类型元素使用相同的颜色类
   - 建立设计系统文档

4. **浏览器测试**
   - 不同浏览器可能有不同的默认样式
   - 测试Chrome、Firefox、Safari

---

## 状态

🟢 **问题已全部修复**

- ✅ 输入框文字可见
- ✅ 素材板卡片文字可见
- ✅ 首页设置表单文字可见
- ✅ 构建成功
- ✅ 热更新已应用

---

## 相关文档

- [UI设计实施总结](./UI_REDESIGN_IMPLEMENTATION.md)
- [Tailwind配置](./tailwind.config.js)

---

**修复日期**: 2026-01-03
**修复者**: Claude
**版本**: Talk2Report 2.0 - 文字颜色修复版
