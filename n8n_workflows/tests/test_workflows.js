/**
 * n8n Workflows Test Script
 *
 * 用途: 测试 Talk2Report 的 n8n 多智能体工作流
 *
 * 使用方法:
 * node n8n_workflows/tests/test_workflows.js
 */

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const N8N_BASE_URL = process.env.N8N_BASE_URL || 'https://n8n.neican.ai';
const AUTH_TOKEN = process.env.N8N_AUTH_TOKEN || 'NeicanSTT2025Secret';
const INTERVIEW_URL = process.env.N8N_INTERVIEW_URL || `${N8N_BASE_URL}/webhook-test/interview/next-step`;
const GENERATE_URL = process.env.N8N_GENERATE_URL || `${N8N_BASE_URL}/webhook-test/generate`;

// 测试数据
const testData = {
  interview: {
    session_id: 'test-session-' + Date.now(),
    user_answer: '今年我主导完成了前端性能优化项目，通过代码分割和懒加载，使页面加载速度提升了50%。还参与了3个核心业务模块的开发，提升了团队的开发效率。',
    current_state: {
      slots: [
        { name: 'achievements', value: null, filled: false },
        { name: 'challenges', value: null, filled: false },
        { name: 'growth', value: null, filled: false },
        { name: 'team', value: null, filled: false },
        { name: 'future', value: null, filled: false }
      ],
      completion_rate: 0
    }
  },

  generate: {
    conversation_history: [
      {
        role: 'assistant',
        content: '你好！我是你的年终总结助手。今年最让你感到自豪的三个成就是什么？'
      },
      {
        role: 'user',
        content: '今年我主导完成了前端性能优化项目，通过代码分割和懒加载，使页面加载速度提升了50%。另外还参与了用户中心改版项目，新开发了支付系统，还指导了2名新员工。'
      },
      {
        role: 'assistant',
        content: '非常棒的成绩！能详细说说性能优化项目吗？遇到了哪些挑战？'
      },
      {
        role: 'user',
        content: '最大的挑战是历史代码臃肿，我花了大量时间重构核心模块，引入了现代化的构建工具。最终页面加载时间从3秒降到1.5秒。'
      }
    ],
    preferences: {
      role: '前端工程师',
      audience: 'leader',
      tone: 'formal',
      length_main_chars: 1200
    }
  }
};

/**
 * 发送 HTTP 请求
 */
async function sendRequest(url, data) {
  console.log(`\n📤 发送请求到: ${url}`);
  console.log(`📦 请求体:`, JSON.stringify(data, null, 2));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`
    },
    body: JSON.stringify(data)
  });

  console.log(`📊 响应状态: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ 请求失败:`, errorText);
    throw new Error(`Request failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log(`✅ 响应成功:`, JSON.stringify(result, null, 2));
  return result;
}

/**
 * 测试 Agent A (Interviewer)
 */
async function testAgentA() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 测试 Agent A (Interviewer)');
  console.log('='.repeat(60));

  try {
    const result = await sendRequest(INTERVIEW_URL, testData.interview);

    // 验证响应
    assert(result.question, '响应包含 question');
    assert(result.thinking, '响应包含 thinking');
    assert(result.updated_state, '响应包含 updated_state');
    assert(typeof result.updated_state.completion_rate === 'number', 'completion_rate 是数字');

    console.log('\n✅ Agent A 测试通过!');
    return result;
  } catch (error) {
    console.error('\n❌ Agent A 测试失败:', error.message);
    throw error;
  }
}

/**
 * 测试 Agent B+C+D (Generate)
 */
