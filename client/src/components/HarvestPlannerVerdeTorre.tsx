import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Coins,
  Leaf,
  Scale,
  Sparkles,
} from "lucide-react";
import {
  DEFAULT_HARVEST_PARAMS,
  recommendedTowersPerDay,
  simulateYear,
  type HarvestParams,
  type HarvestResult,
} from "@shared/harvest";
import { DecimalInput } from "@/components/custos/DecimalInput";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";

const DOW = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const STORAGE_KEY = "fazendas-up:verde-torre-planner:v1";

type StoredPlanner = {
  params: HarvestParams;
  year: number;
};

function readStoredPlanner(): StoredPlanner | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredPlanner>;
    if (!parsed || typeof parsed !== "object") return null;
    const year =
      typeof parsed.year === "number" && Number.isFinite(parsed.year)
        ? Math.round(parsed.year)
        : null;
    if (year == null || !parsed.params || typeof parsed.params !== "object") return null;
    return {
      year,
      params: { ...DEFAULT_HARVEST_PARAMS, ...parsed.params },
    };
  } catch {
    return null;
  }
}

function writeStoredPlanner(params: HarvestParams, year: number) {
  if (typeof window === "undefined") return;
  try {
    const payload: StoredPlanner = { params, year };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota / private mode */
  }
}

function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function num(n: number, digits = 0) {
  return n.toLocaleString("pt-BR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits > 0 ? Math.min(digits, 2) : 0,
  });
}

function bottleneckLabel(b: HarvestResult["bottleneck"]) {
  if (b === "calendario") return "Calendário / rotina diária";
  if (b === "ciclo") return "Ciclo biológico";
  return "Equilibrado";
}

type PrefillHint = {
  towersFromErp?: number;
  plantsPerTowerFromErp?: number;
  sourceLabel?: string;
};

