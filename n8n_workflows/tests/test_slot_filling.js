/**
 * 测试槽位填充功能
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testSlotFilling() {
  console.log('\n🧪 测试槽位填充功能\n');
  console.log('='.repeat(60));

  const userMessage = "我完成了外卖算法报道，这个报道在社交媒体上引起了很大反响，阅读量超过了100万。我们还优化了前端性能，将加载时间从3秒降到了1秒。";

  console.log('\n📝 用户回答:');
  console.log(userMessage);
  console.log('\n' + '-'.repeat(60));

  try {
    const response = await fetch('http://localhost:3001/api/deepseek/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{
          role: 'system',
          content: `你是一个数据提取专家。分析用户回答，提取信息填入对应的槽位。

# 槽位列表
- achievement_1 (核心成果一): 描述本年度最重要的工作成果
- achievement_2 (核心成果二): 描述第二个重要成果
- metrics_achievement (量化证据): 成果的具体数据或指标
- tech_stack (技术栈): 使用的主要技术或工具

# 用户回答
${userMessage}

# 任务
1. 分析用户回答包含哪些槽位的信息
2. 提取关键信息，精简总结
3. 输出 JSON 格式

# 输出格式
{
  "updates": [
    {"key": "槽位key", "value": "提取的内容"}
  ]
}

# 示例
用户："我完成了外卖算法报道，上了热搜"
输出：
{
  "updates": [
    {"key": "achievement_1", "value": "外卖算法报道上热搜"}
  ]
}

如果没有新信息，输出 {"updates": []}。`
        }],
        temperature: 0.1
      })
    });

    if (!response.ok) {
      console.log(`\n❌ API 错误: ${response.status}`);
      return;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    console.log('\n📋 原始响应:');
    console.log(content);

    // 解析JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);

      console.log('\n✅ 解析成功');
      console.log('\n📊 提取结果:');
      console.log(JSON.stringify(result, null, 2));

      if (result.updates && result.updates.length > 0) {
        console.log('\n🎯 提取到的槽位:');
        result.updates.forEach((update, index) => {
          console.log(`   ${index + 1}. ${update.key}:`);
          console.log(`      ${update.value}`);
        });
      } else {
        console.log('\n⚠️  未提取到任何信息');
      }

      console.log('\n💡 预期结果:');
      console.log('   - achievement_1: 外卖算法报道相关');
      console.log('   - metrics_achievement: 100万阅读量或3秒→1秒');

      // 验证是否提取到了关键信息
      const extractedKeys = result.updates?.map(u => u.key) || [];
      const hasAchievement = extractedKeys.includes('achievement_1');
      const hasMetrics = extractedKeys.includes('metrics_achievement');

      if (hasAchievement && hasMetrics) {
        console.log('\n✅ 完美！提取到了所有关键信息');
      } else if (hasAchievement || hasMetrics) {
        console.log('\n⚠️  部分提取成功');
      } else {
        console.log('\n❌ 提取失败，可能需要优化提示词');
      }

    } else {
      console.log('\n❌ 无法解析 JSON');
    }

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

testSlotFilling();
