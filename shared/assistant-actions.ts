import { z } from "zod";

/** Ações do assistente — nunca exclusão de registros/histórico. */
export const assistantActionTypeSchema = z.enum([
  "transplantar_distribuido",
  "concluir_tarefas",
  "marcar_andar_lavado",
  "atualizar_perfis",
  "marcar_ciclo_executado",
  "liberar_andar",
  "registrar_colheita",
  "registrar_aplicacao_andar",
  "registrar_medicao_caixa",
  "registrar_aplicacao_caixa",
  "criar_manutencao",
  "concluir_manutencao",
  "criar_germinacao",
  "atualizar_germinacao",
  "contagem_germinacao_plano",
  "marcar_germinacao_pronta_plano",
  "adiar_tarefa",
  "criar_tarefa",
  "mover_perfil",
  "mover_andar",
  "atualizar_furos_lote",
  "esvaziar_furos_andar",
  "ativar_todos_perfis_andar",
  "atualizar_alerta_inteligencia",
  "bancada_atualizar_plantio",
  /** Avança planos `planejado` → `em_germinacao` (mesmo botão "Iniciar germinação" do painel Plantio). */
  "iniciar_germinacao_planos",
  // Admin (sem exclusão de dados)
  "avancar_status_plano",
  "atualizar_plano_plantio",
  "deslocar_datas_planos_variedade",
  "criar_variedade",
  "atualizar_variedade",
  "criar_receita",
  "atualizar_receita",
  "criar_ciclo",
  "atualizar_ciclo",
  "criar_torre",
  "atualizar_torre",
  "toggle_torre_ativa",
  "criar_caixa_agua",
  "criar_bancada",
  "atualizar_bancada",
  "upsert_fase_config",
]);

export type AssistantActionType = z.infer<typeof assistantActionTypeSchema>;

export const transplantarDistribuidoParamsSchema = z.object({
  andarOrigemId: z.number().int().positive(),
  destinos: z
    .array(z.object({ andarDestinoId: z.number().int().positive(), quantidade: z.number().int().min(1) }))
    .min(1),
  observacoes: z.string().max(2000).optional(),
  faseDestino: z.enum(["vegetativa", "maturacao"]).optional(),
  perfilIndicesOrigem: z.array(z.number().int().min(0)).min(1).optional(),
});

export const concluirTarefasParamsSchema = z.object({
  tarefaIds: z.array(z.number().int().positive()).min(1),
});

export const marcarAndarLavadoParamsSchema = z.object({
  andarId: z.number().int().positive(),
});

export const atualizarPerfisParamsSchema = z.object({
  andarId: z.number().int().positive(),
  updates: z
    .array(
      z.object({
        perfilIndex: z.number().int().min(0),
        variedadeId: z.number().int().positive().nullable().optional(),
        ativo: z.boolean().optional(),
        dataEntrada: z.coerce.date().nullable().optional(),
        cultivoStatus: z.enum(["vazio", "plantado", "colhido"]).nullable().optional(),
      }),
    )
    .min(1),
});

export const marcarCicloExecutadoParamsSchema = z.object({
  cicloId: z.number().int().positive(),
  ultimaExecucao: z.coerce.date().optional(),
});

export const liberarAndarParamsSchema = z.object({
  andarId: z.number().int().positive(),
});

export const registrarColheitaParamsSchema = z.object({
  torreId: z.number().int().positive(),
  andarId: z.number().int().positive(),
  variedadeId: z.number().int().positive().nullable().optional(),
  variedadeNome: z.string().nullable().optional(),
  dataColheita: z.coerce.date(),
  quantidadePlantas: z.number().int().min(1),
  pesoTotalGramas: z.number().nullable().optional(),
  qualidade: z.string().optional(),
  destino: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
});

export const registrarAplicacaoAndarParamsSchema = z.object({
  andarId: z.number().int().positive(),
  tipo: z.string().min(1),
  produto: z.string().min(1),
  quantidade: z.string().min(1),
  dataHora: z.coerce.date(),
});

export const registrarMedicaoCaixaParamsSchema = z.object({
  caixaAguaId: z.number().int().positive(),
  ec: z.number(),
  ph: z.number(),
  dataHora: z.coerce.date(),
});

