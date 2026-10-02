import { describe, expect, it } from "vitest";
import {
  caldaFoliar,
  caldasNoMesmoDia,
  cartaoSolucao,
  dosesDaVariante,
  mensagemRegraSolucao,
  produtoSolucaoDoNome,
  programacaoCiclos,
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

  it("copia a dose do tanque para peróxido, Infinito e Cercobin", () => {
    expect(cartaoSolucao("peroxido").linhas.map((linha) => linha.valor)).toEqual([
      dosesDaVariante("310").h2o2,
      dosesDaVariante("500").h2o2,
    ]);
    expect(cartaoSolucao("infinito").fases).toEqual(["vegetativa", "maturacao"]);
    expect(cartaoSolucao("cercobin").linhas.map((linha) => linha.valor)).toEqual(["6 g", "10 g"]);
    expect(cartaoSolucao("koh").dosagemAgenda.length).toBeLessThanOrEqual(128);
    expect(produtoSolucaoDoNome("Biozenith")).toBeNull();
    expect(produtoSolucaoDoNome("H₂O₂ 200V (~50%)")).toBe("peroxido");
  });

  it("aplica os bloqueios do protocolo ao agendar a solução", () => {
    const peroxido = {
      id: "p",
      nome: "Peróxido",
      ativo: true,
      frequencia: "personalizada",
      intervaloDias: 2,
      dataInicio: "2026-10-01",
      fasesAplicaveis: ["mudas", "vegetativa", "maturacao"],
    };
    expect(
      mensagemRegraSolucao([peroxido], {
        id: "i",
        nome: "Infinito",
        ativo: true,
        frequencia: "quinzenal",
        dataInicio: "2026-10-01",
        fasesAplicaveis: ["vegetativa", "maturacao"],
      }),
    ).toMatch(/12 h/);
    expect(
      mensagemRegraSolucao([peroxido], {
        id: "b",
        nome: "Bio",
        ativo: true,
        frequencia: "personalizada",
        intervaloDias: 2,
        dataInicio: "2026-10-02",
        fasesAplicaveis: ["mudas", "vegetativa", "maturacao"],
      }),
    ).toBeNull();
    expect(
      mensagemRegraSolucao([], {
        id: "m",
        nome: "Cercobin",
        ativo: true,
        frequencia: "quinzenal",
        dataInicio: "2026-10-01",
        fasesAplicaveis: ["mudas"],
      }),
    ).toMatch(/Mudas/);
    expect(
      mensagemRegraSolucao(
        [
          {
            id: "i",
            nome: "Infinito",
            ativo: true,
            frequencia: "quinzenal",
            dataInicio: "2026-10-01",
            fasesAplicaveis: ["vegetativa"],
          },
        ],
        {
          id: "c",
          nome: "Cercobin",
          ativo: true,
          frequencia: "quinzenal",
          dataInicio: "2026-10-03",
          fasesAplicaveis: ["vegetativa"],
        },
      ),
    ).toMatch(/3 dias/);
    expect(
      mensagemRegraSolucao([], {
        id: "cedo",
        nome: "Infinito",
        ativo: true,
        frequencia: "semanal",
        diasSemana: [1],
        dataInicio: "2026-10-05",
        fasesAplicaveis: ["vegetativa"],
      }),
    ).toMatch(/10 dias/);
  });

  it("programa a semana sem juntar peróxido, Infinito e Cercobin", () => {
    const agenda = programacaoCiclos("2026-10-02");
    const porChave = Object.fromEntries(agenda.map((item) => [item.chave, item]));
    expect(porChave.peroxido).toMatchObject({
      frequencia: "personalizada",
      intervaloDias: 2,
      dataInicio: "2026-10-02",
    });
    expect(porChave.bio.dataInicio).toBe("2026-10-03");
    expect(porChave.infinito).toMatchObject({
      frequencia: "quinzenal",
      intervaloDias: 14,
      dataInicio: "2026-10-15",
      fases: ["vegetativa", "maturacao"],
    });
    expect(porChave.cercobin.dataInicio).toBe("2026-10-07");
    expect(porChave.A.diasSemana).toEqual([5]);
    expect(porChave.B.diasSemana).toEqual([1]);

    for (const item of agenda) {
      if (item.tipo !== "Solução") continue;
      const outros = agenda
        .filter((ciclo) => ciclo.chave !== item.chave && ciclo.tipo === "Solução")
        .map((ciclo) => ({
          id: ciclo.chave,
          nome: ciclo.nome,
          produto: ciclo.produto,
          ativo: true,
          frequencia: ciclo.frequencia,
          intervaloDias: ciclo.intervaloDias,
          diasSemana: ciclo.diasSemana,
          dataInicio: ciclo.dataInicio,
          fasesAplicaveis: ciclo.fases,
        }));
      expect(
        mensagemRegraSolucao(outros, {
          id: item.chave,
          nome: item.nome,
          produto: item.produto,
          ativo: true,
          frequencia: item.frequencia,
          intervaloDias: item.intervaloDias,
          diasSemana: item.diasSemana,
          dataInicio: item.dataInicio,
          fasesAplicaveis: item.fases,
        }),
      ).toBeNull();
    }
  });
});
