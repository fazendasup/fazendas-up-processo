// ============================================================
// Contexto global da Fazenda - carrega dados via tRPC (banco de dados)
// v3: Optimistic updates + increased staleTime for performance
// ============================================================

import React, { createContext, useContext, useCallback, useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { useProjeto } from '@/contexts/ProjetoContext';
import type { FazendaData } from '@/lib/types';
import { EMPTY_FAZENDA_DATA, transformFazendaLoadAllResponse } from '@/lib/fazendaTransform';

// ---- Context ----

interface FazendaContextType {
  data: FazendaData;
  loading: boolean;
  error: any;
  refetch: () => void;
  updateData: (updater: (prev: FazendaData) => FazendaData) => void;
  resetData: () => void;
  exportCSV: () => void;
  backupJSON: () => void;
  importJSON: (file: File) => void;
}

const FazendaContext = createContext<FazendaContextType | null>(null);

export function FazendaProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { activeProjetoId, ready: projetoReady } = useProjeto();
  const loadEnabled = Boolean(user && activeProjetoId && projetoReady);

  const { data: rawData, isLoading, error, refetch } = trpc.fazenda.loadAll.useQuery(undefined, {
    enabled: loadEnabled,
    staleTime: 30_000, // 30s — avoids refetch storm on rapid mutations
    /** Ao voltar ao separador (ex. alterou dias na receita noutro separador), alinha torre/dashboard. */
    refetchOnWindowFocus: true,
    refetchInterval: 60_000, // background sync every 60s
  });

  // Server-derived data (updated on refetch)
  const serverData = useMemo(() => {
    if (!rawData) return EMPTY_FAZENDA_DATA;
    return transformFazendaLoadAllResponse(rawData);
  }, [rawData]);

  // Local optimistic overlay — allows instant UI updates
  const [optimisticOverrides, setOptimisticOverrides] = useState<Partial<FazendaData> | null>(null);

  // Merge server data with optimistic overrides
  const mergedData = useMemo(() => {
    if (!optimisticOverrides) return serverData;
    return { ...serverData, ...optimisticOverrides };
  }, [serverData, optimisticOverrides]);

  // Clear optimistic overrides when server data changes (refetch completed)
  useEffect(() => {
    setOptimisticOverrides(null);
  }, [rawData]);

  // updateData: applies optimistic update locally AND triggers server refetch
  const updateData = useCallback((updater: (prev: FazendaData) => FazendaData) => {
    setOptimisticOverrides((prev) => {
      const current = prev ? { ...serverData, ...prev } : serverData;
      const updated = updater(current);
      // Only keep the diff as overrides
      const overrides: Partial<FazendaData> = {};
      for (const key of Object.keys(updated) as (keyof FazendaData)[]) {
        if (updated[key] !== serverData[key]) {
          (overrides as any)[key] = updated[key];
        }
      }
      return Object.keys(overrides).length > 0 ? overrides : null;
    });
  }, [serverData]);

  const resetData = useCallback(() => {
    setOptimisticOverrides(null);
  }, []);

  const exportCSV = useCallback(() => {
    const data = mergedData;
    const rows: string[] = [];
    rows.push('Tipo,Torre,Andar,Fase,Data/Hora,EC,pH,Variedades,Produto,Quantidade,Tipo Aplicação,Plantas,Colhidas,Desperdício');

    data.caixasAgua.forEach((caixa) => {
      caixa.medicoes.forEach((m) => {
        const torresNomes = data.torres
          .filter((t) => caixa.torreIds.includes(t.id))
          .map((t) => t.nome)
          .join(';');
        rows.push(`Medição,${torresNomes},,${caixa.fase},${m.dataHora},${m.ec},${m.ph},${m.temperaturaAgua ?? ""},,,,,`);
      });
    });

    data.andares.forEach((andar) => {
      const torre = data.torres.find((t) => t.id === andar.torreId);
      if (!torre) return;
      const plantados = (andar.furos || []).filter((f) => f.status === 'plantado').length;
      const colhidos = (andar.furos || []).filter((f) => f.status === 'colhido').length;
      rows.push(`Andar,${torre.nome},${andar.numero},${torre.fase},${andar.dataEntrada || ''},,,"${andar.variedades.join(';')}",,,${plantados},${colhidos},`);
    });

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fazendas-up-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [mergedData]);

  const backupJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(mergedData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fazendas-up-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [mergedData]);

  const importJSON = useCallback((_file: File) => {
    console.warn('[FazendaContext] importJSON not supported in DB mode');
  }, []);

  const contextValue = useMemo(() => ({
    data: mergedData,
    loading: isLoading,
    error,
    refetch,
    updateData,
    resetData,
    exportCSV,
    backupJSON,
    importJSON,
  }), [mergedData, isLoading, error, refetch, updateData, resetData, exportCSV, backupJSON, importJSON]);

  return (
    <FazendaContext.Provider value={contextValue}>
      {children}
    </FazendaContext.Provider>
  );
}

export function useFazenda() {
  const ctx = useContext(FazendaContext);
  if (!ctx) throw new Error('useFazenda must be used within FazendaProvider');
  return ctx;
}
