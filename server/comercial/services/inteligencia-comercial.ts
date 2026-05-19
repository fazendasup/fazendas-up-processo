import { Prisma, type PrismaClient, StatusRelacionamento, TipoOportunidade } from "../generated/prisma/index.js";
import type { Cliente } from "../generated/prisma/index.js";
import {
  calcularScoreComercialBase,
  extrairSinaisDePedidos,
  inferirStatusRelacionamento,
  sugerirTags,
  type SinaisVenda,
} from "./classificacao-cliente";
import { prioridadeOportunidade } from "./priorizacao";

/** Oportunidades geradas automaticamente — removidas/recriadas a cada inteligência. */
export const OPORTUNIDADE_SISTEMA_PREFIX = "[sistema] ";

type OportunidadeGerada = {
  tipo: TipoOportunidade;
  texto: string;
  valorEstimado: number;
  probabilidade: number;
};

function nomeCurto(nome: string): string {
  const p = nome.trim().split(/\s+/)[0];
  return p && p.length <= 40 ? p : nome.slice(0, 36);
}

function clampProb(n: number): number {
  return Math.max(32, Math.min(88, Math.round(n)));
}

/** Probabilidade contínua a partir dos sinais + tipo, evitando 52/58/70 repetidos em massa. */
function probabilidadeDerivada(sinais: SinaisVenda, tipo: TipoOportunidade, emRisco: boolean): number {
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
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function freqPeso(freq: number): number {
  return Math.min(1.4, 0.35 + freq * 0.25);
}

/** Até 2 sugestões por cliente, com base em pedidos reais (Conta Azul). */
export function gerarOportunidadesSugeridas(
  nomeCliente: string,
  sinais: SinaisVenda,
  status: StatusRelacionamento,
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

  if (dias > 28 || emRisco) {
    const valorEst = Math.round(Math.max(900, sinais.ticketMedio * (2.8 + Math.min(1.2, nPed / 20))));
    out.push({
      tipo: "REATIVACAO",
      texto: `${nm}: sem compra há ${dias} dias · histórico ${nPed} pedido(s), ${fmtBrl(vol)} no período analisado · proposta de retomada alinhada ao ticket ~${sinais.ticketMedio.toFixed(0)}.`,
      valorEstimado: valorEst,
      probabilidade: probabilidadeDerivada(sinais, "REATIVACAO", emRisco),
    });
  }

  if (out.length >= 2) return out.slice(0, 2);

  if (sinais.ticketMedio >= 650 && sinais.frequenciaPorSemana >= 1 && !emRisco) {
    const valorEst = Math.round(Math.max(1800, vol * (0.1 + Math.min(0.08, sinais.frequenciaPorSemana / 25))));
    out.push({
      tipo: "UPSELL",
      texto: `${nm}: ticket médio ${fmtBrl(sinais.ticketMedio)}, ~${sinais.frequenciaPorSemana.toFixed(1)} compras/semana, ${fmtBrl(vol)} acumulado · ampliar volume ou mix premium.`,
      valorEstimado: valorEst,
      probabilidade: probabilidadeDerivada(sinais, "UPSELL", emRisco),
    });
  } else if (sinais.ticketMedio >= 220 && out.length < 2) {
    const valorEst = Math.round(Math.max(550, sinais.ticketMedio * (1.8 + freqPeso(sinais.frequenciaPorSemana))));
    out.push({
      tipo: "CROSS_SELL",
      texto: `${nm}: ${nPed} pedidos, ticket ~${fmtBrl(sinais.ticketMedio)} · abrir categorias complementares ao padrão (${fmtBrl(vol)} no período).`,
      valorEstimado: valorEst,
      probabilidade: probabilidadeDerivada(sinais, "CROSS_SELL", emRisco),
    });
  }

  if (out.length === 0) {
    const valorEst = Math.round(Math.max(450, sinais.ticketMedio * (1.6 + nPed * 0.12)));
    out.push({
      tipo: "NOVO_PRODUTO",
      texto: `${nm}: ${nPed} pedido(s), ${fmtBrl(vol)} no período, ticket ${fmtBrl(sinais.ticketMedio)} · testar novas linhas com base nesse perfil.`,
      valorEstimado: valorEst,
      probabilidade: probabilidadeDerivada(sinais, "NOVO_PRODUTO", emRisco),
    });
  }

  return out.slice(0, 2);
}

export type InteligenciaComercialResult = {
  clientesAtualizados: number;
  oportunidadesCriadas: number;
};

/**
 * Recalcula score, status (risco), tags e recria oportunidades `[sistema]` para todos os clientes com base nos pedidos locais.
 */
export async function runInteligenciaComercial(prisma: PrismaClient): Promise<InteligenciaComercialResult> {
  const clientes = await prisma.cliente.findMany({
    select: { id: true, nome: true, tags: true },
  });

  const todosPedidos = await prisma.pedido.findMany({
    orderBy: { dataPedido: "asc" },
  });
  const porCliente = new Map<string, typeof todosPedidos>();
  for (const p of todosPedidos) {
    const arr = porCliente.get(p.clienteId) ?? [];
    arr.push(p);
    porCliente.set(p.clienteId, arr);
  }

  let oportunidadesCriadas = 0;

  for (const c of clientes) {
    const pedidos = porCliente.get(c.id) ?? [];
    const sinais = extrairSinaisDePedidos(pedidos);
    const score = calcularScoreComercialBase(sinais);
    const status = inferirStatusRelacionamento(sinais);

    const tagsSugeridas = sugerirTags({ id: c.id, nome: c.nome, tags: c.tags } as unknown as Cliente, sinais);
    const existentes = Array.isArray(c.tags)
      ? (c.tags as unknown[]).filter((t): t is string => typeof t === "string")
      : [];
    const mergedTags = Array.from(new Set([...existentes, ...tagsSugeridas]));

    await prisma.cliente.update({
      where: { id: c.id },
      data: {
        scoreComercial: new Prisma.Decimal(score),
        statusRelacionamento: status,
        tags: mergedTags,
      },
    });

    await prisma.oportunidade.deleteMany({
      where: {
        clienteId: c.id,
        statusOportunidade: { in: ["ABERTA", "EM_CONTATO"] },
        descricao: { startsWith: OPORTUNIDADE_SISTEMA_PREFIX },
      },
    });

    const novas = gerarOportunidadesSugeridas(c.nome, sinais, status);
    const clienteEmRisco = status === StatusRelacionamento.EM_RISCO || status === StatusRelacionamento.INATIVO;

    for (const n of novas) {
      const prioridade = prioridadeOportunidade({
        clienteEmRisco,
        tipo: n.tipo,
        valorEstimado: n.valorEstimado,
        probabilidade: n.probabilidade,
      });

      await prisma.oportunidade.create({
        data: {
          clienteId: c.id,
          tipoOportunidade: n.tipo,
          descricao: OPORTUNIDADE_SISTEMA_PREFIX + n.texto,
          valorEstimado: new Prisma.Decimal(n.valorEstimado),
          probabilidadeConversao: new Prisma.Decimal(n.probabilidade),
          prioridade,
          statusOportunidade: "ABERTA",
        },
      });
      oportunidadesCriadas++;
    }
  }

  return {
    clientesAtualizados: clientes.length,
    oportunidadesCriadas,
  };
}
