// ============================================================
// Hook de persistência LocalStorage para Fazendas Up
// ============================================================

import { useState, useCallback, useEffect } from 'react';
import type { FazendaData } from '@/lib/types';
import { gerarDadosIniciais } from '@/lib/types';

const STORAGE_KEY = 'fazendas-up-data';

function loadData(): FazendaData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as FazendaData;
    }
  } catch (e) {
    console.error('Erro ao carregar dados:', e);
  }
  return gerarDadosIniciais();
}

function saveData(data: FazendaData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Erro ao salvar dados:', e);
  }
}

export function useFazendaData() {
  const [data, setData] = useState<FazendaData>(() => loadData());

  useEffect(() => {
    saveData(data);
  }, [data]);

  const updateData = useCallback((updater: (prev: FazendaData) => FazendaData) => {
    setData((prev) => {
      const next = updater(prev);
      return next;
    });
  }, []);

  const resetData = useCallback(() => {
    const fresh = gerarDadosIniciais();
    setData(fresh);
  }, []);

  const exportCSV = useCallback(() => {
    const rows: string[] = [];
    // Header
    rows.push('Tipo,Torre,Andar,Fase,Data/Hora,EC,pH,Variedades,Produto,Quantidade,Tipo Aplicação');

    // Medições de caixas d'água
    data.caixasAgua.forEach((caixa) => {
      caixa.medicoes.forEach((m) => {
        const torresNomes = data.torres
          .filter((t) => caixa.torreIds.includes(t.id))
          .map((t) => t.nome)
          .join('; ');
        rows.push(
          `Medição Caixa,"${torresNomes}",-,${caixa.fase},${m.dataHora},${m.ec},${m.ph},-,-,-,-`
        );
      });
      caixa.aplicacoes.forEach((a) => {
        const torresNomes = data.torres
          .filter((t) => caixa.torreIds.includes(t.id))
          .map((t) => t.nome)
          .join('; ');
        rows.push(
          `Aplicação Caixa,"${torresNomes}",-,${caixa.fase},${a.dataHora},-,-,-,"${a.produto}","${a.quantidade}",${a.tipo}`
        );
      });
    });

    // Dados dos andares
    data.andares.forEach((andar) => {
      const torre = data.torres.find((t) => t.id === andar.torreId);
      if (!torre) return;
      if (andar.dataEntrada) {
        rows.push(
          `Registro Andar,"${torre.nome}",${andar.numero},${torre.fase},${andar.dataEntrada},-,-,"${andar.variedades.join('; ')}",-,-,-`
        );
      }
      andar.aplicacoes.forEach((a) => {
        rows.push(
          `Aplicação Andar,"${torre.nome}",${andar.numero},${torre.fase},${a.dataHora},-,-,-,"${a.produto}","${a.quantidade}",${a.tipo}`
        );
      });
    });

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fazendas-up-relatorio-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [data]);

  const backupJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fazendas-up-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [data]);

  const importJSON = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string) as FazendaData;
        setData(imported);
      } catch (err) {
        console.error('Erro ao importar:', err);
      }
    };
    reader.readAsText(file);
  }, []);

  return { data, updateData, resetData, exportCSV, backupJSON, importJSON };
}
