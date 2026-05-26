import {
  OrigemPedido,
  Prisma,
  PrioridadeOportunidade,
  type PrismaClient,
  StatusRelacionamento,
  TipoOportunidade,
} from "../generated/prisma/index.js";
import type { Cliente } from "../generated/prisma/index.js";
import {
  calcularScoreComercialBase,
  extrairSinaisDePedidos,
  inferirStatusRelacionamento,
  sugerirTags,
  type SinaisVenda,
} from "./classificacao-cliente";

/** Oportunidades geradas automaticamente — removidas/recriadas a cada inteligência. */
export const OPORTUNIDADE_SISTEMA_PREFIX = "[sistema] ";

type OportunidadeGerada = {
  tipo: TipoOportunidade;
  texto: string;
  valorEstimado: number;
  probabilidade: number;
};

type AnaliseCarteira = {
  ticketP50: number;
  ticketP75: number;
  valorP75: number;
  categoriasMaisVendidas: Array<{
    nome: string;
    valorMedioCliente: number;
    clientes: number;
  }>;
  produtosMaisVendidos: Array<{
    nome: string;
    categoria: string | null;
    valorMedioCliente: number;
    clientes: number;
  }>;
};

function nomeCurto(nome: string): string {
  const p = nome.trim().split(/\s+/)[0];
  return p && p.length <= 40 ? p : nome.slice(0, 36);
}

function clampProb(n: number): number {
  return Math.max(18, Math.min(92, Math.round(n)));
}

/** Probabilidade contínua a partir dos sinais + tipo, evitando 52/58/70 repetidos em massa. */
function probabilidadeDerivada(
  sinais: SinaisVenda,
  tipo: TipoOportunidade,
  emRisco: boolean
): number {
  const dias = sinais.diasSemCompra ?? 90;
  const tm = sinais.ticketMedio;
  const freq = sinais.frequenciaPorSemana;
  const vol = sinais.valorTotalPeriodo;

  let p =
    36 +
    Math.min(22, tm / 45) +
    Math.min(18, freq * 9) +
    Math.min(12, Math.log10(Math.max(200, vol)) * 4);

  if (tipo === "REATIVACAO") {
    p += emRisco ? 10 : 4;
    p -= Math.min(14, dias * 0.08);
  } else if (tipo === "UPSELL") {
    p += 12;
  } else if (tipo === "CROSS_SELL") {
    p += 6;
  } else {
    p += 2;
  }

  return clampProb(p);
}

