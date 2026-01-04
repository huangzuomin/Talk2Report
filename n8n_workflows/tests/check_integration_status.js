/**
 * 检查前端与 n8n 集成状态
 */

import fs from 'fs';
import path from 'path';

console.log('\n🔍 检查 Talk2Report 前端 n8n 集成状态\n');
console.log('='.repeat(70));

const results = {
  interview: false,
  interviewMachine: false,
  generate: false,
  app: false
};

// 1. 检查 useInterview hook
console.log('\n📋 1. 检查 useInterview hook (src/hooks/useDeepSeek.js)');
const useInterviewPath = 'src/hooks/useDeepSeek.js';
const useInterviewContent = fs.readFileSync(useInterviewPath, 'utf8');

const hasN8NImport = useInterviewContent.includes('callAgentAWithN8N');
const hasN8NUsage = useInterviewContent.includes('callAgentAWithN8N(history, sessionId)');

console.log(`   - 导入 callAgentAWithN8N: ${hasN8NImport ? '✅' : '❌'}`);
console.log(`   - 使用 n8n 调用: ${hasN8NUsage ? '✅' : '❌'}`);

if (hasN8NImport && hasN8NUsage) {
  results.interview = true;
  console.log(`   ✅ useInterview 已集成 n8n`);
} else {
  console.log(`   ❌ useInterview 仍在使用本地 API`);
}

// 2. 检查 useInterviewMachine hook
console.log('\n📋 2. 检查 useInterviewMachine hook (src/hooks/useInterviewMachine.js)');
const machinePath = 'src/hooks/useInterviewMachine.js';
const machineContent = fs.readFileSync(machinePath, 'utf8');

const machineHasN8NImport = machineContent.includes('callAgentAWithN8N');
const machineHasN8NUsage = machineContent.includes('callAgentAWithN8N(history, sessionId)');
const machineHasSessionId = machineContent.includes('const [sessionId, setSessionId]');

console.log(`   - 导入 callAgentAWithN8N: ${machineHasN8NImport ? '✅' : '❌'}`);
console.log(`   - 使用 n8n 调用: ${machineHasN8NUsage ? '✅' : '❌'}`);
console.log(`   - sessionId 状态: ${machineHasSessionId ? '✅' : '❌'}`);

if (machineHasN8NImport && machineHasN8NUsage && machineHasSessionId) {
  results.interviewMachine = true;
  console.log(`   ✅ useInterviewMachine 已集成 n8n`);
} else {
  console.log(`   ❌ useInterviewMachine 未完全集成 n8n`);
}

// 3. 检查 useReportGeneration hook
console.log('\n📋 3. 检查 useReportGeneration hook (src/hooks/useDeepSeek.js)');
const genHasN8NImport = useInterviewContent.includes('generateReportWithN8N');
const genHasN8NUsage = useInterviewContent.includes('await generateReportWithN8N({');

console.log(`   - 导入 generateReportWithN8N: ${genHasN8NImport ? '✅' : '❌'}`);
console.log(`   - 使用 n8n 调用: ${genHasN8NUsage ? '✅' : '❌'}`);

if (genHasN8NImport && genHasN8NUsage) {
  results.generate = true;
  console.log(`   ✅ useReportGeneration 已集成 n8n`);
} else {
  console.log(`   ❌ useReportGeneration 仍在使用本地 API`);
}

// 4. 检查 ChatInterface 组件使用
console.log('\n📋 4. 检查 App.jsx 组件使用');
const appPath = 'src/App.jsx';
const appContent = fs.readFileSync(appPath, 'utf8');

const usesV2 = appContent.includes('<ChatInterfaceV2');
const usesV1 = appContent.includes('<ChatInterface') && !appContent.includes('<ChatInterfaceV2');

console.log(`   - 使用 ChatInterfaceV2: ${usesV2 ? '✅' : '❌'}`);
console.log(`   - 使用 ChatInterface (V1): ${usesV1 ? '⚠️  (旧版本)' : '❌'}`);

if (usesV2 && !usesV1) {
  results.app = true;
  console.log(`   ✅ App 使用 ChatInterfaceV2 (已集成 n8n)`);
} else if (usesV1) {
  console.log(`   ⚠️  App 使用 ChatInterface (未集成 n8n)`);
}

// 5. 总结
console.log('\n' + '='.repeat(70));
console.log('📊 集成状态总结\n');

const allIntegrated = Object.values(results).every(v => v);

if (allIntegrated) {
  console.log('🎉 所有组件已完全集成 n8n！');
  console.log('\n✅ Interview Workflow: 由 n8n 驱动');
  console.log('✅ Generate Workflow: 由 n8n 驱动');
  console.log('\n当前架构:');
  console.log('   前端 → n8n webhook → DeepSeek API → n8n → 前端');
  console.log('\n💡 好处:');
  console.log('   - 统一的工作流管理');
  console.log('   - 更好的可观测性 (n8n 执行日志)');
  console.log('   - 更容易调试和优化');
} else {
  console.log('⚠️  部分组件未集成 n8n\n');

  if (!results.interview) {
    console.log('❌ useInterview: 仍在使用本地 DeepSeek API');
  }
  if (!results.interviewMachine) {
    console.log('❌ useInterviewMachine: 未完全集成 n8n');
  }
  if (!results.generate) {
    console.log('❌ useReportGeneration: 仍在使用本地 API');
  }
  if (!results.app) {
    console.log('❌ App: 使用未集成的组件');
  }

  console.log('\n💡 建议完成所有集成以获得最佳体验');
}

// 6. 检查环境变量
console.log('\n' + '='.repeat(70));
console.log('🔑 环境变量检查\n');

try {
  const envPath = '.env.local';
  const envContent = fs.readFileSync(envPath, 'utf8');

  const hasInterviewURL = envContent.includes('N8N_INTERVIEW_URL');
  const hasGenerateURL = envContent.includes('N8N_GENERATE_URL');
  const hasAuthToken = envContent.includes('N8N_AUTH_TOKEN');

  console.log(`   - N8N_INTERVIEW_URL: ${hasInterviewURL ? '✅' : '❌'}`);
  console.log(`   - N8N_GENERATE_URL: ${hasGenerateURL ? '✅' : '❌'}`);
  console.log(`   - N8N_AUTH_TOKEN: ${hasAuthToken ? '✅' : '❌'}`);

  if (hasInterviewURL && hasGenerateURL && hasAuthToken) {
    console.log('\n✅ 环境变量配置完整');
  } else {
    console.log('\n⚠️  环境变量配置不完整');
  }
} catch (e) {
  console.log('⚠️  无法读取 .env.local 文件');
}

console.log('\n' + '='.repeat(70) + '\n');
