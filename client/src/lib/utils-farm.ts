// ============================================================
// Utilitários de cálculo para Fazendas Up v3
// Prazos por fase: com `data.receitas` + `variedadeDbId` usa a mesma receita priorizada que o servidor/planejamento.
// Contagem de plantas adaptada para mudas (perfis abertos) vs vegetativa/maturação (furos)
// ============================================================

import type {
  Fase,
  FaseConfig,
  CicloAplicacao,
  Torre,
  Andar,
  FazendaData,
  VariedadeConfig,
  Manutencao,
  MedicaoCaixa,
  PerfilData,
  Furo,
  ReceitaCrescimentoResumo,
} from './types';
import { FASES_CONFIG } from './types';
import { variedadePulaVegetativa } from '@shared/variedadesFase';
import { estruturaFaseParaProjeto, type TorreEstruturaOverride } from '@shared/types';
import { receitaCicloPrioritariaParaVariedade } from '@shared/cicloReceita';

/** Microverdes iluminação: cultivo em nível de bandeja (perfil), sem furos. */
export type CultivoBandejaStatus = 'vazio' | 'plantado' | 'colhido';

export function cultivoBandejaEfetivo(
  perfil: PerfilData | undefined,
  furosDoPerfil: Furo[],
  projetoTipo: string | null | undefined,
  fase: Fase | undefined,
): CultivoBandejaStatus {
  if (projetoTipo !== 'microverdes' || fase === 'mudas' || !fase) return 'vazio';
  const ex = perfil?.cultivoStatus;
  if (ex === 'vazio' || ex === 'plantado' || ex === 'colhido') return ex;
  if (!furosDoPerfil.length) return 'vazio';
  if (furosDoPerfil.some((f) => f.status === 'colhido')) return 'colhido';
  if (furosDoPerfil.some((f) => f.status === 'plantado')) return 'plantado';
  return 'vazio';
}

/** Andares da torre com `numero` em 1..N conforme `numAndares`/`andares` (ignora linhas órfãs no BD). */
export function andaresDaTorreDeclarados(
  andares: Andar[],
  torre: Pick<Torre, 'id' | 'numAndares' | 'andares'>,
): Andar[] {
  const list = andares.filter((a) => a.torreId === torre.id);
  const cap = torre.numAndares ?? torre.andares;
  if (cap == null || !Number.isFinite(Number(cap)) || Number(cap) <= 0) return list;
  const n = Math.floor(Number(cap));
  return list.filter((a) => a.numero >= 1 && a.numero <= n);
}

/** `true` se o andar deve contar para a torre segundo `numAndares`/`andares` (exclui órfãos no BD). */
export function andarDentroDoModeloDaTorre(andar: Andar, torre: Torre): boolean {
  const cap = torre.numAndares ?? torre.andares;
  if (cap == null || !Number.isFinite(Number(cap)) || Number(cap) <= 0) return true;
  const n = Math.floor(Number(cap));
  return andar.numero >= 1 && andar.numero <= n;
}

// ---- Dias de ciclo (valores expostos na variedade vêm da receita base no servidor) ----

/** Opções para alinhar prazos ao catálogo `receitas` (várias receitas por variedade). */
export type CicloPrazoOpts = {
  receitas?: ReceitaCrescimentoResumo[];
  /** Fallback quando o slug do perfil não está na lista `variedades` (ex.: resposta parcial). */
  variedadeDbIdBySlug?: Record<string, number>;
  /**
   * IANA (ex. `America/Sao_Paulo`), vindo de `localStorage pref.fuso` em `cicloPrazoOptsFromFazenda`.
   * “Hoje” e dias restantes usam este relógio de parede quando definido.
   */
  timeZoneIANA?: string;
};

function timeZoneOperacionalFromStorage(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const z = localStorage.getItem('pref.fuso')?.trim();
    if (!z) return undefined;
    new Intl.DateTimeFormat('en-US', { timeZone: z }).format(new Date());
    return z;
  } catch {
    return undefined;
  }
}

/** Opções de prazo a partir do contexto da fazenda (torre, Home, KPIs). */
export function cicloPrazoOptsFromFazenda(data: Pick<FazendaData, 'receitas' | 'variedadeDbIdBySlug'>): CicloPrazoOpts {
  return {
    receitas: data.receitas,
    variedadeDbIdBySlug: data.variedadeDbIdBySlug ?? {},
    timeZoneIANA: timeZoneOperacionalFromStorage(),
  };
}

/** Retorna dias de ciclo para uma variedade em uma fase. Retorna 0 se não encontrar. */
export function diasCicloVariedade(
  variedadeId: string | undefined,
  fase: Fase,
  variedades: VariedadeConfig[],
): number {
  if (variedadeId) {
    const v = variedades.find((vr) => vr.id === variedadeId);
    if (v) {
      if (fase === 'mudas') return v.diasMudas;
      if (fase === 'vegetativa') {
        if (variedadePulaVegetativa(v.id, v.nome)) return 0;
        return v.diasVegetativa;
      }
      return v.diasMaturacao;
    }
  }
  return 0; // sem variedade definida, sem previsão
}

