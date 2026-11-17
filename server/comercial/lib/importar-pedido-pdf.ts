import OpenAI from "openai";
import { randomUUID } from "crypto";
import { ENV } from "../../_core/env";
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

type ExtracaoLlm = {
  clienteNome: string | null;
  clienteDocumento: string | null;
  dataEntrega: string | null;
  tipoVenda: string | null;
  observacoes: string | null;
  notaRegra: string | null;
  confianca: number | null;
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

function parseJsonObject(text: string): ExtracaoLlm {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced?.[1]?.trim() ?? trimmed;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("Resposta do modelo sem JSON de pedido.");
  }
  const parsed = JSON.parse(raw.slice(start, end + 1)) as ExtracaoLlm;
  return {
    clienteNome: typeof parsed.clienteNome === "string" ? parsed.clienteNome.trim() : null,
    clienteDocumento:
      typeof parsed.clienteDocumento === "string" ? parsed.clienteDocumento.trim() : null,
    dataEntrega:
      typeof parsed.dataEntrega === "string" && /^\d{4}-\d{2}-\d{2}/.test(parsed.dataEntrega)
        ? parsed.dataEntrega.slice(0, 10)
        : null,
    tipoVenda: typeof parsed.tipoVenda === "string" ? parsed.tipoVenda.trim() : null,
    observacoes: typeof parsed.observacoes === "string" ? parsed.observacoes.trim() : null,
    notaRegra: typeof parsed.notaRegra === "string" ? parsed.notaRegra.trim() : null,
    confianca:
      typeof parsed.confianca === "number" && Number.isFinite(parsed.confianca)
        ? Math.max(0, Math.min(1, parsed.confianca))
        : null,
    avisos: Array.isArray(parsed.avisos)
      ? parsed.avisos.map(String).map((a) => a.trim()).filter(Boolean)
      : [],
    itens: Array.isArray(parsed.itens)
      ? parsed.itens
          .map((row) => {
            if (!row || typeof row !== "object") return null;
            const r = row as Record<string, unknown>;
            const nome = String(r.nome ?? "").trim();
            const quantidade = Number(r.quantidade);
            if (!nome || !Number.isFinite(quantidade) || quantidade <= 0) return null;
            return {
              nome,
              quantidade,
              unidade: typeof r.unidade === "string" ? r.unidade.trim() || null : null,
              observacoes:
                typeof r.observacoes === "string" ? r.observacoes.trim() || null : null,
            };
          })
          .filter((x): x is NonNullable<typeof x> => Boolean(x))
      : [],
  };
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

function tipoVendaFromLlm(raw: string | null): TipoVendaImportPdf | null {
  if (!raw) return null;
  const n = raw.trim().toUpperCase().replace(/\s+/g, "_");
  return (TIPOS_VENDA_IMPORT_PDF as readonly string[]).includes(n)
    ? (n as TipoVendaImportPdf)
    : null;
}

function buildPromptCatalogo(
  clientes: ClienteCatalogoImport[],
  produtos: ProdutoCatalogoImport[],
): string {
  const cli = clientes
    .slice(0, 250)
    .map((c) => `- ${c.nome}${c.cnpjCpf ? ` | doc ${c.cnpjCpf}` : ""}`)
    .join("\n");
  const prod = produtos
    .slice(0, 300)
    .map((p) => `- ${p.nome}${p.sku ? ` | sku ${p.sku}` : ""}`)
    .join("\n");
  return `Clientes cadastrados (amostra):\n${cli || "(vazio)"}\n\nProdutos operacionais:\n${prod || "(vazio)"}`;
}

async function extrairPedidoDoPdfComLlm(params: {
  pdfBase64: string;
  arquivoNome: string;
  clientes: ClienteCatalogoImport[];
  produtos: ProdutoCatalogoImport[];
}): Promise<{ extracao: ExtracaoLlm; modeloUsado: string }> {
  const key = ENV.openAiApiKey?.trim();
  if (!key) {
    throw new Error("OPENAI_API_KEY não configurada no servidor.");
  }
  const client = new OpenAI({ apiKey: key });
  const model = ENV.openAiResponsesModel || "gpt-5.4-mini";
  const catalogo = buildPromptCatalogo(params.clientes, params.produtos);

  const instructions = `Você extrai pedidos de compra/entrega em PDF para a Fazendas Up (hidroponia / hortifruti B2B).
PDFs vêm de clientes com layouts diferentes (e-mail impresso, planilha, pedido próprio, WhatsApp exportado, etc.).
Leia o PDF com atenção e devolva SOMENTE um JSON válido (sem markdown) no formato:

{
  "clienteNome": string|null,
  "clienteDocumento": string|null,
  "dataEntrega": "YYYY-MM-DD"|null,
  "tipoVenda": "RECORRENTE_SEMANAL"|"RECORRENTE_QUINZENAL"|"PLANO"|"AVULSO"|null,
  "observacoes": string|null,
  "notaRegra": string|null,
  "confianca": number,
  "avisos": string[],
  "itens": [{"nome": string, "quantidade": number, "unidade": string|null, "observacoes": string|null}]
}

Regras:
- Use nomes de produto o mais próximos possíveis do catálogo operacional abaixo (quando fizer sentido).
- Quantidades numéricas (aceite decimais). Ignore totais em R$ como itens.
- Se houver vários possíveis clientes, escolha o mais provável e registre aviso.
- notaRegra: só se o PDF indicar preferência recorrente do cliente (ex.: dia fixo, frete, embalagem).
- confianca entre 0 e 1.

${catalogo}`;

  const rawB64 = params.pdfBase64.replace(/^data:application\/pdf;base64,/i, "").trim();
  const resp = await client.responses.create({
    model,
    instructions,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_file",
            filename: params.arquivoNome || "pedido.pdf",
            file_data: `data:application/pdf;base64,${rawB64}`,
          },
          {
            type: "input_text",
            text: "Extraia o pedido deste PDF no JSON pedido.",
          },
        ],
      },
    ],
    max_output_tokens: 4096,
  });

  const text = resp.output_text?.trim() ?? "";
  if (!text) {
    throw new Error("Modelo não retornou texto ao ler o PDF.");
  }
  return { extracao: parseJsonObject(text), modeloUsado: String(resp.model ?? model) };
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
  // ~12 MB raw ≈ 16 MB base64 — margem sob body 50mb
  if (params.pdfBase64.length > 16_000_000) {
    throw new Error("PDF muito grande (máx. ~12 MB).");
  }

  const { extracao, modeloUsado } = await extrairPedidoDoPdfComLlm(params);
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
  if (!extracao.itens.length) {
    avisos.push("Nenhum item reconhecido no PDF — revise manualmente.");
  }
  if (clienteMatch.status !== "ok") {
    avisos.push("Cliente precisa de confirmação manual.");
  }
  if (itens.some((i) => i.status !== "ok")) {
    avisos.push("Há itens sem match automático de produto.");
  }

  return {
    arquivoNome: params.arquivoNome || "pedido.pdf",
    modeloUsado,
    cliente: {
      nomePdf: extracao.clienteNome ?? "",
      documentoPdf: extracao.clienteDocumento,
      ...clienteMatch,
    },
    itens,
    dataEntregaSugerida: extracao.dataEntrega,
    tipoVendaSugerido: tipoVendaFromLlm(extracao.tipoVenda),
    observacoesPedido: extracao.observacoes,
    notaRegraSugerida: extracao.notaRegra,
    avisos,
    confiancaGeral: extracao.confianca ?? 0.5,
  };
}
