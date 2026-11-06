/**
 * Link wa.me com mensagem pronta (sem API paga).
 * Abre o WhatsApp Web/app já logado; o usuário só confirma o envio.
 */

export type TituloCobrancaMsg = {
  /** Nome/descrição da venda no Conta Azul */
  descricao: string;
  /** Data da venda / competência */
  dataVenda?: string | null;
  dataVencimento?: string | null;
  /** Número da NF (quando disponível no Conta Azul) */
  numeroNf?: string | null;
  tipoNf?: string | null;
  /** Nº da venda / código de referência */
  numeroVenda?: string | null;
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

function rotuloNf(t: TituloCobrancaMsg): string {
  if (!t.numeroNf) return "não informada no Conta Azul";
  const tipo = t.tipoNf ? ` (${t.tipoNf})` : "";
  return `${t.numeroNf}${tipo}`;
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
    `Olá, ${nome}! Tudo bem?`,
    "",
    "Passando para alinhar um pontinho financeiro conosco 🙂",
    input.quantidadeTitulos <= 1
      ? `Temos 1 título em aberto no valor de ${fmtMoneyBr(input.valorEmAberto)}.`
      : `Temos ${input.quantidadeTitulos} títulos em aberto, somando ${fmtMoneyBr(input.valorEmAberto)}.`,
    "",
    "Para conseguirmos seguir com os próximos pedidos e envios com tranquilidade, pedimos a gentileza de regularizar esses valores.",
  ];

  const titulos = (input.titulos ?? []).filter(t => t.valorAberto > 0.009);
  if (titulos.length > 0) {
    linhas.push("", "Segue o detalhe para facilitar:");
    titulos.slice(0, 8).forEach((t, i) => {
      const dataRef = t.dataVenda || t.dataVencimento;
      const partes = [
        `${i + 1}) ${t.descricao}`,
        t.numeroVenda ? `nº venda ${t.numeroVenda}` : null,
        `data ${fmtDataBr(dataRef)}`,
        `NF ${rotuloNf(t)}`,
        `venc. ${fmtDataBr(t.dataVencimento)}`,
        fmtMoneyBr(t.valorAberto),
      ].filter(Boolean);
      linhas.push(partes.join(" · "));
    });
    if (titulos.length > 8) {
      linhas.push(`(+ ${titulos.length - 8} outro(s) título(s))`);
    }
  }

  linhas.push(
    "",
    "Assim que estiver em dia, seguimos normalmente com as próximas entregas.",
    "Se já tiver pago, é só nos mandar o comprovante por aqui que a gente confere e libera.",
    "",
    "Qualquer dúvida, estamos à disposição.",
    "",
    "Abraço,",
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