/**
 * Dias para previsão: com `receitas` + `variedadeDbId` usa **sempre** a receita priorizada atual
 * (`receitaCicloPrioritariaParaVariedade` — ex.: após editar BS 155 de 14→10 dias na vegetativa).
 * Não usa `perfil.receitaId` gravado, para não ficar preso a uma receita antiga quando o catálogo muda.
 */
export function diasCicloParaPrevisao(
  variedadeId: string | undefined,
  fase: Fase,
  variedades: VariedadeConfig[],
  opts?: CicloPrazoOpts,
): number {
  const v = variedadeId ? variedades.find((vr) => vr.id === variedadeId) : undefined;
  const receitas = opts?.receitas;
  const map = opts?.variedadeDbIdBySlug;
  const fromMap = variedadeId && map ? map[variedadeId] : undefined;
  const dbIdRaw = v?.variedadeDbId ?? fromMap;
  const dbId =
    dbIdRaw != null && String(dbIdRaw).trim() !== '' && Number.isFinite(Number(dbIdRaw))
      ? Number(dbIdRaw)
      : undefined;
  let nomeVar = v?.nome ?? '';
  if (!nomeVar && receitas?.length && dbId != null) {
    const rw = receitaCicloPrioritariaParaVariedade(receitas, dbId);
    if (rw?.nome) nomeVar = String(rw.nome);
  }
  if (receitas?.length && dbId != null) {
    const r = receitaCicloPrioritariaParaVariedade(receitas, dbId);
    if (r) {
      if (fase === 'mudas') return Number(r.diasMudas ?? 0);
      if (fase === 'vegetativa') {
        if (variedadeId && variedadePulaVegetativa(variedadeId, nomeVar || r.nome || '')) return 0;
        return Number(r.diasVegetativa ?? 0);
      }
      return Number(r.diasMaturacao ?? 0);
    }
  }
  return diasCicloVariedade(variedadeId, fase, variedades);
}

/** yyyy-mm-dd no calendário local do navegador (en-CA). */
function ymdFromLocalDate(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** Dia civil “hoje” conforme fuso operacional ou calendário local. */
function ymdRelogioOperacional(agora: Date, cicloOpts?: CicloPrazoOpts): string {
  const tz = cicloOpts?.timeZoneIANA;
  if (tz) {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(agora);
    } catch {
      /* invalid tz */
    }
  }
  return ymdFromLocalDate(agora);
}

/** Meio-dia local no dia civil `ymd` (evita DST; estável para somar dias). */
function localNoonFromYmd(ymd: string): Date {
  const parts = ymd.split('-').map(Number);
  const y = parts[0]!;
  const m = parts[1]!;
  const day = parts[2]!;
  const t = new Date(y, m - 1, day, 12, 0, 0, 0);
  if (
    Number.isNaN(t.getTime()) ||
    t.getFullYear() !== y ||
    t.getMonth() !== m - 1 ||
    t.getDate() !== day
  ) {
    throw new Error(`Invalid ymd: ${ymd}`);
  }
  return t;
}

function addCalendarDaysToYmd(ymd: string, n: number): string {
  const t = localNoonFromYmd(ymd);
  t.setDate(t.getDate() + n);
  return ymdFromLocalDate(t);
}

/** Diferença em dias civis: `toYmd` − `fromYmd` (inteiro). */
function diffCalendarDaysYmd(fromYmd: string, toYmd: string): number {
  const a = localNoonFromYmd(fromYmd).getTime();
  const b = localNoonFromYmd(toYmd).getTime();
  return Math.round((b - a) / 86400000);
}

/**
 * Dia civil de entrada operacional: se o valor começa com `yyyy-mm-dd`, usa esse triplo
 * (intenção do `<input type="date">` / ISO `…T00:00:00.000Z`), sem deslocar para “véspera” no fuso local.
 * Caso contrário, usa o dia civil local do instante parseado.
 */
function entradaYmdOperacional(dataEntrada: string): string | null {
  const s = dataEntrada.trim();
  const head = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (head) {
    const ymd = head[1]!;
    try {
      localNoonFromYmd(ymd);
      return ymd;
    } catch {
      /* cai no parse abaixo */
    }
  }
  const t = new Date(s);
  if (Number.isNaN(t.getTime())) return null;
  return ymdRelogioOperacional(t, undefined);
}

