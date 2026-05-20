import { describe, expect, it } from 'vitest';
import { ESTRUTURA_OVERRIDE_FV_12x6 } from '@shared/types';
import {
  capacidadePorFaseInstalacaoComFiltro,
  plantasPorAndarTorre,
  resumoInstalacaoCapacidadeFv,
  sementesParaColheitaEsperada,
  torreReservadaGrelhaBabyLeaf,
  type TorreCapInput,
} from './planejamentoContinuo';

describe('torreReservadaGrelhaBabyLeaf', () => {
  it('identifica preset FV 12×6', () => {
    const t: TorreCapInput = {
      fase: 'maturacao',
      numAndares: 1,
      ativa: true,
      estruturaOverride: ESTRUTURA_OVERRIDE_FV_12x6,
    };
    expect(torreReservadaGrelhaBabyLeaf(t)).toBe(true);
  });

  it('ignora torre sem override', () => {
    const t: TorreCapInput = { fase: 'maturacao', numAndares: 1, ativa: true };
    expect(torreReservadaGrelhaBabyLeaf(t)).toBe(false);
  });

  it('aceita patch parcial 12×6 em maturação', () => {
    const t: TorreCapInput = {
      fase: 'maturacao',
      numAndares: 1,
      ativa: true,
      estruturaOverride: { maturacao: { perfis: 12, furosPorPerfil: 6 } },
    };
    expect(torreReservadaGrelhaBabyLeaf(t)).toBe(true);
  });
});

describe('capacidadePorFaseInstalacaoComFiltro', () => {
  const projeto = 'fazenda_vertical';
  const torres: TorreCapInput[] = [
    {
      fase: 'maturacao',
      numAndares: 1,
      ativa: true,
      estruturaOverride: null,
    },
    {
      fase: 'maturacao',
      numAndares: 1,
      ativa: true,
      estruturaOverride: ESTRUTURA_OVERRIDE_FV_12x6,
    },
  ];

  it('soma só torres 12×6 no filtro baby leaf', () => {
    const onlyBaby = capacidadePorFaseInstalacaoComFiltro(torres, projeto, 'apenas_baby_leaf');
    const noBaby = capacidadePorFaseInstalacaoComFiltro(torres, projeto, 'exceto_baby_leaf');
    const all = capacidadePorFaseInstalacaoComFiltro(torres, projeto, 'todas');
    expect(onlyBaby.maturacao + noBaby.maturacao).toBe(all.maturacao);
    expect(onlyBaby.maturacao).toBeGreaterThan(0);
    expect(noBaby.maturacao).toBeGreaterThan(0);
  });

  it('baby leaf mat colheita = 1 posição por furo (72/and.)', () => {
    const t: TorreCapInput = {
      fase: 'maturacao',
      numAndares: 1,
      ativa: true,
      estruturaOverride: ESTRUTURA_OVERRIDE_FV_12x6,
    };
    expect(plantasPorAndarTorre(t, projeto, 'colheita')).toBe(72);
    expect(plantasPorAndarTorre(t, projeto, 'plantio')).toBe(144);
    const cap = capacidadePorFaseInstalacaoComFiltro([t], projeto, 'apenas_baby_leaf', 'colheita');
    expect(cap.maturacao).toBe(72);
  });

  it('2 torres mat 12×6 com 9 andares = 1296 posições de colheita', () => {
    const torres: TorreCapInput[] = [
      { fase: 'maturacao', numAndares: 9, ativa: true, estruturaOverride: ESTRUTURA_OVERRIDE_FV_12x6 },
      { fase: 'maturacao', numAndares: 9, ativa: true, estruturaOverride: ESTRUTURA_OVERRIDE_FV_12x6 },
    ];
    const cap = capacidadePorFaseInstalacaoComFiltro(torres, projeto, 'apenas_baby_leaf', 'colheita');
    expect(cap.maturacao).toBe(1296);
    expect(cap.vegetativa).toBe(0);
  });

  it('8 torres mat padrão 6×6 com 9 andares = 2592 em maturação', () => {
    const torres: TorreCapInput[] = Array.from({ length: 8 }, () => ({
      fase: 'maturacao' as const,
      numAndares: 9,
      ativa: true,
      estruturaOverride: null,
    }));
    const cap = capacidadePorFaseInstalacaoComFiltro(torres, projeto, 'exceto_baby_leaf');
    expect(cap.maturacao).toBe(2592);
  });

  it('20 padrão + 2 baby mat = 6480 + 1296 colheita', () => {
    const padrao = Array.from({ length: 20 }, () => ({
      fase: 'maturacao' as const,
      numAndares: 9,
      ativa: true,
      estruturaOverride: null,
    }));
    const baby = Array.from({ length: 2 }, () => ({
      fase: 'maturacao' as const,
      numAndares: 9,
      ativa: true,
      estruturaOverride: ESTRUTURA_OVERRIDE_FV_12x6,
    }));
    const resumo = resumoInstalacaoCapacidadeFv([...padrao, ...baby], projeto);
    expect(resumo.torresPorFase.maturacao).toBe(22);
    expect(resumo.maturacaoPadrao.quantidadeTorres).toBe(20);
    expect(resumo.maturacaoPadrao.capacidadeColheita).toBe(6480);
    expect(resumo.maturacaoBabyLeaf.quantidadeTorres).toBe(2);
    expect(resumo.maturacaoBabyLeaf.capacidadeColheita).toBe(1296);
    expect(resumo.maturacaoTotalColheita).toBe(7776);
  });

  it('considera torres cadastradas mesmo quando marcadas como inativas', () => {
    const torres: TorreCapInput[] = [
      { fase: 'maturacao', numAndares: 9, ativa: false, estruturaOverride: null },
      { fase: 'maturacao', numAndares: 9, ativa: false, estruturaOverride: ESTRUTURA_OVERRIDE_FV_12x6 },
    ];
    const resumo = resumoInstalacaoCapacidadeFv(torres, projeto);
    expect(resumo.torresCadastradas).toBe(2);
    expect(resumo.maturacaoPadrao.capacidadeColheita).toBe(324);
    expect(resumo.maturacaoBabyLeaf.capacidadeColheita).toBe(648);
  });

  it('3 torres veg 12×6 com 12 andares = 5184 só em vegetativa (plantio)', () => {
    const torres: TorreCapInput[] = [
      { fase: 'vegetativa', numAndares: 12, ativa: true, estruturaOverride: ESTRUTURA_OVERRIDE_FV_12x6 },
      { fase: 'vegetativa', numAndares: 12, ativa: true, estruturaOverride: ESTRUTURA_OVERRIDE_FV_12x6 },
      { fase: 'vegetativa', numAndares: 12, ativa: true, estruturaOverride: ESTRUTURA_OVERRIDE_FV_12x6 },
    ];
    const cap = capacidadePorFaseInstalacaoComFiltro(torres, projeto, 'apenas_baby_leaf', 'plantio');
    expect(cap.vegetativa).toBe(5184);
    expect(cap.maturacao).toBe(0);
  });
});

describe('sementesParaColheitaEsperada', () => {
  it('dobra sementes para baby leaf (2 células/furo)', () => {
    const base = sementesParaColheitaEsperada(100);
    const baby = sementesParaColheitaEsperada(100, { multiplicadorPlantio: 2 });
    expect(baby).toBeGreaterThanOrEqual(base * 2 - 1);
    expect(baby).toBeLessThanOrEqual(base * 2 + 1);
  });
});
