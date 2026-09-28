const FORA_DO_AR =
  "A Conta Azul está fora do ar agora. Espere um minuto e clique em Atualizar.";
const LIMITE =
  "A Conta Azul limitou as consultas. Espere um minuto e atualize de novo.";

function parecePaginaDeErro(texto: string): boolean {
  return /<\s*html|edgesuite|an error occurred while processing your request/i.test(
    texto,
  );
}

function textoLimpo(texto: string): string {
  const limpo = texto
    .replace(/<[^>]*>/g, " ")
    .replace(/&#?\w+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!limpo) return "Falha ao consultar a Conta Azul.";
  return limpo.length > 240 ? `${limpo.slice(0, 237)}…` : limpo;
}

/** Mensagem para o usuário a partir do HTTP da Conta Azul, sem HTML da CDN. */
export function detalheHttpContaAzul(
  status: number | undefined,
  body: string | undefined,
  fallback: string,
): string {
  const bruto = (body ?? fallback ?? "").trim();
  if (status === 429) return LIMITE;
  if (
    status === 502 ||
    status === 503 ||
    status === 504 ||
    parecePaginaDeErro(bruto)
  ) {
    return FORA_DO_AR;
  }
  const limpo = textoLimpo(bruto);
  if (status != null && status >= 400) return `Conta Azul (${status}): ${limpo}`;
  return limpo;
}

/** Limpa uma mensagem já montada (tela, toast) se ainda vier com HTML. */
export function textoErroContaAzul(message: string): string {
  const m = (message ?? "").trim();
  if (!m) return "Não foi possível consultar a Conta Azul.";
  if (m === FORA_DO_AR || m === LIMITE) return m;
  if (parecePaginaDeErro(m) || /Conta Azul \(50[234]\)/.test(m)) return FORA_DO_AR;
  if (/Conta Azul \(429\)|limite excedido|Muitas requisições/i.test(m)) return LIMITE;
  return textoLimpo(m);
}
