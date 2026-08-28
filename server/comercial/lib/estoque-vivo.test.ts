import { describe, expect, it } from "vitest";
import {
  ESTOQUE_MIX_MULT,
  buildEstoqueVivoDia,
  calcularDemandaMixCustomizado,
  fatorPerdaEstoque,
  kgComprarPorRendimento,
  normalizeEstoqueMixFolhaLeve,
  previewMixEstoqueVivo,
  unidadesAjustadasMixEstoque,
  unidadesComponenteMixComPerda,
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

  it("calcula perda como divisor 1/(1-p)", () => {
    expect(fatorPerdaEstoque(10)).toBeCloseTo(1 / 0.9);
    expect(unidadesComponenteMixComPerda(100, 0.5, 10)).toBeCloseTo(55.5556, 3);
  });

  it("distribui demanda de mix customizado nos componentes", () => {
    const mixes: EstoqueVivoMixCfg[] = [
      {
        id: "m1",
        nome: "Mix salada",
        produtoReferenciaId: "ref",
        produtoReferenciaNome: "Mix Salada",
        perdaPercentual: 0,
        ativo: true,
        componentes: [
          { produtoId: "c1", produtoNome: "Cenoura", quantidade: 0.2 },
          { produtoId: "c2", produtoNome: "Repolho", quantidade: 0.15 },
        ],
      },
    ];
    const pedidosMix: LinhaPedidoEstoque[] = [{ nome: "Mix Salada", quantidade: 100 }];
    const demanda = calcularDemandaMixCustomizado(pedidosMix, mixes);
    expect(demanda.get("Cenoura")).toBeCloseTo(20);
    expect(demanda.get("Repolho")).toBeCloseTo(15);
  });

  it("integra mix customizado no build do dia", () => {
    const mixes: EstoqueVivoMixCfg[] = [
      {
        id: "m1",
        nome: "Mix salada",
        produtoReferenciaId: "ref",
        produtoReferenciaNome: "Mix Salada",
        perdaPercentual: 10,
        ativo: true,
        componentes: [
          { produtoId: "c1", produtoNome: "Cenoura", quantidade: 1 },
        ],
      },
    ];
    const produtos: ConfigProdutoEstoque[] = [
      {
        produtoId: "c1",
        nome: "Cenoura",
        modoCompra: "kilo",
        fator: null,
        rendimento: 10,
        mixAtivo: false,
        oculto: false,
      },
    ];
    const pedidosMix: LinhaPedidoEstoque[] = [{ nome: "Mix Salada", quantidade: 100 }];
    const out = buildEstoqueVivoDia(pedidosMix, produtos, cfgMix, { mixes });
    const cenoura = out.linhas.find((l) => l.nome === "Cenoura");
    expect(cenoura?.quantidadeMix).toBeCloseTo(111.1111, 3);
    expect(cenoura?.comprarValor).toBeCloseTo(11.112, 2);
    expect(cenoura?.inMixCustomizado).toBe(true);
  });

  it("preview de mix converte unidades em kg", () => {
    const mix: EstoqueVivoMixCfg = {
      id: "m1",
      nome: "Mix",
      produtoReferenciaId: "ref",
      produtoReferenciaNome: "Mix",
      perdaPercentual: 0,
      ativo: true,
      componentes: [{ produtoId: "1", produtoNome: "Alface", quantidade: 2 }],
    };
    const produtos: ConfigProdutoEstoque[] = [
      {
        produtoId: "1",
        nome: "Alface",
        modoCompra: "kilo",
        fator: null,
        rendimento: 8,
        mixAtivo: false,
        oculto: false,
      },
    ];
    const preview = previewMixEstoqueVivo(10, mix, produtos);
    expect(preview[0]?.unidadesNecessarias).toBe(20);
    expect(preview[0]?.comprarValor).toBe(2.5);
  });
});
