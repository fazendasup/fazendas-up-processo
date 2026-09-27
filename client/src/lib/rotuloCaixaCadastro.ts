/** Primeiro número do nome (“Torre Maturação 13 - Baby Leaf” → 13). */
export function numeroNoNomeCadastro(nome: string): number {
  const n = nome.match(/\d+/);
  return n ? Number(n[0]) : 10_000;
}

export type RotuloCaixaCadastro = { principal: string; detalhe?: string };

/**
 * Mesmo texto do cadastro de torres: nome da caixa e, abaixo, o nome de cada torre ligada.
 * Sem torre ativa, fica só o nome da caixa.
 */
export function rotuloCaixaComoCadastro(
  caixaNome: string,
  torres: { nome: string }[],
): RotuloCaixaCadastro {
  const ordenadas = [...torres].sort((a, b) => {
    const d = numeroNoNomeCadastro(a.nome) - numeroNoNomeCadastro(b.nome);
    if (d !== 0) return d;
    return a.nome.localeCompare(b.nome, "pt-BR");
  });
  if (ordenadas.length === 0) return { principal: caixaNome };
  return {
    principal: caixaNome,
    detalhe: ordenadas.map((t) => t.nome).join(" · "),
  };
}
