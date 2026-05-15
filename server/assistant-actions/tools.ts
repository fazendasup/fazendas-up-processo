import type { ChatCompletionTool } from "openai/resources/chat/completions";
import type { PendingAssistantAction } from "@shared/assistant-actions";
import {
  previewAtualizarBancada,
  previewAtualizarCiclo,
  previewAtualizarPlanoPlantio,
  previewAtualizarReceita,
  previewAtualizarTorre,
  previewAtualizarVariedade,
  previewAvancarStatusPlano,
  previewCriarBancada,
  previewCriarCaixaAgua,
  previewCriarCiclo,
  previewCriarReceita,
  previewCriarTorre,
  previewCriarVariedade,
  previewDeslocarDatasPlanosVariedade,
  previewToggleTorreAtiva,
  previewUpsertFaseConfig,
} from "./preview-admin";
import { ADMIN_OPERATION_TOOLS } from "./tools-admin";
import type { AssistantPreviewCtx } from "./preview";
import {
  previewAtualizarPerfis,
  previewConcluirTarefas,
  previewMarcarAndarLavado,
  previewMarcarCicloExecutado,
  previewTransplantio,
} from "./preview";
import {
  previewAtivarTodosPerfisAndar,
  previewAtualizarAlerta,
  previewAtualizarFurosLote,
  previewAtualizarGerminacao,
  previewAdiarTarefa,
  previewBancadaPlantio,
  previewConcluirManutencao,
  previewContagemGerminacaoPlano,
  previewCriarGerminacao,
  previewCriarManutencao,
  previewCriarTarefa,
  previewEsvaziarFurosAndar,
  previewIniciarGerminacaoPlanos,
  previewLiberarAndar,
  previewMarcarGerminacaoProntaPlano,
  previewMoverAndar,
  previewMoverPerfil,
  previewRegistrarAplicacaoAndar,
  previewRegistrarAplicacaoCaixa,
  previewRegistrarColheita,
  previewRegistrarMedicaoCaixa,
} from "./preview-ops";

function pushPreview(
  pending: PendingAssistantAction[],
  r: { action: PendingAssistantAction } | { error: string },
): string {
  if ("error" in r) return JSON.stringify({ ok: false, error: r.error });
  pending.push(r.action);
  return JSON.stringify({ ok: true, action_id: r.action.id, summary: r.action.summary });
}

