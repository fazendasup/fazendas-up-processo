/**
 * Mudas da fazenda vertical em bandejas (4 torres × 6 andares).
 * A torre de mudas que já existia vira microverdes e o histórico fica na mesma torre.
 * Torres de mudas operacionais compartilham uma única caixa d'água.
 */

export const TORRES_MUDAS_BANDEJA = 4;
export const ANDARES_TORRE_MUDAS_BANDEJA = 6;
export const BANDEJAS_POR_ANDAR_MUDAS = 4;
/** Células da bandeja quando o operador não informa outro número. */
export const CELULAS_PADRAO_BANDEJA_MUDAS = 345;

/** Slug canônico da caixa compartilhada de mudas (FV). */
export const SLUG_CAIXA_MUDAS_COMPARTILHADA = "ca-mudas-compartilhada";
export const NOME_CAIXA_MUDAS_COMPARTILHADA = "Caixa Mudas";

export function slugTorreMudasBandeja(indice: number): string {
  return `mudas-b-${indice}`;
}

/** Torres FV com cultivo microverdes: sem aplicação programada (só registro manual). */
export function torreEhMicroverdesCultivo(torre: { cultivo?: string | null }): boolean {
  return torre.cultivo === "microverdes";
}

/** Mudas operacionais (exclui torres convertidas para microverdes). */
export function torreEhMudasOperacional(torre: {
  fase: string;
  cultivo?: string | null;
}): boolean {
  return torre.fase === "mudas" && !torreEhMicroverdesCultivo(torre);
}

export function torreEhMudasBandeja(torre: {
  fase: string;
  cultivo?: string | null;
  estruturaOverride?: { mudas?: { perfis?: number; furosPorPerfil?: number } } | null;
}): boolean {
  if (!torreEhMudasOperacional(torre)) return false;
  const mudas = torre.estruturaOverride?.mudas;
  return mudas != null && (mudas.furosPorPerfil ?? 0) === 0 && (mudas.perfis ?? 0) > 0;
}

/** Só as torres de mudas que já existiam antes das bandejas. Não mexe nas torres novas. */
export function torreMudasViraMicroverdes(
  torre: { fase: string; slug: string; cultivo?: string | null },
  jaExistemTorresBandeja: boolean,
): boolean {
  if (jaExistemTorresBandeja) return false;
  if (torre.fase !== "mudas") return false;
  if (torre.cultivo === "microverdes") return false;
  if (/^mudas-b-\d+$/.test(torre.slug)) return false;
  return true;
}

export function nomeTorreComoMicroverdes(nome: string): string {
  if (/microverdes/i.test(nome)) return nome;
  const trocado = nome
    .replace(/\bTorre\s+Mudas\b/gi, "Torre Microverdes")
    .replace(/\bMudas\b/gi, "Microverdes");
  return trocado === nome ? `${nome} · Microverdes` : trocado;
}

/**
 * Caixa entra na programação de ciclos se tiver ao menos uma torre operacional
 * (não só cultivo=microverdes) e, em mudas, for a caixa compartilhada escolhida.
 */
export function caixaElegivelProgramacao(
  caixa: { id: string; fase: string },
  torres: Array<{ caixaAguaId?: string | null; fase: string; cultivo?: string | null }>,
  caixaMudasCompartilhadaId?: string | null,
): boolean {
  const ligadas = torres.filter((t) => t.caixaAguaId === caixa.id);
  if (ligadas.length === 0) return false;
  if (ligadas.every((t) => torreEhMicroverdesCultivo(t))) return false;
  if (caixa.fase === "mudas") {
    if (!ligadas.some((t) => torreEhMudasOperacional(t))) return false;
    if (caixaMudasCompartilhadaId && caixa.id !== caixaMudasCompartilhadaId) return false;
  }
  return true;
}

/** Id da caixa de mudas com mais torres operacionais ligadas. */
export function idCaixaMudasCompartilhada(
  torres: Array<{ caixaAguaId?: string | null; fase: string; cultivo?: string | null }>,
): string | null {
  const contagem = new Map<string, number>();
  for (const t of torres) {
    if (!torreEhMudasOperacional(t) || !t.caixaAguaId) continue;
    contagem.set(t.caixaAguaId, (contagem.get(t.caixaAguaId) ?? 0) + 1);
  }
  let melhor: string | null = null;
  let melhorN = -1;
  for (const [id, n] of contagem) {
    if (n > melhorN) {
      melhorN = n;
      melhor = id;
    }
  }
  return melhor;
}
