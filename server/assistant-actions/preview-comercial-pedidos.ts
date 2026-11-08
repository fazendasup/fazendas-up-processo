import type { PendingAssistantAction } from "@shared/assistant-actions";
import { randomUUID } from "crypto";
import {
  COMERCIAL_PEDIDOS_PROCEDURE_LABEL,
  isComercialPedidosAssistantProcedure,
  type ComercialPedidosAssistantProcedure,
} from "../comercial/assistant-pedidos-allowlist";
import { getComercialPrisma } from "../comercial/db";
import { assertAssistentePodeAlterarComercialPedidos } from "../comercial/services/assistente-relatorios";
import type { AssistantPreviewCtx } from "./preview";

async function resolveClienteId(
  clienteNome?: string,
  contaAzulCustomerId?: string,
): Promise<{ id: string; nome: string } | { error: string }> {
  const prisma = getComercialPrisma();
  if (contaAzulCustomerId?.trim()) {
    const c = await prisma.cliente.findUnique({
      where: { externalId: contaAzulCustomerId.trim() },
      select: { externalId: true, nome: true },
    });
    if (!c?.externalId) return { error: `Cliente id ${contaAzulCustomerId} não encontrado.` };
    return { id: c.externalId, nome: c.nome };
  }
  const q = clienteNome?.trim();
  if (!q) return { error: "Informe cliente_nome ou conta_azul_customer_id." };
  const matches = await prisma.cliente.findMany({
    where: { nome: { contains: q } },
    select: { externalId: true, nome: true },
    take: 8,
  });
  const withId = matches.filter((m): m is { externalId: string; nome: string } => Boolean(m.externalId));
  if (withId.length === 0) return { error: `Nenhum cliente com nome contendo “${q}”.` };
  if (withId.length > 1) {
    const exact = withId.find((m) => m.nome.trim().toLowerCase() === q.toLowerCase());
    if (exact) return { id: exact.externalId, nome: exact.nome };
    return {
      error: `Vários clientes: ${withId.map((m) => m.nome).join("; ")}. Seja mais específico.`,
    };
  }
  return { id: withId[0]!.externalId, nome: withId[0]!.nome };
}

async function resolveProdutoId(
  produtoNome?: string,
  produtoId?: string,
): Promise<{ id: string; nome: string } | { error: string }> {
  const prisma = getComercialPrisma();
  if (produtoId?.trim()) {
    const p = await prisma.produtoComercial.findUnique({
      where: { id: produtoId.trim() },
      select: { id: true, nome: true },
    });
    if (!p) return { error: `Produto id ${produtoId} não encontrado.` };
    return { id: p.id, nome: p.nome };
  }
  const q = produtoNome?.trim();
  if (!q) return { error: "Informe produto_nome ou produto_id." };
  const matches = await prisma.produtoComercial.findMany({
    where: { nome: { contains: q }, ativo: true, importadoOperacao: true },
    select: { id: true, nome: true },
    take: 8,
  });
  if (matches.length === 0) return { error: `Nenhum produto operacional com “${q}”.` };
  if (matches.length > 1) {
    const exact = matches.find((m) => m.nome.trim().toLowerCase() === q.toLowerCase());
    if (exact) return { id: exact.id, nome: exact.nome };
    return {
      error: `Vários produtos: ${matches.map((m) => m.nome).join("; ")}. Seja mais específico.`,
    };
  }
  return { id: matches[0]!.id, nome: matches[0]!.nome };
}

function pushAction(
  procedure: ComercialPedidosAssistantProcedure,
  summary: string,
  input: Record<string, unknown>,
): { action: PendingAssistantAction } {
  return {
    action: {
      id: randomUUID(),
      type: "comercial_pedidos_operacao",
      summary: `[Comercial/Pedidos] ${summary}`,
      params: { procedure, input },
    },
  };
}

