/**
 * 端到端自动化测试 - 模拟完整用户流程
 * 测试 Interview → Generate 的完整流程
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const N8N_INTERVIEW_URL = process.env.N8N_INTERVIEW_URL;
const N8N_GENERATE_URL = process.env.N8N_GENERATE_URL;
const N8N_AUTH_TOKEN = process.env.N8N_AUTH_TOKEN;

// 彩色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 模拟用户访谈数据
const mockInterview = {
  userName: "张三",
  role: "前端工程师",
  achievements: [
    "完成了前端性能优化项目，将首屏加载时间从3秒降到1秒",
    "重构了旧代码，提升了代码质量和可维护性",
    "带领团队完成了3个重要项目的交付"
  ],
  challenges: [
    "在性能优化过程中遇到了兼容性问题",
    "项目时间紧张，需要平衡质量和进度"
  ],
  growth: [
    "学习了React 18的新特性",
    "提升了团队协作和沟通能力"
  ],
  teamContribution: [
    "组织了5次技术分享会",
    "帮助新员工快速融入团队"
  ],
  futureGoals: [
    "深入学习和实践微前端架构",
    "提升全栈开发能力"
  ]
};

async function testInterviewFlow() {
  log('\n📝 第一阶段: Interview Workflow (Agent A 访谈)', 'blue');
  log('='.repeat(60), 'blue');

  const session_id = 'e2e-test-' + Date.now();
  const conversationHistory = [];

  // 第1轮：初始提问
  log('\n🔸 第1轮：开始访谈', 'yellow');
  const round1 = await fetch(N8N_INTERVIEW_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${N8N_AUTH_TOKEN}`
    },
    body: JSON.stringify({ session_id })
  });

  if (!round1.ok) {
    log('❌ 第1轮失败', 'red');
    return null;
  }

  const data1 = await round1.json();
  conversationHistory.push({ role: 'assistant', content: data1.question });
  log(`✅ Agent A: ${data1.question.slice(0, 60)}...`, 'green');

  // 模拟用户回答
  await delay(1000);
  const userAnswer1 = mockInterview.achievements[0];
  log(`👤 用户: ${userAnswer1}`, 'yellow');

  // 第2轮：回答成就
  log('\n🔸 第2轮：用户回答成就', 'yellow');
  const round2 = await fetch(N8N_INTERVIEW_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${N8N_AUTH_TOKEN}`
    },
    body: JSON.stringify({
      session_id,
      conversation_history: [
        ...conversationHistory,
        { role: 'user', content: userAnswer1 }
      ]
    })
  });

  const data2 = await round2.json();
  conversationHistory.push({ role: 'user', content: userAnswer1 });
  conversationHistory.push({ role: 'assistant', content: data2.question });
  log(`✅ Agent A: ${data2.question.slice(0, 60)}...`, 'green');

  // 第3轮：回答挑战
  await delay(1000);
  const userAnswer2 = mockInterview.challenges[0];
  log(`👤 用户: ${userAnswer2}`, 'yellow');

  log('\n🔸 第3轮：用户回答挑战', 'yellow');
  const round3 = await fetch(N8N_INTERVIEW_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${N8N_AUTH_TOKEN}`
    },
    body: JSON.stringify({
      session_id,
      conversation_history: [
        ...conversationHistory,
        { role: 'user', content: userAnswer2 }
      ]
    })
  });

  const data3 = await round3.json();
  conversationHistory.push({ role: 'user', content: userAnswer2 });
  conversationHistory.push({ role: 'assistant', content: data3.question });
  log(`✅ Agent A: ${data3.question.slice(0, 60)}...`, 'green');

  // 第4轮：回答成长
  await delay(1000);
  const userAnswer3 = mockInterview.growth[0];
  log(`👤 用户: ${userAnswer3}`, 'yellow');

  log('\n🔸 第4轮：用户回答成长', 'yellow');
  const round4 = await fetch(N8N_INTERVIEW_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${N8N_AUTH_TOKEN}`
    },
    body: JSON.stringify({
      session_id,
      conversation_history: [
        ...conversationHistory,
        { role: 'user', content: userAnswer3 }
      ]
    })
  });

  const data4 = await round4.json();
  conversationHistory.push({ role: 'user', content: userAnswer3 });
  conversationHistory.push({ role: 'assistant', content: data4.question });

  log(`\n✅ Interview 阶段完成！`, 'green');
  log(`📊 对话轮数: ${conversationHistory.length / 2}`, 'blue');
  log(`📝 对话历史已保存 (${conversationHistory.length} 条消息)`, 'blue');

  return { session_id, conversationHistory };
}

async function testGenerateFlow({ session_id, conversationHistory }) {
  log('\n\n📋 第二阶段: Generate Workflow (Agent B+C+D 生成报告)', 'blue');
  log('='.repeat(60), 'blue');

  const preferences = {
    role: mockInterview.role,
    audience: 'leader',
    tone: 'formal',
    length_main_chars: 800
  };

  log('\n⚙️  报告偏好:', 'yellow');
  log(`   角色: ${preferences.role}`, 'yellow');
  log(`   受众: ${preferences.audience}`, 'yellow');
  log(`   语气: ${preferences.tone}`, 'yellow');
  log(`   长度: ${preferences.length_main_chars} 字`, 'yellow');

  log('\n🚀 调用 Generate Workflow...', 'yellow');

  const startTime = Date.now();
  const response = await fetch(N8N_GENERATE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${N8N_AUTH_TOKEN}`
    },
    body: JSON.stringify({
      session_id,
      conversation_history: conversationHistory,
      preferences
    })
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  if (!response.ok) {
    log(`❌ Generate Workflow 失败 (${response.status})`, 'red');
    return null;
  }

  const text = await response.text();

  if (text.length === 0) {
    log('❌ 返回空响应', 'red');
    return null;
  }

  try {
    const result = JSON.parse(text);

    log(`\n✅ 报告生成成功！耗时: ${duration}秒`, 'green');

    // 分析结果
    log('\n📊 生成结果分析:', 'blue');

    if (result.factsheet) {
      log('\n📁 Factsheet (Agent B 提取):', 'blue');
      const fs = result.factsheet;
      log(`   基本信息: ${fs.basic_info || '❌ 未提取'}`, fs.basic_info ? 'green' : 'red');
      log(`   工作亮点: ${fs.highlights || '❌ 未提取'}`, fs.highlights ? 'green' : 'red');
      log(`   面临挑战: ${fs.challenges || '❌ 未提取'}`, fs.challenges ? 'green' : 'red');
      log(`   个人成长: ${fs.growth || '❌ 未提取'}`, fs.growth ? 'green' : 'red');
      log(`   团队贡献: ${fs.team_contribution || '❌ 未提取'}`, fs.team_contribution ? 'green' : 'red');
      log(`   未来目标: ${fs.future_goals || '❌ 未提取'}`, fs.future_goals ? 'green' : 'red');

      // 统计提取完整度
      const fields = ['basic_info', 'highlights', 'challenges', 'growth', 'team_contribution', 'future_goals'];
      const extracted = fields.filter(f => fs[f]).length;
      const percentage = ((extracted / fields.length) * 100).toFixed(0);

      log(`\n   📈 数据提取完整度: ${percentage}% (${extracted}/${fields.length})`, percentage === '100' ? 'green' : 'yellow');
    }

    if (result.versions && result.versions.length > 0) {
      log('\n📝 报告版本 (Agent C 生成):', 'blue');
      result.versions.forEach((v, i) => {
        const versionNames = ['简版', '正式版', '社交版'];
        const preview = v.content ? v.content.slice(0, 100) + '...' : '(空)';
        log(`   ${i + 1}. ${versionNames[i]}:`, 'green');
        log(`      ${preview}`, 'reset');
      });
    }

    if (result.verdict) {
      log('\n🔍 质量检验 (Agent D 评审):', 'blue');
      log(`   通过: ${result.verdict.passed ? '✅ 是' : '❌ 否'}`, result.verdict.passed ? 'green' : 'red');
      log(`   评分: ${result.verdict.score || 'N/A'}/100`, 'blue');
      if (result.verdict.verdict) {
        log(`   评语: ${result.verdict.verdict.slice(0, 100)}...`, 'blue');
      }
      if (result.verdict.issues && result.verdict.issues.length > 0) {
        log(`   问题: ${result.verdict.issues.length} 项`, 'yellow');
      }
      log(`   迭代次数: ${result.iterations || 1}`, 'blue');
    }

    return result;

  } catch (e) {
    log(`\n❌ 解析响应失败: ${e.message}`, 'red');
    log(`原始响应: ${text.slice(0, 200)}`, 'red');
    return null;
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  log('\n🎬 Talk2Report 端到端自动化测试', 'blue');
  log('='.repeat(60), 'blue');
  log(`测试时间: ${new Date().toLocaleString('zh-CN')}`, 'blue');
  log(`模拟用户: ${mockInterview.userName}`, 'blue');
  log(`用户角色: ${mockInterview.role}`, 'blue');

  try {
    // 阶段1: Interview
    const interviewResult = await testInterviewFlow();

    if (!interviewResult) {
      log('\n❌ Interview 阶段失败，终止测试', 'red');
      return;
    }

    // 等待2秒
    await delay(2000);

    // 阶段2: Generate
    const generateResult = await testGenerateFlow(interviewResult);

    if (!generateResult) {
      log('\n❌ Generate 阶段失败', 'red');
      return;
    }

    // 总结
    log('\n\n' + '='.repeat(60), 'blue');
    log('🎉 端到端测试完成！', 'green');
    log('='.repeat(60), 'blue');

    const hasIssues = !generateResult.factsheet?.basic_info ||
                      !generateResult.factsheet?.challenges ||
                      !generateResult.factsheet?.growth;

    if (hasIssues) {
      log('\n⚠️  存在问题:', 'yellow');
      log('   - Agent B 数据提取不完整', 'yellow');
      log('   - 需要优化 Agent B 的提示词或表达式', 'yellow');
    } else {
      log('\n✅ 所有功能正常！', 'green');
    }

    log('\n💡 建议:', 'blue');
    log('   1. 在浏览器中测试实际用户体验', 'blue');
    log('   2. 检查前端界面的显示效果', 'blue');
    log('   3. 测试不同的用户输入场景', 'blue');

  } catch (error) {
    log(`\n❌ 测试出错: ${error.message}`, 'red');
    console.error(error);
  }
}

main();
