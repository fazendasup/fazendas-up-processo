import { describe, expect, it } from "vitest";
import {
  infinitosCarregadosPorLote,
  montarQuadroAplicacoesProtocolo,
} from "./quadroAplicacoesProtocolo";

describe("quadroAplicacoesProtocolo", () => {
  const ciclos = [
    {
      id: 1,
      nome: "Infinito",
      produto: "Infinito",
      ativo: true,
      alvo: "caixa",
      frequencia: "personalizada",
      intervaloDias: 10,
      caixaIds: ["veg", "mat"],
      execucoes: [
        { caixaId: "veg", ultimaExecucao: "2026-10-24" },
        { caixaId: "mat", ultimaExecucao: "2026-10-10" },
      ],
    },
    {
      id: 2,
      nome: "Cercobin",
      produto: "Cercobin",
      ativo: true,
      alvo: "caixa",
      frequencia: "personalizada",
      intervaloDias: 10,
      caixaIds: ["veg", "mat"],
      execucoes: [{ caixaId: "mat", ultimaExecucao: "2026-10-12" }],
    },
    {
      id: 3,
      nome: "Thyper S-50",
      produto: "Thyper S-50",
      ativo: true,
      alvo: "caixa",
      frequencia: "personalizada",
      intervaloDias: 2,
      caixaIds: ["veg", "mat"],
      execucoes: [{ caixaId: "mat", ultimaExecucao: "2026-10-25" }],
    },
  ];

  const torres = [
    { id: "t-veg", nome: "Torre Veg 1", caixaAguaId: "veg" },
    { id: "t-mat", nome: "Torre Mat 1", caixaAguaId: "mat" },
  ];

  it("detecta Infinito carregado do lote transplantado", () => {
    const carregados = infinitosCarregadosPorLote({
      caixaId: "mat",
      torres,
      ciclos,
      hojeYmd: "2026-10-26",
      transplantios: [
        {
          dataHora: "2026-10-25",
          torreOrigemId: "t-veg",
          torreDestinoId: "t-mat",
          quantidadeTransplantada: 40,
          faseDestino: "maturacao",
        },
      ],
    });
    expect(carregados.map((c) => c.ymd)).toEqual(["2026-10-24"]);
  });

  it("atrasa Cercobin na maturação até a folga do Infinito da vegetativa", () => {
    const quadro = montarQuadroAplicacoesProtocolo({
      hojeYmd: "2026-10-26",
      caixas: [
        { id: "veg", nome: "Caixa Veg", fase: "vegetativa" },
        { id: "mat", nome: "Caixa Mat", fase: "maturacao" },
      ],
      torres,
      ciclos,
      transplantios: [
        {
          dataHora: "2026-10-25",
          torreOrigemId: "t-veg",
          torreDestinoId: "t-mat",
          quantidadeTransplantada: 40,
          faseDestino: "maturacao",
        },
      ],
    });
    const mat = quadro.find((l) => l.caixaId === "mat")!;
    expect(mat.ultimas.infinito).toBe("2026-10-10");
    // Sem lote: Cercobin 12+10=22, mas cadência já venceu → hoje/agenda.
    // Com Infinito carregado 24/10 + 3 = 27/10.
    expect(mat.proximas.cercobin).toBe("2026-10-27");
    expect(mat.alertas.length).toBeGreaterThan(0);
    expect(mat.alertas[0]?.liberadoEmYmd).toBe("2026-10-27");
  });
});