/** Normaliza args da tool LLM → input da mutation tRPC. */
export async function previewComercialPedidosTool(
  ctx: AssistantPreviewCtx,
  toolName: string,
  args: Record<string, unknown>,
): Promise<{ action: PendingAssistantAction } | { error: string }> {
  if (!ctx.canWriteComercialPedidos) {
    return {
      error:
        "Sem permissão para alterar Pedidos no assistente (precisa perfil comercial adequado e vínculo).",
    };
  }
  const gate = await assertAssistentePodeAlterarComercialPedidos(ctx.user);
  if (!gate.ok) return { error: gate.error };

  switch (toolName) {
    case "preparar_salvar_regra_comercial": {
      const cli = await resolveClienteId(
        typeof args.cliente_nome === "string" ? args.cliente_nome : undefined,
        typeof args.conta_azul_customer_id === "string" ? args.conta_azul_customer_id : undefined,
      );
      if ("error" in cli) return cli;
      const input: Record<string, unknown> = {
        contaAzulCustomerId: cli.id,
        periodoEntrega: args.periodo_entrega ?? null,
        diasEntrega: args.dias_entrega ?? undefined,
        horarioMaximoEntrega: args.horario_maximo_entrega ?? null,
        cobraTaxaEntrega: Boolean(args.cobra_taxa_entrega),
        valorTaxaEntrega: args.valor_taxa_entrega ?? null,
        prazoBoletoDias: args.prazo_boleto_dias ?? null,
        descontoBoletoPercentual: args.desconto_boleto_percentual ?? null,
        acumulaPedidos: Boolean(args.acumula_pedidos),
        diasAcumulo: args.dias_acumulo ?? null,
        prazoBoletoAcumuloDias: args.prazo_boleto_acumulo_dias ?? null,
        observacoesGerais: args.observacoes ?? null,
        tipoVendaPadrao: args.tipo_venda_padrao ?? null,
        precosEspeciais: Array.isArray(args.precos_especiais) ? args.precos_especiais : [],
      };
      const dias =
        Array.isArray(args.dias_entrega) && args.dias_entrega.length
          ? ` dias=${JSON.stringify(args.dias_entrega)}`
          : "";
      return pushAction(
        "salvarRegraCliente",
        `${COMERCIAL_PEDIDOS_PROCEDURE_LABEL.salvarRegraCliente}: **${cli.nome}**${dias}`,
        input,
      );
    }
    case "preparar_salvar_pedido": {
      const cli = await resolveClienteId(
        typeof args.cliente_nome === "string" ? args.cliente_nome : undefined,
        typeof args.conta_azul_customer_id === "string" ? args.conta_azul_customer_id : undefined,
      );
      if ("error" in cli) return cli;
      const itensIn = Array.isArray(args.itens) ? args.itens : [];
      const itens: { produtoId: string; quantidade: number; observacoes?: string }[] = [];
      for (const raw of itensIn) {
        if (!raw || typeof raw !== "object") continue;
        const row = raw as Record<string, unknown>;
        const prod = await resolveProdutoId(
          typeof row.produto_nome === "string" ? row.produto_nome : undefined,
          typeof row.produto_id === "string" ? row.produto_id : undefined,
        );
        if ("error" in prod) return prod;
        const qtd = Number(row.quantidade);
        if (!Number.isFinite(qtd) || qtd <= 0) return { error: `Quantidade inválida para ${prod.nome}.` };
        itens.push({
          produtoId: prod.id,
          quantidade: qtd,
          observacoes: typeof row.observacoes === "string" ? row.observacoes : undefined,
        });
      }
      const dataEntrega = String(args.data_entrega ?? "").trim();
      if (!/^\d{4}-\d{2}-\d{2}/.test(dataEntrega)) {
        return { error: "Informe data_entrega (YYYY-MM-DD)." };
      }
      const tipoVenda = String(args.tipo_venda ?? "AVULSO");
      const input: Record<string, unknown> = {
        id: typeof args.pedido_id === "string" ? args.pedido_id : undefined,
        contaAzulCustomerId: cli.id,
        dataEntrega,
        tipoVenda,
        observacoes: typeof args.observacoes === "string" ? args.observacoes : undefined,
        freteCortesia: Boolean(args.frete_cortesia),
        itens,
        avarias: [],
      };
      return pushAction(
        "salvarPedido",
        `${args.pedido_id ? "Atualizar" : "Criar"} pedido **${cli.nome}** em ${dataEntrega.slice(0, 10)} (${itens.length} item(ns))`,
        input,
      );
    }
    case "preparar_cancelar_pedido": {
      const id = String(args.pedido_id ?? "").trim();
      if (!id) return { error: "Informe pedido_id." };
      return pushAction("cancelarPedido", `Cancelar pedido \`${id}\``, { pedidoId: id });
    }
    case "preparar_reativar_pedidos": {
      const ids = Array.isArray(args.pedido_ids)
        ? args.pedido_ids.map(String).filter(Boolean)
        : typeof args.pedido_id === "string"
          ? [args.pedido_id]
          : [];
      if (!ids.length) return { error: "Informe pedido_id ou pedido_ids." };
      return pushAction("reativarPedidosCancelados", `Reativar ${ids.length} pedido(s)`, {
        pedidoIds: ids,
      });
    }
    case "preparar_alterar_data_pedido": {
      const id = String(args.pedido_id ?? "").trim();
      const data = String(args.data_entrega ?? "").trim();
      if (!id || !data) return { error: "Informe pedido_id e data_entrega." };
      return pushAction(
        "alterarDataPedido",
        `Mover pedido \`${id}\` para ${data.slice(0, 10)}${args.mover_cliente_dia ? " (cliente/dia)" : ""}`,
        {
          pedidoId: id,
          dataEntrega: data,
          moverClienteDia: Boolean(args.mover_cliente_dia),
        },
      );
    }
    case "preparar_copiar_pedido": {
      const id = String(args.pedido_id ?? "").trim();
      const data = String(args.data_entrega ?? "").trim();
      if (!id || !data) return { error: "Informe pedido_id e data_entrega destino." };
      return pushAction("copiarPedidoParaDia", `Copiar pedido \`${id}\` → ${data.slice(0, 10)}`, {
        pedidoId: id,
        dataEntrega: data,
      });
    }
    case "preparar_status_cliente_dia": {
      const cli = await resolveClienteId(
        typeof args.cliente_nome === "string" ? args.cliente_nome : undefined,
        typeof args.conta_azul_customer_id === "string" ? args.conta_azul_customer_id : undefined,
      );
      if ("error" in cli) return cli;
      const dia = String(args.dia ?? "").trim();
      const status = String(args.status ?? "").trim();
      if (!dia || !status) return { error: "Informe dia (YYYY-MM-DD) e status." };
      return pushAction(
        "atualizarStatusClienteDia",
        `Status **${status}** — ${cli.nome} em ${dia.slice(0, 10)}`,
        { contaAzulCustomerId: cli.id, dia, status },
      );
    }
    case "preparar_prioridade_cliente_dia": {
      const cli = await resolveClienteId(
        typeof args.cliente_nome === "string" ? args.cliente_nome : undefined,
        typeof args.conta_azul_customer_id === "string" ? args.conta_azul_customer_id : undefined,
      );
      if ("error" in cli) return cli;
      const dia = String(args.dia ?? "").trim();
      if (!dia) return { error: "Informe dia (YYYY-MM-DD)." };
      return pushAction(
        "atualizarPrioridadeClienteDia",
        `Prioridade **${args.prioridade_entrega}** — ${cli.nome} em ${dia.slice(0, 10)}`,
        {
          contaAzulCustomerId: cli.id,
          dia,
          prioridadeEntrega: args.prioridade_entrega ?? null,
        },
      );
    }
    case "preparar_item_pronto": {
      const itemId = String(args.item_id ?? "").trim();
      if (!itemId) return { error: "Informe item_id." };
      return pushAction(
        "atualizarItemPronto",
        `Item \`${itemId}\` pronto=${Boolean(args.pronto)}`,
        { itemId, pronto: Boolean(args.pronto) },
      );
    }
    case "preparar_quantidade_pronta_variedade": {
      const ids = Array.isArray(args.item_ids) ? args.item_ids.map(String) : [];
      const qtd = Number(args.quantidade);
      if (!ids.length || !Number.isFinite(qtd)) {
        return { error: "Informe item_ids[] e quantidade." };
      }
      return pushAction(
        "definirQuantidadeProntaVariedade",
        `Qtd pronta ${qtd} em ${ids.length} item(ns)`,
        { itemIds: ids, quantidade: qtd },
      );
    }
    case "preparar_copiar_semana_anterior": {
      const dia = String(args.dia ?? "").trim();
      if (!dia) return { error: "Informe dia (qualquer dia da semana alvo)." };
      return pushAction("copiarSemanaAnterior", `Copiar semana anterior → semana de ${dia.slice(0, 10)}`, {
        dia,
      });
    }
    case "preparar_fechar_semana": {
      const dia = String(args.dia ?? "").trim();
      if (!dia) return { error: "Informe dia da semana." };
      return pushAction(
        "fecharSemana",
        `Fechar semana de ${dia.slice(0, 10)}${args.ignorar_conciliacao ? " (ignorar conciliação)" : ""}`,
        { dia, ignorarConciliacao: Boolean(args.ignorar_conciliacao) },
      );
    }
    case "preparar_reabrir_semana": {
      const dia = String(args.dia ?? "").trim();
      if (!dia) return { error: "Informe dia da semana." };
      return pushAction("reabrirSemana", `Reabrir semana de ${dia.slice(0, 10)}`, { dia });
    }
    case "preparar_salvar_produto": {
      const id = String(args.produto_id ?? "").trim();
      if (!id) return { error: "Informe produto_id." };
      const prisma = getComercialPrisma();
      const existente = await prisma.produtoComercial.findUnique({ where: { id } });
      if (!existente) return { error: `Produto ${id} não encontrado.` };
      const input: Record<string, unknown> = {
        id,
        nome: typeof args.nome === "string" ? args.nome : existente.nome,
        precoBase:
          args.preco_base != null ? Number(args.preco_base) : existente.precoBase != null
            ? Number(existente.precoBase)
            : null,
        ativo: args.ativo != null ? Boolean(args.ativo) : existente.ativo,
        modoCompra: args.modo_compra ?? existente.modoCompra ?? "UNIDADE",
        categoria: existente.categoria,
        fatorCompraUnidade:
          existente.fatorCompraUnidade != null ? Number(existente.fatorCompraUnidade) : null,
        rendimentoPorKg:
          existente.rendimentoPorKg != null ? Number(existente.rendimentoPorKg) : null,
        ocultoListaCompra: existente.ocultoListaCompra,
        mixAtivo: existente.mixAtivo,
        mixFolhaLeve: existente.mixFolhaLeve,
        mixProdutoReferenciaId: existente.mixProdutoReferenciaId,
        mixVariedades: existente.mixVariedades ?? null,
      };
      return pushAction("salvarProduto", `Atualizar produto **${existente.nome}**`, input);
    }
    case "preparar_excluir_produto": {
      const id = String(args.produto_id ?? "").trim();
      if (!id) return { error: "Informe produto_id." };
      return pushAction("excluirProduto", `Excluir/desativar produto \`${id}\``, { id });
    }
    case "preparar_atualizar_compra_produto": {
      const prod = await resolveProdutoId(
        typeof args.produto_nome === "string" ? args.produto_nome : undefined,
        typeof args.produto_id === "string" ? args.produto_id : undefined,
      );
      if ("error" in prod) return prod;
      return pushAction("atualizarCompraProduto", `Compra/estoque vivo — **${prod.nome}**`, {
        produtoId: prod.id,
        modoCompra: args.modo_compra,
        ...args,
      });
    }
    case "preparar_operacao_comercial_pedidos": {
      const procedure = String(args.operacao ?? args.procedure ?? "").trim();
      if (!isComercialPedidosAssistantProcedure(procedure)) {
        return {
          error: `operacao inválida. Use uma de: ${Object.keys(COMERCIAL_PEDIDOS_PROCEDURE_LABEL).join(", ")}`,
        };
      }
      const input =
        args.input && typeof args.input === "object" && !Array.isArray(args.input)
          ? (args.input as Record<string, unknown>)
          : { ...args, operacao: undefined, procedure: undefined, input: undefined };
      // Resolve cliente_nome se presente no input genérico
      if (typeof input.cliente_nome === "string" && !input.contaAzulCustomerId) {
        const cli = await resolveClienteId(input.cliente_nome as string, undefined);
        if ("error" in cli) return cli;
        input.contaAzulCustomerId = cli.id;
        delete input.cliente_nome;
      }
      return pushAction(
        procedure,
        `${COMERCIAL_PEDIDOS_PROCEDURE_LABEL[procedure]} — params prontos para confirmação`,
        input,
      );
    }
    default:
      return { error: `Ferramenta comercial desconhecida: ${toolName}` };
  }
}
