# 优化 Interview Workflow 速度指南

## 🎯 目标
将响应时间从 6秒 降至 2-3秒

## 📊 当前状态
- 模型: `deepseek-chat` ✅ (已经是快模型)
- 响应时间: ~6秒
- 主要问题: 系统提示词过长 (~600字符)

## 🔧 优化步骤

### 方法1: 在 n8n UI 中修改提示词 (推荐)

1. **打开工作流**
   访问: http://192.168.50.224:30109/workflow/ZB3l0CZyO7w79Y95

2. **编辑 "Agent A - Call DeepSeek Reasoner" 节点**

3. **替换 System Prompt**

   找到 `messages[0].content` (system 角色)，替换为：

   ```
   你是年终总结访谈助手。任务：通过提问收集用户5个方面的信息：
   1. 核心成果 2. 挑战应对 3. 个人成长 4. 团队贡献 5. 未来规划

   每次只问一个简短问题，直接引导式提问。

   输出JSON格式：
   {
     "question": "下一个问题",
     "thinking": "简短分析",
     "finished": false,
     "extracted_info": {
       "achievements": "内容或null",
       "challenges": "内容或null",
       "growth": "内容或null",
       "team": "内容或null",
       "future": "内容或null"
     }
   }
   ```

4. **保存并激活工作流**

### 方法2: 导入优化版工作流

1. **导入文件**
   - 文件: `n8n_workflows/Interview_Workflow_Optimized.json`
   - 在 n8n 中: 工作流 → Import from File

2. **配置 Webhook**
   - 路径: `interview/next-step`
   - 方法: POST

3. **配置凭证**
   - 使用现有的 "DeepSeek account" 凭证

4. **激活工作流**

5. **更新环境变量** (如果路径改变了)
   ```bash
   N8N_INTERVIEW_URL=https://n8n.neican.ai/webhook/interview/next-step
   ```

## 📈 预期效果

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| 系统提示词 | ~600字符 | ~330字符 |
| 响应时间 | ~6秒 | ~2-3秒 |
| 功能完整性 | ✅ | ✅ |

## 🧪 验证优化效果

运行速度测试：
```bash
node n8n_workflows/tests/test_model_speed.js
```

期望结果：
- 第一轮: < 3秒
- 第二轮: < 3秒

## 💡 其他优化建议

如果仍然慢，可以尝试：

1. **降低 temperature**
   - 从 0.6 → 0.7 (更确定性，更快)

2. **移除 JSON 格式要求**
   - 不使用 `response_format: {type: "json_object"}`
   - 在提示词中要求 JSON 即可

3. **缓存对话历史**
   - 只发送最近 2-3 轮对话，而非全部历史

4. **使用更快的模型**
   - 如果 DeepSeek 推出更快的模型版本

## 🔄 回滚

如果需要回滚到原来的提示词：
1. 备份文件: `n8n_workflows/debug/workflow_ZB3l0CZyO7w79Y95_backup_*.json`
2. 在 n8n UI 中重新编辑提示词
3. 或重新导入原始工作流

## ✅ 检查清单

优化完成后：
- [ ] 工作流已保存
- [ ] 工作流已激活
- [ ] 运行速度测试 (< 3秒)
- [ ] 前端测试正常
- [ ] 对话质量正常
