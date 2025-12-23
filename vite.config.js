import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const sttTarget = env.N8N_STT_URL || env.VITE_N8N_STT_URL || 'https://n8n.neican.ai/webhook/stt';
  const generateTarget = env.N8N_GENERATE_URL || env.VITE_N8N_GENERATE_URL || 'https://n8n.neican.ai/webhook/generate';
  const authToken = env.N8N_AUTH_TOKEN || env.VITE_N8N_AUTH_TOKEN || 'NeicanSTT2025Secret';

  return {
    plugins: [react()],
    define: {
      'import.meta.env.N8N_STT_URL': JSON.stringify(env.N8N_STT_URL || env.VITE_N8N_STT_URL || ''),
      'import.meta.env.N8N_GENERATE_URL': JSON.stringify(env.N8N_GENERATE_URL || env.VITE_N8N_GENERATE_URL || ''),
      'import.meta.env.N8N_AUTH_TOKEN': JSON.stringify(authToken || ''),
    },
    server: {
      proxy: {
        '/api/stt': createProxyConfig(sttTarget, authToken),
        '/api/generate': createProxyConfig(generateTarget, authToken),
      },
    },
  };
});
