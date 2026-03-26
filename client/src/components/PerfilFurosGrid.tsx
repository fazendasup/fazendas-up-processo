// ============================================================
// PerfilFurosGrid v3 — Adaptado por fase
// Mudas: perfis abertos (espuma fenólica), sem furos individuais
// Vegetativa: perfis com furos, sem colheita
// Maturação: perfis com furos, com colheita
// Variedade por perfil
// ============================================================

import type { Furo, FuroStatus, PerfilData, Fase, VariedadeConfig } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Sprout, Scissors, Leaf } from 'lucide-react';

interface PerfilFurosGridProps {
  furos: Furo[];
  perfis: PerfilData[];
  fase: Fase;
  modo: 'visualizacao' | 'transplantio' | 'colheita';
  variedades: VariedadeConfig[];
  onFuroToggle?: (perfilIndex: number, furoIndex: number, variedadeId?: string) => void;
  onPerfilToggle?: (perfilIndex: number, variedadeId?: string) => void;
  onPerfilVariedadeChange?: (perfilIndex: number, variedadeId: string) => void;
  onAndarTodo?: (variedadeId?: string) => void;
  onAndarVariedadeTodos?: (variedadeId: string) => void;
}

const STATUS_COLORS: Record<FuroStatus, string> = {
  vazio: 'bg-gray-200 border-gray-300 text-gray-400',
  plantado: 'bg-emerald-400 border-emerald-500 text-white',
  colhido: 'bg-amber-400 border-amber-500 text-white',
};

const STATUS_HOVER: Record<FuroStatus, string> = {
  vazio: 'hover:bg-gray-300',
  plantado: 'hover:bg-emerald-500',
  colhido: 'hover:bg-amber-500',
};

