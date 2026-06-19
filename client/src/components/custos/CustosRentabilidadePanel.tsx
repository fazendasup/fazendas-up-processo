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
import { LABEL_GRUPO_CUSTO_PRODUCAO, type GrupoCustoProducao } from "@shared/custosProducao";
import { calcularRentabilidade } from "@shared/custosRentabilidade";
import { downloadCsvUtf8Bom } from "@/lib/estoqueRelatorio";
import {
  AlertTriangle,
  CloudDownload,
  Download,
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

function mesReferenciaDeInicio(inicioStr: string) {
  return inicioStr.slice(0, 7);
}

function aplicarMesReferencia(mesRef: string) {
  const [y, m] = mesRef.split("-").map(Number);
  if (!y || !m) return null;
  const inicioMes = isoLocal(new Date(y, m - 1, 1));
  const fimMes = isoLocal(new Date(y, m, 0));
  const tituloMes = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", {
    month: "short",
    year: "numeric",
  });
  return { inicioMes, fimMes, tituloMes };
}

function fmtDataHora(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

function csvCell(v: string | number | null | undefined): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n\r;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function exportarCsvRentabilidade(
  tituloPeriodo: string,
  inicioStr: string,
  fimStr: string,
  calculo: ReturnType<typeof calcularRentabilidade>,
) {
  const headers = [
    "Produto",
    "Ficha ID",
    "Quantidade",
    "Receita (R$)",
    "Custo unit. (R$)",
    "Fonte custo",
    "CMV (R$)",
    "Lucro bruto (R$)",
    "Margem bruta (%)",
    "Rateio operacional (R$)",
    "Contribuição (R$)",
    "Status",
  ];
  const linhas = calculo.linhas.map((l) =>
    [
      csvCell(l.nomeProduto),
      csvCell(l.fichaId),
      csvCell(l.quantidade),
      csvCell(l.receitaTotal),
      csvCell(l.custoUnitario),
      csvCell(l.custoUnitarioFonte ?? ""),
      csvCell(l.cmv),
      csvCell(l.lucroBruto),
      csvCell(l.margemBrutaPct),
      csvCell(l.rateioOperacional),
      csvCell(l.contribuicao),
      csvCell(l.status),
    ].join(";"),
  );
  const resumo = [
    "",
    "",
    "",
    csvCell(calculo.totais.receita),
    "",
    "",
    csvCell(calculo.totais.cmv),
    csvCell(calculo.totais.lucroBruto),
    csvCell(calculo.totais.margemBrutaPct),
    csvCell(calculo.totais.custoOperacional),
    csvCell(calculo.totais.resultado),
    "TOTAL",
  ].join(";");
  const content = [headers.join(";"), ...linhas, resumo].join("\r\n");
  const slug = (tituloPeriodo.trim() || `${inicioStr}_${fimStr}`).replace(/[^\w.-]+/g, "_");
  downloadCsvUtf8Bom(content, `rentabilidade_${slug}.csv`);
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

  const periodoContaAzul = useMemo(
    () => ({
      inicio: new Date(`${inicio}T00:00:00`),
      fim: new Date(`${fim}T23:59:59`),
    }),
    [inicio, fim],
  );

  const vendasContaAzul = trpc.custosProducao.rentabilidade.vendasContaAzul.useQuery(periodoContaAzul, {
    staleTime: 60_000,
  });

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

  const fichaPorId = useMemo(() => {
    const map = new Map<number, (typeof fichaOptions)[number]>();
    for (const f of fichaOptions) map.set(f.ficha.id, f);
    return map;
  }, [fichaOptions]);

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

  const custoOpAtual = useMemo(() => {
    if (usarCustoSugerido) return sugestao.data?.total ?? 0;
    return parseNum(custoOperacional);
  }, [usarCustoSugerido, sugestao.data?.total, custoOperacional]);

  const linhasCalculo = useMemo(
    () =>
      linhas
        .filter(
          (l) =>
            l.nomeProduto.trim() &&
            (parseNum(l.quantidade) > 0 || parseNum(l.receitaTotal) > 0),
        )
        .map((l) => ({
          fichaId: l.fichaId ? Number(l.fichaId) : null,
          nomeProduto: l.nomeProduto.trim(),
          quantidade: parseNum(l.quantidade),
          receitaTotal: parseNum(l.receitaTotal),
          custoUnitarioManual: l.custoUnitarioManual.trim()
            ? parseNum(l.custoUnitarioManual)
            : null,
          custoUnitarioFicha: l.fichaId
            ? (custoPorFicha.get(Number(l.fichaId)) ?? null)
            : null,
        })),
    [linhas, custoPorFicha],
  );

  const calculoAtual = useMemo(() => {
    if (linhasCalculo.length === 0) return null;
    return calcularRentabilidade({
      linhas: linhasCalculo,
      custoOperacionalTotal: custoOpAtual,
    });
  }, [linhasCalculo, custoOpAtual]);

  const tituloExibicao = titulo.trim() || `Período ${inicio}`;

  const importarVendasContaAzul = () => {
    const produtos = vendasContaAzul.data?.produtos ?? [];
    if (produtos.length === 0) {
      toast.error("Nenhuma venda efetivada do Conta Azul neste período.");
      return;
    }
    setLinhas(
      produtos.map((p) => ({
        key: crypto.randomUUID(),
        fichaId: p.fichaId != null ? String(p.fichaId) : "",
        nomeProduto: p.produtoNome,
        quantidade: String(p.quantidade),
        receitaTotal: String(p.receitaTotal),
        custoUnitarioManual: "",
      })),
    );
    toast.success(`${produtos.length} produto(s) importados das vendas Conta Azul.`);
  };

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
      <Card className="border-indigo-200/60 bg-indigo-50/30 dark:border-indigo-900 dark:bg-indigo-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Como funciona o custo total
          </CardTitle>
          <CardDescription>
            O lucro real junta <strong>três peças</strong>. Você não preenche tudo na Rentabilidade — a
            maior parte vem de outras abas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>
              <strong className="text-foreground">Receita</strong> — importada do Conta Azul (vendas
              efetivadas do mês).
            </li>
            <li>
              <strong className="text-foreground">CMV por unidade (ficha)</strong> — matéria-prima + etapas com{" "}
              <strong>minutos/unidade</strong> × R$/h das equipes CLT/PJ em <strong>Equipes MO</strong>.
            </li>
            <li>
              <strong className="text-foreground">Overhead do mês</strong> — rubricas em{" "}
              <strong>Compartilhados</strong> + equipes MO <em>fixas</em> (supervisão/admin). Rateio pela receita.
            </li>
          </ol>
          <p className="rounded-md border bg-background/80 px-3 py-2 font-mono text-xs">
            Lucro bruto = Receita − CMV · Contribuição = Lucro bruto − rateio operacional · Resultado
            do mês = Lucro bruto − custo operacional total
          </p>
        </CardContent>
      </Card>

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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Período e custos da operação</CardTitle>
          <CardDescription>
            {usarCustoSugerido
              ? `Soma automática: ${fmtMoney(sugestao.data?.total ?? 0)}/mês (Compartilhados ${fmtMoney(sugestao.data?.rubricasCompartilhados ?? 0)} + MO fixa ${fmtMoney(sugestao.data?.moOverhead ?? 0)}).`
              : "Informe o total mensal de overhead (tudo que não está no CMV unitário das fichas)."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Mês de referência</Label>
            <Input
              type="month"
              value={mesReferenciaDeInicio(inicio)}
              onChange={(e) => {
                const parsed = aplicarMesReferencia(e.target.value);
                if (!parsed) return;
                setInicio(parsed.inicioMes);
                setFim(parsed.fimMes);
                if (!titulo.trim() || periodoId == null) setTitulo(parsed.tituloMes);
              }}
            />
          </div>
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
              Usar overhead sugerido (Compartilhados + MO fixa CLT/PJ)
            </Label>
          </div>
          {!usarCustoSugerido ? (
            <div className="space-y-2 md:col-span-2">
              <Label>Custo operacional do período (R$)</Label>
              <Input
                inputMode="decimal"
                value={custoOperacional}
                onChange={(e) => setCustoOperacional(e.target.value)}
                placeholder="Overhead total do mês: admin, energia fixa, frete fixo..."
              />
            </div>
          ) : (sugestao.data?.rubricas.length ?? 0) > 0 ||
            (sugestao.data?.equipesOverhead?.length ?? 0) > 0 ? (
            <div className="md:col-span-2 rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Origem</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">R$/mês</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(sugestao.data?.rubricas ?? []).map((r) => (
                    <TableRow key={`r-${r.id}`}>
                      <TableCell className="text-xs">Compartilhados</TableCell>
                      <TableCell>
                        <span className="text-[11px] text-muted-foreground block">
                          {LABEL_GRUPO_CUSTO_PRODUCAO[r.grupo as GrupoCustoProducao] ?? r.grupo}
                        </span>
                        {r.rubrica}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtMoney(r.valorMensal)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(sugestao.data?.equipesOverhead ?? []).map((e) => (
                    <TableRow key={`e-${e.id}`}>
                      <TableCell className="text-xs">MO fixa ({e.regime.toUpperCase()})</TableCell>
                      <TableCell>{e.nome}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtMoney(e.custoMensal)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/40 font-semibold">
                    <TableCell colSpan={2}>Total overhead sugerido</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtMoney(sugestao.data?.total ?? 0)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ) : (
            <Alert className="md:col-span-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Nenhuma rubrica mensal em <strong>Compartilhados</strong> (modo diferente de rateio
                entre variedades) e nenhuma equipe MO com finalidade <strong>overhead</strong>.
                Cadastre em Compartilhados ou Equipes MO, ou desligue a sugestão e digite o total
                manualmente.
              </AlertDescription>
            </Alert>
          )}
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
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">Vendas Conta Azul no período</CardTitle>
            <CardDescription>
              {vendasContaAzul.isLoading
                ? "Carregando vendas sincronizadas..."
                : vendasContaAzul.data
                  ? `${vendasContaAzul.data.pedidosVenda} pedido(s) · ${vendasContaAzul.data.produtos.length} produto(s) · receita ${fmtMoney(vendasContaAzul.data.receitaTotal)}`
                  : "Selecione o mês para ver as vendas reais."}
            </CardDescription>
            {vendasContaAzul.data?.ultimaSyncContaAzul ? (
              <p className="text-[11px] text-muted-foreground mt-1">
                Última sync Conta Azul: {fmtDataHora(vendasContaAzul.data.ultimaSyncContaAzul)}
                {vendasContaAzul.data.ultimaSyncStatus
                  ? ` (${vendasContaAzul.data.ultimaSyncStatus})`
                  : ""}
              </p>
            ) : null}
          </div>
          <Button
            size="sm"
            onClick={importarVendasContaAzul}
            disabled={
              vendasContaAzul.isLoading || (vendasContaAzul.data?.produtos.length ?? 0) === 0
            }
          >
            <CloudDownload className="h-4 w-4 mr-1" />
            Importar vendas
          </Button>
        </CardHeader>
        <CardContent>
          {vendasContaAzul.isError ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Erro ao carregar vendas</AlertTitle>
              <AlertDescription>{vendasContaAzul.error.message}</AlertDescription>
            </Alert>
          ) : vendasContaAzul.isLoading ? (
            <p className="text-sm text-muted-foreground">Consultando vendas do Conta Azul...</p>
          ) : (vendasContaAzul.data?.produtos.length ?? 0) === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Sem vendas no período</AlertTitle>
              <AlertDescription>
                Não há vendas efetivadas do Conta Azul entre {inicio} e {fim}. Verifique se a sync
                comercial está atualizada ou ajuste o mês.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {vendasContaAzul.data!.produtosSemFicha > 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {vendasContaAzul.data!.produtosSemFicha} produto(s) vendido(s) sem ficha de
                    custo vinculada — o CMV ficará incompleto até cadastrar em Produtos vendidos.
                  </AlertDescription>
                </Alert>
              ) : null}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto vendido</TableHead>
                    <TableHead className="text-right">Qtd.</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                    <TableHead>Ficha CMV</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendasContaAzul.data!.produtos.map((p) => (
                    <TableRow key={p.chave}>
                      <TableCell>
                        <div className="font-medium">{p.produtoNome}</div>
                        {p.sku ? (
                          <span className="text-[11px] text-muted-foreground">SKU {p.sku}</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{p.quantidade}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtMoney(p.receitaTotal)}
                      </TableCell>
                      <TableCell>
                        {p.fichaId ? (
                          <Badge variant="secondary" className="font-normal">
                            {p.fichaNome ?? `Ficha #${p.fichaId}`}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Sem ficha</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Linhas para análise</CardTitle>
            <CardDescription>
              Importe do Conta Azul ou ajuste manualmente. Vincule à ficha para CMV automático.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => setLinhas((p) => [...p, emptyLinha()])}>
            <Plus className="h-4 w-4 mr-1" />
            Linha
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {linhas.map((linha) => {
            const fichaRow =
              linha.fichaId ? fichaPorId.get(Number(linha.fichaId)) : undefined;
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
                  <Label className="text-xs">Custo un. manual</Label>
                  <Input
                    className="h-9"
                    inputMode="decimal"
                    value={linha.custoUnitarioManual}
                    onChange={(e) =>
                      updateLinha(linha.key, { custoUnitarioManual: e.target.value })
                    }
                    placeholder={custoFicha != null ? String(custoFicha) : "Só se não usar ficha"}
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
                {fichaRow && !linha.custoUnitarioManual ? (
                  <div className="md:col-span-full space-y-1">
                    {custoFicha != null ? (
                      <p className="text-[11px] text-muted-foreground">
                        CMV ficha: {fmtMoney(custoFicha)}/un · material{" "}
                        {fmtMoney(fichaRow.resultado.custoMaterial)} + processo{" "}
                        {fmtMoney(fichaRow.resultado.custoProcesso)}
                      </p>
                    ) : (
                      <p className="text-[11px] text-amber-700 dark:text-amber-300">
                        Ficha incompleta — CMV não calculável.
                      </p>
                    )}
                    {fichaRow.resultado.alertas.length > 0 ? (
                      <ul className="text-[11px] text-amber-700 dark:text-amber-300 list-disc list-inside">
                        {fichaRow.resultado.alertas.slice(0, 3).map((a) => (
                          <li key={a}>{a}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
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

      {calculoAtual ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground">Receita</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold tabular-nums">{fmtMoney(calculoAtual.totais.receita)}</p>
              <p className="text-xs text-muted-foreground">
                {linhasCalculo.length} produto(s)
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground">CMV (fichas)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold tabular-nums">{fmtMoney(calculoAtual.totais.cmv)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground">Lucro bruto</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold tabular-nums">
                {fmtMoney(calculoAtual.totais.lucroBruto)}
              </p>
              <p className="text-xs text-muted-foreground">
                Margem {fmtPct(calculoAtual.totais.margemBrutaPct)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground">Overhead do mês</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold tabular-nums">
                {fmtMoney(calculoAtual.totais.custoOperacional)}
              </p>
              {usarCustoSugerido ? (
                <p className="text-xs text-muted-foreground">Compartilhados + MO fixa</p>
              ) : null}
            </CardContent>
          </Card>
          <Card
            className={
              calculoAtual.totais.resultado >= 0
                ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/20"
                : "border-rose-200 bg-rose-50/40 dark:border-rose-900 dark:bg-rose-950/20"
            }
          >
            <CardHeader className="pb-1">
              <CardTitle className="text-xs">Resultado do período</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold tabular-nums flex items-center gap-2">
                {calculoAtual.totais.resultado >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-rose-600" />
                )}
                {fmtMoney(calculoAtual.totais.resultado)}
              </p>
              <p className="text-xs text-muted-foreground">
                {calculoAtual.totais.linhasLucro} lucro · {calculoAtual.totais.linhasPrejuizo}{" "}
                prejuízo · {calculoAtual.totais.linhasIncompletas} incompleto(s)
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {calculoAtual?.viabilidade ? (
        <Card className="border-amber-200/60 dark:border-amber-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Viabilidade — ponto de equilíbrio do mês</CardTitle>
            <CardDescription>
              Com o mix e preços atuais, quanto falta vender para cobrir o overhead fixo do período.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Contribuição média / unidade</p>
              <p className="text-lg font-bold tabular-nums">
                {fmtMoney(calculoAtual.viabilidade.contribuicaoMediaPorUnidade)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Equilíbrio (unidades no mix)</p>
              <p className="text-lg font-bold tabular-nums">
                {calculoAtual.viabilidade.pontoEquilibrioUnidades ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Já vendido no período</p>
              <p className="text-lg font-bold tabular-nums">
                {calculoAtual.viabilidade.quantidadeVendida}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Faltam p/ equilíbrio</p>
              <p
                className={`text-lg font-bold tabular-nums ${
                  (calculoAtual.viabilidade.unidadesFaltamEquilibrio ?? 0) > 0
                    ? "text-rose-600"
                    : "text-emerald-600"
                }`}
              >
                {calculoAtual.viabilidade.unidadesFaltamEquilibrio ?? 0} un.
              </p>
              {(calculoAtual.viabilidade.receitaFaltaEquilibrio ?? 0) > 0 ? (
                <p className="text-[11px] text-muted-foreground">
                  ≈ {fmtMoney(calculoAtual.viabilidade.receitaFaltaEquilibrio)} receita
                </p>
              ) : (
                <p className="text-[11px] text-emerald-600">Overhead coberto pelo mix atual</p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {calculoAtual && calculoAtual.linhas.length > 0 ? (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Resultado por produto</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                exportarCsvRentabilidade(tituloExibicao, inicio, fim, calculoAtual)
              }
            >
              <Download className="h-4 w-4 mr-1" />
              Exportar CSV
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Qtd.</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">CMV (ficha)</TableHead>
                  <TableHead className="text-right">Lucro bruto</TableHead>
                  <TableHead className="text-right">Rateio overhead</TableHead>
                  <TableHead className="text-right">Contribuição</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {calculoAtual.linhas.map((r, idx) => (
                  <TableRow key={`${r.nomeProduto}-${idx}`}>
                    <TableCell>
                      <div className="font-medium">{r.nomeProduto}</div>
                      {r.fichaId ? (
                        <span className="text-[11px] text-muted-foreground">
                          Ficha #{r.fichaId}
                          {r.custoUnitarioFonte === "manual" ? " · custo manual" : ""}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.quantidade}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtMoney(r.receitaTotal)}
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
                ))}
                <TableRow className="bg-muted/40 font-semibold">
                  <TableCell>Total do período</TableCell>
                  <TableCell />
                  <TableCell className="text-right tabular-nums">
                    {fmtMoney(calculoAtual.totais.receita)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtMoney(calculoAtual.totais.cmv)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtMoney(calculoAtual.totais.lucroBruto)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtMoney(calculoAtual.totais.custoOperacional)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtMoney(calculoAtual.totais.resultado)}
                  </TableCell>
                  <TableCell />
                </TableRow>
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
