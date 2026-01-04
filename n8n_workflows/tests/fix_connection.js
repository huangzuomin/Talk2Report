/**
 * 修复工作流连接 - 确保所有分支都连接到响应节点
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
        session_id: "fix-test-" + Date.now(),
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

async function pollExecution(executionId, maxAttempts = 120) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 1000));

    const response = await fetch(`${N8N_API_BASE}/executions/${executionId}`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });

    if (!response.ok) continue;

    const exec = await response.json();

    if (i % 10 === 0 || exec.finished) {
      console.log(`[${i + 1}/${maxAttempts}] 状态: ${exec.status}, 完成: ${exec.finished}`);
    }

    if (exec.finished) {
      return exec;
    }
  }

  throw new Error('Polling timeout');
}

async function main() {
  try {
    console.log('🔧 修复工作流连接');
    console.log(`工作流 ID: 2vrVItrN5gFH0k7c`);

    // 获取远程工作流
    const workflow = await getWorkflow('2vrVItrN5gFH0k7c');

    // 查找节点
    const nodes = workflow.nodes;
    const prepareWarningNode = nodes.find(n => n.name === 'Prepare Warning Response');
    const returnWarningNode = nodes.find(n => n.name === 'Return with Warning');

    console.log('\n📍 找到节点:');
    console.log(`   Prepare Warning Response: ${prepareWarningNode ? '✅' : '❌'} (ID: ${prepareWarningNode?.id})`);
    console.log(`   Return with Warning: ${returnWarningNode ? '✅' : '❌'} (ID: ${returnWarningNode?.id})`);

    if (!prepareWarningNode || !returnWarningNode) {
      console.log('\n❌ 节点不存在，无法修复');
      return;
    }

    // 检查当前连接
    const currentConn = workflow.connections['Prepare Warning Response'];
    console.log('\n🔗 当前连接:');
    if (currentConn && currentConn.main) {
      console.log(`   主输出: ${currentConn.main.length} 个分支`);
      currentConn.main.forEach((branch, i) => {
        console.log(`   分支 ${i}: ${branch.map(t => t.node).join(', ')}`);
      });
    } else {
      console.log(`   ❌ 没有输出连接!`);
    }

    // 修复连接
    console.log('\n🔧 修复连接...');
    console.log(`   Prepare Warning Response → Return with Warning`);

    // 确保连接对象存在
    if (!workflow.connections['Prepare Warning Response']) {
      workflow.connections['Prepare Warning Response'] = {};
    }
    if (!workflow.connections['Prepare Warning Response'].main) {
      workflow.connections['Prepare Warning Response'].main = [];
    }

    // 设置连接
    workflow.connections['Prepare Warning Response'].main = [[{
      node: returnWarningNode.id,
      type: 'main',
      index: 0
    }]];

    console.log('✅ 连接已配置');

    // 更新工作流
    console.log('\n📤 上传更新后的工作流...');
    const updated = await updateWorkflow('2vrVItrN5gFH0k7c', {
      connections: workflow.connections
    });

    console.log('✅ 工作流已更新');
    console.log(`   ID: ${updated.id}`);
    console.log(`   更新时间: ${updated.updatedAt}`);

    // 触发测试
    console.log('\n▶️  触发测试执行...');
    const execution = await triggerTest('2vrVItrN5gFH0k7c');
    console.log(`✅ 测试已触发: ${execution.id}`);

    // 轮询执行状态
    console.log('\n⏳ 等待执行完成（最多120秒）...');
    const finalExec = await pollExecution(execution.id);

    console.log('\n✅ 执行完成:');
    console.log(`   状态: ${finalExec.status}`);
    console.log(`   开始: ${finalExec.startedAt}`);
    console.log(`   停止: ${finalExec.stoppedAt}`);

    if (finalExec.status === 'success') {
      console.log('\n🎉 测试成功！工作流修复完成');
    } else if (finalExec.status === 'error') {
      console.log('\n⚠️  执行失败');
      if (finalExec.data) {
        console.log('错误数据:', JSON.stringify(finalExec.data, null, 2).slice(0, 1000));
      }
    }

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
