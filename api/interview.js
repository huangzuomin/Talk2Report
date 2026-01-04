/**
 * BFF Layer: Interview Proxy
 * 用途: 中转访谈推进请求到内网 n8n
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
        const N8N_INTERVIEW_URL = process.env.N8N_INTERVIEW_URL;
        const N8N_AUTH_TOKEN = process.env.N8N_AUTH_TOKEN;

        if (!N8N_INTERVIEW_URL) {
            throw new Error('N8N_INTERVIEW_URL not configured');
        }

        console.log('Forwarding interview request to n8n...');

        // 转发 JSON 请求
        const response = await fetch(N8N_INTERVIEW_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(N8N_AUTH_TOKEN && { 'Authorization': `Bearer ${N8N_AUTH_TOKEN}` }),
            },
            body: JSON.stringify(req.body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('n8n Interview error status:', response.status);
            console.error('n8n Interview error details:', errorText);
            return res.status(response.status).json({
                error: 'Interview service error',
                details: errorText
            });
        }

        const result = await response.json();
        console.log('Interview step successful');
        res.status(200).json(result);

    } catch (error) {
        console.error('BFF Interview error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
}
