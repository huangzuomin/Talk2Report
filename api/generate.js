/**
 * BFF Layer: Generate Proxy
 * 用途: 中转报告生成请求到内网 n8n
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
        const N8N_GENERATE_URL = process.env.N8N_GENERATE_URL;
        const N8N_AUTH_TOKEN = process.env.N8N_AUTH_TOKEN;

        if (!N8N_GENERATE_URL) {
            throw new Error('N8N_GENERATE_URL not configured');
        }

        console.log('Forwarding generate request to n8n...');

        // 转发 JSON 请求
        const response = await fetch(N8N_GENERATE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(N8N_AUTH_TOKEN && { 'Authorization': `Bearer ${N8N_AUTH_TOKEN}` }),
            },
            body: JSON.stringify(req.body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('n8n Generate error status:', response.status);
            console.error('n8n Generate error details:', errorText);
            return res.status(response.status).json({
                error: 'Generate service error',
                details: errorText
            });
        }

        const result = await response.json();
        console.log('Generate successful');
        res.status(200).json(result);

    } catch (error) {
        console.error('BFF Generate error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
}
