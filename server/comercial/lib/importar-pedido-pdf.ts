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

type ItemExtraido = {
  nome: string;
  quantidade: number;
  unidade: string | null;
  observacoes: string | null;
  sku?: string | null;
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
  itens: ItemExtraido[];
};

function normalizarTexto(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Remove peso do nome (150G, 120GR, 0,15kg) para não virar quantidade nem atrapalhar match. */
export function stripPesoDoNome(nome: string): string {
  return nome
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:kg|g|gr|gramas?)\b/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function soDigitos(s: string | null | undefined): string {
  return String(s ?? "").replace(/\D/g, "");
}

function scoreNome(query: string, candidato: string): number {
  const q = normalizarTexto(stripPesoDoNome(query));
  const c = normalizarTexto(stripPesoDoNome(candidato));
  if (!q || !c) return 0;
  if (q === c) return 100;
  if (c.includes(q) || q.includes(c)) return 80;
  const qTokens = new Set(q.split(" ").filter((t) => t.length > 1));
  const cTokens = c.split(" ").filter((t) => t.length > 1);
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
    const porDoc = clientes.filter((c) => {
      const d = soDigitos(c.cnpjCpf);
      return d === digitos || d.endsWith(digitos.slice(-12)) || digitos.endsWith(d.slice(-12));
    });
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
  skuPdf?: string | null,
): Pick<ItemDraftImportPdf, "produtoId" | "nomeResolvido" | "candidatos" | "status"> {
  const sku = skuPdf?.trim() ?? "";
  if (sku) {
    const skuNorm = normalizarTexto(sku);
    const bySku = produtos.find((p) => p.sku && normalizarTexto(p.sku) === skuNorm);
    if (bySku) {
      return {
        produtoId: bySku.id,
        nomeResolvido: bySku.nome,
        candidatos: [{ id: bySku.id, nome: bySku.nome, detalhe: bySku.sku }],
        status: "ok",
      };
    }
  }

  const nome = stripPesoDoNome(nomePdf.trim());
  if (!nome) {
    return { produtoId: null, nomeResolvido: null, candidatos: [], status: "nao_encontrado" };
  }

  const bySkuNome = produtos.find(
    (p) => p.sku && normalizarTexto(p.sku) === normalizarTexto(nome),
  );
  if (bySkuNome) {
    return {
      produtoId: bySkuNome.id,
      nomeResolvido: bySkuNome.nome,
      candidatos: [{ id: bySkuNome.id, nome: bySkuNome.nome, detalhe: bySkuNome.sku }],
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

  if (empate.length === 1 && top.score >= 70) {
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
    /(?:previs[aã]o\s*de\s*entrega|data\s*limite\s*para\s*entrega|data\s*(?:de\s*)?(?:entrega|pedido)|entrega|agendar|para o dia|dias\s*p\/?\s*entrega)[^\d]{0,24}(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i,
  );
  if (rotulada?.[1]) {
    const iso = parseDataBrParaIso(rotulada[1]);
    if (iso) return iso;
  }
  // "0 - 16/11/2026" (Vitória) ou "16/11/2026Previsão"
  const prevAntes = texto.match(/(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})\s*Previs/i);
  if (prevAntes?.[1]) {
    const iso = parseDataBrParaIso(prevAntes[1]);
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
      ? clientes.find((c) => {
          const d = soDigitos(c.cnpjCpf);
          const dig = soDigitos(documento);
          return d === dig || d.endsWith(dig.slice(-12)) || dig.endsWith(d.slice(-12));
        })
      : null;
  if (porDoc) return { nome: porDoc.nome, documento };

  let melhor: { nome: string; score: number } | null = null;
  for (const c of clientes) {
    const nomeNorm = normalizarTexto(c.nome);
    if (nomeNorm.length < 4) continue;
    if (!textoNorm.includes(nomeNorm) && !nomeNorm.split(" ").some((t) => t.length > 4 && textoNorm.includes(t))) {
      // tenta tokens fortes
      const tokens = nomeNorm.split(" ").filter((t) => t.length >= 5);
      const hits = tokens.filter((t) => textoNorm.includes(t)).length;
      if (tokens.length === 0 || hits < Math.min(2, tokens.length)) continue;
    } else if (!textoNorm.includes(nomeNorm)) {
      const tokens = nomeNorm.split(" ").filter((t) => t.length >= 5);
      const hits = tokens.filter((t) => textoNorm.includes(t)).length;
      if (hits < Math.min(2, tokens.length)) continue;
    }
    const score = nomeNorm.length;
    if (!melhor || score > melhor.score) melhor = { nome: c.nome, score };
  }
  // match explícito Mercantil / Vitória / etc. por contains
  for (const c of clientes) {
    const nomeNorm = normalizarTexto(c.nome);
    if (nomeNorm.length >= 8 && textoNorm.includes(nomeNorm)) {
      return { nome: c.nome, documento };
    }
  }
  if (melhor) return { nome: melhor.nome, documento };

  const empresa = texto.match(
    /(?:empresa|supermercado|cliente|raz[aã]o\s*social|nome\s*fantasia)\s*[:\-]?\s*([^\n\r]{3,80})/i,
  );
  if (empresa?.[1]) {
    return { nome: empresa[1].trim().replace(/\s{2,}/g, " "), documento };
  }
  if (/mercantil\s+nova\s+era/i.test(texto)) {
    return { nome: "MERCANTIL NOVA ERA LTDA", documento };
  }
  if (/supermercado\s+vit[oó]ria/i.test(texto)) {
    return { nome: "Supermercado Vitória", documento };
  }

  return { nome: null, documento };
}

/**
 * Quantidade operacional — NUNCA usa g/kg/gr (peso da embalagem).
 */
export function parseQuantidadeProxima(
  trecho: string,
): { quantidade: number; unidade: string | null } | null {
  const semPeso = trecho.replace(/\b\d+(?:[.,]\d+)?\s*(?:kg|g|gr|gramas?)\b/gi, " ");
  const patterns: Array<{ re: RegExp; qtdIdx: number; undIdx?: number }> = [
    {
      re: /\b(\d+(?:[.,]\d+)?)\s*(un|und|unid|unidade|unidades|cx|caixa|pacote|pct|bandeja|bdj)\b/i,
      qtdIdx: 1,
      undIdx: 2,
    },
    { re: /\b(?:qtd|qtde|quantidade|qty)\s*[:\-]?\s*(\d+(?:[.,]\d+)?)/i, qtdIdx: 1 },
    { re: /\bx\s*(\d+(?:[.,]\d+)?)\b/i, qtdIdx: 1 },
    { re: /,0001,000(\d+),000\b/, qtdIdx: 1 },
  ];
  for (const { re, qtdIdx, undIdx } of patterns) {
    const m = semPeso.match(re);
    if (!m) continue;
    const raw = (m[qtdIdx] ?? "").replace(",", ".");
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0 || n > 50_000) continue;
    const unidade = undIdx && m[undIdx] ? String(m[undIdx]).toLowerCase() : null;
    return { quantidade: n, unidade };
  }
  return null;
}

/** Ordem de compra Vitória / Rel_*: `,0001,000{QTD},000` + SKU + EAN + descrição. */
export function extrairItensOrdemCompraRel(texto: string): ItemExtraido[] {
  const flat = texto.replace(/\r/g, "").replace(/\s+/g, " ");
  const re =
    /,0001,000(\d+),000\s+([A-Z0-9]{3,12})\s+(\d{8,14})\s+([A-ZÁÉÍÓÚÃÕÇ0-9 ]+?)(?=\s+\d+[.,]\d+|\s+Sr\.|$)/gi;
  const itens: ItemExtraido[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(flat))) {
    const quantidade = Number(m[1]);
    if (!(quantidade > 0)) continue;
    const sku = m[2]!;
    const nome = stripPesoDoNome(m[4]!.replace(/\s+/g, " ").trim());
    if (nome.length < 3) continue;
    itens.push({
      nome,
      quantidade,
      unidade: "un",
      observacoes: null,
      sku,
    });
  }
  return itens;
}

function flattenTotvsTexto(texto: string): string {
  return texto
    .replace(/\r/g, "")
    // "02\n0,00UN" → "020,00UN"
    .replace(/(\d)\s+(\d),(\d{2})UN\b/gi, "$1$2,$3UN")
    .replace(/,(\d)\s+(\d)UN\b/gi, ",$1$2UN")
    .replace(/,(\d{2})\s+UN\b/gi, ",$1UN")
    .replace(/,\s+/g, ",")
    .replace(/\s+UN\s+/gi, "UN ")
    .replace(/\s+/g, " ");
}

/** TOTVS RelPedSuprim: quantidade zero-padded `005,00UN` / `010,00UN` + produto + REF. */
export function extrairItensTotvsRelPedSuprim(texto: string): {
  itens: ItemExtraido[];
  pedidosDetectados: number;
} {
  const flat = flattenTotvsTexto(texto);
  const pedidosDetectados = new Set(
    [...flat.matchAll(/PEDIDO DE\s+COMPRAS\s+(\d+)/gi)].map((m) => m[1]!),
  ).size;

  const re =
    /(\d{3}),00UN\s*(\d+)\s*([A-ZÁÉÍÓÚÃÕÇ][A-ZÁÉÍÓÚÃÕÇ ]{0,80}?)(?=FAZENDAS|FAZENDA|-?\s*REF:|REF:|EANs:|\d{5,}|$)/gi;

  const bruto: ItemExtraido[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(flat))) {
    const quantidade = Number(m[1]);
    if (!(quantidade > 0)) continue;
    let nome = m[3]!.replace(/\s+/g, " ").trim().replace(/FAZENDAS.*$/i, "").trim();
    nome = stripPesoDoNome(nome);
    if (nome.length < 3) continue;
    const around = flat.slice(m.index, m.index + m[0].length + 120);
    const ref = around.match(/REF:\s*([A-Z0-9]+)/i)?.[1] ?? null;
    bruto.push({
      nome,
      quantidade,
      unidade: "un",
      observacoes: null,
      sku: ref,
    });
  }

  // Soma quantidades quando o PDF traz vários pátios/pedidos
  const agg = new Map<string, ItemExtraido>();
  for (const item of bruto) {
    const key = normalizarTexto(item.sku || item.nome);
    const prev = agg.get(key);
    if (prev) {
      prev.quantidade += item.quantidade;
    } else {
      agg.set(key, { ...item });
    }
  }

  return { itens: [...agg.values()], pedidosDetectados };
}

/**
 * Fallback genérico: casa nomes do catálogo e busca quantidade (sem peso).
 */
export function extrairItensDoTexto(
  texto: string,
  produtos: ProdutoCatalogoImport[],
): ItemExtraido[] {
  const linhas = texto
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const encontrados = new Map<
    string,
    { nome: string; quantidade: number; unidade: string | null; sku: string | null; score: number }
  >();

  const catalogoOrdenado = [...produtos].sort(
    (a, b) => normalizarTexto(b.nome).length - normalizarTexto(a.nome).length,
  );

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i]!;
    const linhaNorm = normalizarTexto(linha);
    if (!linhaNorm) continue;

    for (const p of catalogoOrdenado) {
      const nomeNorm = normalizarTexto(stripPesoDoNome(p.nome));
      if (nomeNorm.length < 3) continue;
      const skuNorm = p.sku ? normalizarTexto(p.sku) : "";
      const hitNome = linhaNorm.includes(nomeNorm);
      const hitSku =
        Boolean(skuNorm) &&
        (linhaNorm === skuNorm ||
          linhaNorm.includes(` ${skuNorm} `) ||
          linhaNorm.includes(skuNorm));
      if (!hitNome && !hitSku) continue;

      const vizinho = [linhas[i - 1] ?? "", linha, linhas[i + 1] ?? ""].join(" ");
      const qtd = parseQuantidadeProxima(vizinho) ?? parseQuantidadeProxima(linha);
      if (!qtd) continue;

      const score = (hitNome ? nomeNorm.length : 0) + (hitSku ? 30 : 0);
      const prev = encontrados.get(p.id);
      if (!prev || score > prev.score) {
        encontrados.set(p.id, {
          nome: p.nome,
          quantidade: qtd.quantidade,
          unidade: qtd.unidade,
          sku: p.sku,
          score,
        });
      }
    }
  }

  return [...encontrados.values()].map((v) => ({
    nome: v.nome,
    quantidade: v.quantidade,
    unidade: v.unidade,
    observacoes: null,
    sku: v.sku,
  }));
}

