/**
 * Talk2Report Generate Workflow v3.0 Enhanced - Test Script
 *
 * 用途: 测试融合版工作流的各项功能
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const N8N_GENERATE_URL = process.env.N8N_GENERATE_URL || 'https://n8n.neican.ai/webhook-test/generate';
const AUTH_TOKEN = process.env.N8N_AUTH_TOKEN || 'NeicanSTT2025Secret';

// 测试数据集
const testCases = {
  // 测试 1: 输入验证 - 缺少 session_id
  validation_missing_session_id: {
    name: "❌ 验证测试：缺少 session_id",
    payload: {
      conversation_history: [
        { role: "assistant", content: "你好！" },
        { role: "user", content: "今年我主导完成了前端性能优化。" }
      ],
      preferences: {
        role: "前端工程师",
        audience: "leader",
        tone: "formal",
        length_main_chars: 1200
      }
    },
    expected: "Validation failed"
  },

  // 测试 2: 输入验证 - 缺少 conversation_history
  validation_missing_conversation: {
    name: "❌ 验证测试：缺少 conversation_history",
    payload: {
      session_id: "test-validation-001",
      preferences: {
        role: "前端工程师",
        audience: "leader",
        tone: "formal"
      }
    },
    expected: "Validation failed"
  },

  // 测试 3: 输入验证 - 缺少 preferences
  validation_missing_preferences: {
    name: "❌ 验证测试：缺少 preferences",
    payload: {
      session_id: "test-validation-002",
      conversation_history: [
        { role: "assistant", content: "你好！" },
        { role: "user", content: "今年我主导完成了前端性能优化。" }
      ]
    },
    expected: "Validation failed"
  },

  // 测试 4: 完整流程 - 简单数据
  full_flow_simple: {
    name: "✅ 完整流程测试：简单数据",
    payload: {
      session_id: "test-v3-enhanced-" + Date.now(),
      conversation_history: [
        { role: "assistant", content: "你好！我是你的年终总结助手。今年最让你感到自豪的三个成就是什么？" },
        { role: "user", content: "今年我主导完成了前端性能优化项目，通过代码分割和懒加载，使页面加载速度提升了50%。另外还参与了用户中心改版项目，新开发了支付系统，还指导了2名新员工。" },
        { role: "assistant", content: "非常棒的成绩！能详细说说性能优化项目吗？遇到了哪些挑战？" },
        { role: "user", content: "最大的挑战是历史代码臃肿，我花了大量时间重构核心模块，引入了现代化的构建工具。最终页面加载时间从3秒降到1.5秒。" }
      ],
      preferences: {
        role: "前端工程师",
        audience: "leader",
        tone: "formal",
        length_main_chars: 1200
      }
    },
    expected: "success"
  },

  // 测试 5: 完整流程 - 丰富数据（触发质量验证）
  full_flow_rich: {
    name: "✅ 完整流程测试：丰富数据",
    payload: {
      session_id: "test-v3-rich-" + Date.now(),
      conversation_history: [
        { role: "assistant", content: "你好！我是你的年终总结助手。今年最让你感到自豪的成就是什么？" },
        { role: "user", content: "今年我作为Tech Lead主导完成了CRM系统重构项目，将老的PHP系统迁移到Node.js微服务架构。带领5人团队，历时6个月，最终使系统响应时间从800ms降至200ms，用户满意度提升40%。我还负责修复了15个关键bug，系统稳定性提升25%。在性能优化方面，我优化了12个数据库查询，平均性能提升60%，每年节省服务器成本约8万元。" },
        { role: "assistant", content: "非常出色的成绩！在个人成长和团队协作方面呢？" },
        { role: "user", content: "个人成长方面，我学习了Kubernetes容器编排，掌握了Go语言基础并完成了2个微服务模块。参加了QCon大会和阿里云架构师培训，共计40小时，获得了阿里云ACP和CKA认证。团队方面，我指导了2名初级工程师，帮助他们在3个月内独立工作。组织了4次内部技术分享会，主题包括微服务、性能优化和DevOps。与产品和QA团队紧密合作，实现了100%的准时交付率。" }
      ],
      preferences: {
        role: "高级软件工程师",
        audience: "manager",
        tone: "professional",
        length_main_chars: 1500
      }
    },
    expected: "success"
  }
};

/**
 * 发送 HTTP 请求
 */
