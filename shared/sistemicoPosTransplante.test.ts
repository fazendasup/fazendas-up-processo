import { describe, expect, it } from "vitest";
import { agendaSistemicoPosTransplante } from "./sistemicoPosTransplante";

describe("agendaSistemicoPosTransplante", () => {
  it("ignora mudas", () => {
    expect(
      agendaSistemicoPosTransplante({
        hojeYmd: "2026-10-26",
        faseDestino: "mudas",
        ultimaInfinitoYmd: null,
      }),
    ).toEqual({ infinitoYmd: null, cercobinYmd: null });
  });

  it("puxa Infinito no dia do transplantio se a caixa está sem cobertura recente", () => {
    expect(
      agendaSistemicoPosTransplante({
        hojeYmd: "2026-10-26",
        faseDestino: "vegetativa",
        ultimaInfinitoYmd: "2026-10-10",
        ultimaThyperYmd: "2026-10-23",
      }),
    ).toEqual({
      infinitoYmd: "2026-10-26",
      cercobinYmd: "2026-10-29",
    });
  });

  it("não reaplica Infinito se ainda está fresco (<7 dias)", () => {
    expect(
      agendaSistemicoPosTransplante({
        hojeYmd: "2026-10-26",
        faseDestino: "maturacao",
        ultimaInfinitoYmd: "2026-10-22",
      }),
    ).toEqual({ infinitoYmd: null, cercobinYmd: null });
  });

  it("respeita folga de 1 dia após Thyper", () => {
    expect(
      agendaSistemicoPosTransplante({
        hojeYmd: "2026-10-26",
        faseDestino: "vegetativa",
        ultimaInfinitoYmd: null,
        ultimaThyperYmd: "2026-10-26",
      }),
    ).toEqual({
      infinitoYmd: "2026-10-27",
      cercobinYmd: "2026-10-30",
    });
  });

  it("não sobrescreve agenda de Infinito já marcada para hoje/futuro", () => {
    expect(
      agendaSistemicoPosTransplante({
        hojeYmd: "2026-10-26",
        faseDestino: "vegetativa",
        ultimaInfinitoYmd: "2026-10-10",
        agendaInfinitoYmd: "2026-10-26",
        ultimaCercobinYmd: "2026-10-12",
      }),
    ).toEqual({
      infinitoYmd: null,
      cercobinYmd: "2026-10-29",
    });
  });
});
