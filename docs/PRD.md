# PRD - POC Agente de IA Conversacional (Projeto Neo)

## 1. Visao Geral

### 1.1 Objetivo
Construir uma Prova de Conceito (POC) de um agente de IA conversacional com suporte a texto e voz, demonstravel em 3 interfaces independentes: **WhatsApp**, **Web** e **App Mobile**. O foco esta na qualidade do agente e na arquitetura de microsservicos, nao no design das interfaces.

### 1.2 Contexto
A Confi avaliou seu agente interno ("Neo") contra a plataforma Looqbox para analise de dados de inteligencia de mercado (dataset `eshare-diario-subcategoria-uf`). O relatorio de avaliacao (34 paginas) demonstrou que:
- Ambas as solucoes tem capacidade analitica sobre o dataset
- O agente interno tem vantagem em custo, controle e integracao direta com bancos internos
- Pontos de melhoria: respostas mais estruturadas, compliance/governanca semantica, e usabilidade

Esta POC visa demonstrar a viabilidade tecnica do agente em multiplas interfaces, reutilizando a arquitetura de microsservicos existente (ASR via Docker).

### 1.3 Premissas
- Tudo e POC: interfaces minimalistas, agente pode ser elaborado
- O microsservico ASR (audio -> texto) ja existe e deve ser reutilizado
- Existem 2 modelos ASR disponiveis: `freds0` (distil-whisper) e `lite_asr` - a escolha e via codigo, nao pelo usuario final
- Dados ficticios (`dados_ficticios.md`) serao usados para demonstracao do agente como assistente de loja
- O agente deve funcionar independentemente da interface

---

## 2. Arquitetura Geral

```
┌─────────────────────────────────────────────────────────┐
│                    INTERFACES (Clientes)                 │
│                                                         │
│  ┌─────────┐    ┌──────────┐    ┌───────────────────┐   │
│  │WhatsApp  │    │ Web Chat │    │  App Mobile (PWA) │   │
│  │(wweb.js) │    │ (HTML/JS)│    │  (WebView/Ionic)  │   │
│  └────┬─────┘    └────┬─────┘    └────────┬──────────┘   │
│       │               │                   │              │
└───────┼───────────────┼───────────────────┼──────────────┘
        │               │                   │
        ▼               ▼                   ▼
┌─────────────────────────────────────────────────────────┐
│              API GATEWAY / BACKEND (Node.js)             │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Agente Conversacional               │   │
│  │  - Processamento de mensagens (texto)            │   │
│  │  - Integracao com LLM (Claude/OpenAI)            │   │
│  │  - Logica de negocio (catalogo, pedidos, suporte)│   │
│  │  - System prompt + contexto de conversa          │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Gerenciador de Audio                │   │
│  │  - Recebe audio das interfaces                   │   │
│  │  - Encaminha para microsservico ASR              │   │
│  │  - Retorna transcricao para o agente             │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│          MICROSSERVICO ASR (Docker - Existente)          │
│                                                         │
│  POST /transcribe                                       │
│  - file: audio (qualquer formato)                       │
│  - model_id: "freds0" | "lite_asr"                      │
│                                                         │
│  Modelos:                                               │
│  - freds0/distil-whisper-large-v3-ptbr (Standard)       │
│  - efficient-speech/lite-whisper-large-v3-acc (Custom)   │
│                                                         │
│  GET /health                                            │
└─────────────────────────────────────────────────────────┘
```

### 2.1 Stack Tecnologica

| Componente | Tecnologia | Justificativa |
|---|---|---|
| Backend / API | Node.js + Express | Compativel com whatsapp-web.js, simples para POC |
| WhatsApp | whatsapp-web.js | Lib JS para WhatsApp Web, documentada nos arquivos do projeto |
| Web Chat | HTML + CSS + JS vanilla | POC minimalista, sem framework necessario |
| App Mobile | PWA (Progressive Web App) | Reutiliza o web chat empacotado como app, sem necessidade de SDK nativo |
| LLM | API Claude ou OpenAI | Integracao via SDK, modelo configuravel via codigo |
| ASR | FastAPI + Docker (existente) | Microsservico ja implementado com 2 modelos |
| Dados | Mock em memoria (dados_ficticios.md) | Catalogo de produtos, pedidos e contatos de suporte |

---

## 3. Componentes Detalhados

### 3.1 Backend - Agente Conversacional

O nucleo do sistema. Um unico servidor Node.js que:

#### 3.1.1 Responsabilidades
- Recebe mensagens de texto de qualquer interface
- Recebe audio, encaminha para o ASR, e processa a transcricao
- Mantem historico de conversa por sessao/usuario
- Envia o contexto + mensagem para a LLM
- Retorna a resposta da LLM para a interface de origem

#### 3.1.2 Estrutura de Diretorios
```
/backend
├── package.json
├── .env                      # API keys, config de modelo ASR, config LLM
├── src/
│   ├── index.js              # Entry point, inicializa Express + WhatsApp
│   ├── config.js             # Variaveis de ambiente centralizadas
│   ├── agent/
│   │   ├── llm.js            # Wrapper para chamadas a LLM (Claude/OpenAI)
│   │   ├── prompt.js         # System prompt e templates
│   │   ├── conversation.js   # Gerenciamento de historico por sessao
│   │   └── tools.js          # Funcoes-ferramenta (consulta catalogo, pedidos, etc.)
│   ├── services/
│   │   ├── asr.js            # Cliente HTTP para o microsservico ASR
│   │   └── data.js           # Dados ficticios em memoria (produtos, pedidos, suporte)
│   ├── interfaces/
│   │   ├── whatsapp.js       # Handler WhatsApp via whatsapp-web.js
│   │   ├── web.js            # Rotas Express para o chat web (REST/WebSocket)
│   │   └── common.js         # Logica compartilhada entre interfaces
│   └── utils/
│       └── audio.js          # Helpers para manipulacao de audio
```

#### 3.1.3 System Prompt do Agente
O agente sera configurado como um assistente de atendimento ao cliente de uma loja de eletronicos/varejo. O system prompt deve incluir:
- Persona: assistente atencioso, objetivo, em PT-BR
- Contexto: acesso ao catalogo de produtos, status de pedidos e contatos de suporte
- Regras: nao inventar dados, redirecionar para suporte humano quando necessario
- Formato: respostas curtas e diretas, adequadas para chat

#### 3.1.4 Funcoes-Ferramenta (Tool Use)
O agente tera acesso a funcoes para consultar os dados ficticios:

| Funcao | Descricao | Parametros |
|---|---|---|
| `buscar_produto` | Busca produto por ID ou nome | `query: string` |
| `listar_produtos` | Lista produtos por categoria | `categoria?: string` |
| `consultar_pedido` | Consulta status de um pedido | `order_id: string` |
| `contato_suporte` | Retorna contato do departamento adequado | `departamento: string` |

#### 3.1.5 Configuracao de Modelo LLM
```env
# .env
LLM_PROVIDER=anthropic          # "anthropic" ou "openai"
LLM_MODEL=claude-sonnet-4-5-20250929  # modelo especifico
LLM_API_KEY=sk-...
ASR_URL=http://localhost:8000
ASR_MODEL_ID=freds0             # "freds0" ou "lite_asr"
```

---

### 3.2 Interface 1: WhatsApp

#### 3.2.1 Funcionamento
- Utiliza `whatsapp-web.js` para conectar ao WhatsApp Web
- Autenticacao via QR Code (exibido no terminal) ou pairing code
- Estrategia de sessao: `LocalAuth` para persistir entre restarts
- Suporta mensagens de texto e audio (voice notes)

#### 3.2.2 Fluxo de Mensagem de Texto
```
Usuario envia texto no WhatsApp
    → whatsapp-web.js captura evento 'message'
    → Extrai corpo da mensagem e chatId
    → Envia para agent/conversation.js com o texto
    → Recebe resposta da LLM
    → Envia resposta via client.sendMessage(chatId, resposta)
```

#### 3.2.3 Fluxo de Mensagem de Audio
```
Usuario envia audio no WhatsApp
    → whatsapp-web.js captura evento 'message' (type: 'ptt' ou 'audio')
    → Faz download do media: msg.downloadMedia()
    → Converte base64 para buffer
    → Envia para microsservico ASR via POST /transcribe
    → Recebe transcricao
    → Envia transcricao para agent/conversation.js
    → Recebe resposta da LLM
    → Envia resposta de texto via client.sendMessage()
```

#### 3.2.4 Configuracao do Cliente
```javascript
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});
```

#### 3.2.5 Eventos a Implementar
- `qr` - Exibe QR code no terminal
- `ready` - Confirma que o bot esta online
- `message` - Processa mensagens recebidas
- `disconnected` - Loga desconexao

---

### 3.3 Interface 2: Web Chat