export const registrarAplicacaoCaixaParamsSchema = z.object({
  caixaAguaId: z.number().int().positive(),
  tipo: z.string().min(1),
  produto: z.string().min(1),
  quantidade: z.string().min(1),
  dataHora: z.coerce.date(),
});

export const criarManutencaoParamsSchema = z.object({
  torreId: z.number().int().positive(),
  andarNumero: z.number().int().optional(),
  tipo: z.string().min(1),
  descricao: z.string().min(1),
  dataAbertura: z.coerce.date(),
  prazo: z.coerce.date().optional(),
  lampadaIndex: z.number().int().optional(),
});

export const concluirManutencaoParamsSchema = z.object({
  id: z.number().int().positive(),
  solucao: z.string().nullable().optional(),
});

export const criarGerminacaoParamsSchema = z.object({
  variedadeId: z.number().int().positive(),
  variedadeNome: z.string().min(1),
  quantidade: z.number().int().min(1),
  dataPlantio: z.coerce.date(),
  dataHora: z.coerce.date(),
  diasParaTransplantio: z.number().int().min(0).default(1),
  observacoes: z.string().optional(),
});

export const atualizarGerminacaoParamsSchema = z.object({
  id: z.number().int().positive(),
  germinadas: z.number().int().min(0).optional(),
  naoGerminadas: z.number().int().min(0).optional(),
  transplantadas: z.number().int().min(0).optional(),
  status: z.string().optional(),
  observacoes: z.string().nullable().optional(),
});

export const contagemGerminacaoPlanoParamsSchema = z.object({
  id: z.number().int().positive(),
  germinadas: z.number().int().min(0),
  naoGerminadas: z.number().int().min(0),
});

export const marcarGerminacaoProntaPlanoParamsSchema = z.object({
  id: z.number().int().positive(),
});

export const adiarTarefaParamsSchema = z.object({
  tarefaId: z.number().int().positive(),
  horas: z.number().int().min(1).max(24 * 30),
});

export const criarTarefaParamsSchema = z.object({
  titulo: z.string().min(1),
  descricao: z.string().nullable().optional(),
  tipo: z.string().optional(),
  prioridade: z.string().optional(),
  dataVencimento: z.coerce.date(),
  torreId: z.number().nullable().optional(),
  andarNumero: z.number().nullable().optional(),
});

export const moverPerfilParamsSchema = z.object({
  origemAndarId: z.number().int().positive(),
  perfilIndex: z.number().int().min(0),
  destinoAndarId: z.number().int().positive(),
  destinoPerfilIndex: z.number().int().min(0),
});

export const moverAndarParamsSchema = z.object({
  origemAndarId: z.number().int().positive(),
  destinoAndarId: z.number().int().positive(),
});

export const atualizarFurosLoteParamsSchema = z.object({
  andarId: z.number().int().positive(),
  updates: z
    .array(
      z.object({
        perfilIndex: z.number().int().min(0),
        furoIndex: z.number().int().min(0),
        status: z.string().optional(),
        variedadeId: z.number().int().positive().nullable().optional(),
      }),
    )
    .min(1),
});

export const esvaziarFurosAndarParamsSchema = z.object({
  andarId: z.number().int().positive(),
});

export const ativarTodosPerfisAndarParamsSchema = z.object({
  andarId: z.number().int().positive(),
  variedadeId: z.number().int().positive(),
  dataEntrada: z.coerce.date().optional(),
});

export const atualizarAlertaInteligenciaParamsSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(["lido", "em_andamento", "resolvido"]),
  observacao: z.string().optional(),
});

export const bancadaAtualizarPlantioParamsSchema = z.object({
  bancadaId: z.number().int().positive(),
  plantioVariedadeId: z.number().int().positive().nullable(),
  plantioDataEntrada: z.coerce.date().nullable(),
  plantioPrevisaoColheita: z.coerce.date().nullable(),
});

export const iniciarGerminacaoPlanosParamsSchema = z.object({
  planoIds: z.array(z.number().int().positive()).min(1).max(25),
});

export const avancarStatusPlanoParamsSchema = z.object({
  id: z.number().int().positive(),
  novoStatus: z.enum(["em_germinacao", "em_producao", "colhido", "cancelado"]),
});