async function testGenerate() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 测试 Agent B+C+D (Generate Workflow)');
  console.log('='.repeat(60));

  try {
    const result = await sendRequest(GENERATE_URL, testData.generate);

    // 验证响应
    assert(result.success, '响应包含 success: true');
    assert(result.factsheet, '响应包含 factsheet');
    assert(result.versions, '响应包含 versions');
    assert(Array.isArray(result.versions), 'versions 是数组');
    assert(result.versions.length === 3, 'versions 包含3个版本');
    assert(result.quality, '响应包含 quality');
    assert(typeof result.quality.score === 'number', 'quality.score 是数字');

    // 验证每个版本
    result.versions.forEach((version, index) => {
      assert(version.type, `版本 ${index + 1} 包含 type`);
      assert(version.content, `版本 ${index + 1} 包含 content`);
      console.log(`\n📄 版本 ${index + 1} (${version.type}): ${version.content.slice(0, 50)}...`);
    });

    console.log(`\n📊 质量评分: ${result.quality.score}/100`);
    console.log(`🎯 质量评价: ${result.quality.verdict}`);
    console.log(`🔄 迭代次数: ${result.iterations}`);

    console.log('\n✅ Agent B+C+D 测试通过!');
    return result;
  } catch (error) {
    console.error('\n❌ Agent B+C+D 测试失败:', error.message);
    throw error;
  }
}

/**
 * 端到端测试
 */
async function testEndToEnd() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 端到端测试: 访谈 -> 生成');
  console.log('='.repeat(60));

  try {
    // 模拟3轮访谈
    let currentState = testData.interview.current_state;
    const answers = [
      '今年我主导完成了前端性能优化项目，通过代码分割和懒加载，使页面加载速度提升了50%。',
      '最大的挑战是历史代码臃肿，我花了大量时间重构核心模块，引入了现代化的构建工具。',
      '我学习了React 18的新特性，还参加了2次技术分享会议。'
    ];

    for (let i = 0; i < answers.length; i++) {
      console.log(`\n📝 访谈轮次 ${i + 1}/3`);
      const interviewResult = await testAgentA();
      currentState = interviewResult.updated_state;
      console.log(`✅ 完成度: ${currentState.completion_rate}%`);

      if (interviewResult.finished) {
        console.log('✅ 访谈完成!');
        break;
      }
    }

    // 生成报告
    console.log('\n📊 生成报告...');
    const generateResult = await testGenerate();

    console.log('\n✅ 端到端测试通过!');
    return {
      interview: currentState,
      generate: generateResult
    };
  } catch (error) {
    console.error('\n❌ 端到端测试失败:', error.message);
    throw error;
  }
}

/**
 * 性能测试
 */
async function testPerformance() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 性能测试');
  console.log('='.repeat(60));

  const iterations = 3;
  const times = [];

  for (let i = 0; i < iterations; i++) {
    console.log(`\n⏱️  第 ${i + 1}/${iterations} 次测试...`);
    const startTime = Date.now();

    try {
      await testGenerate();
      const duration = Date.now() - startTime;
      times.push(duration);
      console.log(`⏱️  耗时: ${duration}ms`);
    } catch (error) {
      console.error(`❌ 第 ${i + 1} 次测试失败:`, error.message);
    }
  }

  if (times.length > 0) {
    const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    console.log('\n📊 性能统计:');
    console.log(`   平均耗时: ${avgTime}ms`);
    console.log(`   最快: ${minTime}ms`);
    console.log(`   最慢: ${maxTime}ms`);
    console.log(`   成功率: ${times.length}/${iterations} (${Math.round(times.length / iterations * 100)}%)`);
  }
}

/**
 * 辅助函数: 断言
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 Talk2Report n8n Workflows Test');
  console.log(`📍 n8n URL: ${N8N_BASE_URL}`);
  console.log(`🔑 Auth Token: ${AUTH_TOKEN.slice(0, 10)}...`);

  const args = process.argv.slice(2);
  const testType = args[0] || 'all';

  try {
    switch (testType) {
      case 'agent-a':
        await testAgentA();
        break;

      case 'generate':
        await testGenerate();
        break;

      case 'e2e':
        await testEndToEnd();
        break;

      case 'perf':
        await testPerformance();
        break;

      case 'all':
      default:
        await testAgentA();
        await testGenerate();
        // await testEndToEnd(); // 可选: 运行完整的端到端测试
        // await testPerformance(); // 可选: 运行性能测试
        break;
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ 所有测试完成!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
main();
