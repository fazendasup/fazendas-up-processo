import { confirmAssistantActionsInputSchema } from "@shared/assistant-actions";
import { isCommercialAccessRole, isOperationalAdminRole } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { User } from "../../drizzle/schema";
import { ENV } from "../_core/env";
import { projetoIdFromCtx, projectProcedure, router } from "../_core/trpc";
import { executeAssistantActions } from "../assistant-actions/execute";
import { runFarmAssistantChat } from "../chat-assistant";
import { classificarStatusPedido } from "../comercial/lib/pedido-status";
import { getComercialPrisma } from "../comercial/db";
import { resolveComercialUsuario } from "../comercial/resolve-usuario";
import { buildCompactFazendaSnapshotMarkdown } from "../chat-context";
import * as db from "../db";
import { projetarEstoque } from "../../shared/estoque";

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(16_000),
});

function inicioMesAtualLocal(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function fimDiaAtualLocal(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function diasAtrasLocal(dias: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  d.setHours(0, 0, 0, 0);
  return d;
}

function diasFrenteLocal(dias: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  d.setHours(23, 59, 59, 999);
  return d;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function num(v: unknown): number {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function addCount(map: Record<string, number>, key: string | null | undefined): void {
  const k = key?.trim() || "(sem valor)";
  map[k] = (map[k] ?? 0) + 1;
}

function topEntries(map: Map<string, number>, take: number) {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, take)
    .map(([nome, valor]) => ({ nome, valor: round2(valor) }));
}

function resumoTexto(texto: string | null | undefined, max = 180): string | null {
  if (!texto) return null;
  const clean = texto.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

async function buildEstoqueAssistantResumo(pid: number, enabled: boolean) {
  if (!enabled) return null;
  const rows = await db.getAllEstoqueItens(pid);
  return rows.map((row) => {
    const quantidadeTotal =
      row.unidadeTipo === "g" || row.unidadeTipo === "ml" ? row.quantidadeTotal / 1000 : row.quantidadeTotal;
    const usoPorEvento = row.unidadeTipo === "g" || row.unidadeTipo === "ml" ? row.usoPorEvento / 1000 : row.usoPorEvento;
    const nivelMinimo =
      row.nivelMinimo != null && (row.unidadeTipo === "g" || row.unidadeTipo === "ml")
        ? row.nivelMinimo / 1000
        : row.nivelMinimo;
    const unidadeTipo = row.unidadeTipo === "g" ? "kg" : row.unidadeTipo === "ml" ? "l" : row.unidadeTipo;
    const p = projetarEstoque({
      quantidadeTotal,
      usoPorEvento,
      frequenciaDias: row.frequenciaDias,
      prazoEntregaDias: row.prazoEntregaDias,
      diasMargemCompra: row.diasMargemCompra,
      nivelMinimo,
    });
    return {
      nome: row.nome,
      categoria: row.categoria,
      quantidadeTotal,
      unidadeTipo,
      status: p.status,
      diasAteEsgotar: p.diasAteEsgotar,
      fornecedor: row.fornecedor,
    };
  });
}

async function buildComercialAssistantResumo(enabled: boolean, user: User) {
  if (!enabled) return null;
  try {
    if (!isCommercialAccessRole(user.role)) {
      return {
        disponivel: false as const,
        motivo: "usuário sem papel global comercial/admin para expor dados comerciais ao assistente",
      };
    }

    const comercialUsuario = await resolveComercialUsuario(user);
    if (!comercialUsuario) {
      return {
        disponivel: false as const,
        motivo: "nenhum usuário comercial ativo vinculado ao usuário logado",
      };
    }

    if (comercialUsuario.perfil === "PROMOTER" || comercialUsuario.perfil === "VENDEDOR") {
      return {
        disponivel: false as const,
        motivo:
          "perfil PROMOTER tem acesso comercial restrito a Pedidos e Acompanhamento de avarias; insights gerenciais exigem perfil COMERCIAL, GERENTE_COMERCIAL ou ADMIN",
      };
    }

    const prisma = getComercialPrisma();
    const inicio = inicioMesAtualLocal();
    const fim = fimDiaAtualLocal();
    const inicio90 = diasAtrasLocal(90);
    const inicio30 = diasAtrasLocal(30);
    const fim14 = diasFrenteLocal(14);

    const [
      clientes,
      pedidosMes,
      pedidosAnalise,
      oportunidades,
      mensagens,
      execucoes,
      produtos,
      regrasComerciais,
      pedidosOperacionais,
      interacoes,
      kpiSnapshots,
      ultimaSync,
    ] = await Promise.all([
      prisma.cliente.findMany({
        select: {
          id: true,
          nome: true,
          tipo: true,
          statusRelacionamento: true,
          scoreComercial: true,
          tags: true,
          telefoneWhatsapp: true,
          emailPrincipal: true,
          dataUltimaAtualizacao: true,
        },
      }),
      prisma.pedido.findMany({
        where: { dataPedido: { gte: inicio, lte: fim } },
        select: {
          id: true,
          clienteId: true,
          dataPedido: true,
          statusPedido: true,
          valorBruto: true,
          valorFrete: true,
          valorDesconto: true,
          valorLiquido: true,
          valorTotal: true,
          composicaoDetalhada: true,
          cliente: { select: { nome: true, tipo: true, statusRelacionamento: true } },
          itens: { select: { produto: true, categoria: true, quantidade: true, precoUnit: true, custoUnit: true } },
        },
      }),
      prisma.pedido.findMany({
        where: { dataPedido: { gte: inicio90, lte: fim } },
        orderBy: { dataPedido: "desc" },
        take: 1200,
        select: {
          id: true,
          clienteId: true,
          dataPedido: true,
          statusPedido: true,
          valorBruto: true,
          valorFrete: true,
          valorDesconto: true,
          valorLiquido: true,
          valorTotal: true,
          composicaoDetalhada: true,
          origemPedido: true,
          cliente: { select: { nome: true, tipo: true, statusRelacionamento: true, scoreComercial: true } },
          itens: { select: { produto: true, categoria: true, quantidade: true, precoUnit: true, custoUnit: true } },
        },
      }),
      prisma.oportunidade.findMany({
        orderBy: [{ statusOportunidade: "asc" }, { prioridade: "asc" }, { dataCriacao: "desc" }],
        take: 120,
        include: {
          cliente: { select: { nome: true, tipo: true, statusRelacionamento: true, scoreComercial: true } },
          responsavel: { select: { nome: true, perfil: true } },
        },
      }),
      prisma.mensagem.findMany({
        orderBy: { dataCriacao: "desc" },
        take: 120,
        include: { cliente: { select: { nome: true, tipo: true, telefoneWhatsapp: true } }, aprovador: { select: { nome: true } } },
      }),
      prisma.execucaoApi.findMany({
        orderBy: { dataExecucao: "desc" },
        take: 80,
        include: { cliente: { select: { nome: true } } },
      }),
      prisma.produtoComercial.findMany({
        orderBy: [{ ativo: "desc" }, { nome: "asc" }],
        take: 240,
        include: { _count: { select: { itensPedido: true, avariasPedido: true } } },
      }),
      prisma.regraComercialCliente.findMany({
        orderBy: { atualizadoEm: "desc" },
        take: 80,
        include: {
          cliente: { select: { nome: true, tipo: true, statusRelacionamento: true } },
          precosEspeciais: { include: { produto: { select: { nome: true, categoria: true } } }, take: 12 },
        },
      }),
      prisma.pedidoOperacional.findMany({
        where: { dataEntrega: { gte: inicio30, lte: fim14 } },
        orderBy: { dataEntrega: "desc" },
        take: 160,
        include: {
          cliente: { select: { nome: true, tipo: true, statusRelacionamento: true } },
          itens: { select: { produtoNome: true, categoria: true, quantidade: true, precoUnit: true } },
          avarias: { select: { produtoNome: true, categoria: true, quantidade: true, observacoes: true } },
        },
      }),
      prisma.interacao.findMany({
        orderBy: { dataInteracao: "desc" },
        take: 100,
        include: { cliente: { select: { nome: true, tipo: true, statusRelacionamento: true } } },
      }),
      prisma.kpiSnapshot.findMany({
        orderBy: { dataReferencia: "desc" },
        take: 60,
      }),
      prisma.execucaoApi.findFirst({ where: { acaoApi: "SYNC_CA" }, orderBy: { dataExecucao: "desc" } }),
    ]);

    const clientesPorTipo: Record<string, number> = {};
    const clientesPorStatus: Record<string, number> = {};
    for (const c of clientes) {
      addCount(clientesPorTipo, c.tipo);
      addCount(clientesPorStatus, c.statusRelacionamento);
    }

    const pedidosMesPorStatus: Record<string, number> = {};
    let vendasMesLiquido = 0;
    let vendasMesBruto = 0;
    let vendasMesFrete = 0;
    let vendasMesDesconto = 0;
    for (const p of pedidosMes) {
      addCount(pedidosMesPorStatus, p.statusPedido);
      if (classificarStatusPedido(p.statusPedido) !== "venda") continue;
      const bruto = Number(p.valorBruto ?? p.valorTotal ?? 0);
      const frete = Number(p.valorFrete ?? 0);
      const desconto = Number(p.valorDesconto ?? 0);
      const liquido = Number(p.valorLiquido ?? p.valorTotal ?? Math.max(0, bruto + frete - desconto));
      vendasMesBruto += bruto;
      vendasMesFrete += frete;
      vendasMesDesconto += desconto;
      vendasMesLiquido += liquido;
    }

    const receitaPorCliente = new Map<string, { nome: string; tipo: string; status: string; receita: number; pedidos: number; ultima: Date | null }>();
    const receitaPorProduto = new Map<string, number>();
    const quantidadePorProduto = new Map<string, number>();
    const receitaPorCategoria = new Map<string, number>();
    const margemPorProduto = new Map<string, { receita: number; custo: number; quantidadeComCusto: number }>();
    const serieMensal = new Map<string, { vendas: number; pedidos: number; clientes: Set<string> }>();
    const vendasPorStatus90: Record<string, number> = {};
    let vendas90Liquido = 0;
    let vendas90Bruto = 0;
    let vendas90Custo = 0;
    let vendas90Itens = 0;
    let pedidosVenda90 = 0;
    let pedidosOrcamento90 = 0;

    for (const p of pedidosAnalise) {
      addCount(vendasPorStatus90, p.statusPedido);
      const liquido = num(p.valorLiquido ?? p.valorTotal);
      const bruto = num(p.valorBruto ?? p.valorTotal);
      const venda = classificarStatusPedido(p.statusPedido) === "venda";
      const orcamento = classificarStatusPedido(p.statusPedido) === "orcamento";
      if (orcamento) pedidosOrcamento90 += 1;
      if (!venda) continue;
      pedidosVenda90 += 1;
      vendas90Liquido += liquido;
      vendas90Bruto += bruto;
      const clienteKey = p.clienteId;
      const cliente = receitaPorCliente.get(clienteKey) ?? {
        nome: p.cliente.nome,
        tipo: p.cliente.tipo,
        status: p.cliente.statusRelacionamento,
        receita: 0,
        pedidos: 0,
        ultima: null,
      };
      cliente.receita += liquido;
      cliente.pedidos += 1;
      cliente.ultima = !cliente.ultima || p.dataPedido > cliente.ultima ? p.dataPedido : cliente.ultima;
      receitaPorCliente.set(clienteKey, cliente);

      const mes = p.dataPedido.toISOString().slice(0, 7);
      const serie = serieMensal.get(mes) ?? { vendas: 0, pedidos: 0, clientes: new Set<string>() };
      serie.vendas += liquido;
      serie.pedidos += 1;
      serie.clientes.add(clienteKey);
      serieMensal.set(mes, serie);

      for (const item of p.itens) {
        const quantidade = num(item.quantidade);
        const receita = quantidade * num(item.precoUnit);
        const custo = item.custoUnit == null ? null : quantidade * num(item.custoUnit);
        vendas90Itens += quantidade;
        receitaPorProduto.set(item.produto, (receitaPorProduto.get(item.produto) ?? 0) + receita);
        quantidadePorProduto.set(item.produto, (quantidadePorProduto.get(item.produto) ?? 0) + quantidade);
        receitaPorCategoria.set(item.categoria ?? "(sem categoria)", (receitaPorCategoria.get(item.categoria ?? "(sem categoria)") ?? 0) + receita);
        if (custo != null) {
          vendas90Custo += custo;
          const margem = margemPorProduto.get(item.produto) ?? { receita: 0, custo: 0, quantidadeComCusto: 0 };
          margem.receita += receita;
          margem.custo += custo;
          margem.quantidadeComCusto += quantidade;
          margemPorProduto.set(item.produto, margem);
        }
      }
    }

    const oportunidadesPorStatus: Record<string, number> = {};
    const oportunidadesPorPrioridade: Record<string, number> = {};
    const oportunidadesPorTipo: Record<string, number> = {};
    let potencialAberto = 0;
    for (const o of oportunidades) {
      addCount(oportunidadesPorStatus, o.statusOportunidade);
      addCount(oportunidadesPorPrioridade, o.prioridade);
      addCount(oportunidadesPorTipo, o.tipoOportunidade);
      if (o.statusOportunidade === "ABERTA" || o.statusOportunidade === "EM_CONTATO") {
        potencialAberto += num(o.valorEstimado);
      }
    }

    const mensagensPorStatus: Record<string, number> = {};
    const mensagensPorTipo: Record<string, number> = {};
    for (const m of mensagens) {
      addCount(mensagensPorStatus, m.statusEnvio);
      addCount(mensagensPorTipo, m.tipoMensagem);
    }

    const execucoesPorStatus: Record<string, number> = {};
    const execucoesPorAcao: Record<string, number> = {};
    for (const e of execucoes) {
      addCount(execucoesPorStatus, e.statusExecucao);
      addCount(execucoesPorAcao, e.acaoApi);
    }

    const pedidosOperacionaisPorStatus: Record<string, number> = {};
    const avariasPorProduto = new Map<string, number>();
    for (const p of pedidosOperacionais) {
      addCount(pedidosOperacionaisPorStatus, p.status);
      for (const avaria of p.avarias) {
        avariasPorProduto.set(avaria.produtoNome, (avariasPorProduto.get(avaria.produtoNome) ?? 0) + num(avaria.quantidade));
      }
    }

    const topClientes = Array.from(receitaPorCliente.entries())
      .sort((a, b) => b[1].receita - a[1].receita)
      .slice(0, 20)
      .map(([clienteId, c]) => ({
        clienteId,
        nome: c.nome,
        tipo: c.tipo,
        status: c.status,
        receita: round2(c.receita),
        pedidos: c.pedidos,
        ticketMedio: c.pedidos > 0 ? round2(c.receita / c.pedidos) : 0,
        ultimaCompra: c.ultima?.toISOString().slice(0, 10) ?? null,
      }));

    const clientesRisco = clientes
      .map(c => {
        const venda = receitaPorCliente.get(c.id);
        const diasSemCompra = venda?.ultima ? Math.floor((fim.getTime() - venda.ultima.getTime()) / 86_400_000) : null;
        return {
          id: c.id,
          nome: c.nome,
          tipo: c.tipo,
          status: c.statusRelacionamento,
          score: c.scoreComercial == null ? null : num(c.scoreComercial),
          receita90d: round2(venda?.receita ?? 0),
          pedidos90d: venda?.pedidos ?? 0,
          diasSemCompra,
        };
      })
      .filter(c => c.status === "EM_RISCO" || c.status === "INATIVO" || c.diasSemCompra == null || c.diasSemCompra > 45)
      .sort((a, b) => (b.receita90d - a.receita90d) || ((b.diasSemCompra ?? 999) - (a.diasSemCompra ?? 999)))
      .slice(0, 25);

    const margemProdutos = Array.from(margemPorProduto.entries())
      .map(([produto, m]) => ({
        produto,
        receita: round2(m.receita),
        custo: round2(m.custo),
        margem: round2(m.receita - m.custo),
        margemPct: m.receita > 0 ? round2(((m.receita - m.custo) / m.receita) * 100) : null,
        quantidadeComCusto: round2(m.quantidadeComCusto),
      }))
      .sort((a, b) => b.margem - a.margem)
      .slice(0, 20);

    const produtosResumo = produtos.map(p => ({
      id: p.id,
      nome: p.nome,
      categoria: p.categoria,
      ativo: p.ativo,
      precoBase: p.precoBase == null ? null : num(p.precoBase),
      modoCompra: p.modoCompra,
      fatorCompraUnidade: p.fatorCompraUnidade == null ? null : num(p.fatorCompraUnidade),
      rendimentoPorKg: p.rendimentoPorKg == null ? null : num(p.rendimentoPorKg),
      mixAtivo: p.mixAtivo,
      mixFolhaLeve: p.mixFolhaLeve,
      usoPedidos: p._count.itensPedido,
      avarias: p._count.avariasPedido,
    }));

    const insights = [
      `Receita líquida 90d: R$ ${round2(vendas90Liquido)} em ${pedidosVenda90} venda(s), com ${receitaPorCliente.size} cliente(s) comprando.`,
      `Top cliente 90d: ${topClientes[0]?.nome ?? "sem vendas"}${topClientes[0] ? ` (R$ ${topClientes[0].receita})` : ""}.`,
      `Produto líder 90d: ${topEntries(receitaPorProduto, 1)[0]?.nome ?? "sem vendas"}.`,
      `Clientes em risco/inativos ou sem compra recente no recorte: ${clientesRisco.length}.`,
      `Potencial de oportunidades abertas/em contato: R$ ${round2(potencialAberto)}.`,
    ];

    return {
      disponivel: true as const,
      perfilComercial: comercialUsuario.perfil,
      escopo: "contexto comercial ampliado de leitura para insights",
      periodoAnalise: { inicio: ymd(inicio90), fim: ymd(fim), janelaDias: 90 },
      clientesTotal: clientes.length,
      clientesPorTipo,
      clientesPorStatus,
      pedidosMes: pedidosMes.length,
      vendasMesLiquido: round2(vendasMesLiquido),
      vendasMesBruto: round2(vendasMesBruto),
      vendasMesFrete: round2(vendasMesFrete),
      vendasMesDesconto: round2(vendasMesDesconto),
      pedidosMesPorStatus,
      oportunidadesAbertas: oportunidades.filter(o => o.statusOportunidade === "ABERTA" || o.statusOportunidade === "EM_CONTATO").length,
      mensagensPendentes: mensagens.filter(m => m.statusEnvio === "AGUARDANDO_APROVACAO").length,
      ultimaSyncContaAzul: ultimaSync?.dataExecucao?.toISOString() ?? null,
      statusUltimaSyncContaAzul: ultimaSync?.statusExecucao ?? null,
      insights,
      paginas: {
        Dashboard: {
          kpis90d: {
            vendasLiquidas: round2(vendas90Liquido),
            vendasBrutas: round2(vendas90Bruto),
            custoComCustoInformado: round2(vendas90Custo),
            margemComCustoInformado: round2(vendas90Bruto - vendas90Custo),
            pedidosVenda: pedidosVenda90,
            pedidosOrcamento: pedidosOrcamento90,
            clientesComprando: receitaPorCliente.size,
            itensVendidos: round2(vendas90Itens),
          },
          serieMensal: Array.from(serieMensal.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([mes, v]) => ({ mes, vendas: round2(v.vendas), pedidos: v.pedidos, clientes: v.clientes.size })),
          pedidosPorStatus90d: vendasPorStatus90,
          oportunidadesPorStatus,
          oportunidadesPorPrioridade,
          mensagensPorStatus,
          execucoesPorStatus,
        },
        Relatorios: {
          topClientesReceita90d: topClientes,
          topProdutosReceita90d: topEntries(receitaPorProduto, 25),
          topProdutosQuantidade90d: topEntries(quantidadePorProduto, 25),
          receitaPorCategoria90d: topEntries(receitaPorCategoria, 20),
          margemProdutosComCusto: margemProdutos,
          clientesEmRisco: clientesRisco,
        },
        Clientes: {
          totais: { total: clientes.length, porTipo: clientesPorTipo, porStatus: clientesPorStatus },
          topCarteira90d: topClientes.slice(0, 15),
          clientesSemCompraOuRisco: clientesRisco.slice(0, 15),
          amostraClientesAtualizados: clientes
            .sort((a, b) => b.dataUltimaAtualizacao.getTime() - a.dataUltimaAtualizacao.getTime())
            .slice(0, 20)
            .map(c => ({
              id: c.id,
              nome: c.nome,
              tipo: c.tipo,
              status: c.statusRelacionamento,
              score: c.scoreComercial == null ? null : num(c.scoreComercial),
              tags: c.tags,
              email: c.emailPrincipal,
              whatsapp: c.telefoneWhatsapp,
            })),
        },
        Oportunidades: {
          potencialAberto: round2(potencialAberto),
          porStatus: oportunidadesPorStatus,
          porPrioridade: oportunidadesPorPrioridade,
          porTipo: oportunidadesPorTipo,
          listaPrioritaria: oportunidades
            .filter(o => o.statusOportunidade === "ABERTA" || o.statusOportunidade === "EM_CONTATO")
            .sort((a, b) => num(b.valorEstimado) * (num(b.probabilidadeConversao) / 100) - num(a.valorEstimado) * (num(a.probabilidadeConversao) / 100))
            .slice(0, 30)
            .map(o => ({
              id: o.id,
              cliente: o.cliente.nome,
              tipo: o.tipoOportunidade,
              status: o.statusOportunidade,
              prioridade: o.prioridade,
              valorEstimado: round2(num(o.valorEstimado)),
              probabilidade: round2(num(o.probabilidadeConversao)),
              potencialPonderado: round2(num(o.valorEstimado) * (num(o.probabilidadeConversao) / 100)),
              responsavel: o.responsavel?.nome ?? null,
              descricao: resumoTexto(o.descricao),
            })),
        },
        Pedidos: {
          operacionaisJanela: `${ymd(inicio30)} a ${ymd(fim14)}`,
          porStatus: pedidosOperacionaisPorStatus,
          avariasPorProduto: topEntries(avariasPorProduto, 20),
          proximosERecentes: pedidosOperacionais.slice(0, 40).map(p => ({
            id: p.id,
            cliente: p.cliente?.nome ?? p.contaAzulCustomerId,
            dataEntrega: p.dataEntrega.toISOString().slice(0, 10),
            tipoVenda: p.tipoVenda,
            status: p.status,
            itens: p.itens.map(i => ({ produto: i.produtoNome, categoria: i.categoria, quantidade: num(i.quantidade), precoUnit: i.precoUnit == null ? null : num(i.precoUnit) })),
            avarias: p.avarias.map(a => ({ produto: a.produtoNome, quantidade: num(a.quantidade), observacoes: resumoTexto(a.observacoes, 80) })),
          })),
          produtos: produtosResumo,
          regrasComerciais: regrasComerciais.slice(0, 40).map(r => ({
            cliente: r.cliente?.nome ?? r.contaAzulCustomerId,
            periodoEntrega: r.periodoEntrega,
            horarioMaximoEntrega: r.horarioMaximoEntrega,
            cobraTaxaEntrega: r.cobraTaxaEntrega,
            prazoBoletoDias: r.prazoBoletoDias,
            acumulaPedidos: r.acumulaPedidos,
            observacoes: resumoTexto(r.observacoesGerais),
            precosEspeciais: r.precosEspeciais.map(p => ({ produto: p.produto.nome, categoria: p.produto.categoria, preco: num(p.preco) })),
          })),
        },
        Mensagens: {
          porStatus: mensagensPorStatus,
          porTipo: mensagensPorTipo,
          pendentesERascunhos: mensagens
            .filter(m => m.statusEnvio === "AGUARDANDO_APROVACAO" || m.statusEnvio === "RASCUNHO")
            .slice(0, 40)
            .map(m => ({
              id: m.id,
              cliente: m.cliente.nome,
              tipo: m.tipoMensagem,
              status: m.statusEnvio,
              canal: m.canalEnvio,
              criadaEm: m.dataCriacao.toISOString().slice(0, 16),
              agendadaPara: m.agendadoPara?.toISOString().slice(0, 16) ?? null,
              texto: resumoTexto(m.conteudoFinal ?? m.conteudoSugerido),
            })),
        },
        Execucoes: {
          porStatus: execucoesPorStatus,
          porAcao: execucoesPorAcao,
          ultimas: execucoes.slice(0, 40).map(e => ({
            id: e.id,
            acao: e.acaoApi,
            status: e.statusExecucao,
            data: e.dataExecucao.toISOString().slice(0, 16),
            cliente: e.cliente?.nome ?? null,
            duracaoMs: e.duracaoMs,
            erro: resumoTexto(e.mensagemErro, 160),
          })),
        },
        Configuracoes: {
          produtos: produtosResumo,
          regrasComerciais: regrasComerciais.length,
          kpiSnapshotsRecentes: kpiSnapshots.map(k => ({
            nome: k.nomeKpi,
            periodo: k.periodo,
            valor: num(k.valor),
            dataReferencia: k.dataReferencia.toISOString().slice(0, 10),
          })),
          integracaoContaAzul: {
            ultimaSync: ultimaSync?.dataExecucao?.toISOString() ?? null,
            status: ultimaSync?.statusExecucao ?? null,
          },
        },
        Interacoes: {
          recentes: interacoes.slice(0, 40).map(i => ({
            cliente: i.cliente.nome,
            tipo: i.tipoInteracao,
            data: i.dataInteracao.toISOString().slice(0, 16),
            sentimento: i.sentimento == null ? null : num(i.sentimento),
            oportunidadeDetectada: i.oportunidadeDetectada,
            riscoDetectado: i.riscoDetectado,
            resumo: resumoTexto(i.resumo ?? i.conteudoBruto),
          })),
        },
      },
    };
  } catch (err) {
    return {
      disponivel: false as const,
      motivo: err instanceof Error ? err.message : String(err),
    };
  }
}

export const chatRouter = router({
  /** Indica se o servidor tem chave OpenAI (sem expor segredos). */
  assistantStatus: projectProcedure.query(() => ({
    configured: Boolean(ENV.openAiApiKey?.trim()),
  })),

  sendMessage: projectProcedure
    .input(
      z.object({
        messages: z.array(chatMessageSchema).min(1).max(40),
        useWebSearch: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ENV.openAiApiKey) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Assistente não configurado: defina OPENAI_API_KEY no ambiente do servidor.",
        });
      }

      const pid = projetoIdFromCtx(ctx);
      const projeto = await db.getProjetoRow(pid);
      const [data, bancadas, estoqueItens, comercial] = await Promise.all([
        db.loadFullFazendaData(pid),
        db.getAllBancadas(pid),
        buildEstoqueAssistantResumo(pid, Boolean(ctx.projetoModulos?.estoque)),
        buildComercialAssistantResumo(Boolean(ctx.projetoModulos?.comercial), ctx.user),
      ]);

      const resumoOperacionalMarkdown = buildCompactFazendaSnapshotMarkdown(data, {
        projetoId: pid,
        projetoNome: projeto?.nome ?? `Projeto ${pid}`,
        bancadas,
        estoqueItens,
        comercial,
      });

      const messages = input.messages.map((m) => ({
        role: m.role,
        content: m.content.trim(),
      }));

      try {
        const result = await runFarmAssistantChat({
          resumoOperacionalMarkdown,
          messages,
          useWebSearch: Boolean(input.useWebSearch),
          operationCtx: {
            projetoId: pid,
            projetoTipo: projeto?.tipo ?? null,
            isAdmin: isOperationalAdminRole(ctx.user.role),
          },
        });
        return {
          reply: result.reply,
          modelUsed: result.modelUsed,
          webSearchUsed: result.webSearchUsed,
          pendingActions: result.pendingActions,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/OPENAI_API_KEY/i.test(msg)) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: msg,
          });
        }
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: msg.length > 200 ? `${msg.slice(0, 200)}…` : msg,
        });
      }
    }),

  /** Executa ações preparadas pelo assistente (após confirmação do usuário). */
  confirmActions: projectProcedure
    .input(confirmAssistantActionsInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Não autenticado" });
      }
      const pid = projetoIdFromCtx(ctx);
      const projeto = await db.getProjetoRow(pid);
      const { results } = await executeAssistantActions(
        {
          projetoId: pid,
          projetoTipo: projeto?.tipo ?? null,
          projetoModulos: ctx.projetoModulos,
          isAdmin: isOperationalAdminRole(ctx.user.role),
          userId: ctx.user.id,
          userName: ctx.user.name || "Usuário",
        },
        input.actions,
      );
      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0 && failed.length === results.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: failed.map((f) => f.message).join(" | "),
        });
      }
      return { results };
    }),
});
