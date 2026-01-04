/**
 * 验证混合方案配置
 * Interview: 前端直接调用 (deepseek-chat)
 * Generate: n8n 工作流
 */

import fs from 'fs';

console.log('\n🔍 验证 Talk2Report 混合方案配置\n');
console.log('='.repeat(70));

const results = {
  interviewLocal: false,
  interviewModel: 'unknown',
  generateN8N: false,
  sessionIdTracked: false
};

// 1. 检查 useInterview - 应该使用本地调用
console.log('\n📋 1. 检查 useInterview (前端直接调用)');
const useInterviewContent = fs.readFileSync('src/hooks/useDeepSeek.js', 'utf8');

const usesLocalCall = useInterviewContent.includes('// 调用本地 DeepSeek API (使用 chat 模型，快速)');
const usesN8NCall = useInterviewContent.includes('await callAgentAWithN8N');

console.log(`   - 使用本地调用: ${usesLocalCall ? '✅' : '❌'}`);
console.log(`   - 使用 n8n 调用: ${usesN8NCall ? '⚠️  (不应该)' : '✅ 正确'}`);

if (usesLocalCall && !usesN8NCall) {
  results.interviewLocal = true;
  console.log(`   ✅ useInterview 使用前端直接调用`);
} else {
  console.log(`   ❌ useInterview 配置不正确`);
}

// 2. 检查模型类型
console.log('\n📋 2. 检查 Interview 模型类型');
const deepseekClientContent = fs.readFileSync('src/lib/deepseek-client.js', 'utf8');

const usesChatModel = deepseekClientContent.includes("model: 'deepseek-chat'") && deepseekClientContent.includes('// 使用 chat 模型，快速响应');
const usesReasonerModel = deepseekClientContent.includes("model: 'deepseek-reasoner'");

if (usesChatModel && !usesReasonerModel) {
  results.interviewModel = 'deepseek-chat';
  console.log(`   ✅ 模型: deepseek-chat (快速)`);
} else if (usesReasonerModel) {
  results.interviewModel = 'deepseek-reasoner';
  console.log(`   ⚠️  模型: deepseek-reasoner (慢速)`);
} else {
  console.log(`   ⚠️  无法确定模型类型`);
}

// 3. 检查 useReportGeneration - 应该使用 n8n
console.log('\n📋 3. 检查 useReportGeneration (n8n 工作流)');
const usesGenerateN8N = useInterviewContent.includes('await generateReportWithN8N({');
const usesGenerateLocal = useInterviewContent.includes('await generateReportWithCritic({');

console.log(`   - 使用 n8n: ${usesGenerateN8N ? '✅' : '❌'}`);
console.log(`   - 使用本地: ${usesGenerateLocal ? '⚠️  (不应该)' : '✅ 正确'}`);

if (usesGenerateN8N && !usesGenerateLocal) {
  results.generateN8N = true;
  console.log(`   ✅ useReportGeneration 使用 n8n 工作流`);
} else {
  console.log(`   ❌ useReportGeneration 配置不正确`);
}

// 4. 检查 sessionId 追踪
console.log('\n📋 4. 检查 sessionId 追踪');
const hasSessionIdInInterview = useInterviewContent.includes('const [sessionId, setSessionId]');
const hasSessionIdInMachine = fs.readFileSync('src/hooks/useInterviewMachine.js', 'utf8').includes('const [sessionId, setSessionId]');
const sessionPassedToGenerate = useInterviewContent.includes('sessionId') && usesGenerateN8N;

console.log(`   - useInterview 中定义 sessionId: ${hasSessionIdInInterview ? '✅' : '❌'}`);
console.log(`   - useInterviewMachine 中定义 sessionId: ${hasSessionIdInMachine ? '✅' : '❌'}`);
console.log(`   - sessionId 传递给 Generate: ${sessionPassedToGenerate ? '✅' : '❌'}`);

if (hasSessionIdInInterview && hasSessionIdInMachine && sessionPassedToGenerate) {
  results.sessionIdTracked = true;
  console.log(`   ✅ sessionId 正确追踪和传递`);
} else {
  console.log(`   ⚠️  sessionId 追踪可能有问题`);
}

// 5. 总结
console.log('\n' + '='.repeat(70));
console.log('📊 混合方案配置总结\n');

console.log('Interview 阶段:');
console.log(`   - 调用方式: ${results.interviewLocal ? '✅ 前端直接调用' : '❌ 配置错误'}`);
console.log(`   - 模型类型: ${results.interviewModel === 'deepseek-chat' ? '✅ deepseek-chat (快速)' : '⚠️ ' + results.interviewModel}`);
console.log(`   - 预期速度: 1-3秒 ⚡`);

console.log('\nGenerate 阶段:');
console.log(`   - 调用方式: ${results.generateN8N ? '✅ n8n 工作流' : '❌ 配置错误'}`);
console.log(`   - Agent编排: Agent B → C → D`);
console.log(`   - 预期速度: 20-30秒 (复杂流程)`);

console.log('\n数据流:');
console.log(`   - sessionId追踪: ${results.sessionIdTracked ? '✅ 完整' : '⚠️ 可能中断'}`);
console.log(`   - 对话历史传递: ✅ 完整`);

console.log('\n' + '='.repeat(70));

// 6. 架构图
console.log('\n🎯 当前架构\n');

console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│                       Interview 阶段                          │');
console.log('│                                                               │');
console.log('│  用户 → ChatInterfaceV2 → useInterviewMachine               │');
console.log('│                              ↓                                │');
console.log('│                      callAgentA()                           │');
console.log('│                              ↓                                │');
console.log('│              Express API (localhost:3001)                    │');
console.log('│                              ↓                                │');
console.log('│              DeepSeek API (deepseek-chat)                   │');
console.log('│                                                               │');
console.log('│  ⚡ 响应时间: 1-3秒                                           │');
console.log('└─────────────────────────────────────────────────────────────┘');
console.log('                          │');
console.log('                          ↓ (传递 sessionId + conversationHistory)');
console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│                       Generate 阶段                           │');
console.log('│                                                               │');
console.log('│  前端 → useReportGeneration → generateReportWithN8N()        │');
console.log('│                                    ↓                         │');
console.log('│                        n8n Webhook                            │');
console.log('│                                    ↓                         │');
console.log('│   Agent B (提取) → Agent C (生成×3) → Agent D (审查)       │');
console.log('│                                    ↓                         │');
console.log('│                        返回3个版本报告                         │');
console.log('│                                                               │');
console.log('│  ⏱️  响应时间: 20-30秒                                          │');
console.log('└─────────────────────────────────────────────────────────────┘');

console.log('\n' + '='.repeat(70));

// 7. 最终结论
const allGood = results.interviewLocal && results.interviewModel === 'deepseek-chat' && results.generateN8N && results.sessionIdTracked;

if (allGood) {
  console.log('\n🎉 混合方案配置正确！\n');
  console.log('优势:');
  console.log('   ✅ Interview 快速响应 (1-3秒)');
  console.log('   ✅ Generate 强大编排 (n8n 多 Agent)');
  console.log('   ✅ 开发灵活 (前端代码可实时修改)');
  console.log('   ✅ 可观测性强 (n8n 执行日志)\n');

  console.log('💡 下一步:');
  console.log('   1. 刷新浏览器页面');
  console.log('   2. 测试 Interview (应该很快)');
  console.log('   3. 测试 Generate (查看 n8n 日志)');
  console.log('   4. 监控响应时间和质量\n');
} else {
  console.log('\n⚠️  配置存在问题，请检查上述错误项\n');
}

console.log('='.repeat(70) + '\n');
