/**
 * BFF Layer: STT Proxy
 * 用途: 中转语音文件到内网 n8n，隐藏敏感 Token
 */

export const config = {
    api: {
        bodyParser: false, // 禁用自动解析，以便直接转发原始流 (multipart/form-data)
    },
};

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
        const N8N_STT_URL = process.env.N8N_STT_URL;
        const N8N_AUTH_TOKEN = process.env.N8N_AUTH_TOKEN;

        if (!N8N_STT_URL) {
            throw new Error('N8N_STT_URL not configured');
        }

        // 转发请求到 n8n (保持 multipart/form-data)
        // 关键点：必须透传原始的 Content-Type，因为它包含 boundary
        const contentType = req.headers['content-type'];

        const response = await fetch(N8N_STT_URL, {
            method: 'POST',
            headers: {
                'content-type': contentType,
                ...(N8N_AUTH_TOKEN && { 'Authorization': `Bearer ${N8N_AUTH_TOKEN}` }),
            },
            body: req, // Node.js 环境下 fetch 支持传入 IncomingMessage 流
            duplex: 'half' // 对于流式请求，某些 fetch 实现需要这个参数
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('n8n STT error status:', response.status);
            console.error('n8n STT error body:', errorText);
            return res.status(response.status).json({
                error: 'STT service error',
                details: errorText
            });
        }

        const result = await response.json();
        res.status(200).json(result);

    } catch (error) {
        console.error('BFF STT error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
}
