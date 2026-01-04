/**
 * 检查新工作流的执行记录
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const N8N_API_BASE = process.env.N8N_API_BASE || 'http://192.168.50.224:30109/api/v1';
const N8N_API_KEY = process.env.N8N_API_KEY;

async function getExecutions(workflowId) {
  const response = await fetch(`${N8N_API_BASE}/executions?workflowId=${workflowId}&limit=10`, {
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed: ${response.status}`);
  }

  return await response.json();
}

async function main() {
  try {
    console.log('🔍 检查新工作流执行记录');
    console.log(`Workflow ID: D05OBJW6XTAgOJjo`);

    const executions = await getExecutions('D05OBJW6XTAgOJjo');

    console.log(`\n✅ 找到 ${executions.data?.length || 0} 条执行记录`);

    if (!executions.data || executions.data.length === 0) {
      console.log('\n❌ 没有执行记录，工作流可能从未被触发');
      console.log('\n💡 建议：在 n8n UI 中手动测试工作流');
      return;
    }

    console.log('\n📋 执行记录:');
    executions.data.forEach((exec, i) => {
      console.log(`\n${i + 1}. ID: ${exec.id}`);
      console.log(`   状态: ${exec.status}`);
      console.log(`   开始: ${exec.startedAt}`);
      console.log(`   停止: ${exec.stoppedAt || '(进行中)'}`);
      console.log(`   等待时间: ${new Date(exec.stoppedAt || Date.now()).getTime() - new Date(exec.startedAt).getTime()}ms`);
    });

    // 检查是否有成功的执行
    const successExecs = executions.data.filter(e => e.status === 'success');
    const errorExecs = executions.data.filter(e => e.status === 'error');

    console.log(`\n📊 统计:`);
    console.log(`   成功: ${successExecs.length}`);
    console.log(`   失败: ${errorExecs.length}`);

    if (successExecs.length > 0) {
      console.log('\n✅ 有成功执行！但响应仍为空，这说明:');
      console.log('   1. 执行成功但 Respond to Webhook 节点未执行');
      console.log('   2. 或者 Respond to Webhook 节点执行了但没有返回数据');
    }

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
  }
}

main();
