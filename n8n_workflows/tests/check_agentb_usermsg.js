/**
 * 检查 Agent B 的 user message 内容
 */

import fs from 'fs';

const workflow = JSON.parse(
  fs.readFileSync('n8n_workflows/debug/current_workflow.json', 'utf-8')
);

const agentB = workflow.nodes.find(n => n.name === 'Agent B - Extract Factsheet');

if (agentB && agentB.parameters && agentB.parameters.jsonBody) {
  const jsonBody = agentB.parameters.jsonBody;

  console.log('Agent B jsonBody 类型:', typeof jsonBody);

  if (typeof jsonBody === 'string') {
    console.log('\n⚠️  jsonBody 是字符串格式');
    console.log('\n内容:');
    console.log(jsonBody);

    // 检查是否包含正确的 user message
    if (jsonBody.includes('conversation_history')) {
      console.log('\n✅ 包含 conversation_history 引用');
    }

    if (jsonBody.includes('JSON.stringify($json)')) {
      console.log('⚠️  使用旧的格式: JSON.stringify($json)');
    }

    if (jsonBody.includes('JSON.stringify($json.conversation_history)')) {
      console.log('✅ 使用新格式: JSON.stringify($json.conversation_history)');
    }
  } else if (typeof jsonBody === 'object') {
    console.log('\n✅ jsonBody 是对象格式');
    console.log('\nMessages:');

    if (jsonBody.messages) {
      jsonBody.messages.forEach((msg, i) => {
        console.log(`\nMessage ${i + 1} (${msg.role}):`);
        console.log(msg.content);
      });
    }
  }
}
