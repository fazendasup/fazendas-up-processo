import { useMemo, useState } from "react";
import {
  CheckCheck,
  ChevronsUpDown,
  Filter,
  Lock,
  Minus,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addMonthsYm,
  sugerirValorAoAtivarProjecao,
  type LinhaProjecao,
} from "@shared/financeiroProjecaoDesembolso";

type ProjecaoData = {
  mesInicioYm: string;
  colunas: Array<{
    mesYm: string;
    label: string;
    custom: boolean;
    contaNoTotal: boolean;
  }>;
  linhas: LinhaProjecao[];
  totaisPorMes: Array<{ mesYm: string; total: number }>;
  totalGeral: number;
  avisos?: string[];
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function aplicarPatchCelula(
  data: ProjecaoData,
  patch: {
    linhaId: string;
    mesYm: string;
    ativo?: boolean;
    valorOverride?: number | null;
  },
): ProjecaoData {
  const mesesNoTotal = new Set(
    data.colunas.filter(c => c.contaNoTotal).map(c => c.mesYm),
  );
  const linhas = data.linhas.map(lin => {
    if (lin.id !== patch.linhaId) return lin;
    const celulas = lin.celulas.map(c => {
      if (c.mesYm !== patch.mesYm) return c;
      const valorEfetivo =
        patch.valorOverride != null && Number.isFinite(patch.valorOverride)
          ? round2(patch.valorOverride)
          : c.valorEfetivo;
      const ativo = patch.ativo == null ? c.ativo : patch.ativo;
      return { ...c, valorEfetivo, ativo };
    });
    const totalAtivo = round2(
      celulas
        .filter(c => c.ativo && mesesNoTotal.has(c.mesYm))
        .reduce((s, c) => s + c.valorEfetivo, 0),
    );
    return { ...lin, celulas, totalAtivo };
  });
  const totaisPorMes = data.colunas.map(col => ({
    mesYm: col.mesYm,
    total: round2(
      linhas.reduce((s, lin) => {
        const c = lin.celulas.find(x => x.mesYm === col.mesYm);
        if (!c || !c.ativo) return s;
        return s + c.valorEfetivo;
      }, 0),
    ),
  }));
  const totalGeral = round2(
    totaisPorMes
      .filter(t => mesesNoTotal.has(t.mesYm))
      .reduce((s, t) => s + t.total, 0),
  );
  return { ...data, linhas, totaisPorMes, totalGeral };
}

function aplicarPatchesCelulas(
  data: ProjecaoData,
  patches: Array<{
    linhaId: string;
    mesYm: string;
    ativo?: boolean;
    valorOverride?: number | null;
  }>,
): ProjecaoData {
  return patches.reduce((acc, p) => aplicarPatchCelula(acc, p), data);
}

const RUBRICA_SEM = "__sem_rubrica__";
const TIPO_TODOS = "__todos__";
const ORDEM_IMPACTO = "impacto";
const ORDEM_RUBRICA_AZ = "rubrica_az";
const ORDEM_RUBRICA_ZA = "rubrica_za";
const ORDEM_DESC_AZ = "desembolso_az";
const MES_FILTRO_TODOS = "todos";
const MES_FILTRO_ATIVOS = "ativos";
const MES_FILTRO_INATIVOS = "inativos";

type OrdemLinhas =
  | typeof ORDEM_IMPACTO
  | typeof ORDEM_RUBRICA_AZ
  | typeof ORDEM_RUBRICA_ZA
  | typeof ORDEM_DESC_AZ;

type FiltroMesCelula =
  | typeof MES_FILTRO_TODOS
  | typeof MES_FILTRO_ATIVOS
  | typeof MES_FILTRO_INATIVOS;

function fmtMoney(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function naturezaLabel(n: string): string {
  switch (n) {
    case "parcela":
      return "Parcela";
    case "recorrente":
      return "Recorrente";
    case "unico":
      return "Único";
    default:
      return "Manual";
  }
}

function origemLabel(o: string): string {
  switch (o) {
    case "executado":
      return "Executado";
    case "projetado":
      return "Projetado";
    default:
      return "Manual";
  }
}

export function ProjecaoDesembolsoPanel({ mesInicioYm }: { mesInicioYm: string }) {
  const utils = trpc.useUtils();
  const [novaLinhaDesc, setNovaLinhaDesc] = useState("");
  const [novaLinhaRubrica, setNovaLinhaRubrica] = useState("");
  const [novaColunaYm, setNovaColunaYm] = useState(() =>
    addMonthsYm(mesInicioYm, 3),
  );
  const [draftValor, setDraftValor] = useState<Record<string, string>>({});
  const [filtroRubricas, setFiltroRubricas] = useState<string[]>([]);
  const [filtroBusca, setFiltroBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>(TIPO_TODOS);
  const [ordemLinhas, setOrdemLinhas] = useState<OrdemLinhas>(ORDEM_IMPACTO);
  const [mesesOcultos, setMesesOcultos] = useState<string[]>([]);
  const [filtroPorMes, setFiltroPorMes] = useState<
    Record<string, FiltroMesCelula>
  >({});
  const [rubricaMenuAberto, setRubricaMenuAberto] = useState(false);

  const [loteLinhaId, setLoteLinhaId] = useState<string | null>(null);

  const proj = trpc.financeiroCfo.projecaoDesembolso.useQuery(
    { mesInicioYm },
    { staleTime: 5 * 60_000, retry: 1, refetchOnWindowFocus: false },
  );

  const patchCacheCelula = (patch: {
    linhaId: string;
    mesYm: string;
    ativo?: boolean;
    valorOverride?: number | null;
  }) => {
    utils.financeiroCfo.projecaoDesembolso.setData({ mesInicioYm }, prev => {
      if (!prev) return prev;
      return aplicarPatchCelula(prev as ProjecaoData, patch);
    });
  };

  const patchCacheLote = (
    patches: Array<{
      linhaId: string;
      mesYm: string;
      ativo?: boolean;
      valorOverride?: number | null;
    }>,
  ) => {
    utils.financeiroCfo.projecaoDesembolso.setData({ mesInicioYm }, prev => {
      if (!prev) return prev;
      return aplicarPatchesCelulas(prev as ProjecaoData, patches);
    });
  };

  const salvarCelula = trpc.financeiroCfo.salvarCelulaProjecao.useMutation({
    onMutate: async input => {
      await utils.financeiroCfo.projecaoDesembolso.cancel({ mesInicioYm });
      const previous = utils.financeiroCfo.projecaoDesembolso.getData({
        mesInicioYm,
      });
      patchCacheCelula({
        linhaId: input.linhaId,
        mesYm: input.mesYm,
        ativo: input.ativo ?? undefined,
        valorOverride: input.valorOverride,
      });
      return { previous };
    },
    onError: (e, _input, ctx) => {
      if (ctx?.previous) {
        utils.financeiroCfo.projecaoDesembolso.setData(
          { mesInicioYm },
          ctx.previous,
        );
      }
      toast.error(e.message);
    },
  });

  const salvarLote = trpc.financeiroCfo.salvarCelulasProjecaoLote.useMutation({
    onMutate: async input => {
      await utils.financeiroCfo.projecaoDesembolso.cancel({ mesInicioYm });
      const previous = utils.financeiroCfo.projecaoDesembolso.getData({
        mesInicioYm,
      });
      patchCacheLote(
        input.celulas.map(c => ({
          linhaId: c.linhaId,
          mesYm: c.mesYm,
          ativo: c.ativo ?? undefined,
          valorOverride: c.valorOverride,
        })),
      );
      return { previous };
    },
    onError: (e, _input, ctx) => {
      if (ctx?.previous) {
        utils.financeiroCfo.projecaoDesembolso.setData(
          { mesInicioYm },
          ctx.previous,
        );
      }
      toast.error(e.message);
    },
    onSettled: () => setLoteLinhaId(null),
  });
  const addCol = trpc.financeiroCfo.adicionarColunaProjecao.useMutation({
    onSuccess: async (_data, vars) => {
      toast.success(`Mês ${vars.mesYm} ativado na projeção`);
      setMesesOcultos(prev => prev.filter(m => m !== vars.mesYm));
      await utils.financeiroCfo.projecaoDesembolso.invalidate({ mesInicioYm });
    },
    onError: e => toast.error(e.message),
  });
  const remCol = trpc.financeiroCfo.removerColunaProjecao.useMutation({
    onSuccess: async (_data, vars) => {
      toast.success(`Mês ${vars.mesYm} removido da projeção`);
      setMesesOcultos(prev => prev.filter(m => m !== vars.mesYm));
      await utils.financeiroCfo.projecaoDesembolso.invalidate({ mesInicioYm });
    },
    onError: e => toast.error(e.message),
  });
  const addLinha = trpc.financeiroCfo.adicionarLinhaProjecao.useMutation({
    onSuccess: async () => {
      toast.success("Linha adicionada");
      setNovaLinhaDesc("");
      setNovaLinhaRubrica("");
      await utils.financeiroCfo.projecaoDesembolso.invalidate({ mesInicioYm });
    },
    onError: e => toast.error(e.message),
  });
  const remLinha = trpc.financeiroCfo.removerLinhaProjecao.useMutation({
    onSuccess: async () => {
      toast.success("Linha removida");
      await utils.financeiroCfo.projecaoDesembolso.invalidate({ mesInicioYm });
    },
    onError: e => toast.error(e.message),
  });

  const data = proj.data as ProjecaoData | undefined;
  const cellKey = (linhaId: string, mesYm: string) => `${linhaId}||${mesYm}`;
  const celulaPendente = (linhaId: string, mesYm: string) =>
    (salvarCelula.isPending &&
      salvarCelula.variables?.linhaId === linhaId &&
      salvarCelula.variables?.mesYm === mesYm) ||
    (salvarLote.isPending && loteLinhaId === linhaId);

  const celulasEditaveis3Meses = (lin: LinhaProjecao) => {
    if (!data) return [];
    return lin.celulas.filter(c => {
      if (!c.editavel) return false;
      const col = data.colunas.find(x => x.mesYm === c.mesYm);
      return !!col?.contaNoTotal;
    });
  };

  const marcar3MesesLinha = (lin: LinhaProjecao, forcarAtivar?: boolean) => {
    const alvos = celulasEditaveis3Meses(lin);
    if (alvos.length === 0) {
      toast.message("Nenhum mês editável nesta linha");
      return;
    }
    const todosAtivos = alvos.every(c => c.ativo);
    const ativar = forcarAtivar ?? !todosAtivos;
    const celulas = alvos.map(cel => {
      const valor = ativar
        ? sugerirValorAoAtivarProjecao(cel, lin.celulas)
        : cel.valorEfetivo;
      return {
        linhaId: lin.id,
        mesYm: cel.mesYm,
        ativo: ativar,
        valorOverride: valor,
      };
    });
    setDraftValor(prev => {
      const next = { ...prev };
      for (const c of celulas) {
        if (ativar && c.valorOverride != null && c.valorOverride > 0) {
          next[cellKey(c.linhaId, c.mesYm)] = String(c.valorOverride);
        }
      }
      return next;
    });
    setLoteLinhaId(lin.id);
    salvarLote.mutate({ celulas });
  };

  const marcar3MesesFiltradas = (ativar: boolean) => {
    if (!data) return;
    const celulas: Array<{
      linhaId: string;
      mesYm: string;
      ativo: boolean;
      valorOverride: number;
    }> = [];
    for (const lin of linhasFiltradas) {
      for (const cel of celulasEditaveis3Meses(lin)) {
        if (ativar === cel.ativo) continue;
        const valor = ativar
          ? sugerirValorAoAtivarProjecao(cel, lin.celulas)
          : cel.valorEfetivo;
        celulas.push({
          linhaId: lin.id,
          mesYm: cel.mesYm,
          ativo: ativar,
          valorOverride: valor,
        });
      }
    }
    if (celulas.length === 0) {
      toast.message(
        ativar
          ? "Todas as linhas filtradas já estão marcadas"
          : "Nada para desmarcar nas linhas filtradas",
      );
      return;
    }
    setDraftValor(prev => {
      const next = { ...prev };
      for (const c of celulas) {
        if (ativar && c.valorOverride > 0) {
          next[cellKey(c.linhaId, c.mesYm)] = String(c.valorOverride);
        }
      }
      return next;
    });
    setLoteLinhaId("__lote__");
    salvarLote.mutate({ celulas });
  };

  const rubricasDisponiveis = useMemo(() => {
    const set = new Set<string>();
    let temSem = false;
    for (const l of data?.linhas ?? []) {
      const r = l.rubrica?.trim();
      if (r) set.add(r);
      else temSem = true;
    }
    return {
      nomes: Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR")),
      temSem,
    };
  }, [data?.linhas]);

  const colunasVisiveis = useMemo(() => {
    const ocultos = new Set(mesesOcultos);
    return (data?.colunas ?? []).filter(c => !ocultos.has(c.mesYm));
  }, [data?.colunas, mesesOcultos]);

  const linhasFiltradas = useMemo(() => {
    const linhas = data?.linhas ?? [];
    const q = filtroBusca.trim().toLowerCase();
    const rubricasSel = new Set(filtroRubricas);
    let list = linhas.filter(l => {
      if (rubricasSel.size > 0) {
        const rub = l.rubrica?.trim() || "";
        const chave = rub ? rub : RUBRICA_SEM;
        if (!rubricasSel.has(chave)) return false;
      }
      if (filtroTipo !== TIPO_TODOS && l.natureza !== filtroTipo) return false;
      // Recorrente no filtro = classificado como tal E com projeção marcada
      // (evita listar essenciais/histórico que o usuário desmarcou).
      if (
        filtroTipo === "recorrente" &&
        !l.celulas.some(c => c.editavel && c.ativo)
      ) {
        return false;
      }
      if (q) {
        const blob = [l.label, l.fornecedor, l.rubrica]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!blob.includes(q)) return false;
      }
      for (const [mesYm, modo] of Object.entries(filtroPorMes)) {
        if (modo === MES_FILTRO_TODOS) continue;
        const cel = l.celulas.find(c => c.mesYm === mesYm);
        if (!cel) return false;
        if (modo === MES_FILTRO_ATIVOS && !cel.ativo) return false;
        if (modo === MES_FILTRO_INATIVOS && cel.ativo) return false;
      }
      return true;
    });

    list = [...list];
    if (ordemLinhas === ORDEM_RUBRICA_AZ) {
      list.sort((a, b) =>
        (a.rubrica || "￿").localeCompare(b.rubrica || "￿", "pt-BR"),
      );
    } else if (ordemLinhas === ORDEM_RUBRICA_ZA) {
      list.sort((a, b) =>
        (b.rubrica || "").localeCompare(a.rubrica || "", "pt-BR"),
      );
    } else if (ordemLinhas === ORDEM_DESC_AZ) {
      list.sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
    } else {
      list.sort((a, b) => b.totalAtivo - a.totalAtivo);
    }
    return list;
  }, [
    data?.linhas,
    filtroRubricas,
    filtroTipo,
    filtroBusca,
    filtroPorMes,
    ordemLinhas,
  ]);

  const totaisFiltrados = useMemo(() => {
    if (!data) {
      return { porMes: [] as Array<{ mesYm: string; total: number }>, geral: 0 };
    }
    const porMes = data.colunas.map(col => {
      const total = linhasFiltradas.reduce((s, lin) => {
        const c = lin.celulas.find(x => x.mesYm === col.mesYm);
        if (!c || !c.ativo) return s;
        return s + c.valorEfetivo;
      }, 0);
      return { mesYm: col.mesYm, total };
    });
    const geral = porMes
      .filter(t => {
        if (mesesOcultos.includes(t.mesYm)) return false;
        return data.colunas.find(c => c.mesYm === t.mesYm)?.contaNoTotal;
      })
      .reduce((s, t) => s + t.total, 0);
    return { porMes, geral };
  }, [data, linhasFiltradas, mesesOcultos]);

  const resumoNatureza = useMemo(() => {
    const map = { parcela: 0, recorrente: 0, unico: 0, manual: 0 };
    for (const l of linhasFiltradas) {
      map[l.natureza] = (map[l.natureza] ?? 0) + 1;
    }
    return map;
  }, [linhasFiltradas]);

  const limparFiltros = () => {
    setFiltroRubricas([]);
    setFiltroTipo(TIPO_TODOS);
    setFiltroBusca("");
    setOrdemLinhas(ORDEM_IMPACTO);
    setMesesOcultos([]);
    setFiltroPorMes({});
  };

  const toggleRubricaFiltro = (chave: string) => {
    setFiltroRubricas(prev =>
      prev.includes(chave) ? prev.filter(r => r !== chave) : [...prev, chave],
    );
  };

  const labelFiltroRubricas = () => {
    if (filtroRubricas.length === 0) return "Todas as rúbricas";
    if (filtroRubricas.length === 1) {
      const k = filtroRubricas[0]!;
      return k === RUBRICA_SEM ? "Sem rúbrica" : k;
    }
    return `${filtroRubricas.length} rúbricas`;
  };

  const toggleMesVisivel = (mesYm: string) => {
    setMesesOcultos(prev =>
      prev.includes(mesYm) ? prev.filter(m => m !== mesYm) : [...prev, mesYm],
    );
  };

  const mesesProjecaoAtivos = useMemo(
    () =>
      (data?.colunas ?? []).filter(
        c => c.contaNoTotal && !mesesOcultos.includes(c.mesYm),
      ),
    [data?.colunas, mesesOcultos],
  );

  const proximoMesDisponivel = useMemo(() => {
    const cols = data?.colunas ?? [];
    if (cols.length === 0) return addMonthsYm(mesInicioYm, 3);
    const ultimo = cols[cols.length - 1]!.mesYm;
    return addMonthsYm(ultimo, 1);
  }, [data?.colunas, mesInicioYm]);

  const ultimoMesRemovivel = useMemo(() => {
    const extras = (data?.colunas ?? []).filter(c => c.custom);
    return extras.length ? extras[extras.length - 1]! : null;
  }, [data?.colunas]);

  const adicionarProximoMes = () => {
    const ym = proximoMesDisponivel;
    setNovaColunaYm(addMonthsYm(ym, 1));
    addCol.mutate({ mesYm: ym });
  };

  const removerUltimoMesExtra = () => {
    if (!ultimoMesRemovivel) {
      toast.message(
        "Só é possível remover meses extras. Os 3 meses padrão ficam; desative o checkbox para ocultar.",
      );
      return;
    }
    remCol.mutate({ mesYm: ultimoMesRemovivel.mesYm });
  };

  if (proj.isLoading) {
    return (
      <p className="text-sm text-muted-foreground">
        Montando projeção de desembolso…
      </p>
    );
  }
  if (proj.isError) {
    return <p className="text-sm text-red-700">{proj.error.message}</p>;
  }
  if (!data) return null;

  const filtroAtivo =
    filtroRubricas.length > 0 ||
    filtroTipo !== TIPO_TODOS ||
    filtroBusca.trim().length > 0 ||
    ordemLinhas !== ORDEM_IMPACTO ||
    mesesOcultos.length > 0 ||
    Object.values(filtroPorMes).some(v => v !== MES_FILTRO_TODOS);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">Projeção de desembolso</CardTitle>
              <p className="text-xs text-muted-foreground">
                Base = pago no mês anterior · essenciais já projetados · demais
                você marca se continua · total = 3 meses à frente
              </p>
              <p className="text-xs text-muted-foreground">
                Recorrente {resumoNatureza.recorrente} · parcela{" "}
                {resumoNatureza.parcela} · único {resumoNatureza.unico} · manual{" "}
                {resumoNatureza.manual} · total
                {filtroAtivo ? " filtrado" : ""}{" "}
                <span className="font-semibold text-foreground">
                  {fmtMoney(totaisFiltrados.geral)}
                </span>
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 shrink-0"
              disabled={proj.isFetching}
              onClick={() => {
                void (async () => {
                  try {
                    const fresh =
                      await utils.financeiroCfo.projecaoDesembolso.fetch({
                        mesInicioYm,
                        forceRefreshCa: true,
                      });
                    utils.financeiroCfo.projecaoDesembolso.setData(
                      { mesInicioYm },
                      fresh,
                    );
                    toast.success("Base Conta Azul atualizada");
                  } catch (e) {
                    toast.error(
                      e instanceof Error ? e.message : "Falha ao atualizar",
                    );
                  }
                })();
              }}
            >
              {proj.isFetching ? "Atualizando…" : "Atualizar base CA"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-muted/20 p-2">
            <div className="min-w-[160px] flex-1">
              <Label className="text-xs">Desembolso</Label>
              <Input
                className="h-9"
                placeholder="Buscar descrição / fornecedor…"
                value={filtroBusca}
                onChange={e => setFiltroBusca(e.target.value)}
              />
            </div>
            <div className="min-w-[140px]">
              <Label className="text-xs">Tipo</Label>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TIPO_TODOS}>Todos os tipos</SelectItem>
                  <SelectItem value="recorrente">
                    Recorrente (marcados)
                  </SelectItem>
                  <SelectItem value="parcela">Parcela</SelectItem>
                  <SelectItem value="unico">Único</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[220px]">
              <Label className="text-xs">Rúbricas (múltipla · A–Z)</Label>
              <Popover open={rubricaMenuAberto} onOpenChange={setRubricaMenuAberto}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 w-full justify-between font-normal"
                  >
                    <span className="flex min-w-0 items-center gap-1 truncate">
                      <Filter className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{labelFiltroRubricas()}</span>
                    </span>
                    <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-2" align="start">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      Selecione uma ou mais
                    </p>
                    {filtroRubricas.length > 0 ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => setFiltroRubricas([])}
                      >
                        Limpar
                      </Button>
                    ) : null}
                  </div>
                  <div className="max-h-64 space-y-1 overflow-y-auto">
                    {rubricasDisponiveis.temSem ? (
                      <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted">
                        <Checkbox
                          checked={filtroRubricas.includes(RUBRICA_SEM)}
                          onCheckedChange={() =>
                            toggleRubricaFiltro(RUBRICA_SEM)
                          }
                        />
                        Sem rúbrica
                      </label>
                    ) : null}
                    {rubricasDisponiveis.nomes.map(r => (
                      <label
                        key={r}
                        className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                      >
                        <Checkbox
                          checked={filtroRubricas.includes(r)}
                          onCheckedChange={() => toggleRubricaFiltro(r)}
                        />
                        <span className="truncate">{r}</span>
                      </label>
                    ))}
                    {rubricasDisponiveis.nomes.length === 0 &&
                    !rubricasDisponiveis.temSem ? (
                      <p className="px-2 py-3 text-xs text-muted-foreground">
                        Nenhuma rúbrica na grade.
                      </p>
                    ) : null}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="min-w-[160px]">
              <Label className="text-xs">Ordenar</Label>
              <Select
                value={ordemLinhas}
                onValueChange={v => setOrdemLinhas(v as OrdemLinhas)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ORDEM_IMPACTO}>Por valor (maior)</SelectItem>
                  <SelectItem value={ORDEM_RUBRICA_AZ}>Rúbrica A–Z</SelectItem>
                  <SelectItem value={ORDEM_RUBRICA_ZA}>Rúbrica Z–A</SelectItem>
                  <SelectItem value={ORDEM_DESC_AZ}>Desembolso A–Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {filtroAtivo ? (
              <Button
                size="sm"
                variant="ghost"
                className="h-9 gap-1 text-muted-foreground"
                onClick={limparFiltros}
              >
                <X className="h-3.5 w-3.5" />
                Limpar
              </Button>
            ) : null}
            <div className="self-center pb-2 text-xs text-muted-foreground">
              {linhasFiltradas.length} de {data.linhas.length} linha(s)
            </div>
            <div className="flex flex-wrap gap-1 pb-0.5">
              <Button
                size="sm"
                variant="secondary"
                className="h-9 gap-1"
                disabled={salvarLote.isPending || linhasFiltradas.length === 0}
                onClick={() => marcar3MesesFiltradas(true)}
                title="Marca todos os meses à frente nas linhas filtradas"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Marcar meses à frente ({mesesProjecaoAtivos.length})
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-9 gap-1 text-muted-foreground"
                disabled={salvarLote.isPending || linhasFiltradas.length === 0}
                onClick={() => marcar3MesesFiltradas(false)}
              >
                Desmarcar meses à frente
              </Button>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold">Meses de projeção</p>
                <p className="text-[11px] text-muted-foreground">
                  Ative/desative colunas · adicione mais meses à frente ou
                  remova extras
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1"
                  disabled={addCol.isPending}
                  onClick={adicionarProximoMes}
                >
                  <Plus className="h-3.5 w-3.5" />
                  + Mês ({proximoMesDisponivel.slice(5)})
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1 text-muted-foreground"
                  disabled={remCol.isPending || !ultimoMesRemovivel}
                  onClick={removerUltimoMesExtra}
                  title={
                    ultimoMesRemovivel
                      ? `Remover ${ultimoMesRemovivel.label}`
                      : "Nenhum mês extra para remover"
                  }
                >
                  <Minus className="h-3.5 w-3.5" />
                  − Mês extra
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {data.colunas.map(c => {
                const visivel = !mesesOcultos.includes(c.mesYm);
                return (
                  <label
                    key={c.mesYm}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs ${
                      visivel
                        ? c.contaNoTotal
                          ? "border-primary/40 bg-primary/5"
                          : "border-muted-foreground/30 bg-background"
                        : "border-dashed opacity-50"
                    }`}
                  >
                    <Checkbox
                      checked={visivel}
                      onCheckedChange={() => toggleMesVisivel(c.mesYm)}
                    />
                    <span className="whitespace-nowrap">{c.label}</span>
                    <span className="text-[9px] text-muted-foreground">
                      {c.contaNoTotal
                        ? c.custom
                          ? "extra"
                          : "projeção"
                        : "contexto"}
                    </span>
                    {c.custom && visivel ? (
                      <button
                        type="button"
                        className="ml-0.5 text-muted-foreground hover:text-red-600"
                        title="Remover este mês da projeção"
                        onClick={e => {
                          e.preventDefault();
                          remCol.mutate({ mesYm: c.mesYm });
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    ) : null}
                  </label>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {mesesProjecaoAtivos.length} mês(es) à frente no total · use +
              Mês para estender (dez, jan…)
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div>
              <Label className="text-xs">Ou escolher mês específico</Label>
              <Input
                type="month"
                className="h-9 w-[150px]"
                value={novaColunaYm}
                onChange={e => setNovaColunaYm(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-1"
              disabled={addCol.isPending}
              onClick={() => addCol.mutate({ mesYm: novaColunaYm })}
            >
              <Plus className="h-3.5 w-3.5" />
              Ativar mês
            </Button>
            <div className="min-w-[180px] flex-1">
              <Label className="text-xs">Nova linha</Label>
              <Input
                className="h-9"
                placeholder="Descrição"
                value={novaLinhaDesc}
                onChange={e => setNovaLinhaDesc(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Rúbrica</Label>
              <Input
                className="h-9 w-[140px]"
                value={novaLinhaRubrica}
                onChange={e => setNovaLinhaRubrica(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              className="h-9 gap-1"
              disabled={addLinha.isPending}
              onClick={() => {
                if (!novaLinhaDesc.trim()) {
                  toast.error("Informe a descrição da linha");
                  return;
                }
                addLinha.mutate({
                  descricao: novaLinhaDesc,
                  rubrica: novaLinhaRubrica || null,
                  natureza: "manual",
                });
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Linha
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[720px] table-fixed text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <th className="w-[26%] px-3 py-2">Desembolso</th>
                  <th className="w-[8%] px-2 py-2">Tipo</th>
                  <th className="w-[7%] px-1 py-2 text-center normal-case">
                    Meses
                  </th>
                  {colunasVisiveis.map(c => (
                    <th key={c.mesYm} className="px-2 py-2 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center justify-end gap-1">
                          <span className="whitespace-nowrap">{c.label}</span>
                          {c.custom ? (
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-red-600"
                              title="Remover coluna"
                              onClick={() => remCol.mutate({ mesYm: c.mesYm })}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          ) : null}
                        </div>
                        {!c.contaNoTotal ? (
                          <span className="text-[9px] font-normal normal-case text-muted-foreground">
                            pago · contexto
                          </span>
                        ) : (
                          <select
                            className="h-6 max-w-[110px] rounded border bg-background px-1 text-[10px] font-normal normal-case"
                            value={filtroPorMes[c.mesYm] ?? MES_FILTRO_TODOS}
                            onChange={e =>
                              setFiltroPorMes(prev => ({
                                ...prev,
                                [c.mesYm]: e.target.value as FiltroMesCelula,
                              }))
                            }
                            title="Filtrar linhas neste mês"
                          >
                            <option value={MES_FILTRO_TODOS}>Todos</option>
                            <option value={MES_FILTRO_ATIVOS}>Só ativos</option>
                            <option value={MES_FILTRO_INATIVOS}>
                              Só inativos
                            </option>
                          </select>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="px-2 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {linhasFiltradas.map(lin => (
                  <tr key={lin.id} className="border-b align-top">
                    <td className="px-3 py-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="break-words font-medium leading-snug">
                            {lin.label}
                          </p>
                          <p className="mt-0.5 break-words text-[10px] text-muted-foreground">
                            {[lin.fornecedor, lin.rubrica]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </p>
                        </div>
                        {lin.origemLinha === "manual" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 shrink-0 gap-1 border-red-200 px-2 text-[11px] text-red-700 hover:bg-red-50 hover:text-red-800"
                            disabled={remLinha.isPending}
                            title="Excluir linha manual"
                            onClick={() => {
                              const id = Number(lin.id.replace("manual:", ""));
                              if (!Number.isFinite(id) || id <= 0) {
                                toast.error("Não foi possível identificar a linha");
                                return;
                              }
                              if (
                                !window.confirm(
                                  `Excluir a linha "${lin.label}"?`,
                                )
                              ) {
                                return;
                              }
                              remLinha.mutate({ id });
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                            Excluir
                          </Button>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-xs text-muted-foreground">
                      {naturezaLabel(lin.natureza)}
                    </td>
                    <td className="px-1 py-2 text-center">
                      {(() => {
                        const alvos = celulasEditaveis3Meses(lin);
                        if (alvos.length === 0) {
                          return (
                            <span className="text-[10px] text-muted-foreground">
                              —
                            </span>
                          );
                        }
                        const todosAtivos = alvos.every(c => c.ativo);
                        const algunsAtivos =
                          !todosAtivos && alvos.some(c => c.ativo);
                        return (
                          <Button
                            size="sm"
                            variant={todosAtivos ? "secondary" : "outline"}
                            className="h-8 px-2 text-[11px]"
                            disabled={
                              salvarLote.isPending &&
                              (loteLinhaId === lin.id ||
                                loteLinhaId === "__lote__")
                            }
                            title={
                              todosAtivos
                                ? "Desmarcar todos os meses à frente"
                                : "Marcar todos os meses à frente de uma vez"
                            }
                            onClick={() => marcar3MesesLinha(lin)}
                          >
                            <CheckCheck className="mr-1 h-3.5 w-3.5" />
                            {todosAtivos
                              ? "OK"
                              : algunsAtivos
                                ? "Completar"
                                : `+${alvos.length}`}
                          </Button>
                        );
                      })()}
                    </td>
                    {colunasVisiveis.map(col => {
                      const cel = lin.celulas.find(c => c.mesYm === col.mesYm);
                      if (!cel) return <td key={col.mesYm} />;
                      const k = cellKey(lin.id, cel.mesYm);
                      const draft = draftValor[k];
                      return (
                        <td key={cel.mesYm} className="px-2 py-1.5">
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-1">
                              {cel.editavel ? (
                                <Checkbox
                                  checked={cel.ativo}
                                  disabled={celulaPendente(lin.id, cel.mesYm)}
                                  onCheckedChange={v => {
                                    const ativar = v === true;
                                    const valor = ativar
                                      ? sugerirValorAoAtivarProjecao(
                                          cel,
                                          lin.celulas,
                                        )
                                      : cel.valorEfetivo;
                                    if (ativar && valor > 0) {
                                      setDraftValor(prev => ({
                                        ...prev,
                                        [k]: String(valor),
                                      }));
                                    }
                                    salvarCelula.mutate({
                                      linhaId: lin.id,
                                      mesYm: cel.mesYm,
                                      ativo: ativar,
                                      valorOverride: ativar
                                        ? valor
                                        : cel.valorEfetivo,
                                    });
                                  }}
                                  aria-label="Incluir na projeção"
                                  title="Marcar se vai continuar"
                                />
                              ) : (
                                <Lock className="h-3 w-3 text-muted-foreground" />
                              )}
                              {cel.editavel ? (
                                <Input
                                  className="h-8 w-[100px] text-right"
                                  type="number"
                                  step="0.01"
                                  disabled={
                                    !cel.ativo ||
                                    celulaPendente(lin.id, cel.mesYm)
                                  }
                                  placeholder={
                                    cel.valorBase > 0
                                      ? String(cel.valorBase)
                                      : undefined
                                  }
                                  value={
                                    draft ??
                                    (cel.ativo && cel.valorEfetivo
                                      ? String(cel.valorEfetivo)
                                      : cel.ativo && cel.valorBase
                                        ? String(cel.valorBase)
                                        : "")
                                  }
                                  onChange={e =>
                                    setDraftValor(prev => ({
                                      ...prev,
                                      [k]: e.target.value,
                                    }))
                                  }
                                  onBlur={() => {
                                    const raw = draftValor[k];
                                    if (raw == null) return;
                                    const n = Number(raw);
                                    if (!Number.isFinite(n)) return;
                                    if (n === cel.valorEfetivo) return;
                                    salvarCelula.mutate({
                                      linhaId: lin.id,
                                      mesYm: cel.mesYm,
                                      valorOverride: n,
                                      ativo: cel.ativo,
                                    });
                                  }}
                                />
                              ) : (
                                <span className="font-medium tabular-nums">
                                  {fmtMoney(cel.valorEfetivo)}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {origemLabel(cel.origem)}
                              {cel.editavel && !cel.ativo
                                ? " · marque p/ continuar"
                                : ""}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-2 py-2 text-right font-semibold tabular-nums">
                      {fmtMoney(lin.totalAtivo)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/30 font-semibold">
                  <td className="px-2 py-2" colSpan={3}>
                    Total (3 meses à frente)
                    {filtroAtivo ? " · filtro" : ""}
                  </td>
                  {colunasVisiveis.map(col => {
                    const t = totaisFiltrados.porMes.find(
                      x => x.mesYm === col.mesYm,
                    );
                    const noTotal = col.contaNoTotal !== false;
                    return (
                      <td
                        key={col.mesYm}
                        className={`px-2 py-2 text-right tabular-nums ${
                          noTotal ? "" : "text-muted-foreground/70"
                        }`}
                      >
                        {fmtMoney(t?.total ?? 0)}
                        {!noTotal ? (
                          <span className="mt-0.5 block text-[9px] font-normal">
                            fora do total
                          </span>
                        ) : null}
                      </td>
                    );
                  })}
                  <td className="px-2 py-2 text-right tabular-nums">
                    {fmtMoney(totaisFiltrados.geral)}
                  </td>
                </tr>
              </tfoot>
            </table>
            {linhasFiltradas.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {filtroAtivo
                  ? "Nenhuma linha com esses filtros."
                  : "Sem pagamentos executados no mês anterior. Confira o Conta Azul ou adicione uma linha."}
              </p>
            ) : null}
          </div>

          {(data.avisos ?? []).length ? (
            <ul className="list-inside list-disc text-[11px] text-muted-foreground">
              {data.avisos.map(a => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