function detectarFormato(texto: string): "rel_vitoria" | "totvs_relped" | "generico" {
  if (/RelPedSuprim|TOTVS\s+Varejo|PEDIDO DE\s+COMPRAS/i.test(texto) && /\dUN\s*\d*[A-Z]/i.test(texto.replace(/\s+/g, ""))) {
    return "totvs_relped";
  }
  if (/Ordem de Compra|,0001,000\d+,000/i.test(texto)) {
    return "rel_vitoria";
  }
  return "generico";
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

  const formato = detectarFormato(texto);
  const { nome: clienteNome, documento: clienteDocumento } = encontrarClienteNoTexto(
    texto,
    clientes,
  );
  let dataEntrega = extrairDataEntrega(texto);
  let itens: ItemExtraido[] = [];

  if (formato === "rel_vitoria") {
    itens = extrairItensOrdemCompraRel(texto);
    avisos.push("Layout Ordem de Compra (Rel_) detectado — quantidade lida da coluna Pedido, não do peso (g).");
  } else if (formato === "totvs_relped") {
    const totvs = extrairItensTotvsRelPedSuprim(texto);
    itens = totvs.itens;
    if (totvs.pedidosDetectados > 1) {
      avisos.push(
        `PDF TOTVS com ${totvs.pedidosDetectados} pedidos/pátios — quantidades somadas por produto. Confira se quer um lançamento só ou separar por loja.`,
      );
    } else {
      avisos.push("Layout TOTVS RelPedSuprim detectado.");
    }
  }

  if (itens.length === 0) {
    itens = extrairItensDoTexto(texto, produtos);
  }

  if (!clienteNome && !clienteDocumento) {
    avisos.push("Cliente não identificado automaticamente — selecione na lista.");
  }
  if (itens.length === 0) {
    avisos.push(
      "Nenhum item reconhecido no texto. Ajuste manualmente na tela.",
    );
  }

  let confianca = 0.35;
  if (clienteNome || clienteDocumento) confianca += 0.2;
  if (itens.length > 0) confianca += Math.min(0.4, itens.length * 0.04);
  if (dataEntrega) confianca += 0.05;
  if (formato !== "generico") confianca = Math.min(0.95, confianca + 0.1);

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
    const match = matchProdutoImport(params.produtos, item.nome, item.sku);
    return {
      chave: randomUUID(),
      nomePdf: item.sku ? `${item.nome} [${item.sku}]` : item.nome,
      quantidade: item.quantidade,
      unidadePdf: item.unidade,
      observacoes: item.observacoes,
      produtoId: match.produtoId,
      nomeResolvido: match.nomeResolvido,
      candidatos: match.candidatos,
      status: match.status,
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
