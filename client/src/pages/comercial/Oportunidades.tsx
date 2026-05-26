import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Sparkles,
  Target,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/comercial/ui/PageHeader";
import { TooltipInfo } from "@/components/comercial/ui/TooltipInfo";
import { comercialPath } from "@/lib/comercial/routes";
import { trpc } from "@/lib/trpc";

const LS_FILTERS = "fu_oportunidades_filtros_v1";

type FiltroLocal = {
  prioridade: "" | "ALTA" | "MEDIA" | "BAIXA";
  tipo: "" | "UPSELL" | "CROSS_SELL" | "REATIVACAO" | "NOVO_PRODUTO";
  clienteStatus: "ATIVOS" | "ATIVO" | "ESTRATEGICO" | "EM_RISCO" | "INATIVO" | "TODOS";
};

function loadFiltros(): FiltroLocal {
  const defaults: FiltroLocal = {
    prioridade: "",
    tipo: "",
    clienteStatus: "ATIVOS",
  };
  try {
    const raw = localStorage.getItem(LS_FILTERS);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

function prioridadeCor(p: string) {
  if (p === "ALTA")
    return "bg-[#FEF3C7] text-[#B45309] ring-1 ring-[#F59E0B]/40";
  if (p === "MEDIA")
    return "bg-[#EFF6FF] text-[#1E40AF] ring-1 ring-[#1E40AF]/20";
  return "bg-[#F3F4F6] text-[#374151] ring-1 ring-[#E5E7EB]";
}

function clienteStatusCor(status: string) {
  if (status === "ATIVO")
    return "bg-[#ECFDF5] text-[#047857] ring-1 ring-[#10B981]/30";
  if (status === "ESTRATEGICO")
    return "bg-[#EEF2FF] text-[#3730A3] ring-1 ring-[#6366F1]/25";
  if (status === "EM_RISCO")
    return "bg-[#FFFBEB] text-[#B45309] ring-1 ring-[#F59E0B]/35";
  return "bg-[#F3F4F6] text-[#6B7280] ring-1 ring-[#D1D5DB]";
}

function descricaoVisivel(texto: string) {
  return texto.replace(/^\[sistema\]\s*/i, "");
}

function fmtMoney(n: number | null | undefined) {
  return Number(n ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function fmtPct(n: number | null | undefined) {
  if (n == null) return "sem base";
  return `${n >= 0 ? "+" : ""}${Math.round(n * 100)}%`;
}

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
}

function barWidth(n: number | null | undefined) {
  return `${Math.min(100, Math.max(0, Number(n ?? 0)))}%`;
}

export function Oportunidades() {
  const [filtro, setFiltro] = useState<FiltroLocal>(loadFiltros);
  const [detalheId, setDetalheId] = useState<string | null>(null);
  useEffect(() => {
    localStorage.setItem(LS_FILTERS, JSON.stringify(filtro));
  }, [filtro]);

  const q = trpc.comercial.oportunidades.listar.useQuery({
    prioridade: filtro.prioridade || undefined,
    status: "ABERTA",
    clienteStatus: filtro.clienteStatus,
  });
  const detalhe = trpc.comercial.oportunidades.detalheAnalitico.useQuery(
    { oportunidadeId: detalheId ?? "" },
    { enabled: Boolean(detalheId) }
  );

  const gerar = trpc.comercial.oportunidades.criarRascunhoMensagem.useMutation({
    onSuccess: d => {
      toast.success(
        `Rascunho criado — abra Mensagens (${d.mensagemId.slice(0, 8)}…)`
      );
    },
    onError: e => toast.error(e.message),
  });

  const listaBase = q.data ?? [];
  const lista = useMemo(() => {
    let rows = [...listaBase];
    if (filtro.tipo)
      rows = rows.filter(o => o.tipoOportunidade === filtro.tipo);
    return rows.sort((a, b) => {
      const pa = a.prioridade === "ALTA" ? 3 : a.prioridade === "MEDIA" ? 2 : 1;
      const pb = b.prioridade === "ALTA" ? 3 : b.prioridade === "MEDIA" ? 2 : 1;
      return pb - pa;
    });
  }, [listaBase, filtro.tipo]);

  const [order, setOrder] = useState<string[]>([]);
  useEffect(() => {
    setOrder(prev => {
      const ids = lista.map(o => o.id);
      if (prev.length === 0) return ids;
      const merged = [
        ...prev.filter(id => ids.includes(id)),
        ...ids.filter(id => !prev.includes(id)),
      ];
      return merged;
    });
  }, [lista]);

  const orderedList = useMemo(() => {
    const map = new Map(lista.map(o => [o.id, o]));
    const out = order.map(id => map.get(id)).filter(Boolean) as typeof lista;
    return out.length ? out : lista;
  }, [lista, order]);

  const potencialTotal = useMemo(
    () => orderedList.reduce((acc, o) => acc + Number(o.valorEstimado ?? 0), 0),
    [orderedList]
  );

  const move = (id: string, dir: -1 | 1) => {
    setOrder(prev => {
      const base = prev.length ? [...prev] : lista.map(o => o.id);
      const i = base.indexOf(id);
      if (i < 0) return base;
      const j = i + dir;
      if (j < 0 || j >= base.length) return base;
      const next = [...base];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader
        title="Oportunidades"
        subtitle={
          <>
            Priorize upsell e cross-sell com base na Conta Azul. Arraste a ordem
            localmente para o time alinhar o dia.
            <TooltipInfo text="A ordem por arraste é salva só neste navegador; o backend continua com a prioridade cadastrada." />
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
            Prioridade
          </label>
          <select
            value={filtro.prioridade}
            onChange={e =>
              setFiltro(f => ({
                ...f,
                prioridade: e.target.value as FiltroLocal["prioridade"],
              }))
            }
            className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-sm font-medium text-[#111827] outline-none transition duration-200 focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/25"
          >
            <option value="">Todas</option>
            <option value="ALTA">Alta</option>
            <option value="MEDIA">Média</option>
            <option value="BAIXA">Baixa</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
            Tipo
          </label>
          <select
            value={filtro.tipo}
            onChange={e =>
              setFiltro(f => ({
                ...f,
                tipo: e.target.value as FiltroLocal["tipo"],
              }))
            }
            className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-sm font-medium text-[#111827] outline-none transition duration-200 focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/25"
          >
            <option value="">Todos</option>
            <option value="UPSELL">Upsell</option>
            <option value="CROSS_SELL">Cross-sell</option>
            <option value="REATIVACAO">Reativação</option>
            <option value="NOVO_PRODUTO">Novo produto</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
            Clientes
          </label>
          <select
            value={filtro.clienteStatus}
            onChange={e =>
              setFiltro(f => ({
                ...f,
                clienteStatus: e.target.value as FiltroLocal["clienteStatus"],
              }))
            }
            className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-sm font-medium text-[#111827] outline-none transition duration-200 focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/25"
          >
            <option value="ATIVOS">Ativos e estratégicos</option>
            <option value="ATIVO">Somente ativos</option>
            <option value="ESTRATEGICO">Somente estratégicos</option>
            <option value="EM_RISCO">Em risco</option>
            <option value="INATIVO">Inativos</option>
            <option value="TODOS">Todos</option>
          </select>
        </div>
        <Link
          href={comercialPath("/mensagens")}
          className="ml-auto inline-flex items-center gap-2 rounded-lg bg-[#1E40AF] px-4 py-2 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-[#1D4ED8] hover:shadow-[0_4px_12px_#00000020]"
        >
          Ir para mensagens
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-[#D1FAE5] bg-gradient-to-br from-[#ECFDF5] to-white p-4 shadow-[0_1px_3px_#00000014]">
          <div className="text-xs font-semibold uppercase tracking-wide text-[#047857]">
            Abertas no filtro
          </div>
          <div className="mt-1 text-3xl font-bold text-[#10B981]">
            {orderedList.length}
          </div>
        </div>
        <div className="rounded-lg border border-[#DBEAFE] bg-gradient-to-br from-[#EFF6FF] to-white p-4 shadow-[0_1px_3px_#00000014]">
          <div className="text-xs font-semibold uppercase tracking-wide text-[#1E40AF]">
            Potencial estimado
          </div>
          <div className="mt-1 text-2xl font-bold text-[#1E40AF]">
            {potencialTotal.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </div>
        </div>
        <div className="rounded-lg border border-[#FEF3C7] bg-gradient-to-br from-[#FFFBEB] to-white p-4 shadow-[0_1px_3px_#00000014]">
          <div className="text-xs font-semibold uppercase tracking-wide text-[#B45309]">
            Foco atual
          </div>
          <div className="mt-1 text-lg font-bold text-[#B45309]">
            {filtro.clienteStatus === "ATIVOS"
              ? "Ativos/estratégicos"
              : filtro.clienteStatus === "TODOS"
                ? "Todos os clientes"
                : filtro.clienteStatus.replace(/_/g, " ")}
          </div>
          <div className="mt-1 text-xs text-[#92400E]">
            Alta prioridade: {orderedList.filter(o => o.prioridade === "ALTA").length}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {orderedList.map((op, idx) => (
          <motion.article
            key={op.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.3) }}
            className="flex flex-col rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_3px_#00000014]"
          >
            <div className="flex items-start gap-2">
              <div className="flex flex-col gap-0.5 pt-0.5 text-[#9CA3AF]">
                <button
                  type="button"
                  className="rounded p-1 hover:bg-[#F3F4F6] hover:text-[#1E40AF]"
                  aria-label="Subir na lista"
                  onClick={() => move(op.id, -1)}
                >
                  <ChevronUp className="h-5 w-5" />
                </button>
                <GripVertical
                  className="mx-auto h-4 w-4 opacity-50"
                  aria-hidden
                />
                <button
                  type="button"
                  className="rounded p-1 hover:bg-[#F3F4F6] hover:text-[#1E40AF]"
                  aria-label="Descer na lista"
                  onClick={() => move(op.id, 1)}
                >
                  <ChevronDown className="h-5 w-5" />
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${prioridadeCor(op.prioridade)}`}
                  >
                    {op.prioridade}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#F3F4F6] px-2 py-0.5 text-xs font-semibold text-[#374151]">
                    <Target className="h-3.5 w-3.5 text-[#10B981]" />
                    {op.tipoOportunidade.replace(/_/g, " ")}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${clienteStatusCor(op.cliente.statusRelacionamento)}`}
                  >
                    {op.cliente.statusRelacionamento.replace(/_/g, " ")}
                  </span>
                </div>
                <h2 className="mt-2 text-lg font-bold text-[#111827]">
                  <Link
                    className="hover:text-[#1E40AF]"
                    href={`/comercial/clientes/${op.cliente.id}`}
                  >
                    {op.cliente.nome}
                  </Link>
                </h2>
                <div className="mt-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-[#6B7280]">
                    Ação sugerida
                  </div>
                  <p className="mt-1 line-clamp-4 text-sm leading-relaxed text-[#374151]">
                    {descricaoVisivel(op.descricao)}
                  </p>
                </div>
                {op.cliente.statusRelacionamento === "INATIVO" ? (
                  <p className="mt-2 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-xs font-semibold text-[#92400E]">
                    Cliente inativo: oculto no filtro padrão. Use apenas para revisão pontual.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs font-medium text-[#6B7280]">
                  Valor estimado
                </div>
                <div className="text-lg font-bold text-[#10B981]">
                  {op.valorEstimado != null
                    ? Number(op.valorEstimado).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })
                    : "—"}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-xs font-medium text-[#6B7280]">
                  Probabilidade
                  <TooltipInfo text="Estimativa interna para priorização; ajuste no CRM quando houver histórico suficiente." />
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#E5E7EB]">
                  <div
                    className="h-full rounded-full bg-[#1E40AF] transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Number(op.probabilidadeConversao ?? 0))}%`,
                    }}
                  />
                </div>
                <div className="mt-0.5 text-xs text-[#6B7280]">
                  {Number(op.probabilidadeConversao ?? 0).toFixed(0)}%
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 border-t border-[#F3F4F6] pt-4">
              <button
                type="button"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#1E40AF]/25 bg-[#EFF6FF] px-3 py-2.5 text-sm font-semibold text-[#1E40AF] shadow-sm transition duration-200 hover:bg-[#DBEAFE]"
                onClick={() => setDetalheId(op.id)}
              >
                <BarChart3 className="h-4 w-4" />
                Ver análise do score
              </button>
              <button
                type="button"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#10B981] px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-[#059669] hover:shadow-[0_4px_12px_#00000020] disabled:opacity-50"
                disabled={gerar.isPending}
                onClick={() => gerar.mutate({ oportunidadeId: op.id })}
              >
                <Sparkles className="h-4 w-4" />
                Gerar mensagem (ManyChat)
              </button>
            </div>
          </motion.article>
        ))}
      </div>

      {orderedList.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-12 text-center">
          <p className="text-[#6B7280]">
            Nenhuma oportunidade aberta com esses filtros.
          </p>
          <p className="mt-2 text-sm text-[#9CA3AF]">
            Sincronize pedidos e clientes ou ajuste as regras no backend.
          </p>
        </div>
      ) : null}

      <Dialog
        open={!!detalheId}
        onOpenChange={open => !open && setDetalheId(null)}
      >
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Análise da oportunidade</DialogTitle>
            <DialogDescription>
              Score, probabilidade e evidências comerciais usadas para priorizar
              o cliente.
            </DialogDescription>
          </DialogHeader>

          {detalhe.isLoading ? (
            <div className="rounded-xl border border-dashed border-[#E5E7EB] p-8 text-center text-sm text-[#6B7280]">
              Carregando análise comercial...
            </div>
          ) : detalhe.data ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-[#E5E7EB] bg-gradient-to-br from-white to-[#F9FAFB] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#6B7280]">
                      Cliente
                    </div>
                    <h3 className="mt-1 text-2xl font-bold text-[#111827]">
                      {detalhe.data.cliente.nome}
                    </h3>
                    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#4B5563]">
                      {detalhe.data.oportunidade.descricao.replace(
                        /^\[sistema\]\s*/,
                        ""
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${prioridadeCor(detalhe.data.oportunidade.prioridade)}`}
                    >
                      {detalhe.data.oportunidade.prioridade}
                    </span>
                    <span className="rounded-full bg-[#ECFDF5] px-3 py-1 text-xs font-bold text-[#047857]">
                      {detalhe.data.oportunidade.tipoOportunidade.replace(
                        /_/g,
                        " "
                      )}
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-4">
                  <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
                    <div className="text-xs font-semibold uppercase text-[#6B7280]">
                      Score cliente
                    </div>
                    <div className="mt-1 text-3xl font-bold text-[#1E40AF]">
                      {detalhe.data.score.valor ?? "—"}
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
                    <div className="text-xs font-semibold uppercase text-[#6B7280]">
                      Probabilidade
                    </div>
                    <div className="mt-1 text-3xl font-bold text-[#10B981]">
                      {detalhe.data.probabilidade.valor.toFixed(0)}%
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
                    <div className="text-xs font-semibold uppercase text-[#6B7280]">
                      Potencial
                    </div>
                    <div className="mt-1 text-2xl font-bold text-[#111827]">
                      {fmtMoney(detalhe.data.oportunidade.valorEstimado)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
                    <div className="text-xs font-semibold uppercase text-[#6B7280]">
                      Última compra
                    </div>
                    <div className="mt-1 text-2xl font-bold text-[#111827]">
                      {detalhe.data.sinais.diasSemCompra == null
                        ? "—"
                        : `${detalhe.data.sinais.diasSemCompra}d`}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
                  <h4 className="text-sm font-bold uppercase tracking-wide text-[#1E40AF]">
                    Por que esse score?
                  </h4>
                  <p className="mt-2 text-sm leading-relaxed text-[#4B5563]">
                    {detalhe.data.score.leitura}
                  </p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {detalhe.data.score.fatores.map(f => (
                      <div key={f.nome} className="rounded-lg bg-[#F9FAFB] p-3">
                        <div className="text-[11px] font-bold uppercase text-[#6B7280]">
                          {f.nome}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-[#111827]">
                          {f.valor}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
                  <h4 className="text-sm font-bold uppercase tracking-wide text-[#047857]">
                    Por que essa probabilidade?
                  </h4>
                  <p className="mt-2 text-sm leading-relaxed text-[#4B5563]">
                    {detalhe.data.probabilidade.leitura}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {detalhe.data.evidencias.map(e => (
                      <li
                        key={e}
                        className="rounded-lg border border-[#D1FAE5] bg-[#ECFDF5] px-3 py-2 text-sm text-[#065F46]"
                      >
                        {e}
                      </li>
                    ))}
                  </ul>
                </section>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
                  <h4 className="text-sm font-bold uppercase tracking-wide text-[#111827]">
                    Produtos que sustentam a análise
                  </h4>
                  <div className="mt-4 space-y-3">
                    {detalhe.data.mix.produtosTop.length === 0 ? (
                      <p className="text-sm text-[#6B7280]">
                        Sem itens suficientes para ranking de produtos.
                      </p>
                    ) : (
                      detalhe.data.mix.produtosTop.map(p => (
                        <div key={p.nome}>
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="font-semibold text-[#111827]">
                              {p.nome}
                            </span>
                            <span className="text-xs font-bold text-[#047857]">
                              {fmtMoney(p.valor)}
                            </span>
                          </div>
                          <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#E5E7EB]">
                            <div
                              className="h-full rounded-full bg-[#10B981]"
                              style={{
                                width: barWidth(p.participacaoValor * 100),
                              }}
                            />
                          </div>
                          <div className="mt-1 text-xs text-[#6B7280]">
                            {p.categoria ?? "Sem categoria"} ·{" "}
                            {p.quantidade.toFixed(0)} un. · {p.pedidos}{" "}
                            pedido(s)
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
                  <h4 className="text-sm font-bold uppercase tracking-wide text-[#111827]">
                    Categorias e mix
                  </h4>
                  <div className="mt-4 space-y-3">
                    {detalhe.data.mix.categoriasTop.length === 0 ? (
                      <p className="text-sm text-[#6B7280]">
                        Sem categorias suficientes para avaliar mix.
                      </p>
                    ) : (
                      detalhe.data.mix.categoriasTop.map(c => (
                        <div
                          key={c.nome}
                          className="rounded-lg border border-[#E5E7EB] p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-semibold text-[#111827]">
                              {c.nome}
                            </span>
                            <span className="text-sm font-bold text-[#1E40AF]">
                              {Math.round(c.participacaoValor * 100)}%
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-[#6B7280]">
                            {fmtMoney(c.valor)} · {c.quantidade.toFixed(0)} un.
                            · {c.pedidos} pedido(s)
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>

              <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
                <h4 className="text-sm font-bold uppercase tracking-wide text-[#111827]">
                  Últimos pedidos avaliados
                </h4>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {detalhe.data.ultimosPedidos.map(p => (
                    <div
                      key={p.id}
                      className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-[#111827]">
                          {fmtDate(p.dataPedido)}
                        </span>
                        <span className="font-bold text-[#047857]">
                          {fmtMoney(p.valorLiquido)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-[#6B7280]">
                        {p.statusPedido}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {p.itens.length === 0 ? (
                          <span className="text-xs text-[#9CA3AF]">
                            Sem itens detalhados
                          </span>
                        ) : (
                          p.itens.map(i => (
                            <span
                              key={`${p.id}-${i.produto}`}
                              className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-[#374151] ring-1 ring-[#E5E7EB]"
                            >
                              {i.produto} · {i.quantidade.toFixed(0)}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#E5E7EB] p-8 text-center text-sm text-[#6B7280]">
              Não foi possível carregar a análise.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
