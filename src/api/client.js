const resolveEnv = (key, fallback = '') => {
  return (
    import.meta.env[key] ||
    import.meta.env[`VITE_${key}`] ||
    fallback
  );
};

const GENERATE_ENDPOINT = resolveEnv('N8N_GENERATE_URL', '/api/generate');
// 默认指向线上 interview/next_step，若环境变量存在则覆盖
const INTERVIEW_ENDPOINT = resolveEnv('N8N_INTERVIEW_URL', 'https://n8n.neican.ai/webhook/interview/next_step');
const AUTH_TOKEN = resolveEnv('N8N_AUTH_TOKEN', '');

export const apiConfig = {
  generateEndpoint: GENERATE_ENDPOINT,
  interviewEndpoint: INTERVIEW_ENDPOINT,
};

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
