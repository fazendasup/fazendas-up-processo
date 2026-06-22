import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { calcularRentabilidade } from "@shared/custosRentabilidade";
import type { LinhaRentabilidadeResultado } from "@shared/custosRentabilidade";
import {
  somarOverheadItensIncluidos,
  type ModoOverheadRentabilidade,
} from "@shared/custosRentabilidadeOverhead";
import { exportTableDocument, type TableExportInput } from "@/lib/exportTableDocument";
import { ExportMenu } from "@/components/ui/export-menu";
import {
  type ColumnFilterDef,
  useColumnTableFilters,
} from "@/lib/columnTableFilters";
import {
  CustosRentabilidadeOverheadSection,
  emptyOverheadItem,
  type OverheadItemForm,
} from "@/components/custos/CustosRentabilidadeOverheadSection";
import {
  AlertTriangle,
  CloudDownload,
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

const RESULTADO_PRODUTO_TABLE_ID = "rentabilidade-resultado-produto";

function labelStatusRentabilidade(status: LinhaRentabilidadeResultado["status"]) {
  if (status === "lucro") return "Lucro";
  if (status === "prejuizo") return "Prejuízo";
  return "Incompleto";
}

const RESULTADO_PRODUTO_COLUMNS: ColumnFilterDef<LinhaRentabilidadeResultado>[] = [
  { key: "produto", label: "Produto", value: (r) => r.nomeProduto },
  {
    key: "quantidade",
    label: "Qtd.",
    value: (r) => r.quantidade,
    optionLabel: (r) => String(r.quantidade),
  },
  {
    key: "receita",
    label: "Receita",
    value: (r) => r.receitaTotal,
    optionLabel: (r) => fmtMoney(r.receitaTotal),
  },
  {
    key: "cmv",
    label: "CMV (ficha)",
    value: (r) => r.cmv,
    optionLabel: (r) => fmtMoney(r.cmv),
  },
  {
    key: "lucroBruto",
    label: "Lucro bruto",
    value: (r) => r.lucroBruto,
    optionLabel: (r) =>
      r.lucroBruto != null
        ? `${fmtMoney(r.lucroBruto)} (${fmtPct(r.margemBrutaPct)})`
        : "—",
  },
  {
    key: "rateioOperacional",
    label: "Rateio overhead",
    value: (r) => r.rateioOperacional,
    optionLabel: (r) => fmtMoney(r.rateioOperacional),
  },
  {
    key: "contribuicao",
    label: "Contribuição",
    value: (r) => r.contribuicao,
    optionLabel: (r) => fmtMoney(r.contribuicao),
  },
  {
    key: "status",
    label: "Status",
    value: (r) => r.status,
    optionLabel: (r) => labelStatusRentabilidade(r.status),
  },
];

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

function mesRefDePeriodo(inicio: Date | string) {
  return mesReferenciaDeInicio(isoLocal(new Date(inicio)));
}

function encontrarPeriodoSalvoMes(
  periodos: { id: number; inicio: Date | string }[] | undefined,
  mesRef: string,
) {
  return periodos?.find((p) => mesRefDePeriodo(p.inicio) === mesRef);
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

function buildResultadoProdutoExport(
  tituloPeriodo: string,
  inicioStr: string,
  fimStr: string,
  linhas: LinhaRentabilidadeResultado[],
  totais: {
    receita: number;
    cmv: number;
    lucroBruto: number;
    rateio: number;
    contribuicao: number;
  },
  filtrado: boolean,
): TableExportInput {
  const headers = [
    "Produto",
    "Ficha",
    "Qtd.",
    "Receita",
    "CMV (ficha)",
    "Lucro bruto",
    "Margem %",
    "Rateio overhead",
    "Contribuição",
    "Status",
  ];
  const rows = linhas.map((l) => [
    l.nomeProduto,
    l.fichaId != null ? String(l.fichaId) : "",
    String(l.quantidade),
    fmtMoney(l.receitaTotal),
    fmtMoney(l.cmv),
    fmtMoney(l.lucroBruto),
    fmtPct(l.margemBrutaPct),
    fmtMoney(l.rateioOperacional),
    fmtMoney(l.contribuicao),
    labelStatusRentabilidade(l.status),
  ]);
  const footers = [
    [
      filtrado ? "Total (filtrado)" : "Total do período",
      "",
      "",
      fmtMoney(totais.receita),
      fmtMoney(totais.cmv),
      fmtMoney(totais.lucroBruto),
      "",
      fmtMoney(totais.rateio),
      fmtMoney(totais.contribuicao),
      "",
    ],
  ];
  const slug = (tituloPeriodo.trim() || `${inicioStr}_${fimStr}`).replace(/[^\w.-]+/g, "_");
  return {
    title: "Resultado por produto",
    subtitle: `${tituloPeriodo} · ${inicioStr} a ${fimStr}${filtrado ? " · visão filtrada" : ""}`,
    filename: `rentabilidade_resultado_${slug}`,
    headers,
    rows,
    footers,
    orientation: "landscape",
  };
}

function exportarResultadoProduto(
  tituloPeriodo: string,
  inicioStr: string,
  fimStr: string,
  linhas: LinhaRentabilidadeResultado[],
  totais: {
    receita: number;
    cmv: number;
    lucroBruto: number;
    rateio: number;
    contribuicao: number;
  },
  filtrado: boolean,
  format: "csv" | "pdf",
) {
  const input = buildResultadoProdutoExport(
    tituloPeriodo,
    inicioStr,
    fimStr,
    linhas,
    totais,
    filtrado,
  );
  exportTableDocument(input, format);
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
  const [modoOverhead, setModoOverhead] = useState<ModoOverheadRentabilidade>("itens");
  const [usarCustoSugerido, setUsarCustoSugerido] = useState(true);
  const [custoOperacional, setCustoOperacional] = useState("");
  const [overheadItens, setOverheadItens] = useState<OverheadItemForm[]>([]);
  const [observacoes, setObservacoes] = useState("");
  const [linhas, setLinhas] = useState<LinhaForm[]>([emptyLinha()]);
  const ultimoMesLinhasSincronizado = useRef<string | null>(null);
  const ultimoVendasFetchKey = useRef<string | null>(null);

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

  const vendasPorFichaId = useMemo(() => {
    const map = new Map<number, NonNullable<(typeof vendasContaAzul.data)["produtos"]>[number]>();
    for (const p of vendasContaAzul.data?.produtos ?? []) {
      if (p.fichaId != null) map.set(p.fichaId, p);
    }
    return map;
  }, [vendasContaAzul.data?.produtos]);

  const vendasPorProdutoId = useMemo(() => {
    const map = new Map<string, NonNullable<(typeof vendasContaAzul.data)["produtos"]>[number]>();
    for (const p of vendasContaAzul.data?.produtos ?? []) {
      if (p.produtoComercialId) map.set(p.produtoComercialId, p);
    }
    return map;
  }, [vendasContaAzul.data?.produtos]);

  function linhasFromVendasContaAzul(
    produtos: NonNullable<(typeof vendasContaAzul.data)["produtos"]>,
  ): LinhaForm[] {
    return produtos.map((p) => ({
      key: crypto.randomUUID(),
      fichaId: p.fichaId != null ? String(p.fichaId) : "",
      nomeProduto: p.produtoNome,
      quantidade: String(p.quantidade),
      receitaTotal: String(p.receitaTotal),
      custoUnitarioManual: "",
    }));
  }

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

  function aplicarFichaNaLinha(l: LinhaForm, fichaId: string): LinhaForm {
    if (!fichaId) return { ...l, fichaId: "" };
    const ficha = fichaPorId.get(Number(fichaId));
    if (!ficha) return { ...l, fichaId };
    const venda =
      vendasPorFichaId.get(Number(fichaId)) ??
      (ficha.ficha.produtoComercialId
        ? vendasPorProdutoId.get(ficha.ficha.produtoComercialId)
        : undefined);
    return {
      ...l,
      fichaId,
      nomeProduto: ficha.ficha.nome,
      custoUnitarioManual: "",
      quantidade: venda ? String(venda.quantidade) : l.quantidade,
      receitaTotal: venda ? String(venda.receitaTotal) : l.receitaTotal,
    };
  }

  function resetRefsSincLinhas() {
    ultimoMesLinhasSincronizado.current = null;
    ultimoVendasFetchKey.current = null;
  }

  function resetNovo() {
    setTitulo("");
    setInicio(inicioMesAtual());
    setFim(isoLocal(new Date()));
    setModoOverhead("itens");
    setUsarCustoSugerido(false);
    setCustoOperacional("");
    setOverheadItens([]);
    setObservacoes("");
    setLinhas([emptyLinha()]);
    resetRefsSincLinhas();
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
    const modo =
      (p as { modoOverhead?: ModoOverheadRentabilidade }).modoOverhead ??
      (p.usarCustoSugerido ? "sugerido" : "manual");
    setModoOverhead(modo);
    setUsarCustoSugerido(p.usarCustoSugerido);
    setCustoOperacional(String(p.custoOperacionalTotal ?? ""));
    setObservacoes(p.observacoes ?? "");
    setOverheadItens(
      (detalhe.data.overheadItens ?? []).length > 0
        ? detalhe.data.overheadItens.map((i) => ({
            key: String(i.id ?? crypto.randomUUID()),
            id: i.id,
            origem: i.origem as OverheadItemForm["origem"],
            contaAzulParcelaId: i.contaAzulParcelaId ?? undefined,
            refModeloId: i.refModeloId ?? undefined,
            grupo: i.grupo,
            rubrica: i.rubrica,
            descricao: i.descricao ?? "",
            valorOriginal: i.valorOriginal != null ? String(i.valorOriginal) : "",
            valor: String(i.valor),
            incluido: i.incluido,
          }))
        : [],
    );
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
    ultimoMesLinhasSincronizado.current = mesRefDePeriodo(p.inicio);
    ultimoVendasFetchKey.current = null;
  }, [detalhe.data, periodoId]);

  useEffect(() => {
    if (modoOverhead !== "manual" || custoOperacional) return;
    if (sugestao.data?.total != null) {
      setCustoOperacional(String(sugestao.data.total));
    }
  }, [modoOverhead, sugestao.data?.total, custoOperacional]);

  useEffect(() => {
    const mesRef = mesReferenciaDeInicio(inicio);
    if (vendasContaAzul.isLoading) return;

    const periodoSalvo = encontrarPeriodoSalvoMes(periodos.data, mesRef);
    const vendasKey = `${mesRef}:${vendasContaAzul.dataUpdatedAt ?? "pending"}`;

    if (periodoSalvo) {
      if (periodoId !== periodoSalvo.id) {
        setPeriodoId(periodoSalvo.id);
        return;
      }
      ultimoMesLinhasSincronizado.current = mesRef;
      ultimoVendasFetchKey.current = vendasKey;
      return;
    }

    if (periodoId != null) {
      setPeriodoId(null);
      resetRefsSincLinhas();
      return;
    }

    if (!vendasContaAzul.data) return;

    if (
      ultimoMesLinhasSincronizado.current === mesRef &&
      ultimoVendasFetchKey.current === vendasKey
    ) {
      return;
    }

    if (ultimoMesLinhasSincronizado.current !== mesRef) {
      void utils.custosProducao.produtos.listarFichas.invalidate();
    }

    ultimoMesLinhasSincronizado.current = mesRef;
    ultimoVendasFetchKey.current = vendasKey;

    const produtos = vendasContaAzul.data.produtos;
    setLinhas(produtos.length > 0 ? linhasFromVendasContaAzul(produtos) : [emptyLinha()]);
  }, [
    inicio,
    periodoId,
    periodos.data,
    utils.custosProducao.produtos.listarFichas,
    vendasContaAzul.data,
    vendasContaAzul.dataUpdatedAt,
    vendasContaAzul.isLoading,
  ]);

  const custoOpAtual = useMemo(() => {
    if (modoOverhead === "sugerido") return sugestao.data?.total ?? 0;
    if (modoOverhead === "manual") return parseNum(custoOperacional);
    return somarOverheadItensIncluidos(
      overheadItens.map((i) => ({ valor: parseNum(i.valor), incluido: i.incluido })),
    );
  }, [modoOverhead, sugestao.data?.total, custoOperacional, overheadItens]);

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

  const {
    hasColumnFilters,
    clearColumnFilters,
    filterAndSortRows,
    renderColumnHeader,
  } = useColumnTableFilters(RESULTADO_PRODUTO_TABLE_ID);

  useEffect(() => {
    clearColumnFilters();
  }, [inicio, fim, periodoId, clearColumnFilters]);

  const linhasResultadoFiltradas = useMemo(() => {
    if (!calculoAtual) return [];
    return filterAndSortRows(calculoAtual.linhas, RESULTADO_PRODUTO_COLUMNS);
  }, [calculoAtual, filterAndSortRows]);

  const totaisResultadoFiltrados = useMemo(() => {
    return {
      receita: linhasResultadoFiltradas.reduce((s, l) => s + l.receitaTotal, 0),
      cmv: linhasResultadoFiltradas.reduce((s, l) => s + (l.cmv ?? 0), 0),
      lucroBruto: linhasResultadoFiltradas.reduce((s, l) => s + (l.lucroBruto ?? 0), 0),
      rateio: linhasResultadoFiltradas.reduce((s, l) => s + l.rateioOperacional, 0),
      contribuicao: linhasResultadoFiltradas.reduce((s, l) => s + (l.contribuicao ?? 0), 0),
    };
  }, [linhasResultadoFiltradas]);

  const tituloExibicao = titulo.trim() || `Período ${inicio}`;

  const importarVendasContaAzul = () => {
    const produtos = vendasContaAzul.data?.produtos ?? [];
    if (produtos.length === 0) {
      toast.error("Nenhuma venda efetivada do Conta Azul neste período.");
      return;
    }
    const mesRef = mesReferenciaDeInicio(inicio);
    setLinhas(linhasFromVendasContaAzul(produtos));
    ultimoMesLinhasSincronizado.current = mesRef;
    ultimoVendasFetchKey.current = `${mesRef}:${vendasContaAzul.dataUpdatedAt ?? "manual"}`;
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
      modoOverhead,
      usarCustoSugerido: modoOverhead === "sugerido",
      custoOperacionalTotal:
        modoOverhead === "manual" ? parseNum(custoOperacional) || null : null,
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
      overheadItens: overheadItens
        .filter((i) => i.rubrica.trim() && parseNum(i.valor) >= 0)
        .map((i, idx) => ({
          id: i.id,
          origem: i.origem,
          contaAzulParcelaId: i.contaAzulParcelaId ?? null,
          refModeloId: i.refModeloId ?? null,
          grupo: i.grupo,
          rubrica: i.rubrica.trim(),
          descricao: i.descricao.trim() || null,
          valorOriginal: i.valorOriginal.trim() ? parseNum(i.valorOriginal) : null,
          valor: parseNum(i.valor),
          incluido: i.incluido,
          ordem: idx,
        })),
    });
  };

  const updateLinha = (key: string, patch: Partial<LinhaForm>) => {
    setLinhas((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        if (patch.fichaId !== undefined) {
          return aplicarFichaNaLinha({ ...l, ...patch }, patch.fichaId);
        }
        return { ...l, ...patch };
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
              <strong className="text-foreground">Receita por produto</strong> — valor do item na CA
              (preço × quantidade), <strong>sem ratear frete</strong>. Frete e desconto do mês aparecem
              só no resumo do período.
            </li>
            <li>
              <strong className="text-foreground">CMV por unidade (ficha)</strong> — matéria-prima + etapas com{" "}
              <strong>minutos/unidade</strong> × R$/h das equipes CLT/PJ em <strong>Equipes MO</strong>.
            </li>
            <li>
              <strong className="text-foreground">Overhead do mês</strong> — importe pagamentos reais
              do Conta Azul, ajuste rubricas (admin, combustível, BPO, consultorias) e exclua o que
              já está no CMV ou duplicaria folha/MO.
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
            {modoOverhead === "itens"
              ? `Overhead curado: ${fmtMoney(custoOpAtual)} (${overheadItens.filter((i) => i.incluido).length} item(ns) incluídos).`
              : modoOverhead === "sugerido"
                ? `Soma do cadastro: ${fmtMoney(sugestao.data?.total ?? 0)}/mês.`
                : "Total manual de overhead do período."}
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
          <CustosRentabilidadeOverheadSection
            inicio={inicio}
            fim={fim}
            modoOverhead={modoOverhead}
            onModoOverheadChange={(m) => {
              setModoOverhead(m);
              setUsarCustoSugerido(m === "sugerido");
            }}
            custoOperacionalManual={custoOperacional}
            onCustoOperacionalManualChange={setCustoOperacional}
            itens={overheadItens}
            onItensChange={setOverheadItens}
            sugestaoTotal={sugestao.data?.total ?? 0}
            sugestaoCompartilhados={sugestao.data?.rubricasCompartilhados ?? 0}
            sugestaoMo={sugestao.data?.moOverhead ?? 0}
            sugestaoRubricas={sugestao.data?.rubricas ?? []}
            sugestaoEquipes={sugestao.data?.equipesOverhead ?? []}
          />
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
                  ? `${vendasContaAzul.data.pedidosVenda} pedido(s) · ${vendasContaAzul.data.produtos.length} produto(s) · valor itens ${fmtMoney(vendasContaAzul.data.receitaTotal)} (igual bruto itens CA)`
                  : "Selecione o mês para ver as vendas reais."}
            </CardDescription>
            {vendasContaAzul.data?.diagnostico ? (
              <p className="text-[11px] text-muted-foreground mt-1">
                Líquido pedidos {fmtMoney(vendasContaAzul.data.diagnostico.receitaLiquidaPedidos)}
                (bruto + frete − desconto)
                {vendasContaAzul.data.diagnostico.freteTotal > 0
                  ? ` · frete ${fmtMoney(vendasContaAzul.data.diagnostico.freteTotal)}`
                  : ""}
                {vendasContaAzul.data.diagnostico.descontoTotal > 0
                  ? ` · desconto ${fmtMoney(vendasContaAzul.data.diagnostico.descontoTotal)}`
                  : ""}
                {vendasContaAzul.data.diagnostico.pedidosExcluidosStatus > 0
                  ? ` · ${vendasContaAzul.data.diagnostico.pedidosExcluidosStatus} pedido(s) fora (status ≠ venda)`
                  : ""}
                {vendasContaAzul.data.diagnostico.pedidosSemItens > 0
                  ? ` · ${vendasContaAzul.data.diagnostico.pedidosSemItens} venda(s) sem itens na sync`
                  : ""}
              </p>
            ) : null}
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
                    custo vinculada — cadastre em Custos → Produtos vendidos, seção
                    &quot;Vendidos sem ficha&quot;.
                  </AlertDescription>
                </Alert>
              ) : null}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto vendido</TableHead>
                    <TableHead className="text-right">Qtd.</TableHead>
                    <TableHead className="text-right">Valor itens</TableHead>
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
              Importe do Conta Azul ou ajuste manualmente. Vincule à ficha para CMV automático — ao
              escolher a ficha, produto, qtd. e receita do mês são preenchidos sozinhos.
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
                    disabled={Boolean(linha.fichaId)}
                    placeholder={
                      linha.fichaId
                        ? custoFicha != null
                          ? `CMV ficha: ${custoFicha}`
                          : "Usa CMV da ficha"
                        : "Só se não usar ficha"
                    }
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
              {modoOverhead === "sugerido" ? (
                <p className="text-xs text-muted-foreground">Cadastro Compartilhados + MO fixa</p>
              ) : modoOverhead === "itens" ? (
                <p className="text-xs text-muted-foreground">
                  {overheadItens.filter((i) => i.incluido).length} rubrica(s) curadas
                </p>
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
            <div>
              <CardTitle className="text-base">Resultado por produto</CardTitle>
              {hasColumnFilters ? (
                <p className="text-xs text-muted-foreground mt-1">
                  {linhasResultadoFiltradas.length} de {calculoAtual.linhas.length} produto(s)
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {hasColumnFilters ? (
                <Button size="sm" variant="ghost" onClick={clearColumnFilters}>
                  Limpar filtros
                </Button>
              ) : null}
              <ExportMenu
                disabled={linhasResultadoFiltradas.length === 0}
                onExportCsv={() =>
                  exportarResultadoProduto(
                    tituloExibicao,
                    inicio,
                    fim,
                    linhasResultadoFiltradas,
                    hasColumnFilters ? totaisResultadoFiltrados : {
                      receita: calculoAtual.totais.receita,
                      cmv: calculoAtual.totais.cmv,
                      lucroBruto: calculoAtual.totais.lucroBruto,
                      rateio: calculoAtual.totais.custoOperacional,
                      contribuicao: calculoAtual.totais.resultado,
                    },
                    hasColumnFilters,
                    "csv",
                  )
                }
                onExportPdf={() =>
                  exportarResultadoProduto(
                    tituloExibicao,
                    inicio,
                    fim,
                    linhasResultadoFiltradas,
                    hasColumnFilters ? totaisResultadoFiltrados : {
                      receita: calculoAtual.totais.receita,
                      cmv: calculoAtual.totais.cmv,
                      lucroBruto: calculoAtual.totais.lucroBruto,
                      rateio: calculoAtual.totais.custoOperacional,
                      contribuicao: calculoAtual.totais.resultado,
                    },
                    hasColumnFilters,
                    "pdf",
                  )
                }
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {renderColumnHeader(
                      "produto",
                      "Produto",
                      calculoAtual.linhas,
                      RESULTADO_PRODUTO_COLUMNS,
                    )}
                  </TableHead>
                  <TableHead className="text-right">
                    {renderColumnHeader(
                      "quantidade",
                      "Qtd.",
                      calculoAtual.linhas,
                      RESULTADO_PRODUTO_COLUMNS,
                      "right",
                    )}
                  </TableHead>
                  <TableHead className="text-right">
                    {renderColumnHeader(
                      "receita",
                      "Receita",
                      calculoAtual.linhas,
                      RESULTADO_PRODUTO_COLUMNS,
                      "right",
                    )}
                  </TableHead>
                  <TableHead className="text-right">
                    {renderColumnHeader(
                      "cmv",
                      "CMV (ficha)",
                      calculoAtual.linhas,
                      RESULTADO_PRODUTO_COLUMNS,
                      "right",
                    )}
                  </TableHead>
                  <TableHead className="text-right">
                    {renderColumnHeader(
                      "lucroBruto",
                      "Lucro bruto",
                      calculoAtual.linhas,
                      RESULTADO_PRODUTO_COLUMNS,
                      "right",
                    )}
                  </TableHead>
                  <TableHead className="text-right">
                    {renderColumnHeader(
                      "rateioOperacional",
                      "Rateio overhead",
                      calculoAtual.linhas,
                      RESULTADO_PRODUTO_COLUMNS,
                      "right",
                    )}
                  </TableHead>
                  <TableHead className="text-right">
                    {renderColumnHeader(
                      "contribuicao",
                      "Contribuição",
                      calculoAtual.linhas,
                      RESULTADO_PRODUTO_COLUMNS,
                      "right",
                    )}
                  </TableHead>
                  <TableHead>
                    {renderColumnHeader(
                      "status",
                      "Status",
                      calculoAtual.linhas,
                      RESULTADO_PRODUTO_COLUMNS,
                    )}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhasResultadoFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Nenhum produto corresponde aos filtros selecionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  linhasResultadoFiltradas.map((r, idx) => (
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
                  ))
                )}
                <TableRow className="bg-muted/40 font-semibold">
                  <TableCell>
                    {hasColumnFilters ? "Total (filtrado)" : "Total do período"}
                  </TableCell>
                  <TableCell />
                  <TableCell className="text-right tabular-nums">
                    {fmtMoney(
                      hasColumnFilters
                        ? totaisResultadoFiltrados.receita
                        : calculoAtual.totais.receita,
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtMoney(
                      hasColumnFilters ? totaisResultadoFiltrados.cmv : calculoAtual.totais.cmv,
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtMoney(
                      hasColumnFilters
                        ? totaisResultadoFiltrados.lucroBruto
                        : calculoAtual.totais.lucroBruto,
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtMoney(
                      hasColumnFilters
                        ? totaisResultadoFiltrados.rateio
                        : calculoAtual.totais.custoOperacional,
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtMoney(
                      hasColumnFilters
                        ? totaisResultadoFiltrados.contribuicao
                        : calculoAtual.totais.resultado,
                    )}
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
