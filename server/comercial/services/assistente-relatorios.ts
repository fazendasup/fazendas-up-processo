/**
 * Consulta de relatórios comerciais para o assistente IA (somente leitura).
 * Alinhado à agregação de Relatórios (Conta Azul + America/Sao_Paulo).
 */
import type { User } from "../../../drizzle/schema";
import { isCommercialAccessRole } from "@shared/const";
import {
  diaIsoAmericaSp,
  fimDiaAmericaSp,
  inicioDiaAmericaSp,
  mesIsoAmericaSp,
} from "@shared/comercial/periodo-america-sp";
import { OrigemPedido } from "../generated/prisma/index.js";
import { classificarStatusPedido } from "../lib/pedido-status.js";
import { getComercialPrisma } from "../db";
import { resolveComercialUsuario } from "../resolve-usuario";
import { curvaAbc, n, round2 } from "./relatorios-calculos.js";

export type AssistenteRelatorioFoco =
  | "produtos"
  | "clientes"
  | "abc"
  | "cmv"
  | "mensal"
  | "completo";

function ultimoDiaDoMesIso(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const ultimo = new Date(y, m, 0).getDate();
  return `${ym}-${String(ultimo).padStart(2, "0")}`;
}

/** Aceita YYYY-MM ou YYYY-MM-DD. */
export function parsePeriodoAssistente(
  inicioRaw: string,
  fimRaw: string
): { inicio: Date; fim: Date; inicioIso: string; fimIso: string } | { error: string } {
  const ini = inicioRaw.trim();
  const fim = fimRaw.trim();
  const reDia = /^\d{4}-\d{2}-\d{2}$/;
  const reMes = /^\d{4}-\d{2}$/;

  let inicioIso: string;
  let fimIso: string;

  if (reMes.test(ini)) inicioIso = `${ini}-01`;
  else if (reDia.test(ini)) inicioIso = ini;
  else return { error: `Início inválido "${inicioRaw}". Use YYYY-MM ou YYYY-MM-DD.` };

  if (reMes.test(fim)) fimIso = ultimoDiaDoMesIso(fim);
  else if (reDia.test(fim)) fimIso = fim;
  else return { error: `Fim inválido "${fimRaw}". Use YYYY-MM ou YYYY-MM-DD.` };

  if (inicioIso > fimIso) {
    return { error: "Data início deve ser anterior ou igual à data fim." };
  }

  return {
    inicio: inicioDiaAmericaSp(inicioIso),
    fim: fimDiaAmericaSp(fimIso),
    inicioIso,
    fimIso,
  };
}

export async function assertAssistentePodeConsultarComercial(
  user: User | null | undefined
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!user) return { ok: false, error: "Usuário não autenticado." };
  if (!isCommercialAccessRole(user.role)) {
    return {
      ok: false,
      error:
        "Sem papel comercial/admin para consultar relatórios comerciais no assistente.",
    };
  }
  const comercialUsuario = await resolveComercialUsuario(user);
  if (!comercialUsuario) {
    return {
      ok: false,
      error: "Nenhum usuário comercial ativo vinculado ao usuário logado.",
    };
  }
  if (
    comercialUsuario.perfil === "PROMOTER" ||
    comercialUsuario.perfil === "VENDEDOR" ||
    comercialUsuario.perfil === "LIDER_COLHEITA"
  ) {
    return {
      ok: false,
      error:
        "Perfil restrito: insights gerenciais de relatórios exigem COMERCIAL, GERENTE_COMERCIAL ou ADMIN.",
    };
  }
  return { ok: true };
}

type ProdutoAgg = {
  produto: string;
  categoria: string | null;
  quantidade: number;
  valorBruto: number;
  vendas: number;
  custoTotal: number;
  custoQtd: number;
};

type ClienteAgg = {
  clienteId: string;
  cliente: string;
  quantidadeItens: number;
  valorBruto: number;
  valorLiquido: number;
  vendas: number;
};

/**
 * Agrega vendas Conta Azul no período (mesma base dos Relatórios).
 */
