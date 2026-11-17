import { randomUUID } from "crypto";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import type {
  CandidatoMatchImportPdf,
  ClienteDraftImportPdf,
  DraftImportarPedidoPdf,
  ItemDraftImportPdf,
  StatusMatchImportPdf,
  TipoVendaImportPdf,
} from "@shared/importarPedidoPdf";
import { TIPOS_VENDA_IMPORT_PDF } from "@shared/importarPedidoPdf";

export type ClienteCatalogoImport = {
  externalId: string;
  nome: string;
  cnpjCpf: string | null;
};

export type ProdutoCatalogoImport = {
  id: string;
  nome: string;
  sku: string | null;
};

type ExtracaoTexto = {
  clienteNome: string | null;
  clienteDocumento: string | null;
  dataEntrega: string | null;
  tipoVenda: string | null;
  observacoes: string | null;
  notaRegra: string | null;
  confianca: number;
  avisos: string[];
  itens: Array<{
    nome: string;
    quantidade: number;
    unidade: string | null;
    observacoes: string | null;
  }>;
};

function normalizarTexto(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function soDigitos(s: string | null | undefined): string {
  return String(s ?? "").replace(/\D/g, "");
}

function scoreNome(query: string, candidato: string): number {
  const q = normalizarTexto(query);
  const c = normalizarTexto(candidato);
  if (!q || !c) return 0;
  if (q === c) return 100;
  if (c.includes(q) || q.includes(c)) return 80;
  const qTokens = new Set(q.split(" ").filter(Boolean));
  const cTokens = c.split(" ").filter(Boolean);
  if (qTokens.size === 0) return 0;
  let hit = 0;
  for (const t of cTokens) if (qTokens.has(t)) hit += 1;
  const overlap = hit / Math.max(qTokens.size, 1);
  return Math.round(overlap * 60);
}

export function matchClienteImport(
  clientes: ClienteCatalogoImport[],
  nomePdf: string | null,
  documentoPdf: string | null,
): Pick<
  ClienteDraftImportPdf,
  "contaAzulCustomerId" | "nomeResolvido" | "candidatos" | "status"
> {
  const digitos = soDigitos(documentoPdf);
  if (digitos.length >= 11) {
    const porDoc = clientes.filter((c) => soDigitos(c.cnpjCpf) === digitos);
    if (porDoc.length === 1) {
      return {
        contaAzulCustomerId: porDoc[0]!.externalId,
        nomeResolvido: porDoc[0]!.nome,
        candidatos: [{ id: porDoc[0]!.externalId, nome: porDoc[0]!.nome, detalhe: "documento" }],
        status: "ok",
      };
    }
    if (porDoc.length > 1) {
      return {
        contaAzulCustomerId: null,
        nomeResolvido: null,
        candidatos: porDoc.slice(0, 8).map((c) => ({
          id: c.externalId,
          nome: c.nome,
          detalhe: c.cnpjCpf,
        })),
        status: "ambiguo",
      };
    }
  }

  const nome = nomePdf?.trim() ?? "";
  if (!nome) {
    return {
      contaAzulCustomerId: null,
      nomeResolvido: null,
      candidatos: [],
      status: "nao_encontrado",
    };
  }

  const ranked = clientes
    .map((c) => ({ c, score: scoreNome(nome, c.nome) }))
    .filter((x) => x.score >= 40)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) {
    return {
      contaAzulCustomerId: null,
      nomeResolvido: null,
      candidatos: [],
      status: "nao_encontrado",
    };
  }

  const top = ranked[0]!;
  const empate = ranked.filter((x) => x.score === top.score);
  const candidatos: CandidatoMatchImportPdf[] = ranked.slice(0, 8).map((x) => ({
    id: x.c.externalId,
    nome: x.c.nome,
    detalhe: x.c.cnpjCpf,
  }));

  if (empate.length === 1 && top.score >= 80) {
    return {
      contaAzulCustomerId: top.c.externalId,
      nomeResolvido: top.c.nome,
      candidatos,
      status: "ok",
    };
  }

  return {
    contaAzulCustomerId: null,
    nomeResolvido: null,
    candidatos,
    status: "ambiguo",
  };
}

