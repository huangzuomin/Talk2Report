/**
 * 修复 Active 工作流 - 完整诊断和修复
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const N8N_API_BASE = process.env.N8N_API_BASE || 'http://192.168.50.224:30109/api/v1';
const N8N_API_KEY = process.env.N8N_API_KEY;

async function getWorkflow(id) {
  const response = await fetch(`${N8N_API_BASE}/workflows/${id}`, {
    method: 'GET',
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to get workflow: ${response.status}`);
  }

  return await response.json();
}

async function updateWorkflow(id, workflowData) {
  console.log(`\n🔧 更新工作流...`);

  const response = await fetch(`${N8N_API_BASE}/workflows/${id}`, {
    method: 'PATCH',
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(workflowData)
  });

  console.log(`Status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update workflow: ${error}`);
  }

  return await response.json();
}

async function triggerTest(workflowId) {
  const response = await fetch(`${N8N_API_BASE}/executions`, {
    method: 'POST',
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      workflowId: workflowId,
      data: {
        session_id: "test-fix-" + Date.now(),
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
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to trigger: ${response.status}`);
  }

  return await response.json();
}

async function pollExecution(executionId, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 1000));

    const response = await fetch(`${N8N_API_BASE}/executions/${executionId}`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });

    if (!response.ok) continue;

    const exec = await response.json();

    console.log(`[${i + 1}/${maxAttempts}] 状态: ${exec.status}, 完成: ${exec.finished}`);

    if (exec.finished) {
      return exec;
    }
  }

  throw new Error('Polling timeout');
}

function analyzeWorkflow(workflow) {
  console.log('\n📊 工作流分析:');
  console.log(`   名称: ${workflow.name}`);
  console.log(`   节点数: ${workflow.nodes?.length || 0}`);
  console.log(`   连接数: ${Object.keys(workflow.connections || {}).length}`);

  // 查找所有节点
  const nodes = workflow.nodes || [];

  console.log('\n📍 节点列表:');
  nodes.forEach((node, i) => {
    console.log(`   ${i + 1}. ${node.name} (${node.type})`);
    console.log(`      ID: ${node.id}`);
    if (node.type === 'n8n-nodes-base.webhook') {
      console.log(`      Path: ${node.parameters?.path}`);
      console.log(`      Webhook ID: ${node.webhookId}`);
    }
    if (node.type === 'n8n-nodes-base.respondToWebhook') {
      console.log(`      ✅ 响应节点!`);
      console.log(`      respondWith: ${node.parameters?.respondWith}`);
    }
  });

  // 分析连接
  const connections = workflow.connections || {};
  console.log('\n🔗 连接分析:');

  Object.entries(connections).forEach(([sourceNode, connData]) => {
    console.log(`\n   从 "${sourceNode}":`);

    if (connData.main) {
      connData.main.forEach((branches, branchIndex) => {
        console.log(`      分支 ${branchIndex}:`);
        branches.forEach(target => {
          console.log(`        → ${target.node} (${target.type})`);
        });
      });
    }
  });

  // 查找 Respond to Webhook 节点
  const respondNodes = nodes.filter(n => n.type === 'n8n-nodes-base.respondToWebhook');
  console.log(`\n✅ 找到 ${respondNodes.length} 个响应节点:`);
  respondNodes.forEach(n => {
    console.log(`   - ${n.name} (ID: ${n.id})`);
  });

  // 检查是否有响应节点未被连接
  const allConnectedTargets = new Set();
  Object.values(connections).forEach(connData => {
    if (connData.main) {
      connData.main.forEach(branches => {
        branches.forEach(target => {
          allConnectedTargets.add(target.node);
        });
      });
    }
  });

  const orphanRespondNodes = respondNodes.filter(n => !allConnectedTargets.has(n.name));
  if (orphanRespondNodes.length > 0) {
    console.log(`\n⚠️  发现 ${orphanRespondNodes.length} 个未连接的响应节点:`);
    orphanRespondNodes.forEach(n => {
      console.log(`   - ${n.name}`);
    });
  }

  return { nodes, connections, respondNodes };
}

async function main() {
  try {
    console.log('🔧 开始修复 Active 工作流');
    console.log(`工作流 ID: 2vrVItrN5gFH0k7c`);

    // 步骤 1: 获取完整工作流
    console.log('\n📥 步骤 1: 获取工作流配置...');
    const workflow = await getWorkflow('2vrVItrN5gFH0k7c');
    console.log('✅ 工作流配置已获取');

    // 步骤 2: 分析工作流
    console.log('\n🔍 步骤 2: 分析工作流...');
    const analysis = analyzeWorkflow(workflow);

    // 步骤 3: 检查问题
    console.log('\n🔍 步骤 3: 检查问题...');

    // 检查是否有错误处理分支未连接到响应节点
    const ifNodes = analysis.nodes.filter(n => n.type === 'n8n-nodes-base.if');
    console.log(`\n✅ 找到 ${ifNodes.length} 个 IF 节点:`);

    let needsFix = false;
    const fixes = [];

    ifNodes.forEach(ifNode => {
      const connections = workflow.connections[ifNode.name];
      if (connections && connections.main) {
        connections.main.forEach((branch, index) => {
          branch.forEach(target => {
            const targetNode = analysis.nodes.find(n => n.id === target.node);
            if (targetNode && targetNode.type !== 'n8n-nodes-base.respondToWebhook') {
              // 检查这个分支是否最终会到达响应节点
              console.log(`\n   IF 节点 "${ifNode.name}" 分支 ${index}:`);
              console.log(`      → ${targetNode.name} (${targetNode.type})`);

              if (targetNode.type === 'n8n-nodes-base.set' ||
                  targetNode.type === 'n8n-nodes-base.code') {
                console.log(`      ⚠️  可能需要连接到响应节点`);
              }
            }
          });
        });
      }
    });

    // 检查工作流是否正常结束
    console.log('\n🔍 步骤 4: 检查工作流终点...');

    // 查找所有没有输出的节点（应该是响应节点）
    const endNodes = analysis.nodes.filter(node => {
      const connections = workflow.connections[node.name];
      return !connections || !connections.main || connections.main.length === 0;
    });

    console.log(`\n🏁 终点节点 (${endNodes.length} 个):`);
    endNodes.forEach(node => {
      console.log(`   - ${node.name} (${node.type})`);
    });

    const respondToEnd = endNodes.filter(n => n.type === 'n8n-nodes-base.respondToWebhook');
    if (respondToEnd.length === 0) {
      console.log('\n❌ 问题: 没有响应节点在终点!');
      console.log('   这解释了为什么返回空响应');
      needsFix = true;
    }

    // 尝试诊断具体问题
    console.log('\n🔍 步骤 5: 深入诊断...');

    // 检查 "Check Validation" 节点
    const checkValidationNode = analysis.nodes.find(n => n.name === 'Check Validation');
    if (checkValidationNode) {
      const conn = workflow.connections['Check Validation'];
      console.log('\n📍 Check Validation 连接:');
      if (conn && conn.main) {
        conn.main.forEach((branch, index) => {
          console.log(`   分支 ${index}:`);
          branch.forEach(target => {
            const targetNode = analysis.nodes.find(n => n.id === target.node);
            console.log(`      → ${targetNode.name} (${targetNode.type})`);
          });
        });
      }
    }

    // 检查 "Check Quality Score" 节点
    const checkQualityNode = analysis.nodes.find(n => n.name === 'Check Quality Score');
    if (checkQualityNode) {
      const conn = workflow.connections['Check Quality Score'];
      console.log('\n📍 Check Quality Score 连接:');
      if (conn && conn.main) {
        conn.main.forEach((branch, index) => {
          console.log(`   分支 ${index}:`);
          branch.forEach(target => {
            const targetNode = analysis.nodes.find(n => n.id === target.node);
            console.log(`      → ${targetNode.name} (${targetNode.type})`);
          });
        });
      }
    }

    // 输出诊断报告
    console.log('\n' + '='.repeat(70));
    console.log('📋 诊断报告');
    console.log('='.repeat(70));
    console.log('\n问题: 工作流执行但返回空响应');
    console.log('\n可能原因:');
    console.log('1. 响应节点存在但未连接到某些分支');
    console.log('2. 某些错误分支没有连接到响应节点');
    console.log('3. Respond to Webhook 节点配置问题');

    console.log('\n建议修复方案:');
    console.log('由于 API 无法完全诊断连接问题，建议在 n8n UI 中检查:');
    console.log('1. 打开工作流编辑器');
    console.log('2. 查看 "Check Validation" 节点的 FALSE 分支');
    console.log('3. 查看 "Check Quality Score" 节点的两个分支');
    console.log('4. 确保所有分支都最终连接到 "Respond to Webhook" 节点');

    // 尝试查看原始工作流文件来对比
    console.log('\n🔍 步骤 6: 对比原始配置...');

    // 读取本地工作流文件
    const fs = await import('fs');
    const localWorkflow = JSON.parse(fs.readFileSync('n8n_workflows/generate_workflow_v3_enhanced.json', 'utf-8'));

    console.log('\n✅ 本地工作流文件加载成功');
    console.log(`   本地节点数: ${localWorkflow.nodes?.length || 0}`);
    console.log(`   远程节点数: ${workflow.nodes?.length || 0}`);

    // 如果节点数不匹配，需要重新导入
    if (localWorkflow.nodes?.length !== workflow.nodes?.length) {
      console.log('\n⚠️  节点数不匹配!');
      console.log('   可能导入时出现问题');
      console.log('   建议: 重新导入工作流文件');
    }

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
