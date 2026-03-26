// ============================================================
// PerfilFurosGrid v4 — Estrutura dinâmica por fase
// Mudas: 12 perfis abertos (espuma fenólica), sem furos
// Vegetativa: 12 perfis × 9 furos = 108 plantas
// Maturação: 6 perfis × 6 furos = 36 plantas
// ============================================================

import type { Furo, PerfilData, VariedadeConfig, Fase } from '@/lib/types';
import { ESTRUTURA_FASE } from '@/lib/types';
import { Sprout, Scissors, Leaf } from 'lucide-react';
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
  const totalSlots = isMudas ? numPerfis : numPerfis * numFuros;

  // ---- MUDAS: 12 perfis abertos ----
  if (isMudas) {
    const perfisAtivos = perfis.filter((p) => p.ativo).length;
    const perfisInativos = numPerfis - perfisAtivos;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Perfis de Espuma Fenólica
          </h4>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-gray-200 border" /> Vazio ({perfisInativos})</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" /> Ativo ({perfisAtivos})</span>
          </div>
        </div>

        {/* Seletor de variedade para todos */}
        {isInteractive && (
          <Select onValueChange={(val) => onAndarVariedadeTodos?.(val)}>
            <SelectTrigger className="h-8 text-xs">
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

        {/* Grid 4x3 para 12 perfis */}
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: numPerfis }, (_, i) => {
            const perfil = perfis.find((p) => p.perfilIndex === i);
            const isAtivo = perfil?.ativo || false;
            const variedade = perfil?.variedadeId
              ? variedades.find((v) => v.id === perfil.variedadeId)
              : undefined;

            return (
              <div key={i} className="space-y-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      disabled={!isInteractive}
                      onClick={() => onPerfilToggle?.(i, perfil?.variedadeId)}
                      className={`w-full aspect-[3/2] rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-0.5 ${
                        isAtivo
                          ? 'bg-emerald-100 border-emerald-400 text-emerald-700 shadow-sm'
                          : 'bg-gray-50 border-gray-200 text-gray-400'
                      } ${isInteractive ? 'hover:shadow-md hover:scale-[1.02] cursor-pointer' : ''}`}
                    >
                      <Sprout className={`w-4 h-4 ${isAtivo ? 'text-emerald-600' : 'text-gray-300'}`} />
                      <span className="text-[10px] font-bold">P{i + 1}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <p>Perfil {i + 1}</p>
                    <p className="font-semibold">{isAtivo ? 'Ativo' : 'Vazio'}</p>
                    {variedade && <p className="text-muted-foreground">{variedade.nome}</p>}
                  </TooltipContent>
                </Tooltip>

                {/* Seletor de variedade por perfil */}
                {isInteractive && (
                  <Select
                    value={perfil?.variedadeId || ''}
                    onValueChange={(val) => onPerfilVariedadeChange?.(i, val)}
                  >
                    <SelectTrigger className="h-5 text-[8px] px-1 border-dashed">
                      <SelectValue placeholder={`Var.`} />
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
                  <p className="text-[8px] text-muted-foreground text-center truncate">{variedade.nome}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Botão andar todo */}
        {isInteractive && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full text-xs gap-1.5"
            onClick={() => onAndarTodo?.()}
          >
            <Sprout className="w-3.5 h-3.5" />
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {numPerfis} Perfis × {numFuros} Furos
        </h4>
        <div className="flex items-center gap-3 text-[10px] flex-wrap">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-gray-200 border" /> Vazio ({contagens.vazio})</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" /> Plantado ({contagens.plantado})</span>
          {isMaturacao && (
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400" /> Colhido ({contagens.colhido})</span>
          )}
        </div>
      </div>

      {/* Grid de perfis */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {furosPorPerfil.map((perfilFuros, pIndex) => {
          const perfil = perfis.find((p) => p.perfilIndex === pIndex);
          const variedade = perfil?.variedadeId
            ? variedades.find((v) => v.id === perfil.variedadeId)
            : undefined;
          const plantadosNoPerfil = perfilFuros.filter((f) => f.status === 'plantado').length;
          const colhidosNoPerfil = perfilFuros.filter((f) => f.status === 'colhido').length;

          // Calcular colunas do grid baseado no número de furos
          const gridCols = numFuros <= 6 ? numFuros : Math.ceil(numFuros / 2);
          const gridRows = numFuros <= 6 ? 1 : 2;

          return (
            <div key={pIndex} className="border rounded-lg p-2 bg-muted/20">
              {/* Header do perfil */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground w-8">P{pIndex + 1}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {plantadosNoPerfil}/{numFuros}
                    {isMaturacao && colhidosNoPerfil > 0 && (
                      <span className="text-amber-600 ml-1">({colhidosNoPerfil} colhidos)</span>
                    )}
                  </span>
                  {variedade && (
                    <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{variedade.nome}</span>
                  )}
                </div>
                {isInteractive && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[9px] px-2"
                    onClick={() => onPerfilToggle?.(pIndex, perfil?.variedadeId)}
                  >
                    {modo === 'transplantio' ? 'Plantar P' : 'Colher P'}{pIndex + 1}
                  </Button>
                )}
              </div>

              {/* Furos grid */}
              <div className="flex items-start gap-1">
                {/* Furos headers */}
                <div className="w-8" />
                <div className={`flex-1 grid gap-1`} style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}>
                  {/* Header row */}
                  {Array.from({ length: gridCols }, (_, fi) => (
                    <div key={`h-${fi}`} className="text-center text-[8px] text-muted-foreground font-medium">
                      F{fi + 1}
                    </div>
                  ))}
                </div>
              </div>

              {/* Furo rows */}
              {Array.from({ length: gridRows }, (_, rowIdx) => {
                const startFuro = rowIdx * gridCols;
                const endFuro = Math.min(startFuro + gridCols, numFuros);
                const rowFuros = perfilFuros.slice(startFuro, endFuro);

                return (
                  <div key={rowIdx} className="flex items-center gap-1 mt-0.5">
                    <div className="w-8 text-[8px] text-muted-foreground text-right pr-1">
                      {gridRows > 1 ? (rowIdx === 0 ? 'F1-' + gridCols : `F${gridCols + 1}-${numFuros}`) : ''}
                    </div>
                    <div className={`flex-1 grid gap-1`} style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}>
                      {rowFuros.map((furo) => {
                        const furoVar = furo.variedadeId
                          ? variedades.find((v) => v.id === furo.variedadeId)
                          : undefined;

                        return (
                          <Tooltip key={`${furo.perfilIndex}-${furo.furoIndex}`}>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                disabled={!isInteractive}
                                onClick={() => onFuroToggle?.(pIndex, furo.furoIndex, perfil?.variedadeId)}
                                className={`aspect-square rounded-md border transition-all flex items-center justify-center ${
                                  furo.status === 'plantado'
                                    ? 'bg-emerald-400 border-emerald-500 text-white shadow-sm'
                                    : furo.status === 'colhido'
                                    ? 'bg-amber-400 border-amber-500 text-white shadow-sm'
                                    : 'bg-gray-100 border-gray-200 text-gray-300'
                                } ${isInteractive ? 'hover:shadow-md hover:scale-105 cursor-pointer' : ''}`}
                              >
                                {furo.status === 'plantado' && <Sprout className="w-2.5 h-2.5" />}
                                {furo.status === 'colhido' && <Scissors className="w-2.5 h-2.5" />}
                                {furo.status === 'vazio' && <span className="text-[7px]">{furo.furoIndex + 1}</span>}
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
                      {/* Preencher células vazias se a última linha não está completa */}
                      {rowFuros.length < gridCols && Array.from({ length: gridCols - rowFuros.length }, (_, i) => (
                        <div key={`empty-${i}`} />
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Seletor de variedade por perfil */}
              {isInteractive && (
                <div className="mt-1.5">
                  <Select
                    value={perfil?.variedadeId || ''}
                    onValueChange={(val) => onPerfilVariedadeChange?.(pIndex, val)}
                  >
                    <SelectTrigger className="h-6 text-[9px] px-1 border-dashed">
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
                </div>
              )}
              {!isInteractive && variedade && !perfil?.variedadeId && (
                <p className="text-[8px] text-muted-foreground mt-1">{variedade.nome}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Rodapé: total + ações do andar */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t">
        <span>
          Total: {contagens.plantado} plantados / {totalFuros} furos
          {isMaturacao && contagens.colhido > 0 && ` · ${contagens.colhido} colhidos`}
        </span>
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
                Plantar Andar Todo ({totalFuros} furos)
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
