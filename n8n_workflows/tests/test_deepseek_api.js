/**
 * 测试 DeepSeek API 连接
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_BASE = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com';

async function testDeepSeekAPI() {
  console.log('🔍 测试 DeepSeek API 连接\n');
  console.log(`API Base: ${DEEPSEEK_API_BASE}`);
  console.log(`API Key: ${DEEPSEEK_API_KEY ? DEEPSEEK_API_KEY.slice(0, 10) + '...' : 'NOT SET'}`);

  if (!DEEPSEEK_API_KEY) {
    console.error('\n❌ DEEPSEEK_API_KEY 未设置');
    return;
  }

  try {
    console.log('\n📤 发送测试请求...');

    const response = await fetch(`${DEEPSEEK_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Say "API working!" in JSON format: {"status": "ok", "message": "..."}' }
        ],
        max_tokens: 50,
        temperature: 0.7
      })
    });

    console.log(`\n📊 响应状态: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`\n❌ API 请求失败`);
      console.error(`错误详情: ${errorText}`);
      return;
    }

    const data = await response.json();

    console.log('\n✅ API 连接成功!');
    console.log('\n📦 响应数据:');
    console.log(JSON.stringify(data, null, 2));

    if (data.choices && data.choices[0]) {
      const content = data.choices[0].message.content;
      console.log(`\n💬 AI 回复: ${content}`);
    }

    console.log('\n📋 使用信息:');
    console.log(`   模型: ${data.model}`);
    console.log(`   Token 用量: ${data.usage?.total_tokens || 'N/A'}`);

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    console.error(error.stack);
  }
}

testDeepSeekAPI();
