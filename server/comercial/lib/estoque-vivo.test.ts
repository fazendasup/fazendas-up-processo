import { describe, expect, it } from "vitest";
import {
  ESTOQUE_MIX_MULT,
  buildEstoqueVivoDia,
  kgComprarPorRendimento,
  normalizeEstoqueMixFolhaLeve,
  unidadesAjustadasMixEstoque,
  type ConfigProdutoEstoque,
  type LinhaPedidoEstoque,
} from "./estoque-vivo.js";

describe("estoque-vivo", () => {
  const cfgMix = normalizeEstoqueMixFolhaLeve({
    referenciaProduto: "Alface MIX",
    variedades: ["Alface Crespa Verde", "Alface Crespa Roxa"],
  });

  const pedidos: LinhaPedidoEstoque[] = [
    { nome: "Alface MIX", quantidade: 100 },
    { nome: "Alface Crespa Verde", quantidade: 10 },
    { nome: "Rúcula", quantidade: 20 },
  ];

  it("aplica mix comum ×1,34", () => {
    const up = unidadesAjustadasMixEstoque("Rúcula", 20, true, pedidos, cfgMix);
    expect(up).toBeCloseTo(20 * ESTOQUE_MIX_MULT);
  });

  it("aplica mix folha leve como parte do referência", () => {
    const up = unidadesAjustadasMixEstoque("Alface Crespa Verde", 10, true, pedidos, cfgMix);
    expect(up).toBe(10 + 100 / 2);
  });

  it("calcula kg com arredondamento para cima no milésimo", () => {
    expect(kgComprarPorRendimento(17, 8)).toBe(2.125);
  });

  it("exige fator em modo unidade", () => {
    const produtos: ConfigProdutoEstoque[] = [
      {
        produtoId: "1",
        nome: "Rúcula",
        modoCompra: "unidade",
        fator: null,
        rendimento: 0,
        mixAtivo: false,
        oculto: false,
      },
    ];
    const out = buildEstoqueVivoDia(pedidos, produtos, cfgMix);
    const rucula = out.linhas.find((l) => l.nome === "Rúcula");
    expect(rucula?.comprarTexto).toBe("Informe o fator");
  });

  it("calcula unidades com Math.ceil", () => {
    const produtos: ConfigProdutoEstoque[] = [
      {
        produtoId: "1",
        nome: "Rúcula",
        modoCompra: "unidade",
        fator: 1.5,
        rendimento: 0,
        mixAtivo: false,
        oculto: false,
      },
    ];
    const out = buildEstoqueVivoDia(pedidos, produtos, cfgMix);
    const rucula = out.linhas.find((l) => l.nome === "Rúcula");
    expect(rucula?.comprarValor).toBe(Math.ceil(20 * 1.5));
  });
});
