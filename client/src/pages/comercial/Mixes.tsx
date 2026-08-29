import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Save, Trash2, Calculator } from "lucide-react";
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
  perdaPercentual: string;
  ativo: boolean;
  componentes: CompForm[];
};

function emptyForm(): MixForm {
  return {
    nome: "",
    perdaPercentual: "0",
    ativo: true,
    componentes: [{ produtoId: "", quantidade: "" }],
  };
}

export function Mixes() {
  const utils = trpc.useUtils();
  const me = trpc.comercial.pedidos.me.useQuery(undefined, { staleTime: 60_000 });
  const canEdit =
    me.data?.perfil === "ADMIN" ||
    me.data?.perfil === "GERENTE_COMERCIAL" ||
    me.data?.perfil === "COMERCIAL" ||
    me.data?.perfil === "OPERACOES";

  const mixes = trpc.comercial.pedidos.listarMixesEstoqueVivo.useQuery();
  const produtos = trpc.comercial.pedidos.produtos.useQuery(undefined, {
    staleTime: 60_000,
  });

  const [form, setForm] = useState<MixForm | null>(null);
  const [mixCalcId, setMixCalcId] = useState("");
  const [qtdMixes, setQtdMixes] = useState("100");

  const salvar = trpc.comercial.pedidos.salvarMixEstoqueVivo.useMutation({
    onSuccess: data => {
      toast.success(`Mix «${data.nome}» salvo.`);
      setForm(null);
      setMixCalcId(data.id);
      void utils.comercial.pedidos.listarMixesEstoqueVivo.invalidate();
    },
    onError: err => toast.error(err.message),
  });

  const excluir = trpc.comercial.pedidos.excluirMixEstoqueVivo.useMutation({
    onSuccess: () => {
      toast.success("Mix removido.");
      void utils.comercial.pedidos.listarMixesEstoqueVivo.invalidate();
    },
    onError: err => toast.error(err.message),
  });

  const produtoOptions = useMemo(
    () =>
      (produtos.data ?? [])
        .filter((p: { ativo?: boolean }) => p.ativo !== false)
        .map((p: { id: string; nome: string }) => ({ id: p.id, nome: p.nome })),
    [produtos.data]
  );

  const formValid =
    !!form &&
    form.nome.trim().length > 0 &&
    form.componentes.length > 0 &&
    form.componentes.every(
      c => c.produtoId && Number(String(c.quantidade).replace(",", ".")) > 0
    );

  const qtdNum = Number(String(qtdMixes).replace(",", "."));
  const previewInput = useMemo(() => {
    if (!Number.isFinite(qtdNum) || qtdNum <= 0) return null;
    if (mixCalcId) {
      return { mixId: mixCalcId, unidadesReferencia: qtdNum };
    }
    if (formValid && form) {
      return {
        unidadesReferencia: qtdNum,
        mix: {
          nome: form.nome.trim(),
          perdaPercentual: Number(String(form.perdaPercentual).replace(",", ".")) || 0,
          ativo: form.ativo,
          componentes: form.componentes.map(c => ({
            produtoId: c.produtoId,
            quantidade: Number(String(c.quantidade).replace(",", ".")),
          })),
        },
      };
    }
    return null;
  }, [form, formValid, mixCalcId, qtdNum]);

  const preview = trpc.comercial.pedidos.previewMixEstoqueVivo.useQuery(
    previewInput!,
    { enabled: !!previewInput }
  );

  const editar = (mix: {
    id: string;
    nome: string;
    perdaPercentual: number;
    ativo: boolean;
    componentes: Array<{ produtoId: string; quantidade: number }>;
  }) => {
    setMixCalcId(mix.id);
    setForm({
      id: mix.id,
      nome: mix.nome,
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
      0
    );
  }, [form]);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Comercial"
        title="Mixes"
        subtitle="Cadastre receitas (Crocante 1, Crocante 2…) com gramas de cada ingrediente e calcule quantos kg processar conforme a quantidade de mixes."
      />

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
                Nenhum mix ainda. Crie o primeiro (ex.: Crocante 1).
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
                          setForm(null);
                        }}
                      >
                        <p className="font-medium">{mix.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {mix.componentes
                            .map(
                              c =>
                                `${c.produtoNome} ${c.quantidade}g`
                            )
                            .join(" · ")}
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
              <Calculator className="h-4 w-4" /> Calcular produção
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
                <Label className="text-xs">Quantidade de mixes</Label>
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

            {preview.isFetching ? (
              <p className="text-sm text-muted-foreground">Calculando…</p>
            ) : preview.data?.linhas?.length ? (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                      <th className="px-3 py-2">Ingrediente</th>
                      <th className="px-3 py-2">g / mix</th>
                      <th className="px-3 py-2">Total c/ perda</th>
                      <th className="px-3 py-2">Processar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.data.linhas.map(l => (
                      <tr key={l.produtoId} className="border-b">
                        <td className="px-3 py-2 font-medium">{l.nome}</td>
                        <td className="px-3 py-2 tabular-nums">
                          {(
                            (mixes.data?.find(m => m.id === mixCalcId)?.componentes.find(
                              c => c.produtoId === l.produtoId
                            )?.quantidade ??
                              form?.componentes.find(c => c.produtoId === l.produtoId)
                                ?.quantidade) ||
                            "—"
                          ).toString()}
                          g
                        </td>
                        <td className="px-3 py-2 tabular-nums text-muted-foreground">
                          {l.unidadesNecessarias.toLocaleString("pt-BR", {
                            maximumFractionDigits: 1,
                          })}{" "}
                          g
                        </td>
                        <td className="px-3 py-2 font-semibold tabular-nums">
                          {l.comprarTexto}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/30 text-xs font-semibold">
                      <td className="px-3 py-2" colSpan={3}>
                        Total a processar
                      </td>
                      <td className="px-3 py-2">
                        {preview.data.linhas
                          .reduce((s, l) => s + (l.comprarValor ?? 0), 0)
                          .toLocaleString("pt-BR", { maximumFractionDigits: 3 })}{" "}
                        kg
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Selecione um mix salvo ou preencha a receita ao lado para ver o
                cálculo em kg.
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Fórmula: (qtd mixes × gramas do item ÷ 1000) ÷ (1 − perda%). Ex.:
              100 mixes × 30 g cenoura × perda 10% → 3,334 kg.
            </p>
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
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Nome da receita</Label>
                <Input
                  value={form.nome}
                  onChange={e => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex.: Crocante 1"
                />
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
                <Label className="text-xs">
                  Ingredientes (gramas por 1 mix)
                </Label>
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
                    perdaPercentual:
                      Number(String(form.perdaPercentual).replace(",", ".")) ||
                      0,
                    ativo: true,
                    componentes: form.componentes.map(c => ({
                      produtoId: c.produtoId,
                      quantidade: Number(
                        String(c.quantidade).replace(",", ".")
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
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export default Mixes;
