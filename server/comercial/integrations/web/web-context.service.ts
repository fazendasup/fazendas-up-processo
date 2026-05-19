import axios from "axios";
import type { Env } from "../../env";
import { logger } from "../../lib/logger";

export type ContextoWebResultado = {
  consulta: string;
  itens: Array<{ titulo: string; link: string; snippet?: string }>;
};

/**
 * Pesquisa web ética: prefira Google Custom Search API (ou similar) com chaves dedicadas.
 */
export async function pesquisarContextoPublico(env: Env, consulta: string): Promise<ContextoWebResultado> {
  if (!env.WEB_SEARCH_API_KEY || !env.WEB_SEARCH_ENGINE_ID) {
    logger.debug({ consulta }, "Web search: chaves ausentes — retornando vazio");
    return { consulta, itens: [] };
  }

  const url = "https://www.googleapis.com/customsearch/v1";
  const { data } = await axios.get(url, {
    params: {
      key: env.WEB_SEARCH_API_KEY,
      cx: env.WEB_SEARCH_ENGINE_ID,
      q: consulta,
    },
    timeout: 20_000,
  });

  const itens =
    data.items?.map((i: { title: string; link: string; snippet?: string }) => ({
      titulo: i.title,
      link: i.link,
      snippet: i.snippet,
    })) ?? [];

  return { consulta, itens };
}
