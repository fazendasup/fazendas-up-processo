/**
 * Mudas da fazenda vertical em bandejas (4 torres × 6 andares).
 * A torre de mudas que já existia vira microverdes e o histórico fica na mesma torre.
 */

export const TORRES_MUDAS_BANDEJA = 4;
export const ANDARES_TORRE_MUDAS_BANDEJA = 6;
export const BANDEJAS_POR_ANDAR_MUDAS = 4;
/** Células da bandeja quando o operador não informa outro número. */
export const CELULAS_PADRAO_BANDEJA_MUDAS = 345;

export function slugTorreMudasBandeja(indice: number): string {
  return `mudas-b-${indice}`;
}

export function torreEhMudasBandeja(torre: {
  fase: string;
  cultivo?: string | null;
  estruturaOverride?: { mudas?: { perfis?: number; furosPorPerfil?: number } } | null;
}): boolean {
  if (torre.fase !== "mudas" || torre.cultivo === "microverdes") return false;
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
