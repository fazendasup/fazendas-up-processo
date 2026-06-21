export function precoVendaMedio(receitaTotal: number, quantidade: number): number | null {
  if (!Number.isFinite(receitaTotal) || !Number.isFinite(quantidade)) return null;
  if (receitaTotal <= 0 || quantidade <= 0) return null;
  return Math.round((receitaTotal / quantidade) * 100) / 100;
}
