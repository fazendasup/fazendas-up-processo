import { useMemo, useState, type ReactNode } from "react";
import { Download, FileBarChart, Info } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/comercial/ui/PageHeader";
import { PeriodoFiltro } from "@/components/comercial/ui/PeriodoFiltro";
import {
  hojeIsoLocal,
  intervaloDoPreset,
  labelPreset,
  type PeriodoPreset,
} from "@/lib/comercial/periodo";
import { trpc } from "@/lib/trpc";

const REPORTS = [
  { id: "vendas-cliente", label: "Vendas por cliente" },
  { id: "cmv", label: "CMV" },
  { id: "clientes-sem-vendas", label: "Clientes sem vendas" },
  { id: "lucro-margem", label: "Lucro e margem" },
  { id: "maiores-clientes", label: "Maiores clientes" },
  { id: "impostos", label: "Impostos" },
  { id: "clientes", label: "Relação de clientes" },
  { id: "vendas-detalhadas", label: "Vendas detalhadas" },
  { id: "produtos-vendidos", label: "Produtos vendidos" },
  { id: "servicos", label: "Serviços" },
  { id: "contratos", label: "Contratos" },
  { id: "orcamentos", label: "Orçamentos" },
  { id: "financeiro-servico", label: "Financeiro cliente/serviço" },
  { id: "vendas-mes", label: "Vendas por mês" },
  { id: "vendedores", label: "Vendas por vendedor" },
] as const;

type ReportId = (typeof REPORTS)[number]["id"];

function fmtMoney(n: number | null | undefined, digits = 2) {
  if (n == null) return "—";
  return Number(n).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: digits,
  });
}

function fmtNumber(n: number | null | undefined, digits = 0) {
  if (n == null) return "—";
  return Number(n).toLocaleString("pt-BR", { maximumFractionDigits: digits });
}

