// ============================================================
// PerfilFurosGrid v7 — Status de transplantio/colheita por perfil
// Cada card de perfil mostra badge colorido indicando se está
// pronto, quase pronto, ou em processo baseado na dataEntrada individual
// ============================================================

import type { Furo, PerfilData, VariedadeConfig, Fase } from '@/lib/types';
import { estruturaFaseParaProjeto, type TorreEstruturaOverride } from '@shared/types';
import { diasRestantes, labelPrevisao, valorCampoDataPlantio, type ModoDataPlantio } from '@/lib/utils-farm';
import type { CicloPrazoOpts } from '@/lib/utils-farm';
import { labelCampoDataPlantio } from '@/components/PlantioModoDataSelector';
import {
  BANDEJAS_POR_ANDAR_MICROVERDES,
  labelPosicaoProducao,
  termoUnidadeProducao,
} from '@/lib/microverdesPhases';
import type { CultivoBandejaStatus } from '@/lib/utils-farm';
import { cultivoBandejaEfetivo } from '@/lib/utils-farm';
import { Sprout, Scissors, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip';

interface Props {
  furos: Furo[];
  perfis: PerfilData[];
  fase: Fase;
  /** Quando `microverdes`, usa 4 perfis / iluminação 4×1 e rótulos de colheita na fase de iluminação. */
  projetoTipo?: string | null;
  /** Grelha física específica da torre (ex.: 12×6). */
  estruturaOverride?: TorreEstruturaOverride | null;
  modo: 'visualizacao' | 'transplantio' | 'colheita';
  variedades: VariedadeConfig[];
  /** Prazos alinhados ao catálogo `receitas` + mapa slug→id do BD. */
  cicloOpts?: CicloPrazoOpts;
  andarDataEntrada?: string | null; // data de entrada do andar (fallback)
  /** Modo seleção em massa (clique/shift): quando ativo, o grid não executa ações de produção. */
  selectionMode?: boolean;
  selectedPerfis?: Set<number>;
  onSelectPerfil?: (perfilIndex: number, e: React.MouseEvent) => void;
  onFuroToggle?: (perfilIndex: number, furoIndex: number, variedadeId?: string) => void;
  onPerfilToggle?: (perfilIndex: number, variedadeId?: string) => void;
  onPerfilInspect?: (perfilIndex: number) => void;
  onPerfilVariedadeChange?: (perfilIndex: number, variedadeId: string) => void;
  onPerfilDataChange?: (perfilIndex: number, dataEntrada: string) => void;
  onAndarTodo?: () => void;
  onAndarVariedadeTodos?: (variedadeId: string) => void;
  /** No modo Plantar: data informada como plantio ou colheita/transplante alvo. */
  modoDataPlantio?: ModoDataPlantio;
}

function dotColor(status: string) {
  if (status === 'plantado') return 'bg-emerald-500';
  if (status === 'colhido') return 'bg-amber-400';
  return 'bg-gray-200';
}

function dotBorder(status: string) {
  if (status === 'plantado') return 'border-emerald-600';
  if (status === 'colhido') return 'border-amber-500';
  return 'border-gray-300';
}

/** Calcula status de um perfil baseado na sua data de entrada */
function perfilStatus(
  perfil: PerfilData | undefined,
  andarDataEntrada: string | null | undefined,
  fase: Fase,
  variedades: VariedadeConfig[],
  projetoTipo?: string | null,
  cultivo?: CultivoBandejaStatus | null,
  cicloOpts?: CicloPrazoOpts,
): { rest: number | null; label: string; color: string; bgColor: string; borderColor: string } {
  if (projetoTipo === 'microverdes' && fase !== 'mudas') {
    if (cultivo === 'vazio' || cultivo == null) {
      return { rest: null, label: '', color: 'text-muted-foreground', bgColor: '', borderColor: '' };
    }
    if (cultivo === 'colhido') {
      return { rest: null, label: 'Colhida', color: 'text-amber-800', bgColor: 'bg-amber-50/50', borderColor: 'border-amber-400' };
    }
  }
  if (!perfil?.ativo) return { rest: null, label: '', color: '', bgColor: '', borderColor: '' };

  const dateStr = perfil.dataEntrada || andarDataEntrada || null;
  if (!dateStr) return { rest: null, label: 'Sem data', color: 'text-muted-foreground', bgColor: '', borderColor: '' };

  const rest = diasRestantes(dateStr, fase, perfil.variedadeId || undefined, variedades, cicloOpts);
  if (rest === null) return { rest: null, label: 'Sem variedade', color: 'text-muted-foreground', bgColor: '', borderColor: '' };

  if (rest <= 0) {
    const colheita =
      projetoTipo === 'microverdes' ? fase !== 'mudas' : fase === 'maturacao';
    const lbl = colheita ? 'COLHER!' : 'TRANSPLANTAR!';
    return { rest, label: lbl, color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-400' };
  }
  if (rest <= 3) {
    return { rest, label: `${rest}d restantes`, color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-400' };
  }
  return { rest, label: `${rest}d restantes`, color: 'text-emerald-700 dark:text-emerald-300', bgColor: 'bg-emerald-50/50', borderColor: '' };
}

export default function PerfilFurosGrid({
  furos, perfis, fase, projetoTipo, estruturaOverride, modo, variedades, cicloOpts, andarDataEntrada,
  selectionMode, selectedPerfis, onSelectPerfil,
  onFuroToggle, onPerfilToggle, onPerfilInspect, onPerfilVariedadeChange,
  onPerfilDataChange,
  onAndarTodo, onAndarVariedadeTodos,
  modoDataPlantio = 'plantio',
}: Props) {
  const isMudas = fase === 'mudas';
  const isMaturacao = fase === 'maturacao';
  const faseComContagemColhidos =
    projetoTipo === 'microverdes' ? fase !== 'mudas' : isMaturacao;
  const isInteractive = modo !== 'visualizacao';
  const estrutura = estruturaFaseParaProjeto(projetoTipo, fase, estruturaOverride ?? null);
  const numPerfis = estrutura.perfis;
  const numFuros = estrutura.furosPorPerfil;
  const mv = projetoTipo === 'microverdes';
  const unid = termoUnidadeProducao(projetoTipo);

  const valorDateInputPerfil = (perfil: PerfilData | undefined) => {
    const perfilDate = perfil?.dataEntrada || andarDataEntrada || '';
    if (modo === 'transplantio') {
      return valorCampoDataPlantio(
        modoDataPlantio,
        perfilDate || null,
        fase,
        perfil?.variedadeId,
        variedades,
        cicloOpts,
      );
    }
    return perfilDate ? new Date(perfilDate).toISOString().split('T')[0] : '';
  };

  // ---- MUDAS: FV = perfis abertos; microverdes = bandejas de germinação (4/andar) ----
  if (isMudas) {
    const perfisAtivos = perfis.filter((p) => p.ativo).length;
    const perfisInativos = numPerfis - perfisAtivos;

    return (
      <div className="space-y-3">
        {/* Header com legenda */}
        <div className="flex items-center justify-between flex-wrap gap-1">
          <h4 className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {mv ? `Bandejas · germinação (${BANDEJAS_POR_ANDAR_MICROVERDES}/andar)` : 'Perfis de Espuma Fenólica'}
          </h4>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-gray-200 border border-gray-300" />
              {mv ? `Vazia (${perfisInativos})` : `Vazio (${perfisInativos})`}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              {mv ? `Ativa (${perfisAtivos})` : `Ativo (${perfisAtivos})`}
            </span>
          </div>
        </div>

        {/* Seletor de variedade para todos */}
        {isInteractive && (
          <Select onValueChange={(val) => onAndarVariedadeTodos?.(val)}>
            <SelectTrigger className="h-10 text-sm">
              <SelectValue placeholder={mv ? 'Variedade em todas as bandejas…' : 'Variedade para todos os perfis...'} />
            </SelectTrigger>
            <SelectContent>
              {variedades.map((v) => (
                <SelectItem key={v.id} value={v.id} className="text-sm py-2">
                  {v.nome} ({v.diasMudas}d)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Microverdes: bandejas pequenas (só referência); FV: grid mais largo */}
        <div className={mv ? "grid grid-cols-4 gap-1.5" : "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2"}>
          {Array.from({ length: numPerfis }, (_, i) => {
            const perfil = perfis.find((p) => p.perfilIndex === i);
            const isAtivo = perfil?.ativo || false;
            const isSelected = !!selectedPerfis?.has(i);
            const variedade = perfil?.variedadeId
              ? variedades.find((v) => v.id === perfil.variedadeId)
              : undefined;
            const ps = perfilStatus(perfil, andarDataEntrada, fase, variedades, projetoTipo, undefined, cicloOpts);

            return (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    disabled={!isInteractive && !selectionMode && !onPerfilInspect}
                    onClick={(e) => {
                      if (selectionMode) {
                        onSelectPerfil?.(i, e);
                        return;
                      }
                      if (!isInteractive) {
                        onPerfilInspect?.(i);
                        return;
                      }
                      onPerfilToggle?.(i, perfil?.variedadeId);
                    }}
                    className={`relative flex flex-col items-center justify-center border-2 transition-all ${
                      mv
                        ? 'rounded-md min-h-0 h-8 w-full max-w-[2.25rem] mx-auto py-0.5 px-0.5'
                        : 'rounded-lg min-h-[64px] py-2 px-1'
                    } ${
                      ps.rest !== null && ps.rest <= 0
                        ? 'bg-red-50 border-red-400 shadow-md ring-2 ring-red-200'
                        : ps.rest !== null && ps.rest <= 3
                        ? 'bg-amber-50 border-amber-400 shadow-sm'
                        : isAtivo
                        ? 'bg-emerald-50 border-emerald-400 shadow-sm'
                        : 'bg-gray-50 border-gray-200'
                    } ${
                      selectionMode
                        ? `cursor-pointer hover:shadow-md ${isSelected ? 'ring-2 ring-blue-400 border-blue-400' : ''}`
                        : isInteractive || onPerfilInspect
                          ? 'hover:shadow-md active:scale-95 cursor-pointer'
                          : ''
                    }`}
                  >
                    <span className={`${mv ? 'text-[10px]' : 'text-sm'} font-bold ${
                      ps.rest !== null && ps.rest <= 0 ? 'text-red-700' :
                      ps.rest !== null && ps.rest <= 3 ? 'text-amber-700' :
                      isAtivo ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-400'
                    }`}>
                      {labelPosicaoProducao(projetoTipo, i)}
                    </span>
                    {!mv && variedade && (
                      <span className="text-[10px] text-muted-foreground truncate w-full text-center leading-tight mt-0.5">
                        {variedade.nome.length > 8 ? variedade.nome.slice(0, 7) + '…' : variedade.nome}
                      </span>
                    )}
                    {/* Badge de status */}
                    {isAtivo && ps.rest !== null && (
                      <span className={`text-[9px] mt-0.5 font-bold ${ps.color}`}>
                        {ps.rest <= 0 ? (
                          <span className="flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" />
                            TRANSPL.
                          </span>
                        ) : (
                          `${ps.rest}d`
                        )}
                      </span>
                    )}
                    {isInteractive && !isAtivo && (
                      <span className="text-[9px] mt-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
                        Ativar
                      </span>
                    )}
                    {selectionMode && (
                      <span className="absolute top-1 right-1 text-[9px] font-bold text-blue-700">
                        {isSelected ? '✓' : ''}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <p className="font-semibold">
                    {mv ? `Bandeja ${i + 1}` : `Perfil ${i + 1}`} — {isAtivo ? (mv ? 'Ativa' : 'Ativo') : (mv ? 'Vazia' : 'Vazio')}
                  </p>
                  {variedade && <p className="text-muted-foreground">{variedade.nome}</p>}
                  {ps.rest !== null && <p className={ps.color}>{ps.label}</p>}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Seletores de variedade por perfil (colapsável) */}
        {isInteractive && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors py-1">
              {mv
                ? '▸ Definir variedade por bandeja…'
                : '▸ Definir variedade por perfil individual...'}
            </summary>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
              {Array.from({ length: numPerfis }, (_, i) => {
                const perfil = perfis.find((p) => p.perfilIndex === i);
                return (
                  <div key={i} className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-muted-foreground w-8 shrink-0">{labelPosicaoProducao(projetoTipo, i)}</span>
                    <Select
                      value={perfil?.variedadeId || ''}
                      onValueChange={(val) => onPerfilVariedadeChange?.(i, val)}
                    >
                      <SelectTrigger className="h-9 text-xs flex-1">
                        <SelectValue placeholder="Variedade" />
                      </SelectTrigger>
                      <SelectContent>
                        {variedades.map((v) => (
                          <SelectItem key={v.id} value={v.id} className="text-sm py-2">
                            {v.nome} ({v.diasMudas}d)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          </details>
        )}

        {/* Botão andar todo */}
        {isInteractive && (
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 text-sm gap-2 font-semibold"
            onClick={() => onAndarTodo?.()}
          >
            <Sprout className="w-4 h-4" />
            Ativar/Desativar andar todo ({numPerfis} {unid.plural})
          </Button>
        )}
      </div>
    );
  }

  // ---- MICROVERDES ILUMINAÇÃO: só 4 bandejas; sem furos ----
  if (mv && !isMudas) {
    let nVazio = 0;
    let nPlant = 0;
    let nColh = 0;
    for (let i = 0; i < numPerfis; i++) {
      const perfil = perfis.find((p) => p.perfilIndex === i);
      const c = cultivoBandejaEfetivo(
        perfil,
        furos.filter((f) => f.perfilIndex === i),
        projetoTipo,
        fase,
      );
      if (c === 'vazio') nVazio++;
      else if (c === 'plantado') nPlant++;
      else nColh++;
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-1">
          <h4 className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Bandejas · iluminação ({BANDEJAS_POR_ANDAR_MICROVERDES}/andar)
          </h4>
          <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-200 border border-gray-300" />
              Vazia ({nVazio})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Em cultivo ({nPlant})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              Colhida ({nColh})
            </span>
          </div>
        </div>

        {isInteractive && (
          <Select onValueChange={(val) => onAndarVariedadeTodos?.(val)}>
            <SelectTrigger className="h-10 text-sm">
              <SelectValue placeholder="Variedade em todas as bandejas…" />
            </SelectTrigger>
            <SelectContent>
              {variedades.map((v) => (
                <SelectItem key={v.id} value={v.id} className="text-sm py-2">
                  {v.nome} ({fase === 'vegetativa' ? v.diasVegetativa : v.diasMaturacao}d)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="grid grid-cols-4 gap-1.5">
          {Array.from({ length: numPerfis }, (_, i) => {
            const perfil = perfis.find((p) => p.perfilIndex === i);
            const cult = cultivoBandejaEfetivo(
              perfil,
              furos.filter((f) => f.perfilIndex === i),
              projetoTipo,
              fase,
            );
            const isSelected = !!selectedPerfis?.has(i);
            const variedade = perfil?.variedadeId
              ? variedades.find((v) => v.id === perfil.variedadeId)
              : undefined;
            const ps = perfilStatus(perfil, andarDataEntrada, fase, variedades, projetoTipo, cult, cicloOpts);

            return (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    disabled={!isInteractive && !selectionMode && !onPerfilInspect}
                    onClick={(e) => {
                      if (selectionMode) {
                        onSelectPerfil?.(i, e);
                        return;
                      }
                      if (!isInteractive) {
                        onPerfilInspect?.(i);
                        return;
                      }
                      onPerfilToggle?.(i, perfil?.variedadeId);
                    }}
                    className={`relative flex flex-col items-center justify-center border-2 transition-all rounded-md min-h-0 h-8 w-full max-w-[2.25rem] mx-auto py-0.5 px-0.5 ${
                      cult === 'colhido'
                        ? 'bg-amber-50 border-amber-400'
                        : cult === 'plantado' && ps.rest !== null && ps.rest <= 0
                        ? 'bg-red-50 border-red-400 ring-1 ring-red-200'
                        : cult === 'plantado' && ps.rest !== null && ps.rest <= 3
                        ? 'bg-amber-50 border-amber-400'
                        : cult === 'plantado'
                        ? 'bg-emerald-50 border-emerald-400'
                        : 'bg-gray-50 border-gray-200'
                    } ${
                      selectionMode
                        ? `cursor-pointer hover:shadow-md ${isSelected ? 'ring-2 ring-blue-400 border-blue-400' : ''}`
                        : isInteractive || onPerfilInspect
                          ? 'hover:shadow-md active:scale-95 cursor-pointer'
                          : ''
                    }`}
                  >
                    <span
                      className={`text-[10px] font-bold ${
                        cult === 'colhido'
                          ? 'text-amber-800'
                          : ps.rest !== null && ps.rest <= 0
                          ? 'text-red-700'
                          : ps.rest !== null && ps.rest <= 3
                          ? 'text-amber-700'
                          : cult === 'plantado'
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : 'text-gray-400'
                      }`}
                    >
                      {labelPosicaoProducao(projetoTipo, i)}
                    </span>
                    {cult === 'plantado' && ps.rest !== null && ps.label && (
                      <span className={`text-[8px] mt-0.5 font-bold leading-none ${ps.color}`}>
                        {ps.rest <= 0 ? '!' : `${ps.rest}d`}
                      </span>
                    )}
                    {cult === 'colhido' && (
                      <span className="text-[7px] mt-0.5 font-semibold text-amber-800 leading-none">✓</span>
                    )}
                    {selectionMode && (
                      <span className="absolute top-0.5 right-0.5 text-[8px] font-bold text-blue-700">
                        {isSelected ? '✓' : ''}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs max-w-[220px]">
                  <p className="font-semibold">Bandeja {i + 1}</p>
                  <p className="text-muted-foreground">
                    {cult === 'vazio' ? 'Vazia' : cult === 'plantado' ? 'Em cultivo' : 'Colhida'}
                  </p>
                  {variedade && <p className="text-muted-foreground">{variedade.nome}</p>}
                  {ps.rest !== null && cult === 'plantado' && <p className={ps.color}>{ps.label}</p>}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {isInteractive && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors py-1">
              ▸ Definir variedade e data por bandeja…
            </summary>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
              {Array.from({ length: numPerfis }, (_, i) => {
                const perfil = perfis.find((p) => p.perfilIndex === i);
                const dateValue = valorDateInputPerfil(perfil);
                return (
                  <div key={i} className="p-2 rounded border bg-muted/20 space-y-1.5">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold text-muted-foreground w-8 shrink-0">
                        {labelPosicaoProducao(projetoTipo, i)}
                      </span>
                      <Select
                        value={perfil?.variedadeId || ''}
                        onValueChange={(val) => onPerfilVariedadeChange?.(i, val)}
                      >
                        <SelectTrigger className="h-8 text-xs flex-1">
                          <SelectValue placeholder="Var." />
                        </SelectTrigger>
                        <SelectContent>
                          {variedades.map((v) => (
                            <SelectItem key={v.id} value={v.id} className="text-sm py-2">
                              {v.nome} ({fase === 'vegetativa' ? v.diasVegetativa : v.diasMaturacao}d)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <input
                      type="date"
                      value={dateValue}
                      onChange={(e) => onPerfilDataChange?.(i, e.target.value)}
                      className="h-8 w-full text-[11px] rounded-md border border-input bg-background px-2"
                    />
                  </div>
                );
              })}
            </div>
          </details>
        )}

        {isInteractive && (
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 text-sm gap-2 font-semibold"
            onClick={() => onAndarTodo?.()}
          >
            {modo === 'transplantio' ? (
              <>
                <Sprout className="w-4 h-4" />
                Plantar andar todo ({numPerfis} bandejas)
              </>
            ) : (
              <>
                <Scissors className="w-4 h-4" />
                Colher andar todo ({numPerfis} bandejas)
              </>
            )}
          </Button>
        )}

        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t">
          <span>
            {nPlant}/{numPerfis} em cultivo
            {faseComContagemColhidos && nColh > 0 ? ` · ${nColh} colhidas` : ''}
          </span>
        </div>
      </div>
    );
  }

  // ---- VEGETATIVA / MATURAÇÃO: perfis com furos ----
  const contagens = { plantado: 0, colhido: 0, vazio: 0 };
  furos.forEach((f) => { contagens[f.status]++; });
  const totalFuros = numPerfis * numFuros;

  // Agrupar furos por perfil
  const furosPorPerfil: Furo[][] = [];
  for (let p = 0; p < numPerfis; p++) {
    furosPorPerfil.push(
      furos.filter((f) => f.perfilIndex === p).sort((a, b) => a.furoIndex - b.furoIndex)
    );
  }

  // Microverdes iluminação: bandejas pequenas em fileira; FV: layout anterior
  const gridColsClass = mv
    ? 'grid-cols-2 sm:grid-cols-4'
    : isMaturacao
      ? 'grid-cols-1 sm:grid-cols-2'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-1">
        <h4 className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {mv && numFuros <= 1
            ? `${numPerfis} bandejas · 1 lote/bandeja (iluminação)`
            : `${numPerfis} Perfis × ${numFuros} Furos`}
        </h4>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-gray-200 border border-gray-300" />
            {contagens.vazio}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            {contagens.plantado}
          </span>
          {faseComContagemColhidos && (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              {contagens.colhido}
            </span>
          )}
        </div>
      </div>

      {/* Grid de bandejas (MV) ou perfis com furos (FV) */}
      <div className={`grid ${mv ? "gap-1" : "gap-2"} ${gridColsClass}`}>
        {furosPorPerfil.map((perfilFuros, pIndex) => {
          const perfil = perfis.find((p) => p.perfilIndex === pIndex);
          const isSelected = !!selectedPerfis?.has(pIndex);
          const variedade = perfil?.variedadeId
            ? variedades.find((v) => v.id === perfil.variedadeId)
            : undefined;
          const plantadosNoPerfil = perfilFuros.filter((f) => f.status === 'plantado').length;
          const ps = perfilStatus(perfil, andarDataEntrada, fase, variedades, projetoTipo, undefined, cicloOpts);

          return (
            <div
              key={pIndex}
              className={`border-2 ${mv ? "rounded-md p-1" : "rounded-lg p-2"} transition-all ${
              ps.rest !== null && ps.rest <= 0
                ? 'border-red-400 bg-red-50/50 ring-1 ring-red-200'
                : ps.rest !== null && ps.rest <= 3
                ? 'border-amber-400 bg-amber-50/50'
                : 'border-border bg-muted/20'
              } ${
                selectionMode
                  ? `${isSelected ? 'ring-2 ring-blue-400 border-blue-400' : 'hover:shadow-sm cursor-pointer'}`
                  : !isInteractive && onPerfilInspect
                    ? 'hover:shadow-sm cursor-pointer'
                    : ''
              }`}
              onClick={(e) => {
                if (selectionMode) {
                  onSelectPerfil?.(pIndex, e);
                  return;
                }
                if (!isInteractive) onPerfilInspect?.(pIndex);
              }}
            >
              {/* Header do perfil */}
              <div className={`flex items-center justify-between ${mv ? "mb-0.5" : "mb-1.5"}`}>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`${mv ? "text-[10px]" : "text-xs"} font-bold shrink-0 ${
                    ps.rest !== null && ps.rest <= 0 ? 'text-red-700' :
                    ps.rest !== null && ps.rest <= 3 ? 'text-amber-700' :
                    'text-muted-foreground'
                  }`}>{labelPosicaoProducao(projetoTipo, pIndex)}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {plantadosNoPerfil}/{numFuros}
                  </span>
                  {variedade && !mv && (
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full truncate">
                      {variedade.nome.length > 10 ? variedade.nome.slice(0, 9) + '…' : variedade.nome}
                    </span>
                  )}
                  {/* Badge de status inline */}
                  {ps.rest !== null && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                      ps.rest <= 0
                        ? 'bg-red-100 text-red-700 animate-pulse'
                        : ps.rest <= 3
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700 dark:text-emerald-300'
                    }`}>
                      {ps.rest <= 0 ? (
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          {labelPrevisao(fase, projetoTipo)}!
                        </span>
                      ) : (
                        `${ps.rest}d`
                      )}
                    </span>
                  )}
                </div>
                {isInteractive && (
                  <button
                    type="button"
                    className={`font-semibold rounded transition-colors ${
                      mv
                        ? "text-[9px] px-1 py-0.5 min-h-0 leading-tight"
                        : "text-xs px-3 py-1.5 rounded-md min-h-[32px]"
                    } ${
                      modo === 'transplantio'
                        ? 'bg-emerald-100 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 active:bg-emerald-300'
                        : 'bg-amber-100 text-amber-700 hover:bg-amber-200 active:bg-amber-300'
                    }`}
                    onClick={() => onPerfilToggle?.(pIndex, perfil?.variedadeId)}
                    disabled={selectionMode}
                  >
                    {modo === 'transplantio' ? (mv ? '🌱' : '🌱 Plantar') : mv ? '✂️' : '✂️ Colher'}
                  </button>
                )}
              </div>

              {/* Furos como dots — grid responsivo */}
              <div
                className="grid gap-1"
                style={{
                  gridTemplateColumns: `repeat(${numFuros <= 6 ? numFuros : Math.ceil(numFuros / 2)}, minmax(0, 1fr))`,
                }}
              >
                {perfilFuros.map((furo) => (
                  <Tooltip key={`${furo.perfilIndex}-${furo.furoIndex}`}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        disabled={!isInteractive}
                        onClick={() => onFuroToggle?.(pIndex, furo.furoIndex, perfil?.variedadeId)}
                        className={`w-full aspect-square rounded border-2 transition-all flex items-center justify-center ${
                          mv ? "min-w-4 min-h-4" : "min-w-[28px] min-h-[28px] rounded-md"
                        } ${dotColor(furo.status)} ${dotBorder(furo.status)} ${
                          isInteractive ? 'hover:scale-110 active:scale-95 hover:shadow cursor-pointer' : ''
                        }`}
                      >
                        <span className={`${mv ? "text-[8px]" : "text-[10px]"} font-bold leading-none ${
                          furo.status === 'vazio' ? 'text-gray-400' : 'text-white/90'
                        }`}>
                          {furo.furoIndex + 1}
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p className="font-semibold">
                        {mv && numFuros <= 1
                          ? `Bandeja ${pIndex + 1} (lote único)`
                          : `P${pIndex + 1} F${furo.furoIndex + 1}`}
                      </p>
                      <p>{furo.status === 'vazio' ? 'Vazio' : furo.status === 'plantado' ? 'Plantado' : 'Colhido'}</p>
                      {furo.variedadeId && (
                        <p className="text-muted-foreground">
                          {variedades.find((v) => v.id === furo.variedadeId)?.nome}
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Rodapé: total */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
        <span>
          {contagens.plantado}/{totalFuros} {mv ? 'lotes plantados' : 'plantados'}
          {faseComContagemColhidos && contagens.colhido > 0 && ` · ${contagens.colhido} colhidos`}
        </span>
      </div>

      {/* Variedade para todos + Ação do andar todo */}
      {isInteractive && (
        <div className="space-y-2">
          <Select onValueChange={(val) => onAndarVariedadeTodos?.(val)}>
            <SelectTrigger className="h-10 text-sm">
              <SelectValue placeholder={mv ? 'Variedade em todas as bandejas…' : 'Variedade para todos os perfis...'} />
            </SelectTrigger>
            <SelectContent>
              {variedades.map((v) => (
                <SelectItem key={v.id} value={v.id} className="text-sm py-2">
                  {v.nome} ({fase === 'vegetativa' ? v.diasVegetativa : v.diasMaturacao}d)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Seletores individuais colapsáveis */}
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors py-1">
              {mv
                ? '▸ Definir variedade por bandeja…'
                : '▸ Definir variedade por perfil individual...'}
            </summary>
            <div className={`grid gap-2 mt-2 grid-cols-2 sm:grid-cols-3`}>
              {Array.from({ length: numPerfis }, (_, i) => {
                const perfil = perfis.find((p) => p.perfilIndex === i);
                const dateValue = valorDateInputPerfil(perfil);
                return (
                  <div key={i} className="p-2 rounded border bg-muted/20 space-y-1.5">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold text-muted-foreground w-8 shrink-0">{labelPosicaoProducao(projetoTipo, i)}</span>
                      <Select
                        value={perfil?.variedadeId || ''}
                        onValueChange={(val) => onPerfilVariedadeChange?.(i, val)}
                      >
                        <SelectTrigger className="h-8 text-xs flex-1">
                          <SelectValue placeholder="Var." />
                        </SelectTrigger>
                        <SelectContent>
                          {variedades.map((v) => (
                            <SelectItem key={v.id} value={v.id} className="text-sm py-2">
                              {v.nome} ({fase === 'vegetativa' ? v.diasVegetativa : v.diasMaturacao}d)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <input
                      type="date"
                      value={dateValue}
                      onChange={(e) => onPerfilDataChange?.(i, e.target.value)}
                      title={
                        modo === 'transplantio'
                          ? labelCampoDataPlantio(modoDataPlantio, fase, projetoTipo)
                          : undefined
                      }
                      className="h-8 w-full text-[11px] rounded-md border border-input bg-background px-2"
                    />
                  </div>
                );
              })}
            </div>
          </details>

          <Button
            type="button"
            variant="outline"
            className="w-full h-11 text-sm gap-2 font-semibold"
            onClick={() => onAndarTodo?.()}
          >
            {modo === 'transplantio' ? (
              <>
                <Sprout className="w-4 h-4" />
                {mv
                  ? `Plantar andar todo (${totalFuros} ${totalFuros === 1 ? 'lote' : 'lotes'})`
                  : `Plantar Andar Todo (${totalFuros} furos)`}
              </>
            ) : (
              <>
                <Scissors className="w-4 h-4" />
                Colher Andar Todo
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
