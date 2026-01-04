/**
 * Step 1: 读取工作流当前状态
 */

import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

const N8N_API_BASE = process.env.N8N_API_BASE || 'http://192.168.50.224:30109/api/v1';
const N8N_API_KEY = process.env.N8N_API_KEY;

async function getWorkflow(workflowId) {
  console.log(`\n📥 正在读取工作流: ${workflowId}`);

  const response = await fetch(`${N8N_API_BASE}/workflows/${workflowId}`, {
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch workflow: ${response.status} ${response.statusText}`);
  }

  const workflow = await response.json();

  console.log(`✅ 成功读取工作流`);
  console.log(`   名称: ${workflow.name}`);
  console.log(`   节点数: ${workflow.nodes.length}`);
  console.log(`   活跃状态: ${workflow.active ? '✅ 激活' : '❌ 未激活'}`);
  console.log(`   ID: ${workflow.id}`);

  return workflow;
}

async function main() {
  try {
    const workflowId = 'D05OBJW6XTAgOJjo';
    const workflow = await getWorkflow(workflowId);

    // 保存到文件以便分析
    const outputPath = 'n8n_workflows/debug/current_workflow.json';
    fs.writeFileSync(outputPath, JSON.stringify(workflow, null, 2));
    console.log(`\n💾 工作流已保存到: ${outputPath}`);

    // 返回工作流数据供后续步骤使用
    return workflow;
  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    process.exit(1);
  }
}

main();
