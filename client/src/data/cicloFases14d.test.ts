import { describe, expect, it } from "vitest";
import {
  caldaFoliar,
  caldasNoMesmoDia,
  dosesDaVariante,
  protocoloFoliar,
  rotulosNoDia,
} from "./cicloFases14d";

describe("protocolo fases 14 dias", () => {
  it("troca a dose exata ao mudar o tanque", () => {
    expect(dosesDaVariante("310")).toMatchObject({
      h2o2: "1,0 ml",
      infinito: "20 ml",
      cercobin: "6 g",
      bio: "31 ml",
    });
    expect(dosesDaVariante("500").h2o2).toBe("1,5 ml");
    expect(dosesDaVariante("500").cercobin).toBe("10 g");
  });

  it("não sugere Infinito nem Cercobin em Mudas", () => {
    expect(rotulosNoDia("mudas", 2)).toEqual([]);
    expect(rotulosNoDia("vegetativa", 3)).toContain("Infinito");
    expect(rotulosNoDia("vegetativa", 9)).toContain("Cercobin");
    expect(rotulosNoDia("maturacao", 10)).toContain("Sem sistêmico novo");
  });

  it("guarda a calda foliar de 5 L com as doses da receita", () => {
    const foliar = protocoloFoliar();
    expect(foliar.produtos).toEqual(["Biozenith", "Nutrisolve", "Magleaf", "Forticell"]);
    expect(foliar.volume).toBe("5 L");
    const a = caldaFoliar("A");
    expect(a.itens.map((item) => `${item.produto} ${item.dose}`)).toEqual([
      "Biozenith 12,5 mL",
      "Nutrisolve 12,5 mL",
      "Magleaf 10 mL",
    ]);
    const b = caldaFoliar("B");
    expect(b.itens[0]).toMatchObject({
      produto: "Forticell",
      dose: "15 mL",
      crise: "Tip burn: 20–25 mL",
    });
    expect(b.aviso).toMatch(/Magleaf/);
    expect(a.dosagemAgenda.length).toBeLessThanOrEqual(128);
    expect(b.dosagemAgenda.length).toBeLessThanOrEqual(128);
  });

  it("impede Calda A e Calda B no mesmo dia", () => {
    const ciclos = [
      {
        id: "a",
        nome: "Calda A",
        ativo: true,
        frequencia: "semanal",
        diasSemana: [1],
      },
    ];
    expect(
      caldasNoMesmoDia(ciclos, {
        nome: "Calda B",
        frequencia: "semanal",
        diasSemana: [1],
      }),
    ).toBe(true);
    expect(
      caldasNoMesmoDia(ciclos, {
        nome: "Calda B",
        frequencia: "semanal",
        diasSemana: [4],
      }),
    ).toBe(false);
  });
});
