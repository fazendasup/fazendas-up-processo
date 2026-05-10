// ============================================================
// TorreCard v4 — Status parcial por perfil (dataEntrada individual)
// ============================================================

import { useMemo } from 'react';
import { Link } from 'wouter';
import type { Torre, Andar, Fase } from '@/lib/types';
import { faseTorreMicroverdesIluminacao, nomeTorreExibicaoMicroverdes } from '@/lib/microverdesPhases';
import { useFazenda } from '@/contexts/FazendaContext';
import { useProjeto } from '@/contexts/ProjetoContext';
import {
  contarAlertasTorre,
  diasRestantes,
  bandeiraPrazoDashboard,
  cicloPrazoOptsFromFazenda,
  contarPlantasAndar,
  contarColhidasAndar,
  andarPrecisaLavagem,
  andarOcupado,
  andaresDaTorreDeclarados,
  prontosColheitaPorVariedadeTorre,
} from '@/lib/utils-farm';
import type { CicloPrazoOpts } from '@/lib/utils-farm';
import { AlertTriangle, Droplets, ChevronRight, Sprout, Scissors, Droplet, Clock } from 'lucide-react';

interface TorreCardProps {
  torre: Torre;
}

/** “Torre Maturação 1” → “Torre 1” (a secção já diz a fase). Preserva sufixos (“- baby leaf”). */
function tituloTorreCardCompacto(nome: string): string {
  return nome
    .replace(/^Torre\s+Matura[cç][aã]o\s+/i, 'Torre ')
    .replace(/^Torre\s+Vegetativa\s+/i, 'Torre ')
    .replace(/^Torre\s+Mudas\s+/i, 'Torre ');
}

/** Rótulo da contagem em vermelho: deixa explícito “transplantio” na vegetativa FV. */
function rotuloPerfisPrazoCritico(fase: Fase, projetoTipo?: string | null): string {
  if (projetoTipo === 'microverdes') {
    if (faseTorreMicroverdesIluminacao(fase)) return 'com prazo (colheita)';
    return 'no prazo (iluminação)';
  }
  if (fase === 'vegetativa') return 'com prazo vencido (transplantio)';
  if (fase === 'mudas') return 'no prazo (vegetativa)';
  return 'prontos (colheita)';
}

/**
 * Calcula o status de um andar baseado nas datas individuais dos perfis.
 * Retorna: 'lavar' | 'pronto' | 'parcial' | 'quase' | 'ok' | 'vazio'
 * E contagens de prontos/total
 */
function calcAndarPerfilStatus(
  andar: Andar,
  fase: string,
  variedades: any[],
  cicloOpts?: CicloPrazoOpts,
): { status: string; prontos: number; quase: number; total: number } {
  const perfisAtivos = (andar.perfis || []).filter((p) => p.ativo);
  if (perfisAtivos.length === 0) return { status: 'vazio', prontos: 0, quase: 0, total: 0 };

  let prontos = 0;
  let quase = 0;
  let comData = 0;

  for (const p of perfisAtivos) {
    const dateStr = p.dataEntrada || andar.dataEntrada;
    if (!dateStr) continue;
    comData++;
    const rest = diasRestantes(dateStr, fase as any, p.variedadeId || undefined, variedades, cicloOpts);
    const band = bandeiraPrazoDashboard(rest);
    if (band === 'vencido') prontos++;
    else if (band === 'quase') quase++;
  }

  const total = perfisAtivos.length;
  if (prontos === total && total > 0) return { status: 'pronto', prontos, quase, total };
  if (prontos > 0) return { status: 'parcial', prontos, quase, total };
  if (quase > 0) return { status: 'quase', prontos, quase, total };
  if (comData > 0) return { status: 'ok', prontos, quase, total };
  return { status: 'vazio', prontos, quase, total };
}

