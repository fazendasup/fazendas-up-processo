import { describe, it, expect, vi, beforeEach } from "vitest";

const getAllPlanosPlantio = vi.fn();
const updatePlanoPlantio = vi.fn();

vi.mock("./db", () => ({
  getAllPlanosPlantio: (...args: unknown[]) => getAllPlanosPlantio(...args),
  updatePlanoPlantio: (...args: unknown[]) => updatePlanoPlantio(...args),
}));

import { syncPlanoFromTransplantio, syncPlanoFromColheita } from "./planoOperacaoSync";

describe("planoOperacaoSync", () => {
  beforeEach(() => {
    getAllPlanosPlantio.mockReset();
    updatePlanoPlantio.mockReset();
  });

  it("mudas→vegetativa: FIFO em_germinacao → em_producao", async () => {
    getAllPlanosPlantio.mockResolvedValue([
      {
        id: 1,
        projetoId: 1,
        variedadeId: 5,
        status: "em_germinacao",
        dataInicioGerminacao: new Date("2025-01-01"),
        transplantadasGerminacao: 0,
      },
    ]);
    await syncPlanoFromTransplantio(1, 5, "mudas", "vegetativa", 12);
    expect(updatePlanoPlantio).toHaveBeenCalledWith(
      1,
      1,
      expect.objectContaining({
        status: "em_producao",
        germinacaoFase: "pronto_mudas",
        transplantadasGerminacao: 12,
      }),
    );
  });

  it("colheita: primeiro em_producao → colhido", async () => {
    getAllPlanosPlantio.mockResolvedValue([
      {
        id: 2,
        projetoId: 1,
        variedadeId: 5,
        status: "em_producao",
        dataInicioGerminacao: new Date("2025-01-01"),
        transplantadasGerminacao: 100,
      },
    ]);
    await syncPlanoFromColheita(1, 5);
    expect(updatePlanoPlantio).toHaveBeenCalledWith(1, 2, { status: "colhido" });
  });

  it("ignora transplantio veg→mat para status do plano", async () => {
    getAllPlanosPlantio.mockResolvedValue([]);
    await syncPlanoFromTransplantio(1, 5, "vegetativa", "maturacao", 5);
    expect(updatePlanoPlantio).not.toHaveBeenCalled();
  });
});
