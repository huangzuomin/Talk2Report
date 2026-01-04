/**
 * Dev Server: API Routes Handler
 * 用途: 在开发环境中处理 /api/* 路由
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// 加载环境变量
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 日志中间件
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// /api/deepseek/chat - DeepSeek Chat API 代理
app.all('/api/deepseek/chat', async (req, res) => {
  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { model, messages, temperature = 1.0, stream = false } = req.body;

    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
    const DEEPSEEK_API_BASE = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com';

    if (!DEEPSEEK_API_KEY) {
      throw new Error('DEEPSEEK_API_KEY not configured');
    }

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
    console.error('[API Error]', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// 其他 /api/deepseek/* 路由
app.use('/api/deepseek', (req, res) => {
  if (!req.url.startsWith('/chat')) {
    res.status(404).json({
      error: 'API route not found',
      route: req.url,
      message: 'This endpoint is not yet implemented',
    });
  }
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    deepseek: {
      configured: !!process.env.DEEPSEEK_API_KEY,
      api_base: process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com',
    },
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║   API Dev Server                                     ║
╠═══════════════════════════════════════════════════════╣
║   URL:  http://localhost:${PORT}                     ║
║   Health: http://localhost:${PORT}/health            ║
╠═══════════════════════════════════════════════════════╣
║   DeepSeek API: ${process.env.DEEPSEEK_API_KEY ? '✅ Configured' : '❌ Not Configured'}                     ║
╚═══════════════════════════════════════════════════════╝
  `);
});

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n[API Server] Shutting down...');
  process.exit(0);
});
