const fs = require('fs');
const path = require('path');
const os = require('os');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { processMessage } = require('./common');
const { transcribeAudio } = require('../services/asr');
const log = require('../utils/logger');

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
  log.info('WhatsApp', 'Escaneie o QR Code acima para conectar ao WhatsApp');
});

client.on('ready', () => {
  log.info('WhatsApp', 'Conectado e pronto!');
});

client.on('message', async (msg) => {
  if (msg.fromMe) return;
  if (msg.from.includes('@g.us')) return;

  const sessionId = msg.from;
  const contact = msg.from.split('@')[0];

  try {
    let userText;

    if (msg.hasMedia && (msg.type === 'ptt' || msg.type === 'audio')) {
      log.info('WhatsApp', `Audio recebido de ${contact} (tipo: ${msg.type})`);

      const media = await msg.downloadMedia();
      const extension = media.mimetype.split('/')[1].split(';')[0] || 'ogg';

      const tmpFile = path.join(os.tmpdir(), `neo_audio_${Date.now()}.${extension}`);
      fs.writeFileSync(tmpFile, Buffer.from(media.data, 'base64'));
      log.info('WhatsApp', `Audio salvo temporariamente: ${tmpFile} (${fs.statSync(tmpFile).size} bytes)`);

      try {
        userText = await transcribeAudio(tmpFile);
      } catch (asrError) {
        log.error('WhatsApp', `Falha no ASR: ${asrError.message}`);
        await client.sendMessage(
          msg.from,
          'No momento nao consigo processar mensagens de audio. Por favor, envie sua mensagem por texto.'
        );
        return;
      } finally {
        if (fs.existsSync(tmpFile)) {
          fs.unlinkSync(tmpFile);
          log.info('WhatsApp', `Audio temporario deletado: ${tmpFile}`);
        }
      }

      if (!userText || userText.trim().length === 0) {
        log.warn('WhatsApp', `Transcricao vazia para audio de ${contact}`);
        await client.sendMessage(msg.from, 'Nao consegui entender o audio. Pode repetir ou enviar por texto?');
        return;
      }

      log.info('WhatsApp', `Transcricao de ${contact}: "${userText}"`);
    } else if (msg.type === 'chat') {
      userText = msg.body;
      if (!userText || userText.trim().length === 0) return;
      log.info('WhatsApp', `Texto de ${contact}: "${userText}"`);
    } else {
      return;
    }

    const reply = await processMessage(sessionId, userText);
    log.info('WhatsApp', `Resposta para ${contact}: "${reply.substring(0, 100)}${reply.length > 100 ? '...' : ''}"`);
    await client.sendMessage(msg.from, reply);
  } catch (error) {
    log.error('WhatsApp', `Erro ao processar mensagem de ${contact}: ${error.message}`);
    try {
      await client.sendMessage(
        msg.from,
        'Desculpe, tive um problema ao processar sua mensagem. Tente novamente em instantes.'
      );
    } catch (_) {}
  }
});

client.on('disconnected', (reason) => {
  log.warn('WhatsApp', `Desconectado: ${reason}`);
});

async function initWhatsApp() {
  log.info('WhatsApp', 'Inicializando...');
  try {
    await client.initialize();
  } catch (err) {
    log.error('WhatsApp', `Falha na inicializacao: ${err.message}`);
    log.info('WhatsApp', 'Removendo sessao corrompida e tentando novamente...');
    const authDir = path.join(__dirname, '..', '..', '.wwebjs_auth');
    const cacheDir = path.join(__dirname, '..', '..', '.wwebjs_cache');
    fs.rmSync(authDir, { recursive: true, force: true });
    fs.rmSync(cacheDir, { recursive: true, force: true });
    await client.initialize();
  }
  return client;
}

async function shutdownWhatsApp() {
  try {
    await client.destroy();
    log.info('WhatsApp', 'Cliente encerrado corretamente');
  } catch (_) {}
}

module.exports = { initWhatsApp, shutdownWhatsApp };
