/**
 * Broto e Microverdes (ex.: "Beterraba / Broto 30g" e "Beterraba / Microverdes 30g")
 * são o mesmo pote — unificamos nome e reserva na operação.
 */

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const SUFIXO_POTE =
  /^(.+?)\s*\/\s*(broto|microverdes?)\b/i;

/** Nome base do pote ("Beterraba") ou null se não for variante Broto/Microverdes. */
export function nomeBasePoteMicroverde(nome: string): string | null {
  const m = nome.trim().match(SUFIXO_POTE);
  if (!m?.[1]) return null;
  return m[1].replace(/\s+/g, " ").trim();
}

/** Chave estável para agrupar Broto + Microverdes do mesmo pote. */
export function chavePoteMicroverde(nome: string): string | null {
  const base = nomeBasePoteMicroverde(nome);
  return base ? normalizar(base) : null;
}

export function isVarianteBroto(nome: string): boolean {
  return /\/\s*broto\b/i.test(nome);
}

export function isVarianteMicroverdesNome(nome: string): boolean {
  return /\/\s*microverdes?\b/i.test(nome);
}
