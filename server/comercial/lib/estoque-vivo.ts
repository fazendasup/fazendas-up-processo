/** Lógica de compras do Estoque vivo (espelha fazendas-up/index.html + server.js). */

export const ESTOQUE_MIX_MULT = 1.34;

export const ESTOQUE_MIX_FOLHA_PADRAO = {
  referenciaProduto: "Alface MIX",
  variedades: ["Alface Crespa Verde", "Alface Crespa Roxa", "Alface Americana"],
} as const;

export type ModoCompraEstoque = "unidade" | "kilo";

export type EstoqueMixFolhaLeveCfg = {
  referenciaProduto: string;
  variedades: string[];
};

export type EstoqueVivoMixComponenteCfg = {
  produtoId: string;
  produtoNome: string;
  quantidade: number;
};

export type EstoqueVivoMixCfg = {
  id: string;
  nome: string;
  produtoReferenciaId: string | null;
  produtoReferenciaNome: string | null;
  perdaPercentual: number;
  ativo: boolean;
  /** Componentes: quantidade = gramas por 1 un. do mix */
  componentes: EstoqueVivoMixComponenteCfg[];
};

export type LinhaPedidoEstoque = {
  nome: string;
  quantidade: number;
};

export type ConfigProdutoEstoque = {
  produtoId: string;
  nome: string;
  modoCompra: ModoCompraEstoque;
  fator: number | null;
  rendimento: number;
  mixAtivo: boolean;
  oculto: boolean;
};

export type LinhaCompraEstoque = {
  produtoId: string;
  nome: string;
  quantidadePedido: number;
  quantidadeMix: number;
  unidadesParaCompra: number;
  modoCompra: ModoCompraEstoque;
  mixAtivo: boolean;
  inMixFolha: boolean;
  inMixCustomizado: boolean;
  fator: number | null;
  rendimento: number;
  comprarValor: number | null;
  comprarTexto: string;
  comprarUnidade: "kg" | "un" | null;
  oculto: boolean;
};

export function nomeChaveEstoque(raw: unknown): string {
  const base = raw != null && String(raw).trim() !== "" ? String(raw).trim() : "(sem nome)";
  try {
    return base.normalize("NFC");
  } catch {
    return base;
  }
}

export function normalizeEstoqueMixFolhaLeve(raw: unknown): EstoqueMixFolhaLeveCfg {
  const refPad = ESTOQUE_MIX_FOLHA_PADRAO.referenciaProduto;
  const varPad: string[] = [...ESTOQUE_MIX_FOLHA_PADRAO.variedades];
  if (!raw || typeof raw !== "object") {
    return {
      referenciaProduto: nomeChaveEstoque(refPad),
      variedades: varPad.map(nomeChaveEstoque),
    };
  }
  const obj = raw as Record<string, unknown>;
  const refIn =
    obj.referenciaProduto != null && String(obj.referenciaProduto).trim() !== ""
      ? String(obj.referenciaProduto).trim()
      : refPad;
  let vars = varPad;
  if (Array.isArray(obj.variedades) && obj.variedades.length > 0) {
    vars = obj.variedades.map((x) => String(x).trim()).filter(Boolean);
  }
  const seen = new Set<string>();
  const variedades: string[] = [];
  for (const x of vars) {
    const kn = nomeChaveEstoque(x);
    if (seen.has(kn)) continue;
    seen.add(kn);
    variedades.push(kn);
  }
  if (!variedades.length) {
    for (const x of varPad) {
      const kn = nomeChaveEstoque(x);
      if (!seen.has(kn)) {
        seen.add(kn);
        variedades.push(kn);
      }
    }
  }
  return { referenciaProduto: nomeChaveEstoque(refIn), variedades };
}

