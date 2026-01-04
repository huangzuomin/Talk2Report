/**
 * BFF Layer: Agent C - Writers Proxy
 * 用途: 并行调用3个Writer实例,生成不同风格的版本
 * 支持SSE流式推送进度
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

    const { factsheet, preferences } = req.body;

    // 读取Agent C的Prompt
    const fs = await import('fs');
    const path = await import('path');
    const promptPath = path.join(process.cwd(), 'prompts', 'agents', 'agent_c_writer.md');
    const systemPrompt = fs.readFileSync(promptPath, 'utf-8');

    // 设置SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 定义3个Writer的配置
    const writers = [
      {
        name: 'brief',
        model: 'deepseek-chat',
        temperature: 1.0,
        instruction: '生成200字电梯汇报版',
      },
      {
        name: 'formal',
        model: 'deepseek-chat',
        temperature: 1.0,
        instruction: `生成正式年度述职版(${preferences.length_main_chars || 1200}字)`,
      },
      {
        name: 'social',
        model: 'deepseek-chat',
        temperature: 1.3,
        instruction: '生成朋友圈文案版(250字,emoji点缀)',
      },
    ];

    // 并行调用3个Writer
    const results = await Promise.all(
      writers.map(async (writer) => {
        const messages = [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `${writer.instruction}\n\n事实数据:\n${JSON.stringify(factsheet, null, 2)}\n\n用户偏好:\n${JSON.stringify(preferences, null, 2)}`,
          },
        ];

        console.log(`[Agent C-${writer.name}] Starting...`);

        const response = await fetch(`${DEEPSEEK_API_BASE}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          },
          body: JSON.stringify({
            model: writer.model,
            messages,
            temperature: writer.temperature,
          }),
        });

        if (!response.ok) {
          throw new Error(`Writer ${writer.name} failed: ${response.status}`);
        }

        const result = await response.json();
        const content = result.choices?.[0]?.message?.content || '';

        // 尝试解析JSON
        let parsed;
        try {
          const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
          } else {
            parsed = JSON.parse(content);
          }
        } catch (e) {
          console.warn(`[Agent C-${writer.name}] Failed to parse JSON, using raw content`);
          parsed = { content };
        }

        // 发送进度事件
        const eventData = JSON.stringify({
          type: 'version_complete',
          version: writer.name,
          data: parsed,
        });
        res.write(`data: ${eventData}\n\n`);

        console.log(`[Agent C-${writer.name}] Complete`);
        return { name: writer.name, data: parsed };
      })
    );

    // 生成outline和ppt_outline
    const outlineMessages = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: `生成结构化大纲和PPT提纲\n\n事实数据:\n${JSON.stringify(factsheet, null, 2)}`,
      },
    ];

    const outlineResponse = await fetch(`${DEEPSEEK_API_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: outlineMessages,
        temperature: 0.7,
      }),
    });

    const outlineResult = await outlineResponse.json();
    const outlineContent = outlineResult.choices?.[0]?.message?.content || '';

    let outlineData;
    try {
      const jsonMatch = outlineContent.match(/```json\s*([\s\S]*?)\s*```/) || outlineContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        outlineData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        outlineData = JSON.parse(outlineContent);
      }
    } catch (e) {
      console.warn('[Agent C] Failed to parse outline JSON');
      outlineData = { outline: outlineContent, ppt_outline: outlineContent };
    }

    // 合并结果
    const versions = {
      brief: results.find((r) => r.name === 'brief')?.data || {},
      formal: results.find((r) => r.name === 'formal')?.data || {},
      social: results.find((r) => r.name === 'social')?.data || {},
      outline: outlineData.outline || outlineData,
      ppt_outline: outlineData.ppt_outline || outlineData,
    };

    // 发送完成事件
    const completeEvent = JSON.stringify({
      type: 'complete',
      versions,
    });
    res.write(`data: ${completeEvent}\n\n`);

    console.log('[Agent C] All writers complete');
    res.end();

  } catch (error) {
    console.error('[BFF] Agent C error:', error);
    const errorEvent = JSON.stringify({
      type: 'error',
      error: error.message,
    });
    res.write(`data: ${errorEvent}\n\n`);
    res.end();
  }
}
