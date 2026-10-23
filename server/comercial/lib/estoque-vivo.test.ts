import { describe, expect, it } from "vitest";
import {
  ESTOQUE_MIX_MULT,
  buildEstoqueVivoDia,
  calcularProcessamentoDoDia,
  calcularProducaoMix,
  fatorPerdaEstoque,
  kgComprarPorRendimento,
  kgProcessarIngredienteMix,
  normalizeEstoqueMixFolhaLeve,
  unidadesAjustadasMixEstoque,
  type ConfigProdutoEstoque,
  type EstoqueVivoMixCfg,
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

  it("calcula kg a processar a partir de gramas e perda", () => {
    expect(fatorPerdaEstoque(10)).toBeCloseTo(1 / 0.9);
    // 100 mixes × 30g cenoura × 10% perda = 3.334 kg
    expect(kgProcessarIngredienteMix(100, 30, 10)).toBeCloseTo(3.334, 3);
  });

  it("calcula produção do Crocante 1", () => {
    const mix: EstoqueVivoMixCfg = {
      id: "c1",
      nome: "Crocante 1",
      produtoReferenciaId: null,
      produtoReferenciaNome: null,
      perdaPercentual: 0,
      ativo: true,
      componentes: [
        { produtoId: "1", produtoNome: "Cenoura", quantidade: 30 },
        { produtoId: "2", produtoNome: "Repolho Roxo", quantidade: 20 },
        { produtoId: "3", produtoNome: "Repolho Branco", quantidade: 20 },
        { produtoId: "4", produtoNome: "Alface Crespa Verde", quantidade: 130 },
      ],
    };
    const linhas = calcularProducaoMix(100, mix);
    expect(linhas.find((l) => l.nome === "Cenoura")?.kgProcessar).toBe(3);
    expect(linhas.find((l) => l.nome === "Alface Crespa Verde")?.kgProcessar).toBe(13);
  });

  it("explode pedidos do dia em kg por ingrediente via receitas", () => {
    const mix: EstoqueVivoMixCfg = {
      id: "mc",
      nome: "Mix Clássico",
      produtoReferenciaId: "prod-mix",
      produtoReferenciaNome: "Mix Clássico - 500g",
      perdaPercentual: 0,
      ativo: true,
      componentes: [
        { produtoId: "a", produtoNome: "Alface Crespa Verde", quantidade: 200 },
        { produtoId: "c", produtoNome: "Cenoura", quantidade: 50 },
      ],
    };
    const out = calcularProcessamentoDoDia(
      [
        { produtoId: "prod-mix", nome: "Mix Clássico - 500g", quantidade: 10 },
        { produtoId: "tom", nome: "Tomate Regional", quantidade: 5 },
      ],
      [mix],
    );
    expect(out.mixesUsados).toHaveLength(1);
    expect(out.mixesUsados[0]?.unidades).toBe(10);
    expect(out.ingredientes.find((i) => i.nome === "Cenoura")?.kgProcessar).toBe(0.5);
    expect(out.ingredientes.find((i) => i.nome === "Alface Crespa Verde")?.kgProcessar).toBe(2);
    expect(out.pedidosSemMix.map((p) => p.nome)).toContain("Tomate Regional");
  });

  it("casa receita pelo prefixo do nome quando não há produtoReferencia", () => {
    const mix: EstoqueVivoMixCfg = {
      id: "c1",
      nome: "Crocante 1",
      produtoReferenciaId: null,
      produtoReferenciaNome: null,
      perdaPercentual: 10,
      ativo: true,
      componentes: [{ produtoId: "1", produtoNome: "Cenoura", quantidade: 30 }],
    };
    const out = calcularProcessamentoDoDia(
      [{ nome: "Crocante 1 - 500g", quantidade: 100 }],
      [mix],
    );
    expect(out.mixesUsados[0]?.unidades).toBe(100);
    expect(out.ingredientes[0]?.kgProcessar).toBeCloseTo(3.334, 3);
  });
});
