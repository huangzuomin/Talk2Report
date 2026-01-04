/**
 * 检查 Agent B 的完整配置
 */

import fs from 'fs';

const workflow = JSON.parse(
  fs.readFileSync('n8n_workflows/debug/current_workflow.json', 'utf-8')
);

const agentB = workflow.nodes.find(n => n.name === 'Agent B - Extract Factsheet');

console.log('📋 Agent B 节点完整配置\n');
console.log('节点类型:', agentB.type);
console.log('凭证:', agentB.credentials);
console.log('\n参数:\n');

const params = agentB.parameters;

// 检查 jsonBody
if (typeof params.jsonBody === 'object') {
  console.log('✅ jsonBody 是对象格式\n');
  console.log('JSON Body 结构:\n');
  console.log(JSON.stringify(params.jsonBody, null, 2));

  if (params.jsonBody.messages) {
    console.log('\n\n📨 Messages 配置:\n');
    params.jsonBody.messages.forEach((msg, i) => {
      console.log(`Message ${i + 1} (${msg.role}):`);
      console.log('  长度:', msg.content.length, '字符');
      console.log('  前200字符:');
      console.log('  ' + msg.content.slice(0, 200));
      console.log('');
    });
  }
} else {
  console.log('⚠️  jsonBody 仍是字符串格式');
}