/** Calcula dias decorridos (dias civis desde o dia de entrada; “hoje” = fuso `pref.fuso` quando existir). */
export function diasDecorridos(
  dataEntrada: string | null,
  second?: Date | CicloPrazoOpts,
): number {
  if (!dataEntrada) return 0;
  const entradaYmd = entradaYmdOperacional(dataEntrada);
  if (!entradaYmd) return 0;
  const agora = second instanceof Date ? second : undefined;
  const cicloOpts = second instanceof Date ? undefined : second;
  const hojeYmd = ymdRelogioOperacional(agora ?? new Date(), cicloOpts);
  return Math.max(0, diffCalendarDaysYmd(entradaYmd, hojeYmd));
}

/** Calcula data prevista (fim do ciclo em dia civil) — ISO do meio-dia local do dia de vencimento. */
export function dataPrevista(
  dataEntrada: string | null,
  fase: Fase,
  variedadeId?: string,
  variedades?: VariedadeConfig[],
  opts?: CicloPrazoOpts,
): string | null {
  if (!dataEntrada) return null;
  const dias = diasCicloParaPrevisao(variedadeId, fase, variedades || [], opts);
  if (dias <= 0) return null; // sem variedade = sem previsão
  const entradaYmd = entradaYmdOperacional(dataEntrada);
  if (!entradaYmd) return null;
  const dueYmd = addCalendarDaysToYmd(entradaYmd, dias);
  return localNoonFromYmd(dueYmd).toISOString();
}

/** Retorna label da previsão baseado na fase */
export function labelPrevisao(fase: Fase, projetoTipo?: string | null): string {
  if (projetoTipo === 'microverdes' && fase !== 'mudas') return 'Colheita';
  if (fase === 'maturacao') return 'Colheita';
  return 'Transplante';
}

/** FV: colheita só em maturação. Microverdes: colheita nas torres de iluminação (não mudas). */
export function torreUsaMetricasColheita(fase: Fase, projetoTipo?: string | null): boolean {
  if (projetoTipo === 'microverdes') return fase !== 'mudas';
  return fase === 'maturacao';
}

/** Dias restantes até a previsão (dias civis locais; no dia do vencimento retorna 0). */
export function diasRestantes(
  dataEntrada: string | null,
  fase: Fase,
  variedadeId?: string,
  variedades?: VariedadeConfig[],
  opts?: CicloPrazoOpts,
  agora?: Date,
): number | null {
  if (!dataEntrada) return null;
  const dias = diasCicloParaPrevisao(variedadeId, fase, variedades || [], opts);
  if (dias <= 0) return null;
  const entradaYmd = entradaYmdOperacional(dataEntrada);
  if (!entradaYmd) return null;
  const dueYmd = addCalendarDaysToYmd(entradaYmd, dias);
  const hojeYmd = ymdRelogioOperacional(agora ?? new Date(), opts);
  return diffCalendarDaysYmd(hojeYmd, dueYmd);
}

/**
 * Mesma regra visual do `TorreCard` / grelha de perfis: vermelho (vencido) `rest<=0`,
 * laranja (quase) `0<rest<=3`, restante ok.
 */
export function bandeiraPrazoDashboard(rest: number | null): 'vencido' | 'quase' | 'ok' | 'sem' {
  if (rest === null) return 'sem';
  if (rest <= 0) return 'vencido';
  if (rest <= 3) return 'quase';
  return 'ok';
}

/** Verifica se EC está fora do range */
export function ecForaRange(ec: number, fase: Fase, fasesConfig?: Record<Fase, FaseConfig>): 'baixo' | 'alto' | 'ok' {
  const config = fasesConfig?.[fase] || FASES_CONFIG[fase];
  if (ec < config.ecMin) return 'baixo';
  if (ec > config.ecMax) return 'alto';
  return 'ok';
}

/** Verifica se pH está fora do range */
export function phForaRange(ph: number, fase: Fase, fasesConfig?: Record<Fase, FaseConfig>): 'baixo' | 'alto' | 'ok' {
  const config = fasesConfig?.[fase] || FASES_CONFIG[fase];
  if (ph < config.phMin) return 'baixo';
  if (ph > config.phMax) return 'alto';
  return 'ok';
}

/** Última medição por data/hora (o payload do servidor não garante ordenação). */
export function ultimaMedicaoPorData(medicoes: MedicaoCaixa[]): MedicaoCaixa | null {
  if (!medicoes?.length) return null;
  let best = medicoes[0];
  let bestTs = new Date(best.dataHora).getTime();
  for (let i = 1; i < medicoes.length; i++) {
    const m = medicoes[i];
    const ts = new Date(m.dataHora).getTime();
    if (ts >= bestTs) {
      best = m;
      bestTs = ts;
    }
  }
  return best;
}

// ---- Ciclos (com fix: verificar se já executou HOJE) ----

