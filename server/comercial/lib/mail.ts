import nodemailer from "nodemailer";
import type { Env } from "./env";
import { logger } from "./logger";

export async function sendMail(
  env: Env,
  destinatario: string,
  assunto: string,
  texto: string,
) {
  if (!env.SMTP_HOST || !env.MAIL_FROM) {
    logger.debug({ destinatario, assunto }, "E-mail não enviado (SMTP não configurado)");
    return { enviado: false, motivo: "smtp_disabled" as const };
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    secure: false,
    auth:
      env.SMTP_USER && env.SMTP_PASS
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
        : undefined,
  });

  await transporter.sendMail({
    from: env.MAIL_FROM,
    to: destinatario,
    subject: assunto,
    text: texto,
  });

  return { enviado: true as const };
}