function fmtPct(n: number | null | undefined) {
  if (n == null) return "—";
  return `${(Number(n) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
}

function csvEscape(v: unknown) {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

function exportCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0] ?? {});
  const body = [
    headers.join(","),
    ...rows.map(row => headers.map(h => csvEscape(row[h])).join(",")),
  ].join("\n");
  const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function Section({
  title,
  description,
  children,
  rows,
}: {
  title: string;
  description: string;
  children: ReactNode;
  rows?: Record<string, unknown>[];
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-950 dark:text-slate-100">
            {title}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {description}
          </p>
        </div>
        {rows?.length ? (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-white/15 dark:bg-white/5 dark:text-slate-200"
            onClick={() =>
              exportCsv(`${title.toLowerCase().replace(/\s+/g, "-")}.csv`, rows)
            }
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-400/30 dark:bg-amber-950/20 dark:text-amber-200">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{children}</p>
    </div>
  );
}

function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
      {children}
    </div>
  );
}

export function Relatorios() {
  const [preset, setPreset] = useState<PeriodoPreset>("mes_atual");
  const [customInicio, setCustomInicio] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [customFim, setCustomFim] = useState(hojeIsoLocal);
  const [active, setActive] = useState<ReportId>("vendas-cliente");
  const [metricaCliente, setMetricaCliente] = useState<
    "valorBruto" | "valorLiquido" | "totalVendido" | "ticketMedio"
  >("valorBruto");
  const [metricaMes, setMetricaMes] = useState<
    "valorBruto" | "valorLiquido" | "frete" | "desconto"
  >("valorLiquido");
  const { inicio, fim } = useMemo(
    () => intervaloDoPreset(preset, { inicio: customInicio, fim: customFim }),
    [preset, customInicio, customFim]
  );
  const q = trpc.comercial.relatorios.resumo.useQuery(
    { inicio, fim },
    { staleTime: 30_000 }
  );
  const data = q.data;

  const topClientesChart = useMemo(
    () =>
      (data?.maioresClientes ?? []).slice(0, 12).map((r: any) => ({
        cliente:
          r.cliente.length > 18 ? `${r.cliente.slice(0, 18)}…` : r.cliente,
        valor: Number(r[metricaCliente] ?? 0),
      })),
    [data?.maioresClientes, metricaCliente]
  );

  return (
    <div className="space-y-6 p-4 lg:p-8">
      <PageHeader
        kicker="Relatórios"
        title="Relatórios comerciais"
        subtitle="Vendas, clientes, produtos, custos, margens e dados financeiros calculados a partir da Conta Azul sincronizada."
        actions={
          <PeriodoFiltro
            preset={preset}
            onPresetChange={setPreset}
            customInicio={customInicio}
            customFim={customFim}
            onCustomInicio={setCustomInicio}
            onCustomFim={setCustomFim}
          />
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {REPORTS.map(r => (
          <button
            key={r.id}
            type="button"
            className={[
              "rounded-full px-3 py-1.5 text-xs font-bold transition",
              active === r.id
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300",
            ].join(" ")}
            onClick={() => setActive(r.id)}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-400/25 dark:bg-emerald-950/20">
          <div className="text-xs font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
            Período
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
            {labelPreset(preset, { inicio: customInicio, fim: customFim })}
          </div>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-400/25 dark:bg-sky-950/20">
          <div className="text-xs font-bold uppercase tracking-wide text-sky-800 dark:text-sky-300">
            Vendas detalhadas
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {data?.vendasDetalhadas.length ?? "—"}
          </div>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-400/25 dark:bg-amber-950/20">
          <div className="text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300">
            Clientes
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {data?.clientes.length ?? "—"}
          </div>
        </div>
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-400/25 dark:bg-violet-950/20">
          <div className="text-xs font-bold uppercase tracking-wide text-violet-800 dark:text-violet-300">
            Produtos vendidos
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {data?.produtosVendidosDetalhados.length ?? "—"}
          </div>
        </div>
      </div>

      {q.isLoading ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
          Carregando relatórios...
        </div>
      ) : !data ? (
        <Notice>Não foi possível carregar os relatórios comerciais.</Notice>
      ) : (
        <>
          {active === "vendas-cliente" ? (
            <Section
              title="Análise das vendas por cliente"
              description="Produtos mais comprados por cliente no período, com quantidade de itens e valor bruto."
              rows={data.vendasPorCliente.map((r: any) => ({
                cliente: r.cliente,
                vendas: r.vendas,
                quantidadeItens: r.quantidadeItens,
                valorBruto: r.valorBruto,
                produtos: r.produtos
                  .map((p: any) => `${p.produto} (${fmtNumber(p.quantidade)})`)
                  .join(" | "),
              }))}
            >
              <Table>
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-white/10">
                  <thead className="bg-slate-50 dark:bg-white/5">
                    <tr>
                      <th className="px-3 py-2 text-left">Cliente</th>
                      <th className="px-3 py-2 text-right">Vendas</th>
                      <th className="px-3 py-2 text-right">Itens</th>
                      <th className="px-3 py-2 text-right">Valor bruto</th>
                      <th className="px-3 py-2 text-left">
                        Produtos mais comprados
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                    {data.vendasPorCliente.slice(0, 50).map((r: any) => (
                      <tr key={r.clienteId}>
                        <td className="px-3 py-2 font-semibold">{r.cliente}</td>
                        <td className="px-3 py-2 text-right">{r.vendas}</td>
                        <td className="px-3 py-2 text-right">
                          {fmtNumber(r.quantidadeItens)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {fmtMoney(r.valorBruto)}
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                          {r.produtos
                            .map(
                              (p: any) =>
                                `${p.produto} (${fmtNumber(p.quantidade)})`
                            )
                            .join(", ") || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Table>
            </Section>
          ) : null}

          {active === "cmv" ? (
            <Section
              title="Análise do custo da mercadoria vendida (CMV)"
              description="Custo médio, custo total, valor bruto e valor unitário médio por produto."
              rows={data.cmv.linhas}
            >
              {!data.disponibilidade.cmv ? (
                <Notice>
                  Os itens existem, mas custo unitário ainda não está preenchido
                  para calcular CMV real.
                </Notice>
              ) : null}
              <Table>
                <table className="mt-4 min-w-full divide-y divide-slate-200 text-sm dark:divide-white/10">
                  <thead className="bg-slate-50 dark:bg-white/5">
                    <tr>
                      <th className="px-3 py-2 text-left">Produto</th>
                      <th className="px-3 py-2 text-left">Categoria</th>
                      <th className="px-3 py-2 text-right">Qtd.</th>
                      <th className="px-3 py-2 text-right">Custo médio</th>
                      <th className="px-3 py-2 text-right">Custo total</th>
                      <th className="px-3 py-2 text-right">Valor bruto</th>
                      <th className="px-3 py-2 text-right">
                        Valor unit. médio
                      </th>
                      <th className="px-3 py-2 text-right">Margem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                    {data.cmv.linhas.slice(0, 80).map((r: any) => (
                      <tr key={r.produto}>
                        <td className="px-3 py-2 font-semibold">{r.produto}</td>
                        <td className="px-3 py-2">{r.categoria ?? "—"}</td>
                        <td className="px-3 py-2 text-right">
                          {fmtNumber(r.quantidade)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {fmtMoney(r.custoMedio)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {fmtMoney(r.custoTotal)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {fmtMoney(r.valorBruto)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {fmtMoney(r.valorUnitarioMedio)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {fmtPct(r.margemLucro)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Table>
            </Section>
          ) : null}

          {active === "clientes-sem-vendas" ? (
            <Section
              title="Clientes sem vendas há mais tempo"
              description="Clientes ordenados pelo maior tempo desde a última venda."
              rows={data.clientesSemVendas}
            >
              <Table>
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-white/10">
                  <thead className="bg-slate-50 dark:bg-white/5">
                    <tr>
                      <th className="px-3 py-2 text-left">Cliente</th>
                      <th className="px-3 py-2 text-left">Tipo</th>
                      <th className="px-3 py-2 text-left">Situação</th>
                      <th className="px-3 py-2 text-right">Última venda</th>
                      <th className="px-3 py-2 text-right">Dias</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                    {data.clientesSemVendas.slice(0, 100).map((r: any) => (
                      <tr key={r.id}>
                        <td className="px-3 py-2 font-semibold">{r.cliente}</td>
                        <td className="px-3 py-2">{r.tipo}</td>
                        <td className="px-3 py-2">{r.situacao}</td>
                        <td className="px-3 py-2 text-right">
                          {fmtDate(r.ultimaVenda)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {r.diasSemVenda ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Table>
            </Section>
          ) : null}

          {active === "lucro-margem" ? (
            <Section
              title="Gráfico de lucro bruto e margem por mês"
              description="Lucro bruto e margem mês a mês, considerando CMV quando disponível."
              rows={data.lucroMargemMes}
            >
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data.lucroMargemMes}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis yAxisId="left" />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tickFormatter={v => `${Math.round(Number(v) * 100)}%`}
                    />
                    <Tooltip
                      formatter={(v: any, name) =>
                        String(name).includes("margem")
                          ? fmtPct(v)
                          : fmtMoney(v)
                      }
                    />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="lucroBruto"
                      name="Lucro bruto"
                      fill="#10b981"
                    />
                    <Line
                      yAxisId="right"
                      dataKey="margemLucro"
                      name="Margem"
                      stroke="#1d4ed8"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Section>
          ) : null}

          {active === "maiores-clientes" ? (
            <Section
              title="Gráfico de maiores clientes"
              description="Compare clientes por valor bruto, valor líquido, total vendido ou ticket médio por venda."
              rows={data.maioresClientes}
            >
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {(
                  [
                    "valorBruto",
                    "valorLiquido",
                    "totalVendido",
                    "ticketMedio",
                  ] as const
                ).map(m => (
                  <button
                    key={m}
                    type="button"
                    className={`rounded-full px-3 py-1.5 text-xs font-bold ${metricaCliente === m ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-700"}`}
                    onClick={() => setMetricaCliente(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topClientesChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="cliente" />
                    <YAxis />
                    <Tooltip
                      formatter={(v: any) =>
                        metricaCliente === "totalVendido"
                          ? fmtNumber(v)
                          : fmtMoney(v)
                      }
                    />
                    <Bar dataKey="valor" fill="#0ea5e9" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Section>
          ) : null}

          {active === "impostos" ? (
            <Section
              title="Relatório de Impostos"
              description="Nota fiscal, valores e impostos por venda/serviço."
              rows={data.impostos.linhas}
            >
              <Notice>{data.impostos.observacao}</Notice>
            </Section>
          ) : null}

          {active === "clientes" ? (
            <Section
              title="Relação de clientes"
              description="Lista completa dos clientes cadastrados com dados básicos."
              rows={data.clientes}
            >
              <Table>
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-white/10">
                  <thead className="bg-slate-50 dark:bg-white/5">
                    <tr>
                      <th className="px-3 py-2 text-left">Nome</th>
                      <th className="px-3 py-2 text-left">Tipo</th>
                      <th className="px-3 py-2 text-left">Situação</th>
                      <th className="px-3 py-2 text-left">CNPJ/CPF</th>
                      <th className="px-3 py-2 text-left">Contato</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                    {data.clientes.map((r: any) => (
                      <tr key={r.id}>
                        <td className="px-3 py-2 font-semibold">{r.nome}</td>
                        <td className="px-3 py-2">{r.tipo}</td>
                        <td className="px-3 py-2">{r.situacao}</td>
                        <td className="px-3 py-2">{r.cnpjCpf ?? "—"}</td>
                        <td className="px-3 py-2">
                          {r.email ?? r.telefone ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Table>
            </Section>
          ) : null}

          {active === "vendas-detalhadas" ? (
            <Section
              title="Relação detalhada das vendas"
              description="Cliente, vendedor, data, valor bruto, líquido, frete e desconto aplicado."
              rows={data.vendasDetalhadas}
            >
              <Table>
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-white/10">
                  <thead className="bg-slate-50 dark:bg-white/5">
                    <tr>
                      <th className="px-3 py-2 text-left">Data</th>
                      <th className="px-3 py-2 text-left">Cliente</th>
                      <th className="px-3 py-2 text-left">Vendedor</th>
                      <th className="px-3 py-2 text-right">Bruto</th>
                      <th className="px-3 py-2 text-right">Líquido</th>
                      <th className="px-3 py-2 text-right">Frete</th>
                      <th className="px-3 py-2 text-right">Desconto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                    {data.vendasDetalhadas.slice(0, 150).map((r: any) => (
                      <tr key={r.id}>
                        <td className="px-3 py-2">{fmtDate(r.dataVenda)}</td>
                        <td className="px-3 py-2 font-semibold">{r.cliente}</td>
                        <td className="px-3 py-2">{r.vendedor}</td>
                        <td className="px-3 py-2 text-right">
                          {fmtMoney(r.valorBruto)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {fmtMoney(r.valorLiquido)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {fmtMoney(r.frete)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {fmtMoney(r.desconto)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Table>
            </Section>
          ) : null}

          {active === "produtos-vendidos" ? (
            <Section
              title="Relação detalhada de produtos vendidos"
              description="Produto, quantidade, valor total, cliente, data, tipo de item e desconto aplicado."
              rows={data.produtosVendidosDetalhados}
            >
              <Table>
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-white/10">
                  <thead className="bg-slate-50 dark:bg-white/5">
                    <tr>
                      <th className="px-3 py-2 text-left">Data</th>
                      <th className="px-3 py-2 text-left">Cliente</th>
                      <th className="px-3 py-2 text-left">Produto</th>
                      <th className="px-3 py-2 text-left">Tipo</th>
                      <th className="px-3 py-2 text-right">Qtd.</th>
                      <th className="px-3 py-2 text-right">Valor total</th>
                      <th className="px-3 py-2 text-right">Desconto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                    {data.produtosVendidosDetalhados
                      .slice(0, 200)
                      .map((r: any, idx: number) => (
                        <tr key={`${r.pedidoId}-${r.produto}-${idx}`}>
                          <td className="px-3 py-2">{fmtDate(r.dataVenda)}</td>
                          <td className="px-3 py-2 font-semibold">
                            {r.cliente}
                          </td>
                          <td className="px-3 py-2">{r.produto}</td>
                          <td className="px-3 py-2">{r.tipoItem}</td>
                          <td className="px-3 py-2 text-right">
                            {fmtNumber(r.quantidade)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {fmtMoney(r.valorTotal)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {fmtMoney(r.descontoAplicado)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </Table>
            </Section>
          ) : null}

          {active === "vendas-mes" ? (
            <Section
              title="Total de vendas por mês"
              description="Valor total vendido em cada mês, alternando entre bruto, líquido, frete e desconto."
              rows={data.vendasPorMes}
            >
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {(
                  ["valorBruto", "valorLiquido", "frete", "desconto"] as const
                ).map(m => (
                  <button
                    key={m}
                    type="button"
                    className={`rounded-full px-3 py-1.5 text-xs font-bold ${metricaMes === m ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700"}`}
                    onClick={() => setMetricaMes(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.vendasPorMes}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip formatter={(v: any) => fmtMoney(v)} />
                    <Bar dataKey={metricaMes} fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Section>
          ) : null}

          {active === "servicos" ? (
            <Section
              title="Relação detalhada de serviços prestados"
              description="Cliente, serviço, data, valor bruto, líquido e desconto aplicado."
              rows={data.servicosPrestados.linhas}
            >
              <Notice>{data.servicosPrestados.observacao}</Notice>
            </Section>
          ) : null}

          {active === "contratos" ? (
            <Section
              title="Situação dos Contratos"
              description="Contratos ativos ou encerrados, datas e valores em aberto/pagos/vencidos."
              rows={data.contratos.linhas}
            >
              <Notice>{data.contratos.observacao}</Notice>
            </Section>
          ) : null}

          {active === "orcamentos" ? (
            <Section
              title="Situação dos orçamentos"
              description="Orçamentos em andamento, cliente, data e valor bruto."
              rows={data.orcamentos}
            >
              <Table>
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-white/10">
                  <thead className="bg-slate-50 dark:bg-white/5">
                    <tr>
                      <th className="px-3 py-2 text-left">Data</th>
                      <th className="px-3 py-2 text-left">Cliente</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-right">Valor bruto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                    {data.orcamentos.map((r: any) => (
                      <tr key={r.id}>
                        <td className="px-3 py-2">
                          {fmtDate(r.dataOrcamento)}
                        </td>
                        <td className="px-3 py-2 font-semibold">{r.cliente}</td>
                        <td className="px-3 py-2">{r.status}</td>
                        <td className="px-3 py-2 text-right">
                          {fmtMoney(r.valorBruto)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Table>
            </Section>
          ) : null}

          {active === "financeiro-servico" ? (
            <Section
              title="Situação financeira por cliente e serviço"
              description="Valores em aberto, pagos e vencidos por cliente/serviço."
              rows={data.financeiraClienteServico.linhas}
            >
              <Notice>{data.financeiraClienteServico.observacao}</Notice>
            </Section>
          ) : null}

          {active === "vendedores" ? (
            <Section
              title="Análise das vendas por vendedor"
              description="Produtos/serviços vendidos por vendedor, valores e descontos."
              rows={data.vendasPorVendedor.linhas}
            >
              <Notice>{data.vendasPorVendedor.observacao}</Notice>
            </Section>
          ) : null}
        </>
      )}

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
        <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
          <FileBarChart className="h-4 w-4" />
          Observação de integridade
        </div>
        <p className="mt-1">
          Relatórios financeiros avançados dependem dos campos sincronizados.
          Impostos, contratos, serviços e vendedor aparecem como indisponíveis
          enquanto esses dados não estiverem persistidos na base comercial.
        </p>
      </div>
    </div>
  );
}
