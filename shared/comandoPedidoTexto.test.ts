import { describe, expect, it } from "vitest";
import {
  draftTextoProntoParaSalvar,
  extrairDataDaFrase,
  interpretarComandoPedidoTexto,
  proximaDataDoDiaSemana,
} from "./comandoPedidoTexto";

describe("extrairDataDaFrase", () => {
  it("resolve quarta a partir de uma segunda", () => {
    const ref = new Date(2026, 10, 16); // seg 16/11/2026
    expect(extrairDataDaFrase("para quarta feira", ref)).toBe("2026-11-18");
    expect(proximaDataDoDiaSemana(3, ref)).toBe("2026-11-18");
  });

  it("resolve amanha", () => {
    const ref = new Date(2026, 10, 16);
    expect(extrairDataDaFrase("amanha 10 alfaces", ref)).toBe("2026-11-17");
  });
});

describe("interpretarComandoPedidoTexto", () => {
  const clientes = [
    { externalId: "sp", nome: "Spoleto Manaus", cnpjCpf: null },
    { externalId: "ot", nome: "Outro Mercado", cnpjCpf: null },
  ];
  const produtos = [
    { id: "m1", nome: "Manjericão Baby", sku: "MANJE1" },
    { id: "a1", nome: "Alface Crespa", sku: "ALFAC12" },
  ];

  it("interpreta frase tipica sem OpenAI", () => {
    const ref = new Date(2026, 10, 16);
    const d = interpretarComandoPedidoTexto({
      frase: "coloque para quarta 10 manjericoes para o spoleto",
      clientes,
      produtos,
      dataReferencia: ref,
    });
    expect(d.dataEntregaSugerida).toBe("2026-11-18");
    expect(d.cliente.status).toBe("ok");
    expect(d.cliente.contaAzulCustomerId).toBe("sp");
    expect(d.itens.length).toBeGreaterThanOrEqual(1);
    expect(d.itens[0]!.quantidade).toBe(10);
    expect(d.itens[0]!.status).toBe("ok");
    expect(d.modeloUsado).toMatch(/sem OpenAI/i);
  });

  it("exige confirmacao quando incompleto", () => {
    const r = draftTextoProntoParaSalvar({
      cliente: { contaAzulCustomerId: null },
      itens: [{ produtoId: "m1", quantidade: 1 }],
      dataEntregaSugerida: "2026-11-18",
    });
    expect(r.ok).toBe(false);
  });

  it("em duvida devolve candidatos proximos para escolha", () => {
    const ref = new Date(2026, 10, 16);
    const d = interpretarComandoPedidoTexto({
      frase: "quarta 5 manjericao para o spo",
      clientes: [
        { externalId: "sp", nome: "Spoleto Manaus", cnpjCpf: null },
        { externalId: "sp2", nome: "Sport Manaus", cnpjCpf: null },
      ],
      produtos: [
        { id: "m1", nome: "Manjericão Baby", sku: "MANJE1" },
        { id: "m2", nome: "Manjericão Italiano", sku: "MANJE2" },
      ],
      dataReferencia: ref,
    });
    expect(d.dataEntregaSugerida).toBe("2026-11-18");
    // "spo" pode ficar ambiguo ou nao_encontrado, mas com opções
    expect(["ambiguo", "nao_encontrado", "ok"]).toContain(d.cliente.status);
    expect(d.cliente.candidatos.length).toBeGreaterThan(0);
    expect(d.itens.length).toBeGreaterThanOrEqual(1);
    const item = d.itens[0]!;
    if (item.status !== "ok") {
      expect(item.candidatos.length).toBeGreaterThan(0);
    }
  });
});