function fmtBrl(n: number): string {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function pct(n: number | null): string {
  if (n == null) return "sem tendência";
  return `${n >= 0 ? "+" : ""}${Math.round(n * 100)}%`;
}

function quantile(values: number[], q: number): number {
  const arr = values.filter(v => Number.isFinite(v)).sort((a, b) => a - b);
  if (!arr.length) return 0;
  return (
    arr[
      Math.min(arr.length - 1, Math.max(0, Math.floor((arr.length - 1) * q)))
    ] ?? 0
  );
}

function oportunidadeScore(op: OportunidadeGerada): number {
  const valor = op.valorEstimado;
  const tipoPeso =
    op.tipo === "REATIVACAO"
      ? 1.18
      : op.tipo === "UPSELL"
        ? 1.1
        : op.tipo === "CROSS_SELL"
          ? 1
          : 0.9;
  return valor * (op.probabilidade / 100) * tipoPeso;
}

function arredondarPotencial(valor: number): number {
  if (!Number.isFinite(valor) || valor <= 0) return 0;
  if (valor < 500) return Math.round(valor / 25) * 25;
  if (valor < 2500) return Math.round(valor / 50) * 50;
  return Math.round(valor / 100) * 100;
}

function listarNomes(items: string[], max = 3): string {
  const visiveis = items.filter(Boolean).slice(0, max);
  if (visiveis.length === 0) return "sem item identificado";
  if (visiveis.length === 1) return visiveis[0]!;
  return `${visiveis.slice(0, -1).join(", ")} e ${visiveis[visiveis.length - 1]}`;
}

function prioridadeAnalitica(
  op: OportunidadeGerada,
  sinais: SinaisVenda,
  status: StatusRelacionamento
): PrioridadeOportunidade {
  const score = oportunidadeScore(op);
  const emRisco =
    status === StatusRelacionamento.EM_RISCO ||
    status === StatusRelacionamento.INATIVO;
  const dias = sinais.diasSemCompra ?? 999;
  if (
    (op.tipo === "REATIVACAO" &&
      emRisco &&
      dias >= 75 &&
      op.valorEstimado >= 350) ||
    score >= 1_000
  ) {
    return "ALTA";
  }
  if (
    score >= 260 ||
    op.valorEstimado >= 500 ||
    op.probabilidade >= 68 ||
    (emRisco && sinais.valorTotalPeriodo >= 900)
  ) {
    return "MEDIA";
  }
  return "BAIXA";
}

/** Até 2 sugestões por cliente, com base em pedidos reais (Conta Azul). */
export function gerarOportunidadesSugeridas(
  nomeCliente: string,
  sinais: SinaisVenda,
  status: StatusRelacionamento,
  carteira: AnaliseCarteira
): OportunidadeGerada[] {
  if (sinais.totalPedidos === 0) return [];

  const out: OportunidadeGerada[] = [];
  const dias = sinais.diasSemCompra ?? 999;
  const emRisco =
    status === StatusRelacionamento.EM_RISCO ||
    status === StatusRelacionamento.INATIVO ||
    dias > 35;

  const nm = nomeCurto(nomeCliente);
  const vol = sinais.valorTotalPeriodo;
  const nPed = sinais.totalPedidos;
  const receitaMensal = sinais.mesesAtivos > 0 ? vol / sinais.mesesAtivos : vol;
  const categoriasAtuais = sinais.categoriasDetalhe.map(c => c.nome);
  const produtosAtuais = sinais.produtosDetalhe.map(p => p.nome);
  const categoriaRef =
    sinais.categoriasDetalhe[0]?.nome ?? sinais.categoriaPrincipal;
  const produtoRef = sinais.produtosDetalhe[0]?.nome ?? sinais.produtoPrincipal;
  const categoriaGap = carteira.categoriasMaisVendidas.find(
    cat => !sinais.categorias.includes(cat.nome)
  );
  const produtoGap =
    carteira.produtosMaisVendidos.find(
      p =>
        (!categoriaGap || p.categoria === categoriaGap.nome) &&
        !sinais.produtos.some(
          comprado =>
            comprado.localeCompare(p.nome, "pt-BR", { sensitivity: "base" }) ===
            0
        )
    ) ??
    carteira.produtosMaisVendidos.find(
      p =>
        !sinais.produtos.some(
          comprado =>
            comprado.localeCompare(p.nome, "pt-BR", { sensitivity: "base" }) ===
            0
        )
    );
  const ticketRelativo =
    carteira.ticketP75 > 0 ? sinais.ticketMedio / carteira.ticketP75 : 1;
  const volumeRelativo = carteira.valorP75 > 0 ? vol / carteira.valorP75 : 1;

  if (dias > 21 || emRisco || (sinais.tendenciaReceitaPct ?? 0) <= -0.35) {
    const severidade = dias > 75 ? 0.7 : dias > 45 ? 1.05 : 1.25;
    const base = Math.max(sinais.ticketMedio * 1.5, receitaMensal * severidade);
    const valorEst = arredondarPotencial(Math.max(250, base));
    out.push({
      tipo: "REATIVACAO",
      texto: `${nm}: reativação orientada pelo histórico — ${dias} dias sem compra e variação 30d ${pct(sinais.tendenciaReceitaPct)}. Retomar com os itens que já provaram aderência (${listarNomes(produtosAtuais)}) antes de ofertar novos produtos; ticket médio ${fmtBrl(sinais.ticketMedio)} em ${nPed} venda(s).`,
      valorEstimado: valorEst,
      probabilidade: probabilidadeDerivada(sinais, "REATIVACAO", emRisco),
    });
  }

  const ticketReferencia = carteira.ticketP75 || carteira.ticketP50 || 1;
  if (
    sinais.ticketMedio >= ticketReferencia * 0.85 &&
    sinais.frequenciaPorSemana >= 0.7 &&
    !emRisco
  ) {
    const uplift =
      0.14 +
      Math.min(0.18, sinais.frequenciaPorSemana * 0.045) +
      Math.min(0.08, volumeRelativo * 0.03);
    const valorEst = arredondarPotencial(
      Math.max(500, receitaMensal * uplift * 3)
    );
    out.push({
      tipo: "UPSELL",
      texto: `${nm}: upsell por aumento de volume — compra ${listarNomes(produtosAtuais)} em ${sinais.frequenciaPorSemana.toFixed(1)} venda(s)/semana; ticket ${fmtBrl(sinais.ticketMedio)} (${Math.round(ticketRelativo * 100)}% do P75). Ação: negociar recorrência/volume nos itens líderes da categoria ${categoriaRef ?? "principal"}.`,
      valorEstimado: valorEst,
      probabilidade: probabilidadeDerivada(sinais, "UPSELL", emRisco),
    });
  }

  if (
    categoriaGap &&
    produtoGap &&
    sinais.totalPedidos >= 2 &&
    sinais.diversidadeCategorias <= 2
  ) {
    const valorEst = arredondarPotencial(
      Math.max(
        300,
        Math.min(
          receitaMensal * 0.32 + categoriaGap.valorMedioCliente * 0.18,
          sinais.ticketMedio * (1.6 + sinais.diversidadeCategorias * 0.25)
        )
      )
    );
    out.push({
      tipo: "CROSS_SELL",
      texto: `${nm}: cross-sell por lacuna real de mix — hoje compra ${listarNomes(categoriasAtuais)} (${listarNomes(produtosAtuais)}), mas não compra ${categoriaGap.nome}. Ação: ofertar ${produtoGap.nome}, produto forte em clientes semelhantes; mix atual tem ${sinais.diversidadeCategorias} categoria(s) em ${nPed} venda(s).`,
      valorEstimado: valorEst,
      probabilidade: probabilidadeDerivada(sinais, "CROSS_SELL", emRisco),
    });
  }

  if (out.length === 0) {
    const valorEst = arredondarPotencial(
      Math.max(250, Math.min(900, sinais.ticketMedio * (1.1 + nPed * 0.05)))
    );
    const baseHistorica = produtoRef
      ? `base em ${produtoRef}`
      : "base histórica ainda sem itens detalhados";
    out.push({
      tipo: "NOVO_PRODUTO",
      texto: `${nm}: teste controlado de novo produto — ${nPed} venda(s), ticket ${fmtBrl(sinais.ticketMedio)}, ${baseHistorica}. Ação: testar ${produtoGap?.nome ?? "uma linha complementar"} com meta pequena e medir recompra antes de escalar.`,
      valorEstimado: valorEst,
      probabilidade: probabilidadeDerivada(sinais, "NOVO_PRODUTO", emRisco),
    });
  }

  return out
    .filter(op => op.valorEstimado > 0)
    .sort((a, b) => oportunidadeScore(b) - oportunidadeScore(a))
    .slice(0, 2);
}

export type InteligenciaComercialResult = {
  clientesAtualizados: number;
  oportunidadesCriadas: number;
};

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size)
    out.push(items.slice(i, i + size));
  return out;
}