export async function consultarRelatorioComercialAssistente(input: {
  inicio: Date;
  fim: Date;
  foco?: AssistenteRelatorioFoco;
  limite?: number;
}) {
  const prisma = getComercialPrisma();
  const foco: AssistenteRelatorioFoco = input.foco ?? "produtos";
  const limite = Math.min(Math.max(input.limite ?? 80, 10), 200);

  const pedidos = await prisma.pedido.findMany({
    where: {
      origemPedido: OrigemPedido.CONTA_AZUL,
      dataPedido: { gte: input.inicio, lte: input.fim },
    },
    select: {
      id: true,
      clienteId: true,
      dataPedido: true,
      statusPedido: true,
      valorBruto: true,
      valorLiquido: true,
      valorTotal: true,
      cliente: { select: { nome: true } },
      itens: {
        select: {
          produto: true,
          categoria: true,
          quantidade: true,
          precoUnit: true,
          custoUnit: true,
        },
      },
    },
    orderBy: { dataPedido: "asc" },
    take: 8_000,
  });

  const vendas = pedidos.filter(
    p => classificarStatusPedido(p.statusPedido) === "venda"
  );

  const porProduto = new Map<string, ProdutoAgg>();
  const porProdutoMes = new Map<
    string,
    { mes: string; produto: string; quantidade: number; valorBruto: number }
  >();
  const porCliente = new Map<string, ClienteAgg>();
  const porMes = new Map<
    string,
    { mes: string; vendas: number; quantidade: number; valorBruto: number }
  >();

  let pedidosVenda = 0;
  let quantidadeTotal = 0;
  let valorBrutoTotal = 0;

  for (const p of vendas) {
    pedidosVenda += 1;
    const mes = mesIsoAmericaSp(p.dataPedido);
    const liquido = n(p.valorLiquido ?? p.valorTotal ?? p.valorBruto);
    const cliente = porCliente.get(p.clienteId) ?? {
      clienteId: p.clienteId,
      cliente: p.cliente.nome,
      quantidadeItens: 0,
      valorBruto: 0,
      valorLiquido: 0,
      vendas: 0,
    };
    cliente.vendas += 1;
    cliente.valorLiquido += liquido;
    porCliente.set(p.clienteId, cliente);

    const mesRow = porMes.get(mes) ?? {
      mes,
      vendas: 0,
      quantidade: 0,
      valorBruto: 0,
    };
    mesRow.vendas += 1;
    porMes.set(mes, mesRow);

    for (const item of p.itens) {
      const quantidade = n(item.quantidade);
      const valorBruto = quantidade * n(item.precoUnit);
      const custo =
        item.custoUnit == null ? null : quantidade * n(item.custoUnit);

      quantidadeTotal += quantidade;
      valorBrutoTotal += valorBruto;
      mesRow.quantidade += quantidade;
      mesRow.valorBruto += valorBruto;

      cliente.quantidadeItens += quantidade;
      cliente.valorBruto += valorBruto;

      const prod = porProduto.get(item.produto) ?? {
        produto: item.produto,
        categoria: item.categoria,
        quantidade: 0,
        valorBruto: 0,
        vendas: 0,
        custoTotal: 0,
        custoQtd: 0,
      };
      prod.quantidade += quantidade;
      prod.valorBruto += valorBruto;
      prod.vendas += 1;
      if (custo != null) {
        prod.custoTotal += custo;
        prod.custoQtd += quantidade;
      }
      porProduto.set(item.produto, prod);

      const pmKey = `${mes}|${item.produto}`;
      const pm = porProdutoMes.get(pmKey) ?? {
        mes,
        produto: item.produto,
        quantidade: 0,
        valorBruto: 0,
      };
      pm.quantidade += quantidade;
      pm.valorBruto += valorBruto;
      porProdutoMes.set(pmKey, pm);
    }
  }

  const produtos = Array.from(porProduto.values())
    .map(r => ({
      produto: r.produto,
      categoria: r.categoria,
      quantidade: round2(r.quantidade),
      valorBruto: round2(r.valorBruto),
      precoMedio:
        r.quantidade > 0 ? round2(r.valorBruto / r.quantidade) : 0,
      vendas: r.vendas,
      custoTotal: r.custoQtd > 0 ? round2(r.custoTotal) : null,
      margem:
        r.custoQtd > 0 ? round2(r.valorBruto - r.custoTotal) : null,
    }))
    .sort((a, b) => b.valorBruto - a.valorBruto);

  const topNomes = new Set(produtos.slice(0, limite).map(p => p.produto));
  const produtosPorMes = Array.from(porProdutoMes.values())
    .filter(r => topNomes.has(r.produto))
    .map(r => ({
      mes: r.mes,
      produto: r.produto,
      quantidade: round2(r.quantidade),
      valorBruto: round2(r.valorBruto),
    }))
    .sort(
      (a, b) =>
        a.mes.localeCompare(b.mes) || b.valorBruto - a.valorBruto
    );

  const meses = Array.from(porMes.values())
    .map(m => ({
      mes: m.mes,
      vendas: m.vendas,
      quantidade: round2(m.quantidade),
      valorBruto: round2(m.valorBruto),
    }))
    .sort((a, b) => a.mes.localeCompare(b.mes));

  const clientes = Array.from(porCliente.values())
    .map(c => ({
      cliente: c.cliente,
      vendas: c.vendas,
      quantidadeItens: round2(c.quantidadeItens),
      valorBruto: round2(c.valorBruto),
      valorLiquido: round2(c.valorLiquido),
    }))
    .sort((a, b) => b.valorLiquido - a.valorLiquido)
    .slice(0, limite);

  const cmv = produtos.slice(0, limite).map(p => ({
    produto: p.produto,
    categoria: p.categoria,
    quantidade: p.quantidade,
    valorBruto: p.valorBruto,
    custoTotal: p.custoTotal,
    margem: p.margem,
  }));

  const abcProdutos = curvaAbc(
    produtos.map(p => ({
      id: p.produto,
      nome: p.produto,
      valor: p.valorBruto,
      quantidade: p.quantidade,
    }))
  ).slice(0, limite);

  const mesesDistintos = meses.map(m => m.mes);
  const mediaMensalProdutos = produtos.slice(0, limite).map(p => {
    const linhas = produtosPorMes.filter(r => r.produto === p.produto);
    const nMeses = Math.max(mesesDistintos.length, 1);
    const qtdMedia = round2(
      linhas.reduce((s, r) => s + r.quantidade, 0) / nMeses
    );
    const valorMedio = round2(
      linhas.reduce((s, r) => s + r.valorBruto, 0) / nMeses
    );
    return {
      produto: p.produto,
      quantidadeMediaMensal: qtdMedia,
      valorMedioMensal: valorMedio,
      mesesComVenda: linhas.length,
      porMes: linhas,
    };
  });

  const periodo = {
    inicio: diaIsoAmericaSp(input.inicio),
    fim: diaIsoAmericaSp(input.fim),
    fuso: "America/Sao_Paulo",
    origem: "CONTA_AZUL",
  };

  const totais = {
    pedidosVenda,
    produtosDistintos: porProduto.size,
    clientesDistintos: porCliente.size,
    quantidade: round2(quantidadeTotal),
    valorBruto: round2(valorBrutoTotal),
  };

  const comoProjetar = {
    metodoSugerido:
      "Para projeção dos próximos N meses: use quantidadeMediaMensal e valorMedioMensal de cada item (média dos meses do período consultado) e multiplique por N. Deixe explícito que é média simples do histórico pedido.",
    exemplo:
      "Período jul+ago → média mensal por item → ×3 = projeção volume e valor para os próximos 3 meses.",
  };

  const base = { periodo, totais, comoProjetar, foco };

  if (foco === "produtos") {
    return {
      ...base,
      produtos: produtos.slice(0, limite),
      produtosPorMes,
      mediaMensalProdutos,
      vendasPorMes: meses,
    };
  }
  if (foco === "clientes") {
    return { ...base, clientes, vendasPorMes: meses };
  }
  if (foco === "abc") {
    return {
      ...base,
      abcProdutos,
      produtos: produtos.slice(0, Math.min(limite, 40)),
    };
  }
  if (foco === "cmv") {
    return { ...base, cmv, vendasPorMes: meses };
  }
  if (foco === "mensal") {
    return { ...base, vendasPorMes: meses, mediaMensalProdutos };
  }
  return {
    ...base,
    produtos: produtos.slice(0, limite),
    produtosPorMes,
    mediaMensalProdutos,
    clientes: clientes.slice(0, Math.min(limite, 40)),
    abcProdutos: abcProdutos.slice(0, 40),
    cmv: cmv.slice(0, 40),
    vendasPorMes: meses,
  };
}

