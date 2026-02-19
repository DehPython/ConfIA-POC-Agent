const config = require('../config');

// Map<sessionId, { messages: [], lastActivity: timestamp, timer: timeoutId }>
const conversations = new Map();

function getHistory(sessionId) {
  const conv = conversations.get(sessionId);
  if (!conv) return [];
  return conv.messages;
}

function addMessage(sessionId, role, content) {
  if (!conversations.has(sessionId)) {
    conversations.set(sessionId, { messages: [], lastActivity: Date.now(), timer: null });
  }
  const conv = conversations.get(sessionId);
  conv.messages.push({ role, content });
  conv.lastActivity = Date.now();
  resetTimer(sessionId);
}

function clearHistory(sessionId) {
  const conv = conversations.get(sessionId);
  if (conv && conv.timer) {
    clearTimeout(conv.timer);
  }
  conversations.delete(sessionId);
  console.log(`[Conversa] Historico limpo para sessao: ${sessionId}`);
}

function resetTimer(sessionId) {
  const conv = conversations.get(sessionId);
  if (!conv) return;

  if (conv.timer) {
    clearTimeout(conv.timer);
  }

  conv.timer = setTimeout(() => {
    clearHistory(sessionId);
  }, config.conversation.timeoutMs);
}

module.exports = { getHistory, addMessage, clearHistory };
