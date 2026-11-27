import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Package, Save } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CATEGORIA_OPERACAO_OUTROS,
  CATEGORIAS_OPERACAO,
  categoriaOperacaoDoProduto,
  ordemCategoriaOperacao,
  type CategoriaOperacaoOuOutros,
} from "@shared/produtoCategoriaOperacao";

type Props = {
  dia: Date;
  canEdit: boolean;
};

type ItemEstoque = {
  produtoId: string;
  nome: string;
  categoria: string | null;
  visivelPortal: boolean;
  quantidade: number | null;
  reservado: number;
  disponivel: number | null;
  estoqueLoja: number | null;
};

function fmtQtd(v: number | null | undefined) {
  if (v == null || !Number.isFinite(v)) return "—";
  return Number.isInteger(v)
    ? String(v)
    : v.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

const ESTILO_CATEGORIA: Record<
  CategoriaOperacaoOuOutros,
  { shell: string; head: string }
> = {
  Folhas: {
    shell:
      "border-emerald-200/80 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20",
    head: "text-emerald-900 dark:text-emerald-100",
  },
  Microverdes: {
    shell:
      "border-teal-200/80 bg-teal-50/40 dark:border-teal-900/50 dark:bg-teal-950/20",
    head: "text-teal-900 dark:text-teal-100",
  },
  Flores: {
    shell:
      "border-rose-200/80 bg-rose-50/40 dark:border-rose-900/50 dark:bg-rose-950/20",
    head: "text-rose-900 dark:text-rose-100",
  },
  "Minimamente processados": {
    shell:
      "border-amber-200/80 bg-amber-50/40 dark:border-amber-900/50 dark:bg-amber-950/20",
    head: "text-amber-950 dark:text-amber-100",
  },
  "In natura": {
    shell:
      "border-lime-200/80 bg-lime-50/40 dark:border-lime-900/50 dark:bg-lime-950/20",
    head: "text-lime-950 dark:text-lime-100",
  },
  Ervas: {
    shell:
      "border-violet-200/80 bg-violet-50/40 dark:border-violet-900/50 dark:bg-violet-950/20",
    head: "text-violet-950 dark:text-violet-100",
  },
  "Saladas (mix)": {
    shell:
      "border-sky-200/80 bg-sky-50/40 dark:border-sky-900/50 dark:bg-sky-950/20",
    head: "text-sky-950 dark:text-sky-100",
  },
  [CATEGORIA_OPERACAO_OUTROS]: {
    shell:
      "border-slate-200/80 bg-slate-50/50 dark:border-slate-700/50 dark:bg-slate-900/25",
    head: "text-slate-800 dark:text-slate-100",
  },
};

export function EstoqueSemanalPortalPanel({ dia, canEdit }: Props) {
  const utils = trpc.useUtils();
  const consulta = trpc.comercial.pedidos.estoqueSemanal.useQuery({ dia });
  const [rascunho, setRascunho] = useState<Record<string, string>>({});
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<
    "todas" | CategoriaOperacaoOuOutros
  >("todas");

  useEffect(() => {
    if (!consulta.data) return;
    const next: Record<string, string> = {};
    for (const item of consulta.data.itens) {
      next[item.produtoId] =
        item.quantidade == null ? "" : String(item.quantidade);
    }
    setRascunho(next);
  }, [consulta.data]);

  const salvar = trpc.comercial.pedidos.salvarEstoqueSemanal.useMutation({
    onSuccess: async () => {
      toast.success("Estoque da semana salvo e sincronizado com o site.");
      await utils.comercial.pedidos.estoqueSemanal.invalidate();
    },
    onError: err => toast.error(err.message || "Falha ao salvar estoque."),
  });

  const itensComCategoria = useMemo(() => {
    const itens = (consulta.data?.itens ?? []) as ItemEstoque[];
    return itens.map(item => ({
      ...item,
      categoriaOperacao: categoriaOperacaoDoProduto(item.nome, item.categoria),
    }));
  }, [consulta.data?.itens]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return itensComCategoria.filter(i => {
      if (
        filtroCategoria !== "todas" &&
        i.categoriaOperacao !== filtroCategoria
      ) {
        return false;
      }
      if (!q) return true;
      return (
        i.nome.toLowerCase().includes(q) ||
        (i.categoria ?? "").toLowerCase().includes(q) ||
        i.categoriaOperacao.toLowerCase().includes(q)
      );
    });
  }, [itensComCategoria, busca, filtroCategoria]);

  const grupos = useMemo(() => {
    const map = new Map<CategoriaOperacaoOuOutros, typeof filtrados>();
    for (const item of filtrados) {
      const list = map.get(item.categoriaOperacao) ?? [];
      list.push(item);
      map.set(item.categoriaOperacao, list);
    }
    return Array.from(map.entries()).sort(
      (a, b) => ordemCategoriaOperacao(a[0]) - ordemCategoriaOperacao(b[0]),
    );
  }, [filtrados]);

  const categoriasComProduto = useMemo(() => {
    const set = new Set<CategoriaOperacaoOuOutros>();
    for (const item of itensComCategoria) set.add(item.categoriaOperacao);
    return set;
  }, [itensComCategoria]);

  const dirty = useMemo(() => {
    if (!consulta.data) return false;
    return consulta.data.itens.some(item => {
      const raw = (rascunho[item.produtoId] ?? "").trim();
      const atual =
        item.quantidade == null ? "" : String(item.quantidade);
      return raw !== atual;
    });
  }, [consulta.data, rascunho]);

  function salvarAlteracoes() {
    if (!consulta.data) return;
    const itens: Array<{ produtoId: string; quantidade: number | null }> = [];
    for (const item of consulta.data.itens) {
      const raw = (rascunho[item.produtoId] ?? "").trim();
      const atual =
        item.quantidade == null ? "" : String(item.quantidade);
      if (raw === atual) continue;
      if (raw === "") {
        itens.push({ produtoId: item.produtoId, quantidade: null });
        continue;
      }
      const n = Number(raw.replace(",", "."));
      if (!Number.isFinite(n) || n < 0) {
        toast.error(`Quantidade inválida em ${item.nome}`);
        return;
      }
      itens.push({ produtoId: item.produtoId, quantidade: n });
    }
    if (itens.length === 0) {
      toast.message("Nenhuma alteração para salvar.");
      return;
    }
    salvar.mutate({ dia, itens });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              <Package className="h-4 w-4" />
              Estoque da semana (site)
              {consulta.data?.rotulo ? (
                <Badge variant="secondary">{consulta.data.rotulo}</Badge>
              ) : null}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Informe a capacidade da semana. O{" "}
              <strong className="font-medium text-foreground">reservado</strong>{" "}
              soma os pedidos não cancelados da semana; o disponível é
              sincronizado com a loja do site.
            </p>
          </div>
          {canEdit ? (
            <Button
              size="sm"
              disabled={!dirty || salvar.isPending || consulta.isLoading}
              onClick={salvarAlteracoes}
            >
              {salvar.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1 h-4 w-4" />
              )}
              Salvar e sincronizar
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          placeholder="Buscar produto ou categoria..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="max-w-md"
        />

        {itensComCategoria.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            <Button
              type="button"
              size="sm"
              variant={filtroCategoria === "todas" ? "default" : "outline"}
              className="h-7 rounded-full px-2.5 text-[11px]"
              onClick={() => setFiltroCategoria("todas")}
            >
              Todas
            </Button>
            {CATEGORIAS_OPERACAO.filter(cat => categoriasComProduto.has(cat)).map(
              cat => (
                <Button
                  key={cat}
                  type="button"
                  size="sm"
                  variant={filtroCategoria === cat ? "default" : "outline"}
                  className="h-7 rounded-full px-2.5 text-[11px]"
                  onClick={() => setFiltroCategoria(cat)}
                >
                  {cat}
                  <span className="ml-1 tabular-nums opacity-70">
                    {
                      itensComCategoria.filter(i => i.categoriaOperacao === cat)
                        .length
                    }
                  </span>
                </Button>
              ),
            )}
            {categoriasComProduto.has(CATEGORIA_OPERACAO_OUTROS) ? (
              <Button
                type="button"
                size="sm"
                variant={
                  filtroCategoria === CATEGORIA_OPERACAO_OUTROS
                    ? "default"
                    : "outline"
                }
                className="h-7 rounded-full px-2.5 text-[11px]"
                onClick={() => setFiltroCategoria(CATEGORIA_OPERACAO_OUTROS)}
              >
                Outros
              </Button>
            ) : null}
          </div>
        ) : null}

        {consulta.isLoading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando estoque…
          </p>
        ) : consulta.isError ? (
          <p className="text-sm text-destructive">
            Não foi possível carregar o estoque semanal.
          </p>
        ) : grupos.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Nenhum produto da loja/operação para esta semana.
          </p>
        ) : (
          <div className="space-y-3">
            {grupos.map(([categoria, itens]) => {
              const estilo =
                ESTILO_CATEGORIA[categoria] ??
                ESTILO_CATEGORIA[CATEGORIA_OPERACAO_OUTROS];
              return (
                <section
                  key={categoria}
                  className={`overflow-hidden rounded-lg border ${estilo.shell}`}
                >
                  <div
                    className={`flex items-center justify-between gap-2 border-b border-black/5 px-3 py-2 dark:border-white/10 ${estilo.head}`}
                  >
                    <h3 className="text-sm font-semibold">{categoria}</h3>
                    <span className="text-xs tabular-nums opacity-80">
                      {itens.length} produto{itens.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="overflow-x-auto bg-background/70">
                    <table className="min-w-full text-sm">
                      <thead className="bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Produto</th>
                          <th className="px-3 py-2 font-semibold">
                            Estoque semana
                          </th>
                          <th className="px-3 py-2 font-semibold">Reservado</th>
                          <th className="px-3 py-2 font-semibold">Disponível</th>
                          <th className="px-3 py-2 font-semibold">Site agora</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itens.map(item => (
                          <tr
                            key={item.produtoId}
                            className="border-t align-middle odd:bg-background even:bg-muted/10"
                          >
                            <td className="px-3 py-2">
                              <p className="font-medium leading-tight">
                                {item.nome}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {item.categoria || "Sem categoria"}
                                {item.visivelPortal ? " · na loja" : ""}
                              </p>
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                className="h-8 w-28"
                                inputMode="decimal"
                                disabled={!canEdit || salvar.isPending}
                                value={rascunho[item.produtoId] ?? ""}
                                placeholder="—"
                                onChange={e =>
                                  setRascunho(prev => ({
                                    ...prev,
                                    [item.produtoId]: e.target.value,
                                  }))
                                }
                                aria-label={`Estoque semana ${item.nome}`}
                              />
                            </td>
                            <td className="px-3 py-2 tabular-nums text-amber-800 dark:text-amber-200">
                              {fmtQtd(item.reservado)}
                            </td>
                            <td className="px-3 py-2 tabular-nums font-medium">
                              {fmtQtd(item.disponivel)}
                            </td>
                            <td className="px-3 py-2 tabular-nums text-muted-foreground">
                              {fmtQtd(item.estoqueLoja)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
