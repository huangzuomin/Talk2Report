/**
 * 检查 n8n 执行日志
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const N8N_API_BASE = process.env.N8N_API_BASE || 'http://192.168.50.224:30109/api/v1';
const N8N_API_KEY = process.env.N8N_API_KEY;

async function getExecutions(workflowId, limit = 5) {
  console.log(`\n📊 获取执行记录...`);

  const response = await fetch(`${N8N_API_BASE}/executions?workflowId=${workflowId}&limit=${limit}`, {
    method: 'GET',
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get executions: ${error}`);
  }

  return await response.json();
}

async function getExecutionDetails(executionId) {
  console.log(`\n🔍 获取执行详情: ${executionId}`);

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

async function main() {
  try {
    console.log('🔍 检查 n8n 执行日志');
    console.log(`Workflow ID: 2vrVItrN5gFH0k7c (v3.0 Enhanced)`);

    // 获取最近的执行记录
    const executions = await getExecutions('2vrVItrN5gFH0k7c', 10);

    console.log(`\n✅ 找到 ${executions.data?.length || 0} 条执行记录`);

    if (!executions.data || executions.data.length === 0) {
      console.log('\n❌ 没有执行记录');
      return;
    }

    // 显示最近的执行记录
    console.log('\n📋 最近的执行记录:');
    executions.data.forEach((exec, i) => {
      console.log(`\n${i + 1}. 执行 ID: ${exec.id}`);
      console.log(`   状态: ${exec.status}`);
      console.log(`   开始时间: ${exec.startedAt}`);
      console.log(`   完成时间: ${exec.finishedAt || '(进行中)'}`);
      console.log(`   模式: ${exec.mode}`);
    });

    // 获取最新执行的详情
    const latestExec = executions.data[0];
    console.log(`\n\n🔍 最新执行详情 (ID: ${latestExec.id}):`);

    const details = await getExecutionDetails(latestExec.id);

    // 检查每个节点的执行情况
    console.log(`\n📊 节点执行情况:`);

    if (details.data?.resultData) {
      const resultData = details.data.resultData;
      const nodeExecutionData = resultData.nodeExecutionStream || {};
      const errorNode = resultData.errorNode;

      // 显示每个节点的状态
      Object.entries(nodeExecutionData).forEach(([nodeName, nodeData]) => {
        const startTime = nodeData.startTime;
        const executionTime = nodeData.executionTime;
        const status = nodeData.executionStatus;

        console.log(`\n   ${nodeName}:`);
        console.log(`     状态: ${status}`);
        console.log(`     耗时: ${executionTime}ms`);

        if (status === 'error') {
          console.log(`     ❌ 错误!`);
          if (nodeData.data) {
            console.log(`     错误数据:`, JSON.stringify(nodeData.data, null, 2));
          }
        }
      });

      // 如果有错误节点，显示详细信息
      if (errorNode) {
        console.log(`\n❌ 错误节点: ${errorNode}`);
        if (nodeExecutionData[errorNode]) {
          console.log(`错误详情:`, JSON.stringify(nodeExecutionData[errorNode], null, 2));
        }
      }

      // 显示最后执行的节点
      console.log(`\n🏁 最后执行的节点:`);
      const lastNode = Object.entries(nodeExecutionData).pop();
      if (lastNode) {
        console.log(`   节点: ${lastNode[0]}`);
        console.log(`   状态: ${lastNode[1].executionStatus}`);
      }
    }

    // 检查工作流输出
    console.log(`\n📤 工作流输出:`);
    if (details.data?.lastNodeExecuted) {
      console.log(`   最后执行的节点: ${details.data.lastNodeExecuted}`);
    }

    // 显示原始数据
    console.log(`\n📦 原始数据预览:`);
    console.log(JSON.stringify(details, null, 2).slice(0, 2000) + '...');

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
