import type { Cliente, Pedido } from "../generated/prisma/index.js";
import { StatusRelacionamento } from "../generated/prisma/index.js";

export type SinaisVenda = {
  diasSemCompra: number | null;
  ticketMedio: number;
  frequenciaPorSemana: number;
  totalPedidos: number;
  valorTotalPeriodo: number;
};

export function extrairSinaisDePedidos(pedidos: Pedido[], agora = new Date()): SinaisVenda {
  if (pedidos.length === 0) {
    return {
      diasSemCompra: null,
      ticketMedio: 0,
      frequenciaPorSemana: 0,
      totalPedidos: 0,
      valorTotalPeriodo: 0,
    };
  }

  const ordenados = [...pedidos].sort((a, b) => a.dataPedido.getTime() - b.dataPedido.getTime());
  const ultima = ordenados[ordenados.length - 1]!;
  const diasSemCompra = Math.floor((agora.getTime() - ultima.dataPedido.getTime()) / (1000 * 60 * 60 * 24));

  const valorTotalPeriodo = pedidos.reduce((s, p) => s + Number(p.valorTotal), 0);
  const ticketMedio = valorTotalPeriodo / pedidos.length;

  const primeira = ordenados[0]!;
  const diasJanela = Math.max(1, (ultima.dataPedido.getTime() - primeira.dataPedido.getTime()) / (1000 * 60 * 60 * 24));
  const semanas = diasJanela / 7;
  const frequenciaPorSemana = semanas > 0 ? pedidos.length / semanas : pedidos.length;

  return {
    diasSemCompra,
    ticketMedio,
    frequenciaPorSemana,
    totalPedidos: pedidos.length,
    valorTotalPeriodo,
  };
}

/**
 * Score 0–100 derivado primariamente de dados estruturados (Conta Azul / pedidos).
 * Manus entra só como refinamento qualitativo em outro endpoint.
 */
export function calcularScoreComercialBase(sinais: SinaisVenda): number {
  if (sinais.totalPedidos === 0) return 10;

  let score = 40;

  if (sinais.ticketMedio >= 800) score += 20;
  else if (sinais.ticketMedio >= 400) score += 12;
  else if (sinais.ticketMedio >= 200) score += 6;

  if (sinais.frequenciaPorSemana >= 2) score += 20;
  else if (sinais.frequenciaPorSemana >= 1) score += 12;
  else if (sinais.frequenciaPorSemana >= 0.5) score += 6;

  const dias = sinais.diasSemCompra ?? 999;
  if (dias <= 7) score += 15;
  else if (dias <= 21) score += 8;
  else if (dias <= 45) score += 0;
  else score -= 20;

  if (sinais.valorTotalPeriodo >= 50_000) score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function inferirStatusRelacionamento(sinais: SinaisVenda): StatusRelacionamento {
  const dias = sinais.diasSemCompra ?? 999;
  if (sinais.totalPedidos === 0) return StatusRelacionamento.INATIVO;
  if (dias > 60) return StatusRelacionamento.INATIVO;
  if (dias > 35 || sinais.frequenciaPorSemana < 0.25) return StatusRelacionamento.EM_RISCO;
  if (sinais.ticketMedio >= 700 && sinais.frequenciaPorSemana >= 1.5) return StatusRelacionamento.ESTRATEGICO;
  return StatusRelacionamento.ATIVO;
}

export function sugerirTags(_cliente: Cliente, sinais: SinaisVenda): string[] {
  const tags: string[] = [];
  if (sinais.ticketMedio >= 700) tags.push("Premium");
  if (sinais.valorTotalPeriodo >= 40_000) tags.push("Volume");
  if ((sinais.diasSemCompra ?? 0) > 35) tags.push("Reativacao");
  if (sinais.frequenciaPorSemana >= 2) tags.push("Alta_Frequencia");
  return tags;
}
