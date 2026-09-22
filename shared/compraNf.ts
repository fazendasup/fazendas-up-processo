/** Domínio de compras com NF (itens × fornecedor) para relatório de volume. */

export type CompraNfFonte = "xml" | "conta_azul" | "manual";

export type CompraNfItemParsed = {
  nItem: number | null;
  codigo: string | null;
  descricao: string;
  quantidade: number;
  unidade: string | null;
  valorUnitario: number | null;
  valorTotal: number;
};

export type CompraNfParsed = {
  chaveAcesso: string | null;
  numero: string | null;
  serie: string | null;
  dataEmissao: string;
  fornecedorNome: string;
  fornecedorCnpj: string | null;
  valorTotal: number;
  itens: CompraNfItemParsed[];
};

export type CompraNfItemRow = {
  id: number;
  compraNfId: number;
  descricao: string;
  quantidade: number;
  unidade: string | null;
  valorTotal: number;
  dataEmissao: string;
  fornecedorNome: string;
  numero: string | null;
  chaveAcesso: string | null;
  fonte: CompraNfFonte;
};

export type CompraNfFornecedorAgg = {
  fornecedor: string;
  quantidade: number;
  valorTotal: number;
  notas: number;
  unidades: string[];
  produtos: Array<{
    produto: string;
    quantidade: number;
    unidade: string | null;
    valorTotal: number;
  }>;
};

export type CompraNfProdutoAgg = {
  produto: string;
  quantidade: number;
  valorTotal: number;
  unidade: string | null;
  fornecedores: number;
};

function textOf(xml: string, tag: string): string | null {
  const re = new RegExp(
    `<${tag}(?:\\s[^>]*)?>([^<]*)</${tag}>`,
    "i",
  );
  const m = xml.match(re);
  return m?.[1]?.trim() || null;
}

function allDetBlocks(xml: string): string[] {
  const out: string[] = [];
  const re = /<det\b[^>]*>([\s\S]*?)<\/det>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    out.push(m[0]);
  }
  return out;
}

