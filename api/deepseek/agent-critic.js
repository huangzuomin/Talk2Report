/**
 * BFF Layer: Agent D - Critic Proxy
 * 用途: 调用Agent D进行逻辑审查和质量评分
 */

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
    const DEEPSEEK_API_BASE = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com';

    if (!DEEPSEEK_API_KEY) {
      throw new Error('DEEPSEEK_API_KEY not configured');
    }

    const { factsheet, drafts } = req.body;

    // 读取Agent D的Prompt
    const fs = await import('fs');
    const path = await import('path');
    const promptPath = path.join(process.cwd(), 'prompts', 'agents', 'agent_d_critic.md');
    const systemPrompt = fs.readFileSync(promptPath, 'utf-8');

    // 构建消息
    const userPrompt = `请审查以下年终总结草稿:\n\n事实数据:\n${JSON.stringify(factsheet, null, 2)}\n\n草稿:\n${JSON.stringify(drafts, null, 2)}\n\n请按照Prompt中的要求进行审查,输出JSON格式的审查报告。`;

    const messages = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: userPrompt,
      },
    ];

    console.log('[Agent D] Starting review...');

    // 调用DeepSeek R1 (使用reasoner模型)
    const response = await fetch(`${DEEPSEEK_API_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-reasoner',
        messages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Agent D] API error:', response.status, errorText);
      return res.status(response.status).json({
        error: 'Agent D API error',
        details: errorText,
      });
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';

    // 提取思考过程 (如果有)
    const reasoning = result.choices?.[0]?.message?.reasoning_content || '';

    // 尝试解析JSON
    let review;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        review = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        review = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('[Agent D] Failed to parse JSON:', content);
      return res.status(500).json({
        error: 'Failed to parse review',
        raw_content: content,
      });
    }

    // 添加思考过程到结果中(用于前端展示)
    review.reasoning_process = reasoning;

    console.log('[Agent D] Review complete, score:', review.overall_assessment?.score);
    res.status(200).json(review);

  } catch (error) {
    console.error('[BFF] Agent D error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}
