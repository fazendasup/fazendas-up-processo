/**
 * Copia padrão da ficha Coentro / Restaurante para os SKUs listados (exceto preço de venda).
 * Uso: pnpm custos:copiar-padrao-coentro
 */
import "dotenv/config";
import {
  COPIA_PADRAO_COENTRO_DESTINOS,
  COPIA_PADRAO_COENTRO_ORIGEM,
  copiarPadraoFichaCustos,
} from "./custosProdutoCopiarPadrao";

async function main() {
  const r = await copiarPadraoFichaCustos(COPIA_PADRAO_COENTRO_ORIGEM, COPIA_PADRAO_COENTRO_DESTINOS);
  console.log(JSON.stringify({ ok: r.erros.length === 0, ...r }, null, 2));
  if (r.erros.length > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
