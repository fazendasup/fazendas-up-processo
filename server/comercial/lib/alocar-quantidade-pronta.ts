export type LinhaQuantidadePronta = {
  id: string;
  quantidade: number;
};

export type AlocacaoQuantidadePronta = {
  id: string;
  quantidadePronta: number;
  pronto: boolean;
};

const MIL = 1000;

function paraMilesimos(valor: number): number {
  if (!Number.isFinite(valor) || valor <= 0) return 0;
  return Math.round(valor * MIL);
}

/** Preenche as linhas na ordem recebida até atingir a quantidade pronta. */
export function alocarQuantidadePronta(
  linhas: LinhaQuantidadePronta[],
  alvo: number,
): AlocacaoQuantidadePronta[] {
  let restante = paraMilesimos(alvo);
  const total = linhas.reduce(
    (soma, linha) => soma + paraMilesimos(linha.quantidade),
    0,
  );
  if (restante > total) restante = total;

  return linhas.map(linha => {
    const quantidade = paraMilesimos(linha.quantidade);
    const dado = Math.min(quantidade, restante);
    restante -= dado;
    return {
      id: linha.id,
      quantidadePronta: dado / MIL,
      pronto: quantidade > 0 && dado >= quantidade,
    };
  });
}
