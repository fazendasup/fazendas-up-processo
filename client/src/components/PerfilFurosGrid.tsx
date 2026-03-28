// ============================================================
// PerfilFurosGrid v7 — Status de transplantio/colheita por perfil
// Cada card de perfil mostra badge colorido indicando se está
// pronto, quase pronto, ou em processo baseado na dataEntrada individual
// ============================================================

import type { Furo, PerfilData, VariedadeConfig, Fase } from '@/lib/types';
import { ESTRUTURA_FASE } from '@/lib/types';
import { diasRestantes, labelPrevisao } from '@/lib/utils-farm';
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
  modo: 'visualizacao' | 'transplantio' | 'colheita';
  variedades: VariedadeConfig[];
  andarDataEntrada?: string | null; // data de entrada do andar (fallback)
  onFuroToggle?: (perfilIndex: number, furoIndex: number, variedadeId?: string) => void;
  onPerfilToggle?: (perfilIndex: number, variedadeId?: string) => void;
  onPerfilVariedadeChange?: (perfilIndex: number, variedadeId: string) => void;
  onAndarTodo?: () => void;
  onAndarVariedadeTodos?: (variedadeId: string) => void;
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
): { rest: number | null; label: string; color: string; bgColor: string; borderColor: string } {
  if (!perfil?.ativo) return { rest: null, label: '', color: '', bgColor: '', borderColor: '' };

  const dateStr = perfil.dataEntrada || andarDataEntrada || null;
  if (!dateStr) return { rest: null, label: 'Sem data', color: 'text-muted-foreground', bgColor: '', borderColor: '' };

  const rest = diasRestantes(dateStr, fase, perfil.variedadeId || undefined, variedades);
  if (rest === null) return { rest: null, label: 'Sem variedade', color: 'text-muted-foreground', bgColor: '', borderColor: '' };

  if (rest <= 0) {
    const lbl = fase === 'maturacao' ? 'COLHER!' : 'TRANSPLANTAR!';
    return { rest, label: lbl, color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-400' };
  }
  if (rest <= 3) {
    return { rest, label: `${rest}d restantes`, color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-400' };
  }
  return { rest, label: `${rest}d restantes`, color: 'text-emerald-700', bgColor: 'bg-emerald-50/50', borderColor: '' };
}

export default function PerfilFurosGrid({
  furos, perfis, fase, modo, variedades, andarDataEntrada,
  onFuroToggle, onPerfilToggle, onPerfilVariedadeChange,
  onAndarTodo, onAndarVariedadeTodos,
}: Props) {
  const isMudas = fase === 'mudas';
  const isMaturacao = fase === 'maturacao';
  const isInteractive = modo !== 'visualizacao';
  const estrutura = ESTRUTURA_FASE[fase];
  const numPerfis = estrutura.perfis;
  const numFuros = estrutura.furosPorPerfil;

  // ---- MUDAS: 12 perfis abertos ----
  if (isMudas) {
    const perfisAtivos = perfis.filter((p) => p.ativo).length;
    const perfisInativos = numPerfis - perfisAtivos;

    return (
      <div className="space-y-3">
        {/* Header com legenda */}
        <div className="flex items-center justify-between flex-wrap gap-1">
          <h4 className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Perfis de Espuma Fenólica
          </h4>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-gray-200 border border-gray-300" />
              Vazio ({perfisInativos})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              Ativo ({perfisAtivos})
            </span>
          </div>
        </div>

        {/* Seletor de variedade para todos */}
        {isInteractive && (
          <Select onValueChange={(val) => onAndarVariedadeTodos?.(val)}>
            <SelectTrigger className="h-10 text-sm">
              <SelectValue placeholder="Variedade para todos os perfis..." />
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

        {/* Grid: 3 colunas mobile, 4 colunas tablet, 6 colunas desktop */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {Array.from({ length: numPerfis }, (_, i) => {
            const perfil = perfis.find((p) => p.perfilIndex === i);
            const isAtivo = perfil?.ativo || false;
            const variedade = perfil?.variedadeId
              ? variedades.find((v) => v.id === perfil.variedadeId)
              : undefined;
            const ps = perfilStatus(perfil, andarDataEntrada, fase, variedades);

            return (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    disabled={!isInteractive}
                    onClick={() => onPerfilToggle?.(i, perfil?.variedadeId)}
                    className={`relative flex flex-col items-center justify-center rounded-lg border-2 transition-all min-h-[64px] py-2 px-1 ${
                      ps.rest !== null && ps.rest <= 0
                        ? 'bg-red-50 border-red-400 shadow-md ring-2 ring-red-200'
                        : ps.rest !== null && ps.rest <= 3
                        ? 'bg-amber-50 border-amber-400 shadow-sm'
                        : isAtivo
                        ? 'bg-emerald-50 border-emerald-400 shadow-sm'
                        : 'bg-gray-50 border-gray-200'
                    } ${isInteractive ? 'hover:shadow-md active:scale-95 cursor-pointer' : ''}`}
                  >
                    <span className={`text-sm font-bold ${
                      ps.rest !== null && ps.rest <= 0 ? 'text-red-700' :
                      ps.rest !== null && ps.rest <= 3 ? 'text-amber-700' :
                      isAtivo ? 'text-emerald-700' : 'text-gray-400'
                    }`}>
                      P{i + 1}
                    </span>
                    {variedade && (
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
                      <span className="text-[9px] mt-0.5 font-semibold text-emerald-600">
                        Ativar
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <p className="font-semibold">Perfil {i + 1} — {isAtivo ? 'Ativo' : 'Vazio'}</p>
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
              &#9654; Definir variedade por perfil individual...
            </summary>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
              {Array.from({ length: numPerfis }, (_, i) => {
                const perfil = perfis.find((p) => p.perfilIndex === i);
                return (
                  <div key={i} className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-muted-foreground w-6">P{i + 1}</span>
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
            Ativar/Desativar Andar Todo ({numPerfis} perfis)
          </Button>
        )}
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

  // Grid responsivo: 1 coluna mobile, 2 tablet, 3 desktop (vegetativa) ou 2 (maturação)
  const gridColsClass = isMaturacao
    ? 'grid-cols-1 sm:grid-cols-2'
    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-1">
        <h4 className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {numPerfis} Perfis × {numFuros} Furos
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
          {isMaturacao && (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              {contagens.colhido}
            </span>
          )}
        </div>
      </div>

      {/* Grid de perfis */}
      <div className={`grid gap-2 ${gridColsClass}`}>
        {furosPorPerfil.map((perfilFuros, pIndex) => {
          const perfil = perfis.find((p) => p.perfilIndex === pIndex);
          const variedade = perfil?.variedadeId
            ? variedades.find((v) => v.id === perfil.variedadeId)
            : undefined;
          const plantadosNoPerfil = perfilFuros.filter((f) => f.status === 'plantado').length;
          const ps = perfilStatus(perfil, andarDataEntrada, fase, variedades);

          return (
            <div key={pIndex} className={`border-2 rounded-lg p-2 transition-all ${
              ps.rest !== null && ps.rest <= 0
                ? 'border-red-400 bg-red-50/50 ring-1 ring-red-200'
                : ps.rest !== null && ps.rest <= 3
                ? 'border-amber-400 bg-amber-50/50'
                : 'border-border bg-muted/20'
            }`}>
              {/* Header do perfil */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`text-xs font-bold shrink-0 ${
                    ps.rest !== null && ps.rest <= 0 ? 'text-red-700' :
                    ps.rest !== null && ps.rest <= 3 ? 'text-amber-700' :
                    'text-muted-foreground'
                  }`}>P{pIndex + 1}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {plantadosNoPerfil}/{numFuros}
                  </span>
                  {variedade && (
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
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {ps.rest <= 0 ? (
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          {labelPrevisao(fase)}!
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
                    className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors min-h-[32px] ${
                      modo === 'transplantio'
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 active:bg-emerald-300'
                        : 'bg-amber-100 text-amber-700 hover:bg-amber-200 active:bg-amber-300'
                    }`}
                    onClick={() => onPerfilToggle?.(pIndex, perfil?.variedadeId)}
                  >
                    {modo === 'transplantio' ? '🌱 Plantar' : '✂️ Colher'}
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
                        className={`w-full aspect-square rounded-md border-2 transition-all flex items-center justify-center min-w-[28px] min-h-[28px] ${dotColor(furo.status)} ${dotBorder(furo.status)} ${
                          isInteractive ? 'hover:scale-110 active:scale-95 hover:shadow cursor-pointer' : ''
                        }`}
                      >
                        <span className={`text-[10px] font-bold leading-none ${
                          furo.status === 'vazio' ? 'text-gray-400' : 'text-white/90'
                        }`}>
                          {furo.furoIndex + 1}
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p className="font-semibold">P{pIndex + 1} F{furo.furoIndex + 1}</p>
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
          {contagens.plantado}/{totalFuros} plantados
          {isMaturacao && contagens.colhido > 0 && ` · ${contagens.colhido} colhidos`}
        </span>
      </div>

      {/* Variedade para todos + Ação do andar todo */}
      {isInteractive && (
        <div className="space-y-2">
          <Select onValueChange={(val) => onAndarVariedadeTodos?.(val)}>
            <SelectTrigger className="h-10 text-sm">
              <SelectValue placeholder="Variedade para todos os perfis..." />
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
              &#9654; Definir variedade por perfil individual...
            </summary>
            <div className={`grid gap-2 mt-2 grid-cols-2 sm:grid-cols-3`}>
              {Array.from({ length: numPerfis }, (_, i) => {
                const perfil = perfis.find((p) => p.perfilIndex === i);
                return (
                  <div key={i} className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-muted-foreground w-6">P{i + 1}</span>
                    <Select
                      value={perfil?.variedadeId || ''}
                      onValueChange={(val) => onPerfilVariedadeChange?.(i, val)}
                    >
                      <SelectTrigger className="h-9 text-xs flex-1">
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
                Plantar Andar Todo ({totalFuros} furos)
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