/**
 * Recalcula score, status (risco), tags e recria oportunidades `[sistema]` para clientes ativos/recuperáveis.
 * Clientes inferidos como INATIVO têm as oportunidades automáticas abertas removidas para não poluir a operação comercial.
 */
export async function runInteligenciaComercial(
  prisma: PrismaClient
): Promise<InteligenciaComercialResult> {
  const clientes = await prisma.cliente.findMany({
    select: { id: true, nome: true, tags: true },
  });

  const todosPedidos = await prisma.pedido.findMany({
    where: { origemPedido: OrigemPedido.CONTA_AZUL },
    include: { itens: true },
    orderBy: { dataPedido: "asc" },
  });
  const porCliente = new Map<string, typeof todosPedidos>();
  for (const p of todosPedidos) {
    const arr = porCliente.get(p.clienteId) ?? [];
    arr.push(p);
    porCliente.set(p.clienteId, arr);
  }

  const sinaisPorCliente = new Map<string, SinaisVenda>();
  const categoriasCarteira = new Map<
    string,
    { valor: number; clientes: Set<string> }
  >();
  const produtosCarteira = new Map<
    string,
    { categoria: string | null; valor: number; clientes: Set<string> }
  >();

  for (const c of clientes) {
    const sinais = extrairSinaisDePedidos(porCliente.get(c.id) ?? []);
    sinaisPorCliente.set(c.id, sinais);
    for (const cat of sinais.categoriasDetalhe) {
      const acc = categoriasCarteira.get(cat.nome) ?? {
        valor: 0,
        clientes: new Set<string>(),
      };
      acc.valor += cat.valor;
      acc.clientes.add(c.id);
      categoriasCarteira.set(cat.nome, acc);
    }
    for (const prod of sinais.produtosDetalhe) {
      const acc = produtosCarteira.get(prod.nome) ?? {
        categoria: prod.categoria,
        valor: 0,
        clientes: new Set<string>(),
      };
      acc.valor += prod.valor;
      acc.clientes.add(c.id);
      if (!acc.categoria && prod.categoria) acc.categoria = prod.categoria;
      produtosCarteira.set(prod.nome, acc);
    }
  }

  const sinaisValidos = Array.from(sinaisPorCliente.values()).filter(
    s => s.totalPedidos > 0
  );
  const carteira: AnaliseCarteira = {
    ticketP50: quantile(
      sinaisValidos.map(s => s.ticketMedio),
      0.5
    ),
    ticketP75: quantile(
      sinaisValidos.map(s => s.ticketMedio),
      0.75
    ),
    valorP75: quantile(
      sinaisValidos.map(s => s.valorTotalPeriodo),
      0.75
    ),
    categoriasMaisVendidas: Array.from(categoriasCarteira.entries())
      .map(([nome, s]) => ({
        nome,
        valorMedioCliente: s.clientes.size > 0 ? s.valor / s.clientes.size : 0,
        clientes: s.clientes.size,
      }))
      .sort(
        (a, b) =>
          b.valorMedioCliente - a.valorMedioCliente || b.clientes - a.clientes
      )
      .slice(0, 5)
      .map(c => c),
    produtosMaisVendidos: Array.from(produtosCarteira.entries())
      .map(([nome, s]) => ({
        nome,
        categoria: s.categoria,
        valorMedioCliente: s.clientes.size > 0 ? s.valor / s.clientes.size : 0,
        clientes: s.clientes.size,
      }))
      .sort(
        (a, b) =>
          b.valorMedioCliente - a.valorMedioCliente || b.clientes - a.clientes
      )
      .slice(0, 12),
  };

  let oportunidadesCriadas = 0;

  async function processarCliente(c: (typeof clientes)[number]) {
    const sinais = sinaisPorCliente.get(c.id) ?? extrairSinaisDePedidos([]);
    const score = calcularScoreComercialBase(sinais);
    const status = inferirStatusRelacionamento(sinais);

    const tagsSugeridas = sugerirTags(
      { id: c.id, nome: c.nome, tags: c.tags } as unknown as Cliente,
      sinais
    );
    const existentes = Array.isArray(c.tags)
      ? (c.tags as unknown[]).filter((t): t is string => typeof t === "string")
      : [];
    const mergedTags = Array.from(new Set([...existentes, ...tagsSugeridas]));

    const novas =
      status === StatusRelacionamento.INATIVO
        ? []
        : gerarOportunidadesSugeridas(c.nome, sinais, status, carteira);
    const operacoes = [
      prisma.cliente.update({
        where: { id: c.id },
        data: {
          scoreComercial: new Prisma.Decimal(score),
          statusRelacionamento: status,
          tags: mergedTags,
        },
      }),
      prisma.oportunidade.deleteMany({
        where: {
          clienteId: c.id,
          statusOportunidade: { in: ["ABERTA", "EM_CONTATO"] },
          descricao: { startsWith: OPORTUNIDADE_SISTEMA_PREFIX },
        },
      }),
    ];

    if (novas.length > 0) {
      operacoes.push(
        prisma.oportunidade.createMany({
          data: novas.map(n => ({
            clienteId: c.id,
            tipoOportunidade: n.tipo,
            descricao: OPORTUNIDADE_SISTEMA_PREFIX + n.texto,
            valorEstimado: new Prisma.Decimal(n.valorEstimado),
            probabilidadeConversao: new Prisma.Decimal(n.probabilidade),
            prioridade: prioridadeAnalitica(n, sinais, status),
            statusOportunidade: "ABERTA",
          })),
        })
      );
    }

    await prisma.$transaction(operacoes);
    return novas.length;
  }

  for (const lote of chunks(clientes, 12)) {
    const counts = await Promise.all(lote.map(processarCliente));
    oportunidadesCriadas += counts.reduce((sum, count) => sum + count, 0);
  }

  return {
    clientesAtualizados: clientes.length,
    oportunidadesCriadas,
  };
}
