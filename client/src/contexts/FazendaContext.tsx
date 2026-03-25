// ============================================================
// Contexto global da Fazenda - provê dados e ações para toda a app
// ============================================================

import React, { createContext, useContext } from 'react';
import { useFazendaData } from '@/hooks/useStorage';
import type { FazendaData } from '@/lib/types';

interface FazendaContextType {
  data: FazendaData;
  updateData: (updater: (prev: FazendaData) => FazendaData) => void;
  resetData: () => void;
  exportCSV: () => void;
  backupJSON: () => void;
  importJSON: (file: File) => void;
}

const FazendaContext = createContext<FazendaContextType | null>(null);

export function FazendaProvider({ children }: { children: React.ReactNode }) {
  const fazenda = useFazendaData();

  return (
    <FazendaContext.Provider value={fazenda}>
      {children}
    </FazendaContext.Provider>
  );
}

export function useFazenda() {
  const ctx = useContext(FazendaContext);
  if (!ctx) throw new Error('useFazenda deve ser usado dentro de FazendaProvider');
  return ctx;
}
