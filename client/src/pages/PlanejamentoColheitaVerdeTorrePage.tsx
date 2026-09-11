import { useMemo } from "react";
import Header from "@/components/Header";
import { ProjecaoColheitaPanel } from "@/components/ProjecaoColheitaPanel";
import { useFazenda } from "@/contexts/FazendaContext";
import {
  capacidadePorFaseInstalacao,
  linhaCapacidadeTorre,
} from "@/lib/planejamentoContinuo";
import { torreEstaAtivaNoDashboard } from "@/lib/types";

/**
 * Projeção de colheita — página única: ritmo → torres → faturamento + energia.
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
          <h1 className="text-2xl font-bold">Projeção de colheita</h1>
          <p className="text-sm text-muted-foreground">
            Ritmo de colheita, torres por fase, faturamento mensal e energia — tudo
            integrado numa página.
          </p>
        </div>
        <ProjecaoColheitaPanel prefill={prefill} />
      </main>
    </div>
  );
}
