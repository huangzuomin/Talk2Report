/**
 * Step 2: 分析工作流结构
 */

import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

async function analyzeWorkflow(workflowPath) {
  console.log('\n📊 分析工作流结构\n');

  const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf-8'));

  // 基本信息
  console.log('📋 基本信息:');
  console.log(`   名称: ${workflow.name}`);
  console.log(`   节点数: ${workflow.nodes.length}`);
  console.log(`   活跃状态: ${workflow.active ? '✅ 激活' : '❌ 未激活'}`);
  console.log(`   版本 ID: ${workflow.versionId}`);

  // 节点分类
  const nodeTypes = {};
  const nodesByType = {};

  workflow.nodes.forEach(node => {
    nodeTypes[node.type] = (nodeTypes[node.type] || 0) + 1;

    if (!nodesByType[node.type]) {
      nodesByType[node.type] = [];
    }
    nodesByType[node.type].push({
      name: node.name,
      position: node.position
    });
  });

  console.log('\n📦 节点类型统计:');
  Object.entries(nodeTypes).forEach(([type, count]) => {
    console.log(`   ${type}: ${count} 个`);
  });

  // HTTP Request 节点详情（这些需要 API 凭证）
  console.log('\n🌐 HTTP Request 节点（需要凭证）:');
  const httpNodes = workflow.nodes.filter(n =>
    n.type === 'n8n-nodes-base.httpRequest'
  );

  httpNodes.forEach(node => {
    console.log(`\n   节点: ${node.name}`);
    console.log(`   URL: ${node.parameters?.url || 'N/A'}`);
    console.log(`   认证方式: ${node.authentication || 'none'}`);
    if (node.nodeCredentialType) {
      console.log(`   凭证类型: ${node.nodeCredentialType}`);
    }
  });

  // Webhook 节点
  console.log('\n📡 Webhook 节点:');
  const webhookNodes = workflow.nodes.filter(n =>
    n.type === 'n8n-nodes-base.webhook'
  );

  webhookNodes.forEach(node => {
    console.log(`\n   节点: ${node.name}`);
    console.log(`   路径: ${node.parameters?.path || 'N/A'}`);
    console.log(`   响应模式: ${node.parameters?.responseMode || 'N/A'}`);
    console.log(`   响应节点: ${node.parameters?.responseNodeId || 'N/A'}`);
  });

  // Respond to Webhook 节点
  console.log('\n📤 Respond to Webhook 节点:');
  const respondNodes = workflow.nodes.filter(n =>
    n.type === 'n8n-nodes-base.respondToWebhook'
  );

  respondNodes.forEach(node => {
    console.log(`   - ${node.name}`);
  });

  // 连接检查
  console.log('\n🔗 连接检查:');
  const connectionErrors = [];

  workflow.nodes.forEach(node => {
    const nodeConnections = workflow.connections[node.name];

    if (nodeConnections) {
      // 检查 main 输出
      if (nodeConnections.main) {
        nodeConnections.main.forEach((output, index) => {
          if (output && output[0]) {
            const targetNodeName = output[0].node;
            const targetExists = workflow.nodes.some(n => n.name === targetNodeName);

            if (!targetExists) {
              connectionErrors.push({
                source: node.name,
                target: targetNodeName,
                type: 'main',
                outputIndex: index
              });
            }
          }
        });
      }
    }
  });

  if (connectionErrors.length > 0) {
    console.log('\n   ❌ 发现连接错误:');
    connectionErrors.forEach(err => {
      console.log(`      ${err.source} -> ${err.target} (目标节点不存在)`);
    });
  } else {
    console.log('   ✅ 所有连接正常');
  }

  // 凭证使用情况
  console.log('\n🔑 凭证使用情况:');
  const credentialsUsed = new Set();

  workflow.nodes.forEach(node => {
    if (node.nodeCredentialType) {
      credentialsUsed.add(node.nodeCredentialType);
    }
  });

  if (credentialsUsed.size > 0) {
    console.log('   使用的凭证类型:');
    credentialsUsed.forEach(cred => {
      console.log(`      - ${cred}`);
    });
    console.log('\n   ⚠️  这些凭证需要在 n8n UI 中配置！');
  } else {
    console.log('   ✅ 工作流不使用凭证');
  }

  return {
    workflow,
    httpNodes,
    webhookNodes,
    respondNodes,
    connectionErrors,
    credentialsUsed: Array.from(credentialsUsed)
  };
}

async function main() {
  try {
    const analysis = await analyzeWorkflow('n8n_workflows/debug/current_workflow.json');

    console.log('\n✅ 分析完成');

    // 保存分析结果
    const analysisPath = 'n8n_workflows/debug/analysis.json';
    fs.writeFileSync(analysisPath, JSON.stringify({
      httpNodes: analysis.httpNodes,
      webhookNodes: analysis.webhookNodes,
      respondNodes: analysis.respondNodes,
      connectionErrors: analysis.connectionErrors,
      credentialsUsed: analysis.credentialsUsed
    }, null, 2));

    console.log(`\n💾 分析结果已保存到: ${analysisPath}`);

    return analysis;
  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