export function matchProdutoImport(
  produtos: ProdutoCatalogoImport[],
  nomePdf: string,
): Pick<ItemDraftImportPdf, "produtoId" | "nomeResolvido" | "candidatos" | "status"> {
  const nome = nomePdf.trim();
  if (!nome) {
    return { produtoId: null, nomeResolvido: null, candidatos: [], status: "nao_encontrado" };
  }

  const bySku = produtos.find(
    (p) => p.sku && normalizarTexto(p.sku) === normalizarTexto(nome),
  );
  if (bySku) {
    return {
      produtoId: bySku.id,
      nomeResolvido: bySku.nome,
      candidatos: [{ id: bySku.id, nome: bySku.nome, detalhe: bySku.sku }],
      status: "ok",
    };
  }

  const ranked = produtos
    .map((p) => ({ p, score: scoreNome(nome, p.nome) }))
    .filter((x) => x.score >= 40)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) {
    return { produtoId: null, nomeResolvido: null, candidatos: [], status: "nao_encontrado" };
  }

  const top = ranked[0]!;
  const empate = ranked.filter((x) => x.score === top.score);
  const candidatos = ranked.slice(0, 8).map((x) => ({
    id: x.p.id,
    nome: x.p.nome,
    detalhe: x.p.sku,
  }));

  if (empate.length === 1 && top.score >= 80) {
    return {
      produtoId: top.p.id,
      nomeResolvido: top.p.nome,
      candidatos,
      status: "ok",
    };
  }

  return {
    produtoId: null,
    nomeResolvido: null,
    candidatos,
    status: "ambiguo",
  };
}

function tipoVendaFromTexto(raw: string | null): TipoVendaImportPdf | null {
  if (!raw) return null;
  const n = raw.trim().toUpperCase().replace(/\s+/g, "_");
  return (TIPOS_VENDA_IMPORT_PDF as readonly string[]).includes(n)
    ? (n as TipoVendaImportPdf)
    : null;
}

function parseDataBrParaIso(raw: string): string | null {
  const m = raw.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  let y = Number(m[3]);
  if (y < 100) y += 2000;
  if (d < 1 || d > 31 || mo < 1 || mo > 12 || y < 2020 || y > 2100) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function extrairDocumento(texto: string): string | null {
  const cnpj = texto.match(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/);
  if (cnpj) return cnpj[0]!;
  const cpf = texto.match(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/);
  return cpf?.[0] ?? null;
}

function extrairDataEntrega(texto: string): string | null {
  const rotulada = texto.match(
    /(?:data\s*(?:de\s*)?(?:entrega|pedido)|entrega|agendar|para o dia)[^\d]{0,20}(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i,
  );
  if (rotulada?.[1]) {
    const iso = parseDataBrParaIso(rotulada[1]);
    if (iso) return iso;
  }
  const todas = [...texto.matchAll(/\b(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})\b/g)].map((m) => m[1]!);
  for (const d of todas) {
    const iso = parseDataBrParaIso(d);
    if (iso) return iso;
  }
  return null;
}

function encontrarClienteNoTexto(
  texto: string,
  clientes: ClienteCatalogoImport[],
): { nome: string | null; documento: string | null } {
  const documento = extrairDocumento(texto);
  const textoNorm = normalizarTexto(texto);

  const porDoc =
    documento && soDigitos(documento).length >= 11
      ? clientes.find((c) => soDigitos(c.cnpjCpf) === soDigitos(documento))
      : null;
  if (porDoc) return { nome: porDoc.nome, documento };

  let melhor: { nome: string; score: number } | null = null;
  for (const c of clientes) {
    const nomeNorm = normalizarTexto(c.nome);
    if (nomeNorm.length < 4) continue;
    if (!textoNorm.includes(nomeNorm)) continue;
    const score = nomeNorm.length;
    if (!melhor || score > melhor.score) melhor = { nome: c.nome, score };
  }
  if (melhor) return { nome: melhor.nome, documento };

  const rotulo = texto.match(
    /(?:cliente|raz[aã]o\s*social|nome\s*fantasia|destinat[aá]rio|comprador)\s*[:\-]?\s*([^\n\r]{3,80})/i,
  );
  if (rotulo?.[1]) {
    return { nome: rotulo[1].trim().replace(/\s{2,}/g, " "), documento };
  }

  return { nome: null, documento };
}

function parseQuantidadeProxima(trecho: string): { quantidade: number; unidade: string | null } | null {
  const patterns = [
    /\b(\d+(?:[.,]\d+)?)\s*(un|und|unid|unidade|unidades|kg|g|cx|caixa|pacote|pct|bandeja|bdj)\b/i,
    /\b(?:qtd|qtde|quantidade|qty)\s*[:\-]?\s*(\d+(?:[.,]\d+)?)/i,
    /\bx\s*(\d+(?:[.,]\d+)?)\b/i,
    /\b(\d+(?:[.,]\d+)?)\s*$/i,
  ];
  for (const re of patterns) {
    const m = trecho.match(re);
    if (!m) continue;
    const raw = (m[1] ?? "").replace(",", ".");
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0 || n > 50_000) continue;
    const unidade = m[2] ? String(m[2]).toLowerCase() : null;
    return { quantidade: n, unidade };
  }
  return null;
}

