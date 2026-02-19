const OpenAI = require('openai');
const config = require('../config');

const client = new OpenAI({
  baseURL: config.llm.baseUrl,
  apiKey: config.llm.apiKey,
  defaultHeaders: {
    'HTTP-Referer': 'https://techstore-poc.local',
    'X-Title': 'TechStore Neo Agent POC',
  },
});

async function chat(messages, tools, toolHandlers) {
  let currentMessages = [...messages];

  while (true) {
    const response = await client.chat.completions.create({
      model: config.llm.model,
      messages: currentMessages,
      tools,
      temperature: 0.7,
      max_tokens: 1024,
    });

    const choice = response.choices[0];
    const assistantMessage = choice.message;

    currentMessages.push(assistantMessage);

    // Se nao tem tool_calls, retornar resposta final
    if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
      return assistantMessage.content || '';
    }

    // Executar cada tool call
    for (const toolCall of assistantMessage.tool_calls) {
      const fnName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);

      let result;
      if (toolHandlers[fnName]) {
        try {
          result = toolHandlers[fnName](args);
        } catch (err) {
          result = JSON.stringify({ error: err.message });
        }
      } else {
        result = JSON.stringify({ error: `Ferramenta desconhecida: ${fnName}` });
      }

      currentMessages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: result,
      });
    }
  }
}

module.exports = { chat };
