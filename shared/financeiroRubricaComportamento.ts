/**
 * Comportamento de custo por rúbrica: fixo × variável.
 * Heurística padrão + override editável por projeto.
 */

export type ComportamentoCusto = "fixo" | "variavel";

export function normalizarChaveRubrica(rubrica: string): string {
  return rubrica.trim().toLowerCase().replace(/\s+/g, " ");
}

function textoRubrica(rubrica: string, descricao?: string | null): string {
  return `${rubrica} ${descricao ?? ""}`
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

/**
 * Heurística inicial (editável depois na Análise).
 * Fixo: estrutura/obrigações que não acompanham volume.
 * Variável: insumos e gastos que acompanham produção/venda.
 */
export function inferirComportamentoCustoHeuristico(
  rubrica: string,
  descricao?: string | null,
): ComportamentoCusto {
  const d = textoRubrica(rubrica, descricao);

  const fixo =
    /\b(aluguel|locacao|energia|eletrica|eletricidade|luz|agua|esgoto|gas|internet|banda[\s-]?larga|telefone|celular|telecom|condominio|iptu|ipva|seguro|folha(\s+de\s+pagamento)?|salarios?|remuneracao|holerite|pro[\s-]?labore|adiantamento\s+salarial|plano\s+(de\s+)?saude|vale[\s-]*(transporte|refeicao|alimentacao)|contabil(idade)?|software|assinatura|saas|hospedagem|dominio|limpeza|conservacao|seguranca|vigilancia|manutencao(\s+predial)?|contador|escritorio\s+contabil|impostos?|tributos?|encargos?(\s+sociais)?|simples\s+nacional|\bdas\b|darf|fgts|inss|pis|cofins|csll|irrf|irpj|\biss\b|\bicms\b|depreciacao|amortizacao|financiamento|emprestimo|leasing|anuidade)\b/.test(
      d,
    ) ||
    /\bterceir(o|a|izados?)(\s+fixo)?\b/.test(d) ||
    /\b(prestador|fornecedor|servico)\s+fixo\b/.test(d) ||
    /\bfixo\s+(mensal|terceir)/.test(d);

  if (fixo) return "fixo";

  const variavel =
    /\b(insumo|insumos|legume|legumes|folhosa|folhosas|hortifruti|horti[\s-]?fruti|hortalica|mudas?|sementes?|fertilizante|substrato|embalagen|embalagens|frete|transporte|combustivel|diesel|gasolina|comissao|comissoes|royalties?|materia[\s-]?prima|producao|colheita|lavagem|uso\s+e\s+consumo|lanches?|refeicoes?|marketing|propaganda|publicidade|brinde|amostra)\b/.test(
      d,
    );

  if (variavel) return "variavel";

  // Default conservador: variável (gastos tipicamente ligados à operação)
  return "variavel";
}

export function resolverComportamentoCusto(
  rubrica: string,
  override?: ComportamentoCusto | null,
  descricao?: string | null,
): ComportamentoCusto {
  if (override === "fixo" || override === "variavel") return override;
  return inferirComportamentoCustoHeuristico(rubrica, descricao);
}

export type RubricaComportamentoMeta = {
  rubrica: string;
  comportamentoCusto: ComportamentoCusto | null;
  nota?: string | null;
};

/** Mapa chave normalizada → override (null = usar heurística). */
export function mapaComportamentoPorRubrica(
  metas: RubricaComportamentoMeta[],
): Map<string, ComportamentoCusto | null> {
  const map = new Map<string, ComportamentoCusto | null>();
  for (const m of metas) {
    const k = normalizarChaveRubrica(m.rubrica);
    if (!k) continue;
    map.set(k, m.comportamentoCusto);
  }
  return map;
}

export function comportamentoDaRubrica(
  rubrica: string,
  mapa: Map<string, ComportamentoCusto | null> | null | undefined,
  descricao?: string | null,
): ComportamentoCusto {
  const k = normalizarChaveRubrica(rubrica);
  const override = k && mapa ? mapa.get(k) : undefined;
  return resolverComportamentoCusto(rubrica, override ?? null, descricao);
}
