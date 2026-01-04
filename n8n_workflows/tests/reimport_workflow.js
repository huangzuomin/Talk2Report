/**
 * 重新导入工作流文件
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import fs from 'fs';

const N8N_API_BASE = process.env.N8N_API_BASE || 'http://192.168.50.224:30109/api/v1';
const N8N_API_KEY = process.env.N8N_API_KEY;

async function importWorkflow(workflowData) {
  console.log('\n📤 导入工作流...');

  const response = await fetch(`${N8N_API_BASE}/workflows/import`, {
    method: 'POST',
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(workflowData)
  });

  console.log(`Status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to import workflow: ${error}`);
  }

  return await response.json();
}

async function deleteWorkflow(id) {
  console.log(`\n🗑️  删除旧工作流: ${id}`);

  const response = await fetch(`${N8N_API_BASE}/workflows/${id}`, {
    method: 'DELETE',
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json'
    }
  });

  console.log(`Status: ${response.status} ${response.statusText}`);

  if (!response.ok && response.status !== 404) {
    const error = await response.text();
    throw new Error(`Failed to delete workflow: ${error}`);
  }

  console.log('✅ 旧工作流已删除');
}

async function main() {
  try {
    console.log('🔄 重新导入工作流');
    console.log(`目标: 替换工作流 2vrVItrN5gFH0k7c`);

    // 读取本地工作流文件
    console.log('\n📥 读取本地工作流文件...');
    const workflowData = JSON.parse(fs.readFileSync('n8n_workflows/generate_workflow_v3_enhanced.json', 'utf-8'));
    console.log('✅ 工作流文件已加载');
    console.log(`   节点数: ${workflowData.nodes.length}`);

    // 删除旧工作流
    await deleteWorkflow('2vrVItrN5gFH0k7c');

    // 导入新工作流
    console.log('\n📤 导入新工作流...');
    const imported = await importWorkflow(workflowData);

    console.log('\n✅ 工作流导入成功!');
    console.log(`   ID: ${imported.id}`);
    console.log(`   名称: ${imported.name}`);

    // 测试 webhook
    console.log('\n📡 测试 Webhook...');
    const webhookTest = await fetch('https://n8n.neican.ai/webhook/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer NeicanSTT2025Secret'
      },
      body: JSON.stringify({
        session_id: "import-test-" + Date.now(),
        conversation_history: [
          { role: "assistant", content: "你好！" },
          { role: "user", content: "我完成了性能优化。" }
        ],
        preferences: {
          role: "前端工程师",
          audience: "leader",
          tone: "formal",
          length_main_chars: 500
        }
      })
    });

    console.log(`Webhook Status: ${webhookTest.status}`);
    const webhookText = await webhookTest.text();
    console.log(`Response Length: ${webhookText.length} 字符`);

    if (webhookText.length > 0) {
      console.log('\n🎉✅🎉 成功！有响应内容！');
      try {
        const webhookJson = JSON.parse(webhookText);
        console.log('\n📊 响应数据:');
        console.log(JSON.stringify(webhookJson, null, 2));
      } catch (e) {
        console.log('\n📄 响应内容:');
        console.log(webhookText);
      }
    } else {
      console.log('\n❌ 响应仍然为空');
    }

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
