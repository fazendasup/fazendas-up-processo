import type { ChatCompletionTool } from "openai/resources/chat/completions";
import { COMERCIAL_PEDIDOS_ASSISTANT_PROCEDURES } from "../comercial/assistant-pedidos-allowlist";

/** Ferramentas de escrita da página Comercial → Pedidos (todas as abas). */
export const COMERCIAL_PEDIDOS_OPERATION_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "preparar_salvar_regra_comercial",
      description:
        "Pedidos → Regras comerciais: cria/atualiza regra do cliente (dias de entrega, período, taxa, boleto, acúmulo, preços especiais). Confirmação obrigatória.",
      parameters: {
        type: "object",
        properties: {
          cliente_nome: { type: "string" },
          conta_azul_customer_id: { type: "string" },
          periodo_entrega: { type: "string", enum: ["MANHA", "TARDE"] },
          dias_entrega: {
            type: "array",
            items: { type: "number" },
            description: "0=Dom … 6=Sáb",
          },
          horario_maximo_entrega: { type: "string" },
          cobra_taxa_entrega: { type: "boolean" },
          valor_taxa_entrega: { type: "number" },
          prazo_boleto_dias: { type: "number" },
          desconto_boleto_percentual: { type: "number" },
          acumula_pedidos: { type: "boolean" },
          dias_acumulo: { type: "number" },
          prazo_boleto_acumulo_dias: { type: "number" },
          tipo_venda_padrao: {
            type: "string",
            enum: ["RECORRENTE_SEMANAL", "RECORRENTE_QUINZENAL", "PLANO", "AVULSO"],
          },
          observacoes: { type: "string" },
          precos_especiais: {
            type: "array",
            items: {
              type: "object",
              properties: {
                produtoId: { type: "string" },
                preco: { type: "number" },
              },
            },
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_salvar_pedido",
      description:
        "Pedidos → Agenda/Operacional: cria ou edita pedido operacional (itens por produto). Confirmação obrigatória.",
      parameters: {
        type: "object",
        properties: {
          pedido_id: { type: "string", description: "Se omitido, cria novo" },
          cliente_nome: { type: "string" },
          conta_azul_customer_id: { type: "string" },
          data_entrega: { type: "string", description: "YYYY-MM-DD" },
          tipo_venda: {
            type: "string",
            enum: ["RECORRENTE_SEMANAL", "RECORRENTE_QUINZENAL", "PLANO", "AVULSO"],
          },
          observacoes: { type: "string" },
          frete_cortesia: { type: "boolean" },
          itens: {
            type: "array",
            items: {
              type: "object",
              properties: {
                produto_nome: { type: "string" },
                produto_id: { type: "string" },
                quantidade: { type: "number" },
                observacoes: { type: "string" },
              },
            },
          },
        },
        required: ["data_entrega", "itens"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_cancelar_pedido",
      description: "Cancela pedido operacional.",
      parameters: {
        type: "object",
        properties: { pedido_id: { type: "string" } },
        required: ["pedido_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_reativar_pedidos",
      description: "Reativa pedidos cancelados (→ PENDENTE).",
      parameters: {
        type: "object",
        properties: {
          pedido_id: { type: "string" },
          pedido_ids: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_alterar_data_pedido",
      description: "Altera data de entrega do pedido (opcionalmente todo o cliente/dia).",
      parameters: {
        type: "object",
        properties: {
          pedido_id: { type: "string" },
          data_entrega: { type: "string" },
          mover_cliente_dia: { type: "boolean" },
        },
        required: ["pedido_id", "data_entrega"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_copiar_pedido",
      description: "Copia pedido para outro dia.",
      parameters: {
        type: "object",
        properties: {
          pedido_id: { type: "string" },
          data_entrega: { type: "string" },
        },
        required: ["pedido_id", "data_entrega"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_status_cliente_dia",
      description: "Atualiza status de todos os pedidos do cliente no dia (PENDENTE/PRONTO/ENTREGUE/CANCELADO).",
      parameters: {
        type: "object",
        properties: {
          cliente_nome: { type: "string" },
          conta_azul_customer_id: { type: "string" },
          dia: { type: "string" },
          status: { type: "string", enum: ["PENDENTE", "PRONTO", "ENTREGUE", "CANCELADO"] },
        },
        required: ["dia", "status"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_prioridade_cliente_dia",
      description: "Atualiza prioridade de entrega do cliente no dia.",
      parameters: {
        type: "object",
        properties: {
          cliente_nome: { type: "string" },
          conta_azul_customer_id: { type: "string" },
          dia: { type: "string" },
          prioridade_entrega: { type: "number" },
        },
        required: ["dia"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_item_pronto",
      description: "Marca item do pedido como pronto ou não.",
      parameters: {
        type: "object",
        properties: {
          item_id: { type: "string" },
          pronto: { type: "boolean" },
        },
        required: ["item_id", "pronto"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_quantidade_pronta_variedade",
      description: "Define quantidade pronta distribuída nos itens da variedade.",
      parameters: {
        type: "object",
        properties: {
          item_ids: { type: "array", items: { type: "string" } },
          quantidade: { type: "number" },
        },
        required: ["item_ids", "quantidade"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_copiar_semana_anterior",
      description: "Copia pedidos da semana anterior para a semana do dia informado.",
      parameters: {
        type: "object",
        properties: { dia: { type: "string" } },
        required: ["dia"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_fechar_semana",
      description: "Fecha a semana operacional (cuidado: exige pedidos em ordem / conciliação).",
      parameters: {
        type: "object",
        properties: {
          dia: { type: "string" },
          ignorar_conciliacao: { type: "boolean" },
        },
        required: ["dia"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_reabrir_semana",
      description: "Reabre semana fechada.",
      parameters: {
        type: "object",
        properties: { dia: { type: "string" } },
        required: ["dia"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_salvar_produto",
      description: "Pedidos → Produtos: atualiza produto operacional.",
      parameters: {
        type: "object",
        properties: {
          produto_id: { type: "string" },
          preco_base: { type: "number" },
          modo_compra: { type: "string", enum: ["UNIDADE", "KG"] },
          ativo: { type: "boolean" },
          nome: { type: "string" },
        },
        required: ["produto_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_excluir_produto",
      description: "Pedidos → Produtos: exclui ou desativa produto (se já usado em pedidos).",
      parameters: {
        type: "object",
        properties: { produto_id: { type: "string" } },
        required: ["produto_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_atualizar_compra_produto",
      description: "Pedidos → Estoque vivo / compras: atualiza modo de compra e campos de compra do produto.",
      parameters: {
        type: "object",
        properties: {
          produto_nome: { type: "string" },
          produto_id: { type: "string" },
          modo_compra: { type: "string", enum: ["UNIDADE", "KG"] },
        },
        additionalProperties: true,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_operacao_comercial_pedidos",
      description:
        "Escape hatch: qualquer mutation de comercial.pedidos da allowlist (conciliação Conta Azul, envio CA, importar catálogo, mix folha, etc.). Use quando não houver tool específica. Passe operacao=nomeCamelCase da mutation e input no formato da API.",
      parameters: {
        type: "object",
        properties: {
          operacao: {
            type: "string",
            enum: [...COMERCIAL_PEDIDOS_ASSISTANT_PROCEDURES],
          },
          input: { type: "object" },
          cliente_nome: { type: "string" },
        },
        required: ["operacao"],
        additionalProperties: true,
      },
    },
  },
];

export const COMERCIAL_PEDIDOS_TOOL_NAMES = new Set(
  COMERCIAL_PEDIDOS_OPERATION_TOOLS.map((t) =>
    t.type === "function" ? t.function.name : "",
  ).filter(Boolean),
);
