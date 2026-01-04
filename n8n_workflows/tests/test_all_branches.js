/**
 * 完整测试套件 - 测试工作流的所有分支
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const N8N_GENERATE_URL = process.env.N8N_GENERATE_URL || 'https://n8n.neican.ai/webhook/generate';
const N8N_AUTH_TOKEN = process.env.N8N_AUTH_TOKEN;

async function testWebhook(testName, payload) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`测试: ${testName}`);
  console.log(`时间: ${new Date().toISOString()}`);
  console.log(`${'='.repeat(60)}\n`);

  const startTime = Date.now();

  try {
    const response = await fetch(N8N_GENERATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${N8N_AUTH_TOKEN}`
      },
      body: JSON.stringify(payload)
    });

    const duration = Date.now() - startTime;

    console.log(`📊 响应状态: ${response.status} ${response.statusText}`);
    console.log(`⏱️  响应时间: ${duration}ms`);

    const contentLength = response.headers.get('content-length');
    console.log(`📦 响应长度: ${contentLength} 字节`);

    if (contentLength === '0') {
      console.log('❌ 空响应 - 可能工作流执行失败');
      return { success: false, error: 'Empty response', duration };
    }

    const text = await response.text();

    try {
      const json = JSON.parse(text);
      console.log(`\n✅ JSON 响应解析成功`);
      console.log(`\n📋 响应摘要:`);
      console.log(JSON.stringify(json, null, 2).slice(0, 500));

      return { success: true, data: json, duration };
    } catch (e) {
      console.log(`\n⚠️  响应不是有效 JSON`);
      console.log(`\n📄 响应内容 (前300字符):`);
      console.log(text.slice(0, 300));

      return { success: true, text, duration };
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ 请求失败: ${error.message}`);
    return { success: false, error: error.message, duration };
  }
}

async function main() {
  console.log('\n🧪 n8n 工作流完整测试套件');
  console.log(`目标: ${N8N_GENERATE_URL}`);

  const results = [];

  // 测试 1: 缺少 session_id（输入验证失败分支）
  const test1 = await testWebhook(
    '❌ 验证测试：缺少 session_id',
    {
      conversation_history: [
        { role: "assistant", content: "你好" },
        { role: "user", content: "测试" }
      ],
      preferences: {
        role: "前端工程师",
        audience: "leader",
        tone: "formal",
        length_main_chars: 500
      }
    }
  );
  results.push({ name: '缺少 session_id', ...test1 });

  // 等待 2 秒
  await new Promise(r => setTimeout(r, 2000));

  // 测试 2: 缺少 conversation_history（输入验证失败分支）
  const test2 = await testWebhook(
    '❌ 验证测试：缺少 conversation_history',
    {
      session_id: "test-validation-" + Date.now(),
      preferences: {
        role: "前端工程师",
        audience: "leader",
        tone: "formal",
        length_main_chars: 500
      }
    }
  );
  results.push({ name: '缺少 conversation_history', ...test2 });

  // 等待 2 秒
  await new Promise(r => setTimeout(r, 2000));

  // 测试 3: 完整对话 - 简单场景（Agent B 返回 null 分支）
  const test3 = await testWebhook(
    '⚠️  简单场景：对话太短（Agent B 返回 null）',
    {
      session_id: "test-simple-" + Date.now(),
      conversation_history: [
        { role: "assistant", content: "你好！今年最让你自豪的成就是什么？" },
        { role: "user", content: "我完成了前端性能优化。" }
      ],
      preferences: {
        role: "前端工程师",
        audience: "leader",
        tone: "formal",
        length_main_chars: 500
      }
    }
  );
  results.push({ name: '简单场景', ...test3 });

  // 等待 3 秒
  await new Promise(r => setTimeout(r, 3000));

  // 测试 4: 完整对话 - 丰富场景（正常流程：Agent B → Agent C → Agent D）
  const test4 = await testWebhook(
    '✅ 完整场景：包含完整成就描述（正常流程）',
    {
      session_id: "test-full-" + Date.now(),
      conversation_history: [
        { role: "assistant", content: "你好！今年最让你自豪的成就是什么？" },
        {
          role: "user",
          content: `我完成了三个主要项目：

1. 前端性能优化 - 通过代码分割和懒加载，将首屏加载时间从 3.5 秒降低到 1.2 秒，提升了用户体验。

2. 组件库重构 - 设计并实现了 30+ 个可复用组件，覆盖 90% 的业务场景，开发效率提升 40%。

3. 监控系统升级 - 集成了 Sentry 和自定义埋点，错误发现时间从 2 天缩短到 10 分钟。

在挑战方面，最大的难点是在性能优化时平衡功能需求和加载速度。我采用了渐进式加载策略，先展示核心内容，再逐步加载次要功能。

团队成员评价我的代码质量高，文档详细，帮助 3 位新人快速上手。`
        }
      ],
      preferences: {
        role: "前端工程师",
        audience: "leader",
        tone: "formal",
        length_main_chars: 800
      }
    }
  );
  results.push({ name: '完整场景', ...test4 });

  // 等待 3 秒
  await new Promise(r => setTimeout(r, 3000));

  // 测试 5: 包含修改历史的场景（测试 Agent D 质量控制循环）
  const test5 = await testWebhook(
    '🔄 质量控制：包含重写上下文（测试 Critic 循环）',
    {
      session_id: "test-rewrite-" + Date.now(),
      conversation_history: [
        { role: "assistant", content: "请描述你的主要成就" },
        {
          role: "user",
          content: `我负责了前端架构升级：

技术成果：
- 引入 TypeScript，类型覆盖率达到 85%
- 实现微前端架构，支持 5 个子应用独立部署
- 性能优化：FCP 从 2.1s 降至 0.8s

团队贡献：
- 组织 10+ 场技术分享
- 编写前端开发规范文档
- Mentoring 2 名初级工程师

面临的挑战：
- 遗留代码重构风险控制
- 跨团队沟通协调
- 上线前的充分测试`
        }
      ],
      preferences: {
        role: "前端工程师",
        audience: "leader",
        tone: "professional",
        length_main_chars: 1000
      }
    }
  );
  results.push({ name: '质量控制场景', ...test5 });

  // 打印测试总结
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 测试总结');
  console.log('='.repeat(60) + '\n');

  results.forEach((result, i) => {
    console.log(`${i + 1}. ${result.name}`);
    console.log(`   状态: ${result.success ? '✅' : '❌'}`);
    console.log(`   响应时间: ${result.duration}ms`);

    if (result.data) {
      if (result.data.success === false) {
        console.log(`   分支: 错误处理 (${result.data.error || 'Unknown'})`);
      } else if (result.data.data) {
        console.log(`   分支: 成功 (有报告数据)`);
      } else {
        console.log(`   分支: 其他`);
      }
    }

    console.log('');
  });

  const successCount = results.filter(r => r.success).length;
  const avgDuration = Math.round(results.reduce((sum, r) => sum + r.duration, 0) / results.length);

  console.log(`✅ 成功率: ${successCount}/${results.length} (${Math.round(successCount/results.length*100)}%)`);
  console.log(`⏱️  平均响应时间: ${avgDuration}ms`);
  console.log('\n' + '='.repeat(60));
}

main();
