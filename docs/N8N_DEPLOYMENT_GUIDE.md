# n8n 工作流部署指南

## 前置要求

1. **n8n 实例**
   - 可以是自托管实例 (n8n.cloud 或 Docker)
   - 也可以使用 n8n 托管服务 (n8n.cloud)

2. **DeepSeek API Key**
   - 从 https://platform.deepseek.com/ 获取
   - 确保有足够的余额 (建议至少 $5)

3. **基础配置**
   - Node.js 18+ (如果自托管)
   - npm 或 yarn

## 部署步骤

### 1. 配置 DeepSeek API Credential

在 n8n 中配置 API 凭证:

1. 打开 n8n 界面
2. 进入 **Credentials** → **Add Credential**
3. 选择 **Header Auth**
4. 配置如下:
   ```
   Name: DeepSeek API
   Name (Header): Authorization
   Value: Bearer sk-YOUR_DEEPSEEK_API_KEY
   ```
5. 保存凭证，记录下凭证 ID (格式: `DEEPSEEK_API_CREDENTIAL_ID`)

**或者使用环境变量** (推荐用于生产):
```bash
# 在 n8n 启动时设置环境变量
export DEEPSEEK_API_KEY="sk-YOUR_DEEPSEEK_API_KEY"

# Docker
docker run -it --rm \
  -e DEEPSEEK_API_KEY="sk-YOUR_DEEPSEEK_API_KEY" \
  -p 5678:5678 \
  n8nio/n8n
```

### 2. 导入工作流

#### 方法 1: 通过 n8n UI 导入

1. 打开 n8n 界面
2. 点击 **Import from File**
3. 选择以下文件:
   - `n8n_workflows/interview_workflow.json`
   - `n8n_workflows/generate_workflow.json`
4. 点击 **Import**

#### 方法 2: 通过 API 导入

```bash
# 导入访谈工作流
curl -X POST "https://your-n8n-instance.com/rest/workflows/import" \
  -H "Content-Type: application/json" \
  -d @n8n_workflows/interview_workflow.json

# 导入生成工作流
curl -X POST "https://your-n8n-instance.com/rest/workflows/import" \
  -H "Content-Type: application/json" \
  -d @n8n_workflows/generate_workflow.json
```

### 3. 更新 Credential ID

导入工作流后，需要更新 DeepSeek API credential 引用:

1. 打开每个工作流
2. 找到 **Agent A - Call DeepSeek Reasoner** 节点
3. 在 **Credentials** 部分选择刚才创建的 DeepSeek API credential
4. 对所有 HTTP Request 节点重复此步骤

### 4. 激活工作流

1. 确保工作流状态为 **Active** (蓝色开关)
2. 记录 Webhook URL:
   - Interview: `https://your-n8n-instance.com/webhook/interview/next-step`
   - Generate: `https://your-n8n-instance.com/webhook/generate`

### 5. 配置 Webhook Auth (可选)

如果需要保护 Webhook 端点，可以在 Webhook 节点中配置 Header Auth:

1. 打开 **Webhook** 节点
2. 在 **Authentication** 部分选择 **Header Auth**
3. 创建一个新的 credential:
   ```
   Name: N8N Webhook Auth
   Name (Header): Authorization
   Value: Bearer YOUR_SECRET_TOKEN
   ```
4. 更新前端 `.env.local`:
   ```bash
   VITE_N8N_AUTH_TOKEN="YOUR_SECRET_TOKEN"
   ```

### 6. 更新前端配置

在前端项目中更新 `.env.local`:

```bash
# n8n Webhook URLs
VITE_N8N_INTERVIEW_URL="https://your-n8n-instance.com/webhook/interview/next-step"
VITE_N8N_GENERATE_URL="https://your-n8n-instance.com/webhook/generate"

# n8n Auth Token (如果配置了)
VITE_N8N_AUTH_TOKEN="YOUR_SECRET_TOKEN"
```

### 7. 测试工作流

使用提供的测试脚本:

```bash
# 安装依赖 (如果需要)
npm install

# 运行测试
node n8n_workflows/tests/test_workflows.js

# 运行特定测试
node n8n_workflows/tests/test_workflows.js agent-a      # 测试 Agent A
node n8n_workflows/tests/test_workflows.js generate     # 测试 Agent B+C+D
node n8n_workflows/tests/test_workflows.js e2e          # 端到端测试
node n8n_workflows/tests/test_workflows.js perf         # 性能测试
```

### 8. 验证部署

1. 启动前端开发服务器:
   ```bash
   npm run dev
   ```

2. 访问 http://localhost:5173

3. 测试完整流程:
   - 填写用户偏好
   - 进行访谈 (3-5轮)
   - 生成报告
   - 查看结果

## Docker 部署 (推荐)

### docker-compose.yml

```yaml
version: '3.8'

services:
  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=your_password
      - DEEPSEEK_API_KEY=sk-YOUR_DEEPSEEK_API_KEY
      - WEBHOOK_URL=https://your-n8n-domain.com
    volumes:
      - n8n_data:/home/node/.n8n
    restart: unless-stopped

volumes:
  n8n_data:
```

