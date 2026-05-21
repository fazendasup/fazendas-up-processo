export type ClassificacaoPedidoContaAzul = "venda" | "orcamento" | "cancelado" | "outro";

function normalizarStatus(status: string): string {
  return status
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Classifica pedidos sincronizados da Conta Azul (`situacao.nome` → `statusPedido`).
 * Orçamentos e vendas efetivadas entram em buckets distintos para o dashboard.
 */
export function classificarStatusPedido(status: string | null | undefined): ClassificacaoPedidoContaAzul {
  const s = normalizarStatus(status ?? "");
  if (!s || s === "sync") return "outro";

  if (/\bcancel|cancelad|estorn|recusad|rejeitad/.test(s)) return "cancelado";
  if (/\bem andamento\b/.test(s)) return "outro";

  if (
    /orcament|orcamento|budget|cotac|proposta|em elaboracao|em elaboração|aguardando aprovacao|aguardando aprovação/.test(
      s,
    )
  ) {
    return "orcamento";
  }

  if (
    /faturad|aprovad|venda realizada|venda efetivad|conclu|finaliz|entreg|pago|baixad|efetivad|confirmad/.test(
      s,
    )
  ) {
    return "venda";
  }

  return "outro";
}

export function pedidoContaVendaRealizada(status: string | null | undefined): boolean {
  return classificarStatusPedido(status) === "venda";
}

export function pedidoContaOrcamento(status: string | null | undefined): boolean {
  return classificarStatusPedido(status) === "orcamento";
}
