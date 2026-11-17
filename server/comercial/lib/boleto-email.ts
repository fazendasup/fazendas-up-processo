import type { AxiosInstance } from "axios";
import type { Env } from "../env";
import { contaAzulGetBytes } from "../integrations/conta-azul/conta-azul.client";
import { logger } from "./logger";
import { sendMail } from "./mail";

export type ResultadoEmailBoleto =
  | { enviado: true; destinatario: string }
  | { enviado: false; motivo: string };

function emailValido(v: string | null | undefined): string | null {
  const e = String(v ?? "").trim();
  if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return null;
  return e;
}

/**
 * Envia o boleto ao cliente (SMTP FUP).
 * A API Conta Azul não dispara e-mail ao gerar cobrança — por isso fazemos aqui.
 */
export async function enviarBoletoClientePorEmail(params: {
  env: Env;
  http: AxiosInstance;
  cobrancaId: string;
  boletoUrl: string | null;
  emailCliente: string | null | undefined;
  nomeCliente: string;
  numeroVenda?: string | null;
  dataVencimento?: string | null;
}): Promise<ResultadoEmailBoleto> {
  const destinatario = emailValido(params.emailCliente);
  if (!destinatario) {
    return {
      enviado: false,
      motivo: "Cliente sem e-mail principal válido no cadastro FUP/Conta Azul.",
    };
  }

  const numero = params.numeroVenda?.trim() || "—";
  const venc = params.dataVencimento?.trim() || "conforme boleto";
  const link = params.boletoUrl?.trim() || null;

  let pdf: Buffer | null = null;
  try {
    const bytes = await contaAzulGetBytes(
      params.http,
      `/v1/financeiro/eventos-financeiros/contas-a-receber/cobranca/${encodeURIComponent(params.cobrancaId)}/imprimir`,
    );
    if (bytes.status >= 200 && bytes.status < 300 && bytes.data.length > 100) {
      pdf = bytes.data;
    }
  } catch (err) {
    logger.warn(
      { err, cobrancaId: params.cobrancaId },
      "Não foi possível baixar PDF do boleto para o e-mail",
    );
  }

  const assunto = `Boleto Fazendas Up — venda ${numero}`;
  const texto = [
    `Olá, ${params.nomeCliente}!`,
    "",
    `Segue o boleto da venda ${numero} (Fazendas Up).`,
    `Vencimento: ${venc}.`,
    link ? `Link da cobrança: ${link}` : "O PDF do boleto segue em anexo (quando disponível).",
    "",
    "Qualquer dúvida, responda este e-mail ou fale com nosso comercial.",
    "",
    "Fazendas Up",
  ].join("\n");

  const html = `
    <p>Olá, <strong>${escapeHtml(params.nomeCliente)}</strong>!</p>
    <p>Segue o boleto da venda <strong>${escapeHtml(numero)}</strong> (Fazendas Up).</p>
    <p>Vencimento: <strong>${escapeHtml(venc)}</strong>.</p>
    ${
      link
        ? `<p><a href="${escapeHtml(link)}" target="_blank" rel="noopener">Abrir cobrança / boleto</a></p>`
        : "<p>O PDF do boleto segue em anexo (quando disponível).</p>"
    }
    <p>Qualquer dúvida, responda este e-mail ou fale com nosso comercial.</p>
    <p>Fazendas Up</p>
  `.trim();

  try {
    const r = await sendMail(params.env, destinatario, assunto, texto, {
      html,
      attachments: pdf
        ? [
            {
              filename: `boleto-venda-${numero.replace(/[^\w.-]+/g, "_")}.pdf`,
              content: pdf,
              contentType: "application/pdf",
            },
          ]
        : undefined,
    });
    if (!r.enviado) {
      return {
        enviado: false,
        motivo:
          r.motivo === "smtp_disabled"
            ? "SMTP não configurado no servidor (SMTP_HOST / MAIL_FROM)."
            : "E-mail não enviado.",
      };
    }
    return { enviado: true, destinatario };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn({ err, destinatario, cobrancaId: params.cobrancaId }, "Falha ao enviar boleto por e-mail");
    return { enviado: false, motivo: msg };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
