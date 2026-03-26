// ============================================================
// PerfilFurosGrid — Visualização interativa 6 perfis x 6 furos
// Permite habilitar/desabilitar por furo, perfil ou andar todo
// Cores: vazio=cinza, plantado=verde, colhido=laranja
// ============================================================

import type { Furo, FuroStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Check, X, Sprout, Scissors, Droplets } from 'lucide-react';

interface PerfilFurosGridProps {
  furos: Furo[];
  modo: 'transplantio' | 'colheita' | 'visualizacao';
  onFuroToggle?: (perfilIndex: number, furoIndex: number) => void;
  onPerfilToggle?: (perfilIndex: number) => void;
  onAndarTodo?: () => void;
  variedadeNome?: string;
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

const STATUS_LABELS: Record<FuroStatus, string> = {
  vazio: 'Vazio',
  plantado: 'Plantado',
  colhido: 'Colhido',
};

export default function PerfilFurosGrid({
  furos,
  modo,
  onFuroToggle,
  onPerfilToggle,
  onAndarTodo,
  variedadeNome,
}: PerfilFurosGridProps) {
  // Agrupar furos por perfil
  const perfis: Furo[][] = [];
  for (let p = 0; p < 6; p++) {
    perfis.push(furos.filter((f) => f.perfilIndex === p));
  }

  const totalPlantados = furos.filter((f) => f.status === 'plantado').length;
  const totalColhidos = furos.filter((f) => f.status === 'colhido').length;
  const totalVazios = furos.filter((f) => f.status === 'vazio').length;

  const isInteractive = modo !== 'visualizacao';

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
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-amber-400 border border-amber-500 inline-block" />
            Colhido ({totalColhidos})
          </span>
        </div>
        <span className="text-[10px] font-semibold text-muted-foreground">
          {totalPlantados + totalColhidos}/36 furos
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
        {perfis.map((perfilFuros, pIndex) => {
          const plantadosPerfil = perfilFuros.filter((f) => f.status === 'plantado').length;
          const colhidosPerfil = perfilFuros.filter((f) => f.status === 'colhido').length;

          return (
            <div key={pIndex} className="grid grid-cols-[auto_repeat(6,1fr)_auto] gap-1 mb-1 items-center">
              {/* Label do perfil */}
              <div className="w-14 text-[10px] font-semibold text-muted-foreground pr-1 text-right">
                P{pIndex + 1}
                <span className="text-[8px] font-normal block">{plantadosPerfil}/6</span>
              </div>

              {/* Furos */}
              {perfilFuros.map((furo) => (
                <Tooltip key={`${furo.perfilIndex}-${furo.furoIndex}`}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      disabled={!isInteractive}
                      onClick={() => isInteractive && onFuroToggle?.(furo.perfilIndex, furo.furoIndex)}
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
                    <p>Perfil {pIndex + 1}, Furo {furo.furoIndex + 1}</p>
                    <p className="font-semibold">{STATUS_LABELS[furo.status]}</p>
                    {furo.variedadeId && variedadeNome && (
                      <p className="text-muted-foreground">{variedadeNome}</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              ))}

              {/* Botão do perfil inteiro */}
              {isInteractive && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-16 h-7 text-[9px] px-1"
                  onClick={() => onPerfilToggle?.(pIndex)}
                >
                  {modo === 'transplantio' ? 'Plantar P' + (pIndex + 1) : 'Colher P' + (pIndex + 1)}
                </Button>
              )}
              {!isInteractive && <div className="w-16" />}
            </div>
          );
        })}
      </div>

      {/* Ação do andar todo */}
      {isInteractive && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full text-xs gap-1.5"
          onClick={onAndarTodo}
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
      )}
    </div>
  );
}