const OPERATOR_OPERATION_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "preparar_transplantio",
      description:
        "Prepara transplantio entre torres/andares. Reparte plantas igualmente entre andares destino se quantidades não forem informadas. Não executa — só propõe para confirmação.",
      parameters: {
        type: "object",
        properties: {
          torre_origem_fase: { type: "string", description: "mudas, vegetativa ou maturacao" },
          torre_origem_numero: { type: "number", description: "Número da torre (ex.: 1)" },
          andar_origem_numero: { type: "number" },
          torre_destino_fase: { type: "string" },
          torre_destino_numero: { type: "number" },
          andares_destino_numeros: { type: "array", items: { type: "number" } },
          fase_destino: { type: "string", enum: ["vegetativa", "maturacao"], description: "Opcional; só mudas→veg/mat" },
          quantidades_por_andar: {
            type: "array",
            items: {
              type: "object",
              properties: { andar_numero: { type: "number" }, quantidade: { type: "number" } },
              required: ["andar_numero", "quantidade"],
            },
          },
          observacoes: { type: "string" },
        },
        required: [
          "torre_origem_fase",
          "torre_origem_numero",
          "andar_origem_numero",
          "torre_destino_fase",
          "torre_destino_numero",
          "andares_destino_numeros",
        ],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_concluir_tarefas",
      description:
        "Prepara conclusão de linhas na **tabela de tarefas** (checklist com título/vencimento). NÃO use para o cartão 'Germinação / plantio inicial' do Plantio — esses são **planos de plantio**; use preparar_iniciar_germinacao_planos.",
      parameters: {
        type: "object",
        properties: {
          escopo: {
            type: "string",
            enum: ["hoje_e_atrasadas", "hoje", "atrasadas", "por_titulo"],
          },
          titulo_contem: { type: "string" },
          tipos: { type: "array", items: { type: "string" } },
          limite: { type: "number", description: "Máx. tarefas (padrão 40)" },
        },
        required: ["escopo"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_iniciar_germinacao_planos",
      description:
        "Painel Plantio — 'Germinação / plantio inicial' / 'Iniciar germinação': avança planos em **planejado** para **em_germinacao** (equivalente ao botão verde). Sem plano_ids, usa a mesma fila de prioridade que o painel Hoje (hoje + atrasados). Opcional: filtrar por variedade_nome ou listar plano_ids explícitos (números do # na UI).",
      parameters: {
        type: "object",
        properties: {
          plano_ids: { type: "array", items: { type: "number" }, description: "Ids numéricos dos planos (ex.: 383, 390)" },
          variedade_nome: { type: "string", description: "Subcadeia do nome da variedade quando não passar plano_ids" },
          limite: { type: "number", description: "Máx. planos sem plano_ids (padrão 25)" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_marcar_andar_lavado",
      description: "Marca andar como lavado após colheita/limpeza.",
      parameters: {
        type: "object",
        properties: {
          torre_fase: { type: "string" },
          torre_numero: { type: "number" },
          andar_numero: { type: "number" },
        },
        required: ["torre_fase", "torre_numero", "andar_numero"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_atualizar_perfis",
      description: "Ativa perfis em torre de mudas (plantio). perfil_indices usa 1-12 (P1=1).",
      parameters: {
        type: "object",
        properties: {
          torre_fase: { type: "string" },
          torre_numero: { type: "number" },
          andar_numero: { type: "number" },
          perfil_indices: { type: "array", items: { type: "number" } },
          variedade_nome: { type: "string" },
          ativo: { type: "boolean" },
        },
        required: ["torre_fase", "torre_numero", "andar_numero", "perfil_indices"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_marcar_ciclo_executado",
      description: "Regista execução de ciclo de dosagem/automação.",
      parameters: {
        type: "object",
        properties: {
          ciclo_id: { type: "number" },
          nome_parcial: { type: "string" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_liberar_andar",
      description: "Após colheita e limpeza: zera cultivo do andar e marca lavado (não apaga histórico).",
      parameters: {
        type: "object",
        properties: {
          torre_fase: { type: "string" },
          torre_numero: { type: "number" },
          andar_numero: { type: "number" },
        },
        required: ["torre_fase", "torre_numero", "andar_numero"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_registrar_colheita",
      description: "Regista colheita de um andar (peso e qualidade opcionais).",
      parameters: {
        type: "object",
        properties: {
          torre_fase: { type: "string" },
          torre_numero: { type: "number" },
          andar_numero: { type: "number" },
          variedade_nome: { type: "string" },
          quantidade_plantas: { type: "number" },
          peso_gramas: { type: "number" },
          qualidade: { type: "string" },
          destino: { type: "string" },
          observacoes: { type: "string" },
        },
        required: ["torre_fase", "torre_numero", "andar_numero", "quantidade_plantas"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_registrar_aplicacao_andar",
      description: "Regista aplicação de produto num andar (veg/mat).",
      parameters: {
        type: "object",
        properties: {
          torre_fase: { type: "string" },
          torre_numero: { type: "number" },
          andar_numero: { type: "number" },
          tipo: { type: "string" },
          produto: { type: "string" },
          quantidade: { type: "string" },
        },
        required: ["torre_fase", "torre_numero", "andar_numero", "tipo", "produto", "quantidade"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_registrar_medicao_caixa",
      description: "Regista pH e EC numa caixa d'água.",
      parameters: {
        type: "object",
        properties: {
          caixa_nome: { type: "string" },
          caixa_id: { type: "number" },
          ph: { type: "number" },
          ec: { type: "number" },
        },
        required: ["ph", "ec"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_registrar_aplicacao_caixa",
      description: "Regista aplicação de produto na solução da caixa d'água.",
      parameters: {
        type: "object",
        properties: {
          caixa_nome: { type: "string" },
          caixa_id: { type: "number" },
          tipo: { type: "string" },
          produto: { type: "string" },
          quantidade: { type: "string" },
        },
        required: ["tipo", "produto", "quantidade"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_criar_manutencao",
      description: "Abre registo de manutenção numa torre.",
      parameters: {
        type: "object",
        properties: {
          torre_fase: { type: "string" },
          torre_numero: { type: "number" },
          andar_numero: { type: "number" },
          tipo: { type: "string" },
          descricao: { type: "string" },
        },
        required: ["torre_fase", "torre_numero", "tipo", "descricao"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_concluir_manutencao",
      description: "Marca manutenção como concluída.",
      parameters: {
        type: "object",
        properties: { manutencao_id: { type: "number" }, solucao: { type: "string" } },
        required: ["manutencao_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_criar_germinacao",
      description: "Cria lote de germinação.",
      parameters: {
        type: "object",
        properties: {
          variedade_nome: { type: "string" },
          quantidade: { type: "number" },
          dias_para_transplantio: { type: "number" },
          observacoes: { type: "string" },
        },
        required: ["variedade_nome", "quantidade"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_atualizar_germinacao",
      description: "Atualiza contagem/status de lote de germinação.",
      parameters: {
        type: "object",
        properties: {
          lote_id: { type: "number" },
          variedade_nome: { type: "string" },
          germinadas: { type: "number" },
          nao_germinadas: { type: "number" },
          transplantadas: { type: "number" },
          status: { type: "string" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_contagem_germinacao_plano",
      description: "Regista germinadas/não germinadas no plano de plantio.",
      parameters: {
        type: "object",
        properties: {
          plano_id: { type: "number" },
          variedade_nome: { type: "string" },
          germinadas: { type: "number" },
          nao_germinadas: { type: "number" },
        },
        required: ["germinadas", "nao_germinadas"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_marcar_germinacao_pronta_plano",
      description: "Marca bandeja do plano pronta para ir a mudas.",
      parameters: {
        type: "object",
        properties: { plano_id: { type: "number" }, variedade_nome: { type: "string" } },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_adiar_tarefa",
      description: "Adia tarefa N horas.",
      parameters: {
        type: "object",
        properties: { tarefa_id: { type: "number" }, horas: { type: "number" } },
        required: ["tarefa_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_criar_tarefa",
      description: "Cria tarefa manual.",
      parameters: {
        type: "object",
        properties: {
          titulo: { type: "string" },
          descricao: { type: "string" },
          tipo: { type: "string" },
          prioridade: { type: "string" },
          torre_fase: { type: "string" },
          torre_numero: { type: "number" },
          andar_numero: { type: "number" },
        },
        required: ["titulo"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_mover_perfil",
      description: "Move um perfil entre andares da mesma fase.",
      parameters: {
        type: "object",
        properties: {
          origem_torre_fase: { type: "string" },
          origem_torre_numero: { type: "number" },
          origem_andar_numero: { type: "number" },
          destino_torre_fase: { type: "string" },
          destino_torre_numero: { type: "number" },
          destino_andar_numero: { type: "number" },
          perfil_index: { type: "number" },
          destino_perfil_index: { type: "number" },
        },
        required: [
          "origem_torre_fase",
          "origem_torre_numero",
          "origem_andar_numero",
          "destino_torre_fase",
          "destino_torre_numero",
          "destino_andar_numero",
          "perfil_index",
        ],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_mover_andar",
      description: "Move todos os perfis de um andar para outro (mesma fase).",
      parameters: {
        type: "object",
        properties: {
          origem_torre_fase: { type: "string" },
          origem_torre_numero: { type: "number" },
          origem_andar_numero: { type: "number" },
          destino_torre_fase: { type: "string" },
          destino_torre_numero: { type: "number" },
          destino_andar_numero: { type: "number" },
        },
        required: [
          "origem_torre_fase",
          "origem_torre_numero",
          "origem_andar_numero",
          "destino_torre_fase",
          "destino_torre_numero",
          "destino_andar_numero",
        ],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_atualizar_furos",
      description: "Plantar/esvaziar faixa de furos num perfil (veg/mat).",
      parameters: {
        type: "object",
        properties: {
          torre_fase: { type: "string" },
          torre_numero: { type: "number" },
          andar_numero: { type: "number" },
          perfil_index: { type: "number" },
          furo_inicio: { type: "number" },
          furo_fim: { type: "number" },
          status: { type: "string", enum: ["vazio", "plantado", "colhido"] },
          variedade_nome: { type: "string" },
        },
        required: ["torre_fase", "torre_numero", "andar_numero", "perfil_index", "status"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_esvaziar_furos_andar",
      description: "Coloca todos os furos do andar como vazios.",
      parameters: {
        type: "object",
        properties: {
          torre_fase: { type: "string" },
          torre_numero: { type: "number" },
          andar_numero: { type: "number" },
        },
        required: ["torre_fase", "torre_numero", "andar_numero"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_ativar_todos_perfis_andar",
      description: "Plantio rápido: activa todos os perfis do andar com uma variedade (mudas).",
      parameters: {
        type: "object",
        properties: {
          torre_fase: { type: "string" },
          torre_numero: { type: "number" },
          andar_numero: { type: "number" },
          variedade_nome: { type: "string" },
        },
        required: ["torre_fase", "torre_numero", "andar_numero", "variedade_nome"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_atualizar_alerta",
      description: "Módulo inteligência: marcar alerta lido, em andamento ou resolvido.",
      parameters: {
        type: "object",
        properties: {
          alerta_id: { type: "number" },
          titulo_parcial: { type: "string" },
          status: { type: "string", enum: ["lido", "em_andamento", "resolvido"] },
          observacao: { type: "string" },
        },
        required: ["status"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_bancada_plantio",
      description: "Hidroponia: define variedade e data de plantio numa bancada.",
      parameters: {
        type: "object",
        properties: {
          bancada_nome: { type: "string" },
          bancada_id: { type: "number" },
          variedade_nome: { type: "string" },
        },
        required: ["bancada_nome"],
        additionalProperties: false,
      },
    },
  },
];

export function getAssistantOperationTools(isAdmin: boolean): ChatCompletionTool[] {
  if (!isAdmin) return OPERATOR_OPERATION_TOOLS;
  return [...OPERATOR_OPERATION_TOOLS, ...ADMIN_OPERATION_TOOLS];
}

export async function runAssistantToolCall(
  ctx: AssistantPreviewCtx,
  name: string,
  argsJson: string,
  pending: PendingAssistantAction[],
): Promise<string> {
  let args: Record<string, unknown>;
  try {
    args = JSON.parse(argsJson) as Record<string, unknown>;
  } catch {
    return JSON.stringify({ ok: false, error: "JSON inválido nos argumentos da ferramenta." });
  }

  try {
    switch (name) {
      case "preparar_transplantio": {
        const r = await previewTransplantio(ctx, {
          torreOrigem: {
            fase: String(args.torre_origem_fase ?? ""),
            numeroTorre: Number(args.torre_origem_numero),
          },
          andarOrigemNumero: Number(args.andar_origem_numero),
          torreDestino: {
            fase: String(args.torre_destino_fase ?? ""),
            numeroTorre: Number(args.torre_destino_numero),
          },
          andaresDestinoNumeros: (args.andares_destino_numeros as number[]) ?? [],
          faseDestino:
            args.fase_destino === "vegetativa" || args.fase_destino === "maturacao"
              ? args.fase_destino
              : undefined,
          quantidadesPorAndar: Array.isArray(args.quantidades_por_andar)
            ? (args.quantidades_por_andar as { andar_numero: number; quantidade: number }[]).map((q) => ({
                andarNumero: q.andar_numero,
                quantidade: q.quantidade,
              }))
            : undefined,
          observacoes: typeof args.observacoes === "string" ? args.observacoes : undefined,
        });
        return pushPreview(pending, r);
      }
      case "preparar_concluir_tarefas":
        return pushPreview(
          pending,
          await previewConcluirTarefas(ctx, {
            escopo: (args.escopo as "hoje_e_atrasadas" | "hoje" | "atrasadas" | "por_titulo") ?? "hoje_e_atrasadas",
            tituloContem: typeof args.titulo_contem === "string" ? args.titulo_contem : undefined,
            tipos: Array.isArray(args.tipos) ? (args.tipos as string[]) : undefined,
            limite: typeof args.limite === "number" ? args.limite : undefined,
          }),
        );
      case "preparar_iniciar_germinacao_planos":
        return pushPreview(pending, await previewIniciarGerminacaoPlanos(ctx, args));
      case "preparar_marcar_andar_lavado":
        return pushPreview(
          pending,
          await previewMarcarAndarLavado(ctx, {
            torre: { fase: String(args.torre_fase ?? ""), numeroTorre: Number(args.torre_numero) },
            andarNumero: Number(args.andar_numero),
          }),
        );
      case "preparar_atualizar_perfis": {
        const raw = (args.perfil_indices as number[]) ?? [];
        const perfilIndices = raw.map((n) => (n >= 1 && n <= 12 ? n - 1 : n));
        return pushPreview(
          pending,
          await previewAtualizarPerfis(ctx, {
            torre: { fase: String(args.torre_fase ?? ""), numeroTorre: Number(args.torre_numero) },
            andarNumero: Number(args.andar_numero),
            perfilIndices,
            variedade: args.variedade_nome ? { nomeParcial: String(args.variedade_nome) } : undefined,
            ativo: args.ativo !== false,
          }),
        );
      }
      case "preparar_marcar_ciclo_executado":
        return pushPreview(
          pending,
          await previewMarcarCicloExecutado(ctx, {
            cicloId: typeof args.ciclo_id === "number" ? args.ciclo_id : undefined,
            nomeParcial: typeof args.nome_parcial === "string" ? args.nome_parcial : undefined,
          }),
        );
      case "preparar_liberar_andar":
        return pushPreview(pending, await previewLiberarAndar(ctx, args));
      case "preparar_registrar_colheita":
        return pushPreview(pending, await previewRegistrarColheita(ctx, args));
      case "preparar_registrar_aplicacao_andar":
        return pushPreview(pending, await previewRegistrarAplicacaoAndar(ctx, args));
      case "preparar_registrar_medicao_caixa":
        return pushPreview(pending, await previewRegistrarMedicaoCaixa(ctx, args));
      case "preparar_registrar_aplicacao_caixa":
        return pushPreview(pending, await previewRegistrarAplicacaoCaixa(ctx, args));
      case "preparar_criar_manutencao":
        return pushPreview(pending, await previewCriarManutencao(ctx, args));
      case "preparar_concluir_manutencao":
        return pushPreview(pending, await previewConcluirManutencao(ctx, args));
      case "preparar_criar_germinacao":
        return pushPreview(pending, await previewCriarGerminacao(ctx, args));
      case "preparar_atualizar_germinacao":
        return pushPreview(pending, await previewAtualizarGerminacao(ctx, args));
      case "preparar_contagem_germinacao_plano":
        return pushPreview(pending, await previewContagemGerminacaoPlano(ctx, args));
      case "preparar_marcar_germinacao_pronta_plano":
        return pushPreview(pending, await previewMarcarGerminacaoProntaPlano(ctx, args));
      case "preparar_adiar_tarefa":
        return pushPreview(pending, await previewAdiarTarefa(ctx, args));
      case "preparar_criar_tarefa":
        return pushPreview(pending, await previewCriarTarefa(ctx, args));
      case "preparar_mover_perfil":
        return pushPreview(pending, await previewMoverPerfil(ctx, args));
      case "preparar_mover_andar":
        return pushPreview(pending, await previewMoverAndar(ctx, args));
      case "preparar_atualizar_furos":
        return pushPreview(pending, await previewAtualizarFurosLote(ctx, args));
      case "preparar_esvaziar_furos_andar":
        return pushPreview(pending, await previewEsvaziarFurosAndar(ctx, args));
      case "preparar_ativar_todos_perfis_andar":
        return pushPreview(pending, await previewAtivarTodosPerfisAndar(ctx, args));
      case "preparar_atualizar_alerta":
        return pushPreview(pending, await previewAtualizarAlerta(ctx, args));
      case "preparar_bancada_plantio":
        return pushPreview(pending, await previewBancadaPlantio(ctx, args));
      case "preparar_avancar_status_plano":
        return pushPreview(pending, await previewAvancarStatusPlano(ctx, args));
      case "preparar_atualizar_plano":
        return pushPreview(pending, await previewAtualizarPlanoPlantio(ctx, args));
      case "preparar_deslocar_datas_planos":
        return pushPreview(pending, await previewDeslocarDatasPlanosVariedade(ctx, args));
      case "preparar_criar_variedade":
        return pushPreview(pending, await previewCriarVariedade(ctx, args));
      case "preparar_atualizar_variedade":
        return pushPreview(pending, await previewAtualizarVariedade(ctx, args));
      case "preparar_criar_receita":
        return pushPreview(pending, await previewCriarReceita(ctx, args));
      case "preparar_atualizar_receita":
        return pushPreview(pending, await previewAtualizarReceita(ctx, args));
      case "preparar_criar_ciclo":
        return pushPreview(pending, await previewCriarCiclo(ctx, args));
      case "preparar_atualizar_ciclo":
        return pushPreview(pending, await previewAtualizarCiclo(ctx, args));
      case "preparar_criar_torre":
        return pushPreview(pending, await previewCriarTorre(ctx, args));
      case "preparar_atualizar_torre":
        return pushPreview(pending, await previewAtualizarTorre(ctx, args));
      case "preparar_toggle_torre_ativa":
        return pushPreview(pending, await previewToggleTorreAtiva(ctx, args));
      case "preparar_criar_caixa_agua":
        return pushPreview(pending, await previewCriarCaixaAgua(ctx, args));
      case "preparar_criar_bancada":
        return pushPreview(pending, await previewCriarBancada(ctx, args));
      case "preparar_atualizar_bancada":
        return pushPreview(pending, await previewAtualizarBancada(ctx, args));
      case "preparar_upsert_fase_config":
        return pushPreview(pending, await previewUpsertFaseConfig(ctx, args));
      default:
        return JSON.stringify({ ok: false, error: `Ferramenta desconhecida: ${name}` });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return JSON.stringify({ ok: false, error: msg });
  }
}
