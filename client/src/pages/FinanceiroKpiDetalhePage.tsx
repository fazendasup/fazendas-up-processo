import { Link, useParams, useSearch } from "wouter";
import { ArrowLeft } from "lucide-react";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  isDashboardKpiId,
  type DashboardKpiId,
} from "@shared/financeiroDashboardKpi";

function mesAtualYm(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

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

export default function FinanceiroKpiDetalhePage() {
  const params = useParams<{ kpi?: string }>();
  const search = useSearch();
  const qs = parseSearch(search);
  const mesYm =
    qs.mes && /^\d{4}-\d{2}$/.test(qs.mes) ? qs.mes : mesAtualYm();
  const kpiRaw = params.kpi ?? "";
  const kpiOk = isDashboardKpiId(kpiRaw);
  const kpi = (kpiOk ? kpiRaw : "entrou") as DashboardKpiId;

  const q = trpc.financeiroCfo.dashboardKpiDetalhe.useQuery(
    { mesYm, kpi },
    { enabled: kpiOk, staleTime: 30_000 },
  );

  const data = q.data;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto w-full max-w-[1100px] space-y-5 px-4 py-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/financeiro-cfo?mes=${mesYm}`}>
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Dashboard
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/financeiro-cfo/comparativo?mes=${mesYm}`}>
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
                Total: {fmtMoney(data.total)}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  · {data.linhas.length} linha(s)
                </span>
              </p>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Composição do número</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {data.linhas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma linha encontrada para este KPI.
                  </p>
                ) : (
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="py-2 pr-2 font-medium">Descrição</th>
                        <th className="py-2 pr-2 font-medium">Cliente / forn.</th>
                        <th className="py-2 pr-2 font-medium">Grupo</th>
                        <th className="py-2 pr-2 font-medium">Meta</th>
                        <th className="py-2 text-right font-medium">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.linhas.map(l => (
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
