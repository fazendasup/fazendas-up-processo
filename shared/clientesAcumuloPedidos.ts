/**
 * Clientes autorizados a usar faturamento acumulado (`acumulaPedidos`).
 * Demais regras devem permanecer com a flag desligada.
 *
 * Padoca: paga antecipado na teoria — acumulo só importa se houver várias
 * entregas operacionais ligadas a um orçamento/venda CA; pagamento antecipado
 * em si não muda a conciliação. Mantido na lista a pedido operacional.
 */
const PADROES_ACUMULO_PERMITIDO: RegExp[] = [
  /\blicco\b/i,
  /\bspoleto\b/i,
  /\bmarinara\b/i,
  /\bnovotel\b/i,
  /\bpadoca\b/i,
];

export function normalizarNomeClienteAcumulo(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Retorna true se o nome do cliente está na allowlist de acumulo. */
export function clientePodeAcumularPedidos(nome: string | null | undefined): boolean {
  if (!nome?.trim()) return false;
  const n = normalizarNomeClienteAcumulo(nome);
  return PADROES_ACUMULO_PERMITIDO.some((re) => re.test(n));
}

export const CLIENTES_ACUMULO_ALLOWLIST_LABELS = [
  "Licco",
  "Spoleto",
  "Marinara",
  "Ibis Novotel",
  "Padoca",
] as const;

/**
 * Clientes que faturam o mês antecipado: a venda Conta Azul sai no início do
 * período e as entregas acontecem depois, validadas por orçamentos diários
 * (cautela). Para eles, entregar menos que a venda no meio do mês é o fluxo
 * normal — divergência real é só quando as entregas EXCEDEM a venda.
 */
const PADROES_FATURAMENTO_ANTECIPADO: RegExp[] = [/\bpadoca\b/i];

export function clienteFaturaMesAntecipado(nome: string | null | undefined): boolean {
  if (!nome?.trim()) return false;
  const n = normalizarNomeClienteAcumulo(nome);
  return PADROES_FATURAMENTO_ANTECIPADO.some((re) => re.test(n));
}
