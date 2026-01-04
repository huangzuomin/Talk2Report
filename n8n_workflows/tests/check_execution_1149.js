/**
 * 检查成功执行 1149 的详情
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
    console.log('🔍 查看成功执行 1149\n');

    const exec = await getExecution('1149');

    console.log('📊 基本信息:');
    console.log(`   状态: ${exec.status}`);
    console.log(`   完成: ${exec.finished}`);
    console.log(`   执行时间: ${new Date(exec.stoppedAt).getTime() - new Date(exec.startedAt).getTime()}ms`);
    console.log(`   开始: ${exec.startedAt}`);
    console.log(`   停止: ${exec.stoppedAt}`);

    if (exec.data && exec.data.resultData) {
      const rd = exec.data.resultData;

      if (rd.lastNodeExecuted) {
        console.log(`\n🏁 最后执行的节点: ${rd.lastNodeExecuted}`);
      }

      if (rd.nodeExecutionStream) {
        const stream = rd.nodeExecutionStream;
        const nodeNames = Object.keys(stream);
        console.log(`\n✅ 执行的节点 (${nodeNames.length}个):`);

        // 只显示关键的节点
        const keyNodes = nodeNames.filter(n =>
          n.includes('Agent') ||
          n.includes('Webhook') ||
          n.includes('Validate') ||
          n.includes('Return')
        );

        keyNodes.forEach(nodeName => {
          const nodeData = stream[nodeName];
          console.log(`   - ${nodeName}: ${nodeData.executionStatus}`);
        });
      }
    }

    // 保存完整数据
    fs.writeFileSync('n8n_workflows/debug/execution_1149.json', JSON.stringify(exec, null, 2));
    console.log('\n💾 已保存到: n8n_workflows/debug/execution_1149.json');

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
  }
}

main();
