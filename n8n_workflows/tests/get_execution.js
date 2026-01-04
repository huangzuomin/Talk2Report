/**
 * 获取特定执行的完整详情
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const N8N_API_BASE = process.env.N8N_API_BASE || 'http://192.168.50.224:30109/api/v1';
const N8N_API_KEY = process.env.N8N_API_KEY;

async function getExecutionFull(executionId) {
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
    // 查看 ID: 1085 (success)
    console.log('🔍 分析成功的执行记录 (ID: 1085)');

    const exec = await getExecutionFull('1085');

    console.log(`\n📊 基本信息:`);
    console.log(`   状态: ${exec.status}`);
    console.log(`   完成: ${exec.finished}`);
    console.log(`   模式: ${exec.mode}`);
    console.log(`   开始: ${exec.startedAt}`);
    console.log(`   停止: ${exec.stoppedAt}`);

    console.log(`\n📦 数据结构:`);
    console.log(`   Keys: ${Object.keys(exec).join(', ')}`);

    // 检查是否有 resultData
    if (exec.data) {
      console.log(`\n📋 data 字段:`);
      console.log(`   Keys: ${Object.keys(exec.data).join(', ')}`);

      if (exec.data.resultData) {
        console.log(`\n✅ 找到 resultData!`);
        const resultData = exec.data.resultData;
        console.log(`   Keys: ${Object.keys(resultData).join(', ')}`);

        if (resultData.nodeExecutionStream) {
          console.log(`\n✅ 找到 nodeExecutionStream!`);
          const stream = resultData.nodeExecutionStream;
          console.log(`   节点数量: ${Object.keys(stream).length}`);

          console.log(`\n📊 节点执行详情:`);
          Object.entries(stream).forEach(([nodeName, nodeData]) => {
            console.log(`\n   📍 ${nodeName}:`);
            console.log(`      执行状态: ${nodeData.executionStatus}`);
            console.log(`      开始时间: ${nodeData.startTime}`);
            console.log(`      执行时间: ${nodeData.executionTime}ms`);

            if (nodeData.executionStatus === 'error') {
              console.log(`      ❌ 错误!`);
              if (nodeData.data) {
                console.log(`      错误数据:`, JSON.stringify(nodeData.data).slice(0, 500));
              }
            }

            // 显示输入输出
            if (nodeData.data) {
              console.log(`      数据: ${JSON.stringify(nodeData.data).slice(0, 200)}...`);
            }
          });
        }

        if (resultData.lastNodeExecuted) {
          console.log(`\n🏁 最后执行的节点: ${resultData.lastNodeExecuted}`);
        }

        if (resultData.errorNode) {
          console.log(`\n❌ 错误节点: ${resultData.errorNode}`);
        }
      }
    }

    // 显示完整 JSON（截断）
    console.log(`\n📄 完整响应 (前 5000 字符):`);
    console.log(JSON.stringify(exec, null, 2).slice(0, 5000));

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
