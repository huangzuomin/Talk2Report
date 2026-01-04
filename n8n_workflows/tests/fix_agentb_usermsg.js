/**
 * 修复 Agent B 的 user message
 */

import fs from 'fs';

// 读取修复后的工作流
const workflow = JSON.parse(
  fs.readFileSync('n8n_workflows/debug/fixed_workflow.json', 'utf-8')
);

// 找到 Agent B 节点
const agentB = workflow.nodes.find(n => n.name === 'Agent B - Extract Factsheet');

if (agentB && agentB.parameters.jsonBody.messages) {
  console.log('✅ 找到 Agent B 节点\n');

  // 修改 user message
  const userMsg = agentB.parameters.jsonBody.messages.find(m => m.role === 'user');

  if (userMsg) {
    console.log('修改前 user message:');
    console.log(userMsg.content);

    // 修改为正确的格式
    userMsg.content = '这是对话历史，请从中提取结构化数据：\n\n{{ JSON.stringify($json.conversation_history) }}';

    console.log('\n修改后 user message:');
    console.log(userMsg.content);

    // 保存修复后的文件
    fs.writeFileSync(
      'n8n_workflows/debug/fixed_workflow_v2.json',
      JSON.stringify(workflow, null, 2)
    );

    console.log('\n✅ 已保存到: n8n_workflows/debug/fixed_workflow_v2.json');
    console.log('\n请重新导入此文件到 n8n');
  }
} else {
  console.log('❌ 未找到 Agent B 节点或 messages 配置');
}
