import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  calculateTowerNeeds,
  DEFAULT_TOWER_NEEDS_PARAMS,
  type TowerNeedsParams,
} from "@shared/towerNeeds";
import {
  calculateScenarioEnergy,
  DEFAULT_SCENARIO_ENERGY_PARAMS,
  type ScenarioEnergyParams,
} from "@shared/scenarioEnergy";
import { DecimalInput } from "@/components/custos/DecimalInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const TOWERS_KEY = "fazendas-up:projecao-colheita-torres:v2";
const ENERGY_KEY = "fazendas-up:projecao-colheita-energia:v1";

function readJson<T>(key: string): Partial<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<T>;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
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

function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function TowerNeedsPlanner({
  matTowersPerDayFromHarvest,
}: {
  matTowersPerDayFromHarvest?: number;
}) {
  const [params, setParams] = useState<TowerNeedsParams>(() => ({
    ...DEFAULT_TOWER_NEEDS_PARAMS,
    ...(readJson<TowerNeedsParams>(TOWERS_KEY) ?? {}),
  }));
  const [energy, setEnergy] = useState<ScenarioEnergyParams>(() => ({
    ...DEFAULT_SCENARIO_ENERGY_PARAMS,
    ...(readJson<ScenarioEnergyParams>(ENERGY_KEY) ?? {}),
  }));

  useEffect(() => {
    writeJson(TOWERS_KEY, params);
  }, [params]);
  useEffect(() => {
    writeJson(ENERGY_KEY, energy);
  }, [energy]);

  const result = useMemo(() => calculateTowerNeeds(params), [params]);
  const energyResult = useMemo(
    () => calculateScenarioEnergy(result, energy),
    [result, energy],
  );

  const set = <K extends keyof TowerNeedsParams>(key: K, value: TowerNeedsParams[K]) => {
    setParams(p => ({ ...p, [key]: value }));
  };
  const setE = <K extends keyof ScenarioEnergyParams>(
    key: K,
    value: ScenarioEnergyParams[K],
  ) => {
    setEnergy(p => ({ ...p, [key]: value }));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="max-w-3xl text-sm text-muted-foreground">
          Ritmo de colheita + dias por fase (12/12/9 andares). Abaixo, custo de
          energia do cenário (lâmpadas, bombas e refrigeração) com tarifa R${" "}
          {fmt(energy.tariffReaisPerKwh, 2)}/kWh.
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
            onClick={() => {
              setParams({ ...DEFAULT_TOWER_NEEDS_PARAMS });
              setEnergy({ ...DEFAULT_SCENARIO_ENERGY_PARAMS });
            }}
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
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tarifa e iluminação</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <Field label="Tarifa (R$/kWh)">
              <DecimalInput
                value={energy.tariffReaisPerKwh}
                onChange={v => setE("tariffReaisPerKwh", v)}
                fractionDigits={4}
              />
            </Field>
            <Field label="Lâmpada (W)">
              <DecimalInput
                value={energy.lampWatts}
                onChange={v => setE("lampWatts", v)}
                integersOnly
                fractionDigits={0}
              />
            </Field>
            <Field label="Lâmpadas / andar mudas">
              <DecimalInput
                value={energy.lampsPerFloorMudas}
                onChange={v => setE("lampsPerFloorMudas", v)}
                integersOnly
                fractionDigits={0}
              />
            </Field>
            <Field label="Lâmpadas / andar vegetativa">
              <DecimalInput
                value={energy.lampsPerFloorVegetativa}
                onChange={v => setE("lampsPerFloorVegetativa", v)}
                integersOnly
                fractionDigits={0}
              />
            </Field>
            <Field label="Lâmpadas / andar maturação">
              <DecimalInput
                value={energy.lampsPerFloorMaturacao}
                onChange={v => setE("lampsPerFloorMaturacao", v)}
                integersOnly
                fractionDigits={0}
              />
            </Field>
            <Field label="Horas lâmpada / dia">
              <DecimalInput
                value={energy.lampHoursPerDay}
                onChange={v => setE("lampHoursPerDay", v)}
                fractionDigits={1}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Bombas (1 CV · 220 V)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Field label="CV por bomba">
              <DecimalInput
                value={energy.pumpCv}
                onChange={v => setE("pumpCv", v)}
                fractionDigits={2}
              />
            </Field>
            <Field label="Rendimento elétrico da bomba">
              <DecimalInput
                value={energy.pumpEfficiency}
                onChange={v => setE("pumpEfficiency", v)}
                fractionDigits={2}
              />
            </Field>
            <Field label="Horas bomba / dia">
              <DecimalInput
                value={energy.pumpHoursPerDay}
                onChange={v => setE("pumpHoursPerDay", v)}
                fractionDigits={1}
              />
            </Field>
            <p className="text-xs text-muted-foreground">
              Mudas/vegetativa: 1 bomba por torre. Maturação: 1 bomba para{" "}
              {fmt(energy.matTowersPerPump, 0)} torres.
            </p>
            <Field label="Torres maturação por bomba">
              <DecimalInput
                value={energy.matTowersPerPump}
                onChange={v => setE("matTowersPerPump", v)}
                fractionDigits={1}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Refrigeração (220 V trifásico)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Field label="Evaporadoras">
              <DecimalInput
                value={energy.evaporators}
                onChange={v => setE("evaporators", v)}
                integersOnly
                fractionDigits={0}
              />
            </Field>
            <div className="space-y-1">
              <Label className="text-xs">Condensadoras por evaporadora</Label>
              <Select
                value={String(energy.condensersPerEvaporator)}
                onValueChange={v =>
                  setE("condensersPerEvaporator", Number(v) === 1 ? 1 : 2)
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 condensadora</SelectItem>
                  <SelectItem value="2">2 condensadoras</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Field label="Corrente condensadora (A)">
              <DecimalInput
                value={energy.condenserAmps}
                onChange={v => setE("condenserAmps", v)}
                integersOnly
                fractionDigits={0}
              />
            </Field>
            <Field label="Corrente evaporadora (A)">
              <DecimalInput
                value={energy.evaporatorAmps}
                onChange={v => setE("evaporatorAmps", v)}
                integersOnly
                fractionDigits={0}
              />
            </Field>
            <Field label="Fator de potência">
              <DecimalInput
                value={energy.powerFactor}
                onChange={v => setE("powerFactor", v)}
                fractionDigits={2}
              />
            </Field>
            <Field label="Horas refrigeração / dia">
              <DecimalInput
                value={energy.refrigerationHoursPerDay}
                onChange={v => setE("refrigerationHoursPerDay", v)}
                fractionDigits={1}
              />
            </Field>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Energia / dia</p>
            <p className="text-xl font-semibold tabular-nums">
              {fmt(energyResult.kwhPerDay, 1)} kWh
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Custo / mês (30 d)</p>
            <p className="text-xl font-semibold tabular-nums">
              {money(energyResult.costPerMonth)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Custo / ano</p>
            <p className="text-xl font-semibold tabular-nums">
              {money(energyResult.costPerYear)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Detalhe do custo de energia</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">W un.</TableHead>
                <TableHead className="text-right">h/dia</TableHead>
                <TableHead className="text-right">kWh/mês</TableHead>
                <TableHead className="text-right">R$/mês</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {energyResult.lines.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.label}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmt(l.qty, 1)} {l.unit}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmt(l.wattsEach, 0)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmt(l.hoursPerDay, 1)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmt(l.kwhPerMonth, 1)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {money(l.costPerMonth)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="font-semibold" colSpan={4}>
                  Total
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {fmt(energyResult.kwhPerMonth, 1)}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {money(energyResult.costPerMonth)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {energyResult.notes.map((n, i) => (
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