#### 3.3.1 Descricao
Pagina web simples com apenas uma janela de chat funcional. O restante da pagina e decorativo/estatico (mockup). Nao precisa de botoes funcionais, menus, ou navegacao real.

#### 3.3.2 Estrutura
```
/web
├── index.html          # Pagina unica com chat widget
├── styles.css          # Estilo minimalista
└── chat.js             # Logica do chat (WebSocket ou fetch)
```

#### 3.3.3 Funcionalidades
- **Chat de texto**: campo de input + envio com Enter
- **Exibicao de mensagens**: baloes de chat (usuario vs agente)
- **Indicador de digitacao**: "Agente esta digitando..."
- **Gravacao de audio** (opcional/stretch): botao de microfone usando `MediaRecorder API`
- **Scroll automatico**: para novas mensagens

#### 3.3.4 Comunicacao com Backend
Opcao A (recomendada para POC): **REST API simples**
```
POST /api/chat
Body: { "session_id": "...", "message": "texto do usuario" }
Response: { "reply": "resposta do agente" }
```

Opcao B (melhor UX): **WebSocket** para streaming de resposta

#### 3.3.5 Design Minimalista
- Fundo neutro com um header simples ("Assistente Virtual - POC")
- Area de chat centralizada (~400px largura, ~600px altura)
- Sem menu, sidebar, ou elementos interativos alem do chat
- Responsivo basico para funcionar em mobile tambem

---

### 3.4 Interface 3: App Mobile (PWA)

#### 3.4.1 Abordagem
Reaproveitar a interface web como Progressive Web App (PWA):
- Adicionar `manifest.json` para instalacao em home screen
- Adicionar `service-worker.js` basico
- Meta tags para viewport mobile
- Icones para home screen

#### 3.4.2 Justificativa
Para uma POC, nao faz sentido criar um app nativo. Uma PWA:
- Reutiliza 100% do codigo web
- Pode ser "instalada" no celular
- Tem aparencia de app nativo (fullscreen, sem barra do browser)
- Zero overhead de desenvolvimento adicional

#### 3.4.3 Extras opcionais
- Splash screen ao abrir
- Tema de cor (status bar do celular)
- Icone customizado

---

## 4. Microsservico ASR (Existente)

### 4.1 Resumo
Ja implementado em Python/FastAPI, roda via Docker. Aceita qualquer formato de audio e retorna transcricao em texto.

### 4.2 Endpoint
```
POST /transcribe
- file: UploadFile (audio)
- model_id: "freds0" (default) | "lite_asr"

Response:
{
    "status": "success",
    "model_used": "freds0",
    "processing_time_sec": 2.35,
    "transcription": "texto transcrito"
}
```

### 4.3 Modelos Disponiveis

| ID | Modelo | Tipo | Observacoes |
|---|---|---|---|
| `freds0` | freds0/distil-whisper-large-v3-ptbr | Standard HF pipeline | Usa `AutoModelForSpeechSeq2Seq`, portugues nativo |
| `lite_asr` | efficient-speech/lite-whisper-large-v3-acc | Arquitetura custom | Requer `trust_remote_code`, bypass de pipeline |

### 4.4 Como Rodar
```bash
docker build -t paradox-asr .
docker run -p 8000:8000 \
    -e HF_TOKEN=<token> \
    -v hf_cache:/root/.cache/huggingface \
    --gpus all \
    paradox-asr
```

### 4.5 Integracao com Backend
O backend Node.js faz chamadas HTTP ao ASR:
```javascript
// services/asr.js
async function transcribeAudio(audioBuffer, filename) {
    const form = new FormData();
    form.append('file', audioBuffer, { filename });
    form.append('model_id', config.ASR_MODEL_ID);

    const response = await fetch(`${config.ASR_URL}/transcribe`, {
        method: 'POST',
        body: form
    });
    const data = await response.json();
    return data.transcription;
}
```

---

## 5. Dados Ficticios

### 5.1 Origem
Arquivo `dados_ficticios.md` contem dados mock para demonstracao.

### 5.2 Estrutura

#### Produtos (PRODUCTS)
20 produtos em 10 categorias: Ar Condicionado, TVs, Smartphones, Maquinas de Lavar, Calcados, Laptops, Headphones, Geladeiras, Tablets, Cameras, Robot Vacuums. Cada produto tem: id, nome, categoria, marca, preco (THB), estoque, specs detalhadas e descricao.

