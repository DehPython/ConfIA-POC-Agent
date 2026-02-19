# POC Agente IA Conversacional (Neo) — Plano de Implementacao

## Overview

Construir uma POC de agente conversacional para atendimento ao cliente de uma loja de eletronicos brasileira, com suporte a texto e voz. O agente sera acessivel via WhatsApp (primeira interface), com backend Node.js, integracao com LLM via OpenRouter e microsservico ASR em Docker para transcricao de audio.

## Estado Atual

- Nenhum codigo implementado ainda
- Documentacao completa disponivel: PRD.md, ASR.md, wweb_doc.md, wweb_setup_guide.md, dados_ficticios.md
- Microsservico ASR: especificacao e codigo prontos em ASR.md, precisa ser construido
- Dados ficticios: existem em formato Python, precisam ser convertidos para JS e adaptados para BRL

### Descobertas Chave:
- **LLM**: OpenRouter com modelo `arcee-ai/trinity-large-preview:free` — 131k contexto, suporte a tool use, streaming, structured outputs
- **API OpenRouter**: Compativel com formato OpenAI SDK (`https://openrouter.ai/api/v1`)
- **ASR**: FastAPI + Docker, 2 modelos (freds0 standard, lite_asr custom), aceita qualquer formato de audio
- **whatsapp-web.js**: LocalAuth para persistencia, Puppeteer headless, eventos qr/ready/message/disconnected
- **Audio WhatsApp**: tipos `ptt` (voice note) e `audio`, download via `msg.downloadMedia()` retorna base64

## Estado Final Desejado

- Backend Node.js rodando na porta 3000 com agente conversacional funcional
- Microsservico ASR rodando via Docker na porta 8000
- Bot WhatsApp respondendo mensagens de texto usando tool use para consultar catalogo/pedidos/suporte
- Bot WhatsApp transcrevendo audio via ASR e respondendo normalmente
- Historico de conversa por usuario com timeout configuravel (padrao 2h)
- Dados ficticios realistas de loja brasileira em BRL

### Como Verificar:
1. Enviar texto no WhatsApp → receber resposta do agente
2. Perguntar sobre produto → agente consulta catalogo via tool use e responde
3. Enviar audio no WhatsApp → agente transcreve e responde
4. Esperar timeout → historico limpo, conversa recomeca do zero

## O Que NAO Estamos Fazendo

- Interface Web (sera fase posterior)
- Interface Mobile/PWA (sera fase posterior)
- Autenticacao de usuarios
- Deploy em producao
- Testes automatizados
- CI/CD
- TTS (text-to-speech)
- Dashboard administrativo
- Integracao com dados reais

## Abordagem de Implementacao

Arquitetura de 2 microsservicos independentes:
1. **Backend Node.js** — agente conversacional + interface WhatsApp + cliente ASR
2. **ASR Docker** — FastAPI com modelos Whisper para transcricao

O backend usa o SDK OpenAI apontando para OpenRouter. O tool use segue o formato OpenAI function calling. O historico de conversa usa um Map em memoria com timestamps e limpeza automatica por timeout.

---

## Fase 1: Setup do Projeto + Backend Core

### Overview
Criar a estrutura do projeto Node.js, configuracao, dados ficticios em JS (BRL), wrapper LLM via OpenRouter com tool use, sistema de historico com timeout, e system prompt do agente.

### Mudancas Necessarias:

#### 1. Inicializacao do Projeto
**Arquivo**: `backend/package.json`
**Mudancas**: Criar projeto Node.js com dependencias

```json
{
  "name": "neo-agent-poc",
  "version": "1.0.0",
  "description": "POC Agente IA Conversacional",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "node --watch src/index.js"
  },
  "dependencies": {
    "express": "^4.21.0",
    "whatsapp-web.js": "^1.26.0",
    "openai": "^4.70.0",
    "qrcode-terminal": "^0.12.0",
    "form-data": "^4.0.0",
    "node-fetch": "^2.7.0"
  }
}
```

Nota: Usamos `node-fetch` v2 (CommonJS) para compatibilidade. O pacote `openai` serve como SDK para OpenRouter (API compativel).

#### 2. Variaveis de Ambiente
**Arquivo**: `backend/.env`
**Mudancas**: Configuracao centralizada

```env
# LLM - OpenRouter
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_MODEL=arcee-ai/trinity-large-preview:free
LLM_API_KEY=

# ASR
ASR_URL=http://localhost:8000
ASR_MODEL_ID=freds0

# WhatsApp
WHATSAPP_ENABLED=true

# Servidor
WEB_PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# Conversa
CONVERSATION_TIMEOUT_MS=7200000
```

