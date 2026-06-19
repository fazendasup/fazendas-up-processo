import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  LABEL_TIPO_FICHA_CUSTO_PRODUTO,
  type TipoFichaCustoProduto,
} from "@shared/custosProduto";
import {
  AlertTriangle,
  Plus,
  Save,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

const fmtMoney = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n)
    ? "—"
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const fmtPct = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n) ? "—" : `${n.toFixed(1)}%`;

function isoLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function inicioMesAtual() {
  const d = new Date();
  return isoLocal(new Date(d.getFullYear(), d.getMonth(), 1));
}

type LinhaForm = {
  key: string;
  fichaId: string;
  nomeProduto: string;
  quantidade: string;
  receitaTotal: string;
  custoUnitarioManual: string;
};

function emptyLinha(): LinhaForm {
  return {
    key: crypto.randomUUID(),
    fichaId: "",
    nomeProduto: "",
    quantidade: "",
    receitaTotal: "",
    custoUnitarioManual: "",
  };
}

function parseNum(s: string): number {
  const t = s.trim().replace(",", ".");
  if (!t) return 0;
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}

export function CustosRentabilidadePanel() {
  const utils = trpc.useUtils();
  const periodos = trpc.custosProducao.rentabilidade.listarPeriodos.useQuery();
  const fichas = trpc.custosProducao.produtos.listarFichas.useQuery();
  const sugestao = trpc.custosProducao.rentabilidade.sugestaoCustoOperacional.useQuery();

  const [periodoId, setPeriodoId] = useState<number | null>(null);
  const [titulo, setTitulo] = useState("");
  const [inicio, setInicio] = useState(inicioMesAtual());
  const [fim, setFim] = useState(isoLocal(new Date()));
  const [usarCustoSugerido, setUsarCustoSugerido] = useState(true);
  const [custoOperacional, setCustoOperacional] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [linhas, setLinhas] = useState<LinhaForm[]>([emptyLinha()]);

  const detalhe = trpc.custosProducao.rentabilidade.obterPeriodo.useQuery(
    { id: periodoId! },
    { enabled: periodoId != null },
  );

  const salvar = trpc.custosProducao.rentabilidade.salvarPeriodo.useMutation({
    onSuccess: async (data) => {
      toast.success("Análise salva");
      setPeriodoId(data.periodo.id);
      await utils.custosProducao.rentabilidade.listarPeriodos.invalidate();
      await utils.custosProducao.rentabilidade.obterPeriodo.invalidate({ id: data.periodo.id });
    },
    onError: (e) => toast.error(e.message),
  });

  const excluir = trpc.custosProducao.rentabilidade.excluirPeriodo.useMutation({
    onSuccess: async () => {
      toast.success("Período excluído");
      setPeriodoId(null);
      resetNovo();
      await utils.custosProducao.rentabilidade.listarPeriodos.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const fichaOptions = useMemo(() => fichas.data ?? [], [fichas.data]);

  const custoPorFicha = useMemo(() => {
    const map = new Map<number, number | null>();
    for (const row of fichaOptions) {
      map.set(row.ficha.id, row.resultado.custoPorUnidade ?? null);
    }
    return map;
  }, [fichaOptions]);

  function resetNovo() {
    setTitulo("");
    setInicio(inicioMesAtual());
    setFim(isoLocal(new Date()));
    setUsarCustoSugerido(true);
    setCustoOperacional("");
    setObservacoes("");
    setLinhas([emptyLinha()]);
  }

  function novoPeriodo() {
    setPeriodoId(null);
    resetNovo();
  }

  useEffect(() => {
    if (periodoId != null || !detalhe.data) return;
  }, [periodoId, detalhe.data]);

  useEffect(() => {
    if (!detalhe.data || periodoId == null) return;
    const p = detalhe.data.periodo;
    setTitulo(p.titulo);
    setInicio(isoLocal(new Date(p.inicio)));
    setFim(isoLocal(new Date(p.fim)));
    setUsarCustoSugerido(p.usarCustoSugerido);
    setCustoOperacional(String(p.custoOperacionalTotal ?? ""));
    setObservacoes(p.observacoes ?? "");
    setLinhas(
      detalhe.data.linhas.length > 0
        ? detalhe.data.linhas.map((l) => ({
            key: String(l.id),
            fichaId: l.fichaId != null ? String(l.fichaId) : "",
            nomeProduto: l.nomeProduto,
            quantidade: String(l.quantidade),
            receitaTotal: String(l.receitaTotal),
            custoUnitarioManual:
              l.custoUnitarioManual != null ? String(l.custoUnitarioManual) : "",
          }))
        : [emptyLinha()],
    );
  }, [detalhe.data, periodoId]);

  useEffect(() => {
    if (!usarCustoSugerido || custoOperacional) return;
    if (sugestao.data?.total != null) {
      setCustoOperacional(String(sugestao.data.total));
    }
  }, [usarCustoSugerido, sugestao.data?.total, custoOperacional]);

  const resultado = detalhe.data;

  const handleSalvar = () => {
    const linhasValidas = linhas.filter(
      (l) => l.nomeProduto.trim() && (parseNum(l.quantidade) > 0 || parseNum(l.receitaTotal) > 0),
    );
    if (linhasValidas.length === 0) {
      toast.error("Adicione ao menos uma linha com produto e receita ou quantidade.");
      return;
    }
    salvar.mutate({
      id: periodoId ?? undefined,
      titulo: titulo.trim() || `Período ${inicio}`,
      inicio: new Date(`${inicio}T12:00:00`),
      fim: new Date(`${fim}T12:00:00`),
      usarCustoSugerido,
      custoOperacionalTotal: usarCustoSugerido
        ? null
        : parseNum(custoOperacional) || null,
      observacoes: observacoes.trim() || null,
      linhas: linhasValidas.map((l, idx) => ({
        fichaId: l.fichaId ? Number(l.fichaId) : null,
        nomeProduto: l.nomeProduto.trim(),
        quantidade: parseNum(l.quantidade),
        receitaTotal: parseNum(l.receitaTotal),
        custoUnitarioManual: l.custoUnitarioManual.trim()
          ? parseNum(l.custoUnitarioManual)
          : null,
        ordem: idx,
      })),
    });
  };

  const updateLinha = (key: string, patch: Partial<LinhaForm>) => {
    setLinhas((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        const next = { ...l, ...patch };
        if (patch.fichaId !== undefined && patch.fichaId) {
          const ficha = fichaOptions.find((f) => String(f.ficha.id) === patch.fichaId);
          if (ficha) {
            next.nomeProduto = ficha.ficha.nome;
          }
        }
        return next;
      }),
    );
  };

  return (
    <div className="space-y-4 mt-4">
      <Alert>
        <Wallet className="h-4 w-4" />
        <AlertTitle>Lucro e prejuízo por SKU — lançamento manual</AlertTitle>
        <AlertDescription>
          Informe as vendas do período (quantidade e receita). O CMV vem da ficha em{" "}
          <strong>Produtos vendidos</strong>, ou você pode sobrescrever o custo unitário na linha.
          O custo operacional do mês pode vir das rubricas em <strong>Compartilhados</strong> ou ser
          digitado manualmente.
        </AlertDescription>
      </Alert>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={periodoId != null ? String(periodoId) : "__novo__"}
          onValueChange={(v) => {
            if (v === "__novo__") novoPeriodo();
            else setPeriodoId(Number(v));
          }}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__novo__">+ Novo período</SelectItem>
            {(periodos.data ?? []).map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.titulo} ({isoLocal(new Date(p.inicio))} — {isoLocal(new Date(p.fim))})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={novoPeriodo}>
          <Plus className="h-4 w-4 mr-1" />
          Novo
        </Button>
        {periodoId != null ? (
          <Button
            variant="destructive"
            size="sm"
            disabled={excluir.isPending}
            onClick={() => {
              if (window.confirm("Excluir este período e todos os lançamentos?")) {
                excluir.mutate({ id: periodoId });
              }
            }}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Excluir período
          </Button>
        ) : null}
      </div>

      {resultado ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground">Receita</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold tabular-nums">{fmtMoney(resultado.totais.receita)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground">CMV</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold tabular-nums">{fmtMoney(resultado.totais.cmv)}</p>
              <p className="text-xs text-muted-foreground">
                Margem bruta {fmtPct(resultado.totais.margemBrutaPct)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground">Custo operacional</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold tabular-nums">
                {fmtMoney(resultado.periodo.custoOperacionalTotal)}
              </p>
            </CardContent>
          </Card>
          <Card
            className={
              resultado.totais.resultado >= 0
                ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/20"
                : "border-rose-200 bg-rose-50/40 dark:border-rose-900 dark:bg-rose-950/20"
            }
          >
            <CardHeader className="pb-1">
              <CardTitle className="text-xs">Resultado do período</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold tabular-nums flex items-center gap-2">
                {resultado.totais.resultado >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-rose-600" />
                )}
                {fmtMoney(resultado.totais.resultado)}
              </p>
              <p className="text-xs text-muted-foreground">
                {resultado.totais.linhasLucro} lucro · {resultado.totais.linhasPrejuizo} prejuízo ·{" "}
                {resultado.totais.linhasIncompletas} incompleto(s)
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Período e custos da operação</CardTitle>
          <CardDescription>
            Sugestão de custo operacional: {fmtMoney(sugestao.data?.total ?? 0)} (soma das rubricas
            mensais em Compartilhados)
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Jun/2026" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Início</Label>
              <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fim</Label>
              <Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-3 md:col-span-2">
            <Switch checked={usarCustoSugerido} onCheckedChange={setUsarCustoSugerido} />
            <Label className="font-normal">
              Usar custo operacional sugerido das rubricas compartilhadas
            </Label>
          </div>
          {!usarCustoSugerido ? (
            <div className="space-y-2 md:col-span-2">
              <Label>Custo operacional do período (R$)</Label>
              <Input
                inputMode="decimal"
                value={custoOperacional}
                onChange={(e) => setCustoOperacional(e.target.value)}
                placeholder="Frete, mão de obra, overhead..."
              />
            </div>
          ) : null}
          <div className="space-y-2 md:col-span-2">
            <Label>Observações</Label>
            <Textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Notas sobre o período, ajustes, exceções..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Vendas do período (manual)</CardTitle>
            <CardDescription>
              Vincule à ficha para puxar o CMV automaticamente, ou informe o custo unitário na linha.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => setLinhas((p) => [...p, emptyLinha()])}>
            <Plus className="h-4 w-4 mr-1" />
            Linha
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {linhas.map((linha) => {
            const custoFicha =
              linha.fichaId && custoPorFicha.get(Number(linha.fichaId)) != null
                ? custoPorFicha.get(Number(linha.fichaId))
                : null;
            return (
              <div
                key={linha.key}
                className="grid gap-2 rounded-lg border p-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_5rem_6rem_6rem_5rem_auto]"
              >
                <div className="space-y-1">
                  <Label className="text-xs">Ficha (opcional)</Label>
                  <Select
                    value={linha.fichaId || "__manual__"}
                    onValueChange={(v) =>
                      updateLinha(linha.key, { fichaId: v === "__manual__" ? "" : v })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Manual" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__manual__">Sem ficha / manual</SelectItem>
                      {fichaOptions.map((f) => (
                        <SelectItem key={f.ficha.id} value={String(f.ficha.id)}>
                          {f.ficha.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Produto / SKU</Label>
                  <Input
                    className="h-9"
                    value={linha.nomeProduto}
                    onChange={(e) => updateLinha(linha.key, { nomeProduto: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Qtd.</Label>
                  <Input
                    className="h-9"
                    inputMode="decimal"
                    value={linha.quantidade}
                    onChange={(e) => updateLinha(linha.key, { quantidade: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Receita R$</Label>
                  <Input
                    className="h-9"
                    inputMode="decimal"
                    value={linha.receitaTotal}
                    onChange={(e) => updateLinha(linha.key, { receitaTotal: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Custo un. (opc.)</Label>
                  <Input
                    className="h-9"
                    inputMode="decimal"
                    value={linha.custoUnitarioManual}
                    onChange={(e) =>
                      updateLinha(linha.key, { custoUnitarioManual: e.target.value })
                    }
                    placeholder={custoFicha != null ? String(custoFicha) : ""}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setLinhas((p) => p.filter((l) => l.key !== linha.key))}
                    disabled={linhas.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {custoFicha != null && !linha.custoUnitarioManual ? (
                  <p className="text-[11px] text-muted-foreground md:col-span-full">
                    CMV da ficha: {fmtMoney(custoFicha)}/un
                  </p>
                ) : null}
              </div>
            );
          })}
          <Button onClick={handleSalvar} disabled={salvar.isPending} className="w-full sm:w-auto">
            <Save className="h-4 w-4 mr-2" />
            {salvar.isPending ? "Salvando..." : "Salvar e calcular"}
          </Button>
        </CardContent>
      </Card>

      {resultado && resultado.linhas.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resultado por produto</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Qtd.</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">CMV</TableHead>
                  <TableHead className="text-right">Lucro bruto</TableHead>
                  <TableHead className="text-right">Rateio op.</TableHead>
                  <TableHead className="text-right">Contribuição</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {resultado.linhas.map((l) => {
                  const r = l.resultado;
                  if (!r) return null;
                  return (
                    <TableRow key={l.id}>
                      <TableCell>
                        <div className="font-medium">{l.nomeProduto}</div>
                        {l.fichaId ? (
                          <span className="text-[11px] text-muted-foreground">
                            Ficha #{l.fichaId}
                            {r.custoUnitarioFonte === "manual" ? " · custo manual" : ""}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{l.quantidade}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtMoney(l.receitaTotal)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmtMoney(r.cmv)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtMoney(r.lucroBruto)}
                        <span className="block text-[10px] text-muted-foreground">
                          {fmtPct(r.margemBrutaPct)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtMoney(r.rateioOperacional)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        {fmtMoney(r.contribuicao)}
                      </TableCell>
                      <TableCell>
                        {r.status === "lucro" ? (
                          <Badge className="bg-emerald-600">Lucro</Badge>
                        ) : r.status === "prejuizo" ? (
                          <Badge variant="destructive">Prejuízo</Badge>
                        ) : (
                          <Badge variant="outline">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Incompleto
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {fichaOptions.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-sm">Fichas disponíveis (CMV de referência)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {fichaOptions.slice(0, 24).map((f) => (
              <Badge key={f.ficha.id} variant="secondary" className="font-normal">
                {f.ficha.nome}: {fmtMoney(f.resultado.custoPorUnidade)} ·{" "}
                {LABEL_TIPO_FICHA_CUSTO_PRODUTO[f.ficha.tipo as TipoFichaCustoProduto]}
              </Badge>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Sem fichas de produto</AlertTitle>
          <AlertDescription>
            Cadastre produtos na aba <strong>Produtos vendidos</strong> para calcular o CMV
            automaticamente, ou informe o custo unitário manualmente em cada linha.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