/** Série mensal compacta para o snapshot do chat (últimos N meses). */
export async function buildProdutosSerieMensalSnapshot(mesesAtras = 8, top = 35) {
  const fim = fimDiaAmericaSp(diaIsoAmericaSp());
  const inicioRef = new Date();
  inicioRef.setMonth(inicioRef.getMonth() - (mesesAtras - 1));
  inicioRef.setDate(1);
  const inicioYm = mesIsoAmericaSp(inicioRef);
  const inicio = inicioDiaAmericaSp(`${inicioYm}-01`);

  const data = await consultarRelatorioComercialAssistente({
    inicio,
    fim,
    foco: "completo",
    limite: top,
  });

  return {
    periodo: data.periodo,
    totais: data.totais,
    vendasPorMes: data.vendasPorMes,
    /**
     * Média mensal de quantidade e valor por produto no intervalo.
     * Para projeção: multiplique quantidadeMediaMensal / valorMedioMensal pelo nº de meses futuros.
     * Para detalhe mês a mês ou período customizado, use a ferramenta consultar_relatorio_comercial.
     */
    mediaMensalProdutos: (data.mediaMensalProdutos ?? []).map(p => ({
      produto: p.produto,
      quantidadeMediaMensal: p.quantidadeMediaMensal,
      valorMedioMensal: p.valorMedioMensal,
      mesesComVenda: p.mesesComVenda,
    })),
    /** Série mês×produto (top por valor) — quantidade e valorBruto. */
    produtosPorMes: data.produtosPorMes,
    topProdutos: data.produtos,
    abcProdutos: (data.abcProdutos ?? []).map(r => ({
      nome: r.nome,
      classe: r.classe,
      quantidade: r.quantidade ?? null,
      valor: r.valor,
      participacao: r.participacao,
      acumulado: r.acumulado,
    })),
    comoProjetar: data.comoProjetar,
  };
}
