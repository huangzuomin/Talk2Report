import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

const createProxyConfig = (target, token) => ({
  target,
  changeOrigin: true,
  rewrite: (path) => '',
  configure: (proxy) => {
    if (!token) return;
    proxy.on('proxyReq', (proxyReq) => {
      proxyReq.setHeader('Authorization', `Bearer ${token}`);
    });
  },
});

// 创建API路由处理中间件
function createApiRoutes(apiBase, env) {
  const DEEPSEEK_API_KEY = env.DEEPSEEK_API_KEY;
  const DEEPSEEK_API_BASE = env.DEEPSEEK_API_BASE || 'https://api.deepseek.com';

  if (!DEEPSEEK_API_KEY) {
    console.error('[Dev Server] WARNING: DEEPSEEK_API_KEY not configured!');
  }

  return async (req, res, next) => {
    // 只处理 /api/deepseek 路由
    if (!req.url.startsWith('/api/deepseek')) {
      return next();
    }

    console.log('[API Route]', req.method, req.url);

    // 处理 OPTIONS 预检请求
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    try {
      // 解析路由路径
      const urlPath = req.url.split('?')[0];

      // 读取请求体
      const body = await new Promise((resolve, reject) => {
        let data = '';
        req.on('data', (chunk) => { data += chunk; });
        req.on('end', () => {
          try {
            resolve(data ? JSON.parse(data) : {});
          } catch (err) {
            reject(err);
          }
        });
        req.on('error', reject);
      });

      // 处理 /api/deepseek/chat
      if (urlPath === '/api/deepseek/chat') {
        const { model, messages, temperature = 1.0, stream = false } = body;

        console.log('[DeepSeek] Calling model:', model, 'stream:', stream);

        // 调用DeepSeek API
        const deepseekResponse = await fetch(`${DEEPSEEK_API_BASE}/v1/chat/completions`, {
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

        if (!deepseekResponse.ok) {
          const errorText = await deepseekResponse.text();
          console.error('[DeepSeek] API error:', deepseekResponse.status, errorText);
          res.statusCode = deepseekResponse.status;
          res.end(JSON.stringify({
            error: 'DeepSeek API error',
            details: errorText,
          }));
          return;
        }

        // 流式响应
        if (stream) {
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');

          const reader = deepseekResponse.body.getReader();
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
        const result = await deepseekResponse.json();
        console.log('[DeepSeek] Success');
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify(result));
        return;
      }

      // 其他路由暂未实现
      console.log('[API Route] Not implemented:', urlPath);
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'API route not found', route: urlPath }));

    } catch (error) {
      console.error('[API Route Error]', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        stack: error.stack,
      }));
    }
  };
}

export default defineConfig(({ mode }) => {
  // 加载所有环境变量（不只是VITE_前缀的）
  const env = loadEnv(mode, process.cwd(), ['DEEPSEEK_', 'N8N_', 'VITE_', 'NODE_']);

  const sttTarget = env.N8N_STT_URL || env.VITE_N8N_STT_URL || 'https://n8n.neican.ai/webhook/stt';
  const generateTarget = env.N8N_GENERATE_URL || env.VITE_N8N_GENERATE_URL || 'https://n8n.neican.ai/webhook/generate';
  const authToken = env.N8N_AUTH_TOKEN || env.VITE_N8N_AUTH_TOKEN || 'NeicanSTT2025Secret';

  return {
    plugins: [react()],
    define: {
      'import.meta.env.N8N_STT_URL': JSON.stringify(env.N8N_STT_URL || env.VITE_N8N_STT_URL || ''),
      'import.meta.env.N8N_GENERATE_URL': JSON.stringify(env.N8N_GENERATE_URL || env.VITE_N8N_GENERATE_URL || ''),
      'import.meta.env.N8N_AUTH_TOKEN': JSON.stringify(authToken || ''),
      'import.meta.env.DEEPSEEK_API_KEY': JSON.stringify(env.DEEPSEEK_API_KEY || ''),
      'import.meta.env.DEEPSEEK_API_BASE': JSON.stringify(env.DEEPSEEK_API_BASE || 'https://api.deepseek.com'),
    },
    server: {
      proxy: {
        '/api/deepseek': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        '/api/stt': createProxyConfig(sttTarget, authToken),
        '/api/generate': createProxyConfig(generateTarget, authToken),
      },
    },
  };
});
