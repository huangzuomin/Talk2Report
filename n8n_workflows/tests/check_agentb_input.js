/**
 * 检查 Agent B 之前的数据传递
 */

import fs from 'fs';

const workflow = JSON.parse(
  fs.readFileSync('n8n_workflows/debug/current_workflow.json', 'utf-8')
);

console.log('🔍 检查工作流中的数据流\n');

// 找到 Agent B 节点
const agentB = workflow.nodes.find(n => n.name === 'Agent B - Extract Factsheet');

console.log('Agent B 节点位置:', agentB.position);

// 查找 Agent B 的输入连接
console.log('\n📥 Agent B 的输入连接:');
const connections = workflow.connections;

// 找到所有连接到 Agent B 的节点
Object.entries(connections).forEach(([sourceName, sourceConns]) => {
  if (sourceConns.main) {
    sourceConns.main.forEach((outputGroup, groupIndex) => {
      if (outputGroup && outputGroup[0]) {
        const target = outputGroup[0].node;
        if (target === 'Agent B - Extract Factsheet') {
          console.log(`\n  来源节点: ${sourceName}`);
          console.log(`  输出组索引: ${groupIndex}`);
        }
      }
    });
  }
});

// 查找 Agent B 之前的节点
console.log('\n\n📊 Agent B 之前的节点链:');

const nodesBeforeAgentB = workflow.nodes.filter(n => {
  const nodePos = n.position;
  const agentBPos = agentB.position;

  // x 坐标小于 Agent B 的都是前置节点
  return nodePos[0] < agentBPos[0] && Math.abs(nodePos[1] - agentBPos[1]) < 500;
});

console.log(`找到 ${nodesBeforeAgentB.length} 个前置节点:`);

nodesBeforeAgentB.forEach(node => {
  console.log(`\n  节点: ${node.name}`);
  console.log(`  类型: ${node.type}`);
  console.log(`  位置: ${node.position.join(', ')}`);

  // 如果是 Set 节点，显示配置
  if (node.type === 'n8n-nodes-base.set' && node.parameters?.assignments) {
    console.log(`  设置的字段:`);
    node.parameters.assignments.forEach(assignment => {
      console.log(`    - ${assignment.name}: ${assignment.value?.slice(0, 50) || 'N/A'}...`);
    });
  }
});

// 检查 "Extract Request Data" 节点
console.log('\n\n📋 Extract Request Data 节点详情:');
const extractNode = workflow.nodes.find(n => n.name === 'Extract Request Data');

if (extractNode) {
  console.log('节点类型:', extractNode.type);
  console.log('\n参数配置:');
  console.log(JSON.stringify(extractNode.parameters, null, 2));
}
