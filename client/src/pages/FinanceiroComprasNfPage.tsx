import { useMemo, useRef, useState, Fragment } from "react";
import { FileUp, RefreshCcw, ShoppingBasket } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import { FinanceiroCfoNav } from "@/components/financeiro/FinanceiroCfoNav";
import { PeriodoFiltro } from "@/components/comercial/ui/PeriodoFiltro";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  hojeIsoLocal,
  intervaloDoPreset,
  primeiroDiaMesIso,
  type PeriodoPreset,
} from "@/lib/comercial/periodo";
import { trpc } from "@/lib/trpc";
import { ExportMenu } from "@/components/ui/export-menu";
import { exportObjectRows } from "@/lib/exportTableDocument";

function fmtMoney(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtQty(n: number) {
  return n.toLocaleString("pt-BR", {
    maximumFractionDigits: 3,
    minimumFractionDigits: 0,
  });
}

export default function FinanceiroComprasNfPage() {
  const [preset, setPreset] = useState<PeriodoPreset>("mes_atual");
  const [customInicio, setCustomInicio] = useState(primeiroDiaMesIso());
  const [customFim, setCustomFim] = useState(hojeIsoLocal());
  const [produtoContem, setProdutoContem] = useState("alface");
  const [expanded, setExpanded] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { inicio, fim } = useMemo(
    () =>
      intervaloDoPreset(preset, { inicio: customInicio, fim: customFim }),
    [preset, customInicio, customFim],
  );

  const q = trpc.financeiroCfo.comprasNfRelatorio.useQuery({
    inicio,
    fim,
    produtoContem,
  });

  const data = q.data;
  const fornRows = data?.fornecedores ?? [];

  const utils = trpc.useUtils();
  const importXml = trpc.financeiroCfo.comprasNfImportarXml.useMutation({
    onSuccess: r => {
      toast.success(
        r.created
          ? `NF importada — ${r.fornecedor}, ${r.itens} item(ns)`
          : `NF atualizada — ${r.fornecedor}, ${r.itens} item(ns)`,
      );
      void utils.financeiroCfo.comprasNfRelatorio.invalidate();
    },
    onError: e => toast.error(e.message),
  });
  const syncCa = trpc.financeiroCfo.comprasNfSyncContaAzul.useMutation({
    onSuccess: r => {
      if (!r.ok) {
        toast.message(r.aviso ?? "Sync Conta Azul indisponível");
        return;
      }
      toast.success(
        `Sync: ${r.gravadas} nova(s), ${r.atualizadas} atualizada(s)` +
          (r.aviso ? ` — ${r.aviso}` : ""),
      );
      void utils.financeiroCfo.comprasNfRelatorio.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  async function onPickXml(files: FileList | null) {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      const text = await file.text();
      try {
        await importXml.mutateAsync({ xml: text });
      } catch {
        /* toast via onError */
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  function exportFmt(format: "csv" | "pdf") {
    if (!data) return;
    exportObjectRows(
      fornRows.map(f => ({
        Fornecedor: f.fornecedor,
        Quantidade: f.quantidade,
        Unidades: f.unidades.join(", "),
        "Valor R$": f.valorTotal,
        NFs: f.notas,
      })),
      {
        format,
        filename: `compras-nf-${data.inicioIso}_${data.fimIso}`,
        title: `Compras NF — ${data.filtroProduto ?? "todos"}`,
        subtitle: `${data.inicioIso} a ${data.fimIso}`,
        kpis: [
          { label: "Quantidade", value: fmtQty(data.totais.quantidade) },
          { label: "Valor", value: fmtMoney(data.totais.valorTotal) },
          { label: "NFs", value: String(data.totais.notas) },
        ],
      },
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-6xl mx-auto px-4 py-6 space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <ShoppingBasket className="h-5 w-5 text-emerald-700" />
              Compras por NF
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Volume (kg/un) comprado por fornecedor a partir dos itens da nota
              fiscal. Padrão: alfaces. Importe o XML das NFs de compra da Conta
              Azul.
            </p>
          </div>
          <FinanceiroCfoNav active="compras-nf" />
        </div>

        <PeriodoFiltro
          preset={preset}
          onPresetChange={setPreset}
          customInicio={customInicio}
          customFim={customFim}
          onCustomInicio={setCustomInicio}
          onCustomFim={setCustomFim}
        />

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Produto contém</Label>
            <Input
              className="w-48 h-9"
              value={produtoContem}
              onChange={e => setProdutoContem(e.target.value)}
              placeholder="alface"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => setProdutoContem("")}
          >
            Todos os itens
          </Button>
          <div className="flex-1" />
          <input
            ref={fileRef}
            type="file"
            accept=".xml,text/xml,application/xml"
            multiple
            className="hidden"
            onChange={e => void onPickXml(e.target.files)}
          />
          <Button
            type="button"
            size="sm"
            className="h-9 gap-1.5"
            disabled={importXml.isPending}
            onClick={() => fileRef.current?.click()}
          >
            <FileUp className="h-4 w-4" />
            Importar XML
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-9 gap-1.5"
            disabled={syncCa.isPending}
            onClick={() => syncCa.mutate({ inicio, fim })}
          >
            <RefreshCcw className="h-4 w-4" />
            Tentar Conta Azul
          </Button>
          {data && fornRows.length > 0 && (
            <ExportMenu
              onExportCsv={() => exportFmt("csv")}
              onExportPdf={() => exportFmt("pdf")}
            />
          )}
        </div>

        {q.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : q.isError ? (
          <p className="text-sm text-destructive">{q.error.message}</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Kpi
                label="Quantidade"
                value={fmtQty(data?.totais.quantidade ?? 0)}
              />
              <Kpi
                label="Valor"
                value={fmtMoney(data?.totais.valorTotal ?? 0)}
              />
              <Kpi
                label="NFs no filtro"
                value={String(data?.totais.notas ?? 0)}
              />
              <Kpi
                label="NFs cadastradas"
                value={String(data?.totalNotasCadastradas ?? 0)}
              />
            </div>

            {(data?.totalNotasCadastradas ?? 0) === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-6 text-sm text-muted-foreground space-y-2">
                  <p>
                    Ainda não há notas de compra neste projeto. Na Conta Azul,
                    abra a compra com NF → baixe/exporte o{" "}
                    <strong>XML</strong> e use <strong>Importar XML</strong>{" "}
                    aqui (pode selecionar vários arquivos).
                  </p>
                  <p>
                    A API pública da Conta Azul costuma não devolver itens de
                    compra; por isso o XML é a fonte confiável de kg/unidades.
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">
                  Por fornecedor
                  {data?.filtroProduto
                    ? ` — “${data.filtroProduto}”`
                    : " — todos os produtos"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead>Un.</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">NFs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fornRows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-muted-foreground py-8"
                        >
                          Nenhum item no período com este filtro.
                        </TableCell>
                      </TableRow>
                    ) : (
                      fornRows.map(f => {
                        const open = expanded === f.fornecedor;
                        return (
                          <Fragment key={f.fornecedor}>
                            <TableRow
                              className="cursor-pointer"
                              onClick={() =>
                                setExpanded(open ? null : f.fornecedor)
                              }
                            >
                              <TableCell className="font-medium">
                                {f.fornecedor}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {fmtQty(f.quantidade)}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {f.unidades.join(", ") || "—"}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {fmtMoney(f.valorTotal)}
                              </TableCell>
                              <TableCell className="text-right">
                                {f.notas}
                              </TableCell>
                            </TableRow>
                            {open &&
                              f.produtos.map(p => (
                                <TableRow
                                  key={`${f.fornecedor}-${p.produto}`}
                                  className="bg-muted/30"
                                >
                                  <TableCell className="pl-8 text-sm">
                                    {p.produto}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums text-sm">
                                    {fmtQty(p.quantidade)}
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    {p.unidade ?? "—"}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums text-sm">
                                    {fmtMoney(p.valorTotal)}
                                  </TableCell>
                                  <TableCell />
                                </TableRow>
                              ))}
                          </Fragment>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="py-3 px-4">
        <p className="text-[10px] font-semibold uppercase text-muted-foreground">
          {label}
        </p>
        <p className="text-lg font-bold tabular-nums mt-0.5">{value}</p>
      </CardContent>
    </Card>
  );
}
