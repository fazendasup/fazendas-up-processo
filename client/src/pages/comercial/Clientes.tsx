import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarClock,
  Filter,
  Lightbulb,
  MessageSquare,
  Search,
  ShoppingBag,
  Sparkles,
  Target,
  UserPlus,
} from "lucide-react";
import { Link, useLocation } from "wouter"; import { useSearchParams } from "@/hooks/useSearchParams";
import { toast } from "sonner";
import { PageHeader } from "@/components/comercial/ui/PageHeader";
import { TooltipInfo } from "@/components/comercial/ui/TooltipInfo";
import { comercialPath } from "@/lib/comercial/routes";
import { trpc } from "@/lib/trpc";

function badgeStatus(s: string) {
  if (s === "ATIVO") return "bg-[#ECFDF5] text-[#047857] ring-[#10B981]/40";
  if (s === "EM_RISCO") return "bg-[#FEF2F2] text-[#B91C1C] ring-red-200";
  if (s === "ESTRATEGICO") return "bg-[#EFF6FF] text-[#1E40AF] ring-[#1E40AF]/25";
  if (s === "INATIVO") return "bg-[#F3F4F6] text-[#6B7280] ring-[#E5E7EB]";
  return "bg-[#F3F4F6] text-[#374151]";
}

function prioridadeStyle(p: string) {
  if (p === "ALTA") return "bg-[#FEF3C7] text-[#B45309] ring-[#F59E0B]/50";
  if (p === "MEDIA") return "bg-[#EFF6FF] text-[#1E40AF] ring-[#1E40AF]/30";
  return "bg-[#F3F4F6] text-[#4B5563] ring-[#E5E7EB]";
}

function parseTags(tags: unknown): string[] {
  if (Array.isArray(tags)) return tags.filter((t): t is string => typeof t === "string");
  return [];
}

const TIPOS_CLIENTE = [
  { value: "RESTAURANTE", label: "Restaurante" },
  { value: "PLANO_ASSINATURA", label: "Plano de assinatura" },
  { value: "SUPERMERCADO", label: "Supermercado" },
  { value: "AVULSO", label: "Avulso" },
  { value: "OUTROS", label: "Outros" },
] as const;
const CLIENTES_PAGE_SIZE = 40;
const CLIENTES_MAX_LIMIT = 240;

type TipoClienteComercial = (typeof TIPOS_CLIENTE)[number]["value"];

function labelTipoCliente(tipo: string): string {
  return TIPOS_CLIENTE.find((t) => t.value === tipo)?.label ?? tipo.replace(/_/g, " ");
}

function freshNovoCliente() {
  return {
    nome: "",
    tipo: "RESTAURANTE" as TipoClienteComercial,
    cnpjCpf: "",
    telefoneWhatsapp: "",
    emailPrincipal: "",
    statusRelacionamento: "ATIVO" as "ATIVO" | "INATIVO" | "EM_RISCO" | "ESTRATEGICO",
  };
}

