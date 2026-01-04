/**
 * 简化测试 - 验证数据是否正确传递到 Agent B
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const N8N_GENERATE_URL = process.env.N8N_GENERATE_URL || 'https://n8n.neican.ai/webhook/generate';
const N8N_AUTH_TOKEN = process.env.N8N_AUTH_TOKEN;

async function testSimpleData() {
  console.log('\n🧪 简化测试：验证数据传递\n');

  const payload = {
    session_id: "simple-test-" + Date.now(),
    conversation_history: [
      {
        role: "assistant",
        content: "你好！请告诉我你的姓名。"
      },
      {
        role: "user",
        content: "我叫张三，是一名前端工程师。"
      }
    ],
    preferences: {
      role: "前端工程师",
      audience: "leader",
      tone: "formal",
      length_main_chars: 500
    }
  };

  console.log('📤 发送数据:');
  console.log(JSON.stringify(payload, null, 2));

  console.log('\n⏳ 等待响应...\n');

  const response = await fetch(N8N_GENERATE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${N8N_AUTH_TOKEN}`
    },
    body: JSON.stringify(payload)
  });

  console.log(`📊 响应状态: ${response.status}`);

  const text = await response.text();
  const json = JSON.parse(text);

  console.log('\n📋 响应数据:');
  console.log(JSON.stringify(json, null, 2));

  // 检查 Agent B 的输出
  if (json.success === false && json.error === "Agent B (Archivist) failed") {
    console.log('\n\n⚠️  Agent B 仍然失败');
    console.log('Agent B 收到的数据:');

    if (json.details && json.details.raw_response) {
      const rawContent = json.details.raw_response.choices?.[0]?.message?.content;

      if (rawContent) {
        try {
          const agentBOutput = JSON.parse(rawContent);
          console.log(JSON.stringify(agentBOutput, null, 2));

          // 检查是否全 null
          const allNull = Object.values(agentBOutput).every(v => v === null);
          if (allNull) {
            console.log('\n❌ Agent B 返回全 null');
            console.log('\n💡 可能原因：');
            console.log('1. Agent B 的 user message 没有明确说明输入数据结构');
            console.log('2. DeepSeek API 收到整个对象，不知道应该处理哪个字段');
            console.log('\n🔧 建议修复：');
            console.log('修改 Agent B 的 user message 为：');
            console.log('{{ JSON.stringify({ conversation_history: $json.conversation_history }) }}');
          }
        } catch (e) {
          console.log('解析失败:', rawContent);
        }
      }
    }
  } else if (json.success === true) {
    console.log('\n\n✅ 成功！Agent B 正常工作了！');
  }
}

testSimpleData();
