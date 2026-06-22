import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { ResponseInput } from "openai/resources/responses/responses";
import type { PendingAssistantAction } from "@shared/assistant-actions";
import { ENV } from "./_core/env";
import { getAssistantOperationTools, runAssistantToolCall } from "./assistant-actions/tools";
import type { AssistantPreviewCtx } from "./assistant-actions/preview";

export type FarmChatMessage = { role: "user" | "assistant"; content: string };

const BASE_INSTRUCTIONS_PT = `Você é o assistente operacional da plataforma **Fazendas Up** (fazenda vertical, hidroponia e microverdes).

Você recebe abaixo um **resumo operacional do projeto** em Markdown (torres, planos, tarefas, ciclos, etc.) — dados **reais e consolidados**, atualizados **no momento em que o usuário envia a mensagem**. Trate isso como fonte da verdade para contagens, nomes, fases e estado.

### Operações no sistema (ferramentas preparar_*)
Cada ferramenta **só prepara** a ação; o usuário **confirma** na interface antes de gravar.

**Tarefas (checklist / tabela tarefas):** concluir tarefas por escopo ou título; adiar; criar tarefa — **não** são os cartões «Germinação / plantio inicial» do Plantio.

**Germinação / plantio inicial (painel Plantio):** são **planos de plantio** em \`planejado\`; para equivaler ao botão verde «Iniciar germinação», use **preparar_iniciar_germinacao_planos** (neste resumo aparecem os **#id** desses planos).

**Torres (FV / microverdes):** transplantio, plantar/atualizar perfis, ativar todos os perfis, furos, esvaziar furos, marcar lavado, liberar andar, colheita, aplicação no andar, mover perfil/andar.

**Ciclos:** marcar ciclo executado.

**Germinação (lotes):** criar/atualizar lote germinação, contagem no plano, marcar pronta para mudas.

**Infra:** medição e aplicação na caixa d'água; abrir/concluir manutenção.

**Hidroponia:** plantio em bancada.

**Inteligência (se módulo ativo):** alerta lido / em andamento / resolvido.

**Proibido:** apagar registros, excluir histórico, ou qualquer operação de remoção. Não há ferramenta para isso. Regenerar tarefas automáticas do dia também não (envolve apagar tarefas).

**Dicas:** torre = fase + número (ex. mudas 1). Andar = número do andar. Perfis P1–P12. Transplantio sem quantidades → reparte entre destinos. Pedidos ambíguos → pergunte antes de preparar.

### Dados de módulos adicionais
- O resumo inclui um **Mapa de páginas do sistema** com rotas, abas e blocos de dados — use-o para orientar o usuário sobre **onde** encontrar cada informação na interface.
- O resumo pode incluir blocos **Comercial**, **Estoque**, **Custos de produção**, **Inteligência**, **Visão do cultivo** e **Automação** quando os módulos estiverem contratados/configurados.
- Se o usuário perguntar sobre qualquer página ou módulo, consulte primeiro o mapa de páginas e depois o bloco JSON correspondente no resumo. Não diga que não tem acesso se o resumo trouxer os dados.
- Se o bloco indicar "não disponível" ou "módulo inativo", explique essa limitação específica e peça para verificar contratação/configuração ou permissão de perfil.
- No Comercial, o bloco **Comercial — contexto completo por página** cobre Dashboard, KPIs, Relatórios, Clientes, Oportunidades, Pedidos, Histórico, Entregas, Varejo/avarias, Mensagens, Execuções e Configurações.
- Em **Custos de produção**, use os blocos por aba: Painel CFO, Por variedade, Produtos vendidos (fichas), Comuns/rateio, Equipes MO e Rentabilidade (inclui resultado por produto).
- Em **Inteligência**, use alertas abertos com severidade, status e sugestões de ação.
- Em **Visão do cultivo**, use análises recentes e distribuição de rótulos.
- Em **Automação**, use ciclos ativos e medições recentes de caixa d'água.
- Páginas core (Início, Hoje, Plantio, Tarefas, Analytics, Torres, etc.) usam o resumo operacional principal (torres, planos, tarefas, colheitas).
- Ao tirar insights comerciais ou de rentabilidade, cite os números usados e deixe claro quando estiver olhando a janela analítica do snapshot, em vez de inventar dados fora do período.

### Respostas
- Responda em **português do Brasil**, salvo se o usuário usar outro idioma.
- Ancore recomendações no resumo operacional abaixo; não invente números.
- Para boas práticas gerais, use raciocínio cuidadoso; com pesquisa web ativa você pode citar referências externas.`;

const ADMIN_INSTRUCTIONS_PT = `

### Administração do projeto (somente usuários admin)
Ferramentas \`preparar_*\` adicionais para cadastro e configuração — **sempre com confirmação**, **nunca apagam dados**.

**Planos:** avançar status, atualizar plano, deslocar datas de todos os planos ativos de uma variedade.

**Cadastro:** criar/atualizar variedade, receita, ciclo de dosagem.

**Infraestrutura:** criar/atualizar torre, ativar/desativar torre, criar caixa d'água, criar/atualizar bancada (hidroponia), configurar limites EC/pH por fase.

Não use essas ferramentas para operador comum; se o usuário não for admin, explique que precisa de permissão de administrador do projeto.`;

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
