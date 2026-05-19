import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bot, MessageCircle, Package, Sparkles, User } from "lucide-react";
import { Link, useParams } from "wouter";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { CHART, ChartAreaUnderLineDefs, buildChartTheme, chartAnimation } from "@/components/comercial/charts";
import { PageHeader } from "@/components/comercial/ui/PageHeader";
import { TooltipInfo } from "@/components/comercial/ui/TooltipInfo";
import { fuTextMuted } from "@/lib/comercial/fuBrand";
import { trpc } from "@/lib/trpc";
import { useTheme } from "@/contexts/ThemeContext";

const GREEN = CHART.green.mid;
const ORANGE = "#F59E0B";

type Tab = "resumo" | "pedidos" | "interacoes" | "ia";

function parseTags(tags: unknown): string[] {
  if (Array.isArray(tags)) return tags.filter((t): t is string => typeof t === "string");
  return [];
}

type Cliente360Shape = {
  id: string;
  nome: string;
  tipo: string;
  cnpjCpf: string | null;
  emailPrincipal: string | null;
  telefoneWhatsapp: string | null;
  externalId: string | null;
  urlSite: string | null;
  urlInstagram: string | null;
  statusRelacionamento: string;
  scoreComercial: unknown;
  tags: unknown;
  oportunidades: Array<{ id: string; descricao: string; valorEstimado: unknown }>;
};

