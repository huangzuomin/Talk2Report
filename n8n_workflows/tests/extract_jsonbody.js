/**
 * 提取 jsonBody 的实际内容
 */

import fs from 'fs';

const workflow = JSON.parse(
  fs.readFileSync('n8n_workflows/debug/current_workflow.json', 'utf-8')
);

const agentB = workflow.nodes.find(n => n.name === 'Agent B - Extract Factsheet');

console.log('Agent B jsonBody 类型:', typeof agentB.parameters.jsonBody);
console.log('\nAgent B jsonBody 值:');
console.log('====================');
console.log(agentB.parameters.jsonBody);
console.log('====================\n');

// 尝试解析
const jsonBody = agentB.parameters.jsonBody;

if (jsonBody.startsWith('=')) {
  console.log('✅ 这是一个 n8n 表达式（以 = 开头）');

  // 移除 = 前缀
  const withoutPrefix = jsonBody.slice(1);

  console.log('\n移除 = 后的长度:', withoutPrefix.length);
  console.log('前200字符:');
  console.log(withoutPrefix.slice(0, 200));

  // 尝试解析
  try {
    const parsed = JSON.parse(withoutPrefix);
    console.log('\n✅ 解析成功!');
    console.log('解析后的 keys:', Object.keys(parsed));
  } catch (e) {
    console.log('\n❌ 解析失败:', e.message);

    // 可能需要转义处理
    const unescaped = withoutPrefix
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"');

    console.log('\n尝试转义后解析...');
    try {
      const parsed = JSON.parse(unescaped);
      console.log('✅ 转义后解析成功!');
    } catch (e2) {
      console.log('❌ 仍然失败:', e2.message);
    }
  }
}
