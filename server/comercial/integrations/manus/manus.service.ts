import axios from "axios";
import type { Env } from "../../env";
import { logger } from "../../lib/logger";

export type ManusResposta<T> = { ok: true; data: T } | { ok: false; fallback: T };

async function chamarManus<T>(env: Env, path: string, body: unknown, fallback: T): Promise<ManusResposta<T>> {
  if (!env.MANUS_API_URL || !env.MANUS_API_KEY) {
    return { ok: false, fallback };
  }

  try {
    const { data } = await axios.post<T>(`${env.MANUS_API_URL.replace(/\/$/, "")}${path}`, body, {
      headers: { authorization: `Bearer ${env.MANUS_API_KEY}`, "content-type": "application/json" },
      timeout: 45_000,
    });
    return { ok: true, data };
  } catch (e) {
    logger.warn({ err: e }, "Manus indisponível — usando fallback local");
    return { ok: false, fallback };
  }
}

export async function manusResumirConversa(env: Env, textoBruto: string) {
  const fallback = textoBruto.length > 280 ? `${textoBruto.slice(0, 280)}…` : textoBruto;
  return chamarManus<{ resumo: string }>(env, "/resumir", { texto: textoBruto }, { resumo: fallback });
}

export async function manusSugestaoCriativa(
  env: Env,
  input: { objetivo: string; contexto?: Record<string, unknown> },
) {
  const fallback = {
    sugestao:
      "Sugestão indisponível (Manus não configurado). Use um template aprovado em /configuracoes e personalize com dados do cliente.",
  };
  return chamarManus<{ sugestao: string }>(env, "/sugerir", input, fallback);
}

export async function manusAjusteScoreQualitativo(
  env: Env,
  input: { scoreBase: number; sinais: string },
) {
  const fallback = { scoreAjustado: input.scoreBase, notas: "Sem ajuste qualitativo (Manus off)" };
  return chamarManus<{ scoreAjustado: number; notas: string }>(env, "/score", input, fallback);
}
