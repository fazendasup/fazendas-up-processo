import type { ModuloContratavel } from "@shared/const";

/** Rotas que exigem módulo contratado (alinhado a `MODULOS_CONTRATAVEIS`). */
export const HREF_PARA_MODULO: Partial<Record<string, ModuloContratavel>> = {
  "/estoque": "estoque",
  "/automacao": "automacao",
  "/inteligencia": "inteligencia",
  "/visao": "visao_cultivo",
  "/custos-producao": "custos_producao",
  "/comercial": "comercial",
};

export type ModulosProjetoMap = Record<ModuloContratavel, boolean>;

export function navPermitidoPorModulo(
  href: string,
  modulos: ModulosProjetoMap | null,
): boolean {
  const m =
    HREF_PARA_MODULO[href] ??
    (href.startsWith("/comercial/") ? ("comercial" as const) : undefined);
  if (!m) return true;
  if (modulos == null) return false;
  return modulos[m];
}