export function normalizeEstoqueVivoMixes(raw: unknown): EstoqueVivoMixCfg[] {
  if (!Array.isArray(raw)) return [];
  const out: EstoqueVivoMixCfg[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    const id = obj.id != null ? String(obj.id).trim() : "";
    const nome = obj.nome != null ? String(obj.nome).trim() : "";
    if (!id || !nome) continue;
    const produtoReferenciaId =
      obj.produtoReferenciaId != null && String(obj.produtoReferenciaId).trim() !== ""
        ? String(obj.produtoReferenciaId).trim()
        : null;
    const produtoReferenciaNome =
      obj.produtoReferenciaNome != null && String(obj.produtoReferenciaNome).trim() !== ""
        ? nomeChaveEstoque(obj.produtoReferenciaNome)
        : null;
    const perdaRaw = Number(obj.perdaPercentual);
    const perdaPercentual =
      Number.isFinite(perdaRaw) && perdaRaw >= 0 && perdaRaw < 100 ? perdaRaw : 0;
    const ativo = obj.ativo !== false;
    const componentesRaw = Array.isArray(obj.componentes) ? obj.componentes : [];
    const componentes: EstoqueVivoMixComponenteCfg[] = [];
    const seenComp = new Set<string>();
    for (const c of componentesRaw) {
      if (!c || typeof c !== "object") continue;
      const co = c as Record<string, unknown>;
      const produtoId = co.produtoId != null ? String(co.produtoId).trim() : "";
      const produtoNome =
        co.produtoNome != null ? nomeChaveEstoque(co.produtoNome) : "";
      const qtd = Number(co.quantidade);
      if (!produtoId || !produtoNome || !Number.isFinite(qtd) || qtd <= 0) continue;
      if (seenComp.has(produtoId)) continue;
      seenComp.add(produtoId);
      componentes.push({ produtoId, produtoNome, quantidade: qtd });
    }
    if (!componentes.length) continue;
    out.push({
      id,
      nome,
      produtoReferenciaId,
      produtoReferenciaNome,
      perdaPercentual,
      ativo,
      componentes,
    });
  }
  return out;
}

export function fatorPerdaEstoque(perdaPercentual: number): number {
  const p = Number(perdaPercentual) || 0;
  if (p <= 0) return 1;
  if (p >= 100) return 1;
  return 1 / (1 - p / 100);
}

/** kg a processar = (qtd mixes × gramas) / 1000 × 1/(1−perda%) */
export function kgProcessarIngredienteMix(
  quantidadeMixes: number,
  gramasPorMix: number,
  perdaPercentual: number,
): number {
  const q = Number(quantidadeMixes) || 0;
  const g = Number(gramasPorMix) || 0;
  if (q <= 0 || g <= 0) return 0;
  const raw = (q * g * fatorPerdaEstoque(perdaPercentual)) / 1000;
  return Math.ceil(raw * 1000) / 1000;
}

export function calcularProducaoMix(
  quantidadeMixes: number,
  mix: EstoqueVivoMixCfg,
): Array<{
  produtoId: string;
  nome: string;
  gramasPorMix: number;
  gramasTotais: number;
  kgProcessar: number;
  comprarTexto: string;
}> {
  const q = Number(quantidadeMixes) || 0;
  return mix.componentes.map((comp) => {
    const gramasPorMix = Number(comp.quantidade) || 0;
    const gramasTotais = q * gramasPorMix * fatorPerdaEstoque(mix.perdaPercentual);
    const kgProcessar = kgProcessarIngredienteMix(q, gramasPorMix, mix.perdaPercentual);
    return {
      produtoId: comp.produtoId,
      nome: comp.produtoNome,
      gramasPorMix,
      gramasTotais,
      kgProcessar,
      comprarTexto: `${formatKgPt(kgProcessar)} kg`,
    };
  });
}

/** @deprecated use kgProcessarIngredienteMix — mantido para testes legados */
export function unidadesComponenteMixComPerda(
  unidadesReferencia: number,
  quantidadePorUnidade: number,
  perdaPercentual: number,
): number {
  const ref = Number(unidadesReferencia) || 0;
  const qtd = Number(quantidadePorUnidade) || 0;
  if (ref <= 0 || qtd <= 0) return 0;
  return ref * qtd * fatorPerdaEstoque(perdaPercentual);
}

export function calcularDemandaMixCustomizado(
  _pedidos: LinhaPedidoEstoque[],
  _mixes: EstoqueVivoMixCfg[],
): Map<string, number> {
  // Mixes são receitas de produção (calculadora), não alteram a lista de compras do dia.
  return new Map();
}

export function aplicarDemandaMixCustomizado(
  lista: LinhaPedidoEstoque[],
  _demandaMix: Map<string, number>,
): LinhaPedidoEstoque[] {
  return lista;
}

export function produtosEmMixCustomizado(
  mixes: EstoqueVivoMixCfg[],
): Set<string> {
  const keys = new Set<string>();
  for (const mix of mixes.filter((m) => m.ativo)) {
    for (const comp of mix.componentes) {
      keys.add(nomeChaveEstoque(comp.produtoNome));
    }
  }
  return keys;
}

