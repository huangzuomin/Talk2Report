/**
 * Step 4: 修复 HTTP Request 节点的 jsonBody 参数
 */

import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

const N8N_API_BASE = process.env.N8N_API_BASE || 'http://192.168.50.224:30109/api/v1';
const N8N_API_KEY = process.env.N8N_API_KEY;

// 修复函数：将字符串格式的 jsonBody 转换为对象格式
function fixJsonBody(jsonBodyString) {
  // 移除开头的 "=" 和引号
  const cleaned = jsonBodyString
    .replace(/^="/, '')
    .replace(/"$/, '')
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"');

  // 解析为对象
  const parsed = JSON.parse(cleaned);
  return parsed;
}

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
          // 转换为对象格式
          const fixedBody = fixJsonBody(jsonBody);

          console.log(`   之前: 字符串格式 (${jsonBody.length} 字符)`);
          console.log(`   之后: 对象格式`);

          // 更新节点参数
          node.parameters = {
            ...node.parameters,
            jsonBody: fixedBody
          };

          fixedCount++;
        } catch (error) {
          console.error(`   ❌ 修复失败: ${error.message}`);
          console.log(`   jsonBody 前100字符: ${jsonBody.slice(0, 100)}`);
        }
      } else {
        console.log(`✅ 节点已是对象格式: ${node.name}`);
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

  console.log(`状态码: ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update workflow: ${response.status} ${response.statusText}\n${errorText}`);
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

    // Step 2: 确认更新
    console.log('\n⚠️  准备将修复后的工作流更新到 n8n');
    console.log('   这将替换当前的工作流配置');

    // 直接更新（用户已授权调试）
    await updateWorkflow(fixedWorkflow);

    console.log('\n✅ Step 4 完成：工作流已修复并更新');

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
