import type { PrioridadeOportunidade } from "../generated/prisma/index.js";

export type FatoresPrioridade = {
  clienteEmRisco: boolean;
  probabilidade?: number | null;
  valorEstimado?: number | null;
  tipo: "UPSELL" | "CROSS_SELL" | "REATIVACAO" | "NOVO_PRODUTO";
};

export function prioridadeOportunidade(f: FatoresPrioridade): PrioridadeOportunidade {
  const prob = f.probabilidade ?? 0;
  const valor = f.valorEstimado ?? 0;

  if (f.clienteEmRisco && (f.tipo === "REATIVACAO" || f.tipo === "UPSELL")) return "ALTA";
  if (prob >= 70 && valor >= 1500) return "ALTA";
  if (prob >= 55 && valor >= 600) return "MEDIA";
  if (f.tipo === "REATIVACAO" && f.clienteEmRisco) return "ALTA";
  if (valor >= 3000) return "ALTA";
  if (valor >= 800) return "MEDIA";
  return "BAIXA";
}

export function prioridadeOrdenacao(p: PrioridadeOportunidade) {
  if (p === "ALTA") return 3;
  if (p === "MEDIA") return 2;
  return 1;
}
