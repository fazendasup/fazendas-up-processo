import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  Lightbulb,
  LineChart,
  PiggyBank,
  RefreshCcw,
  Scale,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LABEL_SETOR_FINANCEIRO,
  type CriticidadeDesembolso,
} from "@shared/financeiroCfoInsights";

function isoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function inicioMesAtual(): string {
  const d = new Date();
  return isoLocal(new Date(d.getFullYear(), d.getMonth(), 1));
}

function hojeIso(): string {
  return isoLocal(new Date());
}

function fmtMoney(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "â€”";
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function severidadeClass(s: string): string {
  switch (s) {
    case "critica":
      return "border-red-300 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100";
    case "alta":
      return "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100";
    case "media":
      return "border-sky-300 bg-sky-50 text-sky-950 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100";
    default:
      return "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100";
  }
}

function criticidadeBadge(c: CriticidadeDesembolso): string {
  if (c === "essencial")
    return "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200";
  if (c === "negociavel")
    return "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200";
  return "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200";
}

export default function FinanceiroCfoPage() {
  const [inicio, setInicio] = useState(inicioMesAtual);
  const [fim, setFim] = useState(hojeIso);
  const [enabled, setEnabled] = useState(true);

  const queryInput = useMemo(
    () => ({
      inicio: new Date(`${inicio}T00:00:00`),
      fim: new Date(`${fim}T23:59:59`),
    }),
    [inicio, fim],
  );

  const analise = trpc.financeiroCfo.analise.useQuery(queryInput, {
    enabled,
    staleTime: 60_000,
    retry: 1,
  });

  const data = analise.data;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-6xl space-y-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Consultor financeiro
            </p>
            <h1 className="font-display text-2xl font-bold tracking-tight">
              AnÃ¡lise financeira (CFO)
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Fluxo de caixa Conta Azul, setores de desembolso, o que Ã©
              essencial vs o que dÃ¡ para segurar, dinheiro deixado na mesa e
              oportunidades de compra (preÃ§o / prazo / frete) com aÃ§Ãµes simples e
              complexas â€” pensado para operaÃ§Ã£o em prejuÃ­zo e recuperaÃ§Ã£o.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2 rounded-xl border bg-card p-3">
            <div>
              <Label className="text-xs">InÃ­cio</Label>
              <Input
                type="date"
                className="h-9 w-[150px]"
                value={inicio}
                onChange={e => setInicio(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Fim</Label>
              <Input
                type="date"
                className="h-9 w-[150px]"
                value={fim}
                onChange={e => setFim(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              className="h-9 gap-1"
              disabled={analise.isFetching}
              onClick={() => {
                setEnabled(true);
                void analise.refetch();
              }}
            >
              <RefreshCcw
                className={`h-3.5 w-3.5 ${analise.isFetching ? "animate-spin" : ""}`}
              />
              Atualizar
            </Button>
          </div>
        </div>

        {analise.isError ? (
          <Card className="border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
            <CardContent className="flex gap-2 p-4 text-sm text-red-900 dark:text-red-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">NÃ£o foi possÃ­vel carregar a anÃ¡lise</p>
                <p className="text-xs opacity-90">{analise.error.message}</p>
                <p className="mt-1 text-xs opacity-80">
                  Confirme OAuth Conta Azul em Comercial â†’ ConfiguraÃ§Ãµes e o
                  mÃ³dulo de custos ativo no projeto.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {analise.isLoading ? (
          <p className="text-sm text-muted-foreground">
            Buscando contas a pagar, a receber e saldos no Conta Azulâ€¦
          </p>
        ) : null}

        {data ? (
          <>
            {data.avisos?.length ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                {data.avisos.join(" Â· ")}
              </p>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi
                icon={<ArrowUpRight className="h-4 w-4 text-emerald-600" />}
                label="Entradas realizadas"
                value={fmtMoney(data.resumo.entradasRealizadas)}
              />
              <Kpi
                icon={<ArrowDownRight className="h-4 w-4 text-red-600" />}
                label="SaÃ­das realizadas"
                value={fmtMoney(data.resumo.saidasRealizadas)}
              />
              <Kpi
                icon={<Wallet className="h-4 w-4 text-sky-600" />}
                label="Saldo perÃ­odo (realizado)"
                value={fmtMoney(data.resumo.saldoPeriodoRealizado)}
                highlight={data.resumo.saldoPeriodoRealizado < 0 ? "bad" : "good"}
              />
              <Kpi
                icon={<PiggyBank className="h-4 w-4 text-violet-600" />}
                label="Economia / alÃ­vio potencial"
                value={fmtMoney(data.economiaPotencialEstimada)}
                highlight="good"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Kpi
                icon={<Banknote className="h-4 w-4" />}
                label="A receber em aberto"
                value={fmtMoney(data.resumo.aReceberEmAberto)}
              />
              <Kpi
                icon={<Scale className="h-4 w-4" />}
                label="A pagar em aberto"
                value={fmtMoney(data.resumo.aPagarEmAberto)}
              />
              <Kpi
                icon={<LineChart className="h-4 w-4" />}
                label="Saldo contas CA"
                value={fmtMoney(data.saldoContasTotal)}
              />
            </div>

            <Tabs defaultValue="consultor" className="space-y-4">
              <TabsList className="flex h-auto flex-wrap">
                <TabsTrigger value="consultor">Consultor / aÃ§Ãµes</TabsTrigger>
                <TabsTrigger value="fluxo">Fluxo de caixa</TabsTrigger>
                <TabsTrigger value="setores">Setores</TabsTrigger>
                <TabsTrigger value="compras">Oportunidades de compra</TabsTrigger>
                <TabsTrigger value="titulos">TÃ­tulos em aberto</TabsTrigger>
              </TabsList>

              <TabsContent value="consultor" className="space-y-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Lightbulb className="h-4 w-4" />
                      Plano de recuperaÃ§Ã£o e melhoria
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Priorizado por gravidade. Cada insight traz aÃ§Ã£o rÃ¡pida e,
                      quando fizer sentido, movimento estrutural.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(data.insights ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Sem alertas no perÃ­odo â€” revise o intervalo ou sync do
                        Conta Azul.
                      </p>
                    ) : (
                      data.insights.map(ins => (
                        <div
                          key={ins.id}
                          className={`rounded-xl border p-3 ${severidadeClass(ins.severidade)}`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">
                                {ins.severidade} Â· {ins.tipo}
                                {ins.setor
                                  ? ` Â· ${LABEL_SETOR_FINANCEIRO[ins.setor]}`
                                  : ""}
                              </p>
                              <p className="font-semibold">{ins.titulo}</p>
                            </div>
                            {ins.impactoEstimado != null &&
                            ins.impactoEstimado > 0 ? (
                              <span className="rounded-full bg-background/70 px-2 py-0.5 text-xs font-semibold">
                                ~{fmtMoney(ins.impactoEstimado)}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm opacity-90">{ins.analise}</p>
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            <div className="rounded-lg bg-background/60 p-2 text-xs">
                              <p className="font-bold">AÃ§Ã£o simples</p>
                              <p>{ins.acaoSimples}</p>
                            </div>
                            {ins.acaoComplexa ? (
                              <div className="rounded-lg bg-background/60 p-2 text-xs">
                                <p className="font-bold">AÃ§Ã£o complexa</p>
                                <p>{ins.acaoComplexa}</p>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <div className="grid gap-3 md:grid-cols-3">
                  <ResumoCrit
                    titulo="Essencial (nÃ£o cortar)"
                    valor={data.resumo.aPagarEssencialEmAberto}
                    hint="Folha, energia, insumos, aluguel, impostos"
                  />
                  <ResumoCrit
                    titulo="NegociÃ¡vel (alongar / cotar)"
                    valor={data.resumo.aPagarNegociavelEmAberto}
                    hint="Terceiros, frete, embalagens, manutenÃ§Ã£o"
                  />
                  <ResumoCrit
                    titulo="AdiÃ¡vel (segurar agora)"
                    valor={data.resumo.aPagarAdiavelEmAberto}
                    hint="Marketing e extras â€” primeiro a pausar"
                  />
                </div>
              </TabsContent>

              <TabsContent value="fluxo" className="space-y-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Fluxo por semana</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Previsto = vencimentos Â· Realizado = pagamentos/recebimentos
                      no Conta Azul.
                    </p>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                          <th className="px-2 py-2">Semana</th>
                          <th className="px-2 py-2">Entradas prev.</th>
                          <th className="px-2 py-2">SaÃ­das prev.</th>
                          <th className="px-2 py-2">Saldo prev.</th>
                          <th className="px-2 py-2">Entradas real.</th>
                          <th className="px-2 py-2">SaÃ­das real.</th>
                          <th className="px-2 py-2">Saldo real.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data.fluxoSemanas ?? []).map(s => (
                          <tr key={s.inicioSemana} className="border-b">
                            <td className="px-2 py-2 font-medium">
                              {s.inicioSemana.split("-").reverse().join("/")}
                            </td>
                            <td className="px-2 py-2 tabular-nums">
                              {fmtMoney(s.entradasPrevistas)}
                            </td>
                            <td className="px-2 py-2 tabular-nums">
                              {fmtMoney(s.saidasPrevistas)}
                            </td>
                            <td
                              className={`px-2 py-2 font-semibold tabular-nums ${
                                s.saldoLiquidoPrevisto < 0
                                  ? "text-red-700"
                                  : "text-emerald-700"
                              }`}
                            >
                              {fmtMoney(s.saldoLiquidoPrevisto)}
                            </td>
                            <td className="px-2 py-2 tabular-nums">
                              {fmtMoney(s.entradasRealizadas)}
                            </td>
                            <td className="px-2 py-2 tabular-nums">
                              {fmtMoney(s.saidasRealizadas)}
                            </td>
                            <td
                              className={`px-2 py-2 font-semibold tabular-nums ${
                                s.saldoLiquidoRealizado < 0
                                  ? "text-red-700"
                                  : "text-emerald-700"
                              }`}
                            >
                              {fmtMoney(s.saldoLiquidoRealizado)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(data.fluxoSemanas ?? []).length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">
                        Sem lanÃ§amentos no perÃ­odo.
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="setores" className="space-y-3">
                <div className="grid gap-3 lg:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        Desembolso por setor
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {(data.setores ?? []).map(s => (
                        <div
                          key={s.setor}
                          className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{s.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {s.qtd} tÃ­tulo(s) Â· {s.pctDoDesembolso}%
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold tabular-nums">
                              {fmtMoney(s.total)}
                            </p>
                            <span
                              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase ${criticidadeBadge(s.criticidade)}`}
                            >
                              {s.criticidade}
                            </span>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        Top fornecedores
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {(data.fornecedores ?? []).slice(0, 12).map(f => (
                        <div
                          key={f.nome}
                          className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{f.nome}</p>
                            <p className="text-xs text-muted-foreground">
                              {LABEL_SETOR_FINANCEIRO[f.setor]} Â·{" "}
                              {f.pctDoDesembolso}%
                            </p>
                          </div>
                          <p className="shrink-0 font-semibold tabular-nums">
                            {fmtMoney(f.total)}
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="compras" className="space-y-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ShoppingCart className="h-4 w-4" />
                      Oportunidades de compra
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Comparativo interno no Conta Azul (mesmo setor /
                      fornecedores). NÃ£o consulta marketplaces externos â€” use
                      como roteiro de cotaÃ§Ã£o (preÃ§o, prazo, frete).
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(data.oportunidadesCompra ?? []).length === 0 ? (
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        Sem anomalias claras de ticket/concentraÃ§Ã£o no perÃ­odo.
                      </p>
                    ) : (
                      data.oportunidadesCompra.map(op => (
                        <div
                          key={op.id}
                          className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900 dark:bg-emerald-950/20"
                        >
                          <div className="flex flex-wrap justify-between gap-2">
                            <p className="font-semibold">{op.titulo}</p>
                            {op.economiaPotencialEstimada != null ? (
                              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
                                Potencial ~{fmtMoney(op.economiaPotencialEstimada)}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {op.motivo}
                          </p>
                          <p className="mt-2 text-xs">
                            <span className="font-semibold">AÃ§Ã£o:</span> {op.acao}
                          </p>
                          {op.fornecedoresComparados.length ? (
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              Comparar: {op.fornecedoresComparados.join(" Â· ")}
                            </p>
                          ) : null}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="titulos" className="space-y-3">
                <div className="grid gap-3 lg:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        Maior a receber em aberto
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {(data.topReceberEmAberto ?? []).map(t => (
                        <TituloRow
                          key={t.id}
                          nome={t.contraparte || t.descricao}
                          extra={t.dataVencimento}
                          valor={t.valorEmAberto}
                        />
                      ))}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        Maior a pagar em aberto
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {(data.topPagarEmAberto ?? []).map(t => (
                        <TituloRow
                          key={t.id}
                          nome={t.contraparte || t.descricao}
                          extra={`${LABEL_SETOR_FINANCEIRO[t.setor]} Â· ${t.criticidade}${t.dataVencimento ? ` Â· ${t.dataVencimento}` : ""}`}
                          valor={t.valorEmAberto}
                          badge={t.criticidade}
                        />
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>

            <p className="text-[11px] text-muted-foreground">
              {data.contagens.parcelasReceber} parcela(s) a receber Â·{" "}
              {data.contagens.parcelasPagar} a pagar Â· perÃ­odo {data.periodo.inicio}{" "}
              â†’ {data.periodo.fim}
              {data.ultimaSyncContaAzul
                ? ` Â· Ãºltima sync CA ${new Date(data.ultimaSyncContaAzul).toLocaleString("pt-BR")}`
                : ""}
            </p>
          </>
        ) : null}
      </main>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  highlight,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  highlight?: "good" | "bad";
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <div className="mt-0.5">{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p
            className={`text-lg font-bold tabular-nums ${
              highlight === "bad"
                ? "text-red-700 dark:text-red-300"
                : highlight === "good"
                  ? "text-emerald-700 dark:text-emerald-300"
                  : ""
            }`}
          >
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ResumoCrit({
  titulo,
  valor,
  hint,
}: {
  titulo: string;
  valor: number;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {titulo}
        </p>
        <p className="text-xl font-bold tabular-nums">{fmtMoney(valor)}</p>
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function TituloRow({
  nome,
  extra,
  valor,
  badge,
}: {
  nome: string;
  extra?: string | null;
  valor: number;
  badge?: CriticidadeDesembolso;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
      <div className="min-w-0">
        <p className="truncate font-medium">{nome}</p>
        {extra ? (
          <p className="truncate text-[11px] text-muted-foreground">{extra}</p>
        ) : null}
      </div>
      <div className="shrink-0 text-right">
        <p className="font-semibold tabular-nums">{fmtMoney(valor)}</p>
        {badge ? (
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase ${criticidadeBadge(badge)}`}
          >
            {badge}
          </span>
        ) : null}
      </div>
    </div>
  );
}