#### 3. Modulo de Configuracao
**Arquivo**: `backend/src/config.js`
**Mudancas**: Leitura centralizada do .env

```javascript
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
  },
  server: {
    port: parseInt(process.env.WEB_PORT, 10) || 3000,
    env: process.env.NODE_ENV || 'development',
  },
  conversation: {
    timeoutMs: parseInt(process.env.CONVERSATION_TIMEOUT_MS, 10) || 7200000,
  },
};
```

Nota: Adicionar `dotenv` como dependencia no package.json.

#### 4. Dados Ficticios
**Arquivo**: `backend/src/services/data.js`
**Mudancas**: Catalogo de produtos, pedidos e suporte em BRL, contexto de loja brasileira de eletronicos

Os dados devem conter:
- **20 produtos** em categorias: Ar Condicionado, TVs, Smartphones, Maquinas de Lavar, Calcados, Laptops, Fones de Ouvido, Geladeiras, Tablets, Cameras, Aspiradores Robo
- **3 pedidos** com status: enviado, em processamento, entregue
- **5 departamentos de suporte**: Trocas/Devolucoes, Garantia, Entrega, Pagamento, Geral
- Precos em BRL (R$), nomes de clientes brasileiros, transportadoras brasileiras (Correios, Jadlog, etc.)
- IDs dos produtos mantidos (AC-001, TV-001, etc.)
- Specs detalhadas para cada produto
- Produtos fora de estoque devem ter `restock_date`

Estrutura de cada produto:
```javascript
{
  id: "AC-001",
  name: "Nome do Produto",
  category: "Categoria",
  brand: "Marca",
  price: 1299.00,       // BRL
  currency: "BRL",
  in_stock: true,
  specs: { /* detalhes tecnicos */ },
  description: "Descricao completa do produto"
}
```

#### 5. Funcoes-Ferramenta (Tool Definitions + Handlers)
**Arquivo**: `backend/src/agent/tools.js`
**Mudancas**: Definicoes de tools no formato OpenAI + funcoes que consultam data.js

4 ferramentas:

**buscar_produto** — Busca produto por ID ou nome (busca parcial case-insensitive)
```javascript
// Tool definition (formato OpenAI)
{
  type: "function",
  function: {
    name: "buscar_produto",
    description: "Busca um produto por ID ou nome. Use quando o usuario perguntar sobre um produto especifico.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "ID do produto (ex: AC-001) ou parte do nome para busca"
        }
      },
      required: ["query"]
    }
  }
}
```

**listar_produtos** — Lista produtos por categoria (ou todos se sem filtro)
```javascript
{
  type: "function",
  function: {
    name: "listar_produtos",
    description: "Lista produtos disponiveis, opcionalmente filtrados por categoria. Use quando o usuario quiser ver opcoes de produtos.",
    parameters: {
      type: "object",
      properties: {
        categoria: {
          type: "string",
          description: "Categoria para filtrar (ex: Smartphones, TVs, Laptops). Se vazio, lista todas as categorias disponiveis."
        }
      }
    }
  }
}
```

**consultar_pedido** — Consulta status de pedido por ID
```javascript
{
  type: "function",
  function: {
    name: "consultar_pedido",
    description: "Consulta o status de um pedido pelo numero do pedido. Use quando o usuario perguntar sobre um pedido.",
    parameters: {
      type: "object",
      properties: {
        order_id: {
          type: "string",
          description: "Numero do pedido (ex: ORD-10001)"
        }
      },
      required: ["order_id"]
    }
  }
}
```

**contato_suporte** — Retorna contato do departamento
```javascript
{
  type: "function",
  function: {
    name: "contato_suporte",
    description: "Retorna informacoes de contato de um departamento de suporte. Use quando o usuario precisar falar com um atendente humano ou departamento especifico.",
    parameters: {
      type: "object",
      properties: {
        departamento: {
          type: "string",
          enum: ["trocas", "garantia", "entrega", "pagamento", "geral"],
          description: "Departamento de suporte desejado"
        }
      },
      required: ["departamento"]
    }
  }
}
```

Os handlers executam busca nos dados de `data.js` e retornam resultado formatado como string para o LLM.

#### 6. System Prompt
**Arquivo**: `backend/src/agent/prompt.js`
**Mudancas**: Prompt do agente com persona, regras e contexto

