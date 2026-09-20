import { useMemo } from "react";
import { Link, useParams, useSearch } from "wouter";
import { ArrowLeft } from "lucide-react";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ColumnFilterDef,
  useColumnTableFilters,
} from "@/lib/columnTableFilters";
import {
  isDashboardKpiId,
  type DashboardKpiId,
  type DashboardKpiLinha,
} from "@shared/financeiroDashboardKpi";
import {
  isDashboardGranularidade,
  refDefaultDashboard,
  type DashboardGranularidade,
} from "@shared/financeiroPeriodoDashboard";

function fmtMoney(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseSearch(search: string): Record<string, string> {
  const q = search.startsWith("?") ? search.slice(1) : search;
  const out: Record<string, string> = {};
  for (const part of q.split("&")) {
    if (!part) continue;
    const [k, v] = part.split("=");
    if (k) out[decodeURIComponent(k)] = decodeURIComponent(v ?? "");
  }
  return out;
}

const KPI_LINHAS_COLUMNS: ColumnFilterDef<DashboardKpiLinha>[] = [
  { key: "titulo", label: "Descrição", value: r => r.titulo },
  {
    key: "subtitulo",
    label: "Cliente / forn.",
    value: r => r.subtitulo || "—",
  },
  { key: "grupo", label: "Grupo", value: r => r.grupo || "—" },
  { key: "meta", label: "Meta", value: r => r.meta || "—" },
  {
    key: "valor",
    label: "Valor",
    value: r => r.valor,
    optionLabel: r => fmtMoney(r.valor),
  },
];

export default function FinanceiroKpiDetalhePage() {
  const params = useParams<{ kpi?: string }>();
  const search = useSearch();
  const qs = parseSearch(search);
  const granularidade: DashboardGranularidade =
    qs.g && isDashboardGranularidade(qs.g) ? qs.g : "mes";
  const ref =
    qs.ref && qs.ref.length >= 4
      ? qs.ref
      : qs.mes && /^\d{4}-\d{2}$/.test(qs.mes)
        ? qs.mes
        : refDefaultDashboard(granularidade);
  const kpiRaw = params.kpi ?? "";
  const kpiOk = isDashboardKpiId(kpiRaw);
  const kpi = (kpiOk ? kpiRaw : "entrou") as DashboardKpiId;

  const q = trpc.financeiroCfo.dashboardKpiDetalhe.useQuery(
    { granularidade, ref, kpi },
    { enabled: kpiOk, staleTime: 30_000 },
  );

  const data = q.data;
  const backHref = `/financeiro-cfo?g=${encodeURIComponent(granularidade)}&ref=${encodeURIComponent(ref)}`;

  const {
    hasColumnFilters,
    clearColumnFilters,
    filterAndSortRows,
    renderColumnHeader,
  } = useColumnTableFilters(`kpi-${kpi}`);

  const linhasFiltradas = useMemo(
    () => filterAndSortRows(data?.linhas ?? [], KPI_LINHAS_COLUMNS),
    [data?.linhas, filterAndSortRows],
  );

  const totalFiltrado = useMemo(
    () =>
      Math.round(
        linhasFiltradas.reduce((s, l) => s + (Number(l.valor) || 0), 0) * 100,
      ) / 100,
    [linhasFiltradas],
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto w-full max-w-[1100px] space-y-5 px-4 py-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="h-9 border-primary/40 font-semibold text-primary hover:bg-primary/10"
            asChild
          >
            <Link href={backHref}>
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Dashboard
            </Link>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-9 font-semibold"
            asChild
          >
            <Link
              href={`/financeiro-cfo/comparativo?mes=${encodeURIComponent(
                data?.mesYm ??
                  (granularidade === "mes" ? ref : ref.slice(0, 7)),
              )}`}
            >
              Comparativo
            </Link>
          </Button>
        </div>

        {!kpiOk ? (
          <p className="text-sm text-destructive">KPI inválido.</p>
        ) : q.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando detalhe…</p>
        ) : q.isError ? (
          <p className="text-sm text-destructive">
            {(q.error as { message?: string })?.message ||
              "Erro ao carregar detalhe."}
          </p>
        ) : data ? (
          <>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {data.labelMes}
              </p>
              <h1 className="text-2xl font-semibold tracking-tight">
                {data.titulo}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                {data.descricao}
              </p>
              <p className="mt-3 text-xl font-semibold tabular-nums">
                Total:{" "}
                {fmtMoney(hasColumnFilters ? totalFiltrado : data.total)}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  · {linhasFiltradas.length}
                  {hasColumnFilters ? ` de ${data.linhas.length}` : ""} linha(s)
                </span>
              </p>
            </div>

            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
                <CardTitle className="text-base">Composição do número</CardTitle>
                {hasColumnFilters ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearColumnFilters}
                  >
                    Limpar filtros
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {data.linhas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma linha encontrada para este KPI.
                  </p>
                ) : linhasFiltradas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum resultado com os filtros atuais.
                  </p>
                ) : (
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="py-2 pr-2 font-medium">
                          {renderColumnHeader(
                            "titulo",
                            "Descrição",
                            data.linhas,
                            KPI_LINHAS_COLUMNS,
                          )}
                        </th>
                        <th className="py-2 pr-2 font-medium">
                          {renderColumnHeader(
                            "subtitulo",
                            "Cliente / forn.",
                            data.linhas,
                            KPI_LINHAS_COLUMNS,
                          )}
                        </th>
                        <th className="py-2 pr-2 font-medium">
                          {renderColumnHeader(
                            "grupo",
                            "Grupo",
                            data.linhas,
                            KPI_LINHAS_COLUMNS,
                          )}
                        </th>
                        <th className="py-2 pr-2 font-medium">
                          {renderColumnHeader(
                            "meta",
                            "Meta",
                            data.linhas,
                            KPI_LINHAS_COLUMNS,
                          )}
                        </th>
                        <th className="py-2 text-right font-medium">
                          {renderColumnHeader(
                            "valor",
                            "Valor",
                            data.linhas,
                            KPI_LINHAS_COLUMNS,
                            "right",
                          )}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {linhasFiltradas.map(l => (
                        <tr
                          key={l.id}
                          className="border-b border-border/60 align-top"
                        >
                          <td className="py-2 pr-2 font-medium">{l.titulo}</td>
                          <td className="py-2 pr-2 text-muted-foreground">
                            {l.subtitulo || "—"}
                          </td>
                          <td className="py-2 pr-2 text-muted-foreground">
                            {l.grupo || "—"}
                          </td>
                          <td className="py-2 pr-2 text-muted-foreground">
                            {l.meta || "—"}
                          </td>
                          <td className="py-2 text-right tabular-nums font-medium">
                            {fmtMoney(l.valor)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </main>
    </div>
  );
}
