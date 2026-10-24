import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import {
  Calculator,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  ExternalLink,
  Plus,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/comercial/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CompForm = { produtoId: string; quantidade: string };

type MixForm = {
  id?: string;
  nome: string;
  produtoReferenciaId: string;
  perdaPercentual: string;
  ativo: boolean;
  componentes: CompForm[];
};

function emptyForm(): MixForm {
  return {
    nome: "",
    produtoReferenciaId: "",
    perdaPercentual: "0",
    ativo: true,
    componentes: [{ produtoId: "", quantidade: "" }],
  };
}

function parseNum(raw: string | number | undefined | null): number {
  const n = Number(String(raw ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function hojeIsoLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtKg(v: number) {
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

function fmtDataBr(iso: string) {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/** kg = (qtd × g / 1000) / (1 − perda%) */
function kgComPerda(qtdMixes: number, gramas: number, perdaPct: number): number {
  if (qtdMixes <= 0 || gramas <= 0) return 0;
  const p = Math.min(99.99, Math.max(0, perdaPct));
  const fator = p > 0 && p < 100 ? 1 / (1 - p / 100) : 1;
  return Math.ceil(((qtdMixes * gramas * fator) / 1000) * 1000) / 1000;
}

function gramasComPerda(qtdMixes: number, gramas: number, perdaPct: number): number {
  if (qtdMixes <= 0 || gramas <= 0) return 0;
  const p = Math.min(99.99, Math.max(0, perdaPct));
  const fator = p > 0 && p < 100 ? 1 / (1 - p / 100) : 1;
  return qtdMixes * gramas * fator;
}

export function Mixes({
  embedded = false,
  dia: diaProp,
  onDiaChange,
}: {
  embedded?: boolean;
  /** Dia operacional (YYYY-MM-DD) — pedidos do dashboard. */
  dia?: string;
  onDiaChange?: (dia: string) => void;
} = {}) {
  const utils = trpc.useUtils();
  const me = trpc.comercial.pedidos.me.useQuery(undefined, { staleTime: 60_000 });
  const canEdit =
    me.data?.perfil === "ADMIN" ||
    me.data?.perfil === "GERENTE_COMERCIAL" ||
    me.data?.perfil === "COMERCIAL" ||
    me.data?.perfil === "OPERACOES";

  const [diaLocal, setDiaLocal] = useState(diaProp ?? hojeIsoLocal());
  const dia = diaProp ?? diaLocal;

  useEffect(() => {
    if (diaProp && /^\d{4}-\d{2}-\d{2}$/.test(diaProp) && diaProp !== diaLocal) {
      setDiaLocal(diaProp);
    }
  }, [diaProp]);

  function setDia(novo: string) {
    if (onDiaChange) onDiaChange(novo);
    else setDiaLocal(novo);
  }

  const mixes = trpc.comercial.pedidos.listarMixesEstoqueVivo.useQuery();
  const produtos = trpc.comercial.pedidos.produtos.useQuery(
    { incluirInativos: false, apenasOperacao: true },
    { staleTime: 60_000 },
  );
  const processamento = trpc.comercial.pedidos.processamentoEstoqueVivoDia.useQuery(
    { dia: new Date(`${dia}T12:00:00`) },
    { staleTime: 15_000, refetchOnWindowFocus: true },
  );

  const [form, setForm] = useState<MixForm | null>(null);
  const [mixCalcId, setMixCalcId] = useState("");
  const [qtdMixes, setQtdMixes] = useState("100");
  const [perdasCalc, setPerdasCalc] = useState<Record<string, string>>({});
  /** Esconde cadastro/simulação — fica só o processamento do dia. */
  const [cadastroMinimizado, setCadastroMinimizado] = useState(true);
  /** Esconde o bloco por receita; mantém só kg por ingrediente. */
  const [porReceitaMinimizado, setPorReceitaMinimizado] = useState(false);
  const [filtroProcessamento, setFiltroProcessamento] = useState("");
  /** Mixes com ingredientes expandidos (padrão: todos minimizados). */
  const [receitasExpandidas, setReceitasExpandidas] = useState<Set<string>>(
    () => new Set(),
  );
  const formRef = useRef<HTMLDivElement | null>(null);

  const filtroNorm = filtroProcessamento.trim().toLowerCase();

  const mixesUsadosFiltrados = useMemo(() => {
    const lista = processamento.data?.mixesUsados ?? [];
    if (!filtroNorm) return lista;
    return lista.filter(
      m =>
        m.mixNome.toLowerCase().includes(filtroNorm) ||
        m.produtoPedidoNome.toLowerCase().includes(filtroNorm) ||
        m.ingredientes.some(i => i.nome.toLowerCase().includes(filtroNorm)),
    );
  }, [processamento.data?.mixesUsados, filtroNorm]);

  const ingredientesFiltrados = useMemo(() => {
    const lista = processamento.data?.ingredientes ?? [];
    if (!filtroNorm) return lista;
    return lista.filter(
      i =>
        i.nome.toLowerCase().includes(filtroNorm) ||
        i.fontes.some(f => f.mixNome.toLowerCase().includes(filtroNorm)),
    );
  }, [processamento.data?.ingredientes, filtroNorm]);

  function toggleReceitaExpandida(mixId: string) {
    setReceitasExpandidas(prev => {
      const next = new Set(prev);
      if (next.has(mixId)) next.delete(mixId);
      else next.add(mixId);
      return next;
    });
  }

  function minimizarTodasReceitas() {
    setReceitasExpandidas(new Set());
  }

  function expandirTodasReceitas() {
    setReceitasExpandidas(new Set(mixesUsadosFiltrados.map(m => m.mixId)));
  }

  function abrirFormulario(proximo: MixForm) {
    setCadastroMinimizado(false);
    setForm(proximo);
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  const salvar = trpc.comercial.pedidos.salvarMixEstoqueVivo.useMutation({
    onSuccess: data => {
      toast.success(`Mix «${data.nome}» salvo.`);
      setForm(null);
      setMixCalcId(data.id);
      void utils.comercial.pedidos.listarMixesEstoqueVivo.invalidate();
      void utils.comercial.pedidos.processamentoEstoqueVivoDia.invalidate();
    },
    onError: err => toast.error(err.message),
  });

  const excluir = trpc.comercial.pedidos.excluirMixEstoqueVivo.useMutation({
    onSuccess: () => {
      toast.success("Mix removido.");
      void utils.comercial.pedidos.listarMixesEstoqueVivo.invalidate();
      void utils.comercial.pedidos.processamentoEstoqueVivoDia.invalidate();
    },
    onError: err => toast.error(err.message),
  });

  const produtoOptions = useMemo(
    () =>
      (produtos.data ?? [])
        .filter((p: { ativo?: boolean }) => p.ativo !== false)
        .map((p: { id: string; nome: string; sku?: string | null }) => ({
          id: p.id,
          nome: p.sku?.trim() ? `${p.nome} (${p.sku.trim()})` : p.nome,
        })),
    [produtos.data],
  );

  const formValid =
    !!form &&
    form.nome.trim().length > 0 &&
    form.componentes.length > 0 &&
    form.componentes.every(
      c => c.produtoId && Number(String(c.quantidade).replace(",", ".")) > 0,
    );

  const qtdNum = parseNum(qtdMixes);

  const mixSelecionado = useMemo(
    () => (mixCalcId ? mixes.data?.find(m => m.id === mixCalcId) : undefined),
    [mixCalcId, mixes.data],
  );

  const ingredientesCalc = useMemo(() => {
    if (mixSelecionado) {
      return mixSelecionado.componentes.map(c => ({
        produtoId: c.produtoId,
        nome: c.produtoNome,
        gramas: Number(c.quantidade) || 0,
      }));
    }
    if (formValid && form) {
      return form.componentes.map(c => ({
        produtoId: c.produtoId,
        nome: produtoOptions.find(p => p.id === c.produtoId)?.nome ?? "Produto",
        gramas: parseNum(c.quantidade),
      }));
    }
    return [] as Array<{ produtoId: string; nome: string; gramas: number }>;
  }, [mixSelecionado, formValid, form, produtoOptions]);

  useEffect(() => {
    if (ingredientesCalc.length === 0) return;
    const padrao = mixSelecionado
      ? String(mixSelecionado.perdaPercentual ?? 0)
      : form?.perdaPercentual ?? "0";
    setPerdasCalc(prev => {
      const next = { ...prev };
      let changed = false;
      for (const ing of ingredientesCalc) {
        if (next[ing.produtoId] == null) {
          next[ing.produtoId] = padrao;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [ingredientesCalc, mixSelecionado, form?.perdaPercentual]);

  const linhasCalc = useMemo(() => {
    if (!(qtdNum > 0) || ingredientesCalc.length === 0) return [];
    return ingredientesCalc.map(ing => {
      const perda = parseNum(perdasCalc[ing.produtoId]);
      return {
        produtoId: ing.produtoId,
        nome: ing.nome,
        gramas: ing.gramas,
        perda,
        gramasTotais: gramasComPerda(qtdNum, ing.gramas, perda),
        kg: kgComPerda(qtdNum, ing.gramas, perda),
      };
    });
  }, [qtdNum, ingredientesCalc, perdasCalc]);

  const editar = (mix: {
    id: string;
    nome: string;
    produtoReferenciaId: string | null;
    perdaPercentual: number;
    ativo: boolean;
    componentes: Array<{ produtoId: string; quantidade: number }>;
  }) => {
    setMixCalcId(mix.id);
    setPerdasCalc({});
    abrirFormulario({
      id: mix.id,
      nome: mix.nome,
      produtoReferenciaId: mix.produtoReferenciaId ?? "",
      perdaPercentual: String(mix.perdaPercentual ?? 0),
      ativo: mix.ativo !== false,
      componentes: mix.componentes.map(c => ({
        produtoId: c.produtoId,
        quantidade: String(c.quantidade),
      })),
    });
  };

  const gramasTotaisForm = useMemo(() => {
    if (!form) return 0;
    return form.componentes.reduce(
      (s, c) => s + (Number(String(c.quantidade).replace(",", ".")) || 0),
      0,
    );
  }, [form]);

  const proc = processamento.data;
  const mixesSemVinculo = useMemo(() => {
    const usados = new Set((proc?.mixesUsados ?? []).map(m => m.mixId));
    return (mixes.data ?? []).filter(m => m.ativo && !usados.has(m.id));
  }, [mixes.data, proc?.mixesUsados]);

  return (
    <div className="space-y-6">
      {embedded ? null : (
        <PageHeader
          kicker="Comercial"
          title="Mixes"
          subtitle="Receitas com gramas por mix e kg a processar a partir dos pedidos do dia."
        />
      )}

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calculator className="h-4 w-4" /> Processamento do dia
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Calculado automaticamente pelos pedidos de{" "}
                <strong>{fmtDataBr(dia)}</strong> e pelas receitas cadastradas.
                Cada ingrediente mostra quantos <strong>kg</strong> processar.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <Label className="text-xs">Dia (dashboard)</Label>
                <Input
                  type="date"
                  className="h-9 w-40"
                  value={dia}
                  onChange={e => setDia(e.target.value)}
                />
              </div>
              <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => setDia(hojeIsoLocal())}>
                Hoje
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-9" asChild>
                <Link href={`/comercial/pedidos?dia=${dia}`}>
                  <ExternalLink className="mr-1 h-3.5 w-3.5" />
                  Pedidos do dia
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {processamento.isLoading ? (
            <p className="text-sm text-muted-foreground">Calculando a partir dos pedidos…</p>
          ) : processamento.error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {processamento.error.message}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="rounded-lg border bg-background px-3 py-1.5">
                  <span className="text-muted-foreground">Mixes no dia · </span>
                  <strong>{proc?.totais.mixes ?? 0}</strong>
                </span>
                <span className="rounded-lg border bg-background px-3 py-1.5">
                  <span className="text-muted-foreground">Ingredientes · </span>
                  <strong>{proc?.totais.ingredientes ?? 0}</strong>
                </span>
                <span className="rounded-lg border bg-background px-3 py-1.5">
                  <span className="text-muted-foreground">Total a processar · </span>
                  <strong>{fmtKg(proc?.totais.kgTotal ?? 0)} kg</strong>
                </span>
                <div className="ml-auto flex flex-wrap gap-2">
                  {(proc?.mixesUsados.length ?? 0) > 0 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={() => setPorReceitaMinimizado(v => !v)}
                    >
                      {porReceitaMinimizado ? (
                        <>
                          <ChevronsUpDown className="mr-1 h-3.5 w-3.5" />
                          Ver por receita
                        </>
                      ) : (
                        <>
                          <ChevronsDownUp className="mr-1 h-3.5 w-3.5" />
                          Só kg por ingrediente
                        </>
                      )}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => setCadastroMinimizado(v => !v)}
                  >
                    {cadastroMinimizado ? (
                      <>
                        <ChevronsUpDown className="mr-1 h-3.5 w-3.5" />
                        Cadastro
                      </>
                    ) : (
                      <>
                        <ChevronsDownUp className="mr-1 h-3.5 w-3.5" />
                        Minimizar cadastro
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {(proc?.ingredientes.length ?? 0) > 0 ||
              (proc?.mixesUsados.length ?? 0) > 0 ? (
                <div className="relative max-w-md">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-9 pl-8"
                    placeholder="Filtrar receita ou ingrediente…"
                    value={filtroProcessamento}
                    onChange={e => setFiltroProcessamento(e.target.value)}
                  />
                </div>
              ) : null}

              {ingredientesFiltrados.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Kg a processar por ingrediente
                    {filtroNorm ? (
                      <span className="ml-1 font-normal normal-case">
                        ({ingredientesFiltrados.length})
                      </span>
                    ) : null}
                  </p>
                  <div className="overflow-x-auto rounded-lg border bg-background">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                          <th className="px-3 py-2">Ingrediente</th>
                          <th className="px-3 py-2 w-28 text-right">Processar</th>
                          <th className="px-3 py-2 w-36 text-right">De onde</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ingredientesFiltrados.map(ing => (
                          <tr key={ing.produtoId || ing.nome} className="border-b align-top">
                            <td className="px-3 py-2.5 font-medium leading-snug">{ing.nome}</td>
                            <td className="px-3 py-2.5 text-right text-base font-bold tabular-nums text-primary whitespace-nowrap">
                              {fmtKg(ing.kgProcessar)} kg
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <details className="group text-left">
                                <summary className="cursor-pointer list-none text-xs text-muted-foreground underline-offset-2 hover:underline [&::-webkit-details-marker]:hidden">
                                  {ing.fontes.length}{" "}
                                  {ing.fontes.length === 1 ? "receita" : "receitas"}
                                </summary>
                                <ul className="mt-1.5 space-y-1 border-t pt-1.5 text-xs text-muted-foreground">
                                  {ing.fontes.map((f, idx) => (
                                    <li
                                      key={`${f.mixNome}-${idx}`}
                                      className="flex justify-between gap-2"
                                    >
                                      <span className="min-w-0 truncate" title={f.mixNome}>
                                        {f.mixNome}
                                      </span>
                                      <span className="shrink-0 tabular-nums text-foreground">
                                        {f.unidades} un · {fmtKg(f.kg)} kg
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </details>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted/30 text-sm font-semibold">
                          <td className="px-3 py-2">
                            {filtroNorm ? "Total filtrado" : "Total"}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                            {fmtKg(
                              ingredientesFiltrados.reduce(
                                (s, i) => s + i.kgProcessar,
                                0,
                              ),
                            )}{" "}
                            kg
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ) : (proc?.ingredientes.length ?? 0) > 0 && filtroNorm ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum ingrediente com «{filtroProcessamento}».
                </p>
              ) : null}

              {(proc?.mixesUsados.length ?? 0) > 0 && !porReceitaMinimizado ? (
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Por receita (volume do dia)
                      {filtroNorm ? (
                        <span className="ml-1 font-normal normal-case">
                          ({mixesUsadosFiltrados.length})
                        </span>
                      ) : null}
                    </p>
                    <div className="ml-auto flex flex-wrap gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={minimizarTodasReceitas}
                      >
                        Minimizar todas
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={expandirTodasReceitas}
                      >
                        Expandir todas
                      </Button>
                    </div>
                  </div>
                  {mixesUsadosFiltrados.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma receita com «{filtroProcessamento}».
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {mixesUsadosFiltrados.map(m => {
                        const kgReceita = m.ingredientes.reduce(
                          (s, i) => s + (Number(i.kgProcessar) || 0),
                          0,
                        );
                        const expandida = receitasExpandidas.has(m.mixId);
                        return (
                          <div
                            key={m.mixId}
                            className="rounded-lg border bg-background px-3 py-2"
                          >
                            <button
                              type="button"
                              className="flex w-full flex-wrap items-center justify-between gap-2 text-left"
                              onClick={() => toggleReceitaExpandida(m.mixId)}
                              aria-expanded={expandida}
                            >
                              <span className="flex min-w-0 items-center gap-1.5">
                                {expandida ? (
                                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                                )}
                                <span className="min-w-0">
                                  <span className="font-medium">{m.mixNome}</span>
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    {m.produtoPedidoNome}
                                  </span>
                                </span>
                              </span>
                              <span className="shrink-0 text-sm tabular-nums">
                                <strong>{m.unidades}</strong> un
                                <span className="text-muted-foreground"> · </span>
                                <strong className="text-primary">
                                  {fmtKg(kgReceita)} kg
                                </strong>
                              </span>
                            </button>
                            {expandida ? (
                              <table className="mt-2 w-full text-sm">
                                <thead>
                                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                                    <th className="py-1 pr-2">Ingrediente</th>
                                    <th className="py-1 text-right">Processar</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {m.ingredientes.map(i => (
                                    <tr
                                      key={i.produtoId || i.nome}
                                      className="border-b last:border-0"
                                    >
                                      <td className="py-1.5 pr-2">{i.nome}</td>
                                      <td className="py-1.5 text-right font-semibold tabular-nums whitespace-nowrap">
                                        {fmtKg(i.kgProcessar)} kg
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}

              {(proc?.mixesUsados.length ?? 0) === 0 &&
              (proc?.ingredientes.length ?? 0) === 0 ? (
                <p className="rounded-lg border border-dashed bg-background px-3 py-4 text-sm text-muted-foreground">
                  Nenhum mix encontrado nos pedidos deste dia. Cadastre a receita e vincule o{" "}
                  <strong>produto de referência</strong> (o mesmo item vendido no pedido), ou use o
                  mesmo nome da receita no pedido (ex.: «Mix Clássico» ↔ «Mix Clássico - 500g»).
                </p>
              ) : null}

              {(proc?.pedidosSemMix.length ?? 0) > 0 ? (
                <details className="rounded-lg border bg-background px-3 py-2 text-sm">
                  <summary className="cursor-pointer font-medium">
                    Itens do pedido sem receita de mix ({proc!.pedidosSemMix.length})
                  </summary>
                  <ul className="mt-2 space-y-1 text-muted-foreground">
                    {proc!.pedidosSemMix.map(p => (
                      <li key={p.nome}>
                        {p.nome}: <strong className="text-foreground">{p.quantidade}</strong> un.
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs">
                    Para entrar no cálculo de kg, crie/edite um mix e vincule o produto de referência.
                  </p>
                </details>
              ) : null}

              {mixesSemVinculo.length > 0 && (proc?.mixesUsados.length ?? 0) > 0 ? (
                <p className="text-xs text-muted-foreground">
                  Receitas sem pedido neste dia:{" "}
                  {mixesSemVinculo.map(m => m.nome).join(", ")}.
                </p>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      {cadastroMinimizado ? (
        <p className="text-sm text-muted-foreground">
          Cadastro minimizado.{" "}
          <button
            type="button"
            className="font-medium text-foreground underline-offset-2 hover:underline"
            onClick={() => setCadastroMinimizado(false)}
          >
            Abrir cadastro
          </button>{" "}
          para editar ou criar mixes.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">Receitas cadastradas</CardTitle>
                {canEdit ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      setMixCalcId("");
                      setPerdasCalc({});
                      abrirFormulario(emptyForm());
                    }}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Novo mix
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {canEdit && form ? (
                <div
                  ref={formRef}
                  className="space-y-4 rounded-lg border border-primary/30 bg-primary/5 p-3"
                >
                  <p className="text-sm font-semibold">
                    {form.id ? `Editar «${form.nome || "mix"}»` : "Novo mix"}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Nome da receita</Label>
                      <Input
                        value={form.nome}
                        onChange={e => setForm({ ...form, nome: e.target.value })}
                        placeholder="Ex.: Mix Clássico"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Produto no pedido (referência)</Label>
                      <select
                        className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                        value={form.produtoReferenciaId}
                        onChange={e =>
                          setForm({ ...form, produtoReferenciaId: e.target.value })
                        }
                      >
                        <option value="">Casar só pelo nome da receita…</option>
                        {produtoOptions.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Perda no processamento (%)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={99.99}
                        step={0.1}
                        value={form.perdaPercentual}
                        onChange={e =>
                          setForm({ ...form, perdaPercentual: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Label className="text-xs">Ingredientes (gramas por 1 mix)</Label>
                      <span className="text-xs text-muted-foreground">
                        Soma: {gramasTotaisForm.toLocaleString("pt-BR")} g / mix
                      </span>
                    </div>
                    {form.componentes.map((comp, idx) => (
                      <div key={idx} className="flex flex-wrap items-center gap-2">
                        <select
                          className="h-9 min-w-[180px] flex-1 rounded-md border bg-background px-2 text-sm"
                          value={comp.produtoId}
                          onChange={e => {
                            const next = [...form.componentes];
                            next[idx] = { ...next[idx], produtoId: e.target.value };
                            setForm({ ...form, componentes: next });
                          }}
                        >
                          <option value="">Selecione o produto…</option>
                          {produtoOptions.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.nome}
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min={0.01}
                            step={1}
                            className="h-9 w-24"
                            value={comp.quantidade}
                            onChange={e => {
                              const next = [...form.componentes];
                              next[idx] = {
                                ...next[idx],
                                quantidade: e.target.value,
                              };
                              setForm({ ...form, componentes: next });
                            }}
                            placeholder="30"
                          />
                          <span className="text-xs text-muted-foreground">g</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          disabled={form.componentes.length <= 1}
                          onClick={() =>
                            setForm({
                              ...form,
                              componentes: form.componentes.filter((_, i) => i !== idx),
                            })
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setForm({
                          ...form,
                          componentes: [
                            ...form.componentes,
                            { produtoId: "", quantidade: "" },
                          ],
                        })
                      }
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" /> Ingrediente
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={!formValid || salvar.isPending}
                      onClick={() =>
                        salvar.mutate({
                          id: form.id,
                          nome: form.nome.trim(),
                          produtoReferenciaId: form.produtoReferenciaId || null,
                          perdaPercentual:
                            Number(String(form.perdaPercentual).replace(",", ".")) ||
                            0,
                          ativo: true,
                          componentes: form.componentes.map(c => ({
                            produtoId: c.produtoId,
                            quantidade: Number(
                              String(c.quantidade).replace(",", "."),
                            ),
                          })),
                        })
                      }
                    >
                      <Save className="mr-1 h-3.5 w-3.5" /> Salvar receita
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setForm(null)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : null}

              {(mixes.data ?? []).length === 0 ? (
                <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                  Nenhum mix ainda. Crie o primeiro (ex.: Mix Clássico, Crocante 1).
                </p>
              ) : (
                <ul className="space-y-2">
                  {(mixes.data ?? []).map(mix => (
                    <li
                      key={mix.id}
                      className={`rounded-lg border px-3 py-2 ${
                        mixCalcId === mix.id ? "border-primary bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => {
                            setMixCalcId(mix.id);
                            setPerdasCalc({});
                            setForm(null);
                          }}
                        >
                          <p className="font-medium">{mix.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {mix.produtoReferenciaNome
                              ? `Pedido: ${mix.produtoReferenciaNome}`
                              : "Sem produto de referência"}
                            {" · "}
                            {mix.componentes.length} ingrediente
                            {mix.componentes.length === 1 ? "" : "s"}
                            {mix.perdaPercentual > 0
                              ? ` · perda ${mix.perdaPercentual}%`
                              : ""}
                          </p>
                        </button>
                        {canEdit ? (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => editar(mix)}
                            >
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => {
                                if (confirm(`Remover «${mix.nome}»?`)) {
                                  excluir.mutate({ id: mix.id });
                                  if (mixCalcId === mix.id) setMixCalcId("");
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calculator className="h-4 w-4" /> Simular receita
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Mix</Label>
                  <select
                    className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                    value={mixCalcId}
                    onChange={e => {
                      setMixCalcId(e.target.value);
                      setPerdasCalc({});
                      setForm(null);
                    }}
                  >
                    <option value="">
                      {form ? "(editando no formulário)" : "Selecione um mix…"}
                    </option>
                    {(mixes.data ?? []).map(m => (
                      <option key={m.id} value={m.id}>
                        {m.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Quantidade de mixes (simulação)</Label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={qtdMixes}
                    onChange={e => setQtdMixes(e.target.value)}
                    placeholder="100"
                  />
                </div>
              </div>

              {linhasCalc.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                        <th className="px-3 py-2">Ingrediente</th>
                        <th className="px-3 py-2">g / mix</th>
                        <th className="px-3 py-2">Perda %</th>
                        <th className="px-3 py-2">Processar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {linhasCalc.map(l => (
                        <tr key={l.produtoId} className="border-b">
                          <td className="px-3 py-2 font-medium">{l.nome}</td>
                          <td className="px-3 py-2 tabular-nums">
                            {l.gramas.toLocaleString("pt-BR")}g
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              min={0}
                              max={99.99}
                              step={0.1}
                              className="h-8 w-20 tabular-nums"
                              value={perdasCalc[l.produtoId] ?? "0"}
                              onChange={e =>
                                setPerdasCalc(prev => ({
                                  ...prev,
                                  [l.produtoId]: e.target.value,
                                }))
                              }
                            />
                          </td>
                          <td className="px-3 py-2 font-semibold tabular-nums">
                            {fmtKg(l.kg)} kg
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Selecione um mix para simular outra quantidade, ou use o painel do dia
                  acima.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default Mixes;
