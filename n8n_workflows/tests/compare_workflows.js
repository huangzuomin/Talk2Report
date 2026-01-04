/**
 * 比较原始工作流和修复后工作流的差异
 */

import fs from 'fs';

const current = JSON.parse(fs.readFileSync('n8n_workflows/debug/current_workflow.json', 'utf-8'));
const fixed = JSON.parse(fs.readFileSync('n8n_workflows/debug/fixed_workflow.json', 'utf-8'));

console.log('📊 顶层字段比较:\n');
console.log('原始工作流 keys:', Object.keys(current).join(', '));
console.log('修复工作流 keys:', Object.keys(fixed).join(', '));

const extraKeys = Object.keys(fixed).filter(k => !Object.keys(current).includes(k));
if (extraKeys.length > 0) {
  console.log('\n⚠️  修复后工作流有额外的字段:', extraKeys.join(', '));
} else {
  console.log('\n✅ 没有额外的顶层字段');
}

// 检查节点参数的变化
console.log('\n\n🔍 检查 HTTP Request 节点的参数变化:\n');

const currentHttpNodes = current.nodes.filter(n => n.type === 'n8n-nodes-base.httpRequest');
const fixedHttpNodes = fixed.nodes.filter(n => n.type === 'n8n-nodes-base.httpRequest');

console.log(`原始: ${currentHttpNodes.length} 个 HTTP 节点`);
console.log(`修复: ${fixedHttpNodes.length} 个 HTTP 节点`);

currentHttpNodes.forEach(node => {
  const fixedNode = fixed.nodes.find(n => n.id === node.id);
  if (!fixedNode) return;

  const currentParams = node.parameters;
  const fixedParams = fixedNode.parameters;

  console.log(`\n节点: ${node.name}`);
  console.log('  原始 jsonBody 类型:', typeof currentParams.jsonBody);
  console.log('  修复 jsonBody 类型:', typeof fixedParams.jsonBody);

  // 检查是否有额外的参数字段
  const currentKeys = Object.keys(currentParams);
  const fixedKeys = Object.keys(fixedParams);
  const extraParamKeys = fixedKeys.filter(k => !currentKeys.includes(k));

  if (extraParamKeys.length > 0) {
    console.log('  ⚠️  有额外的参数字段:', extraParamKeys.join(', '));
  }

  const missingParamKeys = currentKeys.filter(k => !fixedKeys.includes(k));
  if (missingParamKeys.length > 0) {
    console.log('  ⚠️  缺少的参数字段:', missingParamKeys.join(', '));
  }
});

// 检查是否所有字段都匹配
console.log('\n\n🔍 检查所有字段是否匹配:\n');

let hasDifferences = false;

// 比较 nodes
if (current.nodes.length !== fixed.nodes.length) {
  console.log(`⚠️  节点数量不匹配: ${current.nodes.length} vs ${fixed.nodes.length}`);
  hasDifferences = true;
}

// 比较 connections
if (JSON.stringify(current.connections) !== JSON.stringify(fixed.connections)) {
  console.log('⚠️  connections 不匹配');
  hasDifferences = true;
}

// 检查每个节点的字段
current.nodes.forEach((node, i) => {
  const fixedNode = fixed.nodes[i];
  if (!fixedNode) return;

  const currentKeys = Object.keys(node).sort();
  const fixedKeys = Object.keys(fixedNode).sort();

  if (JSON.stringify(currentKeys) !== JSON.stringify(fixedKeys)) {
    console.log(`\n⚠️  节点 "${node.name}" 字段不匹配:`);
    console.log('  原始:', currentKeys.join(', '));
    console.log('  修复:', fixedKeys.join(', '));
    hasDifferences = true;
  }
});

if (!hasDifferences) {
  console.log('✅ 除了 jsonBody 的类型变化，其他字段都匹配');
}
