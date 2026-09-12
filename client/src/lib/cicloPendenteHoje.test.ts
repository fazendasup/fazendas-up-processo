import { describe, expect, it } from "vitest";
import { cicloPendenteHoje } from "./utils-farm";
import type { CicloAplicacao } from "./types";

function base(over: Partial<CicloAplicacao> = {}): CicloAplicacao {
  return {
    id: "c-1",
    nome: "Teste",
    frequencia: "quinzenal",
    produto: "X",
    tipo: "nutriente",
    fasesAplicaveis: ["mudas"],
    alvo: "caixa",
    ativo: true,
    ...over,
  };
}

describe("cicloPendenteHoje", () => {
  it("não fica pendente se dataInicio é futura", () => {
    const futuro = new Date();
    futuro.setDate(futuro.getDate() + 10);
    const y = futuro.getFullYear();
    const m = String(futuro.getMonth() + 1).padStart(2, "0");
    const d = String(futuro.getDate()).padStart(2, "0");
    expect(
      cicloPendenteHoje(
        base({ dataInicio: `${y}-${m}-${d}`, ultimaExecucao: undefined }),
      ),
    ).toBe(false);
  });

  it("fica pendente sem ultimaExecucao quando dataInicio é hoje ou passado", () => {
    const hoje = new Date();
    const y = hoje.getFullYear();
    const m = String(hoje.getMonth() + 1).padStart(2, "0");
    const d = String(hoje.getDate()).padStart(2, "0");
    expect(
      cicloPendenteHoje(
        base({ dataInicio: `${y}-${m}-${d}`, ultimaExecucao: undefined }),
      ),
    ).toBe(true);
  });

  it("fica pendente no dia exato do ciclo personalizado a cada 2 dias mesmo de manhã cedo", () => {
    const ciclo = base({
      frequencia: "personalizada",
      intervaloDias: 2,
      dataInicio: "2026-09-06",
      // Última execução às 12:00 do dia 10
      ultimaExecucao: "2026-09-10T12:00:00.000Z",
    });
    // Hoje é dia 12 às 08:00 (menos de 48h de relógio, mas 2 dias de calendário)
    const hojeManha = new Date(2026, 8, 12, 8, 0, 0);
    expect(cicloPendenteHoje(ciclo, hojeManha)).toBe(true);
  });

  it("não fica pendente 1 dia após a última execução (intervalo 2 dias)", () => {
    const ciclo = base({
      frequencia: "personalizada",
      intervaloDias: 2,
      dataInicio: "2026-09-06",
      ultimaExecucao: "2026-09-10T12:00:00.000Z",
    });
    // Dia 11: apenas 1 dia após dia 10
    const dia11 = new Date(2026, 8, 11, 14, 0, 0);
    expect(cicloPendenteHoje(ciclo, dia11)).toBe(false);
  });

  it("não fica pendente se já foi executado no mesmo dia", () => {
    const ciclo = base({
      frequencia: "personalizada",
      intervaloDias: 2,
      dataInicio: "2026-09-06",
      ultimaExecucao: "2026-09-12T10:00:00.000Z",
    });
    // Hoje é dia 12 às 14:00 (já executado hoje)
    const hojeTarde = new Date(2026, 8, 12, 14, 0, 0);
    expect(cicloPendenteHoje(ciclo, hojeTarde)).toBe(false);
  });
});
