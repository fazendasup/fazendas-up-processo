import type { CategoriaProdutoCusto, ModoCompraMp } from "./custosProduto";
import type { LinhaProcessoIndustrialInput } from "./custosLinhaProcessoIndustrial";
import { LABEL_ETAPA_PROCESSO, type TipoEtapaProcesso } from "./custosProduto";
import type { RegimeMoEtapa } from "./custosMoEquipe";

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
  /** Parâmetros da linha industrial (persistidos para recalcular). */
  linhaProcesso?: LinhaProcessoIndustrialInput | null;
};

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
};

export function perfilUsaLavagemKg(perfil: PerfilProcessoProduto): boolean {
  return perfil === "lavagem_embalagem" || perfil === "lavagem_corte_embalagem";
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
  if (n.includes("mix") || cat.includes("mix")) return "mix";
  if (n.includes("alface") || n.includes("rucula") || n.includes("folha") || n.includes("agriao")) {
    return "alface";
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
  if (categoria === "microverde") return "microverde_embalagem";
  if (categoria === "alface") return "lavagem_embalagem";
  if (n.includes("baby leaf") || n.includes("babyleaf")) return "colheita_embalagem";
  return "colheita_embalagem";
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
  };
}

export function custoEmbalagemPorCategoria(
  categoria: CategoriaProdutoCusto,
  config: CustosProdutoProcessoConfig = CUSTOS_PRODUTO_PROCESSO_CONFIG_PADRAO,
): number {
  return categoria === "microverde" ? config.embalagemMicroverdeUn : config.embalagemOutrosUn;
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

/**
 * Monta etapas conforme perfil do produto.
 * Lavagem em lote → R$/kg médio (config), não min/un por SKU.
 */
export function etapasProcessoPadraoParaPerfil(
  perfil: PerfilProcessoProduto,
  categoria: CategoriaProdutoCusto,
  config: CustosProdutoProcessoConfig = CUSTOS_PRODUTO_PROCESSO_CONFIG_PADRAO,
): EtapaProcessoPadrao[] {
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
        nome: "Desfolhagem / corte",
        minutosPorUnidade: config.corteMinutosUn,
        regimeMo: regime,
      }),
    );
  }

  etapas.push(
    etapa("embalagem", {
      custoPorUnidade: embalagem,
      minutosPorUnidade:
        config.embalagemMinutosUn != null && config.embalagemMinutosUn > 0
          ? config.embalagemMinutosUn
          : null,
      regimeMo: regime,
    }),
  );

  if (config.incluirAdesivo && config.adesivoCustoUn != null && config.adesivoCustoUn > 0) {
    etapas.push(
      etapa("adesivo", {
        custoPorUnidade: config.adesivoCustoUn,
      }),
    );
  }

  return etapas.filter((e) => e.ativo);
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
