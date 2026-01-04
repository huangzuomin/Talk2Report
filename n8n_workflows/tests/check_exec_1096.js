/**
 * 获取执行 1096 的详细数据
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

  console.log(`Status: ${response.status}`);

  if (!response.ok) {
    throw new Error(`Failed: ${response.status}`);
  }

  return await response.json();
}

async function main() {
  try {
    console.log('🔍 查看执行 1096\n');

    const exec = await getExecution('1096');

    console.log('📊 基本信息:');
    console.log(`   状态: ${exec.status}`);
    console.log(`   完成: ${exec.finished}`);
    console.log(`   开始: ${exec.startedAt}`);
    console.log(`   停止: ${exec.stoppedAt}`);

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

          // 查找错误节点
          console.log('\n❌ 检查错误节点:');
          for (const [nodeName, nodeData] of Object.entries(stream)) {
            if (nodeData.executionStatus === 'error') {
              console.log(`   🔴 ${nodeName}: ERROR`);
              if (nodeData.error) {
                console.log(`      错误信息: ${JSON.stringify(nodeData.error)}`);
              }
            } else {
              console.log(`   ✅ ${nodeName}: ${nodeData.executionStatus}`);
            }
          }
        }
      }
    } else {
      console.log('\n❌ 没有 data 字段 - n8n 没有保存执行数据');
    }

    console.log('\n📄 完整响应（前3000字符）:');
    console.log(JSON.stringify(exec, null, 2).slice(0, 3000));

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
  }
}

main();
