import { describe, expect, it } from "vitest";
import {
  baseCobrancaPedidoSite,
  formaPagamentoPreferidaDasObservacoes,
  garantirMarcadorPessoaObs,
  pedidoAguardandoAprovacaoSite,
  pedidoAprovadoPelaFazenda,
  pedidoSiteLiberadoNaOperacao,
  regraComercialEhFaturada,
  taxaEntregaDasObservacoes,
  MARCA_APROVADO_FAZENDA,
  MARCA_PAGAMENTO_FATURADO,
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

  it("insere marcador (pessoa) sem duplicar", () => {
    expect(garantirMarcadorPessoaObs("Pedido pelo site. Modalidade: entrega.")).toBe(
      "Pedido pelo site (pessoa). Modalidade: entrega.",
    );
    expect(garantirMarcadorPessoaObs("Pedido pelo site (pessoa). Já ok.")).toBe(
      "Pedido pelo site (pessoa). Já ok.",
    );
  });

  it("empresa aprovada libera operação; PF só após pagamento", () => {
    expect(
      pedidoSiteLiberadoNaOperacao({
        status: "PENDENTE",
        observacoes: `Pedido pelo site.\n${MARCA_APROVADO_FAZENDA}`,
      }),
    ).toBe(true);
    expect(
      pedidoSiteLiberadoNaOperacao({
        status: "PENDENTE",
        observacoes: `Pedido pelo site (pessoa).\n${MARCA_APROVADO_FAZENDA}\nAguardando pagamento.`,
      }),
    ).toBe(false);
    expect(
      pedidoSiteLiberadoNaOperacao({
        status: "PENDENTE",
        observacoes: `Pedido pelo site (pessoa).\n${MARCA_APROVADO_FAZENDA}\nPago via site. Liberado para produção.`,
      }),
    ).toBe(true);
  });

  it("detecta faturado pela regra (prazoBoletoDias > 0)", () => {
    expect(regraComercialEhFaturada(null)).toBe(false);
    expect(regraComercialEhFaturada({ prazoBoletoDias: null })).toBe(false);
    expect(regraComercialEhFaturada({ prazoBoletoDias: 0 })).toBe(false);
    expect(regraComercialEhFaturada({ prazoBoletoDias: 7 })).toBe(true);
  });

  it("faturado aprovado libera operação sem pagamento no site", () => {
    expect(
      pedidoSiteLiberadoNaOperacao({
        status: "PENDENTE",
        observacoes: `Pedido pelo site.\n${MARCA_APROVADO_FAZENDA}\n${MARCA_PAGAMENTO_FATURADO}`,
      }),
    ).toBe(true);
  });
});