export function Clientes() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [searchParams] = useSearchParams();
  const buscaInicial = searchParams.get("busca") ?? "";
  const filtroRisco = searchParams.get("filtro") === "risco";

  const [busca, setBusca] = useState(buscaInicial);
  const [tipo, setTipo] = useState<"" | TipoClienteComercial>("");
  const [status, setStatus] = useState<"" | "ATIVO" | "INATIVO" | "EM_RISCO" | "ESTRATEGICO">("");
  const [limite, setLimite] = useState(CLIENTES_PAGE_SIZE);
  const [modalNovo, setModalNovo] = useState(false);
  const [novo, setNovo] = useState(() => freshNovoCliente());

  const criar = trpc.comercial.clientes.criar.useMutation({
    onSuccess: (data) => {
      toast.success(`Cliente "${data.nome}" cadastrado.`);
      setModalNovo(false);
      setNovo(freshNovoCliente());
      void utils.comercial.clientes.listarCarteira.invalidate();
      void utils.comercial.clientes.listar.invalidate();
      navigate(`/comercial/clientes/${data.id}`);
    },
    onError: (e) => toast.error(e.message ?? "Não foi possível criar o cliente."),
  });

  const atualizarTipo = trpc.comercial.clientes.atualizarTipo.useMutation({
    onSuccess: (data) => {
      toast.success(`Categoria de "${data.nome}" atualizada para ${labelTipoCliente(data.tipo)}.`);
      void utils.comercial.clientes.listarCarteira.invalidate();
      void utils.comercial.clientes.listar.invalidate();
      void utils.comercial.dashboard.resumo.invalidate();
    },
    onError: (e) => toast.error(e.message ?? "Não foi possível atualizar a categoria."),
  });

  useEffect(() => {
    setBusca(buscaInicial);
  }, [buscaInicial]);

  const [debouncedBusca, setDebouncedBusca] = useState(busca);
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedBusca(busca), 300);
    return () => window.clearTimeout(t);
  }, [busca]);

  useEffect(() => {
    setLimite(CLIENTES_PAGE_SIZE);
  }, [debouncedBusca, tipo, status, filtroRisco]);

  const q = trpc.comercial.clientes.listarCarteira.useQuery({
    busca: debouncedBusca.trim() || undefined,
    tipo: tipo || undefined,
    statusRelacionamento: filtroRisco ? "EM_RISCO" : status || undefined,
    limite,
  });

  const linhas = useMemo(() => q.data ?? [], [q.data]);
  const mediaScore = useMemo(() => {
    const withScore = linhas.filter((c) => c.scoreComercial != null);
    if (!withScore.length) return 0;
    return withScore.reduce((a, c) => a + Number(c.scoreComercial), 0) / withScore.length;
  }, [linhas]);

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader
        title="Carteira de clientes"
        subtitle={
          <>
            Cada cartão reúne sinais comerciais, histórico recente de pedidos e oportunidades abertas — antes de abrir o
            360º.
            <TooltipInfo text="Dados de pedidos vêm da Conta Azul; oportunidades são as abertas (upsell/cross-sell)." />
          </>
        }
        actions={
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-[#10B981] px-4 py-2 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-[#059669] hover:shadow-[0_4px_12px_#00000020]"
            onClick={() => setModalNovo(true)}
          >
            <UserPlus className="h-4 w-4" />
            Adicionar cliente
          </button>
        }
      />

      {q.isError ? (
        <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-4 text-sm text-[#991B1B]">
          <p className="font-bold">Erro ao carregar clientes</p>
          <p className="mt-1">{q.error?.message ?? "Erro desconhecido"}</p>
          {(q.error?.message ?? "").includes("autenticado") || (q.error?.message ?? "").includes("UNAUTHORIZED") ? (
            <p className="mt-2">Sua sessão pode ter expirado — faça login de novo.</p>
          ) : (
            <p className="mt-2">
              Confira se a API está no ar e se o banco está acessível. Suba o MySQL (ex.:{" "}
              <code className="rounded bg-white px-1">docker compose up -d</code>) e reinicie a API.
            </p>
          )}
        </div>
      ) : null}

      {filtroRisco ? (
        <div className="rounded-lg border border-[#F59E0B]/40 bg-[#FFFBEB] px-4 py-3 text-sm font-semibold text-[#B45309]">
          Filtro ativo: clientes em risco (via dashboard).{" "}
          <Link className="text-[#1E40AF] underline" href={comercialPath("/clientes")}>
            Limpar
          </Link>
        </div>
      ) : null}

      {!filtroRisco ? (
        <div className="rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3 text-sm text-[#1E3A8A]">
          <span className="font-semibold">10 clientes de teste</span> (histórico ~3 meses, compras semanais) — busque{" "}
          <Link className="font-bold text-[#10B981] underline" href={comercialPath("/clientes", { busca: "carteira" })}>
            carteira
          </Link>
          ,{" "}
          <Link className="font-bold text-[#10B981] underline" href={comercialPath("/clientes", { busca: "teste" })}>
            teste
          </Link>{" "}
          ou{" "}
          <Link className="font-bold text-[#10B981] underline" href={comercialPath("/clientes", { busca: "Mercado" })}>
            Mercado
          </Link>
          . Rode o seed se a lista vier vazia:{" "}
          <code className="rounded bg-white px-1.5 py-0.5 text-xs text-[#111827]">pnpm comercial:seed</code>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_3px_#00000014] lg:flex-row lg:flex-wrap lg:items-end">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1E40AF]/60" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar nome ou CNPJ/CPF…"
            className="w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] py-2 pl-10 pr-3 text-sm text-[#111827] outline-none transition duration-200 focus:border-[#10B981] focus:bg-white focus:ring-2 focus:ring-[#10B981]/25"
            aria-label="Buscar clientes"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-[#6B7280]" aria-hidden />
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as typeof tipo)}
            className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-sm font-medium text-[#111827] outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/25"
            aria-label="Tipo de cliente"
          >
            <option value="">Tipo: todos</option>
            {TIPOS_CLIENTE.map((row) => (
              <option key={row.value} value={row.value}>
                {row.label}
              </option>
            ))}
          </select>
          <select
            value={filtroRisco ? "EM_RISCO" : status}
            onChange={(e) => {
              if (filtroRisco) return;
              setStatus(e.target.value as typeof status);
            }}
            disabled={filtroRisco}
            className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-sm font-medium text-[#111827] outline-none disabled:opacity-60 focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/25"
            aria-label="Status do relacionamento"
          >
            <option value="">Status: todos</option>
            <option value="ATIVO">Ativo</option>
            <option value="EM_RISCO">Em risco</option>
            <option value="ESTRATEGICO">Estratégico</option>
            <option value="INATIVO">Inativo</option>
          </select>
        </div>
      </div>

      {q.isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-96 animate-pulse rounded-lg border border-[#E5E7EB] bg-gradient-to-br from-[#F3F4F6] to-white"
            />
          ))}
        </div>
      ) : null}

      {!q.isLoading && linhas.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-12 text-center text-[#6B7280]">
          <p>Nenhum cliente com esses filtros.</p>
          <p className="mt-3 text-sm">
            Para carregar o cliente de teste com histórico, no diretório da API execute:{" "}
            <code className="rounded bg-[#E5E7EB] px-2 py-1 text-[#111827]">npm run db:seed</code>
          </p>
          <p className="mt-2 text-sm">
            Depois abra{" "}
            <Link className="font-semibold text-[#1E40AF] underline" href={comercialPath("/clientes", { busca: "teste" })}>
              /clientes?busca=teste
            </Link>
            .
          </p>
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
        {!q.isLoading
          ? linhas.map((c, i) => {
              const sc = c.scoreComercial ? Number(c.scoreComercial) : null;
              const acimaMedia = sc != null && mediaScore > 0 && sc >= mediaScore;
              const tags = parseTags(c.tags);

              return (
                <motion.article
                  key={c.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.4) }}
                  className="flex flex-col rounded-lg border border-[#E5E7EB] bg-white shadow-[0_2px_8px_#0000000d] transition duration-200 hover:border-[#10B981]/40 hover:shadow-[0_8px_24px_#00000014]"
                >
                  <div className="border-b border-[#F3F4F6] bg-gradient-to-r from-[#EFF6FF]/80 to-white px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/comercial/clientes/${c.id}`}
                          className="text-lg font-bold leading-tight text-[#1E40AF] transition hover:text-[#10B981] hover:underline"
                        >
                          {c.nome}
                        </Link>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <label className="inline-flex items-center gap-1 rounded-full bg-[#F3F4F6] px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-[#4B5563]">
                            <span className="sr-only">Classificação comercial</span>
                            <select
                              value={c.tipo}
                              onChange={(e) =>
                                atualizarTipo.mutate({
                                  clienteId: c.id,
                                  tipo: e.target.value as TipoClienteComercial,
                                })
                              }
                              disabled={atualizarTipo.isPending}
                              className="max-w-[10rem] bg-transparent text-xs font-semibold uppercase tracking-wide outline-none"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {TIPOS_CLIENTE.map((row) => (
                                <option key={row.value} value={row.value}>
                                  {row.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${badgeStatus(c.statusRelacionamento)}`}
                          >
                            {c.statusRelacionamento.replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>
                      <div
                        className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full border-2 text-center"
                        style={{
                          borderColor:
                            sc == null ? "#E5E7EB" : sc >= 70 ? "#10B981" : sc >= 40 ? "#F59E0B" : "#E5E7EB",
                        }}
                      >
                        <span className="text-[10px] font-bold uppercase text-[#6B7280]">Score</span>
                        <span className={`text-lg font-black ${acimaMedia ? "text-[#10B981]" : "text-[#111827]"}`}>
                          {sc != null ? sc.toFixed(0) : "—"}
                        </span>
                      </div>
                    </div>
                    {tags.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {tags.slice(0, 4).map((t) => (
                          <span
                            key={t}
                            className="rounded-md bg-[#ECFDF5] px-2 py-0.5 text-[11px] font-medium text-[#047857]"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 gap-3 border-b border-[#F3F4F6] px-5 py-4 sm:grid-cols-4">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wide text-[#9CA3AF]">Ticket mensal</div>
                      <div className="mt-0.5 text-sm font-bold text-[#10B981]">
                        {c.resumo.ticketMedio != null
                          ? c.resumo.ticketMedio.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                              maximumFractionDigits: 0,
                            })
                          : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wide text-[#9CA3AF]">Faturamento</div>
                      <div className="mt-0.5 text-sm font-bold text-[#111827]">
                        {c.resumo.totalPedidos > 0
                          ? c.resumo.valorTotal.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                              maximumFractionDigits: 0,
                            })
                          : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wide text-[#9CA3AF]">Pedidos</div>
                      <div className="mt-0.5 text-sm font-bold text-[#1E40AF]">{c.resumo.totalPedidos}</div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[#9CA3AF]">
                        Última compra
                        <TooltipInfo text="Data do pedido mais recente sincronizado (Conta Azul)." />
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-sm font-semibold text-[#374151]">
                        <CalendarClock className="h-3.5 w-3.5 shrink-0 text-[#6B7280]" />
                        {c.resumo.ultimaCompra
                          ? new Date(c.resumo.ultimaCompra).toLocaleDateString("pt-BR")
                          : "—"}
                      </div>
                      {c.resumo.diasDesdeUltimaCompra != null ? (
                        <div className="text-xs text-[#6B7280]">há {c.resumo.diasDesdeUltimaCompra} dias</div>
                      ) : null}
                    </div>
                  </div>

                  <div className="border-b border-[#F3F4F6] px-5 py-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#1E40AF]">
                      <Lightbulb className="h-4 w-4 text-[#F59E0B]" />
                      Insights
                    </div>
                    {c.insights.length === 0 ? (
                      <p className="text-sm text-[#6B7280]">Nenhum alerta automático — relacionamento estável.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {c.insights.map((text, idx) => (
                          <li key={idx} className="flex gap-2 text-sm leading-snug text-[#374151]">
                            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" />
                            <span>{text}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="border-b border-[#F3F4F6] px-5 py-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#1E40AF]">
                      <ShoppingBag className="h-4 w-4 text-[#10B981]" />
                      Últimos pedidos
                    </div>
                    {c.ultimosPedidos.length === 0 ? (
                      <p className="text-sm text-[#6B7280]">Sem pedidos sincronizados.</p>
                    ) : (
                      <ul className="space-y-2">
                        {c.ultimosPedidos.map((p) => (
                          <li
                            key={p.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-[#F9FAFB] px-3 py-2 text-sm"
                          >
                            <span className="text-[#6B7280]">
                              {new Date(p.dataPedido).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                            <span className="font-bold text-[#111827]">
                              {p.valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </span>
                            <span className="w-full text-xs text-[#9CA3AF] sm:w-auto">{p.statusPedido}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="border-b border-[#F3F4F6] px-5 py-4">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#1E40AF]">
                        <Target className="h-4 w-4 text-[#F59E0B]" />
                        Oportunidades
                        {c.oportunidadesAbertas > 0 ? (
                          <span className="rounded-full bg-[#FFFBEB] px-2 py-0.5 text-[11px] font-bold text-[#B45309]">
                            {c.oportunidadesAbertas} aberta(s)
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {c.oportunidades.length === 0 ? (
                      <p className="text-sm text-[#6B7280]">Nenhuma oportunidade em aberto para este cliente.</p>
                    ) : (
                      <ul className="space-y-3">
                        {c.oportunidades.map((o) => (
                          <li key={o.id} className="rounded-lg border border-[#E5E7EB] bg-[#FFFBEB]/40 p-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ${prioridadeStyle(o.prioridade)}`}
                              >
                                {o.prioridade}
                              </span>
                              <span className="text-xs font-semibold text-[#374151]">
                                {o.tipoOportunidade.replace(/_/g, " ")}
                              </span>
                              {o.valorEstimado != null ? (
                                <span className="ml-auto text-sm font-bold text-[#10B981]">
                                  {o.valorEstimado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#4B5563]">{o.descricaoResumo}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="px-5 py-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#1E40AF]">
                      <MessageSquare className="h-4 w-4 text-[#1E40AF]" />
                      Última interação
                    </div>
                    {c.ultimaInteracao ? (
                      <div className="rounded-lg border border-[#DBEAFE] bg-[#EFF6FF]/50 p-3 text-sm">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B7280]">
                          <span className="font-semibold text-[#1E40AF]">{c.ultimaInteracao.tipoInteracao}</span>
                          <span>·</span>
                          <span>{new Date(c.ultimaInteracao.dataInteracao).toLocaleString("pt-BR")}</span>
                        </div>
                        <p className="mt-2 line-clamp-3 text-[#374151]">{c.ultimaInteracao.resumo ?? "—"}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-[#6B7280]">Sem interações registradas ainda.</p>
                    )}
                  </div>

                  <div className="mt-auto flex flex-wrap gap-2 border-t border-[#F3F4F6] bg-[#FAFAFA] px-5 py-4">
                    <Link
                      href={`/comercial/clientes/${c.id}`}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#10B981] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition duration-200 hover:bg-[#059669] hover:shadow-[0_4px_12px_#00000020]"
                    >
                      Abrir visão 360º
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href={comercialPath("/oportunidades")}
                      className="inline-flex items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-semibold text-[#1E40AF] transition duration-200 hover:bg-[#EFF6FF]"
                    >
                      Oportunidades
                    </Link>
                  </div>
                </motion.article>
              );
            })
          : null}
      </div>

      {!q.isLoading && linhas.length > 0 && linhas.length >= limite && limite < CLIENTES_MAX_LIMIT ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setLimite((prev) => Math.min(CLIENTES_MAX_LIMIT, prev + CLIENTES_PAGE_SIZE))}
            className="rounded-lg border border-[#BFDBFE] bg-white px-5 py-2.5 text-sm font-bold text-[#1E40AF] shadow-sm transition hover:border-[#10B981]/60 hover:bg-[#ECFDF5] hover:text-[#047857]"
          >
            Mais clientes
          </button>
        </div>
      ) : null}

      {!q.isLoading && linhas.length > 0 ? (
        <p className="text-sm text-[#6B7280]">
          Exibindo <span className="font-semibold text-[#111827]">{linhas.length}</span> clientes
          {mediaScore > 0 ? (
            <>
              {" "}
              · média de score nesta página:{" "}
              <span className="font-semibold text-[#1E40AF]">{mediaScore.toFixed(1)}</span>
            </>
          ) : null}
        </p>
      ) : null}

      <Dialog
        open={modalNovo}
        onClose={() => {
          if (!criar.isPending) setModalNovo(false);
        }}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px]" aria-hidden />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-[#E5E7EB] bg-white p-6 shadow-xl">
            <DialogTitle className="text-xl font-bold text-[#1E40AF]">Novo cliente</DialogTitle>
            <p className="mt-1 text-sm text-[#6B7280]">
              Cadastro manual na base. Depois você pode sincronizar com a Conta Azul ou vincular o ID externo.
            </p>
            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                criar.mutate({
                  nome: novo.nome.trim(),
                  tipo: novo.tipo,
                  cnpjCpf: novo.cnpjCpf.trim() || undefined,
                  telefoneWhatsapp: novo.telefoneWhatsapp.trim() || undefined,
                  emailPrincipal: novo.emailPrincipal.trim() || "",
                  statusRelacionamento: novo.statusRelacionamento,
                });
              }}
            >
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-[#6B7280]">Nome *</span>
                <input
                  required
                  minLength={2}
                  value={novo.nome}
                  onChange={(e) => setNovo((s) => ({ ...s, nome: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/25"
                  placeholder="Ex.: Restaurante Sabor do Sítio"
                  autoComplete="organization"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-[#6B7280]">Tipo *</span>
                <select
                  value={novo.tipo}
                  onChange={(e) => setNovo((s) => ({ ...s, tipo: e.target.value as typeof novo.tipo }))}
                  className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/25"
                >
                  {TIPOS_CLIENTE.map((row) => (
                    <option key={row.value} value={row.value}>
                      {row.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-[#6B7280]">CNPJ / CPF</span>
                  <input
                    value={novo.cnpjCpf}
                    onChange={(e) => setNovo((s) => ({ ...s, cnpjCpf: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/25"
                    placeholder="Opcional"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-[#6B7280]">WhatsApp</span>
                  <input
                    value={novo.telefoneWhatsapp}
                    onChange={(e) => setNovo((s) => ({ ...s, telefoneWhatsapp: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/25"
                    placeholder="+55…"
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-[#6B7280]">E-mail</span>
                <input
                  type="email"
                  value={novo.emailPrincipal}
                  onChange={(e) => setNovo((s) => ({ ...s, emailPrincipal: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/25"
                  placeholder="Opcional"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-[#6B7280]">Status inicial</span>
                <select
                  value={novo.statusRelacionamento}
                  onChange={(e) =>
                    setNovo((s) => ({ ...s, statusRelacionamento: e.target.value as typeof novo.statusRelacionamento }))
                  }
                  className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/25"
                >
                  <option value="ATIVO">Ativo</option>
                  <option value="ESTRATEGICO">Estratégico</option>
                  <option value="EM_RISCO">Em risco</option>
                  <option value="INATIVO">Inativo</option>
                </select>
              </label>
              <div className="flex flex-wrap justify-end gap-2 border-t border-[#F3F4F6] pt-4">
                <button
                  type="button"
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-[#6B7280] hover:bg-[#F3F4F6]"
                  disabled={criar.isPending}
                  onClick={() => setModalNovo(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#10B981] px-4 py-2 text-sm font-bold text-white shadow-sm transition duration-200 hover:bg-[#059669] disabled:opacity-50"
                  disabled={criar.isPending || novo.nome.trim().length < 2}
                >
                  {criar.isPending ? "Salvando…" : "Cadastrar cliente"}
                </button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
}
