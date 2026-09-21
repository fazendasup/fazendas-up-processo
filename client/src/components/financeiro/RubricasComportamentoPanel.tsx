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

function fmtMoney(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function labelComportamento(c: ComportamentoCusto): string {
  return c === "fixo" ? "Fixo" : "Variável";
}

export function RubricasComportamentoPanel({
  mesYm,
  readOnly = false,
}: {
  /** Mês âncora da projeção (AAAA-MM), igual à aba Projeção. */
  mesYm: string;
  readOnly?: boolean;
}) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<FiltroEfetivo>("todos");
  const [savingRubrica, setSavingRubrica] = useState<string | null>(null);
  const [novaRubrica, setNovaRubrica] = useState("");
  const [novaClassif, setNovaClassif] = useState<ComportamentoCusto>("fixo");

  const utils = trpc.useUtils();

  const q = trpc.financeiroCfo.listRubricasComportamento.useQuery(
    { mesYm },
    { staleTime: 30_000, retry: 1, enabled: /^\d{4}-\d{2}$/.test(mesYm) },
  );

  const dash = trpc.financeiroCfo.dashboard.useQuery(
    { granularidade: "mes", ref: mesYm },
    { staleTime: 60_000, retry: 1, enabled: /^\d{4}-\d{2}$/.test(mesYm) },
  );

  const cc = dash.data?.custosPorComportamento;

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
    let projetadoFixo = 0;
    let projetadoVariavel = 0;
    for (const r of rows) {
      if (r.efetivo === "fixo") {
        fixo += 1;
        projetadoFixo += r.projetado3m ?? 0;
      } else {
        variavel += 1;
        projetadoVariavel += r.projetado3m ?? 0;
      }
      if (r.editado) editados += 1;
    }
    return {
      fixo,
      variavel,
      editados,
      total: rows.length,
      projetadoFixo,
      projetadoVariavel,
    };
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

  function incluirNova() {
    if (readOnly) return;
    const nome = novaRubrica.trim();
    if (!nome) {
      toast.error("Informe o nome da rúbrica");
      return;
    }
    setSavingRubrica(nome);
    salvar.mutate(
      { rubrica: nome, comportamentoCusto: novaClassif },
      {
        onSuccess: () => {
          setNovaRubrica("");
          setFiltro("editados");
          setBusca(nome);
        },
      },
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 pb-2">
        <div>
          <CardTitle className="text-base">
            Custo fixo × variável
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Rúbricas das linhas da projeção (mesmo conjunto da aba Projeção —
            horizonte de 3 meses). Classifique cada uma como Fixo ou Variável.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {totais.total} rúbrica(s) · {totais.fixo} fixo (
            {fmtMoney(totais.projetadoFixo)}) · {totais.variavel} variável (
            {fmtMoney(totais.projetadoVariavel)})
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
        {cc ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Fixo no mês (dashboard)
              </p>
              <p className="text-lg font-semibold tabular-nums">
                {fmtMoney(cc.fixo.projetado)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {cc.pctFixoProjetado != null ? `${cc.pctFixoProjetado}% · ` : ""}
                pago {fmtMoney(cc.fixo.pago)} · aberto{" "}
                {fmtMoney(cc.fixo.naoPago)}
              </p>
            </div>
            <div className="rounded-lg border px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Variável no mês (dashboard)
              </p>
              <p className="text-lg font-semibold tabular-nums">
                {fmtMoney(cc.variavel.projetado)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {cc.pctVariavelProjetado != null
                  ? `${cc.pctVariavelProjetado}% · `
                  : ""}
                pago {fmtMoney(cc.variavel.pago)} · aberto{" "}
                {fmtMoney(cc.variavel.naoPago)}
              </p>
            </div>
          </div>
        ) : dash.isLoading ? (
          <p className="text-xs text-muted-foreground">
            Carregando totais do mês…
          </p>
        ) : null}

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

        {!readOnly ? (
          <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed px-3 py-2">
            <div className="min-w-[180px] flex-1">
              <label className="text-[11px] font-medium text-muted-foreground">
                Incluir rúbrica ausente
              </label>
              <Input
                className="h-8 text-sm"
                placeholder="Ex.: Aluguel"
                value={novaRubrica}
                onChange={e => setNovaRubrica(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") incluirNova();
                }}
              />
            </div>
            <Select
              value={novaClassif}
              onValueChange={v => setNovaClassif(v as ComportamentoCusto)}
            >
              <SelectTrigger size="sm" className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixo">Fixo</SelectItem>
                <SelectItem value="variavel">Variável</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="secondary"
              disabled={salvar.isPending}
              onClick={incluirNova}
            >
              Incluir
            </Button>
          </div>
        ) : null}

        {q.isError ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {q.error.message}
          </p>
        ) : null}

        {q.isLoading ? (
          <p className="py-6 text-sm text-muted-foreground">
            Carregando rúbricas da projeção…
          </p>
        ) : filtrados.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            Nenhuma rúbrica na projeção neste filtro. Abra a aba Projeção e
            confira as linhas marcadas.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[880px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2">Rúbrica</th>
                  <th className="px-3 py-2 text-right">Projetado 3m</th>
                  <th className="px-3 py-2 text-right">Linhas</th>
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
                      <td className="px-3 py-2 text-right text-xs tabular-nums text-muted-foreground">
                        {fmtMoney(r.projetado3m)}
                      </td>
                      <td className="px-3 py-2 text-right text-xs tabular-nums text-muted-foreground">
                        {r.qtdLinhas}
                      </td>
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
