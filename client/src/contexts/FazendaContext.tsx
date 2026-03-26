// ============================================================
// Contexto global da Fazenda - carrega dados via tRPC (banco de dados)
// ============================================================

import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import type {
  FazendaData,
  Fase,
  FaseConfig,
  VariedadeConfig,
  Torre,
  CaixaAgua,
  MedicaoCaixa,
  AplicacaoCaixa,
  Andar,
  AplicacaoAndar,
  Furo,
  PerfilData,
  LoteGerminacao,
  RegistroTransplantio,
  Manutencao,
  CicloAplicacao,
} from '@/lib/types';
import { FASES_CONFIG, ESTRUTURA_FASE } from '@/lib/types';

// ---- Transform DB data to legacy format ----

function toDateStr(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString();
  return d;
}

function transformData(raw: any): FazendaData {
  // Build lookup maps
  const torreSlugMap = new Map<number, string>();
  const caixaSlugMap = new Map<number, string>();
  const varSlugMap = new Map<number, string>();
  const varNameMap = new Map<number, string>();

  (raw.torres || []).forEach((t: any) => torreSlugMap.set(t.id, t.slug));
  (raw.caixasAgua || []).forEach((c: any) => caixaSlugMap.set(c.id, c.slug));
  (raw.variedades || []).forEach((v: any) => { varSlugMap.set(v.id, v.slug); varNameMap.set(v.id, v.nome); });

  // Variedades
  const variedades: VariedadeConfig[] = (raw.variedades || []).map((v: any) => ({
    id: v.slug,
    nome: v.nome,
    diasMudas: v.diasMudas,
    diasVegetativa: v.diasVegetativa,
    diasMaturacao: v.diasMaturacao,
  }));

  // Fases config
  const fasesConfig: Record<Fase, FaseConfig> = { ...FASES_CONFIG };
  (raw.fasesConfig || []).forEach((fc: any) => {
    const fase = fc.fase as Fase;
    if (fasesConfig[fase]) {
      fasesConfig[fase] = {
        label: fc.label,
        ecMin: fc.ecMin,
        ecMax: fc.ecMax,
        phMin: fc.phMin,
        phMax: fc.phMax,
        cor: fc.cor,
        corLight: fc.corLight,
        icon: fc.icon,
      };
    }
  });

  // Caixas d'água
  const caixasAgua: CaixaAgua[] = (raw.caixasAgua || []).map((c: any) => {
    const torreIds = (raw.torres || []).filter((t: any) => t.caixaAguaId === c.id).map((t: any) => t.slug);
    const medicoes: MedicaoCaixa[] = (raw.medicoesCaixa || [])
      .filter((m: any) => m.caixaAguaId === c.id)
      .map((m: any) => ({
        id: `mc-${m.id}`,
        ec: m.ec,
        ph: m.ph,
        dataHora: toDateStr(m.dataHora) || '',
      }));
    const aplicacoes: AplicacaoCaixa[] = (raw.aplicacoesCaixa || [])
      .filter((a: any) => a.caixaAguaId === c.id)
      .map((a: any) => ({
        id: `ac-${a.id}`,
        tipo: a.tipo as AplicacaoCaixa['tipo'],
        produto: a.produto,
        quantidade: a.quantidade,
        dataHora: toDateStr(a.dataHora) || '',
      }));
    return {
      id: c.slug,
      nome: c.nome,
      fase: c.fase as Fase,
      torreIds,
      medicoes,
      aplicacoes,
    };
  });

  // Torres
  const torres: Torre[] = (raw.torres || []).map((t: any) => ({
    id: t.slug,
    nome: t.nome,
    fase: t.fase as Fase,
    andares: t.numAndares,
    caixaAguaId: t.caixaAguaId ? (caixaSlugMap.get(t.caixaAguaId) || '') : '',
  }));

  // Andares
  const andares: Andar[] = (raw.andares || []).map((a: any) => {
    const torreSlug = torreSlugMap.get(a.torreId) || '';
    const andarPerfis = (raw.perfis || []).filter((p: any) => p.andarId === a.id);
    const andarFuros = (raw.furos || []).filter((f: any) => f.andarId === a.id);
    const andarApps = (raw.aplicacoesAndar || []).filter((ap: any) => ap.andarId === a.id);

    // Build variedades list from active perfis
    const variedadeIdsSet = new Set<string>();
    const variedadeNamesSet = new Set<string>();
    andarPerfis.filter((p: any) => p.ativo && p.variedadeId).forEach((p: any) => {
      const slug = varSlugMap.get(p.variedadeId!) || '';
      if (slug) variedadeIdsSet.add(slug);
      const name = varNameMap.get(p.variedadeId!);
      if (name) variedadeNamesSet.add(name);
    });

    const perfis: PerfilData[] = andarPerfis.map((p: any) => ({
      perfilIndex: p.perfilIndex,
      variedadeId: p.variedadeId ? (varSlugMap.get(p.variedadeId) || undefined) : undefined,
      ativo: p.ativo,
    }));

    const furos: Furo[] = andarFuros.map((f: any) => ({
      perfilIndex: f.perfilIndex,
      furoIndex: f.furoIndex,
      status: f.status as Furo['status'],
      variedadeId: f.variedadeId ? (varSlugMap.get(f.variedadeId) || undefined) : undefined,
    }));

    const aplicacoes: AplicacaoAndar[] = andarApps.map((ap: any) => ({
      id: `aa-${ap.id}`,
      tipo: ap.tipo as AplicacaoAndar['tipo'],
      produto: ap.produto,
      quantidade: ap.quantidade,
      dataHora: toDateStr(ap.dataHora) || '',
    }));

    return {
      id: `a-${a.id}`,
      torreId: torreSlug,
      numero: a.numero,
      variedades: Array.from(variedadeNamesSet),
      variedadeIds: Array.from(variedadeIdsSet),
      dataEntrada: toDateStr(a.dataEntrada),
      aplicacoes,
      furos,
      perfis,
      lavado: a.lavado,
      dataColheitaTotal: toDateStr(a.dataColheitaTotal) || undefined,
    };
  });

  // Germinação
  const germinacao: LoteGerminacao[] = (raw.germinacao || []).map((g: any) => ({
    id: `g-${g.id}`,
    variedadeId: varSlugMap.get(g.variedadeId) || '',
    variedadeNome: g.variedadeNome,
    quantidade: g.quantidade,
    dataPlantio: toDateStr(g.dataPlantio) || '',
    dataHora: toDateStr(g.dataHora) || '',
    diasParaTransplantio: g.diasParaTransplantio,
    germinadas: g.germinadas,
    naoGerminadas: g.naoGerminadas,
    transplantadas: g.transplantadas,
    status: g.status as LoteGerminacao['status'],
    observacoes: g.observacoes || undefined,
  }));

  // Transplantios
  const transplantios: RegistroTransplantio[] = (raw.transplantios || []).map((t: any) => ({
    id: `tr-${t.id}`,
    dataHora: toDateStr(t.dataHora) || '',
    faseOrigem: t.faseOrigem as RegistroTransplantio['faseOrigem'],
    faseDestino: t.faseDestino as Fase,
    variedadeId: varSlugMap.get(t.variedadeId) || '',
    variedadeNome: t.variedadeNome,
    quantidadeTransplantada: t.quantidadeTransplantada,
    quantidadeDesperdicio: t.quantidadeDesperdicio,
    motivoDesperdicio: t.motivoDesperdicio || undefined,
    torreDestinoId: t.torreDestinoId ? (torreSlugMap.get(t.torreDestinoId) || undefined) : undefined,
    andarDestinoId: t.andarDestinoId ? `a-${t.andarDestinoId}` : undefined,
  }));

  // Manutenções
  const manutencoes: Manutencao[] = (raw.manutencoes || []).map((m: any) => ({
    id: `m-${m.id}`,
    torreId: torreSlugMap.get(m.torreId) || '',
    andarNumero: m.andarNumero || undefined,
    tipo: m.tipo as Manutencao['tipo'],
    descricao: m.descricao,
    dataAbertura: toDateStr(m.dataAbertura) || '',
    prazo: toDateStr(m.prazo) || undefined,
    dataConclusao: toDateStr(m.dataConclusao) || undefined,
    solucao: m.solucao || undefined,
    status: m.status as Manutencao['status'],
    lampadaIndex: m.lampadaIndex ?? undefined,
  }));

  // Ciclos
  const ciclos: CicloAplicacao[] = (raw.ciclos || []).map((c: any) => ({
    id: `c-${c.id}`,
    nome: c.nome,
    frequencia: c.frequencia as CicloAplicacao['frequencia'],
    diasSemana: c.diasSemana as number[] | undefined,
    intervaloDias: c.intervaloDias || undefined,
    produto: c.produto,
    tipo: c.tipo,
    fasesAplicaveis: (c.fasesAplicaveis as Fase[]) || [],
    alvo: c.alvo as CicloAplicacao['alvo'],
    ultimaExecucao: toDateStr(c.ultimaExecucao) || undefined,
    ativo: c.ativo,
  }));

  return {
    torres,
    caixasAgua,
    andares,
    ciclos,
    fasesConfig,
    variedades,
    germinacao,
    transplantios,
    manutencoes,
  };
}

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

