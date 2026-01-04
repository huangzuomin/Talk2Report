/**
 * Step 3: 检查 Agent B 节点的配置
 */

import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

async function checkAgentBNode() {
  console.log('\n🔍 检查 Agent B 节点配置\n');

  const workflow = JSON.parse(
    fs.readFileSync('n8n_workflows/debug/current_workflow.json', 'utf-8')
  );

  const agentB = workflow.nodes.find(n => n.name === 'Agent B - Extract Factsheet');

  if (!agentB) {
    console.error('❌ 未找到 Agent B 节点');
    return;
  }

  console.log('✅ 找到 Agent B 节点\n');
  console.log('节点类型:', agentB.type);
  console.log('节点版本:', agentB.typeVersion);
  console.log('凭证:', agentB.credentials);
  console.log('\n参数:\n');

  // 显示完整的 parameters 对象
  console.log(JSON.stringify(agentB.parameters, null, 2));

  // 检查可能的问题
  console.log('\n\n🔍 检查潜在的 JSON 格式问题:\n');

  const params = agentB.parameters;

  // 检查 bodyParameters
  if (params.bodyParameters) {
    console.log('✅ 有 bodyParameters');
    params.bodyParameters.forEach((param, i) => {
      console.log(`\n   参数 ${i + 1}:`);
      console.log(`   名称: ${param.name}`);
      console.log(`   值类型: ${typeof param.value}`);

      // 检查是否是 JSON 字符串
      if (typeof param.value === 'string') {
        try {
          const parsed = JSON.parse(param.value);
          console.log(`   ✅ JSON 格式正确`);
          console.log(`   解析后: ${JSON.stringify(parsed).slice(0, 100)}...`);
        } catch (e) {
          console.log(`   ❌ JSON 格式错误: ${e.message}`);
          console.log(`   值内容: ${param.value.slice(0, 200)}`);
        }
      } else if (typeof param.value === 'object') {
        console.log(`   值 (对象): ${JSON.stringify(param.value).slice(0, 100)}...`);
      }
    });
  }

  // 检查 bodyContent
  if (params.bodyContent) {
    console.log('\n✅ 有 bodyContent');
    console.log('类型:', params.bodyContent);

    if (params.bodyContent === 'none') {
      console.log('⚠️  bodyContent 是 "none"，可能缺少 JSON body');
    }
  }

  // 检查 jsonParameters
  if (params.jsonParameters) {
    console.log('\n✅ 有 jsonParameters');
    console.log('参数数量:', params.jsonParameters.length);

    params.jsonParameters.forEach((param, i) => {
      console.log(`\n   JSON 参数 ${i + 1}:`);
      console.log(`   名称: ${param.name}`);
      console.log(`   值: ${param.value}`);
    });
  }

  // 检查 headerParameters
  if (params.headerParameters) {
    console.log('\n✅ 有 headerParameters');
    params.headerParameters.forEach((param, i) => {
      console.log(`   ${param.name}: ${param.value}`);
    });
  }

  return agentB;
}

checkAgentBNode();
