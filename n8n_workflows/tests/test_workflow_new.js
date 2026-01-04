/**
 * 测试工作流 ZB3l0CZyO7w79Y95
 */

import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

const N8N_API_BASE = process.env.N8N_API_BASE || 'http://192.168.50.224:30109/api/v1';
const N8N_API_KEY = process.env.N8N_API_KEY;

async function getWorkflow(workflowId) {
  console.log(`\n📥 读取工作流: ${workflowId}`);

  const response = await fetch(`${N8N_API_BASE}/workflows/${workflowId}`, {
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed: ${response.status}`);
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
    const workflow = await getWorkflow('ZB3l0CZyO7w79Y95');

    // 查找 webhook 节点
    const webhookNode = workflow.nodes.find(n =>
      n.type === 'n8n-nodes-base.webhook'
    );

    if (webhookNode) {
      console.log('\n📡 Webhook 节点信息:');
      console.log(`   名称: ${webhookNode.name}`);
      console.log(`   路径: ${webhookNode.parameters?.path || 'N/A'}`);
      console.log(`   HTTP 方法: ${webhookNode.parameters?.httpMethod || 'GET'}`);
      console.log(`   响应模式: ${webhookNode.parameters?.responseMode || 'N/A'}`);

      // 构建测试 URL
      const webhookPath = webhookNode.parameters?.path;
      if (webhookPath) {
        const webhookUrl = `https://n8n.neican.ai/webhook/${webhookPath}`;
        console.log(`\n🌐 Webhook URL: ${webhookUrl}`);
        console.log(`\n💡 测试命令:`);
        console.log(`   curl -X POST ${webhookUrl} \\`);
        console.log(`     -H "Content-Type: application/json" \\`);
        console.log(`     -H "Authorization: Bearer ${process.env.N8N_AUTH_TOKEN || 'YOUR_TOKEN'}" \\`);
        console.log(`     -d '{"test": true}'`);
      }
    } else {
      console.log('\n❌ 未找到 Webhook 节点');
      console.log('   这个工作流可能不是通过 webhook 触发的');
    }

    // 分析节点类型
    console.log('\n\n📊 节点类型统计:');
    const nodeTypes = {};
    workflow.nodes.forEach(node => {
      nodeTypes[node.type] = (nodeTypes[node.type] || 0) + 1;
    });

    Object.entries(nodeTypes).forEach(([type, count]) => {
      const typeName = type.split('n8n-nodes-base.').pop() || type;
      console.log(`   ${typeName}: ${count} 个`);
    });

    // 保存工作流
    fs.writeFileSync('n8n_workflows/debug/workflow_ZB3l0CZyO7w79Y95.json', JSON.stringify(workflow, null, 2));
    console.log('\n💾 工作流已保存到: n8n_workflows/debug/workflow_ZB3l0CZyO7w79Y95.json');

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
  }
}

main();
