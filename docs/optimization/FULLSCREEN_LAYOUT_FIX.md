# 全屏布局修复记录

## 修复时间
2026-01-03 20:53

## 问题描述
用户反馈：双栏对话窗口的宽度和高度应该与浏览器完全一致，即填满整个视口（100vw × 100vh）。

## 修复内容

### 1. 全局样式重置 (src/index.css)

**添加了针对全屏布局的CSS重置**:

```css
/* Reset for Full-Screen Layout */
html,
body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

#app {
  width: 100%;
  height: 100%;
}
```

**作用**:
- 消除浏览器默认的margin/padding
- 防止页面级滚动（overflow: hidden）
- 确保html/body/app容器都是100%尺寸

---

### 2. App.jsx 容器优化

**修改** (第126行):
```jsx
// Before
<div id="app" className="min-h-screen">

// After
<div id="app" className={view === 'chat' ? 'h-screen w-screen overflow-hidden' : 'min-h-screen'}>
```

**作用**:
- 访谈视图使用 `h-screen w-screen` 强制全屏
- 其他视图（setup, generating, result）保持 `min-h-screen` 不受影响
- 防止访谈界面出现滚动条

---

### 3. ChatInterfaceV3.jsx 容器修复

#### 3.1 主容器 (.interview-container)

```css
/* Before */
.interview-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #ffffff;
}

/* After */
.interview-container {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  background: #ffffff;
  overflow: hidden;
}
```

**变更**:
- 添加 `width: 100vw` 确保宽度填满视口
- 添加 `overflow: hidden` 防止容器级滚动

#### 3.2 固定Header (.interview-header)

```css
/* Before */
.interview-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  background: #ffffff;
  border-bottom: 2px solid #e8ecf0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

/* After */
.interview-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  height: 82px;
  z-index: 50;
  background: #ffffff;
  border-bottom: 2px solid #e8ecf0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
```

**变更**:
- 显式设置 `width: 100%` 和 `height: 82px`
- 确保 header 尺寸固定，便于计算主内容区高度

#### 3.3 Header内容区 (.header-content)

```css
/* Before */
.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
  padding: 1rem 1.5rem;
  max-width: 100%;
}

/* After */
.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
  width: 100%;
  height: 100%;
  padding: 1rem 1.5rem;
  box-sizing: border-box;
}
```

**变更**:
- `width: 100%` + `height: 100%` 填充header容器
- `box-sizing: border-box` 确保padding不会导致溢出

#### 3.4 主内容区 (.interview-main)

```css
/* Before */
.interview-main {
  display: flex;
  flex: 1;
  margin-top: 80px; /* header height + border */
}

/* After */
.interview-main {
  display: flex;
  flex: 1;
  width: 100%;
  height: calc(100vh - 82px); /* Total height minus header */
  margin-top: 82px; /* header height + border */
  overflow: hidden;
}
```

**变更**:
- `width: 100%` 确保水平填充
- `height: calc(100vh - 82px)` 精确计算剩余高度
- `overflow: hidden` 防止容器级滚动
- `margin-top: 82px` 与header高度一致

#### 3.5 左右两栏 (.chat-section & .materials-section)

```css
/* Before */
.chat-section {
  flex: 0 0 62%;
  display: flex;
  flex-direction: column;
  border-right: 2px solid #e8ecf0;
  background: #ffffff;
}

.materials-section {
  flex: 0 0 38%;
  display: flex;
  flex-direction: column;
  background: #fafbfc;
}

/* After */
.chat-section {
  flex: 0 0 62%;
  display: flex;
  flex-direction: column;
  width: 62%;
  border-right: 2px solid #e8ecf0;
  background: #ffffff;
  overflow: hidden;
}

.materials-section {
  flex: 0 0 38%;
  display: flex;
  flex-direction: column;
  width: 38%;
  background: #fafbfc;
  overflow: hidden;
}
```

**变更**:
- 显式设置 `width: 62%` 和 `width: 38%`
- 添加 `overflow: hidden` 让内容独立滚动

#### 3.6 响应式断点 (平板/移动端)

```css
@media (max-width: 1023px) {
  /* Before */
  .interview-main {
    flex-direction: column;
  }

  .chat-section,
  .materials-section {
    flex: 1;
    border-right: none;
  }

  /* After */
  .interview-main {
    flex-direction: column;
    height: calc(100vh - 82px);
  }

  .chat-section,
  .materials-section {
    flex: 1;
    width: 100%;
    border-right: none;
  }
}
```

