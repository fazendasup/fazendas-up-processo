import type { CategoriaProdutoCusto, ModoCompraMp } from "./custosProduto";
import {
  calcularLinhaProcessoIndustrial,
  configFromProcessoModelo,
  derivarProcessoModelo,
  type LinhaProcessoIndustrialInput,
  type LinhaProcessoIndustrialResult,
  type ProcessoModeloRecord,
} from "./custosLinhaProcessoIndustrial";
import {
  deduplicarEtapasLogistica,
  LABEL_ETAPA_PROCESSO,
  temEtapaLogistica,
  type TipoEtapaProcesso,
} from "./custosProduto";
import type { CustoHoraPorRegime, RegimeMoEtapa } from "./custosMoEquipe";

/** Rotas de processo — escolha manual por produto (não inferir só pelo nome). */
export const PERFIS_PROCESSO_PRODUTO = [
  "microverde_embalagem",
  "colheita_embalagem",
  "lavagem_embalagem",
  "lavagem_corte_embalagem",
] as const;
export type PerfilProcessoProduto = (typeof PERFIS_PROCESSO_PRODUTO)[number];

export const LABEL_PERFIL_PROCESSO_PRODUTO: Record<PerfilProcessoProduto, string> = {
  microverde_embalagem: "Microverde — colheita + embalagem (sem lavagem)",
  colheita_embalagem: "Colheita + embalagem (sem lavagem)",
  lavagem_embalagem: "Lavagem (R$/kg médio) + embalagem",
  lavagem_corte_embalagem: "Lavagem + corte + embalagem",
};

export const DESCRICAO_PERFIL_PROCESSO: Record<PerfilProcessoProduto, string> = {
  microverde_embalagem: "Tray/clamshell microverde. Embalagem R$ 0,95. Sem máquina de lavagem.",
  colheita_embalagem:
    "Só colhe e embala (ex.: baby leaf, mix sem lavagem, microverde com nome genérico). Embalagem R$ 0,60.",
  lavagem_embalagem:
    "Passa na lavagem industrial. Custo da lavagem = R$/kg médio do lote × kg/un deste SKU — não min/un fixo.",
  lavagem_corte_embalagem: "Lavagem por kg + tempo de corte (se houver) + embalagem.",
};

/** Etapa padrão reutilizada ao gerar fichas do Conta Azul. */
export type EtapaProcessoPadrao = {
  tipo: TipoEtapaProcesso;
  nome: string;
  custoPorUnidade: number;
  custoPorKgProcessado: number | null;
  custoPercentual: number | null;
  minutosPorUnidade: number | null;
  regimeMo: RegimeMoEtapa;
  ativo: boolean;
};

export type CustosProdutoProcessoConfig = {
  embalagemMicroverdeUn: number;
  embalagemOutrosUn: number;
  /** Custo médio da lavagem por kg processado (rateio de lote). Preferir a min/un. */
  lavagemReaisKg: number | null;
  lavagemMinutosUn: number | null;
  embalagemMinutosUn: number | null;
  corteMinutosUn: number | null;
  adesivoCustoUn: number | null;
  regimeMoPadrao: RegimeMoEtapa;
  incluirAdesivo: boolean;
  /** Percentual de logística sobre subtotal acumulado (material + processo). */
  logisticaPercentualPadrao: number;
  /** Parâmetros da linha industrial (persistidos para recalcular). */
  linhaProcesso?: LinhaProcessoIndustrialInput | null;
};

export const LOGISTICA_PERCENTUAL_PADRAO = 10;

export const CUSTOS_PRODUTO_PROCESSO_CONFIG_PADRAO: CustosProdutoProcessoConfig = {
  embalagemMicroverdeUn: 0.95,
  embalagemOutrosUn: 0.6,
  lavagemReaisKg: null,
  lavagemMinutosUn: null,
  embalagemMinutosUn: null,
  corteMinutosUn: null,
  adesivoCustoUn: null,
  regimeMoPadrao: "qualquer",
  incluirAdesivo: true,
  logisticaPercentualPadrao: LOGISTICA_PERCENTUAL_PADRAO,
  linhaProcesso: null,
};

export type MapeamentoProdutoComercial = {
  produtoComercialId: string;
  categoriaCusto: CategoriaProdutoCusto;
  perfilProcesso: PerfilProcessoProduto;
  /** Kg por unidade vendida — necessário para lavagem R$/kg e margem por kg. */
  kgPorUnidade: number | null;
  /** Como a matéria-prima deste SKU costuma ser comprada (fornecedor padrão). */
  modoCompraMp: ModoCompraMp;
  /** Modelo de linha de processo (folhosas, legumes…). Null = padrão do projeto. */
  processoModeloId: number | null;
};