export function previewMixEstoqueVivo(
  unidadesReferencia: number,
  mix: EstoqueVivoMixCfg,
  _produtos?: ConfigProdutoEstoque[],
): Array<{
  produtoId: string;
  nome: string;
  unidadesNecessarias: number;
  comprarValor: number | null;
  comprarTexto: string;
  comprarUnidade: "kg" | "un" | null;
}> {
  return calcularProducaoMix(unidadesReferencia, mix).map((l) => ({
    produtoId: l.produtoId,
    nome: l.nome,
    unidadesNecessarias: l.gramasTotais,
    comprarValor: l.kgProcessar,
    comprarTexto: l.comprarTexto,
    comprarUnidade: "kg" as const,
  }));
}

export function agregarPedidosPorProduto(pedidos: LinhaPedidoEstoque[]): LinhaPedidoEstoque[] {
  const prodMap = new Map<string, LinhaPedidoEstoque>();
  for (const p of pedidos) {
    const nome = nomeChaveEstoque(p.nome);
    const atual = prodMap.get(nome) ?? { nome, quantidade: 0 };
    atual.quantidade += Number(p.quantidade) || 0;
    prodMap.set(nome, atual);
  }
  return Array.from(prodMap.values()).sort((a, b) => b.quantidade - a.quantidade);
}

export function quantidadeReferenciaMixFolhaNoDia(
  pedidos: LinhaPedidoEstoque[],
  cfg: EstoqueMixFolhaLeveCfg,
): number {
  const refKey = nomeChaveEstoque(cfg.referenciaProduto);
  let s = 0;
  for (const p of pedidos) {
    if (nomeChaveEstoque(p.nome) === refKey) s += Number(p.quantidade) || 0;
  }
  return s;
}

export function isVariedadeMixFolhaLeve(nomeProduto: string, cfg: EstoqueMixFolhaLeveCfg): boolean {
  const k = nomeChaveEstoque(nomeProduto);
  return cfg.variedades.includes(k);
}

export function parteIgualMixFolhaLeve(pedidos: LinhaPedidoEstoque[], cfg: EstoqueMixFolhaLeveCfg): number {
  const n = cfg.variedades.length;
  if (n <= 0) return 0;
  return quantidadeReferenciaMixFolhaNoDia(pedidos, cfg) / n;
}

export function unidadesAjustadasMixEstoque(
  nomeProduto: string,
  unidadesPedido: number,
  mixMarcado: boolean,
  pedidos: LinhaPedidoEstoque[],
  cfg: EstoqueMixFolhaLeveCfg,
): number {
  const up = Number(unidadesPedido) || 0;
  if (isVariedadeMixFolhaLeve(nomeProduto, cfg) && mixMarcado) {
    return up + parteIgualMixFolhaLeve(pedidos, cfg);
  }
  if (!isVariedadeMixFolhaLeve(nomeProduto, cfg) && mixMarcado) {
    return up * ESTOQUE_MIX_MULT;
  }
  return up;
}

export function estoqueInjetarLinhasMixFolha(
  lista: LinhaPedidoEstoque[],
  pedidos: LinhaPedidoEstoque[],
  cfg: EstoqueMixFolhaLeveCfg,
): LinhaPedidoEstoque[] {
  if (quantidadeReferenciaMixFolhaNoDia(pedidos, cfg) <= 0) return lista;
  const keys = new Set(lista.map((p) => nomeChaveEstoque(p.nome)));
  const extra: LinhaPedidoEstoque[] = [];
  for (const v of cfg.variedades) {
    const k = nomeChaveEstoque(v);
    if (!keys.has(k)) {
      extra.push({ nome: k, quantidade: 0 });
      keys.add(k);
    }
  }
  if (!extra.length) return lista;
  return lista.concat(extra).sort((a, b) => b.quantidade - a.quantidade);
}

export function kgComprarPorRendimento(unidadesNecessarias: number, produtosPorKg: number): number {
  const u = Number(unidadesNecessarias) || 0;
  const r = Number(produtosPorKg) || 0;
  if (r <= 0 || u <= 0) return 0;
  const raw = u / r;
  return Math.ceil(raw * 1000) / 1000;
}

export function formatKgPt(kg: number): string {
  if (!Number.isFinite(kg) || kg <= 0) return "0";
  return kg.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
}

