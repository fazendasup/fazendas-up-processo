// ============================================================
// Hook de persistência LocalStorage para Fazendas Up v2
// Com migração automática de dados v1 → v2
// ============================================================

import { useState, useCallback, useEffect } from 'react';
import type { FazendaData, Andar } from '@/lib/types';
import { gerarDadosIniciais, gerarFurosIniciais, VARIEDADES_PADRAO } from '@/lib/types';

const STORAGE_KEY = 'fazendas-up-data';

/** Migra dados antigos (v1) para o formato v2 */
function migrateData(raw: any): FazendaData {
  const data = raw as FazendaData;

  // Adicionar campos novos se ausentes
  if (!data.variedades) data.variedades = [...VARIEDADES_PADRAO];
  if (!data.germinacao) data.germinacao = [];
  if (!data.transplantios) data.transplantios = [];
  if (!data.manutencoes) data.manutencoes = [];

  // Migrar andares: adicionar furos se não existem
  if (data.andares) {
    data.andares = data.andares.map((andar: any) => ({
      ...andar,
      variedadeIds: andar.variedadeIds || [],
      furos: andar.furos || gerarFurosIniciais(),
      lavado: andar.lavado !== undefined ? andar.lavado : true,
      dataColheitaTotal: andar.dataColheitaTotal || undefined,
    }));
  }

  return data;
}

function loadData(): FazendaData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return migrateData(parsed);
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
    setData((prev) => updater(prev));
  }, []);

  const resetData = useCallback(() => {
    const fresh = gerarDadosIniciais();
    setData(fresh);
  }, []);

  const exportCSV = useCallback(() => {
    const rows: string[] = [];
    rows.push('Tipo,Torre,Andar,Fase,Data/Hora,EC,pH,Variedades,Produto,Quantidade,Tipo Aplicação,Plantas,Colhidas,Desperdício');

    data.caixasAgua.forEach((caixa) => {
      caixa.medicoes.forEach((m) => {
        const torresNomes = data.torres
          .filter((t) => caixa.torreIds.includes(t.id))
          .map((t) => t.nome).join('; ');
        rows.push(`Medição Caixa,"${torresNomes}",-,${caixa.fase},${m.dataHora},${m.ec},${m.ph},-,-,-,-,-,-,-`);
      });
      caixa.aplicacoes.forEach((a) => {
        const torresNomes = data.torres
          .filter((t) => caixa.torreIds.includes(t.id))
          .map((t) => t.nome).join('; ');
        rows.push(`Aplicação Caixa,"${torresNomes}",-,${caixa.fase},${a.dataHora},-,-,-,"${a.produto}","${a.quantidade}",${a.tipo},-,-,-`);
      });
    });

    data.andares.forEach((andar) => {
      const torre = data.torres.find((t) => t.id === andar.torreId);
      if (!torre) return;
      const plantadas = andar.furos?.filter((f) => f.status === 'plantado').length || 0;
      const colhidas = andar.furos?.filter((f) => f.status === 'colhido').length || 0;
      if (andar.dataEntrada) {
        rows.push(`Registro Andar,"${torre.nome}",${andar.numero},${torre.fase},${andar.dataEntrada},-,-,"${andar.variedades.join('; ')}",-,-,-,${plantadas},${colhidas},-`);
      }
      andar.aplicacoes.forEach((a) => {
        rows.push(`Aplicação Andar,"${torre.nome}",${andar.numero},${torre.fase},${a.dataHora},-,-,-,"${a.produto}","${a.quantidade}",${a.tipo},-,-,-`);
      });
    });

    // Germinação
    data.germinacao.forEach((g) => {
      rows.push(`Germinação,-,-,germinação,${g.dataHora},-,-,"${g.variedadeNome}",-,${g.quantidade},-,${g.germinadas},${g.naoGerminadas},-`);
    });

    // Transplantios
    data.transplantios.forEach((t) => {
      rows.push(`Transplantio,-,-,${t.faseDestino},${t.dataHora},-,-,"${t.variedadeNome}",-,-,-,${t.quantidadeTransplantada},-,${t.quantidadeDesperdicio}`);
    });

    // Manutenções
    data.manutencoes.forEach((m) => {
      const torre = data.torres.find((t) => t.id === m.torreId);
      rows.push(`Manutenção,"${torre?.nome || '-'}",${m.andarNumero || '-'},-,${m.dataAbertura},-,-,-,"${m.descricao}",-,${m.tipo},-,-,-`);
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
        const imported = JSON.parse(e.target?.result as string);
        setData(migrateData(imported));
      } catch (err) {
        console.error('Erro ao importar:', err);
      }
    };
    reader.readAsText(file);
  }, []);

  return { data, updateData, resetData, exportCSV, backupJSON, importJSON };
}