/**
 * Procura produtos do catálogo no texto e tenta achar quantidade na mesma linha / vizinha.
 */
export function extrairItensDoTexto(
  texto: string,
  produtos: ProdutoCatalogoImport[],
): ExtracaoTexto["itens"] {
  const linhas = texto
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const encontrados = new Map<
    string,
    { nome: string; quantidade: number; unidade: string | null; score: number }
  >();

  const catalogoOrdenado = [...produtos].sort(
    (a, b) => normalizarTexto(b.nome).length - normalizarTexto(a.nome).length,
  );

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i]!;
    const linhaNorm = normalizarTexto(linha);
    if (!linhaNorm) continue;

    for (const p of catalogoOrdenado) {
      const nomeNorm = normalizarTexto(p.nome);
      if (nomeNorm.length < 3) continue;
      const skuNorm = p.sku ? normalizarTexto(p.sku) : "";
      const hitNome = linhaNorm.includes(nomeNorm);
      const hitSku = Boolean(skuNorm) && (linhaNorm === skuNorm || linhaNorm.includes(` ${skuNorm} `));
      if (!hitNome && !hitSku) continue;

      const vizinho = [linha, linhas[i + 1] ?? "", linhas[i - 1] ?? ""].join(" ");
      const qtd = parseQuantidadeProxima(vizinho) ?? parseQuantidadeProxima(linha);
      if (!qtd) continue;

      const score = (hitNome ? nomeNorm.length : 0) + (hitSku ? 20 : 0);
      const prev = encontrados.get(p.id);
      if (!prev || score > prev.score) {
        encontrados.set(p.id, {
          nome: p.nome,
          quantidade: qtd.quantidade,
          unidade: qtd.unidade,
          score,
        });
      }
    }
  }

  // Fallback: linhas tipo "Produto .... 10" sem match exato — deixa para o usuário
  return [...encontrados.values()].map((v) => ({
    nome: v.nome,
    quantidade: v.quantidade,
    unidade: v.unidade,
    observacoes: null,
  }));
}