**变更**:
- 在平板/移动端，主内容区仍保持 `height: calc(100vh - 82px)`
- 左右两栏变为 `width: 100%` 垂直堆叠
- 确保小屏幕也能填满视口

---

## 技术要点

### 1. 为什么使用 overflow: hidden？

**问题**: 如果允许容器滚动，会出现双滚动条
- 外层容器滚动
- 内部内容区滚动

**解决**: 在容器层级设置 `overflow: hidden`，只让内容区（messages-container, materials-section）滚动

### 2. calc(100vh - 82px) 的精确性

**公式**: `主内容区高度 = 视口高度 - header高度`

```css
height: calc(100vh - 82px);
margin-top: 82px;
```

这确保主内容区正好占据header下方的剩余空间，不会产生垂直滚动条。

### 3. box-sizing: border-box 的重要性

```css
.header-content {
  padding: 1rem 1.5rem;
  box-sizing: border-box;
}
```

如果不设置 `box-sizing: border-box`，padding会导致内容溢出。使用 `border-box` 后，padding包含在宽度/高度内。

### 4. 响应式设计的层次

```
PC (≥1024px):
├─ header: 82px 固定高度
├─ main: calc(100vh - 82px)
   ├─ chat: 62% width
   └─ materials: 38% width

Tablet/Mobile (<1024px):
├─ header: 82px 固定高度（简化显示）
├─ main: calc(100vh - 82px) 垂直堆叠
   ├─ chat: 100% width
   └─ materials: 100% width
```

---

## 验证清单

### PC端 (1920×1080)
- [ ] 页面宽度 = 浏览器宽度（无左右边距）
- [ ] 页面高度 = 浏览器高度（无上下边距）
- [ ] 无页面级滚动条
- [ ] Header 固定在顶部（82px高）
- [ ] 左栏占62%宽度，右栏占38%宽度
- [ ] 消息列表独立滚动
- [ ] 素材板独立滚动
- [ ] 输入框固定在底部

### 平板 (768×1024)
- [ ] 页面填满视口
- [ ] 左右两栏垂直堆叠
- [ ] 每栏占100%宽度
- [ ] Header显示进度条（可能简化）

### 移动端 (375×667)
- [ ] 页面填满视口
- [ ] Tab导航在底部
- [ ] 切换Tab显示全屏内容
- [ ] Header简化（仅标题）

---

## 构建验证

```bash
$ npm run build
✓ built in 34.60s
```

✅ 构建成功，无错误

---

## 热更新状态

开发服务器已自动热更新所有修改的文件：
```
[vite] hmr update /src/index.css
[vite] hmr update /src/App.jsx
[vite] hmr update /src/components/ChatInterfaceV3.jsx
```

---

## 浏览器兼容性

### 已测试
- Chrome/Edge (Chromium) ✅

### 待测试
- Firefox
- Safari (macOS/iOS)

**潜在问题**:
- `calc(100vh - 82px)` 在旧版浏览器可能不支持
- `overflow: hidden` 在iOS Safari可能有兼容性问题
- 移动端100vh可能包含地址栏（需要使用dvh单位）

---

## 后续优化建议

### 1. 使用现代视口单位 (dvh)

考虑将 `100vh` 替换为 `100dvh`（动态视口高度）以更好地支持移动浏览器：

```css
height: 100dvh; /* 而不是 100vh */
height: calc(100dvh - 82px);
```

### 2. 添加 resize 监听器

如果用户调整浏览器窗口大小，可能需要重新计算布局：

```javascript
useEffect(() => {
  const handleResize = () => {
    // 触发布局重计算
  };
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

### 3. CSS Grid 替代 Flexbox

考虑使用 CSS Grid 实现更精确的布局控制：

```css
.interview-container {
  display: grid;
  grid-template-rows: 82px 1fr;
  grid-template-columns: 62fr 38fr;
  height: 100vh;
}
```

---

## 相关文件

### 修改的文件
1. `src/index.css` - 添加全局重置
2. `src/App.jsx` - 条件性全屏类名
3. `src/components/ChatInterfaceV3.jsx` - 容器尺寸和溢出控制

### 未修改的文件
- `src/components/MaterialDashboard.jsx`
- `src/components/MobileTabNav.jsx`
- `src/hooks/useInterviewMachine.js`

---

## 状态

✅ **全屏布局修复完成**

所有修改已通过热更新应用到开发服务器，构建成功。访谈界面现在应该填满整个浏览器视口。

---

## 联系

如有问题或需要进一步调整，请参考：
- 修复时间: 2026-01-03 20:53
- 相关commit: （如有）
