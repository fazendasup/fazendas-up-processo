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
  it("monta texto e link wa.me", () => {
    const msg = montarMensagemInadimplencia({
      clienteNome: "Mercado Teste",
      valorEmAberto: 150.5,
      quantidadeTitulos: 1,
      titulos: [
        {
          descricao: "Venda 123",
          dataVencimento: "2026-10-01",
          valorAberto: 150.5,
        },
      ],
    });
    expect(msg).toContain("Mercado Teste");
    expect(msg).toContain("R$");
    expect(msg).toContain("01/10/2026");
    const url = urlWhatsappMensagem("5511988887777", msg);
    expect(url.startsWith("https://wa.me/5511988887777?text=")).toBe(true);
  });
});
