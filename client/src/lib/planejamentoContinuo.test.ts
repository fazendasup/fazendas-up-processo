import { describe, expect, it } from 'vitest';
import { ESTRUTURA_OVERRIDE_FV_12x6 } from '@shared/types';
import {
  capacidadePorFaseInstalacaoComFiltro,
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
});