export const atualizarPlanoPlantioParamsSchema = z.object({
  id: z.number().int().positive(),
  status: z.string().optional(),
  quantidadePlantas: z.number().int().positive().optional(),
  observacoes: z.string().nullable().optional(),
  germinacaoFase: z.enum(["pendente", "germinando", "pronto_mudas"]).optional(),
});

export const deslocarDatasPlanosVariedadeParamsSchema = z.object({
  variedadeId: z.number().int().positive(),
  dias: z.number().int().min(-365).max(365),
});

export const criarVariedadeParamsSchema = z.object({
  nome: z.string().min(1),
  diasMudas: z.number().int().positive().optional(),
  diasVegetativa: z.number().int().positive().optional(),
  diasMaturacao: z.number().int().positive().optional(),
});

export const atualizarVariedadeParamsSchema = z.object({
  id: z.number().int().positive(),
  nome: z.string().min(1).optional(),
  diasMudas: z.number().int().positive().optional(),
  diasVegetativa: z.number().int().positive().optional(),
  diasMaturacao: z.number().int().positive().optional(),
});

export const criarReceitaParamsSchema = z.object({
  nome: z.string().min(1),
  variedadeId: z.number().int().positive(),
  diasMudas: z.number().int().positive().optional(),
  diasVegetativa: z.number().int().positive().optional(),
  diasMaturacao: z.number().int().positive().optional(),
  densidadePorPerfil: z.number().int().positive().nullable().optional(),
});

export const atualizarReceitaParamsSchema = z.object({
  id: z.number().int().positive(),
  nome: z.string().min(1).optional(),
  diasMudas: z.number().int().positive().optional(),
  diasVegetativa: z.number().int().positive().optional(),
  diasMaturacao: z.number().int().positive().optional(),
  densidadePorPerfil: z.number().int().positive().nullable().optional(),
  ativa: z.boolean().optional(),
});

export const criarCicloParamsSchema = z.object({
  nome: z.string().min(1),
  produto: z.string().min(1),
  tipo: z.string().min(1),
  frequencia: z.string().min(1),
  fasesAplicaveis: z.array(z.string()).min(1),
  dosagem: z.string().optional(),
  alvo: z.string().optional(),
  ativo: z.boolean().optional(),
});

export const atualizarCicloParamsSchema = z.object({
  id: z.number().int().positive(),
  nome: z.string().optional(),
  produto: z.string().optional(),
  tipo: z.string().optional(),
  frequencia: z.string().optional(),
  dosagem: z.string().nullable().optional(),
  fasesAplicaveis: z.array(z.string()).optional(),
  alvo: z.string().optional(),
  ativo: z.boolean().optional(),
});

export const criarTorreParamsSchema = z.object({
  nome: z.string().min(1),
  fase: z.enum(["mudas", "vegetativa", "maturacao"]),
  numAndares: z.number().int().min(1).max(99).optional(),
  numeroTorre: z.number().int().min(1).optional(),
  modeloEstrutura: z.enum(["padrao", "fv_12x6"]).optional(),
  caixaAguaId: z.number().int().positive().optional(),
});

export const atualizarTorreParamsSchema = z.object({
  id: z.number().int().positive(),
  nome: z.string().min(1).optional(),
  fase: z.enum(["mudas", "vegetativa", "maturacao"]).optional(),
  numAndares: z.number().int().min(1).max(99).optional(),
  numeroTorre: z.number().int().min(1).optional(),
  modeloEstrutura: z.enum(["padrao", "fv_12x6"]).optional(),
  caixaAguaId: z.number().int().positive().optional(),
});

export const toggleTorreAtivaParamsSchema = z.object({
  id: z.number().int().positive(),
});

export const criarCaixaAguaParamsSchema = z.object({
  nome: z.string().min(1),
  fase: z.enum(["mudas", "vegetativa", "maturacao"]),
  slug: z.string().optional(),
});

export const criarBancadaParamsSchema = z.object({
  nome: z.string().min(1),
  fase: z.enum(["mudas", "vegetativa", "maturacao"]),
  quantidadeCaixas: z.number().int().min(1).optional(),
});

