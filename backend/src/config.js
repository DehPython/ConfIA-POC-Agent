require('dotenv').config();

module.exports = {
  llm: {
    baseUrl: process.env.LLM_BASE_URL || 'https://openrouter.ai/api/v1',
    model: process.env.LLM_MODEL || 'arcee-ai/trinity-large-preview:free',
    apiKey: process.env.LLM_API_KEY,
  },
  asr: {
    url: process.env.ASR_URL || 'http://localhost:8000',
    modelId: process.env.ASR_MODEL_ID || 'freds0',
  },
  whatsapp: {
    enabled: process.env.WHATSAPP_ENABLED === 'true',
    attendantNumber: process.env.WHATSAPP_ATTENDANT_NUMBER || '',
  },
  server: {
    port: parseInt(process.env.WEB_PORT, 10) || 3000,
    env: process.env.NODE_ENV || 'development',
  },
  conversation: {
    timeoutMs: (parseInt(process.env.CONVERSATION_TIMEOUT_MIN, 10) || 120) * 60 * 1000,
  },
};
