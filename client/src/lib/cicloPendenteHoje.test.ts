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
});
