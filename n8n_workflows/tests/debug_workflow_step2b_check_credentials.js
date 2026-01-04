/**
 * Step 2b: 检查 n8n 凭证
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const N8N_API_BASE = process.env.N8N_API_BASE || 'http://192.168.50.224:30109/api/v1';
const N8N_API_KEY = process.env.N8N_API_KEY;

async function getCredentials() {
  console.log('\n🔍 检查 n8n 凭证\n');

  const response = await fetch(`${N8N_API_BASE}/credentials`, {
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch credentials: ${response.status}`);
  }

  const data = await response.json();

  console.log(`📋 找到 ${data.data?.length || 0} 个凭证\n`);

  if (data.data && data.data.length > 0) {
    console.log('凭证列表:');
    data.data.forEach(cred => {
      console.log(`\n   ID: ${cred.id}`);
      console.log(`   名称: ${cred.name}`);
      console.log(`   类型: ${cred.type}`);
      console.log(`   当前工作流使用: ${cred.id === 't3d0RWOyYh5yA9DW' ? '✅ YES' : '❌ NO'}`);
    });

    // 查找工作流使用的凭证
    const workflowCredential = data.data.find(c => c.id === 't3d0RWOyYh5yA9DW');

    if (workflowCredential) {
      console.log('\n\n✅ 工作流使用的凭证存在');
      console.log(`   名称: ${workflowCredential.name}`);
      console.log(`   类型: ${workflowCredential.type}`);
    } else {
      console.log('\n\n❌ 工作流使用的凭证不存在！');
      console.log('   工作流需要凭证 ID: t3d0RWOyYh5yA9DW');
      console.log('   类型: DeepSeek API');

      console.log('\n💡 解决方案:');
      console.log('   1. 在 n8n UI 中创建 DeepSeek API 凭证');
      console.log('   2. 使用 .env.local 中的 DEEPSEEK_API_KEY');
      console.log('   3. 更新工作流以使用新凭证');
    }

    // 检查是否有 DeepSeek 相关凭证
    const deepSeekCredentials = data.data.filter(c =>
      c.type.toLowerCase().includes('deepseek')
    );

    if (deepSeekCredentials.length > 0) {
      console.log('\n\n🔑 发现 DeepSeek 凭证:');
      deepSeekCredentials.forEach(cred => {
        console.log(`   - ${cred.name} (ID: ${cred.id})`);
      });
    } else {
      console.log('\n\n⚠️  警告: 没有找到任何 DeepSeek 凭证');
      console.log('   需要在 n8n UI 中创建 DeepSeek API 凭证');
    }
  }

  return data;
}

async function main() {
  try {
    await getCredentials();
  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
