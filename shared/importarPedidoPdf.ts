/** Tipos do fluxo Importar pedido PDF (agenda comercial). */

export const TIPOS_VENDA_IMPORT_PDF = [
  "RECORRENTE_SEMANAL",
  "RECORRENTE_QUINZENAL",
  "PLANO",
  "AVULSO",
] as const;

export type TipoVendaImportPdf = (typeof TIPOS_VENDA_IMPORT_PDF)[number];

export type StatusMatchImportPdf = "ok" | "ambiguo" | "nao_encontrado" | "manual";

export type CandidatoMatchImportPdf = {
  id: string;
  nome: string;
  detalhe?: string | null;
};

export type ClienteDraftImportPdf = {
  nomePdf: string;
  documentoPdf: string | null;
  contaAzulCustomerId: string | null;
  nomeResolvido: string | null;
  candidatos: CandidatoMatchImportPdf[];
  status: StatusMatchImportPdf;
};

export type ItemDraftImportPdf = {
  /** Id estável na UI (não é produtoId). */
  chave: string;
  nomePdf: string;
  quantidade: number;
  unidadePdf: string | null;
  observacoes: string | null;
  produtoId: string | null;
  nomeResolvido: string | null;
  candidatos: CandidatoMatchImportPdf[];
  status: StatusMatchImportPdf;
};

export type DraftImportarPedidoPdf = {
  arquivoNome: string;
  modeloUsado: string;
  cliente: ClienteDraftImportPdf;
  itens: ItemDraftImportPdf[];
  dataEntregaSugerida: string | null;
  tipoVendaSugerido: TipoVendaImportPdf | null;
  observacoesPedido: string | null;
  /** Sugestão de nota para regra do cliente (opcional). */
  notaRegraSugerida: string | null;
  avisos: string[];
  confiancaGeral: number;
};

export function draftImportProntoParaSalvar(draft: {
  cliente: { contaAzulCustomerId: string | null };
  itens: Array<{ produtoId: string | null; quantidade: number }>;
}): { ok: true } | { ok: false; motivo: string } {
  if (!draft.cliente.contaAzulCustomerId?.trim()) {
    return { ok: false, motivo: "Selecione o cliente Conta Azul." };
  }
  const itensOk = draft.itens.filter(
    (i) => i.produtoId?.trim() && Number.isFinite(i.quantidade) && i.quantidade > 0,
  );
  if (itensOk.length === 0) {
    return { ok: false, motivo: "Informe ao menos um item com produto e quantidade." };
  }
  const pendentes = draft.itens.filter(
    (i) => !i.produtoId?.trim() && Number.isFinite(i.quantidade) && i.quantidade > 0,
  );
  if (pendentes.length > 0) {
    return {
      ok: false,
      motivo: `${pendentes.length} item(ns) ainda sem produto correspondente.`,
    };
  }
  return { ok: true };
}
