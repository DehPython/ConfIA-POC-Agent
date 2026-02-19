const { getHistory, addMessage } = require('../agent/conversation');
const { SYSTEM_PROMPT } = require('../agent/prompt');
const { definitions, handlers } = require('../agent/tools');
const { chat } = require('../agent/llm');
const log = require('../utils/logger');

const MAX_MESSAGE_LENGTH = 4000;

async function processMessage(sessionId, text) {
  // Truncar mensagens muito longas para evitar problemas
  if (text.length > MAX_MESSAGE_LENGTH) {
    log.warn('Agent', `Mensagem truncada de ${text.length} para ${MAX_MESSAGE_LENGTH} chars (sessao: ${sessionId.split('@')[0]})`);
    text = text.substring(0, MAX_MESSAGE_LENGTH);
  }

  // 1. Adiciona mensagem do usuario ao historico
  addMessage(sessionId, 'user', text);

  // 2. Monta array de messages (system prompt + historico)
  const history = getHistory(sessionId);
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
  ];

  // 3. Chama LLM com tools e handlers
  const reply = await chat(messages, definitions, handlers);

  // 4. Adiciona resposta do agente ao historico
  addMessage(sessionId, 'assistant', reply);

  return reply;
}

module.exports = { processMessage };
