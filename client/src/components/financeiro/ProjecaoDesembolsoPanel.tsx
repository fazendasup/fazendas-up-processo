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

  const linhasFiltradas = useMemo(() => {
    const linhas = data?.linhas ?? [];
    if (filtroRubrica === RUBRICA_TODAS) return linhas;
    if (filtroRubrica === RUBRICA_SEM) {
      return linhas.filter(l => !l.rubrica?.trim());
    }
    return linhas.filter(l => (l.rubrica?.trim() || "") === filtroRubrica);
  }, [data?.linhas, filtroRubrica]);

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
      .filter(t => data.colunas.find(c => c.mesYm === t.mesYm)?.contaNoTotal)
      .reduce((s, t) => s + t.total, 0);
    return { porMes, geral };
  }, [data, linhasFiltradas]);

  const resumoNatureza = useMemo(() => {
    const map = { parcela: 0, recorrente: 0, unico: 0, manual: 0 };
    for (const l of linhasFiltradas) {
      map[l.natureza] = (map[l.natureza] ?? 0) + 1;
    }
    return map;
  }, [linhasFiltradas]);

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

  const filtroAtivo = filtroRubrica !== RUBRICA_TODAS;

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
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[220px]">
              <Label className="text-xs">Filtrar por rúbrica</Label>
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
            {filtroAtivo ? (
              <Button
                size="sm"
                variant="ghost"
                className="h-9 gap-1 text-muted-foreground"
                onClick={() => setFiltroRubrica(RUBRICA_TODAS)}
              >
                <X className="h-3.5 w-3.5" />
                Limpar filtro
              </Button>
            ) : null}
            <div className="self-center pb-2 text-xs text-muted-foreground">
              {linhasFiltradas.length} de {data.linhas.length} linha(s)
            </div>
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
            <table className="w-full min-w-[960px] table-fixed text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <th className="w-[28%] px-3 py-2">Desembolso</th>
                  <th className="w-[7%] px-2 py-2">Tipo</th>
                  {data.colunas.map(c => (
                    <th key={c.mesYm} className="px-2 py-2 text-right">
                      <div className="flex flex-col items-end gap-0.5">
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
                        ) : null}
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
                    {lin.celulas.map(cel => {
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
                  {totaisFiltrados.porMes.map(t => {
                    const col = data.colunas.find(c => c.mesYm === t.mesYm);
                    const noTotal = col?.contaNoTotal !== false;
                    return (
                      <td
                        key={t.mesYm}
                        className={`px-2 py-2 text-right tabular-nums ${
                          noTotal ? "" : "text-muted-foreground/70"
                        }`}
                      >
                        {fmtMoney(t.total)}
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
                  ? "Nenhuma linha com essa rúbrica."
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