#### Pedidos (ORDERS)
3 pedidos mock com status diferentes:
- `ORD-10001`: shipped (em transito)
- `ORD-10002`: processing (em processamento)
- `ORD-10003`: delivered (entregue)

#### Suporte (SUPPORT_DEPARTMENTS)
5 departamentos: Devolucoes, Garantia, Entrega, Pagamento, Geral. Cada um com telefone, email e horario.

### 5.3 Conversao para JS
Os dados do `dados_ficticios.md` (formato Python dict) serao convertidos para modulos JS:
```javascript
// services/data.js
module.exports = { PRODUCTS, ORDERS, SUPPORT_DEPARTMENTS };
```

---

## 6. Escopo e Prioridades

### 6.1 MVP (Must Have)
- [ ] Backend com agente conversacional funcional (texto)
- [ ] Integracao com LLM (Claude ou OpenAI)
- [ ] Funcoes-ferramenta para consulta de dados ficticios
- [ ] Interface WhatsApp funcional (texto)
- [ ] Interface Web Chat funcional (texto)
- [ ] Integracao com microsservico ASR para audio no WhatsApp

### 6.2 Should Have
- [ ] Suporte a audio na interface Web (MediaRecorder)
- [ ] PWA para demonstracao mobile
- [ ] Historico de conversa persistente por sessao

### 6.3 Nice to Have
- [ ] Streaming de respostas via WebSocket
- [ ] TTS (text-to-speech) para respostas em audio
- [ ] Indicador de "digitando" no WhatsApp
- [ ] Logs estruturados para debug

### 6.4 Fora de Escopo
- Autenticacao de usuarios
- Dashboard administrativo
- Deploy em producao
- Testes automatizados
- CI/CD
- Design elaborado de UI
- Integracao com dados reais (dataset eshare)
- Analises de share de mercado (foco do relatorio, nao desta POC)

---

## 7. Configuracao e Variaveis de Ambiente

```env
# LLM
LLM_PROVIDER=anthropic
LLM_MODEL=claude-sonnet-4-5-20250929
LLM_API_KEY=

# ASR
ASR_URL=http://localhost:8000
ASR_MODEL_ID=freds0

# WhatsApp
WHATSAPP_ENABLED=true

# Web
WEB_PORT=3000

# Geral
NODE_ENV=development
LOG_LEVEL=info
```

---

## 8. Fluxo de Demonstracao

### Demo 1: WhatsApp
1. Iniciar backend + ASR Docker
2. Escanear QR Code no terminal
3. Enviar mensagem de texto para o bot: "Quais produtos voces tem?"
4. Enviar audio perguntando sobre um produto
5. Perguntar sobre status de pedido: "Qual o status do pedido ORD-10001?"

### Demo 2: Web Chat
1. Abrir `http://localhost:3000` no browser
2. Conversar com o agente via texto
3. (Opcional) Gravar e enviar audio

### Demo 3: App Mobile
1. Abrir `http://localhost:3000` no celular
2. Adicionar a home screen (instalar PWA)
3. Abrir como app e conversar

---

## 9. Riscos e Mitigacoes

| Risco | Impacto | Mitigacao |
|---|---|---|
| WhatsApp banir o numero | Alto | Usar numero dedicado para testes, evitar spam |
| ASR lento sem GPU | Medio | Modelo `freds0` e mais leve; fallback para texto |
| Rate limit da API LLM | Baixo | POC tem volume baixo; configurar retry |
| whatsapp-web.js instavel | Medio | Implementar reconexao automatica |
| Audio do WhatsApp em formato OGG | Baixo | ASR ja suporta via ffmpeg |

---

## 10. Dependencias Externas

| Dependencia | Tipo | Status |
|---|---|---|
| API Key Anthropic ou OpenAI | Servico | Necessario antes de iniciar |
| HuggingFace Token | Servico | Para o ASR baixar modelos |
| Docker + GPU (opcional) | Infra | Para microsservico ASR |
| Node.js >= 18 | Runtime | Requerido pelo whatsapp-web.js |
| Chromium/Puppeteer | Lib | Instalado automaticamente pelo whatsapp-web.js |
| Numero WhatsApp para o bot | Recurso | Necessario SIM card dedicado |

---

## 11. Proximos Passos (Pos-PRD)

1. **Revisao e aprovacao deste PRD**
2. **Criar plano de implementacao** (`create_plan.md`) com fases e criterios de sucesso
3. **Implementar** seguindo o plano (`implement_plan.md`)
4. **Demonstrar** para stakeholders nas 3 interfaces