/** Verifica se um ciclo está pendente hoje */
export function cicloPendenteHoje(ciclo: CicloAplicacao): boolean {
  if (!ciclo.ativo) return false;
  const hoje = new Date();
  const hojeDia = hoje.getDay();

  // Verificar se já foi executado hoje
  if (ciclo.ultimaExecucao) {
    const ultima = new Date(ciclo.ultimaExecucao);
    const mesmodia =
      ultima.getFullYear() === hoje.getFullYear() &&
      ultima.getMonth() === hoje.getMonth() &&
      ultima.getDate() === hoje.getDate();
    if (mesmodia) return false;
  }

  if (ciclo.frequencia === 'diaria') return true;

  if (ciclo.frequencia === 'semanal' && ciclo.diasSemana) {
    return ciclo.diasSemana.includes(hojeDia);
  }

  if (ciclo.frequencia === 'quinzenal' || ciclo.frequencia === 'mensal' || ciclo.frequencia === 'personalizada') {
    if (!ciclo.ultimaExecucao) return true;
    const ultima = new Date(ciclo.ultimaExecucao);
    const diffDias = Math.floor((hoje.getTime() - ultima.getTime()) / (1000 * 60 * 60 * 24));
    const intervalo = ciclo.intervaloDias || (ciclo.frequencia === 'quinzenal' ? 14 : 30);
    return diffDias >= intervalo;
  }

  return false;
}

/** Conta ciclos pendentes para uma fase */
export function contarCiclosPendentes(ciclos: CicloAplicacao[], fase: Fase): number {
  return ciclos.filter(
    (c) => c.fasesAplicaveis.includes(fase) && cicloPendenteHoje(c)
  ).length;
}

// ---- Contagem de plantas ----

/** Conta plantas ativas em um andar (status 'plantado') */
export function contarPlantasAndar(andar: Andar, fase?: Fase, projetoTipo?: string | null): number {
  if (fase === 'mudas') {
    return (andar.perfis || []).filter((p) => p.ativo).length;
  }
  if (projetoTipo === 'microverdes' && fase) {
    const furos = andar.furos || [];
    return (andar.perfis || []).filter(
      (p) => cultivoBandejaEfetivo(p, furos.filter((f) => f.perfilIndex === p.perfilIndex), projetoTipo, fase) === 'plantado',
    ).length;
  }
  if (!andar.furos) return 0;
  return andar.furos.filter((f) => f.status === 'plantado').length;
}

/** Retorna a capacidade total de um andar (perfis para mudas, furos para as demais) */
export function capacidadeAndar(
  fase: Fase,
  projetoTipo?: string | null,
  estruturaOverride?: TorreEstruturaOverride | null,
): number {
  const est = estruturaFaseParaProjeto(projetoTipo, fase, estruturaOverride);
  if (est.furosPorPerfil === 0) return est.perfis; // mudas
  return est.perfis * est.furosPorPerfil; // vegetativa=108, maturacao=36
}

/** Conta lotes/bandejas colhidos (maturação FV; microverdes iluminação) */
export function contarColhidasAndar(andar: Andar, fase?: Fase, projetoTipo?: string | null): number {
  if (projetoTipo === 'microverdes' && fase) {
    const furos = andar.furos || [];
    return (andar.perfis || []).filter(
      (p) => cultivoBandejaEfetivo(p, furos.filter((f) => f.perfilIndex === p.perfilIndex), projetoTipo, fase) === 'colhido',
    ).length;
  }
  if (!andar.furos) return 0;
  return andar.furos.filter((f) => f.status === 'colhido').length;
}

/** Conta furos vazios em um andar */
export function contarVaziosAndar(
  andar: Andar,
  fase?: Fase,
  projetoTipo?: string | null,
  estruturaOverride?: TorreEstruturaOverride | null,
): number {
  const cap = capacidadeAndar(fase || 'maturacao', projetoTipo, estruturaOverride);
  if (fase === 'mudas') {
    return cap - (andar.perfis || []).filter((p) => p.ativo).length;
  }
  if (projetoTipo === 'microverdes' && fase) {
    const furos = andar.furos || [];
    const occ = (andar.perfis || []).filter(
      (p) => cultivoBandejaEfetivo(p, furos.filter((f) => f.perfilIndex === p.perfilIndex), projetoTipo, fase) !== 'vazio',
    ).length;
    return cap - occ;
  }
  if (!andar.furos) return cap;
  return andar.furos.filter((f) => f.status === 'vazio').length;
}

/** Verifica se um andar está ocupado (tem plantas ou perfis ativos) */
export function andarOcupado(andar: Andar, fase?: Fase, projetoTipo?: string | null): boolean {
  if (fase === 'mudas') {
    return (andar.perfis || []).some((p) => p.ativo);
  }
  if (projetoTipo === 'microverdes' && fase) {
    const furos = andar.furos || [];
    return (andar.perfis || []).some(
      (p) => cultivoBandejaEfetivo(p, furos.filter((f) => f.perfilIndex === p.perfilIndex), projetoTipo, fase) !== 'vazio',
    );
  }
  if (andar.furos && andar.furos.some((f) => f.status === 'plantado' || f.status === 'colhido')) return true;
  return !!andar.dataEntrada;
}

