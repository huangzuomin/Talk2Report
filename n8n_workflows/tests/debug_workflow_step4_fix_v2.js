/**
 * Step 4 (v2): 修复 HTTP Request 节点的 jsonBody 参数
 * 方法：移除 = 前缀，将表达式字符串转换为纯 JSON 对象
 */

import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

const N8N_API_BASE = process.env.N8N_API_BASE || 'http://192.168.50.224:30109/api/v1';
const N8N_API_KEY = process.env.N8N_API_KEY;

async function fixWorkflow() {
  console.log('\n🔧 修复工作流中的 HTTP Request 节点\n');

  // 读取当前工作流
  const workflow = JSON.parse(
    fs.readFileSync('n8n_workflows/debug/current_workflow.json', 'utf-8')
  );

  const httpNodes = workflow.nodes.filter(n =>
    n.type === 'n8n-nodes-base.httpRequest'
  );

  console.log(`找到 ${httpNodes.length} 个 HTTP Request 节点\n`);

  let fixedCount = 0;

  // 修复每个 HTTP Request 节点
  workflow.nodes = workflow.nodes.map(node => {
    if (node.type === 'n8n-nodes-base.httpRequest' && node.parameters?.jsonBody) {
      const jsonBody = node.parameters.jsonBody;

      // 检查是否是字符串格式（有问题）
      if (typeof jsonBody === 'string' && jsonBody.startsWith('=')) {
        console.log(`✏️  修复节点: ${node.name}`);

        try {
          // 移除 = 前缀并解析为对象
          const jsonString = jsonBody.slice(1); // 移除开头的 =
          const parsed = JSON.parse(jsonString);

          console.log(`   ✅ 转换成功`);
          console.log(`   之前: 字符串 (${jsonBody.length} 字符), 以 = 开头`);
          console.log(`   之后: 对象 (${Object.keys(parsed).length} 个字段)`);

          // 更新节点参数 - 保持其他字段不变
          node.parameters = {
            ...node.parameters,
            jsonBody: parsed  // 使用对象而不是字符串
          };

          fixedCount++;
        } catch (error) {
          console.error(`   ❌ 转换失败: ${error.message}`);
        }
      } else if (typeof jsonBody === 'object') {
        console.log(`✅ 节点已是对象格式: ${node.name}`);
      } else {
        console.log(`⚠️  节点格式未知: ${node.name} (类型: ${typeof jsonBody})`);
      }
    }

    return node;
  });

  console.log(`\n✅ 成功修复 ${fixedCount} 个节点`);

  // 保存修复后的工作流
  const outputPath = 'n8n_workflows/debug/fixed_workflow.json';
  fs.writeFileSync(outputPath, JSON.stringify(workflow, null, 2));
  console.log(`\n💾 修复后的工作流已保存到: ${outputPath}`);

  return workflow;
}

async function updateWorkflow(workflow) {
  console.log('\n📤 更新工作流到 n8n...\n');

  const workflowId = workflow.id;

  const response = await fetch(`${N8N_API_BASE}/workflows/${workflowId}`, {
    method: 'PUT',
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(workflow)
  });

  console.log(`状态码: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update workflow: ${errorText}`);
  }

  const updated = await response.json();

  console.log(`\n✅ 工作流更新成功!`);
  console.log(`   ID: ${updated.id}`);
  console.log(`   名称: ${updated.name}`);
  console.log(`   版本: ${updated.versionId}`);

  return updated;
}

async function main() {
  try {
    // Step 1: 修复工作流
    const fixedWorkflow = await fixWorkflow();

    // Step 2: 更新到 n8n
    await updateWorkflow(fixedWorkflow);

    console.log('\n✅ Step 4 完成：工作流已修复并更新\n');

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