export function extrairPedidoDoTexto(
  textoBruto: string,
  clientes: ClienteCatalogoImport[],
  produtos: ProdutoCatalogoImport[],
): ExtracaoTexto {
  const texto = textoBruto.replace(/\u0000/g, " ").trim();
  const avisos: string[] = [];

  if (!texto || texto.length < 20) {
    return {
      clienteNome: null,
      clienteDocumento: null,
      dataEntrega: null,
      tipoVenda: null,
      observacoes: null,
      notaRegra: null,
      confianca: 0.1,
      avisos: [
        "PDF sem texto legível (pode ser imagem/scan). Use um PDF com texto selecionável ou preencha manualmente.",
      ],
      itens: [],
    };
  }

  const { nome: clienteNome, documento: clienteDocumento } = encontrarClienteNoTexto(
    texto,
    clientes,
  );
  const dataEntrega = extrairDataEntrega(texto);
  const itens = extrairItensDoTexto(texto, produtos);

  if (!clienteNome && !clienteDocumento) {
    avisos.push("Cliente não identificado automaticamente — selecione na lista.");
  }
  if (itens.length === 0) {
    avisos.push(
      "Nenhum item do catálogo operacional foi encontrado no texto. Ajuste manualmente na tela.",
    );
  }

  let confianca = 0.35;
  if (clienteNome || clienteDocumento) confianca += 0.25;
  if (itens.length > 0) confianca += Math.min(0.35, itens.length * 0.07);
  if (dataEntrega) confianca += 0.05;

  return {
    clienteNome,
    clienteDocumento,
    dataEntrega,
    tipoVenda: null,
    observacoes: null,
    notaRegra: null,
    confianca: Math.min(0.95, confianca),
    avisos,
    itens,
  };
}

async function extrairTextoPdf(pdfBase64: string): Promise<string> {
  const rawB64 = pdfBase64.replace(/^data:application\/pdf;base64,/i, "").trim();
  const buffer = Buffer.from(rawB64, "base64");
  const parsed = await pdfParse(buffer);
  return String(parsed.text ?? "");
}

export async function analisarPedidoPdf(params: {
  pdfBase64: string;
  arquivoNome: string;
  clientes: ClienteCatalogoImport[];
  produtos: ProdutoCatalogoImport[];
}): Promise<DraftImportarPedidoPdf> {
  if (!params.pdfBase64?.trim()) {
    throw new Error("PDF vazio.");
  }
  if (params.pdfBase64.length > 16_000_000) {
    throw new Error("PDF muito grande (máx. ~12 MB).");
  }

  let texto: string;
  try {
    texto = await extrairTextoPdf(params.pdfBase64);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "falha desconhecida";
    throw new Error(`Não foi possível ler o PDF: ${msg}`);
  }

  const extracao = extrairPedidoDoTexto(texto, params.clientes, params.produtos);
  const clienteMatch = matchClienteImport(
    params.clientes,
    extracao.clienteNome,
    extracao.clienteDocumento,
  );

  const itens: ItemDraftImportPdf[] = extracao.itens.map((item) => {
    const match = matchProdutoImport(params.produtos, item.nome);
    const status: StatusMatchImportPdf = match.status;
    return {
      chave: randomUUID(),
      nomePdf: item.nome,
      quantidade: item.quantidade,
      unidadePdf: item.unidade,
      observacoes: item.observacoes,
      produtoId: match.produtoId,
      nomeResolvido: match.nomeResolvido,
      candidatos: match.candidatos,
      status,
    };
  });

  const avisos = [...extracao.avisos];
  if (clienteMatch.status !== "ok") {
    avisos.push("Cliente precisa de confirmação manual.");
  }
  if (itens.some((i) => i.status !== "ok")) {
    avisos.push("Há itens sem match automático de produto.");
  }

  return {
    arquivoNome: params.arquivoNome || "pedido.pdf",
    modeloUsado: "pdf-parse (sem OpenAI)",
    cliente: {
      nomePdf: extracao.clienteNome ?? "",
      documentoPdf: extracao.clienteDocumento,
      ...clienteMatch,
    },
    itens,
    dataEntregaSugerida: extracao.dataEntrega,
    tipoVendaSugerido: tipoVendaFromTexto(extracao.tipoVenda),
    observacoesPedido: extracao.observacoes,
    notaRegraSugerida: extracao.notaRegra,
    avisos,
    confiancaGeral: extracao.confianca,
  };
}
