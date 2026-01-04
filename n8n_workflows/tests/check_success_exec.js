/**
 * 获取成功执行的完整数据
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const N8N_API_BASE = process.env.N8N_API_BASE || 'http://192.168.50.224:30109/api/v1';
const N8N_API_KEY = process.env.N8N_API_KEY;

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
    console.log('🔍 查看成功执行 (ID: 1091)');

    const exec = await getExecution('1091');

    console.log('\n📊 基本信息:');
    console.log(`   状态: ${exec.status}`);
    console.log(`   完成: ${exec.finished}`);
    console.log(`   开始: ${exec.startedAt}`);
    console.log(`   停止: ${exec.stoppedAt}`);

    // 尝试获取执行数据
    console.log('\n📦 数据结构:');
    console.log(`   Keys: ${Object.keys(exec).join(', ')}`);

    if (exec.data) {
      console.log('\n✅ 有 data 字段!');
      console.log(`   data keys: ${Object.keys(exec.data).join(', ')}`);

      if (exec.data.resultData) {
        console.log('\n✅ 有 resultData!');
        const rd = exec.data.resultData;

        if (rd.lastNodeExecuted) {
          console.log(`\n🏁 最后执行的节点: ${rd.lastNodeExecuted}`);
        }

        if (rd.nodeExecutionStream) {
          console.log('\n✅ 有节点执行数据!');
          const stream = rd.nodeExecutionStream;
          const nodeNames = Object.keys(stream);
          console.log(`   节点数量: ${nodeNames.length}`);
          console.log(`   节点列表: ${nodeNames.join(', ')}`);

          // 检查响应节点
          const respondNodes = nodeNames.filter(n => n.toLowerCase().includes('return') || n.toLowerCase().includes('respond'));
          if (respondNodes.length > 0) {
            console.log(`\n📤 响应节点: ${respondNodes.join(', ')}`);
            respondNodes.forEach(nodeName => {
              const nodeData = stream[nodeName];
              console.log(`\n   ${nodeName}:`);
              console.log(`      状态: ${nodeData.executionStatus}`);
              if (nodeData.data) {
                console.log(`      数据: ${JSON.stringify(nodeData.data).slice(0, 200)}...`);
              }
            });
          }
        }
      }
    }

    console.log('\n📄 完整响应:');
    console.log(JSON.stringify(exec, null, 2));

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
  }
}

main();
