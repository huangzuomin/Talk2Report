/**
 * 测试修复后的槽位填充功能
 * 关键修复：必须发送 user 消息给 API
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testExtraction() {
  console.log('\n🧪 测试槽位提取功能（修复版）\n');
  console.log('='.repeat(60));

  const testCases = [
    {
      name: '测试1：单个槽位（成果）',
      input: '我完成了外卖算法报道，这个报道在社交媒体上引起了很大反响，阅读量超过了100万。',
      expected: ['achievement_1', 'metrics_achievement']
    },
    {
      name: '测试2：多个槽位（成果+量化）',
      input: '我们还优化了前端性能，将加载时间从3秒降到了1秒。用户满意度提升了40%。',
      expected: ['achievement_2', 'metrics_achievement']
    },
    {
      name: '测试3：技术栈',
      input: '主要使用的技术是React、Node.js和MongoDB。',
      expected: ['tech_stack']
    },
    {
      name: '测试4：无新信息',
      input: '好的，没问题。',
      expected: []
    }
  ];

  let passedTests = 0;
  let failedTests = 0;

  for (const testCase of testCases) {
    console.log(`\n${testCase.name}`);
    console.log(`输入: "${testCase.input}"`);
    console.log('-'.repeat(60));

    try {
      const response = await fetch('http://localhost:3001/api/deepseek/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: `你是一个专业的数据提取专家。从用户访谈回答中提取关键信息并填入槽位。

# 槽位列表
- achievement_1 (核心成果一): 描述本年度最重要的工作成果
- achievement_2 (核心成果二): 描述第二个重要成果
- metrics_achievement (量化证据): 成果的具体数据或指标
- tech_stack (技术栈): 使用的主要技术或工具

# 提取规则
1. 精准匹配：判断用户回答属于哪个槽位
2. 精简总结：用1-2句话总结核心信息
3. 量化优先：优先提取数字、指标
4. 多槽位提取：一个回答可能包含多个槽位信息

# 输出格式
只输出 JSON：
{"updates": [{"key": "槽位key", "value": "提取内容"}]}

# 提取示例

**示例1：单个槽位**
用户："我完成了外卖算法报道，阅读量超过100万"
输出：
{"updates": [
  {"key": "achievement_1", "value": "完成外卖算法报道，阅读量超100万"},
  {"key": "metrics_achievement", "value": "报道阅读量超100万"}
]}

**示例2：多个槽位**
用户："优化了前端性能，加载时间从3秒降到1秒"
输出：
{"updates": [
  {"key": "achievement_2", "value": "优化前端性能，缩短加载时间"},
  {"key": "metrics_achievement", "value": "加载时间从3秒降至1秒"}
]}

**示例3：无新信息**
用户："好的，没问题"
输出：{"updates": []}`
            },
            {
              role: 'user',  // ✅ 关键：必须发送用户消息
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

      console.log('原始响应:');
      console.log(content.slice(0, 200) + (content.length > 200 ? '...' : ''));

      // 解析JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);

        console.log('\n✅ 解析成功');
        console.log('提取结果:');
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

          if (testCase.expected.length === 0) {
            // 预期无提取
            if (result.updates.length === 0) {
              console.log('\n✅ 测试通过：正确识别无新信息');
              passedTests++;
            } else {
              console.log('\n⚠️  测试警告：预期无提取，但提取了内容');
              failedTests++;
            }
          } else if (hasExpectedKeys) {
            console.log('\n✅ 测试通过：提取到所有预期槽位');
            passedTests++;
          } else {
            console.log('\n⚠️  测试部分通过：未提取到所有预期槽位');
            console.log(`   预期: ${testCase.expected.join(', ')}`);
            console.log(`   实际: ${extractedKeys.join(', ')}`);
            failedTests++;
          }
        } else {
          console.log('\n⚠️  未提取到任何信息');

          if (testCase.expected.length === 0) {
            console.log('✅ 测试通过：正确识别无新信息');
            passedTests++;
          } else {
            console.log(`❌ 测试失败：预期提取 ${testCase.expected.join(', ')}`);
            failedTests++;
          }
        }
      } else {
        console.log('\n❌ 无法解析 JSON');
        failedTests++;
      }

    } catch (error) {
      console.error('\n❌ 测试失败:', error.message);
      failedTests++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 测试总结:`);
  console.log(`   ✅ 通过: ${passedTests}/${testCases.length}`);
  console.log(`   ❌ 失败: ${failedTests}/${testCases.length}`);
  console.log(`   📈 成功率: ${((passedTests / testCases.length) * 100).toFixed(1)}%`);

  if (passedTests === testCases.length) {
    console.log('\n🎉 所有测试通过！槽位提取功能正常工作。\n');
  } else {
    console.log('\n⚠️  部分测试失败，请检查提取逻辑。\n');
  }

  console.log('='.repeat(60) + '\n');
}

testExtraction();
