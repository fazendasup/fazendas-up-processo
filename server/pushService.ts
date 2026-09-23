import webpush from "web-push";
import { ENV } from "./_core/env";
import {
  countPushSubscriptionsForUser,
  deletePushSubscriptionById,
  getPushPreferencias,
  listAllSubscriptionUserIds,
  listPushSubscriptionsByUserIds,
  listUserIdsElegiveisProjeto,
  listUsersByIds,
  preferenciasFromRow,
} from "./pushDb";
import {
  categoriasPermitidasParaPerfil,
  usuarioRecebeCategoria,
  type PushCategoria,
  type PushPayload,
} from "@shared/pushNotificacoes";

let vapidConfigured = false;

function ensureVapid(): boolean {
  if (vapidConfigured) return true;
  const pub = ENV.vapidPublicKey;
  const priv = ENV.vapidPrivateKey;
  const subject = ENV.vapidSubject;
  if (!pub || !priv) return false;
  try {
    webpush.setVapidDetails(subject, pub, priv);
    vapidConfigured = true;
    return true;
  } catch (err) {
    console.warn("[push] Falha ao configurar VAPID", err);
    return false;
  }
}

export function pushHabilitadoNoServidor(): boolean {
  return Boolean(ENV.vapidPublicKey && ENV.vapidPrivateKey);
}

export function getVapidPublicKey(): string | null {
  return ENV.vapidPublicKey || null;
}

async function resolverPerfilComercial(
  user: { id: number; role: string; email: string | null },
): Promise<string | null> {
  if (user.role !== "comercial") return null;
  const email = user.email?.trim().toLowerCase();
  if (!email) return null;
  try {
    const { getComercialPrisma } = await import("./comercial/db");
    const cu = await getComercialPrisma().usuario.findFirst({
      where: { email, status: "ATIVO" },
      select: { perfil: true },
    });
    return cu?.perfil ?? null;
  } catch {
    return null;
  }
}

/**
 * Envia Web Push só para quem:
 * 1) tem subscription ativa
 * 2) o perfil permite a categoria
 * 3) a preferência do usuário está ligada
 * 4) (opcional) pertence ao projeto / é admin
 */
export async function enviarPushNotificacao(opts: {
  categoria: PushCategoria;
  titulo: string;
  corpo: string;
  url?: string;
  tag?: string;
  /** Se informado, restringe a membros do projeto (+ admins). */
  projetoId?: number | null;
  /** Se informado, restringe a estes userIds (ainda filtrados por perfil). */
  userIds?: number[];
}): Promise<{ enviados: number; ignorados: number; falhas: number }> {
  if (!ensureVapid()) {
    return { enviados: 0, ignorados: 0, falhas: 0 };
  }

  let candidateIds: number[];
  if (opts.userIds && opts.userIds.length > 0) {
    candidateIds = Array.from(new Set(opts.userIds));
  } else {
    const all = await listAllSubscriptionUserIds();
    const projetoFilter = await listUserIdsElegiveisProjeto(opts.projetoId);
    candidateIds =
      projetoFilter == null
        ? all
        : all.filter((id) => projetoFilter.includes(id));
  }

  if (candidateIds.length === 0) {
    return { enviados: 0, ignorados: 0, falhas: 0 };
  }

  const users = await listUsersByIds(candidateIds);
  const eligibleUserIds: number[] = [];

  for (const u of users) {
    const comercialPerfil = await resolverPerfilComercial(u);
    const prefRow = await getPushPreferencias(u.id);
    const permitidas = categoriasPermitidasParaPerfil({
      role: u.role,
      comercialPerfil,
    });
    const preferencias = preferenciasFromRow(prefRow, permitidas);
    if (
      usuarioRecebeCategoria({
        role: u.role,
        comercialPerfil,
        preferencias,
        categoria: opts.categoria,
      })
    ) {
      eligibleUserIds.push(u.id);
    }
  }

  if (eligibleUserIds.length === 0) {
    return { enviados: 0, ignorados: candidateIds.length, falhas: 0 };
  }

  const subs = await listPushSubscriptionsByUserIds(eligibleUserIds);
  const payload: PushPayload = {
    titulo: opts.titulo,
    corpo: opts.corpo,
    url: opts.url,
    categoria: opts.categoria,
    tag: opts.tag,
  };
  const body = JSON.stringify(payload);

  let enviados = 0;
  let falhas = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        body,
        { TTL: 60 * 60 * 12, urgency: "normal" },
      );
      enviados++;
    } catch (err: unknown) {
      falhas++;
      const status =
        err && typeof err === "object" && "statusCode" in err
          ? Number((err as { statusCode: number }).statusCode)
          : 0;
      if (status === 404 || status === 410) {
        await deletePushSubscriptionById(sub.id);
      } else {
        console.warn("[push] Falha ao enviar", {
          err,
          subscriptionId: sub.id,
          userId: sub.userId,
        });
      }
    }
  }

  return {
    enviados,
    ignorados: candidateIds.length - eligibleUserIds.length,
    falhas,
  };
}

/** Disparo fire-and-forget (não bloqueia a mutation). */
export function dispararPushNotificacao(
  opts: Parameters<typeof enviarPushNotificacao>[0],
): void {
  void enviarPushNotificacao(opts).catch((err) => {
    console.warn("[push] disparo assíncrono falhou", err);
  });
}

export async function statusPushParaUsuario(userId: number): Promise<{
  servidorHabilitado: boolean;
  vapidPublicKey: string | null;
  dispositivos: number;
}> {
  return {
    servidorHabilitado: pushHabilitadoNoServidor(),
    vapidPublicKey: getVapidPublicKey(),
    dispositivos: await countPushSubscriptionsForUser(userId),
  };
}