```javascript
const SYSTEM_PROMPT = `Voce e o Neo, assistente virtual da TechStore Brasil, uma loja de eletronicos e variedades.

Seu papel:
- Ajudar clientes com informacoes sobre produtos, status de pedidos e contato com suporte
- Ser atencioso, objetivo e profissional
- Responder sempre em portugues brasileiro
- Dar respostas curtas e diretas, adequadas para chat

Regras importantes:
- NUNCA invente dados. Use SOMENTE as ferramentas disponiveis para consultar informacoes.
- Se nao encontrar a informacao solicitada, informe que nao encontrou e sugira alternativas.
- Para questoes que fogem do seu escopo (problemas tecnicos complexos, reclamacoes formais), redirecione para o suporte humano usando a ferramenta contato_suporte.
- Quando listar produtos, inclua: nome, preco (R$) e disponibilidade.
- Quando informar status de pedido, inclua: status atual, transportadora e previsao de entrega.
- Formate precos sempre como R$ X.XXX,XX (formato brasileiro).

Voce tem acesso as seguintes ferramentas:
- buscar_produto: para encontrar um produto especifico por nome ou codigo
- listar_produtos: para mostrar produtos de uma categoria
- consultar_pedido: para verificar status de um pedido
- contato_suporte: para fornecer contato de um departamento de suporte`;
```

#### 7. Wrapper LLM (OpenRouter)
**Arquivo**: `backend/src/agent/llm.js`
**Mudancas**: Cliente OpenAI SDK apontando para OpenRouter, com suporte a tool use loop

```javascript
const OpenAI = require('openai');
const config = require('../config');

const client = new OpenAI({
  baseURL: config.llm.baseUrl,
  apiKey: config.llm.apiKey,
});
```

A funcao principal `chat(messages, tools, toolHandlers)` deve:
1. Enviar messages + tools para o modelo
2. Se a resposta contem `tool_calls`, executar cada tool call via `toolHandlers`
3. Adicionar os resultados como mensagens `role: "tool"`
4. Reenviar para o modelo (loop ate receber resposta final sem tool_calls)
5. Retornar o texto final da resposta

Parametros do modelo:
- `temperature`: 0.7 (balanco entre criatividade e consistencia)
- `max_tokens`: 1024 (respostas de chat nao precisam ser longas)

Headers extras recomendados pelo OpenRouter:
```javascript
defaultHeaders: {
  'HTTP-Referer': 'https://techstore-poc.local',
  'X-Title': 'TechStore Neo Agent POC',
}
```

#### 8. Gerenciamento de Historico com Timeout
**Arquivo**: `backend/src/agent/conversation.js`
**Mudancas**: Map de conversas por sessionId com limpeza automatica

Estrutura:
```javascript
// Map<sessionId, { messages: [], lastActivity: timestamp, timer: timeoutId }>
const conversations = new Map();
```

Funcoes:
- `getHistory(sessionId)` — retorna messages[] ou [] se nao existe/expirou
- `addMessage(sessionId, role, content)` — adiciona mensagem e reseta timer
- `clearHistory(sessionId)` — limpa conversa
- `resetTimer(sessionId)` — cancela timer anterior, cria novo setTimeout que chama clearHistory

Cada interacao:
1. Chama `resetTimer(sessionId)` — isso garante que o timeout de 2h recomeca
2. Adiciona mensagem do usuario
3. Processa resposta do agente
4. Adiciona resposta ao historico

#### 9. Logica Compartilhada de Processamento
**Arquivo**: `backend/src/interfaces/common.js`
**Mudancas**: Funcao central que orquestra o fluxo independente da interface

```javascript
async function processMessage(sessionId, text) {
  // 1. Obtem historico da conversa
  // 2. Adiciona mensagem do usuario ao historico
  // 3. Monta array de messages (system prompt + historico)
  // 4. Chama llm.chat() com tools e handlers
  // 5. Adiciona resposta do agente ao historico
  // 6. Retorna texto da resposta
}
```

#### 10. Entry Point
**Arquivo**: `backend/src/index.js`
**Mudancas**: Inicializa Express + WhatsApp (condicional via config)

```javascript
// 1. Cria app Express
// 2. Rota GET / para health check basico
// 3. Se WHATSAPP_ENABLED, inicializa cliente WhatsApp
// 4. Escuta na porta WEB_PORT
```

### Criterios de Sucesso:

#### Verificacao Automatizada:
- [x] `cd backend && npm install` executa sem erros
- [x] `node -e "require('./src/config')"` carrega configuracao sem erro
- [x] `node -e "const d = require('./src/services/data'); console.log(Object.keys(d.PRODUCTS).length)"` retorna 20
- [x] `node -e "const t = require('./src/agent/tools'); console.log(t.definitions.length)"` retorna 4
- [x] `node src/index.js` inicia servidor sem erros (sem WhatsApp, sem API key ainda — apenas verifica que o codigo carrega)

#### Verificacao Manual:
- [ ] Revisar dados ficticios: precos em BRL fazem sentido, nomes brasileiros, categorias coerentes
- [ ] Revisar system prompt: tom adequado, regras claras
- [ ] Verificar que .env.example existe (sem chaves reais) para referencia

**Nota de Implementacao**: Apos completar esta fase e todas as verificacoes automatizadas passarem, pausar para confirmacao manual antes de prosseguir para a Fase 2.

---

## Fase 2: Microsservico ASR (Docker)

### Overview
Construir o microsservico de transcricao de audio conforme especificacao em ASR.md. FastAPI com 2 modelos Whisper, Docker com suporte a GPU.

### Mudancas Necessarias:

#### 1. Estrutura do Microsservico
**Diretorio**: `asr/`

```
asr/
├── Dockerfile
├── requirements.txt
└── app/
    ├── main.py
    ├── core/
    │   └── config.py
    └── models/
        ├── __init__.py
        ├── base.py
        ├── distil_whisper.py
        └── lite_asr.py
```

#### 2. Dockerfile
**Arquivo**: `asr/Dockerfile`
**Mudancas**: Conforme ASR.md — Python 3.10-slim, ffmpeg, uvicorn

#### 3. Requirements
**Arquivo**: `asr/requirements.txt`
**Mudancas**: fastapi, uvicorn, python-multipart, torch, transformers, librosa, soundfile, huggingface_hub, accelerate

#### 4. Codigo Python
**Arquivos**: Conforme ASR.md com os seguintes pontos criticos:
- `config.py`: Deteccao CUDA/CPU, HF_TOKEN do env
- `base.py`: Interface abstrata ASRStrategy (load_model, transcribe, unload)
- `distil_whisper.py`: Strategy para freds0 — usa pipeline padrao HF, parametro `dtype` (nao `torch_dtype`)
- `lite_asr.py`: Strategy para lite_asr — bypass de pipeline, usa AutoModel + trust_remote_code, processador do whisper-large-v3, sem forced_decoder_ids no generate()
- `__init__.py`: ModelFactory com hot-swap e limpeza de VRAM (torch.cuda.empty_cache + gc.collect)
- `main.py`: POST /transcribe (file + model_id), GET /health, tempfile com cleanup no finally

#### 5. Cliente ASR no Backend
**Arquivo**: `backend/src/services/asr.js`
**Mudancas**: Funcao que envia audio para o microsservico

```javascript
const fetch = require('node-fetch');
const FormData = require('form-data');
const config = require('../config');

async function transcribeAudio(audioBuffer, filename) {
  const form = new FormData();
  form.append('file', audioBuffer, { filename: filename || 'audio.ogg' });
  form.append('model_id', config.asr.modelId);

  const response = await fetch(`${config.asr.url}/transcribe`, {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    throw new Error(`ASR error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.transcription;
}
```

### Criterios de Sucesso:

#### Verificacao Automatizada:
- [x] `docker build -t paradox-asr ./asr` constroi a imagem sem erros
- [ ] `docker run -p 8000:8000 -e HF_TOKEN=<token> paradox-asr` inicia o container
- [ ] `curl http://localhost:8000/health` retorna `{"status": "ok", ...}`
- [ ] Enviar arquivo de audio de teste via curl: `curl -F "file=@test.wav" -F "model_id=freds0" http://localhost:8000/transcribe` retorna transcricao

#### Verificacao Manual:
- [ ] Testar com audio em portugues e verificar qualidade da transcricao
- [ ] Testar com diferentes formatos (wav, ogg, mp3)
- [ ] Verificar que container libera VRAM apos inferencia

**Nota de Implementacao**: O ASR pode demorar para baixar os modelos na primeira execucao (~2-5 minutos dependendo da conexao). O volume de cache do HuggingFace evita re-download entre restarts.

---

## Fase 3: Interface WhatsApp

### Overview
Integrar whatsapp-web.js ao backend para receber e responder mensagens de texto e audio via WhatsApp.

### Mudancas Necessarias:

#### 1. Handler WhatsApp
**Arquivo**: `backend/src/interfaces/whatsapp.js`
**Mudancas**: Inicializacao do cliente, handlers de eventos

```javascript
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
```

**Configuracao do cliente:**
```javascript
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});
```

**Eventos a implementar:**

`qr` — Exibe QR code no terminal usando qrcode-terminal
```javascript
client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
  console.log('Escaneie o QR Code acima para conectar ao WhatsApp');
});
```

`ready` — Log de confirmacao
```javascript
client.on('ready', () => {
  console.log('WhatsApp conectado e pronto!');
});
```

`message` — Processamento principal
```javascript
client.on('message', async (msg) => {
  // Ignorar mensagens do proprio bot
  if (msg.fromMe) return;

  // Ignorar mensagens de grupo (opcional para POC)
  if (msg.from.includes('@g.us')) return;

  const sessionId = msg.from; // chatId como sessionId

  try {
    let userText;

    if (msg.hasMedia && (msg.type === 'ptt' || msg.type === 'audio')) {
      // Fluxo de audio
      const media = await msg.downloadMedia();
      const audioBuffer = Buffer.from(media.data, 'base64');
      const extension = media.mimetype.split('/')[1] || 'ogg';
      userText = await transcribeAudio(audioBuffer, `audio.${extension}`);

      // Opcional: informar o usuario o que foi entendido
      // await msg.reply(`🎤 _"${userText}"_`);
    } else if (msg.type === 'chat') {
      // Fluxo de texto
      userText = msg.body;
    } else {
      // Tipo nao suportado
      return;
    }

    // Processar mensagem pelo agente
    const reply = await processMessage(sessionId, userText);
    await client.sendMessage(msg.from, reply);

  } catch (error) {
    console.error('Erro ao processar mensagem:', error);
    await client.sendMessage(msg.from,
      'Desculpe, tive um problema ao processar sua mensagem. Tente novamente em instantes.');
  }
});
```

`disconnected` — Log e possivel reconexao
```javascript
client.on('disconnected', (reason) => {
  console.log('WhatsApp desconectado:', reason);
});
```

**Funcao de inicializacao:**
```javascript
function initWhatsApp() {
  client.initialize();
  return client;
}
```

#### 2. Integracao no Entry Point
**Arquivo**: `backend/src/index.js`
**Mudancas**: Condicionar inicializacao do WhatsApp

```javascript
if (config.whatsapp.enabled) {
  const { initWhatsApp } = require('./interfaces/whatsapp');
  initWhatsApp();
}
```

#### 3. Helper de Audio
**Arquivo**: `backend/src/utils/audio.js`
**Mudancas**: Funcoes auxiliares para manipulacao de audio (se necessario)

Na pratica para a POC, o audio do WhatsApp vem como base64 via `downloadMedia()` e pode ser enviado diretamente ao ASR como buffer. Este arquivo pode conter apenas a funcao de conversao base64 -> buffer caso seja reutilizada em outras interfaces.

### Criterios de Sucesso:

#### Verificacao Automatizada:
- [x] `node src/index.js` inicia e exibe QR code no terminal (com WHATSAPP_ENABLED=true e LLM_API_KEY configurada)
- [x] Nenhum erro de import/require ao iniciar
- [x] Processo nao crasha apos inicializacao

#### Verificacao Manual:
- [ ] Escanear QR code conecta o bot ao WhatsApp
- [ ] Enviar "Oi" → receber resposta do agente em PT-BR
- [ ] Enviar "Quais produtos voces tem?" → agente usa tool listar_produtos e responde com catalogo
- [ ] Enviar "Qual o status do pedido ORD-10001?" → agente usa tool consultar_pedido e responde
- [ ] Enviar "Quero falar com suporte de garantia" → agente usa tool contato_suporte
- [ ] Enviar audio perguntando sobre um produto → agente transcreve e responde
- [ ] Enviar segunda mensagem → agente mantem contexto da conversa anterior
- [ ] Mensagens de grupo sao ignoradas
- [ ] Erro no ASR (container parado) → mensagem de erro amigavel, nao crasha

**Nota de Implementacao**: Apos completar esta fase e todas as verificacoes automatizadas passarem, pausar para confirmacao manual antes de prosseguir.

---

## Fase 4: Integracao e Teste End-to-End

### Overview
Garantir que todos os componentes funcionam juntos, adicionar .env.example, verificar fluxos completos e documentar como rodar o projeto.

### Mudancas Necessarias:

#### 1. Arquivo .env.example
**Arquivo**: `backend/.env.example`
**Mudancas**: Template sem chaves reais

```env
# LLM - OpenRouter
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_MODEL=arcee-ai/trinity-large-preview:free
LLM_API_KEY=sua-chave-aqui

# ASR
ASR_URL=http://localhost:8000
ASR_MODEL_ID=freds0

# WhatsApp
WHATSAPP_ENABLED=true

# Servidor
WEB_PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# Conversa - Timeout em ms (padrao: 2 horas = 7200000)
CONVERSATION_TIMEOUT_MS=7200000
```

#### 2. Script de Inicializacao
**Arquivo**: `backend/package.json` (atualizar scripts)
**Mudancas**: Adicionar scripts uteis

```json
{
  "scripts": {
    "start": "node src/index.js",
    "dev": "node --watch src/index.js",
    "start:asr": "docker run -p 8000:8000 -e HF_TOKEN=$HF_TOKEN -v hf_cache:/root/.cache/huggingface --gpus all paradox-asr"
  }
}
```

#### 3. Robustez e Edge Cases
**Arquivos**: Varios
**Mudancas**:
- Verificar que o backend continua funcionando se o ASR estiver offline (responde texto normalmente, erro amigavel para audio)
- Verificar que mensagens vazias sao ignoradas
- Verificar que mensagens muito longas nao crasham (truncar se necessario)
- Adicionar log basico com timestamps para debug

### Criterios de Sucesso:

#### Verificacao Automatizada:
- [ ] `docker build -t paradox-asr ./asr` — build sem erros
- [ ] `cd backend && npm install` — install sem erros
- [ ] ASR health check responde OK
- [ ] Backend inicia sem erros

#### Verificacao Manual (Fluxo Completo):
- [ ] **Demo 1 — Texto**: Enviar "Ola" → receber saudacao → perguntar "Quais TVs voces tem?" → receber lista com precos em R$ → perguntar "Me fale mais sobre a TV-001" → receber detalhes
- [ ] **Demo 2 — Pedido**: Enviar "Qual o status do meu pedido ORD-10001?" → receber status com transportadora e previsao
- [ ] **Demo 3 — Suporte**: Enviar "Quero fazer uma devolucao" → receber contato do departamento de trocas
- [ ] **Demo 4 — Audio**: Enviar voice note perguntando "Voces tem smartphone?" → agente transcreve e responde com opcoes
- [ ] **Demo 5 — Contexto**: Conversar sobre TVs → depois perguntar "qual o preco dela?" → agente entende que "dela" refere-se a TV da conversa anterior
- [ ] **Demo 6 — Timeout**: Verificar que apos 2h sem interacao o historico e limpo (testar com timeout curto temporariamente)
- [ ] **Demo 7 — Resiliencia**: Parar container ASR → enviar audio → receber mensagem de erro amigavel → enviar texto → funcionar normalmente

---

## Estrategia de Testes

### Testes Manuais Principais:
1. Fluxo completo texto: saudacao → consulta produto → detalhes → pedido → suporte
2. Fluxo audio: voice note → transcricao → resposta
3. Timeout de historico (configurar 30s temporariamente para testar)
4. Resiliencia: ASR offline, respostas com erro amigavel

### Edge Cases para Verificar:
- Produto nao encontrado → mensagem clara
- Pedido invalido → mensagem clara
- Audio sem fala / ruido → resposta do ASR pode ser vazia, tratar no backend
- Mensagem muito curta (ex: "oi") → resposta amigavel, nao chama tools
- Mensagens rapidas em sequencia → historico mantem coerencia

---

## Consideracoes de Performance

- **Latencia LLM**: Modelo free do OpenRouter pode ter latencia variavel. Para POC e aceitavel.
- **Latencia ASR**: Primeira inferencia e mais lenta (carregamento do modelo). Subsequentes sao rapidas se o modelo ja esta na VRAM.
- **Memoria**: Historico em Map nao persiste entre restarts do servidor. Para POC e aceitavel.
- **WhatsApp**: whatsapp-web.js usa Puppeteer (Chromium headless) que consome ~200-400MB RAM.

---

## Referencias

- PRD completo: `PRD.md`
- Especificacao ASR: `ASR.md`
- API whatsapp-web.js: `wweb_doc.md`
- Setup whatsapp-web.js: `wweb_setup_guide.md`
- Dados ficticios base: `dados_ficticios.md`
- Pagina do modelo LLM: https://openrouter.ai/arcee-ai/trinity-large-preview:free
