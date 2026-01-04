/**
 * 检查最新执行 ID 1112 的详细数据
 */

import dotenv from 'dotenv';
import fs from 'fs';
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
    console.log('🔍 查看执行 1112（质量控制场景）\n');

    const exec = await getExecution('1112');

    console.log('📊 基本信息:');
    console.log(`   状态: ${exec.status}`);
    console.log(`   完成: ${exec.finished}`);
    console.log(`   开始: ${exec.startedAt}`);
    console.log(`   停止: ${exec.stoppedAt}`);

    if (exec.data) {
      console.log('\n✅ 有 data 字段!');

      if (exec.data.resultData) {
        const rd = exec.data.resultData;

        if (rd.lastNodeExecuted) {
          console.log(`\n🏁 最后执行的节点: ${rd.lastNodeExecuted}`);
        }

        if (rd.nodeExecutionStream) {
          console.log('\n✅ 有节点执行数据!');
          const stream = rd.nodeExecutionStream;
          const nodeNames = Object.keys(stream);
          console.log(`   节点数量: ${nodeNames.length}`);

          // 查找 Agent B 节点
          const agentB = nodeNames.find(n => n.toLowerCase().includes('agent b'));
          if (agentB) {
            console.log(`\n📤 Agent B 节点:`);
            const agentBData = stream[agentB];
            console.log(`   状态: ${agentBData.executionStatus}`);

            if (agentBData.data) {
              console.log(`   输出数据 (前500字符):`);
              console.log(JSON.stringify(agentBData.data).slice(0, 500));
            }
          }

          // 查找 Extract Request Data 节点
          const extractNode = nodeNames.find(n => n.toLowerCase().includes('extract request'));
          if (extractNode) {
            console.log(`\n📥 Extract Request Data 节点:`);
            const extractData = stream[extractNode];
            console.log(`   状态: ${extractData.executionStatus}`);

            if (extractData.data) {
              console.log(`   输出数据 (前500字符):`);
              console.log(JSON.stringify(extractData.data).slice(0, 500));
            }
          }
        }
      }
    } else {
      console.log('\n❌ 没有 data 字段');
    }

    // 保存完整响应
    console.log('\n💾 保存完整执行数据...');
    fs.writeFileSync('n8n_workflows/debug/execution_1112.json', JSON.stringify(exec, null, 2));
    console.log('   已保存到: n8n_workflows/debug/execution_1112.json');

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
  }
}

main();
