import { describe, expect, it } from "vitest";
import {
  montarMensagemInadimplencia,
  normalizarTelefoneWhatsapp,
  urlWhatsappMensagem,
} from "./whatsapp-cobranca";

describe("normalizarTelefoneWhatsapp", () => {
  it("aceita celular BR com máscara", () => {
    expect(normalizarTelefoneWhatsapp("(11) 98888-7777")).toBe("5511988887777");
  });

  it("aceita já com DDI", () => {
    expect(normalizarTelefoneWhatsapp("+55 21 3333-4444")).toBe("552133334444");
  });

  it("rejeita inválido", () => {
    expect(normalizarTelefoneWhatsapp("123")).toBeNull();
    expect(normalizarTelefoneWhatsapp(null)).toBeNull();
  });
});

describe("mensagem e url", () => {
  it("monta texto leve com pedido de regularização, venda, data e NF", () => {
    const msg = montarMensagemInadimplencia({
      clienteNome: "Mercado Teste",
      valorEmAberto: 150.5,
      quantidadeTitulos: 1,
      titulos: [
        {
          descricao: "Venda hortifruti",
          dataVenda: "2026-09-28",
          dataVencimento: "2026-10-01",
          numeroVenda: "4521",
          numeroNf: "8899",
          tipoNf: "NFE",
          valorAberto: 150.5,
        },
      ],
    });
    expect(msg).toContain("Mercado Teste");
    expect(msg).toContain("Tudo bem?");
    expect(msg).toContain("próximos pedidos e envios");
    expect(msg).toContain("Venda hortifruti");
    expect(msg).toContain("nº venda 4521");
    expect(msg).toContain("28/09/2026");
    expect(msg).toContain("NF 8899 (NFE)");
    expect(msg).toContain("01/10/2026");
    expect(msg.toLowerCase()).not.toContain("⚠️");
    const url = urlWhatsappMensagem("5511988887777", msg);
    expect(url.startsWith("https://wa.me/5511988887777?text=")).toBe(true);
  });
});
