/**
 * Comprova que alteração no catálogo RECEITAS (sem mudar cadastro de variedade)
 * altera dias de vegetativa e, portanto, o “status” do dashboard (vencido vs quase),
 * usa `bandeiraPrazoDashboard` (mesma regra do TorreCard).
 */
import { describe, it, expect } from "vitest";
import {
  diasCicloParaPrevisao,
  diasRestantes,
  cicloPrazoOptsFromFazenda,
  bandeiraPrazoDashboard,
} from "./utils-farm";
import type { VariedadeConfig, ReceitaCrescimentoResumo } from "./types";
import type { CicloPrazoOpts } from "./utils-farm";

describe("receita → dashboard (status/cores)", () => {
  const slug = "alface-crespa-bs-155";
  const dbId = 155;

  /** Variedade com dias “antigos” no merge — não devem mandar se `receitas` + mapa existirem. */
  const variedades: VariedadeConfig[] = [
    {
      id: slug,
      nome: "Alface Crespa verde / BS 155",
      diasMudas: 14,
      diasVegetativa: 14,
      diasMaturacao: 10,
      variedadeDbId: dbId,
    },
  ];

  const receita14d: ReceitaCrescimentoResumo = {
    id: 1,
    nome: "Crespa BS 155",
    variedadeId: dbId,
    diasGerminacao: 1,
    diasMudas: 14,
    diasVegetativa: 14,
    diasMaturacao: 10,
    ativa: true,
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  const receita10d: ReceitaCrescimentoResumo = {
    ...receita14d,
    diasVegetativa: 10,
    updatedAt: "2026-01-15T12:00:00.000Z",
  };

  const opts14 = cicloPrazoOptsFromFazenda({
    receitas: [receita14d],
    variedadeDbIdBySlug: { [slug]: dbId },
  });
  const opts10 = cicloPrazoOptsFromFazenda({
    receitas: [receita10d],
    variedadeDbIdBySlug: { [slug]: dbId },
  });

  it("dias na vegetativa vêm da receita priorizada (10), não dos 14 em VariedadeConfig", () => {
    expect(diasCicloParaPrevisao(slug, "vegetativa", variedades, opts10)).toBe(10);
  });

  it("com só slug no mapa (lista variedades vazia), ainda usa receita — espelha perfil fora do merge do andar", () => {
    expect(diasCicloParaPrevisao(slug, "vegetativa", [], opts10)).toBe(10);
  });

  it("duas receitas mesma variedade: vence a mais recente (10d), não a de 14d", () => {
    const velha: ReceitaCrescimentoResumo = {
      id: 2,
      nome: "Genérica",
      variedadeId: dbId,
      diasGerminacao: 1,
      diasMudas: 14,
      diasVegetativa: 14,
      diasMaturacao: 10,
      ativa: true,
      updatedAt: "2026-01-02T00:00:00.000Z",
    };
    const opts = cicloPrazoOptsFromFazenda({
      receitas: [velha, receita10d],
      variedadeDbIdBySlug: { [slug]: dbId },
    });
    expect(diasCicloParaPrevisao(slug, "vegetativa", variedades, opts)).toBe(10);
  });

  it("mesma dataEntrada: só trocar catálogo receita 14→10 muda quase → vencido (regras TorreCard)", () => {
    const agora = new Date(2026, 0, 20, 12, 0, 0);
    const entrada = "2026-01-09T12:00:00.000Z";
    const r14 = diasRestantes(entrada, "vegetativa", slug, variedades, opts14, agora);
    const r10 = diasRestantes(entrada, "vegetativa", slug, variedades, opts10, agora);
    expect(bandeiraPrazoDashboard(r14)).toBe("quase");
    expect(bandeiraPrazoDashboard(r10)).toBe("vencido");
  });

  it("ISO meia-noite UTC (date picker): 12/04 + 10d veg; em 22/04 local → vencido (não “2d” por somar 24h em UTC)", () => {
    const agora = new Date(2026, 3, 22, 14, 56, 0);
    const entrada = "2026-04-12T00:00:00.000Z";
    const rest = diasRestantes(entrada, "vegetativa", slug, variedades, opts10, agora);
    expect(rest).toBe(0);
    expect(bandeiraPrazoDashboard(rest)).toBe("vencido");
  });

  it("mapa slug→db id como string ainda resolve receita (evita cair no legado VariedadeConfig)", () => {
    const opts: CicloPrazoOpts = {
      receitas: [receita10d],
      variedadeDbIdBySlug: { [slug]: String(dbId) } as unknown as Record<string, number>,
    };
    expect(diasCicloParaPrevisao(slug, "vegetativa", variedades, opts)).toBe(10);
  });
});
