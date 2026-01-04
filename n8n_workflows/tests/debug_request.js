import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const N8N_GENERATE_URL = process.env.N8N_GENERATE_URL || 'https://n8n.neican.ai/webhook/generate';
const AUTH_TOKEN = process.env.N8N_AUTH_TOKEN || 'NeicanSTT2025Secret';

async function debugTest() {
  console.log('🔍 Debug Test');
  console.log(`URL: ${N8N_GENERATE_URL}`);
  console.log(`Auth: ${AUTH_TOKEN.slice(0, 10)}...\n`);

  const payload = {
    session_id: "debug-test-001",
    conversation_history: [
      { role: "assistant", content: "你好！今年最让你自豪的成就是什么？" },
      { role: "user", content: "我完成了前端性能优化项目。" }
    ],
    preferences: {
      role: "前端工程师",
      audience: "leader",
      tone: "formal",
      length_main_chars: 500
    }
  };

  console.log('📤 Request Payload:');
  console.log(JSON.stringify(payload, null, 2));
  console.log();

  try {
    const response = await fetch(N8N_GENERATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      },
      body: JSON.stringify(payload)
    });

    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
    console.log(`📋 Response Headers:`);


    response.headers.forEach((value, key) => {
      console.log(`   ${key}: ${value}`);
    });

    console.log(`\n📦 Raw Response Text:`);
    const text = await response.text();
    console.log(text);

    if (text) {
      try {
        const json = JSON.parse(text);
        console.log(`\n✅ Parsed JSON:`);
        console.log(JSON.stringify(json, null, 2));
      } catch (e) {
        console.log(`\n❌ JSON Parse Error: ${e.message}`);
      }
    }

  } catch (error) {
    console.error(`❌ Request Error:`, error.message);
  }
}

debugTest();
