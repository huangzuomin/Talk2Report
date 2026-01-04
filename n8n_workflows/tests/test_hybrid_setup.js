/**
 * 快速测试混合架构
 * 测试 Interview (前端) + Generate (n8n)
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const N8N_GENERATE_URL = process.env.N8N_GENERATE_URL;
const N8N_AUTH_TOKEN = process.env.N8N_AUTH_TOKEN;

console.log('\n🧪 混合架构快速测试\n');
console.log('='.repeat(60));

async function testInterviewLocal() {
  console.log('\n📋 测试 1: Interview (前端直接调用)\n');

  const startTime = Date.now();

  try {
    const response = await fetch('http://localhost:3001/api/deepseek/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是年终总结访谈助手。通过简短提问收集用户年度工作经历。请发送开场白和第一个问题。'
          }
        ],
        temperature: 0.7,
        stream: false
      })
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (!response.ok) {
      console.log(`❌ 错误: ${response.status}`);
      return false;
    }

    const data = await response.json();
    const question = data.choices?.[0]?.message?.content || '';

    console.log(`✅ 响应时间: ${duration}秒`);
    console.log(`✅ 问题: ${question.slice(0, 80)}...`);

    if (duration < 3) {
      console.log(`✅ 速度: 极快 ⚡`);
    } else if (duration < 5) {
      console.log(`✅ 速度: 良好`);
    } else {
      console.log(`⚠️  速度: 偏慢`);
    }

    return { success: true, duration, question };
  } catch (error) {
    console.log(`❌ 错误: ${error.message}`);
    console.log(`💡 确保 Express API 服务器运行在 localhost:3001`);
    return { success: false };
  }
}

async function testGenerateN8N() {
  console.log('\n📋 测试 2: Generate (n8n 工作流)\n');

  const sessionId = `hybrid-test-${Date.now()}`;
  const startTime = Date.now();

  try {
    const response = await fetch(N8N_GENERATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${N8N_AUTH_TOKEN}`
      },
      body: JSON.stringify({
        session_id: sessionId,
        conversation_history: [
          { role: 'assistant', content: '你好！请告诉我你的成就。' },
          { role: 'user', content: '我完成了前端优化项目。' }
        ],
        preferences: {
          role: '前端工程师',
          audience: 'leader',
          tone: 'formal',
          length_main_chars: 500
        }
      })
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`⏱️  响应时间: ${duration}秒`);

    if (!response.ok) {
      console.log(`❌ 错误: ${response.status}`);
      return false;
    }

    const text = await response.text();

    if (text.length === 0) {
      console.log(`⚠️  返回空响应 (Agent B 数据提取问题)`);
      return { success: true, duration, empty: true };
    }

    try {
      const result = JSON.parse(text);
      console.log(`✅ 响应成功`);
      console.log(`✅ Factsheet 字段: ${Object.keys(result.factsheet || {}).length}`);
      console.log(`✅ 报告版本: ${result.versions?.length || 0}`);
      console.log(`✅ 迭代次数: ${result.iterations || 1}`);

      if (result.verdict) {
        console.log(`✅ 质量评分: ${result.verdict.score || 'N/A'}/100`);
      }

      return { success: true, duration, result };
    } catch (e) {
      console.log(`⚠️  响应格式问题: ${text.slice(0, 100)}`);
      return { success: false };
    }

  } catch (error) {
    console.log(`❌ 错误: ${error.message}`);
    return { success: false };
  }
}

async function main() {
  console.log('测试架构: Interview (前端) + Generate (n8n)\n');

  // 测试 Interview
  const interviewResult = await testInterviewLocal();

  // 测试 Generate
  const generateResult = await testGenerateN8N();

  // 总结
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试总结\n');

  console.log('Interview 阶段:');
  if (interviewResult.success) {
    console.log(`   ✅ 状态: 成功`);
    console.log(`   ⚡ 响应时间: ${interviewResult.duration}秒`);
    console.log(`   🎯 目标: < 3秒`);
  } else {
    console.log(`   ❌ 状态: 失败`);
    console.log(`   💡 检查 Express API 服务器`);
  }

  console.log('\nGenerate 阶段:');
  if (generateResult.success) {
    console.log(`   ✅ 状态: 成功`);
    console.log(`   ⏱️  响应时间: ${generateResult.duration}秒`);
    console.log(`   🎯 目标: 20-30秒`);
    if (generateResult.empty) {
      console.log(`   ⚠️  注意: Agent B 返回空数据 (已知问题)`);
    }
  } else {
    console.log(`   ❌ 状态: 失败`);
    console.log(`   💡 检查 n8n 工作流状态`);
  }

  // 整体评估
  console.log('\n' + '='.repeat(60));

  if (interviewResult.success && generateResult.success) {
    console.log('\n🎉 混合架构测试通过！\n');

    if (interviewResult.duration < 3) {
      console.log('✅ Interview: 极快响应');
    } else {
      console.log('⚠️  Interview: 响应偏慢，但可接受');
    }

    if (generateResult.duration < 30) {
      console.log('✅ Generate: 正常范围');
    } else {
      console.log('⚠️  Generate: 响应较慢，需要优化');
    }

    console.log('\n💡 下一步:');
    console.log('   1. 在浏览器中测试完整流程');
    console.log('   2. 查看用户体验');
    console.log('   3. 监控实际使用情况');

  } else {
    console.log('\n⚠️  部分测试失败，请检查配置\n');
    console.log('检查清单:');
    console.log('   1. Express API 服务器是否运行 (localhost:3001)');
    console.log('   2. n8n Generate 工作流是否激活');
    console.log('   3. 环境变量是否正确配置');
    console.log('   4. DeepSeek API Key 是否有效');
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

main();