export function perfilUsaLavagemKg(perfil: PerfilProcessoProduto): boolean {
  return perfil === "lavagem_embalagem" || perfil === "lavagem_corte_embalagem";
}

/** Lavagem, corte ou MO/embalagem industrial — não é revenda simples (só rótulo + frete). */
export function perfilTemProcessamentoIndustrial(perfil: PerfilProcessoProduto): boolean {
  return perfilUsaLavagemKg(perfil);
}

/** Avisos antes de gerar ficha — não bloqueia (nem tudo é pesado na entrada). */
export function avisosMapeamentoProduto(
  m: Pick<MapeamentoProdutoComercial, "perfilProcesso" | "kgPorUnidade" | "modoCompraMp">,
  config: Pick<CustosProdutoProcessoConfig, "lavagemReaisKg">,
): string[] {
  const avisos: string[] = [];
  if (perfilUsaLavagemKg(m.perfilProcesso)) {
    if (!(config.lavagemReaisKg != null && config.lavagemReaisKg > 0)) {
      avisos.push("Modelo sem R$/kg de lavagem — etapa ficará zerada.");
    }
    if (!(m.kgPorUnidade != null && m.kgPorUnidade > 0)) {
      avisos.push("Kg/un vazio — lavagem R$/kg ficará zerada (ok se não souber o peso).");
    }
  }
  if (m.modoCompraMp === "kg" && perfilUsaLavagemKg(m.perfilProcesso)) {
    avisos.push("Compra/kg: complete preço R$/kg e perdas na ficha depois de gerar.");
  }
  if (m.modoCompraMp === "unidade") {
    avisos.push("Compra/un: informe R$/un de matéria-prima na ficha após gerar.");
  }
  return avisos;
}

/** Nome genérico no CA — revisar categoria/perfil manualmente. */
export function nomeProdutoComercialGenerico(nome: string): boolean {
  const n = normalizarNomeProduto(nome);
  if (n.length < 5) return true;
  return /^(bandeja|pacote|mix|salada|folha|folhas|verde|maco|200g|100g|150g|300g|500g)\b/.test(n);
}

