/**
 * n8n API Client - 修复 Webhook Path
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const N8N_API_BASE = process.env.N8N_API_BASE || 'http://192.168.50.224:30109/api/v1';
const N8N_API_KEY = process.env.N8N_API_KEY;

async function getWorkflows() {
  console.log(`\n📡 获取工作流列表...`);
  console.log(`URL: ${N8N_API_BASE}/workflows`);

  const response = await fetch(`${N8N_API_BASE}/workflows`, {
    method: 'GET',
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json'
    }
  });

  console.log(`Status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get workflows: ${error}`);
  }

  const data = await response.json();
  return data.data || data;
}

async function getWorkflow(id) {
  console.log(`\n📋 获取工作流详情: ${id}`);

  const response = await fetch(`${N8N_API_BASE}/workflows/${id}`, {
    method: 'GET',
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get workflow: ${error}`);
  }

  return await response.json();
}

async function updateWorkflow(id, workflowData) {
  console.log(`\n🔧 更新工作流: ${id}`);

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

async function triggerExecution(workflowId) {
  console.log(`\n▶️  触发测试执行: ${workflowId}`);

  const response = await fetch(`${N8N_API_BASE}/executions`, {
    method: 'POST',
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      workflowId: workflowId,
      data: {}  // 空数据，只测试执行
    })
  });

  console.log(`Status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to trigger execution: ${error}`);
  }

  return await response.json();
}

async function getExecution(executionId) {
  console.log(`\n📊 查询执行状态: ${executionId}`);

  const response = await fetch(`${N8N_API_BASE}/executions/${executionId}`, {
    method: 'GET',
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get execution: ${error}`);
  }

  return await response.json();
}

async function pollExecution(executionId, maxAttempts = 30) {
  console.log(`\n⏳ 轮询执行状态...`);

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 1000));

    const exec = await getExecution(executionId);

    console.log(`[${i + 1}/${maxAttempts}] 状态: ${exec.status}, 完成: ${exec.finished}`);

    if (exec.finished) {
      return exec;
    }
  }

  throw new Error('Execution polling timeout');
}

async function main() {
  try {
    console.log('🚀 开始修复 n8n Webhook Path');
    console.log(`API Base: ${N8N_API_BASE}`);
    console.log(`API Key: ${N8N_API_KEY.slice(0, 20)}...`);

    // 步骤 1: 获取工作流列表
    const workflows = await getWorkflows();
    console.log(`\n✅ 找到 ${workflows.length} 个工作流`);

    // 查找 v3.0 Enhanced 工作流
    const targetWorkflow = workflows.find(w =>
      w.name?.includes('v3.0') ||
      w.name?.includes('Enhanced') ||
      w.name?.includes('Generate Report')
    );

    if (!targetWorkflow) {
      console.log('\n❌ 未找到 v3.0 Enhanced 工作流');
      console.log('工作流列表:');
      workflows.forEach((w, i) => {
        console.log(`  ${i + 1}. ${w.name} (ID: ${w.id})`);
      });
      return;
    }

    console.log(`\n✅ 找到目标工作流:`);
    console.log(`   名称: ${targetWorkflow.name}`);
    console.log(`   ID: ${targetWorkflow.id}`);
    console.log(`   Active: ${targetWorkflow.active}`);

    // 步骤 2: 获取工作流详情
    const workflowDetail = await getWorkflow(targetWorkflow.id);

    // 查找 Webhook 节点
    const webhookNode = workflowDetail.nodes?.find(n =>
      n.type === 'n8n-nodes-base.webhook' ||
      n.name?.includes('Webhook')
    );

    if (!webhookNode) {
      console.log('\n❌ 未找到 Webhook 节点');
      return;
    }

    console.log(`\n✅ 找到 Webhook 节点:`);
    console.log(`   节点名称: ${webhookNode.name}`);
    console.log(`   当前路径: ${webhookNode.parameters?.path || '(未设置)'}`);
    console.log(`   Webhook ID: ${webhookNode.webhookId}`);

    const currentPath = webhookNode.parameters?.path;

    // 检查是否需要修改
    if (currentPath === 'generate') {
      console.log('\n✅ Webhook path 已经是 "generate"，无需修改');
      return;
    }

    // 步骤 3: 更新 Webhook path
    console.log(`\n🔧 更新 Webhook path: "${currentPath}" → "generate"`);

    webhookNode.parameters.path = 'generate';

    const updatedWorkflow = await updateWorkflow(targetWorkflow.id, {
      nodes: workflowDetail.nodes
    });

    console.log(`\n✅ 工作流已更新`);
    console.log(`   ID: ${updatedWorkflow.id}`);

    // 步骤 4: 触发测试执行
    console.log('\n▶️  触发测试执行...');
    const execution = await triggerExecution(targetWorkflow.id);
    console.log(`✅ 执行已触发: ${execution.id}`);

    // 步骤 5: 轮询执行状态
    console.log('\n⏳ 等待执行完成...');
    const finalExec = await pollExecution(execution.id);
    console.log(`\n✅ 执行完成:`);
    console.log(`   状态: ${finalExec.status}`);
    console.log(`   开始时间: ${finalExec.startedAt}`);
    console.log(`   停止时间: ${finalExec.stoppedAt}`);
    console.log(`   耗时: ${finalExec.finishedAt ? new Date(finalExec.finishedAt).getTime() - new Date(finalExec.startedAt).getTime() : 0}ms`);

    // 检查执行结果
    if (finalExec.status === 'success') {
      console.log('\n🎉 测试执行成功！');
    } else if (finalExec.status === 'error') {
      console.log('\n⚠️  测试执行失败');
      console.log('错误数据:', finalExec.data);

      // 查看错误节点的输出
      if (finalExec.data?.resultData) {
        console.log('\n错误详情:');
        console.log(JSON.stringify(finalExec.data.resultData, null, 2));
      }
    } else {
      console.log(`\n⚠️  执行状态: ${finalExec.status}`);
    }

    console.log('\n✅ 修复流程完成');

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
