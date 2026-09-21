import { useMemo, useState } from "react";
import { RefreshCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ComportamentoCusto } from "@shared/financeiroRubricaComportamento";

type FiltroEfetivo = "todos" | "fixo" | "variavel" | "editados";

function labelComportamento(c: ComportamentoCusto): string {
  return c === "fixo" ? "Fixo" : "Variável";
}

export function RubricasComportamentoPanel({
  inicio,
  fim,
  readOnly = false,
}: {
  inicio: string;
  fim: string;
  readOnly?: boolean;
}) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<FiltroEfetivo>("todos");
  const [savingRubrica, setSavingRubrica] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const queryInput = useMemo(
    () => ({
      inicio: new Date(`${inicio}T00:00:00`),
      fim: new Date(`${fim}T23:59:59`),
    }),
    [inicio, fim],
  );

  const q = trpc.financeiroCfo.listRubricasComportamento.useQuery(queryInput, {
    staleTime: 30_000,
    retry: 1,
  });

  const salvar = trpc.financeiroCfo.salvarRubricaComportamento.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.financeiroCfo.listRubricasComportamento.invalidate(),
        utils.financeiroCfo.dashboard.invalidate(),
        utils.financeiroCfo.analise.invalidate(),
      ]);
      toast.success("Classificação salva");
    },
    onError: err => toast.error(err.message),
    onSettled: () => setSavingRubrica(null),
  });

  const rows = q.data ?? [];
  const filtrados = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return rows.filter(r => {
      if (b && !r.rubrica.toLowerCase().includes(b)) return false;
      if (filtro === "fixo" && r.efetivo !== "fixo") return false;
      if (filtro === "variavel" && r.efetivo !== "variavel") return false;
      if (filtro === "editados" && !r.editado) return false;
      return true;
    });
  }, [rows, busca, filtro]);

  const totais = useMemo(() => {
    let fixo = 0;
    let variavel = 0;
    let editados = 0;
    for (const r of rows) {
      if (r.efetivo === "fixo") fixo += 1;
      else variavel += 1;
      if (r.editado) editados += 1;
    }
    return { fixo, variavel, editados, total: rows.length };
  }, [rows]);

  function onChange(
    rubrica: string,
    value: "auto" | ComportamentoCusto,
  ) {
    if (readOnly) return;
    setSavingRubrica(rubrica);
    salvar.mutate({
      rubrica,
      comportamentoCusto: value === "auto" ? null : value,
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 pb-2">
        <div>
          <CardTitle className="text-base">
            Custo fixo × variável
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Classificação usada no mapa de ação do dashboard. Por padrão o
            sistema sugere; você pode forçar Fixo ou Variável por rúbrica.
            “Automático” volta à heurística.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {totais.fixo} fixo · {totais.variavel} variável
            {totais.editados > 0 ? ` · ${totais.editados} editado(s)` : ""}
            {filtrados.length !== totais.total
              ? ` · exibindo ${filtrados.length}`
              : ""}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1"
          disabled={q.isFetching}
          onClick={() => void q.refetch()}
        >
          <RefreshCcw
            className={`h-3.5 w-3.5 ${q.isFetching ? "animate-spin" : ""}`}
          />
          Atualizar
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 pl-8 text-sm"
              placeholder="Buscar rúbrica…"
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>
          <Select
            value={filtro}
            onValueChange={v => setFiltro(v as FiltroEfetivo)}
          >
            <SelectTrigger size="sm" className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="fixo">Só fixo</SelectItem>
              <SelectItem value="variavel">Só variável</SelectItem>
              <SelectItem value="editados">Só editados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {q.isError ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {q.error.message}
          </p>
        ) : null}

        {q.isLoading ? (
          <p className="py-6 text-sm text-muted-foreground">
            Carregando rúbricas…
          </p>
        ) : filtrados.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            Nenhuma rúbrica neste filtro. Ajuste o mês no topo ou a busca.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2">Rúbrica</th>
                  <th className="px-3 py-2">Sugestão</th>
                  <th className="px-3 py-2">Classificação</th>
                  <th className="px-3 py-2">Efetivo</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(r => {
                  const selectValue =
                    r.comportamentoCusto === "fixo" ||
                    r.comportamentoCusto === "variavel"
                      ? r.comportamentoCusto
                      : "auto";
                  const busy = savingRubrica === r.rubrica && salvar.isPending;
                  return (
                    <tr
                      key={r.rubrica}
                      className="border-b last:border-0 hover:bg-muted/20"
                    >
                      <td className="px-3 py-2 font-medium">{r.rubrica}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {labelComportamento(r.heuristico)}
                      </td>
                      <td className="px-3 py-2">
                        <Select
                          value={selectValue}
                          disabled={readOnly || busy}
                          onValueChange={v =>
                            onChange(
                              r.rubrica,
                              v as "auto" | ComportamentoCusto,
                            )
                          }
                        >
                          <SelectTrigger size="sm" className="w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">
                              Automático
                            </SelectItem>
                            <SelectItem value="fixo">Fixo</SelectItem>
                            <SelectItem value="variavel">Variável</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge
                            variant={
                              r.efetivo === "fixo" ? "default" : "secondary"
                            }
                            className="text-[10px]"
                          >
                            {labelComportamento(r.efetivo)}
                          </Badge>
                          {r.editado ? (
                            <Badge
                              variant="outline"
                              className="text-[10px]"
                            >
                              editado
                            </Badge>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
