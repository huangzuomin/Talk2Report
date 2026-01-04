/**
 * 测试隐性贡献识别功能
 * 验证反馈中提到的问题是否已修复
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testImplicitContributions() {
  console.log('\n🧪 测试隐性贡献识别功能\n');
  console.log('='.repeat(70));

  const testCases = [
    {
      name: '测试1：基础设施（反馈案例）',
      input: '我搭建了500人的数据网络，作为公司的基础设施',
      expected: ['team_contribution', 'metrics_achievement'],
      description: '应识别为团队贡献（基础设施）+ 量化证据'
    },
    {
      name: '测试2：培训新人（反馈案例）',
      input: '我培训了3个新人，帮助他们快速上手',
      expected: ['team_contribution', 'personal_growth'],
      description: '应识别为团队贡献 + 个人成长'
    },
    {
      name: '测试3：效率工具',
      input: '开发了一个自动化工具，帮大家节省了每周5小时',
      expected: ['team_contribution', 'metrics_achievement'],
      description: '应识别为团队贡献 + 量化证据'
    },
    {
      name: '测试4：跨团队协作',
      input: '协助产品团队完成了需求分析，还帮忙设计了几个功能',
      expected: ['team_contribution'],
      description: '应识别为团队贡献（跨团队协作）'
    },
    {
      name: '测试5：流程建设',
      input: '建立了代码审查规范，提高了代码质量',
      expected: ['team_contribution'],
      description: '应识别为团队贡献（流程建设）'
    },
    {
      name: '测试6：知识分享',
      input: '在团队内部做了3次技术分享，大家反应很好',
      expected: ['team_contribution', 'personal_growth'],
      description: '应识别为团队贡献 + 个人成长（知识分享）'
    },
    {
      name: '测试7：性能优化（量化）',
      input: '优化了数据库查询，响应时间从500ms降到100ms',
      expected: ['metrics_achievement'],
      description: '应识别为量化证据（性能提升）'
    },
    {
      name: '测试8：成本优化（量化）',
      input: '通过优化资源使用，每月为公司节省了2万元',
      expected: ['metrics_achievement'],
      description: '应识别为量化证据（成本降低）'
    }
  ];

  let passedTests = 0;
  let failedTests = 0;

  for (const testCase of testCases) {
    console.log(`\n${testCase.name}`);
    console.log(`📝 输入: "${testCase.input}"`);
    console.log(`📋 说明: ${testCase.description}`);
    console.log('-'.repeat(70));

    try {
      const response = await fetch('http://localhost:3001/api/deepseek/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: `你是一个专业的数据提取专家。从用户访谈回答中提取关键信息。

# 槽位列表
- team_contribution (团队贡献): 对团队的贡献和价值
- personal_growth (个人成长): 个人能力的提升
- metrics_achievement (量化证据): 成果的具体数据
- achievement_1 (核心成果一): 最重要的工作成果

# 🔍 语义映射规则

**团队贡献的隐性信号**：
- 基础设施/平台/系统建设 → "构建公司基础设施"
- 数据网络/中台/框架 → "为团队提供技术基础设施"
- 帮助/协助/支持其他团队 → "跨团队协作支持"
- 工具开发/效率提升 → "为团队开发工具提升效率"
- 培训/指导/带新人 → "培养团队成员"
- 文档/规范/流程建设 → "建立团队规范和流程"
- 分享/演讲/写作 → "知识分享和传播"

**个人成长的隐性信号**：
- 培训/指导/带新人 → "培养团队成员"
- 学习新技术/新技能 → "拓展技术能力"
- 分享/演讲/写作 → "知识分享和传播"

**量化证据的隐性信号**：
- 性能提升/优化 → "性能改善指标"
- 时间缩短/效率提高 → "效率提升数据"
- 成本降低/资源节约 → "成本优化效果"
- 用户增长/满意度 → "业务增长指标"

# 输出格式
只输出 JSON：{"updates": [{"key": "槽位key", "value": "内容"}]}`
            },
            {
              role: 'user',
              content: testCase.input
            }
          ],
          temperature: 0.1
        })
      });

      if (!response.ok) {
        console.log(`❌ API 错误: ${response.status}`);
        failedTests++;
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      // 解析JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);

        console.log('\n✅ 解析成功');
        console.log('📊 提取结果:');
        console.log(JSON.stringify(result, null, 2));

        if (result.updates && result.updates.length > 0) {
          console.log('\n🎯 提取到的槽位:');
          result.updates.forEach((update, index) => {
            console.log(`   ${index + 1}. ${update.key}:`);
            console.log(`      ${update.value}`);
          });

          // 验证是否提取到预期的槽位
          const extractedKeys = result.updates.map(u => u.key);
          const hasExpectedKeys = testCase.expected.every(key =>
            extractedKeys.includes(key)
          );

          if (hasExpectedKeys) {
            console.log('\n✅ 测试通过：提取到所有预期槽位');
            passedTests++;
          } else {
            console.log('\n⚠️  测试部分通过：未提取到所有预期槽位');
            console.log(`   预期: ${testCase.expected.join(', ')}`);
            console.log(`   实际: ${extractedKeys.join(', ')}`);
            console.log(`   缺失: ${testCase.expected.filter(k => !extractedKeys.includes(k)).join(', ')}`);
            failedTests++;
          }
        } else {
          console.log('\n❌ 未提取到任何信息');
          console.log(`   预期: ${testCase.expected.join(', ')}`);
          failedTests++;
        }
      } else {
        console.log('\n❌ 无法解析 JSON');
        console.log('原始响应:', content.slice(0, 200));
        failedTests++;
      }

    } catch (error) {
      console.error('\n❌ 测试失败:', error.message);
      failedTests++;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`\n📊 测试总结:`);
  console.log(`   ✅ 通过: ${passedTests}/${testCases.length}`);
  console.log(`   ❌ 失败: ${failedTests}/${testCases.length}`);
  console.log(`   📈 成功率: ${((passedTests / testCases.length) * 100).toFixed(1)}%`);

  if (passedTests === testCases.length) {
    console.log('\n🎉 所有测试通过！隐性贡献识别功能正常工作。\n');
    console.log('📝 改进效果:');
    console.log('   ✅ 能识别"基础设施"为团队贡献');
    console.log('   ✅ 能识别"培训新人"为团队贡献+个人成长');
    console.log('   ✅ 能识别"效率工具"为团队贡献+量化证据');
    console.log('   ✅ 能识别各种隐性贡献信号\n');
  } else {
    console.log('\n⚠️  部分测试失败，可能需要进一步优化 prompt。\n');
  }

  console.log('='.repeat(70) + '\n');
}

testImplicitContributions();
