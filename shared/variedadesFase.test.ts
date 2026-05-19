import { describe, expect, it } from 'vitest';
import { variedadeEhBabyLeafFV } from './variedadesFase';

describe('variedadeEhBabyLeafFV', () => {
  it('slugs conhecidos', () => {
    expect(variedadeEhBabyLeafFV('manjericao', null)).toBe(true);
    expect(variedadeEhBabyLeafFV('baby-leaf-beterraba', null)).toBe(true);
    expect(variedadeEhBabyLeafFV('baby-leaf-acelga', null)).toBe(true);
  });

  it('heurística por nome', () => {
    expect(variedadeEhBabyLeafFV(null, 'Baby Leaf / Beterraba')).toBe(true);
    expect(variedadeEhBabyLeafFV(null, 'Baby Leaf / Acelga')).toBe(true);
    expect(variedadeEhBabyLeafFV(null, 'Manjericão')).toBe(true);
    expect(variedadeEhBabyLeafFV(null, 'Alface Crespa')).toBe(false);
  });

  it('cadastro explícito prevalece sobre heurística', () => {
    expect(variedadeEhBabyLeafFV('alface-crespa', 'Alface Crespa', true)).toBe(true);
    expect(variedadeEhBabyLeafFV('manjericao', null, false)).toBe(false);
  });
});
