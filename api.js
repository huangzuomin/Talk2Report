// BFF 层端点 (生产环境会自动路由到 Vercel Functions)
const STT_ENDPOINT = '/api/stt';
const GENERATE_ENDPOINT = '/api/generate';

export async function uploadAudio(blob, sessionId, questionId) {
    const formData = new FormData();
    formData.append('file', blob, 'audio.wav');
    formData.append('session_id', sessionId);
    formData.append('question_id', questionId);

    try {
        const response = await fetch(STT_ENDPOINT, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('STT Upload failed');
        return await response.json();
    } catch (err) {
        console.error('API Error (STT):', err);
        throw err;
    }
}

export async function generateReport(data) {
    try {
        const response = await fetch(GENERATE_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('Generation failed');
        return await response.json();
    } catch (err) {
        console.error('API Error (Generate):', err);
        throw err;
    }
}
