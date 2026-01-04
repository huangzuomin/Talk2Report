/**
 * 测试 Interview Workflow (Agent A)
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const N8N_INTERVIEW_URL = process.env.N8N_INTERVIEW_URL || 'https://n8n.neican.ai/webhook/interview/next-step';
const N8N_AUTH_TOKEN = process.env.N8N_AUTH_TOKEN;

async function testInterviewWorkflow() {
  console.log('\n🧪 测试 Interview Workflow (Agent A)\n');
  console.log(`Webhook URL: ${N8N_INTERVIEW_URL}\n`);

  // 测试 1: 初始请求（第一次提问）
  console.log('📝 测试 1: 初始请求 - 第一次提问\n');

  const test1 = await fetch(N8N_INTERVIEW_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${N8N_AUTH_TOKEN}`
    },
    body: JSON.stringify({
      session_id: "test-interview-" + Date.now()
    })
  });

  console.log(`状态码: ${test1.status} ${test1.statusText}`);
  console.log(`Content-Type: ${test1.headers.get('content-type')}`);
  console.log(`Content-Length: ${test1.headers.get('content-length')}\n`);

  const text1 = await test1.text();
  console.log('响应内容:');
  console.log(text1.slice(0, 500));

  if (text1.length > 0) {
    try {
      const json1 = JSON.parse(text1);
      console.log('\n✅ 解析成功 - JSON 格式');
      console.log('\n📋 响应数据:');
      console.log(JSON.stringify(json1, null, 2).slice(0, 1000));
    } catch (e) {
      console.log('\n⚠️  不是 JSON 格式');
    }
  }

  // 等待 2 秒
  await new Promise(r => setTimeout(r, 2000));

  // 测试 2: 带对话历史的请求
  console.log('\n\n📝 测试 2: 带对话历史 - 第二次提问\n');

  const test2 = await fetch(N8N_INTERVIEW_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${N8N_AUTH_TOKEN}`
    },
    body: JSON.stringify({
      session_id: "test-interview-" + Date.now(),
      conversation_history: [
        {
          role: "assistant",
          content: "你好！今年最让你自豪的成就是什么？"
        },
        {
          role: "user",
          content: "我完成了前端性能优化项目。"
        }
      ]
    })
  });

  console.log(`状态码: ${test2.status} ${test2.statusText}`);
  console.log(`Content-Length: ${test2.headers.get('content-length')}\n`);

  const text2 = await test2.text();

  if (text2.length > 0 && text2.length < 10000) {
    try {
      const json2 = JSON.parse(text2);
      console.log('✅ 响应数据:');
      console.log(JSON.stringify(json2, null, 2).slice(0, 800));
    } catch (e) {
      console.log('响应内容:');
      console.log(text2.slice(0, 500));
    }
  } else {
    console.log('⚠️  响应长度异常:', text2.length);
  }

  console.log('\n✅ 测试完成');
}

testInterviewWorkflow();
