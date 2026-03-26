// ============================================================
// PerfilFurosGrid v5 — Layout ultra-compacto
// Furos como dots pequenos, todos os perfis visíveis sem scroll
// Mudas: 12 perfis abertos (espuma fenólica)
// Vegetativa: 12 perfis × 9 furos = 108 plantas
// Maturação: 6 perfis × 6 furos = 36 plantas
// ============================================================

import type { Furo, PerfilData, VariedadeConfig, Fase } from '@/lib/types';
import { ESTRUTURA_FASE } from '@/lib/types';
import { Sprout, Scissors } from 'lucide-react';
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
  onFuroToggle?: (perfilIndex: number, furoIndex: number, variedadeId?: string) => void;
  onPerfilToggle?: (perfilIndex: number, variedadeId?: string) => void;
  onPerfilVariedadeChange?: (perfilIndex: number, variedadeId: string) => void;
  onAndarTodo?: () => void;
  onAndarVariedadeTodos?: (variedadeId: string) => void;
}

// Cor do dot por status
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

export default function PerfilFurosGrid({
  furos, perfis, fase, modo, variedades,
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
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Perfis de Espuma Fenólica
          </h4>
          <div className="flex items-center gap-2 text-[9px]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-200 border border-gray-300" /> Vazio ({perfisInativos})</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Ativo ({perfisAtivos})</span>
          </div>
        </div>

        {/* Seletor de variedade para todos */}
        {isInteractive && (
          <Select onValueChange={(val) => onAndarVariedadeTodos?.(val)}>
            <SelectTrigger className="h-7 text-[10px]">
              <SelectValue placeholder="Variedade para todos os perfis..." />
            </SelectTrigger>
            <SelectContent>
              {variedades.map((v) => (
                <SelectItem key={v.id} value={v.id} className="text-xs">
                  {v.nome} ({v.diasMudas}d)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Grid 6x2 compacto para 12 perfis */}
        <div className="grid grid-cols-6 gap-1.5">
          {Array.from({ length: numPerfis }, (_, i) => {
            const perfil = perfis.find((p) => p.perfilIndex === i);
            const isAtivo = perfil?.ativo || false;
            const variedade = perfil?.variedadeId
              ? variedades.find((v) => v.id === perfil.variedadeId)
              : undefined;

            return (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    disabled={!isInteractive}
                    onClick={() => onPerfilToggle?.(i, perfil?.variedadeId)}
                    className={`relative flex flex-col items-center justify-center rounded-md border transition-all py-1.5 px-0.5 ${
                      isAtivo
                        ? 'bg-emerald-50 border-emerald-400 shadow-sm'
                        : 'bg-gray-50 border-gray-200'
                    } ${isInteractive ? 'hover:shadow-md hover:scale-105 cursor-pointer' : ''}`}
                  >
                    <span className={`text-[8px] font-bold ${isAtivo ? 'text-emerald-700' : 'text-gray-400'}`}>
                      P{i + 1}
                    </span>
                    {variedade && (
                      <span className="text-[6px] text-muted-foreground truncate w-full text-center leading-tight mt-0.5">
                        {variedade.nome.slice(0, 6)}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <p className="font-semibold">Perfil {i + 1} — {isAtivo ? 'Ativo' : 'Vazio'}</p>
                  {variedade && <p className="text-muted-foreground">{variedade.nome}</p>}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Seletores de variedade por perfil (colapsável) */}
        {isInteractive && (
          <details className="text-[9px]">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
              Definir variedade por perfil individual...
            </summary>
            <div className="grid grid-cols-4 gap-1 mt-1.5">
              {Array.from({ length: numPerfis }, (_, i) => {
                const perfil = perfis.find((p) => p.perfilIndex === i);
                return (
                  <Select
                    key={i}
                    value={perfil?.variedadeId || ''}
                    onValueChange={(val) => onPerfilVariedadeChange?.(i, val)}
                  >
                    <SelectTrigger className="h-5 text-[8px] px-1">
                      <SelectValue placeholder={`P${i + 1}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {variedades.map((v) => (
                        <SelectItem key={v.id} value={v.id} className="text-xs">
                          {v.nome} ({v.diasMudas}d)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
            size="sm"
            className="w-full text-[10px] h-7 gap-1"
            onClick={() => onAndarTodo?.()}
          >
            <Sprout className="w-3 h-3" />
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

  // Calcular grid de perfis: 2 colunas para maturação (6 perfis), 3 colunas para vegetativa (12 perfis)
  const perfilCols = isMaturacao ? 2 : 3;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          {numPerfis} Perfis × {numFuros} Furos
        </h4>
        <div className="flex items-center gap-2 text-[9px]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-200 border border-gray-300" /> {contagens.vazio}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> {contagens.plantado}</span>
          {isMaturacao && (
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> {contagens.colhido}</span>
          )}
        </div>
      </div>

      {/* Grid compacto de todos os perfis */}
      <div className={`grid gap-1.5`} style={{ gridTemplateColumns: `repeat(${perfilCols}, minmax(0, 1fr))` }}>
        {furosPorPerfil.map((perfilFuros, pIndex) => {
          const perfil = perfis.find((p) => p.perfilIndex === pIndex);
          const variedade = perfil?.variedadeId
            ? variedades.find((v) => v.id === perfil.variedadeId)
            : undefined;
          const plantadosNoPerfil = perfilFuros.filter((f) => f.status === 'plantado').length;
          const colhidosNoPerfil = perfilFuros.filter((f) => f.status === 'colhido').length;

          return (
            <div key={pIndex} className="border rounded-md p-1.5 bg-muted/20">
              {/* Header do perfil - compacto */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-bold text-muted-foreground">P{pIndex + 1}</span>
                  <span className="text-[8px] text-muted-foreground">
                    {plantadosNoPerfil}/{numFuros}
                  </span>
                  {variedade && (
                    <span className="text-[7px] bg-primary/10 text-primary px-1 py-px rounded-full truncate max-w-[50px]">
                      {variedade.nome.length > 8 ? variedade.nome.slice(0, 7) + '…' : variedade.nome}
                    </span>
                  )}
                </div>
                {isInteractive && (
                  <button
                    type="button"
                    className="text-[7px] text-primary hover:underline font-medium"
                    onClick={() => onPerfilToggle?.(pIndex, perfil?.variedadeId)}
                  >
                    {modo === 'transplantio' ? 'Plantar' : 'Colher'}
                  </button>
                )}
              </div>

              {/* Furos como dots compactos em grid */}
              <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${numFuros <= 6 ? numFuros : Math.ceil(numFuros / 2)}, minmax(0, 1fr))` }}>
                {perfilFuros.map((furo) => (
                  <Tooltip key={`${furo.perfilIndex}-${furo.furoIndex}`}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        disabled={!isInteractive}
                        onClick={() => onFuroToggle?.(pIndex, furo.furoIndex, perfil?.variedadeId)}
                        className={`w-full aspect-square rounded-sm border transition-all flex items-center justify-center min-w-[14px] min-h-[14px] max-w-[22px] max-h-[22px] ${dotColor(furo.status)} ${dotBorder(furo.status)} ${
                          isInteractive ? 'hover:scale-125 hover:shadow cursor-pointer' : ''
                        }`}
                      >
                        <span className="text-[6px] text-white/80 font-medium leading-none">
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
      <div className="flex items-center justify-between text-[9px] text-muted-foreground pt-1 border-t">
        <span>
          {contagens.plantado}/{totalFuros} plantados
          {isMaturacao && contagens.colhido > 0 && ` · ${contagens.colhido} colhidos`}
        </span>
      </div>

      {/* Variedade para todos + Ação do andar todo */}
      {isInteractive && (
        <div className="space-y-1.5">
          <Select onValueChange={(val) => onAndarVariedadeTodos?.(val)}>
            <SelectTrigger className="h-7 text-[10px]">
              <SelectValue placeholder="Variedade para todos os perfis..." />
            </SelectTrigger>
            <SelectContent>
              {variedades.map((v) => (
                <SelectItem key={v.id} value={v.id} className="text-xs">
                  {v.nome} ({fase === 'vegetativa' ? v.diasVegetativa : v.diasMaturacao}d)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Seletores individuais colapsáveis */}
          <details className="text-[9px]">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
              Definir variedade por perfil individual...
            </summary>
            <div className={`grid gap-1 mt-1`} style={{ gridTemplateColumns: `repeat(${perfilCols}, minmax(0, 1fr))` }}>
              {Array.from({ length: numPerfis }, (_, i) => {
                const perfil = perfis.find((p) => p.perfilIndex === i);
                return (
                  <Select
                    key={i}
                    value={perfil?.variedadeId || ''}
                    onValueChange={(val) => onPerfilVariedadeChange?.(i, val)}
                  >
                    <SelectTrigger className="h-5 text-[7px] px-1">
                      <SelectValue placeholder={`P${i + 1}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {variedades.map((v) => (
                        <SelectItem key={v.id} value={v.id} className="text-xs">
                          {v.nome} ({fase === 'vegetativa' ? v.diasVegetativa : v.diasMaturacao}d)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );
              })}
            </div>
          </details>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full text-[10px] h-7 gap-1"
            onClick={() => onAndarTodo?.()}
          >
            {modo === 'transplantio' ? (
              <>
                <Sprout className="w-3 h-3" />
                Plantar Andar Todo ({totalFuros} furos)
              </>
            ) : (
              <>
                <Scissors className="w-3 h-3" />
                Colher Andar Todo
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