/** Verifica se andar precisa de lavagem pós-colheita */
export function andarPrecisaLavagem(andar: Andar): boolean {
  if (!andar.dataColheitaTotal) return false;
  return !andar.lavado;
}

/** Obtém a variedade principal de um perfil */
export function variedadePerfil(andar: Andar, perfilIndex: number): string | undefined {
  const perfil = (andar.perfis || []).find((p) => p.perfilIndex === perfilIndex);
  return perfil?.variedadeId;
}

/** Obtém a variedade principal do andar (a mais comum entre os perfis) */
export function variedadePrincipalAndar(andar: Andar): string | undefined {
  const perfis = andar.perfis || [];
  const ativos = perfis.filter((p) => p.ativo && p.variedadeId);
  if (ativos.length === 0) return andar.variedadeIds?.[0];
  // Retorna a mais frequente
  const counts: Record<string, number> = {};
  ativos.forEach((p) => {
    if (p.variedadeId) counts[p.variedadeId] = (counts[p.variedadeId] || 0) + 1;
  });
  let maxId = ativos[0].variedadeId;
  let maxCount = 0;
  Object.entries(counts).forEach(([id, count]) => {
    if (count > maxCount) { maxId = id; maxCount = count; }
  });
  return maxId;
}

/** Conta alertas de uma torre */
export function contarAlertasTorre(
  torre: Torre,
  andares: Andar[],
  variedades?: VariedadeConfig[],
  _fasesConfig?: Record<Fase, FaseConfig>,
  manutencoes?: Manutencao[],
  cicloOpts?: CicloPrazoOpts,
): number {
  let alertas = 0;
  const andaresTorre = andares.filter((a) => a.torreId === torre.id);

  andaresTorre.forEach((andar) => {
    // Verificar por perfil individual se há algum com previsão vencida
    const perfisAtivos = (andar.perfis || []).filter((p) => p.ativo);
    const temPerfilVencido = perfisAtivos.some((p) => {
      const dateStr = p.dataEntrada || andar.dataEntrada;
      if (!dateStr) return false;
      const rest = diasRestantes(dateStr, torre.fase, p.variedadeId || undefined, variedades, cicloOpts);
      return rest !== null && rest <= 0;
    });
    if (temPerfilVencido) alertas++;
    if (andarPrecisaLavagem(andar)) alertas++;
  });

  // Ciclos são da fazenda/fase, não por torre — somar aqui repetia o mesmo número em todo card da fase (ex.: "2" em todas as torres vazias).
  // Ciclos pendentes continuam no painel inicial (Home) e em "Hoje".

  if (manutencoes) {
    alertas += manutencoes.filter(
      (m) => m.torreId === torre.id && m.status !== 'concluida'
    ).length;
  }

  return alertas;
}

// ---- KPIs ----

/** Por fase: contagem e capacidade na mesma unidade (mudas=perfis; vegetativa/maturação=furos). */
export type OcupacaoFaseSnapshot = {
  ocupadas: number;
  capacidade: number;
  /** 0–100, uma casa decimal */
  taxa: number;
};

function snapshotOcupacaoFase(ocupadas: number, capacidade: number): OcupacaoFaseSnapshot {
  const taxa = capacidade > 0 ? Math.round((ocupadas / capacidade) * 1000) / 10 : 0;
  return { ocupadas, capacidade, taxa };
}

export interface FazendaKPIs {
  totalPlantas: number;
  plantasEmProcesso: number;
  plantasProntasColheita: number;
  plantasColhidas: number;
  /** Ocupação global: soma (ocupadas) / soma (capacidade) — mudas em perfis, outras fases em furos. */
  taxaOcupacao: number;
  /** Ocupação homogénea dentro de cada fase (comparar % entre fases com cautela). */
  ocupacaoPorFase: Record<Fase, OcupacaoFaseSnapshot>;
  taxaGerminacao: number;
  totalDesperdicio: number;
  taxaDesperdicio: number;
  totalGerminando: number;
  totalTransplantios: number;
  manutencoesAbertas: number;
  manutencoesVencidas: number;
  andaresLavagemPendente: number;
}

