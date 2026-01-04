/**
 * 验证修复后的工作流文件
 */

import fs from 'fs';

const fixed = JSON.parse(
  fs.readFileSync('n8n_workflows/debug/fixed_workflow.json', 'utf-8')
);

console.log('📋 验证修复后的工作流\n');

// 检查 Agent B
const agentB = fixed.nodes.find(n => n.name === 'Agent B - Extract Factsheet');
console.log('Agent B - Extract Factsheet:');
console.log('  jsonBody 类型:', typeof agentB.parameters.jsonBody);
console.log('  是否为对象:', typeof agentB.parameters.jsonBody === 'object');
console.log('  字段数:', Object.keys(agentB.parameters.jsonBody).length);

// 检查 Call Writer
const callWriter = fixed.nodes.find(n => n.name === 'Call Writer');
console.log('\nCall Writer:');
console.log('  jsonBody 类型:', typeof callWriter.parameters.jsonBody);
console.log('  是否为对象:', typeof callWriter.parameters.jsonBody === 'object');

// 检查 Agent D
const agentD = fixed.nodes.find(n => n.name === 'Agent D - Validate Quality');
console.log('\nAgent D - Validate Quality:');
console.log('  jsonBody 类型:', typeof agentD.parameters.jsonBody);
console.log('  是否为对象:', typeof agentD.parameters.jsonBody === 'object');

console.log('\n✅ 修复验证完成！');

console.log('\n📄 请重新导入以下文件到 n8n:');
console.log('   n8n_workflows/debug/fixed_workflow.json');
