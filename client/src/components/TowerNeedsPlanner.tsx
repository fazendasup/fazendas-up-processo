import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  calculateTowerNeeds,
  DEFAULT_TOWER_NEEDS_PARAMS,
  type TowerNeedsParams,
} from "@shared/towerNeeds";
import { DecimalInput } from "@/components/custos/DecimalInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STORAGE_KEY = "fazendas-up:projecao-colheita-torres:v2";

function readStored(): Partial<TowerNeedsParams> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<TowerNeedsParams>;
  } catch {
    return null;
  }
}

function writeStored(params: TowerNeedsParams) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(params));
  } catch {
    /* ignore */
  }
}

function fmt(n: number, d = 2) {
  return n.toLocaleString("pt-BR", {
    maximumFractionDigits: d,
    minimumFractionDigits: 0,
  });
}

export function TowerNeedsPlanner({
  matTowersPerDayFromHarvest,
}: {
  /** Ritmo da aba Projeção (torres mat/dia) — botão para sincronizar. */
  matTowersPerDayFromHarvest?: number;
}) {
  const [params, setParams] = useState<TowerNeedsParams>(() => ({
    ...DEFAULT_TOWER_NEEDS_PARAMS,
    ...(readStored() ?? {}),
  }));

  useEffect(() => {
    writeStored(params);
  }, [params]);

  const result = useMemo(() => calculateTowerNeeds(params), [params]);

  const set = <K extends keyof TowerNeedsParams>(key: K, value: TowerNeedsParams[K]) => {
    setParams(p => ({ ...p, [key]: value }));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="max-w-3xl text-sm text-muted-foreground">
          Informe o ritmo de colheita e os dias em cada fase. Estrutura padrão:{" "}
          <strong>12 andares mudas</strong>, <strong>12 vegetativa</strong>,{" "}
          <strong>9 maturação</strong>. Razões:{" "}
          <strong>1 andar mudas → 1 torre vegetativa</strong>;{" "}
          <strong>1 andar vegetativa → 3 andares maturação</strong>.
        </p>
        <div className="flex flex-wrap gap-2">
          {matTowersPerDayFromHarvest != null && matTowersPerDayFromHarvest > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => set("matTowersPerDay", matTowersPerDayFromHarvest)}
            >
              Usar ritmo da projeção ({fmt(matTowersPerDayFromHarvest, 1)}/dia)
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setParams({ ...DEFAULT_TOWER_NEEDS_PARAMS })}
          >
            Restaurar padrão
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ritmo e tempo por fase</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Field label="Torres maturação / dia">
              <DecimalInput
                value={params.matTowersPerDay}
                onChange={v => set("matTowersPerDay", v)}
                fractionDigits={2}
              />
            </Field>
            <Field label="Dias em mudas">
              <DecimalInput
                value={params.daysMudas}
                onChange={v => set("daysMudas", v)}
                integersOnly
                fractionDigits={0}
              />
            </Field>
            <Field label="Dias em vegetativa">
              <DecimalInput
                value={params.daysVegetativa}
                onChange={v => set("daysVegetativa", v)}
                integersOnly
                fractionDigits={0}
              />
            </Field>
            <Field label="Dias em maturação">
              <DecimalInput
                value={params.daysMaturacao}
                onChange={v => set("daysMaturacao", v)}
                integersOnly
                fractionDigits={0}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Estrutura e razões</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Field label="Andares / torre mudas">
              <DecimalInput
                value={params.andaresMudas}
                onChange={v => set("andaresMudas", v)}
                integersOnly
                fractionDigits={0}
              />
            </Field>
            <Field label="Andares / torre vegetativa">
              <DecimalInput
                value={params.andaresVegetativa}
                onChange={v => set("andaresVegetativa", v)}
                integersOnly
                fractionDigits={0}
              />
            </Field>
            <Field label="Andares / torre maturação">
              <DecimalInput
                value={params.andaresMaturacao}
                onChange={v => set("andaresMaturacao", v)}
                integersOnly
                fractionDigits={0}
              />
            </Field>
            <Field label="1 andar mudas → torres veg">
              <DecimalInput
                value={params.mudFloorToVegTowers}
                onChange={v => set("mudFloorToVegTowers", v)}
                fractionDigits={2}
              />
            </Field>
            <Field label="1 andar veg → andares mat">
              <DecimalInput
                value={params.vegFloorToMatFloors}
                onChange={v => set("vegFloorToMatFloors", v)}
                fractionDigits={2}
              />
            </Field>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {result.phases.map(ph => (
          <Card key={ph.fase}>
            <CardContent className="space-y-1 p-4">
              <p className="text-xs text-muted-foreground">{ph.label}</p>
              <p className="text-2xl font-semibold tabular-nums">
                {fmt(ph.towersNeeded, 2)}
              </p>
              <p className="text-sm text-muted-foreground">
                sugerido: <strong>{ph.towersCeil}</strong> torre(s) · {ph.days}{" "}
                dias · {fmt(ph.floorsInPipeline, 1)} andares em fluxo
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Resumo — total sugerido {result.totalTowersCeil} torres
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fase</TableHead>
                <TableHead className="text-right">Dias</TableHead>
                <TableHead className="text-right">Andares/torre</TableHead>
                <TableHead className="text-right">Torres (exato)</TableHead>
                <TableHead className="text-right">Torres (ceil)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.phases.map(ph => (
                <TableRow key={ph.fase}>
                  <TableCell className="font-medium">{ph.label}</TableCell>
                  <TableCell className="text-right">{ph.days}</TableCell>
                  <TableCell className="text-right">{ph.andaresPorTorre}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmt(ph.towersNeeded, 2)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {ph.towersCeil}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {result.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
