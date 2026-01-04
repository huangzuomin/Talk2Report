/**
 * 检查 n8n Generate Workflow 返回的数据格式
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const N8N_GENERATE_URL = process.env.N8N_GENERATE_URL;
const N8N_AUTH_TOKEN = process.env.N8N_AUTH_TOKEN;

async function checkN8NResponse() {
  console.log('\n🔍 检查 n8n Generate Workflow 返回格式\n');

  const response = await fetch(N8N_GENERATE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${N8N_AUTH_TOKEN}`
    },
    body: JSON.stringify({
      session_id: 'format-check-' + Date.now(),
      conversation_history: [
        { role: 'assistant', content: '你好！' },
        { role: 'user', content: '我完成了前端项目。' }
      ],
      preferences: {
        role: '前端工程师',
        audience: 'leader',
        tone: 'formal',
        length_main_chars: 500
      }
    })
  });

  console.log('状态码:', response.status);

  if (!response.ok) {
    console.log('❌ 请求失败');
    return;
  }

  const text = await response.text();

  if (text.length === 0) {
    console.log('⚠️  返回空响应');
    return;
  }

  try {
    const data = JSON.parse(text);

    console.log('\n📋 数据结构分析:\n');
    console.log('顶层键:', Object.keys(data));

    if (data.versions) {
      console.log('\nversions 类型:', Array.isArray(data.versions) ? '数组' : typeof data.versions);
      if (Array.isArray(data.versions) && data.versions.length > 0) {
        console.log('versions 长度:', data.versions.length);
        console.log('第一个元素的键:', Object.keys(data.versions[0]));
        console.log('第一个元素预览:', JSON.stringify(data.versions[0]).slice(0, 200));
      }
    }

    if (data.factsheet) {
      console.log('\nfactsheet 类型:', typeof data.factsheet);
      console.log('factsheet 键:', Object.keys(data.factsheet));
    }

    if (data.verdict) {
      console.log('\nverdict 类型:', typeof data.verdict);
      console.log('verdict 键:', Object.keys(data.verdict));
    }

    console.log('\n✅ 完整响应预览:');
    console.log(JSON.stringify(data, null, 2).slice(0, 1000));

  } catch (e) {
    console.log('⚠️  解析失败:', e.message);
    console.log('原始响应:', text.slice(0, 500));
  }
}

checkN8NResponse();
