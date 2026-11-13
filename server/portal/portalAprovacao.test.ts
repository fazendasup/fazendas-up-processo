import { describe, expect, it } from "vitest";
import {
  baseCobrancaPedidoSite,
  formaPagamentoPreferidaDasObservacoes,
  pedidoAguardandoAprovacaoSite,
  pedidoAprovadoPelaFazenda,
  taxaEntregaDasObservacoes,
  MARCA_APROVADO_FAZENDA,
} from "./portalAprovacao";

describe("portalAprovacao", () => {
  it("detecta aguardando aprovação em pedido do site pendente", () => {
    expect(
      pedidoAguardandoAprovacaoSite({
        status: "PENDENTE",
        observacoes: "Pedido pelo site (pessoa). Aguardando aprovação da fazenda.",
      }),
    ).toBe(true);
  });

  it("não trata como aguardando se já aprovado", () => {
    expect(
      pedidoAguardandoAprovacaoSite({
        status: "PENDENTE",
        observacoes: `Pedido pelo site.\n${MARCA_APROVADO_FAZENDA}`,
      }),
    ).toBe(false);
    expect(pedidoAprovadoPelaFazenda(`Pedido pelo site.\n${MARCA_APROVADO_FAZENDA}`)).toBe(true);
  });

  it("PF legado com cobrança não fica preso em aguardando aprovação", () => {
    expect(
      pedidoAguardandoAprovacaoSite({
        status: "PENDENTE",
        observacoes: "Pedido pelo site (pessoa). Aguardando pagamento.",
        temPagamentoAguardandoOuPago: true,
      }),
    ).toBe(false);
  });

  it("lê taxa de entrega e forma preferida das observações", () => {
    const obs = [
      "Pedido pelo site (pessoa).",
      "Modalidade: entrega com taxa de R$ 20,00 (pedido abaixo de R$ 300,00).",
      "Pagamento: Pix",
    ].join("\n");
    expect(taxaEntregaDasObservacoes(obs)).toBe(20);
    expect(formaPagamentoPreferidaDasObservacoes(obs)).toBe("pix");
    expect(
      baseCobrancaPedidoSite({
        observacoes: obs,
        itens: [{ precoUnit: "10", quantidade: "2" }],
      }),
    ).toBe(40);
  });
});
