import axios from "axios";
import type { Env } from "../../env";
import { logger } from "../../lib/logger";

export type InstagramPerfilPublico = {
  handle: string;
  seguidores?: number;
  postsRecentes?: number;
  bio?: string;
};

/**
 * Leitura conservadora: prefira Graph API com token de app.
 * Sem token, retorna stub para não bloquear o desenvolvimento.
 */
export async function obterPerfilInstagram(env: Env, handle: string): Promise<InstagramPerfilPublico> {
  if (!env.INSTAGRAM_ACCESS_TOKEN) {
    logger.debug({ handle }, "Instagram: token ausente — retornando stub");
    return { handle, seguidores: undefined, postsRecentes: undefined, bio: undefined };
  }

  const url = `https://graph.instagram.com/v21.0/${encodeURIComponent(handle)}`;
  const { data } = await axios.get(url, {
    params: { access_token: env.INSTAGRAM_ACCESS_TOKEN, fields: "username,followers_count,biography" },
    timeout: 15_000,
  });

  return {
    handle,
    seguidores: data.followers_count,
    bio: data.biography,
  };
}
