# Talk2Report 部署指南 (BFF 架构)

本指南将帮助您将 Talk2Report 部署到生产环境，采用 **BFF (Backend For Frontend)** 架构确保安全性。

## 架构概览

```
浏览器 → Vercel (BFF) → Cloudflare Tunnel → 内网 NAS (n8n)
```

## 第一步：配置 Cloudflare Tunnel (NAS 端)

### 1. 在 TrueNAS 上安装 cloudflared

```bash
# Docker Compose 示例
version: '3'
services:
  cloudflared:
    image: cloudflare/cloudflared:latest
    command: tunnel --no-autoupdate run
    environment:
      - TUNNEL_TOKEN=your_tunnel_token_here
    restart: unless-stopped
```

### 2. 创建隧道并绑定域名

1. 访问 [Cloudflare Zero Trust](https://one.dash.cloudflare.com/)
2. 创建新隧道，获取 Token
3. 配置公共主机名：
   - 域名：`n8n.yourdomain.com`
   - 服务：`http://192.168.50.224:30109`

### 3. 测试隧道

```bash
curl https://n8n.yourdomain.com/webhook/stt
# 应该返回 n8n 的响应（可能是 404，但不应该是连接错误）
```

## 第二步：配置 n8n 安全认证

### 1. 在 n8n Webhook 节点中启用 Header Auth

1. 打开您的 STT 和 Generate 工作流
2. 双击 Webhook 节点
3. 在 **Authentication** 下拉框中选择 `Header Auth`
4. 设置：
   - **Name**: `Authorization`
   - **Value**: `Bearer your_secret_token_here`

### 2. 记录您的 Token

将这个 Token 保存好，稍后会在 Vercel 环境变量中使用。

## 第三步：部署到 Vercel

### 1. 初始化 Git 仓库

```bash
cd d:\案例\Talk2Report
git init
git add .
git commit -m "Initial commit with BFF layer"
```

### 2. 推送到 GitHub

```bash
# 在 GitHub 上创建新仓库，然后：
git remote add origin https://github.com/yourusername/talk2report.git
git push -u origin main
```

### 3. 在 Vercel 上导入项目

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 **Add New** → **Project**
3. 导入您的 GitHub 仓库
4. 配置环境变量（见下方）

### 4. 配置 Vercel 环境变量

在 Vercel 项目设置中添加以下环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `N8N_STT_URL` | `https://n8n.yourdomain.com/webhook/stt` | n8n STT 接口地址 |
| `N8N_GENERATE_URL` | `https://n8n.yourdomain.com/webhook/generate` | n8n 生成接口地址 |
| `N8N_AUTH_TOKEN` | `your_secret_token_here` | n8n Header Auth Token |

### 5. 部署

点击 **Deploy**，等待构建完成。

## 第四步：验证部署

### 1. 测试前端

访问您的 Vercel 域名（如 `https://talk2report.vercel.app`），尝试：
1. 点击"开始访谈"
2. 录音并测试转写
3. 完成 12 题后生成报告

### 2. 检查日志

如果出现问题：
- **Vercel 日志**：在 Vercel Dashboard → Functions → Logs 查看 BFF 层错误
- **n8n 日志**：在 n8n 执行历史中查看工作流是否被触发
- **浏览器控制台**：按 F12 查看前端报错

## 常见问题

### Q: 提示 "N8N_STT_URL not configured"
A: 检查 Vercel 环境变量是否正确设置，并重新部署。

### Q: 转写一直卡在"转写中..."
A: 
1. 检查 Cloudflare Tunnel 是否正常运行
2. 检查 n8n Webhook 的 Header Auth Token 是否匹配
3. 查看 Vercel Functions 日志

### Q: CORS 错误
A: 确保 `vercel.json` 已正确配置，并且已部署到 Vercel。

## 安全建议

1. **定期轮换 Token**：每 3-6 个月更换一次 `N8N_AUTH_TOKEN`
2. **限流保护**：在 Vercel 或 Cloudflare 层面配置 Rate Limiting
3. **监控日志**：定期检查异常调用

## 本地开发

本地开发时，Vercel CLI 会自动加载 `.env.local` 文件：

```bash
# 安装 Vercel CLI
npm i -g vercel

# 运行本地开发服务器（会自动运行 Serverless Functions）
vercel dev
```

创建 `.env.local`（不要提交到 Git）：
```
N8N_STT_URL=https://n8n.yourdomain.com/webhook/stt
N8N_GENERATE_URL=https://n8n.yourdomain.com/webhook/generate
N8N_AUTH_TOKEN=your_secret_token_here
```