function normalizarNomeProduto(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const MICROVERDE_KEYWORDS = [
  "microverde",
  "micro verde",
  "microgreen",
  "broto",
  "brocolis broto",
  "rabanete broto",
  "kale baby",
  "mustard",
  "mostarda",
  "cenoura baby",
  "beterraba baby",
  "ervilha broto",
  "feijao broto",
  "girassol",
  "abobrinha broto",
];

const FLORES_KEYWORDS = [
  "flor comest",
  "flores comest",
  "mix de flores",
  "bouquet",
  "capuchinha",
  "tagete",
  "calendula",
  "nasturtium",
  "violacea",
  "antirrhinum",
  "borago",
  "borragem",
];

const PROCESSAMENTO_INDUSTRIAL_KEYWORDS = [
  "higieniz",
  "fatiad",
  "lavad",
  "processad",
  "sanitiz",
  "desinfect",
  "desinfec",
  "cortad",
  "picad",
  "fatia",
  "corte",
] as const;

/** Nome indica produto já processado (lavagem, corte, higienização…). */
export function produtoIndicaProcessamentoIndustrial(nome: string): boolean {
  const n = normalizarNomeProduto(nome);
  return PROCESSAMENTO_INDUSTRIAL_KEYWORDS.some((kw) => n.includes(kw));
}

/** SKU embalado com peso no nome (ex.: Alface 240g) — costuma passar por lavagem/embalagem. */
export function produtoIndicaEmbalagemPesada(nome: string): boolean {
  const n = normalizarNomeProduto(nome);
  return /\d+\s*(g|gr|grama|gramas|kg)\b/.test(n);
}

function folhaPrecisaProcessamentoIndustrial(nome: string): boolean {
  return produtoIndicaProcessamentoIndustrial(nome) || produtoIndicaEmbalagemPesada(nome);
}

/** Sugestão inicial — sempre revisável manualmente antes de gerar fichas. */
export function inferirCategoriaProdutoCusto(
  nome: string,
  categoriaComercial?: string | null,
): CategoriaProdutoCusto {
  const n = normalizarNomeProduto(nome);
  const cat = normalizarNomeProduto(categoriaComercial ?? "");
  if (n.includes("microverde") || n.includes("micro verde") || cat.includes("microverde")) {
    return "microverde";
  }
  for (const kw of MICROVERDE_KEYWORDS) {
    if (n.includes(kw)) return "microverde";
  }
  if (cat.includes("flor") || n.includes("flor")) {
    for (const kw of FLORES_KEYWORDS) {
      if (n.includes(kw) || cat.includes(kw)) return "flores";
    }
    if (/\bflor(es)?\b/.test(n) || /\bflor(es)?\b/.test(cat)) return "flores";
  }
  for (const kw of FLORES_KEYWORDS) {
    if (n.includes(kw)) return "flores";
  }
  if (n.includes("mix") || cat.includes("mix")) return "mix";
  if (n.includes("alface") || n.includes("rucula") || n.includes("folha") || n.includes("agriao")) {
    return folhaPrecisaProcessamentoIndustrial(nome) ? "alface" : "revenda";
  }
  if (n.includes("revenda") || cat.includes("revenda")) return "revenda";
  return "outros";
}

/** Perfil sugerido — conservador: só assume lavagem em folhosas explícitas. */
export function inferirPerfilProcessoSugerido(
  nome: string,
  categoriaComercial?: string | null,
): PerfilProcessoProduto {
  const n = normalizarNomeProduto(nome);
  const categoria = inferirCategoriaProdutoCusto(nome, categoriaComercial);
  if (categoria === "revenda") return "colheita_embalagem";
  if (categoria === "microverde") return "microverde_embalagem";
  if (categoria === "flores") return "colheita_embalagem";
  if (categoria === "alface") {
    if (n.includes("fatiad") || n.includes("fatia") || n.includes("corte") || n.includes("cortad")) {
      return "lavagem_corte_embalagem";
    }
    return "lavagem_embalagem";
  }
  if (n.includes("baby leaf") || n.includes("babyleaf")) return "colheita_embalagem";
  return "colheita_embalagem";
}

/** Evita mapa antigo forçar lavagem/perdas em revenda simples (ex.: alface a granel). */
export function mapeamentoEfetivoParaCalculo(
  mapeado: MapeamentoProdutoComercial,
  sugerido: MapeamentoProdutoComercial,
): MapeamentoProdutoComercial {
  const mapIndustrial = perfilTemProcessamentoIndustrial(mapeado.perfilProcesso);
  const sugIndustrial = perfilTemProcessamentoIndustrial(sugerido.perfilProcesso);
  if (mapIndustrial && !sugIndustrial) return sugerido;
  return mapeado;
}

export function sugerirMapeamentoProduto(
  produtoComercialId: string,
  nome: string,
  categoriaComercial?: string | null,
): MapeamentoProdutoComercial {
  return {
    produtoComercialId,
    categoriaCusto: inferirCategoriaProdutoCusto(nome, categoriaComercial),
    perfilProcesso: inferirPerfilProcessoSugerido(nome, categoriaComercial),
    kgPorUnidade: null,
    modoCompraMp: "kg",
    processoModeloId: null,
  };
}

export function custoEmbalagemPorCategoria(
  categoria: CategoriaProdutoCusto,
  config: CustosProdutoProcessoConfig = CUSTOS_PRODUTO_PROCESSO_CONFIG_PADRAO,
): number {
  return categoria === "microverde" ? config.embalagemMicroverdeUn : config.embalagemOutrosUn;
}

/** Garante etapa de logística ao final — editável por ficha, sem repetir manualmente. */
export function garantirEtapaLogistica(
  etapas: EtapaProcessoPadrao[],
  percentual: number = LOGISTICA_PERCENTUAL_PADRAO,
): EtapaProcessoPadrao[] {
  const base = deduplicarEtapasLogistica(etapas);
  if (temEtapaLogistica(base)) return base;
  return [
    ...base,
    etapa("logistica", {
      custoPercentual: percentual,
    }),
  ];
}

function etapa(
  tipo: TipoEtapaProcesso,
  patch: Partial<EtapaProcessoPadrao> & { nome?: string },
): EtapaProcessoPadrao {
  return {
    tipo,
    nome: patch.nome ?? LABEL_ETAPA_PROCESSO[tipo],
    custoPorUnidade: patch.custoPorUnidade ?? 0,
    custoPorKgProcessado: patch.custoPorKgProcessado ?? null,
    custoPercentual: patch.custoPercentual ?? null,
    minutosPorUnidade: patch.minutosPorUnidade ?? null,
    regimeMo: patch.regimeMo ?? "qualquer",
    ativo: patch.ativo ?? true,
  };
}

function perfilUsaLavagem(perfil: PerfilProcessoProduto): boolean {
  return perfil === "lavagem_embalagem" || perfil === "lavagem_corte_embalagem";
}

function perfilUsaCorte(perfil: PerfilProcessoProduto): boolean {
  return perfil === "lavagem_corte_embalagem";
}

function minMoLinha(calc: LinhaProcessoIndustrialResult | null | undefined, nomeEtapa: string): number | null {
  if (!calc) return null;
  const m = calc.etapas.find((e) => e.nome === nomeEtapa)?.minPorUn;
  return m != null && m > 0 ? m : null;
}

function minMoColheitaOuSelecao(
  calc: LinhaProcessoIndustrialResult | null | undefined,
  categoria: CategoriaProdutoCusto,
): number | null {
  if (categoria === "flores") {
    return minMoLinha(calc, "Seleção") ?? minMoLinha(calc, "Colheita");
  }
  return minMoLinha(calc, "Colheita");
}

function labelMoColheitaOuSelecao(categoria: CategoriaProdutoCusto): string {
  return categoria === "flores" ? "Seleção (MO)" : "Colheita (MO)";
}

function etapasMoPorUn(
  calc: LinhaProcessoIndustrialResult | null | undefined,
  config: CustosProdutoProcessoConfig,
  regime: RegimeMoEtapa,
): EtapaProcessoPadrao[] {
  const out: EtapaProcessoPadrao[] = [];
  const embMo = minMoLinha(calc, "Embalagem");
  const selMo = minMoLinha(calc, "Selagem");
  const moCombinado =
    config.embalagemMinutosUn != null && config.embalagemMinutosUn > 0 ? config.embalagemMinutosUn : null;

  if (embMo != null) {
    out.push(
      etapa("mao_de_obra", {
        nome: "Embalagem (MO)",
        minutosPorUnidade: embMo,
        regimeMo: regime,
      }),
    );
  }
  if (selMo != null) {
    out.push(
      etapa("mao_de_obra", {
        nome: "Selagem (MO)",
        minutosPorUnidade: selMo,
        regimeMo: regime,
      }),
    );
  }
  if (out.length === 0 && moCombinado != null && calc == null) {
    out.push(
      etapa("mao_de_obra", {
        nome: "Embalagem + selagem (MO)",
        minutosPorUnidade: moCombinado,
        regimeMo: regime,
      }),
    );
  }
  return out;
}

/**
 * Monta etapas conforme perfil do produto.
 * Lavagem em lote → R$/kg médio (config), não min/un por SKU.
 * Insumo de embalagem fica separado da MO (embalagem/selagem vêm do modelo de linha).
 */
export function etapasProcessoPadraoParaPerfil(
  perfil: PerfilProcessoProduto,
  categoria: CategoriaProdutoCusto,
  config: CustosProdutoProcessoConfig = CUSTOS_PRODUTO_PROCESSO_CONFIG_PADRAO,
  calc?: LinhaProcessoIndustrialResult | null,
): EtapaProcessoPadrao[] {
  /** Revenda simples (só rótulo + frete): sem lavagem/corte no perfil. */
  if (categoria === "revenda" && !perfilTemProcessamentoIndustrial(perfil)) {
    const etapas: EtapaProcessoPadrao[] = [];
    if (config.incluirAdesivo && config.adesivoCustoUn != null && config.adesivoCustoUn > 0) {
      etapas.push(
        etapa("adesivo", {
          custoPorUnidade: config.adesivoCustoUn,
        }),
      );
    }
    return garantirEtapaLogistica(
      etapas,
      config.logisticaPercentualPadrao ?? LOGISTICA_PERCENTUAL_PADRAO,
    );
  }

  const regime = config.regimeMoPadrao;
  const embalagem =
    perfil === "microverde_embalagem"
      ? config.embalagemMicroverdeUn
      : custoEmbalagemPorCategoria(categoria, config);
  const etapas: EtapaProcessoPadrao[] = [];

  if (perfilUsaLavagem(perfil)) {
    if (config.lavagemReaisKg != null && config.lavagemReaisKg > 0) {
      etapas.push(
        etapa("lavagem", {
          nome: "Lavagem industrial (rateio lote R$/kg)",
          custoPorKgProcessado: config.lavagemReaisKg,
        }),
      );
    } else {
      etapas.push(
        etapa("lavagem", {
          nome: "Lavagem (informe R$/kg médio no modelo comum)",
          custoPorKgProcessado: 0,
        }),
      );
    }
  }

  if (
    (perfilUsaLavagem(perfil) || perfilUsaCorte(perfil)) &&
    config.corteMinutosUn != null &&
    config.corteMinutosUn > 0
  ) {
    etapas.push(
      etapa("descasque_corte", {
        nome: "Desfolhagem / corte (MO)",
        minutosPorUnidade: minMoLinha(calc, "Desfolhagem") ?? config.corteMinutosUn,
        regimeMo: regime,
      }),
    );
  }

  etapas.push(
    etapa("embalagem", {
      nome: "Embalagem (insumo)",
      custoPorUnidade: embalagem,
      minutosPorUnidade: null,
      regimeMo: regime,
    }),
  );

  const colheitaMo = minMoColheitaOuSelecao(calc, categoria);
  if (
    colheitaMo != null &&
    (perfil === "microverde_embalagem" || perfil === "colheita_embalagem")
  ) {
    etapas.splice(
      etapas.length - 1,
      0,
      etapa("mao_de_obra", {
        nome: labelMoColheitaOuSelecao(categoria),
        minutosPorUnidade: colheitaMo,
        regimeMo: regime,
      }),
    );
  }

  etapas.push(...etapasMoPorUn(calc, config, regime));

  if (config.incluirAdesivo && config.adesivoCustoUn != null && config.adesivoCustoUn > 0) {
    etapas.push(
      etapa("adesivo", {
        custoPorUnidade: config.adesivoCustoUn,
      }),
    );
  }

  return garantirEtapaLogistica(
    etapas.filter((e) => e.ativo),
    config.logisticaPercentualPadrao ?? LOGISTICA_PERCENTUAL_PADRAO,
  );
}

/** Perfil sugerido a partir das etapas já gravadas na ficha. */
export function inferirPerfilDeEtapas(
  etapas: ReadonlyArray<{ tipo: TipoEtapaProcesso }>,
): PerfilProcessoProduto {
  const tipos = new Set(etapas.map((e) => e.tipo));
  if (tipos.has("lavagem") && tipos.has("descasque_corte")) return "lavagem_corte_embalagem";
  if (tipos.has("lavagem")) return "lavagem_embalagem";
  if (tipos.has("embalagem") && !tipos.has("lavagem") && !tipos.has("descasque_corte")) {
    return "colheita_embalagem";
  }
  return "colheita_embalagem";
}

export function perfilDefaultParaCategoria(categoria: CategoriaProdutoCusto): PerfilProcessoProduto {
  if (categoria === "revenda") return "colheita_embalagem";
  if (categoria === "microverde") return "microverde_embalagem";
  if (categoria === "flores") return "colheita_embalagem";
  if (categoria === "alface") return "lavagem_embalagem";
  return "colheita_embalagem";
}

/** Etapas de processo derivadas de um modelo industrial salvo + perfil do SKU. */
export function etapasProcessoDeModelo(
  perfil: PerfilProcessoProduto,
  categoria: CategoriaProdutoCusto,
  modelo: ProcessoModeloRecord,
  mapaHora?: CustoHoraPorRegime | null,
): EtapaProcessoPadrao[] {
  const derived = derivarProcessoModelo(modelo, mapaHora);
  const config = configFromProcessoModelo(derived);
  const calc = calcularLinhaProcessoIndustrial(derived.linhaProcesso, mapaHora);
  return etapasProcessoPadraoParaPerfil(perfil, categoria, config, calc);
}

/** @deprecated Use etapasProcessoPadraoParaPerfil com mapeamento manual. */
export function etapasProcessoPadraoParaProduto(
  categoria: CategoriaProdutoCusto,
  config: CustosProdutoProcessoConfig = CUSTOS_PRODUTO_PROCESSO_CONFIG_PADRAO,
): EtapaProcessoPadrao[] {
  const perfil =
    categoria === "microverde"
      ? "microverde_embalagem"
      : categoria === "alface"
        ? "lavagem_embalagem"
        : categoria === "flores"
          ? "colheita_embalagem"
          : "colheita_embalagem";
  return etapasProcessoPadraoParaPerfil(perfil, categoria, config);
}

/**
 * Estima R$/kg de lavagem a partir de um lote observado.
 * custoLote ≈ (minutos/60)×R$/h + custos fixos opcionais
 */
export function calcularLavagemReaisKgDeLote(input: {
  minutosLote: number;
  kgTotalLote: number;
  custoHoraMo: number;
  custosFixosLote?: number;
}): number | null {
  const { minutosLote, kgTotalLote, custoHoraMo, custosFixosLote = 0 } = input;
  if (!(minutosLote > 0) || !(kgTotalLote > 0) || !(custoHoraMo >= 0)) return null;
  const custoLote = (minutosLote / 60) * custoHoraMo + custosFixosLote;
  return Math.round((custoLote / kgTotalLote) * 10000) / 10000;
}
