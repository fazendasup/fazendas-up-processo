import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { ResponseInput } from "openai/resources/responses/responses";
import { ENV } from "./_core/env";

export type FarmChatMessage = { role: "user" | "assistant"; content: string };

const BASE_INSTRUCTIONS_PT = `És o assistente operacional da plataforma **Fazendas Up** (fazenda vertical, hidroponia e microverdes).

Recebes um snapshot em Markdown com dados reais do projeto do utilizador — trata-o como fonte de verdade para contagens, nomes, fases e estado.
Regras:
- Responde em **português do Brasil**, salvo se o utilizador usar outro idioma.
- Ancora recomendações nos dados do snapshot quando fizer sentido; não inventes números ou registos que não apareçam lá.
- Para boas práticas gerais, normas ou literatura recente, raciocina com cuidado; quando a **pesquisa web** estiver ativa, podes citar orientações externas e deixar claro que são referências gerais (não substituem o snapshot local).
- Mesmo para perguntas simples, acrescenta **um insight ou próximo passo prático** quando couber, sem ser prolixo.
- Não afirmes ter alterado dados no sistema; alterações são sempre feitas pelo operador na app.`;

function getClient(): OpenAI | null {
  const key = ENV.openAiApiKey?.trim();
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

function toChatMessages(
  instructions: string,
  history: FarmChatMessage[],
): ChatCompletionMessageParam[] {
  const out: ChatCompletionMessageParam[] = [{ role: "system", content: instructions }];
  for (const m of history) {
    out.push({ role: m.role, content: m.content });
  }
  return out;
}

function toResponseInput(history: FarmChatMessage[]): ResponseInput {
  return history.map((m) => ({
    type: "message" as const,
    role: m.role,
    content: m.content,
  }));
}

export async function runFarmAssistantChat(params: {
  snapshotMarkdown: string;
  messages: FarmChatMessage[];
  useWebSearch: boolean;
}): Promise<{ reply: string; modelUsed: string; webSearchUsed: boolean }> {
  const client = getClient();
  if (!client) {
    throw new Error("OPENAI_API_KEY não configurada");
  }

  const instructions = `${BASE_INSTRUCTIONS_PT}

---

### Snapshot do projeto (atual)

${params.snapshotMarkdown}`;

  if (params.useWebSearch) {
    const resp = await client.responses.create({
      model: ENV.openAiResponsesModel,
      instructions,
      input: toResponseInput(params.messages),
      tools: [{ type: "web_search" }],
      max_output_tokens: 4096,
    });
    const text = resp.output_text?.trim() ?? "";
    if (!text) {
      throw new Error("Resposta vazia do modelo (Responses API).");
    }
    return {
      reply: text,
      modelUsed: String(resp.model),
      webSearchUsed: true,
    };
  }

  const completion = await client.chat.completions.create({
    model: ENV.openAiChatModel,
    messages: toChatMessages(instructions, params.messages),
    max_completion_tokens: 4096,
  });
  const text = completion.choices[0]?.message?.content?.trim() ?? "";
  if (!text) {
    throw new Error("Resposta vazia do modelo (Chat Completions).");
  }
  return {
    reply: text,
    modelUsed: completion.model,
    webSearchUsed: false,
  };
}