export function calcularKPIs(data: FazendaData): FazendaKPIs {
  const projetoTipo = data.projetoTipo ?? null;
  let totalPlantas = 0;
  let plantasEmProcesso = 0;
  let plantasProntasColheita = 0;
  let plantasColhidas = 0;
  let andaresLavagemPendente = 0;
  let capacidadeTotal = 0;
  const occPorFase: Record<Fase, { ocupadas: number; capacidade: number }> = {
    mudas: { ocupadas: 0, capacidade: 0 },
    vegetativa: { ocupadas: 0, capacidade: 0 },
    maturacao: { ocupadas: 0, capacidade: 0 },
  };

  data.andares.forEach((andar) => {
    const torre = data.torres.find((t) => t.id === andar.torreId);
    if (!torre) return;
    if (!andarDentroDoModeloDaTorre(andar, torre)) return;

    const plantadas = contarPlantasAndar(andar, torre.fase, projetoTipo);
    totalPlantas += plantadas;

    const capAndar = capacidadeAndar(torre.fase, projetoTipo, torre.estruturaOverride ?? null);
    capacidadeTotal += capAndar;
    const f = torre.fase;
    if (f === 'mudas' || f === 'vegetativa' || f === 'maturacao') {
      occPorFase[f].ocupadas += plantadas;
      occPorFase[f].capacidade += capAndar;
    }

    // FV: colheita na maturação. Microverdes: iluminação (vegetativa / legado maturação).
    if (torreUsaMetricasColheita(torre.fase, projetoTipo)) {
      const colhidas = contarColhidasAndar(andar, torre.fase, projetoTipo);
      plantasColhidas += colhidas;

      const furos = andar.furos || [];
      const perfisAlvo = (andar.perfis || []).filter((p) => {
        if (projetoTipo === 'microverdes' && torre.fase !== 'mudas') {
          return cultivoBandejaEfetivo(p, furos.filter((f) => f.perfilIndex === p.perfilIndex), projetoTipo, torre.fase) === 'plantado';
        }
        return p.ativo;
      });
      if (perfisAlvo.length > 0) {
        perfisAlvo.forEach((p) => {
          const dateStr = p.dataEntrada || andar.dataEntrada;
          if (dateStr) {
            const rest = diasRestantes(
              dateStr,
              torre.fase,
              p.variedadeId || undefined,
              data.variedades,
              cicloPrazoOptsFromFazenda(data),
            );
            if (rest !== null && rest <= 0) {
              if (projetoTipo === 'microverdes' && torre.fase !== 'mudas') {
                plantasProntasColheita += 1;
              } else {
                const furosPerfil = furos.filter((f) => f.perfilIndex === p.perfilIndex && f.status === 'plantado');
                plantasProntasColheita += furosPerfil.length;
              }
            }
          }
        });
        plantasEmProcesso += plantadas - Math.min(plantasProntasColheita, plantadas);
      } else {
        plantasEmProcesso += plantadas;
      }
    } else {
      plantasEmProcesso += plantadas;
    }

    if (andarPrecisaLavagem(andar)) andaresLavagemPendente++;
  });

  const taxaOcupacao = capacidadeTotal > 0 ? (totalPlantas / capacidadeTotal) * 100 : 0;
  const ocupacaoPorFase: Record<Fase, OcupacaoFaseSnapshot> = {
    mudas: snapshotOcupacaoFase(occPorFase.mudas.ocupadas, occPorFase.mudas.capacidade),
    vegetativa: snapshotOcupacaoFase(occPorFase.vegetativa.ocupadas, occPorFase.vegetativa.capacidade),
    maturacao: snapshotOcupacaoFase(occPorFase.maturacao.ocupadas, occPorFase.maturacao.capacidade),
  };

  // Germinação
  const totalGerminando = data.germinacao.filter((g) => g.status === 'germinando').length;
  let totalSementes = 0;
  let totalGerminadas = 0;
  data.germinacao.forEach((g) => {
    totalSementes += g.quantidade;
    totalGerminadas += g.germinadas;
  });
  const taxaGerminacao = totalSementes > 0 ? (totalGerminadas / totalSementes) * 100 : 0;

  // Desperdício
  let totalDesperdicio = 0;
  let totalTransplantadas = 0;
  data.transplantios.forEach((t) => {
    totalDesperdicio += t.quantidadeDesperdicio;
    totalTransplantadas += t.quantidadeTransplantada + t.quantidadeDesperdicio;
  });
  const taxaDesperdicio = totalTransplantadas > 0 ? (totalDesperdicio / totalTransplantadas) * 100 : 0;

  // Manutenção
  const manutencoesAbertas = data.manutencoes.filter((m) => m.status !== 'concluida').length;
  const hoje = new Date();
  const manutencoesVencidas = data.manutencoes.filter((m) => {
    if (m.status === 'concluida') return false;
    if (!m.prazo) return false;
    return new Date(m.prazo) < hoje;
  }).length;

  return {
    totalPlantas,
    plantasEmProcesso,
    plantasProntasColheita,
    plantasColhidas,
    taxaOcupacao: Math.round(taxaOcupacao * 10) / 10,
    ocupacaoPorFase,
    taxaGerminacao: Math.round(taxaGerminacao * 10) / 10,
    totalDesperdicio,
    taxaDesperdicio: Math.round(taxaDesperdicio * 10) / 10,
    totalGerminando,
    totalTransplantios: data.transplantios.length,
    manutencoesAbertas,
    manutencoesVencidas,
    andaresLavagemPendente,
  };
}

