const resolveEnv = (key, fallback = '') => {
  return (
    import.meta.env[key] ||
    import.meta.env[`VITE_${key}`] ||
    fallback
  );
};

const GENERATE_ENDPOINT = resolveEnv('N8N_GENERATE_URL', '/api/generate');
// 默认使用 BFF 代理，可通过环境变量覆盖为直连 n8n
const INTERVIEW_ENDPOINT = resolveEnv('N8N_INTERVIEW_URL', '/api/interview');
const AUTH_TOKEN = resolveEnv('N8N_AUTH_TOKEN', '');

export const apiConfig = {
  generateEndpoint: GENERATE_ENDPOINT,
  interviewEndpoint: INTERVIEW_ENDPOINT,
};

// 调试日志：显示 API 配置
console.log('🔧 Talk2Report API Config:', {
  generateEndpoint: GENERATE_ENDPOINT,
  interviewEndpoint: INTERVIEW_ENDPOINT,
  hasAuthToken: !!AUTH_TOKEN,
  authTokenLength: AUTH_TOKEN ? AUTH_TOKEN.length : 0
});

const withAuthHeader = (headers = {}) => {
  if (AUTH_TOKEN) {
    return {
      ...headers,
      Authorization: `Bearer ${AUTH_TOKEN}`,
    };
  }
  return headers;
};

export async function generateReport(payload) {
  const response = await fetch(GENERATE_ENDPOINT, {
    method: 'POST',
    headers: withAuthHeader({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`生成接口失败：${response.status} ${message || ''}`.trim());
  }

  return response.json();
}

export async function nextInterviewStep(payload) {
  const response = await fetch(INTERVIEW_ENDPOINT, {
    method: 'POST',
    headers: withAuthHeader({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`访谈推进失败：${response.status} ${message || ''}`.trim());
  }

  return response.json();
}