export default function PerfilFurosGrid({
  furos,
  perfis,
  fase,
  modo,
  variedades,
  onFuroToggle,
  onPerfilToggle,
  onPerfilVariedadeChange,
  onAndarTodo,
  onAndarVariedadeTodos,
}: PerfilFurosGridProps) {
  const isMudas = fase === 'mudas';
  const isInteractive = modo !== 'visualizacao';

  // ---- MUDAS: Perfis abertos (sem furos individuais) ----
  if (isMudas) {
    const perfisAtivos = (perfis || []).filter((p) => p.ativo).length;
    const perfisInativos = 6 - perfisAtivos;

    return (
      <div className="space-y-3">
        {/* Legenda */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-gray-200 border border-gray-300 inline-block" />
              Vazio ({perfisInativos})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-emerald-400 border border-emerald-500 inline-block" />
              Em uso ({perfisAtivos})
            </span>
          </div>
          <span className="text-[10px] font-semibold text-muted-foreground">
            {perfisAtivos}/6 perfis
          </span>
        </div>

        {/* Grid de perfis (sem furos) */}
        <div className="bg-muted/30 rounded-lg p-3 border">
          <div className="text-[9px] font-semibold text-muted-foreground mb-2 text-center">
            Perfis de Espuma Fenólica
          </div>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }, (_, pIndex) => {
              const perfil = (perfis || []).find((p) => p.perfilIndex === pIndex);
              const ativo = perfil?.ativo || false;
              const variedade = perfil?.variedadeId ? variedades.find((v) => v.id === perfil.variedadeId) : null;

              return (
                <div key={pIndex} className="space-y-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        disabled={!isInteractive}
                        onClick={() => isInteractive && onPerfilToggle?.(pIndex)}
                        className={`
                          w-full aspect-[3/2] rounded-lg border-2 transition-all duration-150 flex flex-col items-center justify-center gap-0.5
                          ${ativo
                            ? 'bg-emerald-400 border-emerald-500 text-white hover:bg-emerald-500'
                            : 'bg-gray-200 border-gray-300 text-gray-400 hover:bg-gray-300'
                          }
                          ${isInteractive ? 'cursor-pointer active:scale-95' : 'cursor-default'}
                        `}
                      >
                        <span className="text-xs font-bold">P{pIndex + 1}</span>
                        {ativo && <Leaf className="w-3.5 h-3.5" />}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p>Perfil {pIndex + 1}</p>
                      <p className="font-semibold">{ativo ? 'Em uso' : 'Vazio'}</p>
                      {variedade && <p className="text-muted-foreground">{variedade.nome}</p>}
                    </TooltipContent>
                  </Tooltip>

                  {/* Variedade selector per perfil */}
                  {isInteractive && ativo && (
                    <Select
                      value={perfil?.variedadeId || ''}
                      onValueChange={(val) => onPerfilVariedadeChange?.(pIndex, val)}
                    >
                      <SelectTrigger className="h-6 text-[9px] px-1">
                        <SelectValue placeholder="Variedade" />
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
                  {!isInteractive && variedade && (
                    <p className="text-[8px] text-center text-muted-foreground truncate">{variedade.nome}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Ação do andar todo */}
        {isInteractive && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Select onValueChange={(val) => onAndarVariedadeTodos?.(val)}>
                <SelectTrigger className="h-8 text-xs flex-1">
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
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full text-xs gap-1.5"
              onClick={() => onAndarTodo?.()}
            >
              <Sprout className="w-3.5 h-3.5" />
              {perfisAtivos === 6 ? 'Desativar Andar Todo' : 'Ativar Andar Todo (6 perfis)'}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ---- VEGETATIVA / MATURAÇÃO: Perfis com furos 6x6 ----
  const showColheita = fase === 'maturacao';

  // Agrupar furos por perfil
  const perfisFuros: Furo[][] = [];
  for (let p = 0; p < 6; p++) {
    perfisFuros.push(furos.filter((f) => f.perfilIndex === p));
  }

  const totalPlantados = furos.filter((f) => f.status === 'plantado').length;
  const totalColhidos = furos.filter((f) => f.status === 'colhido').length;
  const totalVazios = furos.filter((f) => f.status === 'vazio').length;

  return (
    <div className="space-y-3">
      {/* Legenda e contadores */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-gray-200 border border-gray-300 inline-block" />
            Vazio ({totalVazios})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-emerald-400 border border-emerald-500 inline-block" />
            Plantado ({totalPlantados})
          </span>
          {showColheita && (
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-amber-400 border border-amber-500 inline-block" />
              Colhido ({totalColhidos})
            </span>
          )}
        </div>
        <span className="text-[10px] font-semibold text-muted-foreground">
          {totalPlantados}{showColheita ? `+${totalColhidos}` : ''}/36 furos
        </span>
      </div>

      {/* Grid 6x6 */}
      <div className="bg-muted/30 rounded-lg p-3 border">
        {/* Header dos furos */}
        <div className="grid grid-cols-[auto_repeat(6,1fr)_auto] gap-1 mb-1">
          <div className="w-14" />
          {[1, 2, 3, 4, 5, 6].map((f) => (
            <div key={f} className="text-center text-[9px] font-semibold text-muted-foreground">
              F{f}
            </div>
          ))}
          <div className="w-16" />
        </div>

        {/* Perfis */}
        {perfisFuros.map((perfilFuros, pIndex) => {
          const plantadosPerfil = perfilFuros.filter((f) => f.status === 'plantado').length;
          const perfil = (perfis || []).find((p) => p.perfilIndex === pIndex);
          const variedade = perfil?.variedadeId ? variedades.find((v) => v.id === perfil.variedadeId) : null;

          return (
            <div key={pIndex} className="space-y-0.5 mb-1.5">
              <div className="grid grid-cols-[auto_repeat(6,1fr)_auto] gap-1 items-center">
                {/* Label do perfil */}
                <div className="w-14 text-[10px] font-semibold text-muted-foreground pr-1 text-right">
                  P{pIndex + 1}
                  <span className="text-[8px] font-normal block">{plantadosPerfil}/6</span>
                </div>

                {/* Furos */}
                {perfilFuros.map((furo) => {
                  const furoVarId = furo.variedadeId || perfil?.variedadeId;
                  const furoVar = furoVarId ? variedades.find((v) => v.id === furoVarId) : null;
                  return (
                    <Tooltip key={`${furo.perfilIndex}-${furo.furoIndex}`}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          disabled={!isInteractive}
                          onClick={() => isInteractive && onFuroToggle?.(furo.perfilIndex, furo.furoIndex, perfil?.variedadeId)}
                          className={`
                            aspect-square rounded-md border-2 transition-all duration-150 flex items-center justify-center
                            ${STATUS_COLORS[furo.status]}
                            ${isInteractive ? STATUS_HOVER[furo.status] + ' cursor-pointer active:scale-90' : ''}
                            ${!isInteractive ? 'cursor-default' : ''}
                          `}
                        >
                          {furo.status === 'plantado' && <Sprout className="w-3 h-3" />}
                          {furo.status === 'colhido' && <Scissors className="w-3 h-3" />}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <p>P{pIndex + 1} F{furo.furoIndex + 1}</p>
                        <p className="font-semibold">
                          {furo.status === 'vazio' ? 'Vazio' : furo.status === 'plantado' ? 'Plantado' : 'Colhido'}
                        </p>
                        {furoVar && <p className="text-muted-foreground">{furoVar.nome}</p>}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}

                {/* Botão do perfil inteiro */}
                {isInteractive && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-16 h-7 text-[9px] px-1"
                    onClick={() => onPerfilToggle?.(pIndex, perfil?.variedadeId)}
                  >
                    {modo === 'transplantio' ? `Plantar` : `Colher`}
                  </Button>
                )}
                {!isInteractive && <div className="w-16" />}
              </div>

              {/* Variedade per perfil selector */}
              {isInteractive && (
                <div className="grid grid-cols-[auto_1fr_auto] gap-1 items-center">
                  <div className="w-14" />
                  <Select
                    value={perfil?.variedadeId || ''}
                    onValueChange={(val) => onPerfilVariedadeChange?.(pIndex, val)}
                  >
                    <SelectTrigger className="h-5 text-[8px] px-1 border-dashed">
                      <SelectValue placeholder={`Variedade P${pIndex + 1}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {variedades.map((v) => (
                        <SelectItem key={v.id} value={v.id} className="text-xs">
                          {v.nome} ({fase === 'vegetativa' ? v.diasVegetativa : v.diasMaturacao}d)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="w-16" />
                </div>
              )}
              {!isInteractive && variedade && (
                <div className="grid grid-cols-[auto_1fr_auto] gap-1">
                  <div className="w-14" />
                  <p className="text-[8px] text-muted-foreground truncate">{variedade.nome}</p>
                  <div className="w-16" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Variedade para todos + Ação do andar todo */}
      {isInteractive && (
        <div className="space-y-2">
          <Select onValueChange={(val) => onAndarVariedadeTodos?.(val)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Definir variedade para todos os perfis..." />
            </SelectTrigger>
            <SelectContent>
              {variedades.map((v) => (
                <SelectItem key={v.id} value={v.id} className="text-xs">
                  {v.nome} ({fase === 'vegetativa' ? v.diasVegetativa : v.diasMaturacao}d)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full text-xs gap-1.5"
            onClick={() => onAndarTodo?.()}
          >
            {modo === 'transplantio' ? (
              <>
                <Sprout className="w-3.5 h-3.5" />
                Plantar Andar Todo (36 furos)
              </>
            ) : (
              <>
                <Scissors className="w-3.5 h-3.5" />
                Colher Andar Todo
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
