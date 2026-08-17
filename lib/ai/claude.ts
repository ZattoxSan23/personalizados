import { buildSystemPrompt, ROUTINE_TOOL, MEAL_PLAN_TOOL, type ClientContext } from './prompts';

/**
 * MiniMax expone una API estilo OpenAI en /v1/chat/completions.
 * Usamos fetch nativo para no agregar dependencias: el código ya tenía
 * @anthropic-ai/sdk, pero MiniMax NO expone /v1/messages (404), por lo que
 * ese SDK no sirve aunque le cambiemos el baseURL.
 */

const BASE_URL = (process.env.MINIMAX_BASE_URL ?? 'https://api.minimax.chat/v1').replace(/\/+$/, '');
export const MODEL = process.env.MINIMAX_MODEL ?? 'MiniMax-M3';

function getApiKey(): string {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey || apiKey === 'tu-minimax-api-key') {
    throw new Error(
      'MINIMAX_API_KEY no configurada. Agrégala en .env (la encuentras en tu panel de MiniMax)',
    );
  }
  return apiKey;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  history: ChatTurn[];
  userMessage: string;
  mode?: 'routine' | 'meal_plan' | 'auto';
  clientContext?: ClientContext | null;
}

interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | null;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content?: string | null;
      tool_calls?: OpenAIToolCall[];
    };
    finish_reason?: string;
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

/**
 * Limpia el texto de la IA: elimina bloques de razonamiento interno (<think>...</think>
 * u otros formatos similares) que MiniMax incluye en el content. Esos son para uso
 * interno del modelo, NO deben verse en la UI.
 */
function cleanAssistantText(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    // Bloques <think>...</think> (MiniMax estilo)
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    // Variantes comunes de reasoning visible
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
    // "Let me think..." o "Pensemos..." como bloques al inicio
    .replace(/^\s*(Let me think|Pensemos|Let me analyze|Vamos a analizar)[\s\S]*?(\n\n|\.\s)/i, '$2')
    .trim();
}

function buildMessages(
  history: ChatTurn[],
  userMessage: string,
  clientContext?: ClientContext | null,
): OpenAIChatMessage[] {
  return [
    { role: 'system', content: buildSystemPrompt(clientContext) },
    ...history.map((t) => ({ role: t.role, content: t.content })),
    { role: 'user', content: userMessage },
  ];
}

async function callChatCompletions(
  messages: OpenAIChatMessage[],
  tools: unknown[] | undefined,
  stream: boolean,
): Promise<Response> {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 18000,
      messages,
      ...(tools ? { tools } : {}),
      ...(stream ? { stream: true } : {}),
    }),
  });
  return res;
}

/**
 * Llama a MiniMax con el system prompt + historial y devuelve la respuesta.
 * Si el modelo invoca una herramienta, devuelve el tool_call para previsualización.
 */
export async function chatWithClaude({ history, userMessage, mode = 'auto', clientContext }: ChatOptions) {
  const tools = mode === 'meal_plan' ? [MEAL_PLAN_TOOL] : [ROUTINE_TOOL, MEAL_PLAN_TOOL];

  const res = await callChatCompletions(buildMessages(history, userMessage, clientContext), tools, false);

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`MiniMax API ${res.status}: ${errBody.slice(0, 300)}`);
  }

  const data = (await res.json()) as ChatCompletionResponse;
  const message = data.choices?.[0]?.message ?? { content: '' };
  const toolCall = message.tool_calls?.[0];

  let toolUse: { name: string; input: any } | null = null;
  if (toolCall?.function?.name) {
    try {
      toolUse = {
        name: toolCall.function.name,
        input: JSON.parse(toolCall.function.arguments || '{}'),
      };
    } catch {
      toolUse = { name: toolCall.function.name, input: {} };
    }
  }

  return {
    textReply: cleanAssistantText(message.content),
    toolUse,
    stopReason: data.choices?.[0]?.finish_reason ?? 'stop',
    usage: data.usage,
  };
}

/**
 * Versión con streaming (opcional, no usada aún en la UI).
 * Emite {type:'text', text} por cada chunk de texto, y al final
 * {type:'tool', name, input} si hubo tool_call, y {type:'done'}.
 */
export async function* streamChat(history: ChatTurn[], userMessage: string, clientContext?: ClientContext | null) {
  const res = await callChatCompletions(
    buildMessages(history, userMessage, clientContext),
    [ROUTINE_TOOL, MEAL_PLAN_TOOL],
    true,
  );

  if (!res.ok || !res.body) {
    const errBody = res.body ? await res.text() : '';
    throw new Error(`MiniMax API ${res.status}: ${errBody.slice(0, 300)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let accumulatedName = '';
  let accumulatedArgs = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '' || payload === '[DONE]') continue;

        let chunk: { choices?: Array<{ delta?: { content?: string; tool_calls?: Array<{ function?: { name?: string; arguments?: string } }> } }> };
        try {
          chunk = JSON.parse(payload);
        } catch {
          continue;
        }

        const delta = chunk.choices?.[0]?.delta;
        if (delta?.content) {
          yield { type: 'text' as const, text: delta.content };
        }
        const toolDelta = delta?.tool_calls?.[0]?.function;
        if (toolDelta?.name) accumulatedName = toolDelta.name;
        if (toolDelta?.arguments) accumulatedArgs += toolDelta.arguments;
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (accumulatedName) {
    try {
      yield {
        type: 'tool' as const,
        name: accumulatedName,
        input: JSON.parse(accumulatedArgs || '{}'),
      };
    } catch {
      // ignore malformed JSON
    }
  }
  yield { type: 'done' as const };
}