/**
 * Interpreta frase de pedido em português SEM OpenAI.
 * Ex.: "coloque para quarta 10 manjericões para o spoleto"
 */

function novaChave(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `t-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export type ClienteCatalogoTexto = {
  externalId: string;
  nome: string;
  cnpjCpf?: string | null;
};

export type ProdutoCatalogoTexto = {
  id: string;
  nome: string;
  sku?: string | null;
};

export type StatusMatchTexto = "ok" | "ambiguo" | "nao_encontrado" | "manual";

export type DraftComandoPedidoTexto = {
  fraseOriginal: string;
  modeloUsado: string;
  cliente: {
    nomeTexto: string;
    contaAzulCustomerId: string | null;
    nomeResolvido: string | null;
    candidatos: Array<{ id: string; nome: string; detalhe?: string | null }>;
    status: StatusMatchTexto;
  };
  itens: Array<{
    chave: string;
    nomeTexto: string;
    quantidade: number;
    produtoId: string | null;
    nomeResolvido: string | null;
    candidatos: Array<{ id: string; nome: string; detalhe?: string | null }>;
    status: StatusMatchTexto;
  }>;
  dataEntregaSugerida: string | null;
  avisos: string[];
  confiancaGeral: number;
};

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function stripPeso(nome: string): string {
  return nome.replace(/\b\d+(?:[.,]\d+)?\s*(?:kg|g|gr|gramas?)\b/gi, " ").replace(/\s{2,}/g, " ").trim();
}

function isoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const DIAS: Record<string, number> = {
  domingo: 0,
  dom: 0,
  segunda: 1,
  seg: 1,
  terca: 2,
  ter: 2,
  quarta: 3,
  qua: 3,
  quinta: 4,
  qui: 4,
  sexta: 5,
  sex: 5,
  sabado: 6,
  sab: 6,
};

/** Próxima ocorrência do weekday (0=Dom…6=Sáb). Se hoje for o dia, usa hoje. */
export function proximaDataDoDiaSemana(weekday: number, ref = new Date()): string {
  const d = new Date(ref);
  d.setHours(12, 0, 0, 0);
  const atual = d.getDay();
  let add = (weekday - atual + 7) % 7;
  d.setDate(d.getDate() + add);
  return isoLocal(d);
}

export function extrairDataDaFrase(frase: string, ref = new Date()): string | null {
  const n = normalizar(frase);
  if (/\bhoje\b/.test(n)) return isoLocal(ref);
  if (/\bamanha\b/.test(n)) {
    const d = new Date(ref);
    d.setDate(d.getDate() + 1);
    return isoLocal(d);
  }
  const iso = n.match(/\b(20\d{2})[-\/](\d{1,2})[-\/](\d{1,2})\b/);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]);
    const day = Number(iso[3]);
    if (m >= 1 && m <= 12 && day >= 1 && day <= 31) {
      return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  const br = n.match(/\b(\d{1,2})[-\/](\d{1,2})(?:[-\/](20\d{2}|\d{2}))?\b/);
  if (br) {
    const day = Number(br[1]);
    const m = Number(br[2]);
    let y = br[3] ? Number(br[3]) : ref.getFullYear();
    if (y < 100) y += 2000;
    if (m >= 1 && m <= 12 && day >= 1 && day <= 31) {
      return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  for (const [nome, wd] of Object.entries(DIAS)) {
    if (new RegExp(`\\b${nome}(?:\\s*feira)?\\b`).test(n)) {
      return proximaDataDoDiaSemana(wd, ref);
    }
  }
  return null;
}

function scoreNome(query: string, candidato: string): number {
  const q = normalizar(stripPeso(query));
  const c = normalizar(stripPeso(candidato));
  if (!q || !c) return 0;
  if (q === c) return 100;
  if (c.includes(q) || q.includes(c)) return 85;
  const qTokens = q.split(" ").filter((t) => t.length > 1);
  const cTokens = new Set(c.split(" ").filter((t) => t.length > 1));
  if (!qTokens.length) return 0;
  let hit = 0;
  for (const t of qTokens) if (cTokens.has(t)) hit += 1;
  return Math.round((hit / qTokens.length) * 70);
}

function singularizarToken(t: string): string {
  if (t.endsWith("oes") && t.length > 4) return `${t.slice(0, -3)}ao`; // manjericoes → manjericao
  if (t.endsWith("aes") && t.length > 4) return `${t.slice(0, -3)}ao`;
  if (t.endsWith("s") && t.length > 3 && !t.endsWith("ss")) return t.slice(0, -1);
  return t;
}

function stemFrase(s: string): string {
  return normalizar(s)
    .split(" ")
    .map(singularizarToken)
    .join(" ");
}

function rankPorNome<T>(
  itens: T[],
  trecho: string,
  nomeDe: (item: T) => string,
): Array<{ item: T; score: number }> {
  return itens
    .map((item) => ({
      item,
      score: Math.max(scoreNome(trecho, nomeDe(item)), scoreNome(stemFrase(trecho), nomeDe(item))),
    }))
    .sort((a, b) => b.score - a.score);
}

/** Top candidatos próximos (mesmo com score baixo) para a UI de escolha. */
function topCandidatos<T>(
  ranked: Array<{ item: T; score: number }>,
  minScore: number,
  map: (item: T) => { id: string; nome: string; detalhe?: string | null },
  limit = 8,
): Array<{ id: string; nome: string; detalhe?: string | null }> {
  const bons = ranked.filter((x) => x.score >= minScore);
  const base = (bons.length ? bons : ranked.filter((x) => x.score > 0)).slice(0, limit);
  return base.map((x) => map(x.item));
}

export function matchClienteTexto(
  clientes: ClienteCatalogoTexto[],
  trecho: string | null,
): DraftComandoPedidoTexto["cliente"] {
  const nomeTexto = (trecho ?? "").trim();
  if (!nomeTexto) {
    return {
      nomeTexto: "",
      contaAzulCustomerId: null,
      nomeResolvido: null,
      candidatos: [],
      status: "nao_encontrado",
    };
  }
  const ranked = rankPorNome(clientes, nomeTexto, (c) => c.nome);
  const candidatos = topCandidatos(ranked, 40, (c) => ({
    id: c.externalId,
    nome: c.nome,
    detalhe: c.cnpjCpf ?? null,
  }));
  const top = ranked[0];
  if (!top || top.score < 40) {
    return {
      nomeTexto,
      contaAzulCustomerId: null,
      nomeResolvido: null,
      candidatos,
      status: "nao_encontrado",
    };
  }
  const empate = ranked.filter((x) => x.score === top.score && x.score >= 40);
  if (empate.length === 1 && top.score >= 70) {
    return {
      nomeTexto,
      contaAzulCustomerId: top.item.externalId,
      nomeResolvido: top.item.nome,
      candidatos,
      status: "ok",
    };
  }
  return {
    nomeTexto,
    contaAzulCustomerId: null,
    nomeResolvido: null,
    candidatos,
    status: "ambiguo",
  };
}

export function matchProdutoTexto(
  produtos: ProdutoCatalogoTexto[],
  trecho: string,
): Omit<DraftComandoPedidoTexto["itens"][number], "chave" | "quantidade" | "nomeTexto"> & {
  nomeTexto: string;
} {
  const nomeTexto = trecho.trim();
  const ranked = rankPorNome(produtos, nomeTexto, (p) => p.nome);
  const candidatos = topCandidatos(ranked, 40, (p) => ({
    id: p.id,
    nome: p.nome,
    detalhe: p.sku ?? null,
  }));
  const top = ranked[0];
  if (!top || top.score < 40) {
    return {
      nomeTexto,
      produtoId: null,
      nomeResolvido: null,
      candidatos,
      status: "nao_encontrado",
    };
  }
  const empate = ranked.filter((x) => x.score === top.score && x.score >= 40);
  if (empate.length === 1 && top.score >= 70) {
    return {
      nomeTexto,
      produtoId: top.item.id,
      nomeResolvido: top.item.nome,
      candidatos,
      status: "ok",
    };
  }
  return {
    nomeTexto,
    produtoId: null,
    nomeResolvido: null,
    candidatos,
    status: "ambiguo",
  };
}

const DIAS_NOME_RE =
  /^(?:segunda|terca|terça|quarta|quinta|sexta|sabado|sábado|domingo|seg|ter|qua|qui|sex|sab|dom)(?:\s*feira)?$/i;

function pareceDiaOuLixoCliente(trecho: string): boolean {
  const n = normalizar(trecho);
  if (!n) return true;
  if (DIAS_NOME_RE.test(n)) return true;
  // "quarta 10 manjericoes..." — começa com dia da semana
  if (
    /^(?:segunda|terca|quarta|quinta|sexta|sabado|domingo|seg|ter|qua|qui|sex|sab|dom)(?:\s*feira)?\b/.test(
      n,
    )
  ) {
    return true;
  }
  if (/^\d/.test(n)) return true;
  return false;
}

/**
 * Extrai trecho de cliente: "para o X", "pro X", "cliente X", "no X".
 * Fallback: melhor match de nome de cliente contido na frase.
 * Evita capturar "para quarta..." (dia) no lugar de "para o Spoleto".
 */
export function extrairClienteBruto(
  frase: string,
  clientes: ClienteCatalogoTexto[],
): string | null {
  const raw = frase.replace(/\s+/g, " ").trim();

  // 1) Padrões específicos (sem "para" solto) — última ocorrência vence
  const reEspecifico =
    /\b(?:para\s+o|para\s+a|pro|pra|cliente|no|na)\s+([A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9 .&'-]{1,60}?)(?=\s*$|\s*[.,;]|\s+(?:hoje|amanh[aã]|segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado|domingo|\d)\b)/gi;
  let ultimoEspecifico: string | null = null;
  let m: RegExpExecArray | null;
  while ((m = reEspecifico.exec(raw))) {
    const t = m[1]!.trim();
    if (!pareceDiaOuLixoCliente(t)) ultimoEspecifico = t;
  }
  // fim da frase: "… para o Spoleto"
  const fimEspecifico = raw.match(
    /\b(?:para\s+o|para\s+a|pro|pra|cliente)\s+([A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9 .&'-]{1,60})\s*$/i,
  );
  if (fimEspecifico?.[1] && !pareceDiaOuLixoCliente(fimEspecifico[1])) {
    ultimoEspecifico = fimEspecifico[1].trim();
  }
  if (ultimoEspecifico) return ultimoEspecifico;

  // 2) Catálogo: nome (ou token ≥4) presente na frase
  const n = normalizar(frase);
  let melhor: { nome: string; len: number } | null = null;
  for (const c of clientes) {
    const cn = normalizar(c.nome);
    if (cn.length < 3) continue;
    const tokens = cn.split(" ").filter((t) => t.length >= 4);
    if (n.includes(cn) || tokens.some((t) => n.includes(t))) {
      if (!melhor || cn.length > melhor.len) melhor = { nome: c.nome, len: cn.length };
    }
  }
  if (melhor) return melhor.nome;

  // 3) "para X" solto só se X não for dia/lixo (ex.: "para Spoleto")
  const fimPara = raw.match(
    /\bpara\s+([A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9 .&'-]{1,60})\s*$/i,
  );
  if (fimPara?.[1] && !pareceDiaOuLixoCliente(fimPara[1])) {
    return fimPara[1].trim();
  }

  return null;
}

/**
 * Itens: padrões "10 manjericoes", "5x alface", "alface 5".
 * Também varre catálogo por nome presente na frase + número próximo.
 */
export function extrairItensBrutos(
  frase: string,
  produtos: ProdutoCatalogoTexto[],
): Array<{ quantidade: number; nome: string }> {
  const out: Array<{ quantidade: number; nome: string }> = [];
  const seen = new Set<string>();

  const nomeItemLixo = (nome: string) => {
    const n = normalizar(nome);
    if (n.length < 2) return true;
    if (
      /^(?:para|pro|pra|cliente|hoje|amanha|coloque|adicionar|adicione|lance|lancar|pedido|agende|agendar|feira)(?:\b|$)/.test(
        n,
      )
    ) {
      return true;
    }
    if (pareceDiaOuLixoCliente(n)) return true;
    // "coloque para quarta", "para quarta", etc.
    if (
      /\b(?:coloque|adicione|adicionar|pedido|para|pro|pra)\b/.test(n) &&
      /\b(?:segunda|terca|quarta|quinta|sexta|sabado|domingo|feira)\b/.test(n)
    ) {
      return true;
    }
    return false;
  };

  const push = (qtd: number, nome: string) => {
    const limpo = nome.trim();
    if (nomeItemLixo(limpo)) return;
    const key = `${qtd}|${normalizar(limpo)}`;
    if (seen.has(key) || !(qtd > 0) || limpo.length < 2) return;
    seen.add(key);
    out.push({ quantidade: qtd, nome: limpo });
  };

  // 10 manjericoes / 10x manjericao / 10 un manjericao
  const reQtdNome =
    /\b(\d+(?:[.,]\d+)?)\s*(?:x|un|und|unid|unidade|unidades|cx|bandeja|pct)?\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9 ]{1,40}?)(?=\s+(?:para|pro|pra|cliente|no|na|do|da|hoje|amanha|segunda|terca|quarta|quinta|sexta|sabado|domingo)\b|[.,;]|$)/gi;
  let m: RegExpExecArray | null;
  const texto = frase.replace(/\s+/g, " ").trim();
  while ((m = reQtdNome.exec(texto))) {
    const qtd = Number(String(m[1]).replace(",", "."));
    let nome = m[2]!.trim();
    // corta lixo residual
    nome = nome
      .replace(/\b(?:para|pro|pra|cliente|no|na|feira)\b.*$/i, "")
      .trim();
    push(qtd, nome);
  }

  // nome ... 10 (menos comum) — só se ainda não achamos item via "10 X"
  if (out.length === 0) {
    const reNomeQtd =
      /\b([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ ]{2,40}?)\s+(\d+(?:[.,]\d+)?)\s*(?:un|und|unid|x)?\b/gi;
    while ((m = reNomeQtd.exec(texto))) {
      const nome = m[1]!.trim();
      if (nomeItemLixo(nome)) continue;
      const qtd = Number(String(m[2]).replace(",", "."));
      push(qtd, nome);
    }
  }

  // Catálogo: produto mencionado + número na frase
  if (out.length === 0) {
    const n = stemFrase(texto);
    const nums = [...texto.matchAll(/\b(\d+(?:[.,]\d+)?)\b/g)].map((x) =>
      Number(String(x[1]).replace(",", ".")),
    );
    const qtdFallback = nums.find((x) => x > 0 && x < 10000) ?? null;
    const ranked = produtos
      .map((p) => ({ p, score: scoreNome(stemFrase(p.nome), n) }))
      .filter((x) => x.score >= 50)
      .sort((a, b) => b.score - a.score);
    if (ranked[0] && qtdFallback) {
      push(qtdFallback, ranked[0].p.nome);
    }
  }

  return out;
}

export function interpretarComandoPedidoTexto(input: {
  frase: string;
  clientes: ClienteCatalogoTexto[];
  produtos: ProdutoCatalogoTexto[];
  /** Referência para "quarta"/"amanhã". Default: agora. */
  dataReferencia?: Date;
}): DraftComandoPedidoTexto {
  const frase = input.frase.replace(/\s+/g, " ").trim();
  const avisos: string[] = [];
  if (frase.length < 4) {
    return {
      fraseOriginal: frase,
      modeloUsado: "parser local (sem OpenAI)",
      cliente: {
        nomeTexto: "",
        contaAzulCustomerId: null,
        nomeResolvido: null,
        candidatos: [],
        status: "nao_encontrado",
      },
      itens: [],
      dataEntregaSugerida: null,
      avisos: ["Frase muito curta."],
      confiancaGeral: 0,
    };
  }

  const ref = input.dataReferencia ?? new Date();
  const dataEntregaSugerida = extrairDataDaFrase(frase, ref);
  const clienteBruto = extrairClienteBruto(frase, input.clientes);
  const cliente = matchClienteTexto(input.clientes, clienteBruto);

  // Remove trecho do cliente da frase para ajudar itens
  let fraseItens = frase;
  if (clienteBruto) {
    fraseItens = fraseItens.replace(
      new RegExp(clienteBruto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
      " ",
    );
  }
  fraseItens = fraseItens
    .replace(/\b(?:para\s+o|para\s+a|pro|pra|cliente)\b/gi, " ")
    .replace(
      /\b(?:coloque|adicionar|adicione|lance|lancar|pedido|agende|agendar|para|pro|pra|o|a|um|uma|feira|hoje|amanh[aã]|segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado|domingo)(?:\s*-?\s*feira)?\b/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();

  const brutos = extrairItensBrutos(fraseItens.length > 3 ? fraseItens : frase, input.produtos);
  let itens = brutos.map((b) => {
    const match = matchProdutoTexto(input.produtos, b.nome);
    return {
      chave: novaChave(),
      nomeTexto: b.nome,
      quantidade: b.quantidade,
      produtoId: match.produtoId,
      nomeResolvido: match.nomeResolvido,
      candidatos: match.candidatos,
      status: match.status,
    };
  });
  // Se já há item ok, descarta lixo sem match
  if (itens.some((i) => i.status === "ok")) {
    itens = itens.filter((i) => i.status === "ok" || i.status === "ambiguo");
  }

  if (!dataEntregaSugerida) avisos.push("Não entendi a data — escolha o dia na agenda.");
  if (cliente.status !== "ok") avisos.push("Cliente precisa de confirmação.");
  if (!itens.length) avisos.push("Não encontrei itens/quantidades na frase.");
  if (itens.some((i) => i.status !== "ok")) avisos.push("Há produto sem match automático.");

  let confianca = 0.25;
  if (dataEntregaSugerida) confianca += 0.2;
  if (cliente.status === "ok") confianca += 0.25;
  if (itens.length) confianca += Math.min(0.3, itens.length * 0.1);
  if (itens.every((i) => i.status === "ok") && itens.length) confianca += 0.1;

  return {
    fraseOriginal: frase,
    modeloUsado: "parser local (sem OpenAI)",
    cliente,
    itens,
    dataEntregaSugerida,
    avisos,
    confiancaGeral: Math.min(0.95, confianca),
  };
}

export function draftTextoProntoParaSalvar(draft: {
  cliente: { contaAzulCustomerId: string | null };
  itens: Array<{ produtoId: string | null; quantidade: number }>;
  dataEntregaSugerida: string | null;
}): { ok: true } | { ok: false; motivo: string } {
  if (!draft.dataEntregaSugerida?.trim()) {
    return { ok: false, motivo: "Informe a data de entrega." };
  }
  if (!draft.cliente.contaAzulCustomerId?.trim()) {
    return { ok: false, motivo: "Selecione o cliente." };
  }
  const okItens = draft.itens.filter(
    (i) => i.produtoId?.trim() && Number.isFinite(i.quantidade) && i.quantidade > 0,
  );
  if (!okItens.length) return { ok: false, motivo: "Informe ao menos um item válido." };
  if (draft.itens.some((i) => !i.produtoId?.trim() && i.quantidade > 0)) {
    return { ok: false, motivo: "Há item sem produto correspondente." };
  }
  return { ok: true };
}
