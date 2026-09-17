import { useMemo, useState } from "react";
import { Filter, Lock, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@shared/financeiroProjecaoDesembolso";

const RUBRICA_SEM = "__sem_rubrica__";
const RUBRICA_TODAS = "__todas__";
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
  const [filtroRubrica, setFiltroRubrica] = useState<string>(RUBRICA_TODAS);
  const [filtroBusca, setFiltroBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>(TIPO_TODOS);
  const [ordemLinhas, setOrdemLinhas] = useState<OrdemLinhas>(ORDEM_IMPACTO);
  const [mesesOcultos, setMesesOcultos] = useState<string[]>([]);
  const [filtroPorMes, setFiltroPorMes] = useState<
    Record<string, FiltroMesCelula>
  >({});

  const proj = trpc.financeiroCfo.projecaoDesembolso.useQuery(
    { mesInicioYm },
    { staleTime: 30_000, retry: 1 },
  );

  const salvarCelula = trpc.financeiroCfo.salvarCelulaProjecao.useMutation({
    onSuccess: async () => {
      await utils.financeiroCfo.projecaoDesembolso.invalidate();
    },
    onError: e => toast.error(e.message),
  });
  const addCol = trpc.financeiroCfo.adicionarColunaProjecao.useMutation({
    onSuccess: async () => {
      toast.success("Coluna adicionada");
      await utils.financeiroCfo.projecaoDesembolso.invalidate();
    },
    onError: e => toast.error(e.message),
  });
  const remCol = trpc.financeiroCfo.removerColunaProjecao.useMutation({
    onSuccess: async () => {
      toast.success("Coluna removida");
      await utils.financeiroCfo.projecaoDesembolso.invalidate();
    },
    onError: e => toast.error(e.message),
  });
  const addLinha = trpc.financeiroCfo.adicionarLinhaProjecao.useMutation({
    onSuccess: async () => {
      toast.success("Linha adicionada");
      setNovaLinhaDesc("");
      setNovaLinhaRubrica("");
      await utils.financeiroCfo.projecaoDesembolso.invalidate();
    },
    onError: e => toast.error(e.message),
  });
  const remLinha = trpc.financeiroCfo.removerLinhaProjecao.useMutation({
    onSuccess: async () => {
      toast.success("Linha removida");
      await utils.financeiroCfo.projecaoDesembolso.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  const data = proj.data;
  const cellKey = (linhaId: string, mesYm: string) => `${linhaId}||${mesYm}`;

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
    let list = linhas.filter(l => {
      if (filtroRubrica === RUBRICA_SEM) {
        if (l.rubrica?.trim()) return false;
      } else if (filtroRubrica !== RUBRICA_TODAS) {
        if ((l.rubrica?.trim() || "") !== filtroRubrica) return false;
      }
      if (filtroTipo !== TIPO_TODOS && l.natureza !== filtroTipo) return false;
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
    filtroRubrica,
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
    setFiltroRubrica(RUBRICA_TODAS);
    setFiltroTipo(TIPO_TODOS);
    setFiltroBusca("");
    setOrdemLinhas(ORDEM_IMPACTO);
    setMesesOcultos([]);
    setFiltroPorMes({});
  };

  const toggleMesVisivel = (mesYm: string) => {
    setMesesOcultos(prev =>
      prev.includes(mesYm) ? prev.filter(m => m !== mesYm) : [...prev, mesYm],
    );
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
    filtroRubrica !== RUBRICA_TODAS ||
    filtroTipo !== TIPO_TODOS ||
    filtroBusca.trim().length > 0 ||
    ordemLinhas !== ORDEM_IMPACTO ||
    mesesOcultos.length > 0 ||
    Object.values(filtroPorMes).some(v => v !== MES_FILTRO_TODOS);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
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
                  <SelectItem value="recorrente">Recorrente</SelectItem>
                  <SelectItem value="parcela">Parcela</SelectItem>
                  <SelectItem value="unico">Único</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[200px]">
              <Label className="text-xs">Rúbrica (A–Z)</Label>
              <Select value={filtroRubrica} onValueChange={setFiltroRubrica}>
                <SelectTrigger className="h-9">
                  <Filter className="mr-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <SelectValue placeholder="Todas as rúbricas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={RUBRICA_TODAS}>Todas as rúbricas</SelectItem>
                  {rubricasDisponiveis.temSem ? (
                    <SelectItem value={RUBRICA_SEM}>Sem rúbrica</SelectItem>
                  ) : null}
                  {rubricasDisponiveis.nomes.map(r => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Colunas (mês):
            </span>
            {data.colunas.map(c => {
              const visivel = !mesesOcultos.includes(c.mesYm);
              return (
                <label
                  key={c.mesYm}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${
                    visivel
                      ? "border-primary/30 bg-primary/5"
                      : "border-dashed opacity-60"
                  }`}
                >
                  <Checkbox
                    checked={visivel}
                    onCheckedChange={() => toggleMesVisivel(c.mesYm)}
                  />
                  {c.label}
                </label>
              );
            })}
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div>
              <Label className="text-xs">Nova coluna (mês)</Label>
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
              Coluna
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
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {linhasFiltradas.map(lin => (
                  <tr key={lin.id} className="border-b align-top">
                    <td className="px-3 py-2">
                      <p className="break-words font-medium leading-snug">
                        {lin.label}
                      </p>
                      <p className="mt-0.5 break-words text-[10px] text-muted-foreground">
                        {[lin.fornecedor, lin.rubrica].filter(Boolean).join(" · ") ||
                          "—"}
                      </p>
                    </td>
                    <td className="px-2 py-2 text-xs text-muted-foreground">
                      {naturezaLabel(lin.natureza)}
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
                                  disabled={salvarCelula.isPending}
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
                                  disabled={!cel.ativo || salvarCelula.isPending}
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
                    <td className="px-2 py-2">
                      {lin.origemLinha === "manual" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                          onClick={() => {
                            const id = Number(lin.id.replace("manual:", ""));
                            if (Number.isFinite(id)) remLinha.mutate({ id });
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/30 font-semibold">
                  <td className="px-2 py-2" colSpan={2}>
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
                  <td />
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