async function sendRequest(testName, payload) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`${testName}`);
  console.log('='.repeat(70));

  console.log(`\n📤 发送请求到: ${N8N_GENERATE_URL}`);
  console.log(`📦 Session ID: ${payload.session_id || '(missing)'}`);

  const startTime = Date.now();

  try {
    const response = await fetch(N8N_GENERATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      },
      body: JSON.stringify(payload)
    });

    const duration = Date.now() - startTime;
    console.log(`⏱️  响应时间: ${duration}ms`);
    console.log(`📊 HTTP Status: ${response.status} ${response.statusText}`);

    const result = await response.json();

    if (!response.ok) {
      console.error(`❌ 请求失败:`, result);
      return { success: false, result, duration };
    }

    console.log(`✅ 请求成功`);

    // 检查响应格式
    if (result.success) {
      console.log(`\n📈 质量评分: ${result.quality?.score || 'N/A'}/100`);
      console.log(`🎯 质量评价: ${result.quality?.verdict || 'N/A'}`);
      console.log(`🔄 迭代次数: ${result.iterations || 'N/A'}`);
      console.log(`📦 生成版本数: ${result.versions?.length || 0}`);

      if (result.metadata) {
        console.log(`\n📊 元数据:`);
        console.log(`   - 处理时间: ${result.metadata.processing_time_ms}ms`);
        console.log(`   - 版本: ${result.metadata.version}`);
        console.log(`   - 模型: ${result.metadata.model}`);
        console.log(`   - 时间戳: ${result.metadata.timestamp}`);
      }

      // 显示每个版本的预览
      if (result.versions) {
        console.log(`\n📄 生成的版本:`);
        result.versions.forEach((v, i) => {
          const preview = v.content?.slice(0, 80) || '(empty)';
          console.log(`   ${i + 1}. [${v.type}] ${preview}...`);
        });
      }
    } else {
      console.log(`\n❌ 错误响应:`);
      console.log(`   - Error: ${result.error}`);
      console.log(`   - Message: ${result.message}`);
      if (result.details) {
        console.log(`   - Details:`, JSON.stringify(result.details, null, 2));
      }
    }

    return { success: true, result, duration };

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`\n❌ 请求异常:`, error.message);
    return { success: false, error: error.message, duration };
  }
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log('\n' + '🚀'.repeat(35));
  console.log('  Talk2Report Generate Workflow v3.0 Enhanced - 测试套件');
  console.log('🚀'.repeat(35));
  console.log(`📍 n8n URL: ${N8N_GENERATE_URL}`);
  console.log(`🔑 Auth Token: ${AUTH_TOKEN.slice(0, 10)}...`);

  const args = process.argv.slice(2);
  const testFilter = args[0];

  const results = [];

  for (const [key, testCase] of Object.entries(testCases)) {
    // 如果指定了测试过滤器，跳过不匹配的测试
    if (testFilter && !key.includes(testFilter)) {
      continue;
    }

    const { success, result, duration, error } = await sendRequest(testCase.name, testCase.payload);

    // 验证结果
    let passed = false;
    if (testCase.expected === "Validation failed") {
      passed = !success || (result && !result.success);
    } else if (testCase.expected === "success") {
      passed = success && result && result.success;
    }

    results.push({
      test: key,
      name: testCase.name,
      passed,
      duration,
      result: result || error
    });

    // 等待一下避免请求过快
    await new Promise(r => setTimeout(r, 1000));
  }

  // 汇总结果
  console.log('\n' + '='.repeat(70));
  console.log('📊 测试结果汇总');
  console.log('='.repeat(70));

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  results.forEach(r => {
    const icon = r.passed ? '✅' : '❌';
    console.log(`${icon} ${r.name}`);
    console.log(`   状态: ${r.passed ? 'PASSED' : 'FAILED'}`);
    console.log(`   耗时: ${r.duration}ms`);
    if (!r.passed) {
      console.log(`   原因:`, JSON.stringify(r.result, null, 2));
    }
    console.log();
  });

  console.log(`\n总计: ${passed}/${total} 通过`);

  if (passed === total) {
    console.log('\n🎉 所有测试通过！');
    process.exit(0);
  } else {
    console.log('\n⚠️  部分测试失败，请检查工作流配置');
    process.exit(1);
  }
}

// 运行测试
runAllTests();