export function HarvestPlannerVerdeTorre({
  prefill,
  initialYear = new Date().getFullYear(),
}: {
  prefill?: PrefillHint;
  initialYear?: number;
}) {
  const stored = useMemo(() => readStoredPlanner(), []);
  const [year, setYear] = useState(() => stored?.year ?? initialYear);
  const [params, setParams] = useState<HarvestParams>(() => ({
    ...DEFAULT_HARVEST_PARAMS,
    ...(stored?.params ?? {}),
  }));

  useEffect(() => {
    writeStoredPlanner(params, year);
  }, [params, year]);

  const applyErpTowers = () => {
    if (!prefill?.towersFromErp && !prefill?.plantsPerTowerFromErp) return;
    setParams(p => {
      const towers =
        prefill.towersFromErp && prefill.towersFromErp > 0
          ? prefill.towersFromErp
          : p.towers;
      const plantsPerTower =
        prefill.plantsPerTowerFromErp && prefill.plantsPerTowerFromErp > 0
          ? Math.round(prefill.plantsPerTowerFromErp)
          : p.plantsPerTower;
      return {
        ...p,
        towers,
        plantsPerTower,
        towersPerDay: recommendedTowersPerDay({
          towers,
          growthDays: p.growthDays,
          sanitizeHours: p.sanitizeHours,
          skipSaturday: p.skipSaturday,
        }),
      };
    });
  };

  const resetPadrao = () => {
    setParams({ ...DEFAULT_HARVEST_PARAMS });
    setYear(new Date().getFullYear());
  };

  const result = useMemo(() => simulateYear(params, year), [params, year]);

  const set = <K extends keyof HarvestParams>(key: K, value: HarvestParams[K]) => {
    setParams(p => ({ ...p, [key]: value }));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Valores ficam salvos neste navegador. Padrão operacional: 14 torres, 324
          plantas, perda 0%, 1 torre/dia, produto 100 g a R$ 7,59.
        </p>
        <div className="flex flex-wrap gap-2">
          {prefill?.sourceLabel ? (
            <Button type="button" size="sm" variant="secondary" onClick={applyErpTowers}>
              Usar torres do ERP
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="outline" onClick={resetPadrao}>
            Restaurar padrão
          </Button>
        </div>
      </div>
      {prefill?.sourceLabel ? (
        <p className="text-xs text-muted-foreground">
          ERP: {prefill.sourceLabel}. Não sobrescreve o que você já salvou — use o
          botão acima se quiser sincronizar torres/plantas.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Produção</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Field label="Torres em maturação">
              <DecimalInput
                value={params.towers}
                onChange={v => set("towers", v)}
                integersOnly
                fractionDigits={0}
              />
            </Field>
            <Field label="Plantas por torre">
              <DecimalInput
                value={params.plantsPerTower}
                onChange={v => set("plantsPerTower", v)}
                integersOnly
                fractionDigits={0}
              />
            </Field>
            <Field label="Perda máxima (%)">
              <DecimalInput
                value={params.lossPercent}
                onChange={v => set("lossPercent", v)}
                fractionDigits={1}
              />
            </Field>
            <Field label="Dias plantio → colheita">
              <DecimalInput
                value={params.growthDays}
                onChange={v => set("growthDays", v)}
                integersOnly
                fractionDigits={0}
              />
            </Field>
            <Field label="Sanitização pós-colheita (h)">
              <DecimalInput
                value={params.sanitizeHours}
                onChange={v => set("sanitizeHours", v)}
                integersOnly
                fractionDigits={0}
              />
            </Field>
            <Field label="Torres por dia (volume)">
              <DecimalInput
                value={params.towersPerDay}
                onChange={v => set("towersPerDay", v)}
                fractionDigits={1}
              />
            </Field>
            <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 sm:col-span-2">
              <Label htmlFor="skip-sat">Sem colheita no sábado</Label>
              <Switch
                id="skip-sat"
                checked={params.skipSaturday}
                onCheckedChange={v => set("skipSaturday", v)}
              />
            </div>
            <Field label="Ano da simulação">
              <Input
                type="number"
                value={year}
                onChange={e => setYear(Number(e.target.value) || year)}
                className="h-9"
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Comercialização</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Field label="Peso médio / planta (g)">
              <DecimalInput
                value={params.weightPerPlantG}
                onChange={v => set("weightPerPlantG", v)}
                fractionDigits={1}
              />
            </Field>
            <Field label="Peso do produto final (g)">
              <DecimalInput
                value={params.weightPerProductG}
                onChange={v => set("weightPerProductG", v)}
                fractionDigits={1}
              />
            </Field>
            <Field label="Preço R$ / produto">
              <DecimalInput
                value={params.salePrice}
                onChange={v => set("salePrice", v)}
                fractionDigits={2}
              />
            </Field>
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm sm:col-span-2">
              Ciclo operacional:{" "}
              <strong>{num(result.cycleDays, 2)} dias</strong> ({params.growthDays}d +{" "}
              {params.sanitizeHours}h)
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={<Coins className="h-4 w-4" />}
          label="Faturamento médio / mês"
          value={money(result.avgMonthlyRevenue)}
        />
        <Stat
          icon={<Leaf className="h-4 w-4" />}
          label="Produtos médios / mês"
          value={num(result.avgMonthlyProducts)}
        />
        <Stat
          icon={<Scale className="h-4 w-4" />}
          label="Total no ano (kg)"
          value={`${num(result.totals.kg, 1)} kg`}
        />
        <Stat
          icon={<Coins className="h-4 w-4" />}
          label="Faturamento no ano"
          value={money(result.totals.revenue)}
        />
      </div>

      <Alert
        variant={result.bottleneck === "equilibrado" ? "default" : "destructive"}
        className={
          result.bottleneck === "equilibrado"
            ? "border-emerald-300 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100"
            : undefined
        }
      >
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Gargalo: {bottleneckLabel(result.bottleneck)}</AlertTitle>
        <AlertDescription className="flex flex-wrap items-center gap-2">
          <span>
            Volume diário recomendado:{" "}
            <strong>{num(result.recommendedTowersPerDay, 1)} torre(s)/dia</strong> (
            {num(result.recommendedPlantsPerHarvestDay)} plantas/dia de colheita).
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => set("towersPerDay", result.recommendedTowersPerDay)}
          >
            <Sparkles className="mr-1 h-3.5 w-3.5" />
            Usar volume diário recomendado
          </Button>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ano {year} — produtos e receita</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead className="text-right">Dias</TableHead>
                <TableHead className="text-right">Torres</TableHead>
                <TableHead className="text-right">Plantas líq.</TableHead>
                <TableHead className="text-right">Produtos</TableHead>
                <TableHead className="text-right">Receita</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.months.map(m => (
                <TableRow key={m.monthIndex}>
                  <TableCell className="font-medium">{m.label}</TableCell>
                  <TableCell className="text-right">{m.daysInMonth}</TableCell>
                  <TableCell className="text-right">{num(m.towersHarvested, 1)}</TableCell>
                  <TableCell className="text-right">{num(m.plantsNet)}</TableCell>
                  <TableCell className="text-right">{num(m.products)}</TableCell>
                  <TableCell className="text-right">{money(m.revenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4" />
            Calendário — {result.months[result.referenceMonthIndex]?.label} {year}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {DOW.map(d => (
              <div key={d} className="font-medium text-muted-foreground">
                {d}
              </div>
            ))}
            {(() => {
              const first = result.calendar[0];
              const pad = first?.dayOfWeek ?? 0;
              const cells: ReactNode[] = [];
              for (let i = 0; i < pad; i++) {
                cells.push(<div key={`pad-${i}`} />);
              }
              for (const day of result.calendar) {
                const d = Number(day.date.slice(-2));
                cells.push(
                  <div
                    key={day.date}
                    className={`rounded-md border px-1 py-2 ${
                      !day.isHarvestDay
                        ? "bg-muted/40 text-muted-foreground"
                        : day.towersHarvested > 0
                          ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40"
                          : ""
                    }`}
                  >
                    <div className="font-medium">{d}</div>
                    <div>
                      {day.isHarvestDay ? (
                        day.towersHarvested > 0 ? (
                          <Badge variant="secondary" className="mt-0.5 text-[10px]">
                            {num(day.towersHarvested, 0)}t
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">folga</span>
                        )
                      ) : (
                        <span className="text-[10px]">—</span>
                      )}
                    </div>
                  </div>,
                );
              }
              return cells;
            })()}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Como chegamos nesses números</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
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
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
