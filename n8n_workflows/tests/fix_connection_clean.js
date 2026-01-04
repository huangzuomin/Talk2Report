/**
 * 清理工作流数据并更新 - 只发送必需字段
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
    method: 'PUT',
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
    console.log('🔧 修复工作流连接（清理版本）');
    console.log(`工作流 ID: 2vrVItrN5gFH0k7c`);

    // 获取工作流
    const workflow = await getWorkflow('2vrVItrN5gFH0k7c');

    // 查找节点
    const prepareWarningNode = workflow.nodes.find(n => n.name === 'Prepare Warning Response');
    const returnWarningNode = workflow.nodes.find(n => n.name === 'Return with Warning');

    console.log('\n📍 找到节点:');
    console.log(`   Prepare Warning Response: ${prepareWarningNode?.id}`);
    console.log(`   Return with Warning: ${returnWarningNode?.id}`);

    // 修复连接
    console.log('\n🔧 修复连接...');
    workflow.connections['Prepare Warning Response'] = {
      main: [[{
        node: returnWarningNode.id,
        type: 'main',
        index: 0
      }]]
    };

    // 清理工作流数据，只保留必需字段
    const cleanedWorkflow = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings || {},
      staticData: workflow.staticData || null,
      pinData: workflow.pinData || {},
      meta: workflow.meta || {}
    };

    console.log('✅ 数据已清理');
    console.log(`   节点数: ${cleanedWorkflow.nodes.length}`);
    console.log(`   连接数: ${Object.keys(cleanedWorkflow.connections).length}`);

    // 更新工作流
    console.log('\n📤 上传更新后的工作流...');
    const updated = await updateWorkflow('2vrVItrN5gFH0k7c', cleanedWorkflow);
    console.log('✅ 工作流已更新');

    // 触发测试
    console.log('\n▶️  触发测试执行...');
    const triggerResp = await fetch(`${N8N_API_BASE}/executions`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        workflowId: '2vrVItrN5gFH0k7c',
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

    if (!triggerResp.ok) {
      throw new Error(`Failed to trigger: ${triggerResp.status}`);
    }

    const execution = await triggerResp.json();
    console.log(`✅ 测试已触发: ${execution.id}`);

    // 轮询执行状态
    console.log('\n⏳ 等待执行完成...');
    const finalExec = await pollExecution(execution.id);

    console.log('\n✅ 执行完成:');
    console.log(`   状态: ${finalExec.status}`);
    console.log(`   开始: ${finalExec.startedAt}`);
    console.log(`   停止: ${finalExec.stoppedAt}`);

    // 通过 webhook 测试
    console.log('\n📡 通过 Webhook 测试...');
    const webhookTest = await fetch('https://n8n.neican.ai/webhook/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer NeicanSTT2025Secret'
      },
      body: JSON.stringify({
        session_id: "webhook-test-" + Date.now(),
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
      console.log('\n✅✅✅ 有响应！工作流修复成功！');
      try {
        const webhookJson = JSON.parse(webhookText);
        console.log('\n📊 响应数据:');
        console.log(JSON.stringify(webhookJson, null, 2).slice(0, 1000));
      } catch (e) {
        console.log('\n📄 响应内容（前500字符）:');
        console.log(webhookText.slice(0, 500));
      }
    } else {
      console.log('\n⚠️  响应仍然为空，可能还有其他问题');
    }

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
