import { describe, expect, it } from "vitest";
import { escolherCobrancaBoleto, descreverArquivoFiscal, janelasNota } from "./portalDocumentos";

describe("documentos do pagamento", () => {
  it("prefere o boleto autorizado e ignora cobrança cancelada", () => {
    expect(
      escolherCobrancaBoleto({
        idBoletoAutorizado: "35473eec-4e74-11ee-b500-9f61de8a8b8b",
        idUltimaCobranca: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        solicitacoes: [],
      }),
    ).toBe("35473eec-4e74-11ee-b500-9f61de8a8b8b");

    expect(
      escolherCobrancaBoleto({
        solicitacoes: [
          { id: "11111111-1111-4111-8111-111111111111", tipo: "BOLETO", status: "CANCELADO" },
          { id: "22222222-2222-4222-8222-222222222222", tipo: "PIX_COBRANCA", status: "REGISTRADO" },
          { id: "33333333-3333-4333-8333-333333333333", tipo: "BOLETO_REGISTRADO", status: "REGISTRADO" },
        ],
      }),
    ).toBe("33333333-3333-4333-8333-333333333333");
  });

  it("busca a nota em janelas de 14 dias", () => {
    const janelas = janelasNota("2026-10-11");
    expect(janelas.length).toBeGreaterThan(0);
    for (const janela of janelas) {
      const dias = (Date.parse(janela.data_final) - Date.parse(janela.data_inicial)) / 86_400_000;
      expect(dias).toBe(14);
    }
    expect(janelas.some((janela) => janela.data_inicial <= "2026-10-11" && janela.data_final >= "2026-10-11")).toBe(true);
  });

  it("reconhece pdf, zip e xml da nota", () => {
    expect(descreverArquivoFiscal(Buffer.from("%PDF-1.4"), "application/octet-stream", 12, "nota").nome).toBe("nota-12.pdf");
    expect(descreverArquivoFiscal(Buffer.from([0x50, 0x4b, 0x03, 0x04]), "application/octet-stream", 12, "nota").nome).toBe(
      "nota-12.zip",
    );
    expect(descreverArquivoFiscal(Buffer.from("<?xml version=\"1.0\"?>"), "application/xml", null, "nota").nome).toBe("nota.xml");
  });
});
