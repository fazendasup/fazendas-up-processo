/**
 * Converte a resposta crua de `fazenda.loadAll` / `automacao.dadosOperacionais` para `FazendaData`.
 * Partilhado entre `FazendaContext` e a página de Automação (módulo contratado).
 */
import type {
  FazendaData,
  Fase,
  FaseConfig,
  ReceitaCrescimentoResumo,
  VariedadeConfig,
  Torre,
  CaixaAgua,
  MedicaoCaixa,
  AplicacaoCaixa,
  Andar,
  AplicacaoAndar,
  Furo,
  PerfilData,
  LoteGerminacao,
  RegistroTransplantio,
  Manutencao,
  CicloAplicacao,
  EstoqueBackupItem,
} from "@/lib/types";
import { FASES_CONFIG } from "@/lib/types";
import { compareTorresPorExibicao } from "@/lib/utils";
import { cultivoBandejaEfetivo } from "@/lib/utils-farm";
import { parseTorreEstruturaOverrideJson } from "@shared/types";

function toDateStr(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString();
  return d;
}

export function transformFazendaLoadAllResponse(raw: unknown): FazendaData {
  const r = raw as Record<string, unknown>;
  // Build lookup maps
  const torreSlugMap = new Map<number, string>();
  const caixaSlugMap = new Map<number, string>();
  const varSlugMap = new Map<number, string>();
  const varNameMap = new Map<number, string>();

  ((r.torres as any[]) || []).forEach((t: any) => torreSlugMap.set(t.id, t.slug));
  ((r.caixasAgua as any[]) || []).forEach((c: any) => caixaSlugMap.set(c.id, c.slug));
  ((r.variedades as any[]) || []).forEach((v: any) => {
    varSlugMap.set(v.id, v.slug);
    varNameMap.set(v.id, v.nome);
  });

  const variedadeDbIdBySlug: Record<string, number> = {};
  ((r.variedades as any[]) || []).forEach((v: any) => {
    const slug = v.slug as string | undefined;
    const nid = typeof v.id === "number" ? v.id : Number(v.id);
    if (slug && Number.isFinite(nid)) variedadeDbIdBySlug[slug] = nid;
  });

  const variedades: VariedadeConfig[] = ((r.variedades as any[]) || []).map((v: any) => ({
    id: v.slug,
    nome: v.nome,
    diasMudas: v.diasMudas,
    diasVegetativa: v.diasVegetativa,
    diasMaturacao: v.diasMaturacao,
    babyLeaf: Boolean(v.babyLeaf),
    variedadeDbId: typeof v.id === "number" ? v.id : Number(v.id) || undefined,
  }));

  const fasesConfig: Record<Fase, FaseConfig> = { ...FASES_CONFIG };
  ((r.fasesConfig as any[]) || []).forEach((fc: any) => {
    const fase = fc.fase as Fase;
    if (fasesConfig[fase]) {
      fasesConfig[fase] = {
        label: fc.label,
        ecMin: fc.ecMin,
        ecMax: fc.ecMax,
        phMin: fc.phMin,
        phMax: fc.phMax,
        cor: fc.cor,
        corLight: fc.corLight,
        icon: fc.icon,
      };
    }
  });

  const caixasAgua: CaixaAgua[] = ((r.caixasAgua as any[]) || []).map((c: any) => {
    const torreIds = ((r.torres as any[]) || [])
      .filter((t: any) => t.caixaAguaId === c.id)
      .map((t: any) => t.slug);
    const medicoes: MedicaoCaixa[] = ((r.medicoesCaixa as any[]) || [])
      .filter((m: any) => m.caixaAguaId === c.id)
      .map((m: any) => ({
        id: `mc-${m.id}`,
        ec: m.ec,
        ph: m.ph,
        dataHora: toDateStr(m.dataHora) || "",
        executadoPorNome: m.executadoPorNome || undefined,
      }))
      .sort((a: MedicaoCaixa, b: MedicaoCaixa) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime());
    const aplicacoes: AplicacaoCaixa[] = ((r.aplicacoesCaixa as any[]) || [])
      .filter((a: any) => a.caixaAguaId === c.id)
      .map((a: any) => ({
        id: `ac-${a.id}`,
        tipo: a.tipo as AplicacaoCaixa["tipo"],
        produto: a.produto,
        quantidade: a.quantidade,
        dataHora: toDateStr(a.dataHora) || "",
        executadoPorNome: a.executadoPorNome || undefined,
      }));
    return {
      id: c.slug,
      nome: c.nome,
      fase: c.fase as Fase,
      torreIds,
      medicoes,
      aplicacoes,
    };
  });

  const torres: Torre[] = ((r.torres as any[]) || [])
    .map((t: any) => ({
      id: t.slug,
      nome: t.nome,
      fase: t.fase as Fase,
      andares: t.numAndares,
      numAndares: t.numAndares,
      numeroTorre: typeof t.numeroTorre === "number" ? t.numeroTorre : 0,
      estruturaOverride: parseTorreEstruturaOverrideJson(t.estruturaOverrideJson ?? null),
      caixaAguaId: t.caixaAguaId ? caixaSlugMap.get(t.caixaAguaId) || "" : "",
      ativa: !(t.ativa === false || t.ativa === 0),
    }))
    .sort(compareTorresPorExibicao);

  const projetoTipoCtx = (r.projetoTipo as string | null | undefined) ?? null;

  const andares: Andar[] = ((r.andares as any[]) || []).map((a: any) => {
    const torreRow = ((r.torres as any[]) || []).find((t: any) => t.id === a.torreId);
    const torreFase = torreRow?.fase as Fase | undefined;
    const isMvIluminacao = projetoTipoCtx === "microverdes" && torreFase != null && torreFase !== "mudas";

    const torreSlug = torreSlugMap.get(a.torreId) || "";
    const andarPerfis = ((r.perfis as any[]) || []).filter((p: any) => p.andarId === a.id);
    const andarFuros = ((r.furos as any[]) || []).filter((f: any) => f.andarId === a.id);
    const andarApps = ((r.aplicacoesAndar as any[]) || []).filter((ap: any) => ap.andarId === a.id);

    const variedadeIdsSet = new Set<string>();
    const variedadeNamesSet = new Set<string>();
    andarPerfis.filter((p: any) => p.ativo && p.variedadeId).forEach((p: any) => {
      const slug = varSlugMap.get(p.variedadeId!) || "";
      if (slug) variedadeIdsSet.add(slug);
      const name = varNameMap.get(p.variedadeId!);
      if (name) variedadeNamesSet.add(name);
    });

    const furosMapped: Furo[] = andarFuros.map((f: any) => ({
      perfilIndex: f.perfilIndex,
      furoIndex: f.furoIndex,
      status: f.status as Furo["status"],
      loteId: f.loteId != null && Number.isFinite(Number(f.loteId)) ? Number(f.loteId) : null,
      variedadeId: f.variedadeId ? varSlugMap.get(f.variedadeId) || undefined : undefined,
    }));

    const perfis: PerfilData[] = andarPerfis.map((p: any) => {
      const base: PerfilData = {
        perfilIndex: p.perfilIndex,
        loteId: p.loteId != null && Number.isFinite(Number(p.loteId)) ? Number(p.loteId) : null,
        variedadeId: p.variedadeId ? varSlugMap.get(p.variedadeId) || undefined : undefined,
        ativo: p.ativo,
        dataEntrada: toDateStr(p.dataEntrada),
        quantidadePlantas:
          p.quantidadePlantas != null && Number.isFinite(Number(p.quantidadePlantas))
            ? Number(p.quantidadePlantas)
            : undefined,
        receitaId: p.receitaId != null && Number.isFinite(Number(p.receitaId)) ? Number(p.receitaId) : undefined,
      };
      if (!isMvIluminacao) {
        return base;
      }
      const fp = furosMapped.filter((f) => f.perfilIndex === p.perfilIndex);
      const rawCs = p.cultivoStatus as string | null | undefined;
      const cs =
        rawCs && (rawCs === "vazio" || rawCs === "plantado" || rawCs === "colhido")
          ? (rawCs as PerfilData["cultivoStatus"])
          : cultivoBandejaEfetivo(base, fp, projetoTipoCtx, torreFase);
      return { ...base, cultivoStatus: cs };
    });

    const furos: Furo[] = isMvIluminacao ? [] : furosMapped;

    const aplicacoes: AplicacaoAndar[] = andarApps.map((ap: any) => ({
      id: `aa-${ap.id}`,
      tipo: ap.tipo as AplicacaoAndar["tipo"],
      produto: ap.produto,
      quantidade: ap.quantidade,
      dataHora: toDateStr(ap.dataHora) || "",
      executadoPorNome: ap.executadoPorNome || undefined,
    }));

    return {
      id: `a-${a.id}`,
      torreId: torreSlug,
      numero: a.numero,
      variedades: Array.from(variedadeNamesSet),
      variedadeIds: Array.from(variedadeIdsSet),
      dataEntrada: toDateStr(a.dataEntrada),
      aplicacoes,
      furos,
      perfis,
      lavado: a.lavado,
      dataColheitaTotal: toDateStr(a.dataColheitaTotal) || undefined,
    };
  });

  const receitaPorId = new Map<number, any>();
  ((r.receitas as any[]) || []).forEach((rec: any) => receitaPorId.set(rec.id, rec));

  const germinacaoDePlanos: LoteGerminacao[] = ((r.planosPlantio as any[]) || [])
    .filter((p: any) => p.status === "planejado" || p.status === "em_germinacao")
    .map((p: any) => {
      const rec = receitaPorId.get(p.receitaId);
      const diasGerm = rec?.diasGerminacao ?? 5;
      const inicio = toDateStr(p.dataInicioGerminacao) || "";
      const fase = p.germinacaoFase || "pendente";
      const status: LoteGerminacao["status"] = fase === "pronto_mudas" ? "pronto" : "germinando";
      const qty = p.quantidadePlantas;
      const g = p.germinadas ?? 0;
      const ng = p.naoGerminadas != null ? p.naoGerminadas : Math.max(0, qty - g);
      return {
        id: `plano-g-${p.id}`,
        variedadeId: varSlugMap.get(p.variedadeId) || "",
        variedadeNome: p.variedadeNome,
        quantidade: qty,
        dataPlantio: inicio,
        dataHora: inicio,
        diasParaTransplantio: diasGerm,
        germinadas: g,
        naoGerminadas: ng,
        transplantadas: p.transplantadasGerminacao ?? 0,
        status,
        observacoes: p.observacoes || undefined,
        executadoPorNome: p.criadoPorNome || undefined,
        fonte: "plano" as const,
      };
    });

  const germinacaoCadastro: LoteGerminacao[] = ((r.germinacao as any[]) || []).map((g: any) => ({
    id: `g-${g.id}`,
    variedadeId: varSlugMap.get(g.variedadeId) || "",
    variedadeNome: g.variedadeNome,
    quantidade: g.quantidade,
    dataPlantio: toDateStr(g.dataPlantio) || "",
    dataHora: toDateStr(g.dataHora) || "",
    diasParaTransplantio: g.diasParaTransplantio,
    germinadas: g.germinadas,
    naoGerminadas: g.naoGerminadas,
    transplantadas: g.transplantadas,
    status: g.status as LoteGerminacao["status"],
    observacoes: g.observacoes || undefined,
    executadoPorNome: g.executadoPorNome || undefined,
    fonte: "cadastro" as const,
  }));

  const germinacao: LoteGerminacao[] = [...germinacaoDePlanos, ...germinacaoCadastro];

  const transplantios: RegistroTransplantio[] = ((r.transplantios as any[]) || []).map((t: any) => ({
    id: `tr-${t.id}`,
    dataHora: toDateStr(t.dataHora) || "",
    faseOrigem: t.faseOrigem as RegistroTransplantio["faseOrigem"],
    faseDestino: t.faseDestino as Fase,
    variedadeId: varSlugMap.get(t.variedadeId) || "",
    variedadeNome: t.variedadeNome,
    quantidadeTransplantada: t.quantidadeTransplantada,
    quantidadeDesperdicio: t.quantidadeDesperdicio,
    motivoDesperdicio: t.motivoDesperdicio || undefined,
    torreDestinoId: t.torreDestinoId ? torreSlugMap.get(t.torreDestinoId) || undefined : undefined,
    andarDestinoId: t.andarDestinoId ? `a-${t.andarDestinoId}` : undefined,
    executadoPorNome: t.executadoPorNome || undefined,
  }));

  const manutencoes: Manutencao[] = ((r.manutencoes as any[]) || []).map((m: any) => ({
    id: `m-${m.id}`,
    torreId: m.torreId != null ? (torreSlugMap.get(m.torreId) || "") : "",
    bancadaId: m.bancadaId ?? undefined,
    andarNumero: m.andarNumero || undefined,
    tipo: m.tipo as Manutencao["tipo"],
    descricao: m.descricao,
    dataAbertura: toDateStr(m.dataAbertura) || "",
    prazo: toDateStr(m.prazo) || undefined,
    dataConclusao: toDateStr(m.dataConclusao) || undefined,
    solucao: m.solucao || undefined,
    status: m.status as Manutencao["status"],
    lampadaIndex: m.lampadaIndex ?? undefined,
    abertoPorNome: m.abertoPorNome || undefined,
    concluidoPorNome: m.concluidoPorNome || undefined,
  }));

  const receitas: ReceitaCrescimentoResumo[] = ((r.receitas as any[]) || []).map((rec: any) => ({
    id: Number(rec.id),
    nome: String(rec.nome || ""),
    variedadeId: Number(rec.variedadeId),
    diasGerminacao: Number(rec.diasGerminacao ?? 5),
    diasMudas: Number(rec.diasMudas ?? 14),
    diasVegetativa: Number(rec.diasVegetativa ?? 21),
    diasMaturacao: Number(rec.diasMaturacao ?? 28),
    ativa: rec.ativa !== false && rec.ativa !== 0,
    updatedAt: rec.updatedAt
      ? rec.updatedAt instanceof Date
        ? rec.updatedAt.toISOString()
        : String(rec.updatedAt)
      : null,
  }));

  const ciclos: CicloAplicacao[] = ((r.ciclos as any[]) || []).map((c: any) => ({
    id: `c-${c.id}`,
    nome: c.nome,
    frequencia: c.frequencia as CicloAplicacao["frequencia"],
    diasSemana: c.diasSemana as number[] | undefined,
    intervaloDias: c.intervaloDias || undefined,
    produto: c.produto,
    tipo: c.tipo,
    dosagem: c.dosagem || undefined,
    fasesAplicaveis: (c.fasesAplicaveis as Fase[]) || [],
    alvo: c.alvo as CicloAplicacao["alvo"],
    ultimaExecucao: toDateStr(c.ultimaExecucao) || undefined,
    ultimoExecutorNome: c.ultimoExecutorNome || undefined,
    ativo: c.ativo,
  }));

  const estoqueItens: EstoqueBackupItem[] = ((r.estoqueItens as any[]) || []).map((e: any) => ({
    id: Number(e.id),
    categoria: String(e.categoria || ""),
    nome: String(e.nome || ""),
    quantidadeTotal: Number(e.quantidadeTotal ?? 0),
    unidadeTipo: String(e.unidadeTipo || "unidade"),
    usoPorEvento: Number(e.usoPorEvento ?? 0),
    frequenciaDias: Number(e.frequenciaDias ?? 1),
    prazoEntregaDias: Number(e.prazoEntregaDias ?? 7),
    diasMargemCompra: Number(e.diasMargemCompra ?? 7),
    nivelMinimo: e.nivelMinimo != null ? Number(e.nivelMinimo) : null,
    precoUnitario: e.precoUnitario != null ? Number(e.precoUnitario) : null,
    fornecedor: e.fornecedor ?? null,
    observacoes: e.observacoes ?? null,
    consumoAplicadoAte: toDateStr(e.consumoAplicadoAte),
    createdAt: toDateStr(e.createdAt),
    updatedAt: toDateStr(e.updatedAt),
  }));

  return {
    projetoTipo: (r.projetoTipo as FazendaData["projetoTipo"]) ?? null,
    torres,
    caixasAgua,
    andares,
    ciclos,
    fasesConfig,
    variedades,
    receitas,
    variedadeDbIdBySlug,
    germinacao,
    transplantios,
    manutencoes,
    estoqueItens,
  };
}

export const EMPTY_FAZENDA_DATA: FazendaData = {
  projetoTipo: null,
  torres: [],
  caixasAgua: [],
  andares: [],
  ciclos: [],
  fasesConfig: { ...FASES_CONFIG },
  variedades: [],
  receitas: [],
  variedadeDbIdBySlug: {},
  germinacao: [],
  transplantios: [],
  manutencoes: [],
  estoqueItens: [],
};