const emptyData: FazendaData = {
  torres: [],
  caixasAgua: [],
  andares: [],
  ciclos: [],
  fasesConfig: { ...FASES_CONFIG },
  variedades: [],
  germinacao: [],
  transplantios: [],
  manutencoes: [],
};

const FazendaContext = createContext<FazendaContextType | null>(null);

export function FazendaProvider({ children }: { children: React.ReactNode }) {
  const utils = trpc.useUtils();
  const { data: rawData, isLoading, error, refetch } = trpc.fazenda.loadAll.useQuery(undefined, {
    staleTime: 5000,
    refetchOnWindowFocus: true,
  });

  const seedMutation = trpc.admin.seed.useMutation({
    onSuccess: () => { utils.fazenda.loadAll.invalidate(); },
  });

  const [transformedData, setTransformedData] = useState<FazendaData>(emptyData);
  const [needsSeed, setNeedsSeed] = useState(false);

  useEffect(() => {
    if (rawData) {
      const transformed = transformData(rawData);
      setTransformedData(transformed);
      // If no torres exist, we need to seed
      if (transformed.torres.length === 0 && !needsSeed) {
        setNeedsSeed(true);
      }
    }
  }, [rawData]);

  useEffect(() => {
    if (needsSeed && !seedMutation.isPending) {
      seedMutation.mutate();
      setNeedsSeed(false);
    }
  }, [needsSeed]);

  const updateData = useCallback((_updater: (prev: FazendaData) => FazendaData) => {
    // Legacy compatibility: mutations should go through tRPC mutations
    // This triggers a refetch from the server
    console.warn('[FazendaContext] updateData called - use tRPC mutations for persistence');
    utils.fazenda.loadAll.invalidate();
  }, [utils]);

  const resetData = useCallback(() => {
    console.warn('[FazendaContext] resetData called');
  }, []);

  const exportCSV = useCallback(() => {
    const data = transformedData;
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
      const plantadas = torre.fase === 'mudas'
        ? (andar.perfis || []).filter((p) => p.ativo).length
        : (andar.furos || []).filter((f) => f.status === 'plantado').length;
      const colhidas = torre.fase === 'maturacao'
        ? (andar.furos || []).filter((f) => f.status === 'colhido').length
        : 0;
      if (andar.dataEntrada) {
        rows.push(`Registro Andar,"${torre.nome}",${andar.numero},${torre.fase},${andar.dataEntrada},-,-,"${andar.variedades.join('; ')}",-,-,-,${plantadas},${colhidas},-`);
      }
      andar.aplicacoes.forEach((a) => {
        rows.push(`Aplicação Andar,"${torre.nome}",${andar.numero},${torre.fase},${a.dataHora},-,-,-,"${a.produto}","${a.quantidade}",${a.tipo},-,-,-`);
      });
    });

    data.germinacao.forEach((g) => {
      rows.push(`Germinação,-,-,germinação,${g.dataHora},-,-,"${g.variedadeNome}",-,${g.quantidade},-,${g.germinadas},${g.naoGerminadas},-`);
    });

    data.transplantios.forEach((t) => {
      rows.push(`Transplantio,-,-,${t.faseDestino},${t.dataHora},-,-,"${t.variedadeNome}",-,-,-,${t.quantidadeTransplantada},-,${t.quantidadeDesperdicio}`);
    });

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
  }, [transformedData]);

  const backupJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(transformedData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fazendas-up-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [transformedData]);

  const importJSON = useCallback((_file: File) => {
    console.warn('[FazendaContext] importJSON is not yet supported in full-stack mode');
  }, []);

  return (
    <FazendaContext.Provider value={{
      data: transformedData,
      loading: isLoading || seedMutation.isPending,
      error,
      refetch,
      updateData,
      resetData,
      exportCSV,
      backupJSON,
      importJSON,
    }}>
      {children}
    </FazendaContext.Provider>
  );
}

export function useFazenda() {
  const ctx = useContext(FazendaContext);
  if (!ctx) throw new Error('useFazenda deve ser usado dentro de FazendaProvider');
  return ctx;
}