export default function TorreCard({ torre }: TorreCardProps) {
  const { data } = useFazenda();
  const { activeProjeto } = useProjeto();
  const isMicroverdes = activeProjeto?.tipo === 'microverdes';
  /** Torre física em pé: topo do desenho = andar de número maior (como na TorreDetail). */
  const andares = andaresDaTorreDeclarados(data.andares, torre).sort((a, b) => b.numero - a.numero);
  const caixa = data.caixasAgua.find((c) => c.id === torre.caixaAguaId);
  const alertas = contarAlertasTorre(
    torre,
    andares,
    data.variedades,
    data.fasesConfig,
    data.manutencoes,
    cicloPrazoOptsFromFazenda(data),
  );
  const andaresOcupados = andares.filter((a) => andarOcupado(a, torre.fase, data.projetoTipo)).length;

  const exibirColhidas =
    isMicroverdes ? faseTorreMicroverdesIluminacao(torre.fase) : torre.fase === 'maturacao';
  const totalPlantas = andares.reduce(
    (sum, a) => sum + contarPlantasAndar(a, torre.fase, data.projetoTipo),
    0,
  );
  const totalColhidas = exibirColhidas
    ? andares.reduce((sum, a) => sum + contarColhidasAndar(a, torre.fase, data.projetoTipo), 0)
    : 0;
  const andaresLavagem = andares.filter((a) => andarPrecisaLavagem(a)).length;

  const cicloOpts = cicloPrazoOptsFromFazenda(data);

  const prontosColheitaVariedade = useMemo(
    () =>
      exibirColhidas
        ? prontosColheitaPorVariedadeTorre(
            torre,
            andares,
            data.variedades,
            cicloPrazoOptsFromFazenda(data),
            data.projetoTipo ?? null,
          )
        : [],
    [exibirColhidas, torre, andares, data],
  );

  const unidadeProntosColheita = isMicroverdes ? 'bandejas' : 'plantas';

  // Calcular contagem de perfis prontos na torre
  let perfisProntosTorre = 0;
  let perfisQuaseTorre = 0;
  let perfisTotalTorre = 0;
  for (const andar of andares) {
    const ps = calcAndarPerfilStatus(andar, torre.fase, data.variedades, cicloOpts);
    perfisProntosTorre += ps.prontos;
    perfisQuaseTorre += ps.quase;
    perfisTotalTorre += ps.total;
  }

  const faseClass =
    torre.fase === 'mudas'
      ? 'card-mudas'
      : torre.fase === 'vegetativa' || (isMicroverdes && torre.fase === 'maturacao')
        ? 'card-vegetativa'
        : 'card-maturacao';
  const nomeExib = tituloTorreCardCompacto(isMicroverdes ? nomeTorreExibicaoMicroverdes(torre) : torre.nome);

  const renderSegmentoAndar = (andar: Andar) => {
    const ocupado = andarOcupado(andar, torre.fase, data.projetoTipo);
    const precisaLavar = andarPrecisaLavagem(andar);
    const ps = calcAndarPerfilStatus(andar, torre.fase, data.variedades, cicloOpts);

    let bgColor = 'bg-muted';
    if (precisaLavar) {
      bgColor = 'bg-red-400 animate-pulse';
    } else if (ps.status === 'pronto') {
      bgColor = 'bg-destructive/70';
    } else if (ps.status === 'parcial') {
      bgColor = 'bg-gradient-to-r from-destructive/60 to-amber-400';
    } else if (ps.status === 'quase') {
      bgColor = 'bg-amber-400';
    } else if (ocupado) {
      bgColor = 'bg-emerald-500';
    }

    const numClass =
      precisaLavar || ps.status === 'pronto' || ps.status === 'parcial' || ocupado
        ? 'text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.45)]'
        : ps.status === 'quase'
          ? 'text-amber-950'
          : 'text-muted-foreground';

    const titleParts = [`Andar ${andar.numero}`];
    if (precisaLavar) titleParts.push('[LAVAR]');
    else if (ps.prontos > 0) titleParts.push(`${ps.prontos}/${ps.total} prontos`);
    else if (ps.quase > 0) titleParts.push(`${ps.quase}/${ps.total} quase prontos`);
    else if (!ocupado) titleParts.push('Vazio');
    else titleParts.push('Em processo');

    return (
      <div
        key={andar.id}
        className={`flex h-5.5 w-10 shrink-0 items-center justify-center rounded-sm ${bgColor} transition-colors`}
        title={titleParts.join(' — ')}
        aria-label={titleParts.join(', ')}
      >
        <span className={`text-[9px] font-bold tabular-nums leading-none ${numClass}`}>{andar.numero}</span>
      </div>
    );
  };

  return (
    <Link
      href={`/torre/${torre.id}`}
      className="group block h-full min-w-0"
      aria-label={`${nomeExib}: mapa de andares à esquerda; totais e detalhes à direita.`}
    >
      {/* Um só cartão: zona “andares” | zona “dados da torre”, para não parecerem dois cartões independentes. */}
      <div
        className={`flex h-full min-h-0 min-w-0 overflow-hidden rounded-lg surface-panel transition-transform duration-300 group-hover:-translate-y-0.5 ${faseClass}`}
      >
        <div className="flex min-h-0 shrink-0 flex-col items-center gap-1.5 border-r border-border/60 bg-muted/15 px-2 py-2.5">
          <span className="select-none text-center text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
            Andares
          </span>
          <div className="flex flex-col gap-0.5 rounded-sm p-px ring-1 ring-border/45">
            {andares.map(renderSegmentoAndar)}
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 p-2.5">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <h3 className="font-display min-w-0 flex-1 text-sm font-semibold leading-snug text-card-foreground">{nomeExib}</h3>
            {alertas > 0 ? (
              <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground animate-pulse">
                <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                {alertas}
              </span>
            ) : null}
          </div>

          <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Totais da torre</p>

          <div className="min-h-0 min-w-0 flex-1">
            <div className="flex flex-col gap-1.5 text-[10px] leading-snug text-card-foreground">
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <Sprout className="h-2.5 w-2.5 shrink-0" />
                <strong>{totalPlantas}</strong>
                <span className="text-muted-foreground">em processo</span>
              </span>
              {exibirColhidas && totalColhidas > 0 && (
                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <Scissors className="h-2.5 w-2.5 shrink-0" />
                  <strong>{totalColhidas}</strong>
                  <span className="text-muted-foreground">colhidas</span>
                </span>
              )}
              {andaresLavagem > 0 && (
                <span className="inline-flex items-center gap-1 text-red-600">
                  <Droplet className="h-2.5 w-2.5 shrink-0" />
                  <strong>{andaresLavagem}</strong>
                  <span className="text-muted-foreground">lavar</span>
                </span>
              )}
              {perfisProntosTorre > 0 && (
                <span className="inline-flex items-center gap-1 font-semibold text-red-600">
                  <Clock className="h-2.5 w-2.5 shrink-0" />
                  <strong>
                    {perfisProntosTorre}/{perfisTotalTorre}
                  </strong>
                  <span className="font-normal">{rotuloPerfisPrazoCritico(torre.fase, data.projetoTipo)}</span>
                </span>
              )}
              {perfisQuaseTorre > 0 && (
                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <Clock className="h-2.5 w-2.5 shrink-0" />
                  <strong>{perfisQuaseTorre}</strong>
                  <span className="text-muted-foreground">quase</span>
                </span>
              )}
              {exibirColhidas && prontosColheitaVariedade.length > 0 && (
                <div className="text-[9px] leading-snug text-amber-900 dark:text-amber-100">
                  <span className="font-semibold">Colheita </span>
                  <span className="font-normal text-muted-foreground">({unidadeProntosColheita})</span>
                  <span className="text-card-foreground">
                    {': '}
                    {prontosColheitaVariedade.map((row, i) => (
                      <span key={row.variedadeId}>
                        {i > 0 ? ' · ' : null}
                        <span className="whitespace-nowrap" title={row.nome}>
                          {row.nome}{' '}
                        </span>
                        <strong className="tabular-nums">{row.quantidade}</strong>
                      </span>
                    ))}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex w-full items-start justify-between gap-1 border-t border-border/40 pt-1.5 text-[10px] text-muted-foreground">
            <div
              className="flex min-w-0 flex-1 flex-col gap-0.5 leading-snug"
              title={caixa ? `${andaresOcupados}/${torre.numAndares ?? torre.andares ?? andares.length} · ${caixa.nome}` : undefined}
            >
              <p>
                <strong className="text-card-foreground">{andaresOcupados}</strong>/{torre.numAndares ?? torre.andares ?? andares.length}
                <span className="text-muted-foreground"> andares</span>
              </p>
              {caixa && (
                <p className="inline-flex max-w-full items-start gap-0.5 break-words">
                  <Droplets className="mt-0.5 h-2.5 w-2.5 shrink-0" />
                  <span>{caixa.nome}</span>
                </p>
              )}
            </div>
            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary" />
          </div>
        </div>
      </div>
    </Link>
  );
}