/** Uma linha do resumo “prontos para colheita” por variedade (MV: bandejas; FV maturação: furos plantados). */
export type ProntoColheitaVariedadeItem = {
  variedadeId: string;
  nome: string;
  quantidade: number;
};

function nomeVariedadeOuId(variedades: VariedadeConfig[], id: string): string {
  return variedades.find((v) => v.id === id)?.nome ?? id;
}

/**
 * Acumula unidades prontas para colheita por `variedadeId`, com a mesma regra de `calcularKPIs` → `plantasProntasColheita`.
 * Só torres em fase de colheita (`torreUsaMetricasColheita`).
 */
export function mergeProntosColheitaPorVariedadeAndar(
  acc: Record<string, number>,
  andar: Andar,
  torre: Torre,
  variedades: VariedadeConfig[],
  cicloOpts: CicloPrazoOpts,
  projetoTipo: string | null,
): void {
  if (!torreUsaMetricasColheita(torre.fase, projetoTipo)) return;
  if (!andarDentroDoModeloDaTorre(andar, torre)) return;

  const furos = andar.furos || [];
  const perfisAlvo = (andar.perfis || []).filter((p) => {
    if (projetoTipo === 'microverdes' && torre.fase !== 'mudas') {
      return (
        cultivoBandejaEfetivo(p, furos.filter((f) => f.perfilIndex === p.perfilIndex), projetoTipo, torre.fase) ===
        'plantado'
      );
    }
    return p.ativo;
  });

  for (const p of perfisAlvo) {
    const dateStr = p.dataEntrada || andar.dataEntrada;
    if (!dateStr) continue;
    const rest = diasRestantes(dateStr, torre.fase, p.variedadeId || undefined, variedades, cicloOpts);
    if (rest === null || rest > 0) continue;

    if (projetoTipo === 'microverdes' && torre.fase !== 'mudas') {
      const vid = p.variedadeId;
      if (!vid) continue;
      acc[vid] = (acc[vid] || 0) + 1;
      continue;
    }
    const furosPerfil = furos.filter((f) => f.perfilIndex === p.perfilIndex && f.status === 'plantado');
    for (const f of furosPerfil) {
      const vid = f.variedadeId || p.variedadeId;
      if (!vid) continue;
      acc[vid] = (acc[vid] || 0) + 1;
    }
  }
}

function mapAccToProntoColheitaItems(acc: Record<string, number>, variedades: VariedadeConfig[]): ProntoColheitaVariedadeItem[] {
  return Object.entries(acc)
    .filter(([, n]) => n > 0)
    .map(([variedadeId, quantidade]) => ({
      variedadeId,
      nome: nomeVariedadeOuId(variedades, variedadeId),
      quantidade,
    }))
    .sort((a, b) => b.quantidade - a.quantidade);
}

export function prontosColheitaPorVariedadeFazenda(data: FazendaData): ProntoColheitaVariedadeItem[] {
  const acc: Record<string, number> = {};
  const cicloOpts = cicloPrazoOptsFromFazenda(data);
  const projetoTipo = data.projetoTipo ?? null;
  for (const andar of data.andares) {
    const torre = data.torres.find((t) => t.id === andar.torreId);
    if (!torre) continue;
    mergeProntosColheitaPorVariedadeAndar(acc, andar, torre, data.variedades, cicloOpts, projetoTipo);
  }
  return mapAccToProntoColheitaItems(acc, data.variedades);
}

export function prontosColheitaPorVariedadeTorre(
  torre: Torre,
  andares: Andar[],
  variedades: VariedadeConfig[],
  cicloOpts: CicloPrazoOpts,
  projetoTipo: string | null,
): ProntoColheitaVariedadeItem[] {
  const acc: Record<string, number> = {};
  for (const andar of andares) {
    if (andar.torreId !== torre.id) continue;
    mergeProntosColheitaPorVariedadeAndar(acc, andar, torre, variedades, cicloOpts, projetoTipo);
  }
  return mapAccToProntoColheitaItems(acc, variedades);
}

// ---- Resumo da fazenda ----

