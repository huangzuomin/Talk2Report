import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        proxy: {
            '/api/stt': {
                target: 'https://n8n.neican.ai/webhook/stt',
                changeOrigin: true,
                rewrite: (path) => '',
                configure: (proxy, options) => {
                    proxy.on('proxyReq', (proxyReq, req, res) => {
                        proxyReq.setHeader('Authorization', 'Bearer NeicanSTT2025Secret');
                    });
                }
            },
            '/api/generate': {
                target: 'https://n8n.neican.ai/webhook/generate',
                changeOrigin: true,
                rewrite: (path) => '',
                configure: (proxy, options) => {
                    proxy.on('proxyReq', (proxyReq, req, res) => {
                        proxyReq.setHeader('Authorization', 'Bearer NeicanSTT2025Secret');
                    });
                }
            }
        }
    }
});
