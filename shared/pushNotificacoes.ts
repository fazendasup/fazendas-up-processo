/**
 * Web Push — categorias e matriz por perfil.
 *
 * O usuário só pode ativar categorias permitidas ao seu papel
 * (`users.role` + perfil comercial). Preferências do aparelho
 * são a interseção disso com o que ele ligou nas configurações.
 */

export const PUSH_CATEGORIAS = [
  "operacional",
  "estoque",
  "comercial",
  "logistica",
  "financeiro",
  "terceiros",
] as const;

export type PushCategoria = (typeof PUSH_CATEGORIAS)[number];

export const PUSH_CATEGORIA_LABEL: Record<PushCategoria, string> = {
  operacional: "Operação (tarefas e alertas)",
  estoque: "Estoque",
  comercial: "Comercial (pedidos e avarias)",
  logistica: "Logística e entregas",
  financeiro: "Financeiro",
  terceiros: "Terceiros / diaristas",
};

export const PUSH_CATEGORIA_DESCRICAO: Record<PushCategoria, string> = {
  operacional: "Tarefas do dia, alertas de cultivo e manutenções.",
  estoque: "Itens baixos, esgotamento e compras sugeridas.",
  comercial: "Pedidos, avarias e varejo.",
  logistica: "Roteiros e entregas.",
  financeiro: "Vencimentos e alertas do CFO.",
  terceiros: "Novos registros de horas e pendências de pagamento.",
};

export type PreferenciasPush = {
  /** Master: se false, nenhuma notificação é enviada a este usuário. */
  ativo: boolean;
  categorias: Partial<Record<PushCategoria, boolean>>;
};

export function preferenciasPushPadrao(
  permitidas: readonly PushCategoria[],
): PreferenciasPush {
  const categorias: Partial<Record<PushCategoria, boolean>> = {};
  for (const c of permitidas) categorias[c] = true;
  return { ativo: true, categorias };
}

/** Categorias que o perfil pode receber (antes das preferências do usuário). */
export function categoriasPermitidasParaPerfil(opts: {
  role: string | null | undefined;
  comercialPerfil?: string | null;
}): PushCategoria[] {
  const role = opts.role ?? "";
  if (role === "visitante") return [];

  if (role === "admin" || role === "platform_admin") {
    return [...PUSH_CATEGORIAS];
  }

  if (role === "user") {
    return ["operacional"];
  }

  if (role === "comercial") {
    const p = (opts.comercialPerfil ?? "").toUpperCase();
    if (p === "FINANCEIRO") return ["financeiro", "terceiros"];
    if (p === "LOGISTICA") return ["logistica"];
    if (p === "PROMOTER" || p === "VENDEDOR") return ["comercial"];
    if (p === "LIDER_COLHEITA") return ["comercial", "operacional"];
    if (
      p === "OPERACOES" ||
      p === "COMERCIAL" ||
      p === "GERENTE_COMERCIAL" ||
      p === "ADMIN"
    ) {
      return ["operacional", "estoque", "comercial", "logistica", "financeiro"];
    }
    return ["comercial"];
  }

  return [];
}

/**
 * Resolve se o usuário deve receber a categoria:
 * permitida pelo perfil ∩ preferência ligada (default true se omitida).
 */
export function usuarioRecebeCategoria(opts: {
  role: string | null | undefined;
  comercialPerfil?: string | null;
  preferencias?: PreferenciasPush | null;
  categoria: PushCategoria;
}): boolean {
  const permitidas = categoriasPermitidasParaPerfil(opts);
  if (!permitidas.includes(opts.categoria)) return false;
  const pref = opts.preferencias;
  if (pref && pref.ativo === false) return false;
  if (pref?.categorias && opts.categoria in pref.categorias) {
    return pref.categorias[opts.categoria] === true;
  }
  return true;
}

export function normalizarPreferenciasPush(
  raw: unknown,
  permitidas: readonly PushCategoria[],
): PreferenciasPush {
  const base = preferenciasPushPadrao(permitidas);
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Record<string, unknown>;
  const ativo = obj.ativo === false ? false : true;
  const catsRaw =
    obj.categorias && typeof obj.categorias === "object"
      ? (obj.categorias as Record<string, unknown>)
      : {};
  const categorias: Partial<Record<PushCategoria, boolean>> = {};
  for (const c of permitidas) {
    categorias[c] = catsRaw[c] === false ? false : true;
  }
  return { ativo, categorias };
}

export type PushPayload = {
  titulo: string;
  corpo: string;
  url?: string;
  categoria: PushCategoria;
  tag?: string;
};