function Cliente360FichaDados({ cliente }: { cliente: Cliente360Shape }) {
  const tags = parseTags(cliente.tags);
  const fmtMoney = (n: unknown) =>
    typeof n === "object" && n != null && "toString" in n
      ? Number(n.toString()).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
      : "—";

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/40 dark:shadow-[0_1px_3px_rgba(0,0,0,0.35)]">
      <h3 className={`text-xs font-bold uppercase tracking-wide text-slate-800 dark:text-slate-400`}>Dados do cliente</h3>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div>
          <dt className={`${fuTextMuted} font-medium`}>CNPJ / CPF</dt>
          <dd className="font-medium text-slate-900 dark:text-slate-100">{cliente.cnpjCpf ?? "—"}</dd>
        </div>
        <div>
          <dt className={`${fuTextMuted} font-medium`}>E-mail</dt>
          <dd className="font-medium text-slate-900 dark:text-slate-100">{cliente.emailPrincipal ?? "—"}</dd>
        </div>
        <div>
          <dt className={`${fuTextMuted} font-medium`}>WhatsApp</dt>
          <dd className="font-medium text-slate-900 dark:text-slate-100">{cliente.telefoneWhatsapp ?? "—"}</dd>
        </div>
        <div>
          <dt className={`${fuTextMuted} font-medium`}>ID externo</dt>
          <dd className="font-mono text-xs font-medium text-slate-800 dark:text-slate-200">{cliente.externalId ?? "—"}</dd>
        </div>
        <div>
          <dt className={`${fuTextMuted} font-medium`}>Site</dt>
          <dd className="break-all font-medium text-slate-900 dark:text-slate-100">{cliente.urlSite ?? "—"}</dd>
        </div>
        <div>
          <dt className={`${fuTextMuted} font-medium`}>Instagram</dt>
          <dd className="break-all font-medium text-slate-900 dark:text-slate-100">{cliente.urlInstagram ?? "—"}</dd>
        </div>
        <div>
          <dt className={`${fuTextMuted} font-medium`}>Status</dt>
          <dd className="font-medium text-slate-900 dark:text-slate-100">
            {cliente.statusRelacionamento.replace(/_/g, " ")}
          </dd>
        </div>
        <div>
          <dt className={`${fuTextMuted} font-medium`}>Score</dt>
          <dd className="font-medium text-slate-900 dark:text-slate-100">
            {cliente.scoreComercial != null ? Number(cliente.scoreComercial).toFixed(0) : "—"}
          </dd>
        </div>
      </dl>
      {cliente.oportunidades?.length ? (
        <div className="mt-3 border-t border-slate-100 pt-3 dark:border-white/10">
          <div className={`text-xs font-semibold ${fuTextMuted}`}>Oportunidades (resumo)</div>
          <ul className="mt-1 space-y-1 text-sm">
            {cliente.oportunidades.slice(0, 3).map((o) => (
              <li key={o.id} className="flex flex-wrap justify-between gap-2">
                <span className="text-slate-700 dark:text-slate-300">
                  {o.descricao.length > 72 ? `${o.descricao.slice(0, 72)}…` : o.descricao}
                </span>
                <span className="shrink-0 font-semibold text-emerald-600 dark:text-emerald-400">{fmtMoney(o.valorEstimado)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {tags.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-white/10 dark:text-slate-300"
            >
              {t}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Cliente360() {
  const { id } = useParams();
  const clienteId = id ?? "";
  const { theme } = useTheme();
  const chart = useMemo(() => buildChartTheme(theme), [theme]);
  const { chartGridProps, chartAxisXProps, chartAxisYProps, chartTooltipProps, chartTooltipCursorLine } = chart;
  const lineActiveStroke = theme === "dark" ? "#0f172a" : "#ffffff";

  const [tab, setTab] = useState<Tab>("resumo");

  const q = trpc.comercial.clientes.obter360.useQuery({ id: clienteId }, { enabled: Boolean(clienteId) });

  const recalc = trpc.comercial.clientes.recalcularScore.useMutation({
    onSuccess: () => {
      toast.success("Score recalculado com base nos pedidos.");
      void q.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const seriePedidos = useMemo(() => {
    const pedidos = q.data?.cliente.pedidos ?? [];
    return [...pedidos]
      .sort((a, b) => new Date(a.dataPedido).getTime() - new Date(b.dataPedido).getTime())
      .map((p) => ({
        data: new Date(p.dataPedido).toISOString().slice(0, 10),
        valor: Number(p.valorTotal),
      }));
  }, [q.data?.cliente.pedidos]);

  if (!clienteId) return <div className="p-6 text-slate-500 dark:text-slate-400">Cliente inválido.</div>;
  if (q.isLoading)
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6 text-blue-800 dark:text-blue-300">
        Carregando visão 360º…
      </div>
    );
  if (!q.data) return <div className="p-6 text-rose-600 dark:text-rose-400">Cliente não encontrado.</div>;

  const { cliente } = q.data;
  const clienteFicha = cliente as Cliente360Shape;
  const score = cliente.scoreComercial ? Number(cliente.scoreComercial) : null;

  const tabs: { id: Tab; label: string; icon: typeof User }[] = [
    { id: "resumo", label: "Dados comerciais", icon: Package },
    { id: "pedidos", label: "Pedidos", icon: Package },
    { id: "interacoes", label: "Interações", icon: MessageCircle },
    { id: "ia", label: "IA (Manus)", icon: Bot },
  ];

  return (
    <div className="p-4 lg:p-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(240px,300px)_1fr]">
        <aside className="space-y-4">
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/50 dark:shadow-[0_1px_3px_rgba(0,0,0,0.35)]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
                <User className="h-8 w-8" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-slate-900 dark:text-slate-100">{cliente.nome}</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">{cliente.tipo}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-center">
              <div
                className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 text-center"
                style={{
                  borderColor: score != null && score >= 70 ? GREEN : score != null && score >= 40 ? ORANGE : "#E5E7EB",
                }}
              >
                <div>
                  <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Score</div>
                  <div className="text-2xl font-black text-blue-800 dark:text-blue-300">{score != null ? score.toFixed(0) : "—"}</div>
                </div>
              </div>
            </div>
            <div className="mt-2 flex justify-center text-xs text-slate-500 dark:text-slate-400">
              <TooltipInfo text="Score combina ticket, frequência e regras da Conta Azul — recalcule após novos pedidos." />
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <Link
                href="/mensagens"
                className="flex items-center justify-center gap-2 rounded-lg bg-[#10B981] px-3 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-[#059669] hover:shadow-[0_4px_12px_#00000020]"
              >
                <MessageCircle className="h-4 w-4" />
                Mensagem rápida
              </Link>
              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-blue-800 transition duration-200 hover:bg-blue-50 disabled:opacity-50 dark:border-white/15 dark:bg-slate-900/40 dark:text-blue-300 dark:hover:bg-white/5"
                disabled={recalc.isPending}
                onClick={() => recalc.mutate({ clienteId })}
              >
                <Sparkles className="h-4 w-4" />
                Atualizar score
              </button>
            </div>
          </motion.div>
        </aside>

        <div className="min-w-0 space-y-4">
          <PageHeader
            title="Visão comercial 360º"
            subtitle={
              <>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{cliente.nome}</span> —{" "}
                {cliente.statusRelacionamento.replace(/_/g, " ")} ·{" "}
                <Link className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400" href="/clientes">
                  Voltar à carteira
                </Link>
              </>
            }
          />

          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1 dark:border-slate-700/60">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`inline-flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-bold transition duration-200 ${
                    active
                      ? "bg-blue-800 text-white shadow-md dark:bg-blue-700"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="space-y-3">
            <Cliente360FichaDados cliente={clienteFicha} />
          </div>

          {tab === "resumo" ? (
            <section className="grid gap-4 lg:grid-cols-2">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/40 dark:shadow-[0_1px_3px_rgba(0,0,0,0.35)]"
              >
                <h3 className="text-lg font-bold text-blue-800 dark:text-blue-300">Histórico de compras</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Valores por pedido (Conta Azul)</p>
                <div className="mt-3 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={seriePedidos} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <ChartAreaUnderLineDefs prefix="c360-ped" colorMid={GREEN} />
                      <CartesianGrid {...chartGridProps} />
                      <XAxis dataKey="data" {...chartAxisXProps} minTickGap={28} />
                      <YAxis {...chartAxisYProps} tickFormatter={(v) => v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} />
                      <Tooltip {...chartTooltipProps} cursor={chartTooltipCursorLine} />
                      <Area
                        type="monotone"
                        dataKey="valor"
                        fill="url(#c360-ped-area)"
                        stroke="none"
                        isAnimationActive
                        animationDuration={400}
                      />
                      <Line
                        type="monotone"
                        dataKey="valor"
                        stroke={GREEN}
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 5, strokeWidth: 2, stroke: lineActiveStroke, fill: GREEN }}
                        {...chartAnimation}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/40 dark:shadow-[0_1px_3px_rgba(0,0,0,0.35)]"
              >
                <h3 className="text-lg font-bold text-blue-800 dark:text-blue-300">Oportunidades</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Abertas vinculadas a este cliente</p>
                {cliente.oportunidades.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Nenhuma oportunidade cadastrada.</p>
                ) : (
                  <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto text-sm">
                    {cliente.oportunidades.map((o) => (
                      <li
                        key={o.id}
                        className="rounded-lg border border-slate-100 bg-slate-50/90 p-2 dark:border-white/10 dark:bg-white/5"
                      >
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{o.tipoOportunidade.replace(/_/g, " ")}</div>
                        <div className="text-slate-600 dark:text-slate-400">{o.descricao}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </motion.div>
            </section>
          ) : null}

          {tab === "pedidos" ? (
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/40 dark:shadow-[0_1px_3px_rgba(0,0,0,0.35)]">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase text-slate-500 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Valor</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                  {cliente.pedidos.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        Nenhum pedido sincronizado para este cliente.
                      </td>
                    </tr>
                  ) : (
                    cliente.pedidos.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                        <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                          {new Date(p.dataPedido).toLocaleString("pt-BR")}
                        </td>
                        <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">
                          {Number(p.valorTotal).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{p.statusPedido}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : null}

          {tab === "interacoes" ? (
            <ul className="space-y-3">
              {cliente.interacoes.map((i) => (
                <li
                  key={i.id}
                  className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/40 dark:shadow-[0_1px_3px_rgba(0,0,0,0.35)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                      {i.tipoInteracao}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(i.dataInteracao).toLocaleString("pt-BR")}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{i.resumo ?? i.conteudoBruto?.slice(0, 280) ?? "—"}</p>
                </li>
              ))}
              {cliente.interacoes.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Sem interações registradas (ManyChat / equipe).</p>
              ) : null}
            </ul>
          ) : null}

          {tab === "ia" ? (
            <div className="rounded-lg border border-amber-200/90 bg-amber-50 p-6 text-sm text-amber-950 shadow-sm dark:border-amber-500/25 dark:bg-amber-950/30 dark:text-amber-100 dark:shadow-[0_1px_3px_rgba(0,0,0,0.35)]">
              <p>
                Fluxos qualitativos via Manus entram aqui após as regras estruturadas da Conta Azul — resumos criativos e
                conversas não estruturadas.
              </p>
              <p className="mt-2 text-xs opacity-90">
                Endpoint: <code className="rounded bg-white/90 px-1 dark:bg-black/30">manus.pipelineQualitativo</code>
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
