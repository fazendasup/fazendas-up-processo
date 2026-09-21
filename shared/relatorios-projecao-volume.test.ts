import { describe, expect, it } from "vitest";
import {
  listarMesesProjecaoAFrente,
  listarMesesYmEntre,
} from "./comercial/periodo-america-sp";
import { montarProjecaoVolumeBase } from "../server/comercial/services/relatorios-calculos";

describe("projecao volume relatorios", () => {
  it("lista meses civis do período", () => {
    const meses = listarMesesYmEntre(
      new Date("2025-07-01T03:00:00.000Z"),
      new Date("2025-08-31T02:59:59.999Z")
    );
    expect(meses).toEqual(["2025-07", "2025-08"]);
  });

  it("projeta N meses à frente do último mês base", () => {
    expect(listarMesesProjecaoAFrente("2025-08", 3)).toEqual([
      "2025-09",
      "2025-10",
      "2025-11",
    ]);
  });

  it("calcula média mensal e totais por produto", () => {
    const out = montarProjecaoVolumeBase({
      inicio: new Date("2025-07-01T03:00:00.000Z"),
      fim: new Date("2025-08-31T02:59:59.999Z"),
      produtos: [
        {
          produto: "Alface",
          categoria: "Folhosas",
          quantidade: 200,
          valorBruto: 1000,
        },
        {
          produto: "Rúcula",
          quantidade: 50,
          valorBruto: 400,
        },
      ],
    });
    expect(out.nMesesBase).toBe(2);
    expect(out.produtos[0]!.produto).toBe("Alface");
    expect(out.produtos[0]!.quantidadeMediaMensal).toBe(100);
    expect(out.produtos[0]!.valorMediaMensal).toBe(500);
    expect(out.totais.quantidadeMediaMensal).toBe(125);
    expect(out.totais.valorMediaMensal).toBe(700);
  });
});
