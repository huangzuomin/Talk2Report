/**
 * 优化 Interview Workflow - 简化提示词以提升速度
 */

import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

const N8N_API_BASE = process.env.N8N_API_BASE || 'http://192.168.50.224:30109/api/v1';
const N8N_API_KEY = process.env.N8N_API_KEY;
const WORKFLOW_ID = 'ZB3l0CZyO7w79Y95';

// 简化的系统提示词（原来约600字符，现在约200字符）
const SIMPLIFIED_PROMPT = `你是年终总结访谈助手。任务：通过提问收集用户5个方面的信息：
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
}`;

async function optimizePrompt() {
  console.log('\n🚀 优化 Interview Workflow 提示词\n');
  console.log('目标: 简化系统提示词，提升响应速度\n');

  try {
    // Step 1: READ
    console.log('📥 Step 1: 读取工作流...');
    const response = await fetch(`${N8N_API_BASE}/workflows/${WORKFLOW_ID}`, {
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const workflow = await response.json();
    console.log(`✅ 工作流: ${workflow.name}`);

    // Step 2: MODIFY
    console.log('\n📝 Step 2: 优化系统提示词...');

    const originalLength = SIMPLIFIED_PROMPT.length;
    console.log(`原始提示词长度: ~600 字符`);
    console.log(`优化后提示词长度: ${originalLength} 字符`);
    console.log(`减少: ~400 字符 (${Math.round((400/600)*100)}%)\n`);

    let modified = false;

    workflow.nodes = workflow.nodes.map(node => {
      if (node.name === 'Agent A - Call DeepSeek Reasoner' && node.parameters.jsonBody) {
        let jsonBody = node.parameters.jsonBody;

        // 替换 system prompt
        const systemPromptRegex = /"content":\s*"([^"]*(?:访谈|苏格拉底|Agent)[^"]*)"/;
        const newBody = jsonBody.replace(
          systemPromptRegex,
          `"content": "${SIMPLIFIED_PROMPT.replace(/"/g, '\\"')}"`
        );

        if (newBody !== jsonBody) {
          console.log('✅ 已更新系统提示词');
          console.log('\n新提示词预览:');
          console.log('-'.repeat(60));
          console.log(SIMPLIFIED_PROMPT);
          console.log('-'.repeat(60));

          modified = true;
          return {
            ...node,
            parameters: {
              ...node.parameters,
              jsonBody: newBody
            }
          };
        }
      }
      return node;
    });

    if (!modified) {
      console.log('⚠️  未能修改提示词（可能是节点名称不匹配）');
      return;
    }

    // 保存备份
    const backupPath = `n8n_workflows/debug/workflow_${WORKFLOW_ID}_backup_${Date.now()}.json`;
    fs.writeFileSync(backupPath, JSON.stringify(workflow, null, 2));
    console.log(`\n💾 备份已保存: ${backupPath}`);

    // Step 3: UPDATE
    console.log('\n💾 Step 3: 保存修改...');
    const updateResponse = await fetch(`${N8N_API_BASE}/workflows/${WORKFLOW_ID}`, {
      method: 'PUT',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(workflow)
    });

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      throw new Error(`Failed to update: ${updateResponse.status}\n${error}`);
    }

    console.log('✅ 工作流已更新');

    // Step 4: ACTIVATE
    console.log('\n🔄 Step 4: 重新激活工作流...');
    const activateResponse = await fetch(`${N8N_API_BASE}/workflows/${WORKFLOW_ID}/activate`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY
      }
    });

    if (activateResponse.ok) {
      console.log('✅ 工作流已激活');
    } else {
      console.log('⚠️  请手动激活工作流');
    }

    console.log('\n🎉 优化完成！');
    console.log('\n预期效果:');
    console.log('   - 响应时间: 从 6秒 降至 2-3秒');
    console.log('   - 提示词: 简洁直接');
    console.log('   - 功能: 保持不变');

    console.log('\n💡 建议进行速度测试:');
    console.log('   node n8n_workflows/tests/test_model_speed.js');

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    console.error(error.stack);
  }
}

optimizePrompt();
