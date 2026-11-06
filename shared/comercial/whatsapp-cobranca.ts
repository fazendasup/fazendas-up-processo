/**
 * Link wa.me com mensagem pronta (sem API paga).
 * Abre o WhatsApp Web/app já logado; o usuário só confirma o envio.
 */

export type TituloCobrancaMsg = {
  descricao: string;
  dataVencimento?: string | null;
  valorAberto: number;
};

/** Só dígitos; BR com DDI 55 quando faltar. */
export function normalizarTelefoneWhatsapp(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, "");
  if (!digits) return null;
  // remove zero à esquerda de DDD antigo (0XX…)
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10 || digits.length === 11) {
    digits = `55${digits}`;
  }
  // BR: 55 + DDD(2) + número(8 ou 9) = 12 ou 13 dígitos
  if (digits.length < 12 || digits.length > 13) return null;
  if (!digits.startsWith("55")) return null;
  return digits;
}

function fmtMoneyBr(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDataBr(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function montarMensagemInadimplencia(input: {
  clienteNome: string;
  valorEmAberto: number;
  quantidadeTitulos: number;
  titulos?: TituloCobrancaMsg[];
  remetente?: string;
}): string {
  const nome = input.clienteNome.trim() || "cliente";
  const remetente = (input.remetente ?? "Fazendas Up").trim();
  const linhas: string[] = [
    `Olá, ${nome}!`,
    "",
    input.quantidadeTitulos <= 1
      ? `Identificamos um título em atraso no valor de ${fmtMoneyBr(input.valorEmAberto)}.`
      : `Identificamos ${input.quantidadeTitulos} títulos em atraso, totalizando ${fmtMoneyBr(input.valorEmAberto)}.`,
  ];

  const titulos = (input.titulos ?? []).filter(t => t.valorAberto > 0.009);
  if (titulos.length > 0) {
    linhas.push("", "Detalhes:");
    for (const t of titulos.slice(0, 8)) {
      linhas.push(
        `• ${t.descricao} — venc. ${fmtDataBr(t.dataVencimento)} — ${fmtMoneyBr(t.valorAberto)}`,
      );
    }
    if (titulos.length > 8) {
      linhas.push(`• … e mais ${titulos.length - 8} título(s)`);
    }
  }

  linhas.push(
    "",
    "Pedimos a gentileza de regularizar o pagamento o quanto antes.",
    "Se já tiver quitado ou houver alguma dúvida, responda esta mensagem.",
    "",
    `Atenciosamente,`,
    remetente,
  );

  return linhas.join("\n");
}

/** URL https://wa.me/55…?text=… */
export function urlWhatsappMensagem(
  telefoneE164Digits: string,
  mensagem: string,
): string {
  const phone = telefoneE164Digits.replace(/\D/g, "");
  const text = encodeURIComponent(mensagem);
  return `https://wa.me/${phone}?text=${text}`;
}

export function abrirWhatsappCobranca(input: {
  telefone: string | null | undefined;
  clienteNome: string;
  valorEmAberto: number;
  quantidadeTitulos: number;
  titulos?: TituloCobrancaMsg[];
  remetente?: string;
}): { ok: true; url: string } | { ok: false; erro: string } {
  const phone = normalizarTelefoneWhatsapp(input.telefone);
  if (!phone) {
    return {
      ok: false,
      erro:
        "Cliente sem telefone WhatsApp válido. Atualize o telefone no cadastro (ou sincronize o Conta Azul) e tente de novo.",
    };
  }
  if (input.valorEmAberto <= 0.009 && input.quantidadeTitulos <= 0) {
    return { ok: false, erro: "Não há valor em atraso para montar a cobrança." };
  }
  const mensagem = montarMensagemInadimplencia(input);
  return { ok: true, url: urlWhatsappMensagem(phone, mensagem) };
}
