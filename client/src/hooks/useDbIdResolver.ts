// ============================================================
// useDbIdResolver — Resolve slugs do frontend para IDs numéricos do DB
// Necessário porque o frontend usa slugs como IDs e o backend usa int
// ============================================================

import { useMemo } from 'react';
import { trpc } from '@/lib/trpc';

export function useDbIdResolver() {
  const { data: rawData } = trpc.fazenda.loadAll.useQuery(undefined, {
    staleTime: 5000,
  });

  return useMemo(() => {
    if (!rawData) return {
      torreSlugToId: new Map<string, number>(),
      caixaSlugToId: new Map<string, number>(),
      varSlugToId: new Map<string, number>(),
      andarFrontIdToDbId: new Map<string, number>(),
      medicaoFrontIdToDbId: new Map<string, number>(),
      aplicacaoCaixaFrontIdToDbId: new Map<string, number>(),
      aplicacaoAndarFrontIdToDbId: new Map<string, number>(),
      germinacaoFrontIdToDbId: new Map<string, number>(),
      transplantioFrontIdToDbId: new Map<string, number>(),
      manutencaoFrontIdToDbId: new Map<string, number>(),
      cicloFrontIdToDbId: new Map<string, number>(),
    };

    const torreSlugToId = new Map<string, number>();
    const caixaSlugToId = new Map<string, number>();
    const varSlugToId = new Map<string, number>();
    const andarFrontIdToDbId = new Map<string, number>();
    const medicaoFrontIdToDbId = new Map<string, number>();
    const aplicacaoCaixaFrontIdToDbId = new Map<string, number>();
    const aplicacaoAndarFrontIdToDbId = new Map<string, number>();
    const germinacaoFrontIdToDbId = new Map<string, number>();
    const transplantioFrontIdToDbId = new Map<string, number>();
    const manutencaoFrontIdToDbId = new Map<string, number>();
    const cicloFrontIdToDbId = new Map<string, number>();

    (rawData.torres || []).forEach((t: any) => torreSlugToId.set(t.slug, t.id));
    (rawData.caixasAgua || []).forEach((c: any) => caixaSlugToId.set(c.slug, c.id));
    (rawData.variedades || []).forEach((v: any) => varSlugToId.set(v.slug, v.id));
    (rawData.andares || []).forEach((a: any) => andarFrontIdToDbId.set(`a-${a.id}`, a.id));
    (rawData.medicoesCaixa || []).forEach((m: any) => medicaoFrontIdToDbId.set(`mc-${m.id}`, m.id));
    (rawData.aplicacoesCaixa || []).forEach((a: any) => aplicacaoCaixaFrontIdToDbId.set(`ac-${a.id}`, a.id));
    (rawData.aplicacoesAndar || []).forEach((a: any) => aplicacaoAndarFrontIdToDbId.set(`aa-${a.id}`, a.id));
    (rawData.germinacao || []).forEach((g: any) => germinacaoFrontIdToDbId.set(`g-${g.id}`, g.id));
    (rawData.transplantios || []).forEach((t: any) => transplantioFrontIdToDbId.set(`tr-${t.id}`, t.id));
    (rawData.manutencoes || []).forEach((m: any) => manutencaoFrontIdToDbId.set(`m-${m.id}`, m.id));
    (rawData.ciclos || []).forEach((c: any) => cicloFrontIdToDbId.set(`c-${c.id}`, c.id));

    return {
      torreSlugToId,
      caixaSlugToId,
      varSlugToId,
      andarFrontIdToDbId,
      medicaoFrontIdToDbId,
      aplicacaoCaixaFrontIdToDbId,
      aplicacaoAndarFrontIdToDbId,
      germinacaoFrontIdToDbId,
      transplantioFrontIdToDbId,
      manutencaoFrontIdToDbId,
      cicloFrontIdToDbId,
    };
  }, [rawData]);
}
