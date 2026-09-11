import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Coins,
  Leaf,
  Scale,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  DEFAULT_HARVEST_PARAMS,
  recommendedTowersPerDay,
  simulateYear,
  type HarvestParams,
} from "@shared/harvest";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STORAGE_KEY = "fazendas-up:projecao-colheita-integrada:v1";

type Stored = {
  harvest: HarvestParams;
  year: number;
  tower: Omit<TowerNeedsParams, "matTowersPerDay">;
  energy: ScenarioEnergyParams;
};

type PrefillHint = {
  towersFromErp?: number;
  plantsPerTowerFromErp?: number;
  sourceLabel?: string;
};

function readStored(): Partial<Stored> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<Stored>;
  } catch {
    return null;
  }
}

function writeStored(data: Stored) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function num(n: number, digits = 0) {
  return n.toLocaleString("pt-BR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
}

/**
 * Página única: colheita → torres necessárias → faturamento + energia.
 */
export function ProjecaoColheitaPanel({ prefill }: { prefill?: PrefillHint }) {
  const stored = useMemo(() => readStored(), []);

  const [year, setYear] = useState(
    () => stored?.year ?? new Date().getFullYear(),
  );
  const [harvest, setHarvest] = useState<HarvestParams>(() => ({
    ...DEFAULT_HARVEST_PARAMS,
    ...(stored?.harvest ?? {}),
  }));
  const [towerExtra, setTowerExtra] = useState(() => {
    const { matTowersPerDay: _m, ...rest } = {
      ...DEFAULT_TOWER_NEEDS_PARAMS,
      ...(stored?.tower ?? {}),
    };
    return rest;
  });
  const [energy, setEnergy] = useState<ScenarioEnergyParams>(() => ({
    ...DEFAULT_SCENARIO_ENERGY_PARAMS,
    ...(stored?.energy ?? {}),
  }));

  const towerParams: TowerNeedsParams = useMemo(
    () => ({
      ...towerExtra,
      matTowersPerDay: harvest.towersPerDay,
    }),
    [towerExtra, harvest.towersPerDay],
  );

  const towers = useMemo(() => calculateTowerNeeds(towerParams), [towerParams]);

  const matTowersNeeded = towers.phases.find(p => p.fase === "maturacao")!.towersCeil;

  const harvestForSim: HarvestParams = useMemo(
    () => ({
      ...harvest,
      towers: matTowersNeeded > 0 ? matTowersNeeded : harvest.towers,
      growthDays: towerExtra.daysMaturacao,
    }),
    [harvest, matTowersNeeded, towerExtra.daysMaturacao],
  );

  const projection = useMemo(
    () => simulateYear(harvestForSim, year),
    [harvestForSim, year],
  );

  const energyResult = useMemo(
    () => calculateScenarioEnergy(towers, energy),
    [towers, energy],
  );

  const margemMes = projection.avgMonthlyRevenue - energyResult.costPerMonth;
  const margemAno = projection.totals.revenue - energyResult.costPerYear;

  useEffect(() => {
    writeStored({
      harvest,
      year,
      tower: towerExtra,
      energy,
    });
  }, [harvest, year, towerExtra, energy]);

  const setH = <K extends keyof HarvestParams>(key: K, value: HarvestParams[K]) => {
    setHarvest(p => ({ ...p, [key]: value }));
  };
  const setT = <K extends keyof typeof towerExtra>(
    key: K,
    value: (typeof towerExtra)[K],
  ) => {
    setTowerExtra(p => ({ ...p, [key]: value }));
  };
  const setE = <K extends keyof ScenarioEnergyParams>(
    key: K,
    value: ScenarioEnergyParams[K],
  ) => {
    setEnergy(p => ({ ...p, [key]: value }));
  };

  const resetAll = () => {
    setHarvest({ ...DEFAULT_HARVEST_PARAMS });
    const { matTowersPerDay: _m, ...rest } = DEFAULT_TOWER_NEEDS_PARAMS;
    setTowerExtra(rest);
    setEnergy({ ...DEFAULT_SCENARIO_ENERGY_PARAMS });
    setYear(new Date().getFullYear());
  };

  const applyRecommendedVolume = () => {
    const rec = recommendedTowersPerDay({
      towers: matTowersNeeded > 0 ? matTowersNeeded : harvest.towers,
      growthDays: towerExtra.daysMaturacao,
      sanitizeHours: harvest.sanitizeHours,
      skipSaturday: harvest.skipSaturday,
    });
    setH("towersPerDay", rec);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Altere o ritmo de colheita e os tempos por fase — as torres necessárias e
          os custos de energia atualizam juntos. Faturamento usa a lista mensal.
          Tudo fica salvo neste navegador.
        </p>
        <div className="flex flex-wrap gap-2">
          {prefill?.sourceLabel ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                if (prefill.plantsPerTowerFromErp && prefill.plantsPerTowerFromErp > 0) {
                  setH("plantsPerTower", Math.round(prefill.plantsPerTowerFromErp));
                }
              }}
            >
              Plantas/torre do ERP
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="outline" onClick={resetAll}>
            Restaurar padrão
          </Button>
        </div>
      </div>

      {/* 1. Entradas */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          1 · Parâmetros
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Colheita</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Field label="Torres / dia (ritmo)">
                <DecimalInput
                  value={harvest.towersPerDay}
                  onChange={v => setH("towersPerDay", v)}
                  fractionDigits={2}
                />
              </Field>
              <Field label="Plantas / torre">
                <DecimalInput
                  value={harvest.plantsPerTower}
                  onChange={v => setH("plantsPerTower", v)}
                  integersOnly
                  fractionDigits={0}
                />
              </Field>
              <Field label="Perda (%)">
                <DecimalInput
                  value={harvest.lossPercent}
                  onChange={v => setH("lossPercent", v)}
                  fractionDigits={1}
                />
              </Field>
              <Field label="Sanitização (h)">
                <DecimalInput
                  value={harvest.sanitizeHours}
                  onChange={v => setH("sanitizeHours", v)}
                  integersOnly
                  fractionDigits={0}
                />
              </Field>
              <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 sm:col-span-2">
                <Label htmlFor="skip-sat">Sem colheita no sábado</Label>
                <Switch
                  id="skip-sat"
                  checked={harvest.skipSaturday}
                  onCheckedChange={v => setH("skipSaturday", v)}
                />
              </div>
              <Field label="Ano">
                <Input
                  type="number"
                  className="h-9"
                  value={year}
                  onChange={e => setYear(Number(e.target.value) || year)}
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tempo em cada fase (dias)</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Field label="Mudas">
                <DecimalInput
                  value={towerExtra.daysMudas}
                  onChange={v => setT("daysMudas", v)}
                  integersOnly
                  fractionDigits={0}
                />
              </Field>
              <Field label="Vegetativa">
                <DecimalInput
                  value={towerExtra.daysVegetativa}
                  onChange={v => setT("daysVegetativa", v)}
                  integersOnly
                  fractionDigits={0}
                />
              </Field>
              <Field label="Maturação">
                <DecimalInput
                  value={towerExtra.daysMaturacao}
                  onChange={v => setT("daysMaturacao", v)}
                  integersOnly
                  fractionDigits={0}
                />
              </Field>
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground sm:col-span-2">
                Andares/torre: {towerExtra.andaresMudas} / {towerExtra.andaresVegetativa} /{" "}
                {towerExtra.andaresMaturacao}. Razões: 1 andar mudas → 1 torre veg; 1
                andar veg → {num(towerExtra.vegFloorToMatFloors, 0)} andares mat.
              </div>
              <Field label="Andares mudas">
                <DecimalInput
                  value={towerExtra.andaresMudas}
                  onChange={v => setT("andaresMudas", v)}
                  integersOnly
                  fractionDigits={0}
                />
              </Field>
              <Field label="Andares vegetativa">
                <DecimalInput
                  value={towerExtra.andaresVegetativa}
                  onChange={v => setT("andaresVegetativa", v)}
                  integersOnly
                  fractionDigits={0}
                />
              </Field>
              <Field label="Andares maturação">
                <DecimalInput
                  value={towerExtra.andaresMaturacao}
                  onChange={v => setT("andaresMaturacao", v)}
                  integersOnly
                  fractionDigits={0}
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Comercialização</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Field label="g / planta">
                <DecimalInput
                  value={harvest.weightPerPlantG}
                  onChange={v => setH("weightPerPlantG", v)}
                  fractionDigits={1}
                />
              </Field>
              <Field label="g / produto">
                <DecimalInput
                  value={harvest.weightPerProductG}
                  onChange={v => setH("weightPerProductG", v)}
                  fractionDigits={1}
                />
              </Field>
              <Field label="Preço R$ / produto">
                <DecimalInput
                  value={harvest.salePrice}
                  onChange={v => setH("salePrice", v)}
                  fractionDigits={2}
                />
              </Field>
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm sm:col-span-2">
                Ciclo maturação + sanitização:{" "}
                <strong>
                  {num(towerExtra.daysMaturacao + harvest.sanitizeHours / 24, 2)} dias
                </strong>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 2. Resultado rápido */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          2 · Resumo financeiro
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            icon={<Coins className="h-4 w-4" />}
            label="Faturamento / mês"
            value={money(projection.avgMonthlyRevenue)}
          />
          <Stat
            icon={<Zap className="h-4 w-4" />}
            label="Energia / mês"
            value={money(energyResult.costPerMonth)}
          />
          <Stat
            icon={<Leaf className="h-4 w-4" />}
            label="Faturamento − energia / mês"
            value={money(margemMes)}
          />
          <Stat
            icon={<Scale className="h-4 w-4" />}
            label="No ano (fat. − energia)"
            value={money(margemAno)}
          />
        </div>
        {projection.bottleneck !== "equilibrado" ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>
              Gargalo:{" "}
              {projection.bottleneck === "calendario"
                ? "calendário / ritmo diário"
                : "ciclo biológico"}
            </AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-2">
              <span>
                Volume recomendado: {num(projection.recommendedTowersPerDay, 1)}{" "}
                torre(s)/dia
              </span>
              <Button size="sm" variant="secondary" onClick={applyRecommendedVolume}>
                <Sparkles className="mr-1 h-3.5 w-3.5" />
                Aplicar
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}
      </section>

      {/* 3. Torres */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          3 · Torres necessárias (ritmo {num(harvest.towersPerDay, 2)}/dia)
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {towers.phases.map(ph => (
            <Card key={ph.fase}>
              <CardContent className="space-y-1 p-4">
                <p className="text-xs text-muted-foreground">{ph.label}</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {ph.towersCeil}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    torres
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {num(ph.towersNeeded, 2)} exato · {ph.days} dias ·{" "}
                  {num(ph.floorsInPipeline, 1)} andares em fluxo
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Total sugerido: <strong>{towers.totalTowersCeil} torres</strong>. A
          maturação ({matTowersNeeded}) alimenta a projeção de faturamento
          automaticamente.
        </p>
      </section>

      {/* 4. Faturamento mensal */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          4 · Faturamento mês a mês ({year})
        </h2>
        <Card>
          <CardContent className="overflow-x-auto pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead className="text-right">Dias</TableHead>
                  <TableHead className="text-right">Torres colhidas</TableHead>
                  <TableHead className="text-right">Plantas líq.</TableHead>
                  <TableHead className="text-right">Produtos</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projection.months.map(m => (
                  <TableRow key={m.monthIndex}>
                    <TableCell className="font-medium">{m.label}</TableCell>
                    <TableCell className="text-right">{m.daysInMonth}</TableCell>
                    <TableCell className="text-right">{num(m.towersHarvested, 1)}</TableCell>
                    <TableCell className="text-right">{num(m.plantsNet)}</TableCell>
                    <TableCell className="text-right">{num(m.products)}</TableCell>
                    <TableCell className="text-right">{money(m.revenue)}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell className="font-semibold" colSpan={4}>
                    Total ano
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {num(projection.totals.products)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {money(projection.totals.revenue)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      {/* 5. Energia */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          5 · Energia do cenário
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tarifa e lâmpadas</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <Field label="R$/kWh">
                <DecimalInput
                  value={energy.tariffReaisPerKwh}
                  onChange={v => setE("tariffReaisPerKwh", v)}
                  fractionDigits={4}
                />
              </Field>
              <Field label="W / lâmpada">
                <DecimalInput
                  value={energy.lampWatts}
                  onChange={v => setE("lampWatts", v)}
                  integersOnly
                  fractionDigits={0}
                />
              </Field>
              <Field label="Lâmpadas/andar (M / V / Mat)">
                <div className="grid grid-cols-3 gap-1">
                  <DecimalInput
                    value={energy.lampsPerFloorMudas}
                    onChange={v => setE("lampsPerFloorMudas", v)}
                    integersOnly
                    fractionDigits={0}
                  />
                  <DecimalInput
                    value={energy.lampsPerFloorVegetativa}
                    onChange={v => setE("lampsPerFloorVegetativa", v)}
                    integersOnly
                    fractionDigits={0}
                  />
                  <DecimalInput
                    value={energy.lampsPerFloorMaturacao}
                    onChange={v => setE("lampsPerFloorMaturacao", v)}
                    integersOnly
                    fractionDigits={0}
                  />
                </div>
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
              <CardTitle className="text-base">Bombas (1 CV)</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Field label="Horas bomba / dia">
                <DecimalInput
                  value={energy.pumpHoursPerDay}
                  onChange={v => setE("pumpHoursPerDay", v)}
                  fractionDigits={1}
                />
              </Field>
              <Field label="Torres mat / bomba">
                <DecimalInput
                  value={energy.matTowersPerPump}
                  onChange={v => setE("matTowersPerPump", v)}
                  fractionDigits={1}
                />
              </Field>
              <Field label="Rendimento elétrico">
                <DecimalInput
                  value={energy.pumpEfficiency}
                  onChange={v => setE("pumpEfficiency", v)}
                  fractionDigits={2}
                />
              </Field>
              <p className="text-xs text-muted-foreground">
                1 bomba/torre em mudas e vegetativa; maturação conforme o campo acima.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Refrigeração</CardTitle>
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
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Field label="A condensadora / evaporadora">
                <div className="grid grid-cols-2 gap-1">
                  <DecimalInput
                    value={energy.condenserAmps}
                    onChange={v => setE("condenserAmps", v)}
                    integersOnly
                    fractionDigits={0}
                  />
                  <DecimalInput
                    value={energy.evaporatorAmps}
                    onChange={v => setE("evaporatorAmps", v)}
                    integersOnly
                    fractionDigits={0}
                  />
                </div>
              </Field>
              <Field label="Horas / dia">
                <DecimalInput
                  value={energy.refrigerationHoursPerDay}
                  onChange={v => setE("refrigerationHoursPerDay", v)}
                  fractionDigits={1}
                />
              </Field>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Custo de energia — {money(energyResult.costPerMonth)}/mês ·{" "}
              {num(energyResult.kwhPerMonth, 0)} kWh/mês
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">kWh/mês</TableHead>
                  <TableHead className="text-right">R$/mês</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {energyResult.lines.map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.label}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {num(l.qty, 1)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {num(l.kwhPerMonth, 1)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(l.costPerMonth)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell className="font-semibold" colSpan={2}>
                    Total
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {num(energyResult.kwhPerMonth, 1)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {money(energyResult.costPerMonth)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
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

function Stat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <div className="mt-0.5 text-muted-foreground">{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="truncate text-lg font-semibold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
