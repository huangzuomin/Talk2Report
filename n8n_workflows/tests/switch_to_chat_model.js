/**
 * 修改 Interview Workflow，确保使用 deepseek-chat 模型
 * 以提高响应速度
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const N8N_API_BASE = process.env.N8N_API_BASE || 'http://192.168.50.224:30109/api/v1';
const N8N_API_KEY = process.env.N8N_API_KEY;
const WORKFLOW_ID = 'ZB3l0CZyO7w79Y95'; // Interview Workflow

async function switchToChatModel() {
  console.log('\n🔧 修改 Interview Workflow 模型配置\n');
  console.log('目标: 确保使用 deepseek-chat (快速) 而不是 deepseek-reasoner (慢速)\n');

  try {
    // Step 1: READ - 读取工作流
    console.log('📥 Step 1: 读取工作流...');
    const response = await fetch(`${N8N_API_BASE}/workflows/${WORKFLOW_ID}`, {
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch workflow: ${response.status}`);
    }

    const workflow = await response.json();
    console.log(`✅ 工作流名称: ${workflow.name}`);
    console.log(`✅ 节点数量: ${workflow.nodes.length}\n`);

    // Step 2: ANALYZE - 查找 DeepSeek 节点
    console.log('🔍 Step 2: 查找 DeepSeek 节点...');
    const deepseekNodes = workflow.nodes.filter(node =>
      node.name.includes('DeepSeek') ||
      node.name.includes('Agent') ||
      (node.parameters && node.parameters.jsonBody && node.parameters.jsonBody.includes('deepseek'))
    );

    console.log(`找到 ${deepseekNodes.length} 个相关节点:`);
    deepseekNodes.forEach(node => {
      console.log(`   - ${node.name}`);
    });

    // Step 3: MODIFY - 修改模型配置
    console.log('\n📝 Step 3: 修改模型配置...');

    let modified = false;
    const changes = [];

    workflow.nodes = workflow.nodes.map(node => {
      if (node.parameters && node.parameters.jsonBody) {
        const jsonBody = node.parameters.jsonBody;

        // 检查当前模型
        const currentModel = jsonBody.match(/"model":\s*"([^"]+)"/);
        if (currentModel) {
          const modelName = currentModel[1];
          console.log(`\n节点: ${node.name}`);
          console.log(`当前模型: ${modelName}`);

          if (modelName === 'deepseek-reasoner') {
            // 替换为 deepseek-chat
            const newBody = jsonBody.replace('"model": "deepseek-reasoner"', '"model": "deepseek-chat"');
            changes.push({
              node: node.name,
              old: 'deepseek-reasoner',
              new: 'deepseek-chat'
            });

            modified = true;
            return {
              ...node,
              parameters: {
                ...node.parameters,
                jsonBody: newBody
              }
            };
          } else if (modelName === 'deepseek-chat') {
            console.log(`✅ 已经是 chat 模型，无需修改`);
          }
        }
      }
      return node;
    });

    if (!modified) {
      console.log('\n✅ 所有节点已经使用 deepseek-chat 模型');
      console.log('\n💡 提示: 如果仍然感觉慢，可能是以下原因:');
      console.log('   1. DeepSeek API 本身响应慢');
      console.log('   2. 网络延迟');
      console.log('   3. 系统提示词过长，导致处理时间长');
      console.log('   4. temperature 设置过高');
      return;
    }

    // Step 4: UPDATE - 保存工作流
    console.log('\n💾 Step 4: 保存修改...');
    console.log('修改内容:');
    changes.forEach(c => {
      console.log(`   ${c.node}: ${c.old} → ${c.new}`);
    });

    const updateResponse = await fetch(`${N8N_API_BASE}/workflows/${WORKFLOW_ID}`, {
      method: 'PUT',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(workflow)
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Failed to update workflow: ${updateResponse.status}\n${errorText}`);
    }

    console.log('\n✅ 工作流更新成功！');

    // Step 5: VERIFY - 激活工作流
    console.log('\n🔄 Step 5: 确保工作流已激活...');
    const activateResponse = await fetch(`${N8N_API_BASE}/workflows/${WORKFLOW_ID}/activate`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY
      }
    });

    if (activateResponse.ok) {
      console.log('✅ 工作流已激活');
    } else {
      console.log('⚠️  工作流激活失败，请手动激活');
    }

    console.log('\n🎉 完成！现在 Interview Workflow 使用 deepseek-chat 模型');
    console.log('\n预期效果:');
    console.log('   - 响应时间: 从 10-30秒 降至 1-3秒');
    console.log('   - 模型行为: 更直接，不显示思考过程');
    console.log('   - 成本: 更低');

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    console.error(error.stack);
  }
}

switchToChatModel();
