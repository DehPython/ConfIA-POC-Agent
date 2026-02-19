const fs = require('fs');
const fetch = require('node-fetch');
const FormData = require('form-data');
const config = require('../config');
const log = require('../utils/logger');

async function transcribeAudio(filePath) {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  form.append('model_id', config.asr.modelId);

  log.info('ASR', `Enviando ${filePath} para ${config.asr.url}/transcribe (modelo: ${config.asr.modelId})`);

  const response = await fetch(`${config.asr.url}/transcribe`, {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    throw new Error(`ASR error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  log.info('ASR', `Transcricao concluida em ${data.processing_time_sec}s`);
  return data.transcription;
}

module.exports = { transcribeAudio };