function parseDecimalBr(raw: string | null | undefined): number {
  if (!raw) return 0;
  const n = Number(String(raw).trim().replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function normalizarDataEmissao(raw: string | null): string {
  if (!raw) return "1970-01-01";
  const iso = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso.slice(0, 10);
  const br = iso.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return "1970-01-01";
}

function extrairChave(xml: string): string | null {
  const fromId = xml.match(/Id=["']NFe(\d{44})["']/i);
  if (fromId?.[1]) return fromId[1];
  const fromTag = textOf(xml, "chNFe");
  if (fromTag && /^\d{44}$/.test(fromTag)) return fromTag;
  const loose = xml.match(/\b(\d{44})\b/);
  return loose?.[1] ?? null;
}

/** Extrai cabeçalho + itens de um XML de NF-e (entrada ou emitida). */
export function parseNfeXml(xmlRaw: string): CompraNfParsed {
  const xml = xmlRaw.replace(/^\uFEFF/, "").trim();
  if (!xml.includes("<") || !/<(?:nfeProc|NFe|infNFe)\b/i.test(xml)) {
    throw new Error("Arquivo não parece ser um XML de NF-e.");
  }

  const chaveAcesso = extrairChave(xml);
  const numero = textOf(xml, "nNF");
  const serie = textOf(xml, "serie");
  const dataEmissao = normalizarDataEmissao(
    textOf(xml, "dhEmi") ?? textOf(xml, "dEmi"),
  );
  // Em NF de compra, o fornecedor é o emitente.
  const emitBlock = xml.match(/<emit\b[^>]*>([\s\S]*?)<\/emit>/i)?.[1] ?? xml;
  const fornecedorNome =
    textOf(emitBlock, "xNome")?.trim() ||
    textOf(emitBlock, "xFant")?.trim() ||
    "Fornecedor sem nome";
  const fornecedorCnpj =
    textOf(emitBlock, "CNPJ") ?? textOf(emitBlock, "CPF");
  const valorTotal =
    parseDecimalBr(textOf(xml, "vNF")) ||
    parseDecimalBr(textOf(xml, "vProd"));

  const itens: CompraNfItemParsed[] = [];
  for (const det of allDetBlocks(xml)) {
    const nItemRaw = det.match(/<det\b[^>]*\bnItem=["']?(\d+)/i)?.[1];
    const descricao = textOf(det, "xProd")?.trim();
    if (!descricao) continue;
    const quantidade = parseDecimalBr(textOf(det, "qCom"));
    const unidade = textOf(det, "uCom");
    const valorUnitario = parseDecimalBr(textOf(det, "vUnCom"));
    const valorItem =
      parseDecimalBr(textOf(det, "vProd")) ||
      (quantidade > 0 && valorUnitario > 0 ? quantidade * valorUnitario : 0);
    itens.push({
      nItem: nItemRaw ? Number(nItemRaw) : null,
      codigo: textOf(det, "cProd"),
      descricao,
      quantidade,
      unidade,
      valorUnitario: valorUnitario || null,
      valorTotal: valorItem,
    });
  }

  if (itens.length === 0) {
    throw new Error("NF-e sem itens de produto (det/prod).");
  }

  return {
    chaveAcesso,
    numero,
    serie,
    dataEmissao,
    fornecedorNome,
    fornecedorCnpj,
    valorTotal: valorTotal || itens.reduce((s, i) => s + i.valorTotal, 0),
    itens,
  };
}

export function produtoBateFiltro(
  descricao: string,
  filtro: string | null | undefined,
): boolean {
  const f = (filtro ?? "").trim().toLowerCase();
  if (!f) return true;
  return descricao.toLowerCase().includes(f);
}

export function agregarComprasPorFornecedor(
  itens: CompraNfItemRow[],
  filtroProduto?: string | null,
): {
  fornecedores: CompraNfFornecedorAgg[];
  produtos: CompraNfProdutoAgg[];
  totais: { quantidade: number; valorTotal: number; notas: number; itens: number };
} {
  const filtrados = itens.filter(i =>
    produtoBateFiltro(i.descricao, filtroProduto),
  );

  const porForn = new Map<
    string,
    {
      quantidade: number;
      valorTotal: number;
      notas: Set<number>;
      unidades: Set<string>;
      produtos: Map<
        string,
        { quantidade: number; valorTotal: number; unidade: string | null }
      >;
    }
  >();
  const porProd = new Map<
    string,
    {
      quantidade: number;
      valorTotal: number;
      unidade: string | null;
      fornecedores: Set<string>;
    }
  >();

  for (const row of filtrados) {
    const forn = row.fornecedorNome.trim() || "—";
    let bucket = porForn.get(forn);
    if (!bucket) {
      bucket = {
        quantidade: 0,
        valorTotal: 0,
        notas: new Set(),
        unidades: new Set(),
        produtos: new Map(),
      };
      porForn.set(forn, bucket);
    }
    bucket.quantidade += row.quantidade;
    bucket.valorTotal += row.valorTotal;
    bucket.notas.add(row.compraNfId);
    if (row.unidade) bucket.unidades.add(row.unidade);
    const prodKey = row.descricao.trim();
    const p = bucket.produtos.get(prodKey) ?? {
      quantidade: 0,
      valorTotal: 0,
      unidade: row.unidade,
    };
    p.quantidade += row.quantidade;
    p.valorTotal += row.valorTotal;
    if (!p.unidade && row.unidade) p.unidade = row.unidade;
    bucket.produtos.set(prodKey, p);

    let pb = porProd.get(prodKey);
    if (!pb) {
      pb = {
        quantidade: 0,
        valorTotal: 0,
        unidade: row.unidade,
        fornecedores: new Set(),
      };
      porProd.set(prodKey, pb);
    }
    pb.quantidade += row.quantidade;
    pb.valorTotal += row.valorTotal;
    if (!pb.unidade && row.unidade) pb.unidade = row.unidade;
    pb.fornecedores.add(forn);
  }

  const fornecedores: CompraNfFornecedorAgg[] = Array.from(porForn.entries())
    .map(([fornecedor, b]) => ({
      fornecedor,
      quantidade: round4(b.quantidade),
      valorTotal: round2(b.valorTotal),
      notas: b.notas.size,
      unidades: Array.from(b.unidades).sort(),
      produtos: Array.from(b.produtos.entries())
        .map(([produto, p]) => ({
          produto,
          quantidade: round4(p.quantidade),
          unidade: p.unidade,
          valorTotal: round2(p.valorTotal),
        }))
        .sort((a, b) => b.quantidade - a.quantidade || a.produto.localeCompare(b.produto)),
    }))
    .sort((a, b) => b.quantidade - a.quantidade || a.fornecedor.localeCompare(b.fornecedor));

  const produtos: CompraNfProdutoAgg[] = Array.from(porProd.entries())
    .map(([produto, b]) => ({
      produto,
      quantidade: round4(b.quantidade),
      valorTotal: round2(b.valorTotal),
      unidade: b.unidade,
      fornecedores: b.fornecedores.size,
    }))
    .sort((a, b) => b.quantidade - a.quantidade || a.produto.localeCompare(b.produto));

  const notas = new Set(filtrados.map(i => i.compraNfId));
  return {
    fornecedores,
    produtos,
    totais: {
      quantidade: round4(filtrados.reduce((s, i) => s + i.quantidade, 0)),
      valorTotal: round2(filtrados.reduce((s, i) => s + i.valorTotal, 0)),
      notas: notas.size,
      itens: filtrados.length,
    },
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}
