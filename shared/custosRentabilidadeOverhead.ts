import type { GrupoCustoProducao } from "./custosProducao";

export const ORIGENS_OVERHEAD_RENTABILIDADE = [
  "manual",
  "conta_azul",
  "modelo_compartilhados",
  "modelo_mo",
] as const;

export type OrigemOverheadRentabilidade = (typeof ORIGENS_OVERHEAD_RENTABILIDADE)[number];

export const MODOS_OVERHEAD_RENTABILIDADE = ["itens", "sugerido", "manual"] as const;
export type ModoOverheadRentabilidade = (typeof MODOS_OVERHEAD_RENTABILIDADE)[number];

export const LABEL_ORIGEM_OVERHEAD_RENTABILIDADE: Record<OrigemOverheadRentabilidade, string> = {
  manual: "Manual",
  conta_azul: "Conta Azul",
  modelo_compartilhados: "Modelo (Compartilhados)",
  modelo_mo: "Modelo (MO fixa)",
};

export const LABEL_MODO_OVERHEAD_RENTABILIDADE: Record<ModoOverheadRentabilidade, string> = {
  itens: "Curado (itens do período)",
  sugerido: "Sugestão do cadastro",
  manual: "Total manual",
};

export type OverheadRentabilidadeItem = {
  id?: number;
  origem: OrigemOverheadRentabilidade;
  contaAzulParcelaId?: string | null;
  refModeloId?: number | null;
  grupo: GrupoCustoProducao | string;
  rubrica: string;
  descricao?: string | null;
  valorOriginal?: number | null;
  valor: number;
  incluido: boolean;
  ordem?: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function somarOverheadItensIncluidos(itens: Pick<OverheadRentabilidadeItem, "valor" | "incluido">[]): number {
  return round2(
    itens.reduce((s, i) => (i.incluido ? s + Math.max(0, i.valor) : s), 0),
  );
}

/** Heurística leve: mapeia categoria/fornecedor do CA para grupo de custo. */
export function inferirGrupoCustoDeTextoContaAzul(texto: string): GrupoCustoProducao {
  const t = texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (/combust|diesel|gasolina|frete|transporte|logist|entrega/.test(t)) return "logistica";
  if (/salari|folha|encarg|pro labore|clt|pj|rh|beneficio/.test(t)) return "mao_de_obra";
  if (/consult|bpo|contabil|advog|administr|escritorio|overhead|honor/.test(t)) return "overhead";
  if (/energia|luz|eletric|clima|bomba|gas natural/.test(t)) return "energia";
  if (/agua|esgoto|hidr/.test(t)) return "agua";
  if (/imposto|taxa|juros|financ|tarifa banc|anuidade/.test(t)) return "financeiro_impostos";
  if (/manut|peca|ferrament|reparo|conserto/.test(t)) return "manutencao";
  if (/embalag|rotulo|adesivo|caixa|sacola/.test(t)) return "insumos_embalagem";
  if (/semente|muda|substrato|bandeja|nutri|defens|biologic|insumo/.test(t)) return "outros";
  return "outros";
}

export function chaveDedupModeloOverhead(
  origem: "modelo_compartilhados" | "modelo_mo",
  refModeloId: number,
): string {
  return `${origem}:${refModeloId}`;
}
