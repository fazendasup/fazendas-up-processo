import type { ChatCompletionTool } from "openai/resources/chat/completions";

/** Ferramentas só para utilizadores com role admin do projeto. Nenhuma apaga dados. */
export const ADMIN_OPERATION_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "preparar_avancar_status_plano",
      description: "Admin: avança status do plano (em_germinacao, em_producao, colhido, cancelado).",
      parameters: {
        type: "object",
        properties: {
          plano_id: { type: "number" },
          variedade_nome: { type: "string" },
          novo_status: { type: "string", enum: ["em_germinacao", "em_producao", "colhido", "cancelado"] },
        },
        required: ["novo_status"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_atualizar_plano",
      description: "Admin: actualiza campos do plano (status, observações, quantidade, germinacao_fase).",
      parameters: {
        type: "object",
        properties: {
          plano_id: { type: "number" },
          variedade_nome: { type: "string" },
          status: { type: "string" },
          observacoes: { type: "string" },
          quantidade_plantas: { type: "number" },
          germinacao_fase: { type: "string", enum: ["pendente", "germinando", "pronto_mudas"] },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_deslocar_datas_planos",
      description: "Admin: desloca datas de todos os planos activos de uma variedade.",
      parameters: {
        type: "object",
        properties: {
          variedade_nome: { type: "string" },
          variedade_id: { type: "number" },
          dias: { type: "number" },
        },
        required: ["dias"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_criar_variedade",
      description: "Admin: cria variedade no cadastro.",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string" },
          dias_mudas: { type: "number" },
          dias_vegetativa: { type: "number" },
          dias_maturacao: { type: "number" },
        },
        required: ["nome"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_atualizar_variedade",
      description: "Admin: actualiza variedade existente.",
      parameters: {
        type: "object",
        properties: {
          variedade_id: { type: "number" },
          variedade_nome: { type: "string" },
          novo_nome: { type: "string" },
          dias_mudas: { type: "number" },
          dias_vegetativa: { type: "number" },
          dias_maturacao: { type: "number" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_criar_receita",
      description: "Admin: cria receita de crescimento para uma variedade.",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string" },
          variedade_nome: { type: "string" },
          dias_mudas: { type: "number" },
          dias_vegetativa: { type: "number" },
          dias_maturacao: { type: "number" },
          densidade_por_perfil: { type: "number" },
        },
        required: ["nome", "variedade_nome"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_atualizar_receita",
      description: "Admin: actualiza receita (dias, densidade, activa).",
      parameters: {
        type: "object",
        properties: {
          receita_id: { type: "number" },
          receita_nome: { type: "string" },
          nome: { type: "string" },
          dias_mudas: { type: "number" },
          ativa: { type: "boolean" },
          densidade_por_perfil: { type: "number" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_criar_ciclo",
      description: "Admin: cria ciclo de dosagem/automação.",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string" },
          produto: { type: "string" },
          tipo: { type: "string" },
          frequencia: { type: "string" },
          dosagem: { type: "string" },
          fases_aplicaveis: { type: "array", items: { type: "string" } },
        },
        required: ["nome", "produto"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_atualizar_ciclo",
      description: "Admin: actualiza ciclo existente.",
      parameters: {
        type: "object",
        properties: {
          ciclo_id: { type: "number" },
          ciclo_nome: { type: "string" },
          nome: { type: "string" },
          produto: { type: "string" },
          ativo: { type: "boolean" },
          dosagem: { type: "string" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_criar_torre",
      description: "Admin: cria torre com andares e estrutura.",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string" },
          fase: { type: "string", enum: ["mudas", "vegetativa", "maturacao"] },
          num_andares: { type: "number" },
          numero_torre: { type: "number" },
          modelo_estrutura: { type: "string", enum: ["padrao", "fv_12x6"] },
        },
        required: ["nome", "fase"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_atualizar_torre",
      description: "Admin: actualiza torre (nome, fase, nº andares, modelo).",
      parameters: {
        type: "object",
        properties: {
          torre_id: { type: "number" },
          torre_fase: { type: "string" },
          torre_numero: { type: "number" },
          nome: { type: "string" },
          fase: { type: "string" },
          num_andares: { type: "number" },
          modelo_estrutura: { type: "string", enum: ["padrao", "fv_12x6"] },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_toggle_torre_ativa",
      description: "Admin: activa ou desactiva uma torre.",
      parameters: {
        type: "object",
        properties: {
          torre_id: { type: "number" },
          torre_fase: { type: "string" },
          torre_numero: { type: "number" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_criar_caixa_agua",
      description: "Admin: cria caixa d'água por fase.",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string" },
          fase: { type: "string", enum: ["mudas", "vegetativa", "maturacao"] },
        },
        required: ["nome", "fase"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_criar_bancada",
      description: "Admin hidroponia: cria bancada.",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string" },
          fase: { type: "string", enum: ["mudas", "vegetativa", "maturacao"] },
          quantidade_caixas: { type: "number" },
        },
        required: ["nome", "fase"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_atualizar_bancada",
      description: "Admin hidroponia: actualiza bancada.",
      parameters: {
        type: "object",
        properties: {
          bancada_id: { type: "number" },
          bancada_nome: { type: "string" },
          nome: { type: "string" },
          fase: { type: "string" },
          quantidade_caixas: { type: "number" },
          status: { type: "string", enum: ["ativa", "inativa", "manutencao"] },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_upsert_fase_config",
      description: "Admin: define limites EC/pH e cores de uma fase.",
      parameters: {
        type: "object",
        properties: {
          fase: { type: "string" },
          label: { type: "string" },
          ec_min: { type: "number" },
          ec_max: { type: "number" },
          ph_min: { type: "number" },
          ph_max: { type: "number" },
        },
        required: ["fase", "ec_min", "ec_max", "ph_min", "ph_max"],
        additionalProperties: false,
      },
    },
  },
];