export function resumoFazenda(data: FazendaData) {
  const totalTorres = data.torres.length;
  const andaresDeclarados = data.andares.filter((a) => {
    const torre = data.torres.find((t) => t.id === a.torreId);
    return torre ? andarDentroDoModeloDaTorre(a, torre) : false;
  });
  const totalAndares = andaresDeclarados.length;
  const andaresOcupados = andaresDeclarados.filter((a) => {
    const torre = data.torres.find((t) => t.id === a.torreId);
    return andarOcupado(a, torre?.fase, data.projetoTipo);
  }).length;
  const ciclosPendentes = data.ciclos.filter((c) => cicloPendenteHoje(c)).length;

  let ultimaMedicao: string | null = null;
  data.caixasAgua.forEach((ca) => {
    ca.medicoes.forEach((m) => {
      if (!ultimaMedicao || m.dataHora > ultimaMedicao) {
        ultimaMedicao = m.dataHora;
      }
    });
  });

  // Contar andares com pelo menos 1 perfil com previsão vencida
  let previsaoVencida = 0;
  andaresDeclarados.forEach((andar) => {
    const torre = data.torres.find((t) => t.id === andar.torreId);
    if (!torre) return;
    const furosA = andar.furos || [];
    const perfisAlvo = (andar.perfis || []).filter((p) => {
      if (data.projetoTipo === "microverdes" && torre.fase !== "mudas") {
        return cultivoBandejaEfetivo(p, furosA.filter((f) => f.perfilIndex === p.perfilIndex), data.projetoTipo, torre.fase) === "plantado";
      }
      return p.ativo;
    });
    const temPerfilVencido = perfisAlvo.some((p) => {
      const dateStr = p.dataEntrada || andar.dataEntrada;
      if (!dateStr) return false;
      const rest = diasRestantes(
        dateStr,
        torre.fase,
        p.variedadeId || undefined,
        data.variedades,
        cicloPrazoOptsFromFazenda(data),
      );
      return rest !== null && rest <= 0;
    });
    if (temPerfilVencido) previsaoVencida++;
  });

  return {
    totalTorres,
    totalAndares,
    andaresOcupados,
    ciclosPendentes,
    ultimaMedicao,
    previsaoVencida,
  };
}

/** Andar com pelo menos um perfil com previsão vencida (mesma regra que `resumoFazenda.previsaoVencida`). */
export type AndarPerfilProntoAcao = {
  torreId: string;
  torreNome: string;
  andarId: string;
  andarNumero: number;
};

export function listarAndaresPerfisProntosParaAcao(data: FazendaData): AndarPerfilProntoAcao[] {
  const andaresDeclarados = data.andares.filter((a) => {
    const torre = data.torres.find((t) => t.id === a.torreId);
    return torre ? andarDentroDoModeloDaTorre(a, torre) : false;
  });
  const out: AndarPerfilProntoAcao[] = [];
  for (const andar of andaresDeclarados) {
    const torre = data.torres.find((t) => t.id === andar.torreId);
    if (!torre) continue;
    const furosA = andar.furos || [];
    const perfisAlvo = (andar.perfis || []).filter((p) => {
      if (data.projetoTipo === 'microverdes' && torre.fase !== 'mudas') {
        return cultivoBandejaEfetivo(p, furosA.filter((f) => f.perfilIndex === p.perfilIndex), data.projetoTipo, torre.fase) === 'plantado';
      }
      return p.ativo;
    });
    const temPerfilVencido = perfisAlvo.some((p) => {
      const dateStr = p.dataEntrada || andar.dataEntrada;
      if (!dateStr) return false;
      const rest = diasRestantes(
        dateStr,
        torre.fase,
        p.variedadeId || undefined,
        data.variedades,
        cicloPrazoOptsFromFazenda(data),
      );
      return rest !== null && rest <= 0;
    });
    if (temPerfilVencido) {
      out.push({
        torreId: torre.id,
        torreNome: torre.nome?.trim() || `Torre ${torre.id}`,
        andarId: andar.id,
        andarNumero: andar.numero,
      });
    }
  }
  out.sort((a, b) =>
    a.torreNome.localeCompare(b.torreNome, 'pt-BR') || a.andarNumero - b.andarNumero,
  );
  return out;
}

// ---- Formatação ----

export function formatarData(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatarDataHora(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function gerarId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

// ---- Constantes ----

export const TIPOS_APLICACAO_CAIXA = [
  { value: 'sanitizante', label: 'Sanitizante' },
  { value: 'corretor_ph', label: 'Corretor de pH' },
  { value: 'nutriente', label: 'Nutriente' },
  { value: 'outro', label: 'Outro' },
] as const;

export const TIPOS_APLICACAO_ANDAR = [
  { value: 'nutriente', label: 'Nutriente' },
  { value: 'pesticida', label: 'Pesticida' },
  { value: 'fertilizante', label: 'Fertilizante' },
  { value: 'outro', label: 'Outro' },
] as const;

export const VARIEDADES_COMUNS = [
  'Alface Crespa', 'Alface Americana', 'Alface Roxa', 'Rúcula',
  'Agrião', 'Espinafre', 'Couve', 'Manjericão',
  'Salsa', 'Cebolinha', 'Hortelã', 'Coentro',
];

export const DIAS_SEMANA = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

export const MOTIVOS_DESPERDICIO = [
  { value: 'nao_germinou', label: 'Não germinou' },
  { value: 'morta', label: 'Planta morta' },
  { value: 'doente', label: 'Planta doente' },
  { value: 'dano_mecanico', label: 'Dano mecânico' },
  { value: 'outro', label: 'Outro' },
];
