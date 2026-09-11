import { useMemo } from "react";
import Header from "@/components/Header";
import { HarvestPlannerVerdeTorre } from "@/components/HarvestPlannerVerdeTorre";
import { useFazenda } from "@/contexts/FazendaContext";
import {
  capacidadePorFaseInstalacao,
  linhaCapacidadeTorre,
} from "@/lib/planejamentoContinuo";
import { recommendedTowersPerDay } from "@shared/harvest";
import { torreEstaAtivaNoDashboard } from "@/lib/types";

/**
 * Planejamento Verde Torre — simulação jan–dez de colheita + faturamento bruto.
 * Domínio: @shared/harvest (simulateYear).
 */
export default function PlanejamentoColheitaVerdeTorrePage() {
  const { data } = useFazenda();

  const prefill = useMemo(() => {
    const andares = data.andares ?? [];
    const torresMat = (data.torres ?? []).filter(
      t => torreEstaAtivaNoDashboard(t) && t.fase === "maturacao",
    );
    const towersFromErp = torresMat.length;

    const linhas = torresMat
      .map(t => {
        const andaresReais = andares.filter(a => a.torreId === t.id).length;
        const declarado = t.numAndares ?? t.andares ?? 0;
        return linhaCapacidadeTorre(
          {
            fase: t.fase,
            numAndares: andaresReais > 0 ? andaresReais : declarado,
            ativa: true,
            estruturaOverride: t.estruturaOverride ?? null,
            nome: t.nome,
          },
          data.projetoTipo ?? null,
          "colheita",
        );
      })
      .filter(Boolean);

    const totalPlantas = linhas.reduce((s, l) => s + (l?.subtotal ?? 0), 0);
    const plantsPerTowerFromErp =
      towersFromErp > 0 ? totalPlantas / towersFromErp : undefined;

    const cap = capacidadePorFaseInstalacao(
      (data.torres ?? [])
        .filter(t => torreEstaAtivaNoDashboard(t))
        .map(t => {
          const andaresReais = andares.filter(a => a.torreId === t.id).length;
          const declarado = t.numAndares ?? t.andares ?? 0;
          return {
            fase: t.fase,
            numAndares: andaresReais > 0 ? andaresReais : declarado,
            ativa: true,
            estruturaOverride: t.estruturaOverride ?? null,
            nome: t.nome,
          };
        }),
      data.projetoTipo ?? null,
      "colheita",
    );

    const parts: string[] = [];
    if (towersFromErp > 0) {
      parts.push(`${towersFromErp} torre(s) ativa(s) em maturação`);
    }
    if (plantsPerTowerFromErp && plantsPerTowerFromErp > 0) {
      parts.push(
        `~${Math.round(plantsPerTowerFromErp)} plantas/torre (capacidade instalada)`,
      );
    }
    if (cap.maturacao > 0) {
      parts.push(
        `${cap.maturacao.toLocaleString("pt-BR")} posições de colheita em maturação`,
      );
    }

    return {
      towersFromErp: towersFromErp > 0 ? towersFromErp : undefined,
      plantsPerTowerFromErp,
      sourceLabel: parts.length ? parts.join(" · ") : undefined,
      suggestedTowersPerDay:
        towersFromErp > 0
          ? recommendedTowersPerDay({
              towers: towersFromErp,
              growthDays: 14,
              sanitizeHours: 48,
              skipSaturday: true,
            })
          : undefined,
    };
  }, [data.torres, data.andares, data.projetoTipo]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Análise · Planejamento
          </p>
          <h1 className="text-2xl font-bold">Verde Torre — colheita mensal</h1>
          <p className="text-sm text-muted-foreground">
            Estima plantas, produtos finais e faturamento bruto mês a mês, com calendário real e
            gargalo entre ciclo biológico e rotina de colheita.
          </p>
        </div>
        <HarvestPlannerVerdeTorre prefill={prefill} />
      </main>
    </div>
  );
}