启动:
```bash
docker-compose up -d
```

访问: https://localhost:5678

## 生产环境配置

### 1. 使用外部数据库

```bash
# PostgreSQL
export DB_TYPE=postgresdb
export DB_POSTGRESDB_HOST=postgres.example.com
export DB_POSTGRESDB_PORT=5432
export DB_POSTGRESDB_DATABASE=n8n
export DB_POSTGRESDB_USER=n8n
export DB_POSTGRESDB_PASSWORD=your_password
```

### 2. 配置队列模式 (推荐用于高并发)

```bash
# n8n 需要两个实例: worker 和 main
# Worker (处理任务)
docker run -it --rm \
  -e N8N_EMAIL=admin@example.com \
  -e DEEPSEEK_API_KEY=sk-YOUR_KEY \
  n8nio/n8n worker

# Main (处理 Webhook 和 UI)
docker run -it --rm \
  -p 5678:5678 \
  -e N8N_EMAIL=admin@example.com \
  -e DEEPSEEK_API_KEY=sk-YOUR_KEY \
  n8nio/n8n
```

### 3. 启用执行日志

```bash
export EXECUTIONS_DATA_SAVE_ON_ERROR=all
export EXECUTIONS_DATA_SAVE_ON_SUCCESS=all
export EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS=true
```

### 4. 配置速率限制

在 Webhook 节点中配置:
- **Rate Limit**: 10 requests per minute
- **Burst**: 5 requests

## 监控和调试

### 1. 查看执行日志

在 n8n UI 中:
1. 进入 **Executions**
2. 点击任意执行记录
3. 查看每个节点的输入/输出

### 2. 启用调试模式

```bash
export N8N_LOG_LEVEL=debug
export N8N_LOG_OUTPUT=console
```

### 3. 监控性能

在 n8n UI 中查看:
- **Executions** → 查看每个工作流的执行时间
- **Dashboard** → 查看整体统计

## 故障排除

### 问题 1: Webhook 404

**原因**: Webhook URL 配置错误

**解决方案**:
1. 检查 `WEBHOOK_URL` 环境变量
2. 确保 Webhook 节点路径正确
3. 检查 n8n 实例的公网访问

### 问题 2: DeepSeek API 调用失败

**原因**: API Key 无效或余额不足

**解决方案**:
1. 验证 API Key: `curl https://api.deepseek.com/v1/models`
2. 检查余额: https://platform.deepseek.com/
3. 确保 n8n credential 配置正确

### 问题 3: 工作流执行超时

**原因**: DeepSeek API 响应时间过长

**解决方案**:
1. 在 HTTP Request 节点中增加超时时间: **Options** → **Timeout**: 120000 (2分钟)
2. 检查网络连接
3. 考虑使用队列模式

### 问题 4: 质量评分始终 < 80

**原因**: Agent D 评分标准过严或 Agent C 生成的质量不佳

**解决方案**:
1. 调整 Agent D 的评分阈值
2. 优化 Agent C 的 system prompt
3. 检查 Agent B 提取的数据是否完整

### 问题 5: 前端无法连接 n8n

**原因**: CORS 或网络问题

**解决方案**:
1. 在 n8n 中配置 CORS: `export N8N_EDITOR_BASE_URL=https://your-frontend.com`
2. 检查防火墙设置
3. 确认 Webhook URL 可从前端访问

## 成本估算

基于 DeepSeek 定价 (2025年1月):

### DeepSeek Chat
- Input: ¥1/M tokens
- Output: ¥2/M tokens

### DeepSeek Reasoner
- Input: ¥1/M tokens (reasoning_content 免费)
- Output: ¥2/M tokens

### 单次报告生成成本估算

- Agent A (10轮访谈): ~5K tokens = ¥0.01
- Agent B (提取): ~2K tokens = ¥0.004
- Agent C (3个版本): ~6K tokens = ¥0.012
- Agent D (验证): ~1K tokens = ¥0.002
- 重写循环 (1-2次): ~¥0.02-0.04

**总计**: ¥0.05-0.07 / 每份报告 (约 $0.007-0.01)

### 月度成本估算

假设 1000 份报告/月:
- 成本: ¥50-70/月 (约 $7-10/月)

## 下一步

1. ✅ 部署 n8n 工作流
2. ✅ 运行测试验证
3. ⏳ 配置生产环境 (数据库、队列)
4. ⏳ 设置监控和告警
5. ⏳ 性能优化和调优
6. ⏳ 部署到生产环境

## 相关文档

- [n8n 官方文档](https://docs.n8n.io/)
- [DeepSeek API 文档](https://platform.deepseek.com/docs)
- [工作流架构设计](./N8N_WORKFLOW_ARCHITECTURE.md)
- [测试脚本说明](../n8n_workflows/tests/test_workflows.js)
