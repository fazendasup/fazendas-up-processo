import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { ResponseInput } from "openai/resources/responses/responses";
import type { PendingAssistantAction } from "@shared/assistant-actions";
import { ENV } from "./_core/env";
import { getAssistantOperationTools, runAssistantToolCall } from "./assistant-actions/tools";
import type { AssistantPreviewCtx } from "./assistant-actions/preview";

export type FarmChatMessage = { role: "user" | "assistant"; content: string };

const BASE_INSTRUCTIONS_PT = `És o assistente operacional da plataforma **Fazendas Up** (fazenda vertical, hidroponia e microverdes).

Recebes abaixo um **resumo operacional do projeto** em Markdown (torres, planos, tarefas, ciclos, etc.) — dados **reais e consolidados**, actualizados **no momento em que o utilizador envia a mensagem**. Trata-o como fonte de verdade para contagens, nomes, fases e estado.

### Operações no sistema (ferramentas preparar_*)
Cada ferramenta **só prepara** a ação; o utilizador **confirma** na interface antes de gravar.

**Tarefas (checklist / tabela tarefas):** concluir tarefas por escopo ou título; adiar; criar tarefa — **não** são os cartões «Germinação / plantio inicial» do Plantio.

**Germinação / plantio inicial (painel Plantio):** são **planos de plantio** em \`planejado\`; para equivaler ao botão verde «Iniciar germinação», use **preparar_iniciar_germinacao_planos** (neste resumo aparecem os **#id** desses planos).

**Torres (FV / microverdes):** transplantio, plantar/actualizar perfis, activar todos os perfis, furos, esvaziar furos, marcar lavado, liberar andar, colheita, aplicação no andar, mover perfil/andar.

**Ciclos:** marcar ciclo executado.

**Germinação (lotes):** criar/atualizar lote germinação, contagem no plano, marcar pronta para mudas.

**Infra:** medição e aplicação na caixa d'água; abrir/concluir manutenção.

**Hidroponia:** plantio em bancada.

**Inteligência (se módulo activo):** alerta lido / em andamento / resolvido.

**Proibido:** apagar registos, excluir histórico, ou qualquer operação de remoção. Não há ferramenta para isso. Regenerar tarefas automáticas do dia também não (envolve apagar tarefas).

**Dicas:** torre = fase + número (ex. mudas 1). Andar = número do andar. Perfis P1–P12. Transplantio sem quantidades → reparte entre destinos. Pedidos ambíguos → pergunta antes de preparar.

### Respostas
- Responde em **português do Brasil**, salvo se o utilizador usar outro idioma.
- Ancora recomendações no resumo operacional abaixo; não inventes números.
- Para boas práticas gerais, usa raciocínio cuidadoso; com pesquisa web ativa podes citar referências externas.`;

const ADMIN_INSTRUCTIONS_PT = `

### Administração do projeto (só utilizadores admin)
Ferramentas \`preparar_*\` adicionais para cadastro e configuração — **sempre com confirmação**, **nunca apagam dados**.

**Planos:** avançar status, actualizar plano, deslocar datas de todos os planos activos de uma variedade.

**Cadastro:** criar/actualizar variedade, receita, ciclo de dosagem.

**Infraestrutura:** criar/actualizar torre, activar/desactivar torre, criar caixa d'água, criar/actualizar bancada (hidroponia), configurar limites EC/pH por fase.

Não uses estas ferramentas para operador comum; se o utilizador não for admin, explica que precisa de permissão de administrador do projeto.`;

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

const MAX_TOOL_ROUNDS = 6;

export type FarmAssistantChatResult = {
  reply: string;
  modelUsed: string;
  webSearchUsed: boolean;
  pendingActions: PendingAssistantAction[];
};

export async function runFarmAssistantChat(params: {
  /** Markdown do resumo operacional (dados consolidados do projeto no envio). */
  resumoOperacionalMarkdown: string;
  messages: FarmChatMessage[];
  useWebSearch: boolean;
  operationCtx?: AssistantPreviewCtx;
}): Promise<FarmAssistantChatResult> {
  const client = getClient();
  if (!client) {
    throw new Error("OPENAI_API_KEY não configurada");
  }

  const isAdmin = Boolean(params.operationCtx?.isAdmin);
  const instructions = `${BASE_INSTRUCTIONS_PT}${isAdmin ? ADMIN_INSTRUCTIONS_PT : ""}

---

### Resumo operacional do projeto

${params.resumoOperacionalMarkdown}`;

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
      pendingActions: [],
    };
  }

  const pendingActions: PendingAssistantAction[] = [];
  const opCtx = params.operationCtx;
  const chatMessages = toChatMessages(instructions, params.messages);

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const completion = await client.chat.completions.create({
      model: ENV.openAiChatModel,
      messages: chatMessages,
      tools: opCtx ? getAssistantOperationTools(Boolean(opCtx.isAdmin)) : undefined,
      max_completion_tokens: 4096,
    });

    const choice = completion.choices[0]?.message;
    if (!choice) {
      throw new Error("Resposta vazia do modelo (Chat Completions).");
    }

    const toolCalls = choice.tool_calls;
    if (!toolCalls?.length || !opCtx) {
      const text = choice.content?.trim() ?? "";
      if (!text && pendingActions.length > 0) {
        return {
          reply:
            "Preparei as ações abaixo. **Confirme** na caixa de confirmação para executar no sistema.",
          modelUsed: completion.model,
          webSearchUsed: false,
          pendingActions,
        };
      }
      if (!text) {
        throw new Error("Resposta vazia do modelo (Chat Completions).");
      }
      return {
        reply: text,
        modelUsed: completion.model,
        webSearchUsed: false,
        pendingActions,
      };
    }

    chatMessages.push(choice);

    for (const tc of toolCalls) {
      if (tc.type !== "function") continue;
      const result = await runAssistantToolCall(opCtx, tc.function.name, tc.function.arguments, pendingActions);
      chatMessages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: result,
      });
    }
  }

  return {
    reply:
      "Limite de passos com ferramentas atingido. Revise as propostas abaixo e confirme, ou reformule o pedido.",
    modelUsed: ENV.openAiChatModel,
    webSearchUsed: false,
    pendingActions,
  };
}
