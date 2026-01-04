/**
 * BFF Layer: DeepSeek Chat API Proxy
 * 用途: 代理前端到DeepSeek API的调用,隐藏API Key
 */

export default async function handler(req, res) {
  // 处理 OPTIONS 预检请求
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

    const { model, messages, temperature = 1.0, stream = false } = req.body;

    console.log(`[DeepSeek] Calling model: ${model}, stream: ${stream}`);

    // 调用DeepSeek API
    const response = await fetch(`${DEEPSEEK_API_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        stream,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[DeepSeek] API error:', response.status, errorText);
      return res.status(response.status).json({
        error: 'DeepSeek API error',
        details: errorText,
      });
    }

    // 流式响应
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          res.write(chunk);
        }
      } catch (streamError) {
        console.error('[DeepSeek] Stream error:', streamError);
      } finally {
        res.end();
      }

      return;
    }

    // 普通响应
    const result = await response.json();
    console.log('[DeepSeek] Success');
    res.status(200).json(result);

  } catch (error) {
    console.error('[BFF] DeepSeek proxy error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}
