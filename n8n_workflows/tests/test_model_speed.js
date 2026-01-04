/**
 * 对比测试: Chat vs Reasoner 模型速度
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const N8N_INTERVIEW_URL = process.env.N8N_INTERVIEW_URL;
const N8N_AUTH_TOKEN = process.env.N8N_AUTH_TOKEN;

async function testN8NChatModel() {
  console.log('\n🧪 测试 n8n Interview Workflow 响应速度\n');
  console.log('='.repeat(60));

  const sessionId = `speed-test-${Date.now()}`;
  const startTime = Date.now();

  console.log('\n📤 发送请求...');

  try {
    const response = await fetch(N8N_INTERVIEW_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${N8N_AUTH_TOKEN}`
      },
      body: JSON.stringify({
        session_id: sessionId
      })
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n📥 收到响应 (${duration}秒)\n`);

    if (!response.ok) {
      console.log(`❌ 错误: ${response.status} ${response.statusText}`);
      return;
    }

    const data = await response.json();

    console.log('✅ 响应成功！');
    console.log('\n📋 响应数据:');
    console.log(`   - 问题: ${data.question?.slice(0, 80)}...`);
    console.log(`   - 思考过程长度: ${data.thinking?.length || 0} 字符`);
    console.log(`   - 完成状态: ${data.finished ? '是' : '否'}`);

    // 评估速度
    console.log('\n⚡ 速度评估:');
    if (duration < 2) {
      console.log(`   ✅ 极快 (${duration}秒) - 使用的是 deepseek-chat`);
    } else if (duration < 5) {
      console.log(`   ✅ 良好 (${duration}秒) - 正常范围`);
    } else if (duration < 10) {
      console.log(`   ⚠️  较慢 (${duration}秒) - 可能提示词过长`);
    } else {
      console.log(`   ❌ 很慢 (${duration}秒) - 可能使用了 reasoner 或网络问题`);
    }

    console.log('\n💡 建议:');

    if (duration > 5) {
      console.log('   1. 检查系统提示词长度（建议 < 2000 字符）');
      console.log('   2. 检查 temperature 设置（建议 0.7-1.0）');
      console.log('   3. 检查 DeepSeek API 状态');
      console.log('   4. 考虑缓存系统提示词');
    }

    // 第二轮测试
    console.log('\n\n🔄 第二轮测试（带对话历史）...');

    const start2 = Date.now();
    const response2 = await fetch(N8N_INTERVIEW_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${N8N_AUTH_TOKEN}`
      },
      body: JSON.stringify({
        session_id: sessionId,
        conversation_history: [
          { role: 'assistant', content: data.question },
          { role: 'user', content: '我完成了前端优化项目。' }
        ]
      })
    });

    const duration2 = ((Date.now() - start2) / 1000).toFixed(2);
    console.log(`\n✅ 第二轮响应时间: ${duration2}秒`);

    console.log('\n' + '='.repeat(60));
    console.log('测试完成！');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
  }
}

testN8NChatModel();
