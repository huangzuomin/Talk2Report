/**
 * BFF Layer: Agent B - Archivist Proxy
 * 用途: 调用Agent B进行结构化数据提取
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

    const { conversation_history, user_profile } = req.body;

    // 读取Agent B的Prompt
    const fs = await import('fs');
    const path = await import('path');
    const promptPath = path.join(process.cwd(), 'prompts', 'agents', 'agent_b_archivist.md');
    const systemPrompt = fs.readFileSync(promptPath, 'utf-8');

    // 构建消息
    const messages = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: `请提取以下对话记录的结构化数据:\n\n${JSON.stringify(req.body, null, 2)}`,
      },
    ];

    console.log('[Agent B] Starting extraction...');

    // 调用DeepSeek API (使用V3,不需要CoT)
    const response = await fetch(`${DEEPSEEK_API_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        temperature: 0.3, // 低温度,追求准确性
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Agent B] API error:', response.status, errorText);
      return res.status(response.status).json({
        error: 'Agent B API error',
        details: errorText,
      });
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';

    // 尝试解析JSON
    let factsheet;
    try {
      // 提取JSON (可能被包裹在```json中)
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        factsheet = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        factsheet = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('[Agent B] Failed to parse JSON:', content);
      return res.status(500).json({
        error: 'Failed to parse factsheet',
        raw_content: content,
      });
    }

    console.log('[Agent B] Extraction complete, quality score:', factsheet.quality_score?.overall);
    res.status(200).json(factsheet);

  } catch (error) {
    console.error('[BFF] Agent B error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}
