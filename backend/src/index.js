const express = require('express');
const config = require('./config');
const log = require('./utils/logger');

const app = express();
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', agent: 'Neo - TechStore Brasil' });
});

// Inicializa WhatsApp se habilitado
let shutdownWhatsApp = null;
if (config.whatsapp.enabled) {
  const whatsapp = require('./interfaces/whatsapp');
  whatsapp.initWhatsApp();
  shutdownWhatsApp = whatsapp.shutdownWhatsApp;
}

const server = app.listen(config.server.port, () => {
  log.info('Neo', `Servidor rodando na porta ${config.server.port}`);
  log.info('Neo', `Ambiente: ${config.server.env}`);
  log.info('Neo', `WhatsApp: ${config.whatsapp.enabled ? 'habilitado' : 'desabilitado'}`);
  log.info('Neo', `Modelo LLM: ${config.llm.model}`);
  log.info('Neo', `Timeout conversa: ${config.conversation.timeoutMs / 60000} min`);
});

// Graceful shutdown — limpa Puppeteer ao sair com Ctrl+C
async function shutdown(signal) {
  log.info('Neo', `${signal} recebido, encerrando...`);
  if (shutdownWhatsApp) await shutdownWhatsApp();
  server.close(() => {
    log.info('Neo', 'Servidor encerrado');
    process.exit(0);
  });
  // Forcar saida apos 5s se algo travar
  setTimeout(() => process.exit(1), 5000);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Evita crash por erros nao tratados do Puppeteer
process.on('unhandledRejection', (err) => {
  log.error('Neo', `Erro nao tratado: ${err.message}`);
});
