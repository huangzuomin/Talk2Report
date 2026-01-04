/**
 * 检查新工作流的执行日志
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const N8N_API_BASE = process.env.N8N_API_BASE || 'http://192.168.50.224:30109/api/v1';
const N8N_API_KEY = process.env.N8N_API_KEY;

async function getExecutions(workflowId) {
  const response = await fetch(`${N8N_API_BASE}/executions?workflowId=${workflowId}&limit=5`, {
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

async function getExecution(executionId) {
  const response = await fetch(`${N8N_API_BASE}/executions/${executionId}`, {
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
    console.log('🔍 检查新工作流执行日志');
    console.log(`Workflow ID: uJRS8dTV9ViYke75`);

    const executions = await getExecutions('uJRS8dTV9ViYke75');

    console.log(`\n✅ 找到 ${executions.data?.length || 0} 条执行记录`);

    if (!executions.data || executions.data.length === 0) {
      console.log('\n❌ 没有执行记录');
      return;
    }

    console.log('\n📋 最近的执行:');
    executions.data.forEach((exec, i) => {
      console.log(`\n${i + 1}. ID: ${exec.id}`);
      console.log(`   状态: ${exec.status}`);
      console.log(`   开始: ${exec.startedAt}`);
      console.log(`   停止: ${exec.stoppedAt || '(进行中)'}`);
      console.log(`   模式: ${exec.mode}`);
    });

    // 获取最新执行的详情
    const latest = executions.data[0];
    console.log(`\n\n🔍 最新执行详情 (ID: ${latest.id}):`);
    const details = await getExecution(latest.id);

    // 检查执行数据
    if (details.finished && details.status === 'error') {
      console.log('\n❌ 执行失败!');
      if (details.data) {
        console.log('错误数据:', JSON.stringify(details.data, null, 2).slice(0, 1000));
      }
    } else if (details.finished && details.status === 'success') {
      console.log('\n✅ 执行成功!');
      if (details.data) {
        console.log('数据:', JSON.stringify(details.data, null, 2).slice(0, 1000));
      }
    }

    // 显示原始数据
    console.log('\n📦 完整响应（前3000字符）:');
    console.log(JSON.stringify(details, null, 2).slice(0, 3000));

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
  }
}

main();