export const atualizarBancadaParamsSchema = z.object({
  id: z.number().int().positive(),
  nome: z.string().min(1).optional(),
  fase: z.enum(["mudas", "vegetativa", "maturacao"]).optional(),
  quantidadeCaixas: z.number().int().min(1).optional(),
  status: z.enum(["ativa", "inativa", "manutencao"]).optional(),
});

export const upsertFaseConfigParamsSchema = z.object({
  fase: z.string().min(1),
  label: z.string().min(1),
  ecMin: z.number(),
  ecMax: z.number(),
  phMin: z.number(),
  phMax: z.number(),
  cor: z.string(),
  corLight: z.string(),
  icon: z.string(),
});

const paramsByType = {
  transplantar_distribuido: transplantarDistribuidoParamsSchema,
  concluir_tarefas: concluirTarefasParamsSchema,
  marcar_andar_lavado: marcarAndarLavadoParamsSchema,
  atualizar_perfis: atualizarPerfisParamsSchema,
  marcar_ciclo_executado: marcarCicloExecutadoParamsSchema,
  liberar_andar: liberarAndarParamsSchema,
  registrar_colheita: registrarColheitaParamsSchema,
  registrar_aplicacao_andar: registrarAplicacaoAndarParamsSchema,
  registrar_medicao_caixa: registrarMedicaoCaixaParamsSchema,
  registrar_aplicacao_caixa: registrarAplicacaoCaixaParamsSchema,
  criar_manutencao: criarManutencaoParamsSchema,
  concluir_manutencao: concluirManutencaoParamsSchema,
  criar_germinacao: criarGerminacaoParamsSchema,
  atualizar_germinacao: atualizarGerminacaoParamsSchema,
  contagem_germinacao_plano: contagemGerminacaoPlanoParamsSchema,
  marcar_germinacao_pronta_plano: marcarGerminacaoProntaPlanoParamsSchema,
  adiar_tarefa: adiarTarefaParamsSchema,
  criar_tarefa: criarTarefaParamsSchema,
  mover_perfil: moverPerfilParamsSchema,
  mover_andar: moverAndarParamsSchema,
  atualizar_furos_lote: atualizarFurosLoteParamsSchema,
  esvaziar_furos_andar: esvaziarFurosAndarParamsSchema,
  ativar_todos_perfis_andar: ativarTodosPerfisAndarParamsSchema,
  atualizar_alerta_inteligencia: atualizarAlertaInteligenciaParamsSchema,
  bancada_atualizar_plantio: bancadaAtualizarPlantioParamsSchema,
  iniciar_germinacao_planos: iniciarGerminacaoPlanosParamsSchema,
  avancar_status_plano: avancarStatusPlanoParamsSchema,
  atualizar_plano_plantio: atualizarPlanoPlantioParamsSchema,
  deslocar_datas_planos_variedade: deslocarDatasPlanosVariedadeParamsSchema,
  criar_variedade: criarVariedadeParamsSchema,
  atualizar_variedade: atualizarVariedadeParamsSchema,
  criar_receita: criarReceitaParamsSchema,
  atualizar_receita: atualizarReceitaParamsSchema,
  criar_ciclo: criarCicloParamsSchema,
  atualizar_ciclo: atualizarCicloParamsSchema,
  criar_torre: criarTorreParamsSchema,
  atualizar_torre: atualizarTorreParamsSchema,
  toggle_torre_ativa: toggleTorreAtivaParamsSchema,
  criar_caixa_agua: criarCaixaAguaParamsSchema,
  criar_bancada: criarBancadaParamsSchema,
  atualizar_bancada: atualizarBancadaParamsSchema,
  upsert_fase_config: upsertFaseConfigParamsSchema,
} as const;

export const pendingAssistantActionSchema = z.object({
  id: z.string().uuid(),
  type: assistantActionTypeSchema,
  summary: z.string().min(1).max(6000),
  params: z.record(z.string(), z.unknown()),
});

export type PendingAssistantAction = z.infer<typeof pendingAssistantActionSchema>;

export function parseAssistantActionParams<T extends AssistantActionType>(
  type: T,
  params: unknown,
): z.infer<(typeof paramsByType)[T]> {
  return paramsByType[type].parse(params) as z.infer<(typeof paramsByType)[T]>;
}

export const confirmAssistantActionsInputSchema = z.object({
  actions: z.array(pendingAssistantActionSchema).min(1).max(25),
});
