import axios from "axios";
import type { Env } from "../../env";
import { withRetry } from "../../lib/retry";
import { logger } from "../../lib/logger";

export type EnviarMensagemInput = {
  subscriberId: string;
  texto: string;
};

/**
 * Stub ManyChat — ajuste para o endpoint real da sua conta/bot.
 * Documentação: https://manychat.com/
 */
export async function enviarMensagemWhatsApp(env: Env, input: EnviarMensagemInput) {
  if (!env.MANYCHAT_API_KEY) {
    logger.warn("ManyChat: MANYCHAT_API_KEY ausente — simulando envio");
    return { ok: true as const, simulado: true, subscriberId: input.subscriberId };
  }

  return withRetry(
    async () => {
      const { data } = await axios.post(
        "https://api.manychat.com/fb/sending/sendContent",
        {
          subscriber_id: input.subscriberId,
          data: { version: "v2", content: { messages: [{ type: "text", text: input.texto }] } },
        },
        {
          headers: { Authorization: `Bearer ${env.MANYCHAT_API_KEY}` },
          timeout: 20_000,
        },
      );
      return { ok: true as const, simulado: false, data };
    },
    { tentativas: 3, delayMs: 400 },
  );
}
