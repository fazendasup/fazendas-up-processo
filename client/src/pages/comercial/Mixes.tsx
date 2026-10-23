import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { Calculator, ExternalLink, Plus, Save, Trash2 } from "lucide-react";
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
    setForm({
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
              <div className="flex flex-wrap gap-3 text-sm">
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
              </div>

              {(proc?.ingredientes.length ?? 0) > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Kg a processar por ingrediente
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
                        {proc!.ingredientes.map(ing => (
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
                                    <li key={`${f.mixNome}-${idx}`} className="flex justify-between gap-2">
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
                          <td className="px-3 py-2">Total</td>
                          <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                            {fmtKg(proc!.totais.kgTotal)} kg
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ) : null}

              {(proc?.mixesUsados.length ?? 0) > 0 ? (
                <details className="rounded-lg border bg-background px-3 py-2">
                  <summary className="cursor-pointer text-sm font-medium">
                    Mixes vendidos no dia ({proc!.mixesUsados.length})
                  </summary>
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                          <th className="py-1.5 pr-3">Receita</th>
                          <th className="py-1.5 pr-3">No pedido</th>
                          <th className="py-1.5 text-right">Un.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {proc!.mixesUsados.map(m => (
                          <tr key={m.mixId} className="border-b last:border-0">
                            <td className="py-1.5 pr-3 font-medium">{m.mixNome}</td>
                            <td className="py-1.5 pr-3 text-xs text-muted-foreground">
                              {m.produtoPedidoNome}
                            </td>
                            <td className="py-1.5 text-right tabular-nums font-semibold">
                              {m.unidades}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              ) : (proc?.ingredientes.length ?? 0) === 0 ? (
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
                    setForm(emptyForm());
                  }}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Novo mix
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
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
                            ? `Pedido: ${mix.produtoReferenciaNome} · `
                            : "Sem produto de referência · "}
                          {mix.componentes
                            .map(c => `${c.produtoNome} ${c.quantidade}g`)
                            .join(" · ")}
                          {mix.perdaPercentual > 0
                            ? ` · perda ${mix.perdaPercentual}%`
                            : ""}
                        </p>
                      </button>
                      {canEdit ? (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => editar(mix)}>
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
                Selecione um mix para simular outra quantidade, ou use o painel do dia acima.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {canEdit && form ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {form.id ? `Editar «${form.nome || "mix"}»` : "Novo mix"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1 sm:col-span-1">
                <Label className="text-xs">Nome da receita</Label>
                <Input
                  value={form.nome}
                  onChange={e => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex.: Mix Clássico"
                />
              </div>
              <div className="space-y-1 sm:col-span-1">
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
                <p className="text-[11px] text-muted-foreground">
                  Item vendido no dashboard/pedidos que dispara esta receita.
                </p>
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
                    className="h-9 min-w-[220px] flex-1 rounded-md border bg-background px-2 text-sm"
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
                        next[idx] = { ...next[idx], quantidade: e.target.value };
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
                      Number(String(form.perdaPercentual).replace(",", ".")) || 0,
                    ativo: true,
                    componentes: form.componentes.map(c => ({
                      produtoId: c.produtoId,
                      quantidade: Number(String(c.quantidade).replace(",", ".")),
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
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export default Mixes;
