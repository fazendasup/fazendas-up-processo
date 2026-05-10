import { addDays, startOfDay } from "date-fns";

export const CATEGORIAS_ESTOQUE = [
  "sementes",
  "substratos",
  "biologicos",
  "nutrientes",
  "embalagem",
] as const;
export type EstoqueCategoria = (typeof CATEGORIAS_ESTOQUE)[number];

/** Massa e volume em unidades comerciais (kg / L); `unidade` para contagens (ex.: embalagens). */
export const UNIDADES_ESTOQUE = ["unidade", "kg", "l"] as const;
export type EstoqueUnidadeTipo = (typeof UNIDADES_ESTOQUE)[number];

export const LABEL_CATEGORIA: Record<EstoqueCategoria, string> = {
  sementes: "Sementes",
  substratos: "Substratos",
  biologicos: "Biológicos",
  nutrientes: "Nutrientes",
  embalagem: "Embalagem",
};

export const LABEL_UNIDADE: Record<EstoqueUnidadeTipo, string> = {
  unidade: "unidade(s)",
  kg: "kg",
  l: "L",
};

/** Campos de qualidade de cadastro esperados em todos os itens (guardar pode ficar incompleto). */
export type FaltaCadastroEstoque = "fornecedor" | "preco_unitario" | "nivel_minimo";

export const LABEL_FALTA_CADASTRO_ESTOQUE: Record<FaltaCadastroEstoque, string> = {
  fornecedor: "fornecedor",
  preco_unitario: "preço unitário",
  nivel_minimo: "nível mínimo",
};

/** Indica se faltam dados obrigatórios de negócio (lista deve assinalar o item). */
export function analiseCadastroEstoque(row: {
  fornecedor: string | null | undefined;
  precoUnitario: number | null | undefined;
  nivelMinimo: number | null | undefined;
}): { incompleto: boolean; faltas: FaltaCadastroEstoque[] } {
  const faltas: FaltaCadastroEstoque[] = [];
  if (!(row.fornecedor ?? "").trim()) faltas.push("fornecedor");
  const p = row.precoUnitario;
  if (p == null || !Number.isFinite(p) || p <= 0) faltas.push("preco_unitario");
  const n = row.nivelMinimo;
  if (n == null || !Number.isFinite(n)) faltas.push("nivel_minimo");
  return { incompleto: faltas.length > 0, faltas };
}

export function textoFaltasCadastroEstoque(faltas: FaltaCadastroEstoque[]): string {
  return faltas.map((k) => LABEL_FALTA_CADASTRO_ESTOQUE[k]).join(", ");
}

/** Rótulo para tabelas/CSV; aceita unidades legadas (g/ml) antes da migração. */
export function labelUnidadeEstoque(u: string): string {
  if (u === "g") return "g (legado)";
  if (u === "ml") return "ml (legado)";
  return LABEL_UNIDADE[u as EstoqueUnidadeTipo] ?? u;
}

export function consumoMedioDiario(usoPorEvento: number, frequenciaDias: number): number | null {
  if (!Number.isFinite(frequenciaDias) || frequenciaDias <= 0) return null;
  if (!Number.isFinite(usoPorEvento) || usoPorEvento < 0) return null;
  return usoPorEvento / frequenciaDias;
}

export function diasAteEsgotar(quantidadeTotal: number, usoPorEvento: number, frequenciaDias: number): number | null {
  const c = consumoMedioDiario(usoPorEvento, frequenciaDias);
  if (c == null || c === 0) return null;
  if (!Number.isFinite(quantidadeTotal) || quantidadeTotal <= 0) return 0;
  return quantidadeTotal / c;
}

export type StatusProjecaoEstoque = "ok" | "atencao" | "critico" | "sem_uso";

export type ProjecaoEstoque = {
  consumoMedioDiario: number | null;
  diasAteEsgotar: number | null;
  dataEsgotamento: Date | null;
  dataCompraSugerida: Date | null;
  status: StatusProjecaoEstoque;
};

export function projetarEstoque(row: {
  quantidadeTotal: number;
  usoPorEvento: number;
  frequenciaDias: number;
  prazoEntregaDias: number;
  diasMargemCompra: number;
  nivelMinimo?: number | null;
}): ProjecaoEstoque {
  const { quantidadeTotal, usoPorEvento, frequenciaDias, prazoEntregaDias, diasMargemCompra, nivelMinimo } = row;
  if (usoPorEvento <= 0 || frequenciaDias <= 0) {
    return {
      consumoMedioDiario: null,
      diasAteEsgotar: null,
      dataEsgotamento: null,
      dataCompraSugerida: null,
      status: "sem_uso",
    };
  }
  const consumoMedioDiario = usoPorEvento / frequenciaDias;
  const dias = quantidadeTotal / consumoMedioDiario;
  const hoje = startOfDay(new Date());
  const dataEsgotamento = addDays(hoje, Math.max(0, Math.floor(dias)));
  const dataCompraSugerida = addDays(dataEsgotamento, -(prazoEntregaDias + diasMargemCompra));

  let status: StatusProjecaoEstoque = "ok";
  const compra = startOfDay(dataCompraSugerida);
  if (compra.getTime() <= hoje.getTime()) status = "critico";
  else if (dias <= 14) status = "atencao";

  if (nivelMinimo != null && nivelMinimo > 0 && quantidadeTotal <= nivelMinimo) {
    status = "critico";
  }

  return {
    consumoMedioDiario,
    diasAteEsgotar: dias,
    dataEsgotamento,
    dataCompraSugerida,
    status,
  };
}

export function valorLinhaEstoque(quantidadeTotal: number, precoUnitario: number | null | undefined): number {
  const p = precoUnitario ?? 0;
  if (!Number.isFinite(quantidadeTotal) || !Number.isFinite(p)) return 0;
  return quantidadeTotal * p;
}

export function custoConsumoDiario(
  consumoMedioDiario: number | null,
  precoUnitario: number | null | undefined,
): number | null {
  if (consumoMedioDiario == null || consumoMedioDiario <= 0) return null;
  const p = precoUnitario ?? 0;
  if (!Number.isFinite(p) || p <= 0) return null;
  return consumoMedioDiario * p;
}
