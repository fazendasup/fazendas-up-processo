import { useMemo, useState } from "react";
import Header from "@/components/Header";
import { HarvestPlannerVerdeTorre } from "@/components/HarvestPlannerVerdeTorre";
import { TowerNeedsPlanner } from "@/components/TowerNeedsPlanner";
import { useFazenda } from "@/contexts/FazendaContext";
import {
  capacidadePorFaseInstalacao,
  linhaCapacidadeTorre,
} from "@/lib/planejamentoContinuo";
import { DEFAULT_HARVEST_PARAMS } from "@shared/harvest";
import { torreEstaAtivaNoDashboard } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const HARVEST_STORAGE_KEY = "fazendas-up:verde-torre-planner:v1";

function readHarvestTowersPerDay(): number {
  if (typeof window === "undefined") return DEFAULT_HARVEST_PARAMS.towersPerDay;
  try {
    const raw = localStorage.getItem(HARVEST_STORAGE_KEY);
    if (!raw) return DEFAULT_HARVEST_PARAMS.towersPerDay;
    const parsed = JSON.parse(raw) as { params?: { towersPerDay?: number } };
    const v = Number(parsed?.params?.towersPerDay);
    return Number.isFinite(v) && v > 0 ? v : DEFAULT_HARVEST_PARAMS.towersPerDay;
  } catch {
    return DEFAULT_HARVEST_PARAMS.towersPerDay;
  }
}

/**
 * Projeção de colheita — faturamento mensal + necessidade de torres por fase.
 */
export default function PlanejamentoColheitaVerdeTorrePage() {
  const { data } = useFazenda();
  const [aba, setAba] = useState<"projecao" | "torres">("projecao");
  const [ritmoProjecao, setRitmoProjecao] = useState(readHarvestTowersPerDay);

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
            Estima faturamento mês a mês e calcula quantas torres você precisa em
            mudas, vegetativa e maturação conforme o ritmo e o tempo em cada fase.
          </p>
        </div>

        <Tabs
          value={aba}
          onValueChange={v => {
            const next = v as "projecao" | "torres";
            setAba(next);
            if (next === "torres") setRitmoProjecao(readHarvestTowersPerDay());
          }}
          className="space-y-4"
        >
          <TabsList>
            <TabsTrigger value="projecao">Projeção e faturamento</TabsTrigger>
            <TabsTrigger value="torres">Torres por fase</TabsTrigger>
          </TabsList>

          <TabsContent value="projecao" className="mt-0">
            <HarvestPlannerVerdeTorre prefill={prefill} />
          </TabsContent>

          <TabsContent value="torres" className="mt-0">
            <TowerNeedsPlanner matTowersPerDayFromHarvest={ritmoProjecao} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