export function calcularCompraLinha(
  row: LinhaPedidoEstoque,
  cfgProduto: ConfigProdutoEstoque,
  pedidos: LinhaPedidoEstoque[],
  cfgMix: EstoqueMixFolhaLeveCfg,
): LinhaCompraEstoque {
  const nome = nomeChaveEstoque(row.nome);
  const unidadesPedido = Number(row.quantidade) || 0;
  const unidadesParaCompra = unidadesAjustadasMixEstoque(
    nome,
    unidadesPedido,
    cfgProduto.mixAtivo,
    pedidos,
    cfgMix,
  );
  const inMixFolha = isVariedadeMixFolhaLeve(nome, cfgMix);

  let comprarValor: number | null = null;
  let comprarTexto = "—";
  let comprarUnidade: "kg" | "un" | null = null;

  if (cfgProduto.modoCompra === "kilo") {
    if (cfgProduto.rendimento > 0) {
      comprarValor = kgComprarPorRendimento(unidadesParaCompra, cfgProduto.rendimento);
      comprarTexto = `${formatKgPt(comprarValor)} kg`;
      comprarUnidade = "kg";
    } else {
      comprarTexto = "Informe rendimento (prod/kg)";
    }
  } else if (cfgProduto.fator == null) {
    comprarTexto = "Informe o fator";
  } else {
    comprarValor = Math.ceil(unidadesParaCompra * cfgProduto.fator);
    comprarTexto = `${comprarValor} un.`;
    comprarUnidade = "un";
  }

  return {
    produtoId: cfgProduto.produtoId,
    nome,
    quantidadePedido: unidadesPedido,
    quantidadeMix: 0,
    unidadesParaCompra,
    modoCompra: cfgProduto.modoCompra,
    mixAtivo: cfgProduto.mixAtivo,
    inMixFolha,
    inMixCustomizado: false,
    fator: cfgProduto.fator,
    rendimento: cfgProduto.rendimento,
    comprarValor,
    comprarTexto,
    comprarUnidade,
    oculto: cfgProduto.oculto,
  };
}

export function buildEstoqueVivoDia(
  pedidos: LinhaPedidoEstoque[],
  produtos: ConfigProdutoEstoque[],
  cfgMix: EstoqueMixFolhaLeveCfg,
  opts?: { incluirOcultos?: boolean },
): {
  cfgMix: EstoqueMixFolhaLeveCfg & { qtdReferencia: number; partePorVariedade: number };
  linhas: LinhaCompraEstoque[];
  desativados: string[];
  totais: { sumNec: number; sumUn: number; sumKg: number };
} {
  const produtoPorNome = new Map(produtos.map((p) => [nomeChaveEstoque(p.nome), p]));
  let agregados = agregarPedidosPorProduto(pedidos);
  agregados = estoqueInjetarLinhasMixFolha(agregados, pedidos, cfgMix);

  const qtdReferencia = quantidadeReferenciaMixFolhaNoDia(pedidos, cfgMix);
  const partePorVariedade =
    cfgMix.variedades.length > 0 ? qtdReferencia / cfgMix.variedades.length : 0;

  const desativados = produtos
    .filter((p) => p.oculto)
    .map((p) => nomeChaveEstoque(p.nome))
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  const linhasVisiveis = agregados.filter((row) => {
    const cfg = produtoPorNome.get(nomeChaveEstoque(row.nome));
    if (!cfg) return true;
    if (opts?.incluirOcultos) return true;
    return !cfg.oculto;
  });

  let sumNec = 0;
  let sumUn = 0;
  let sumKg = 0;

  const linhas = linhasVisiveis.map((row) => {
    const key = nomeChaveEstoque(row.nome);
    const cfgProduto =
      produtoPorNome.get(key) ??
      ({
        produtoId: "",
        nome: row.nome,
        modoCompra: "unidade",
        fator: null,
        rendimento: 0,
        mixAtivo: false,
        oculto: false,
      } satisfies ConfigProdutoEstoque);

    const linha = calcularCompraLinha(row, cfgProduto, pedidos, cfgMix);
    sumNec += linha.quantidadePedido;
    if (linha.comprarUnidade === "un" && linha.comprarValor != null) sumUn += linha.comprarValor;
    if (linha.comprarUnidade === "kg" && linha.comprarValor != null) sumKg += linha.comprarValor;
    return linha;
  });

  return {
    cfgMix: { ...cfgMix, qtdReferencia, partePorVariedade },
    linhas,
    desativados,
    totais: { sumNec, sumUn, sumKg },
  };
}
