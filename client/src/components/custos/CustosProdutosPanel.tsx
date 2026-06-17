import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  CATEGORIAS_PRODUTO_CUSTO,
  LABEL_CATEGORIA_PRODUTO_CUSTO,
  LABEL_ETAPA_PROCESSO,
  LABEL_TIPO_FICHA_CUSTO_PRODUTO,
  TIPOS_ETAPA_PROCESSO,
  TIPOS_FICHA_CUSTO_PRODUTO,
  UNIDADES_VENDA_PRODUTO,
  type TipoComponenteCusto,
  type TipoEtapaProcesso,
  type TipoFichaCustoProduto,
} from "@shared/custosProduto";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Plus, Trash2, Calculator, Package, AlertTriangle, Copy, FileText } from "lucide-react";

const fmtMoney = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n)
    ? "—"
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const fmtDecimalInput = (value: unknown, maximumFractionDigits = 4) => {
  if (value == null || value === "") return "";
  const n = Number(String(value).replace(",", "."));
  if (!Number.isFinite(n)) return String(value);
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits }).format(n);
};

const margemTabelaClienteOptions = [5, 10, 20, 30] as const;

function htmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function gerarTabelaClientePdf(rows: Array<{ produto: string; unidade: string; preco: number | null }>) {
  const win = window.open("", "_blank");
  if (!win) {
    toast.error("Não foi possível abrir a janela do PDF. Verifique o bloqueador de pop-ups.");
    return;
  }

  const dataHoje = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date());
  const linhasProdutos = rows
    .map(
      (row) => `
        <tr>
          <td>${htmlEscape(row.produto)}</td>
          <td>${htmlEscape(row.unidade)}</td>
          <td class="price">${htmlEscape(fmtMoney(row.preco))}</td>
        </tr>
      `,
    )
    .join("");

  win.document.write(`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Tabela de valores</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * {
      box-sizing: border-box;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
    body {
      margin: 0;
      color: #15392f;
      background: #f6fbf8;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .page {
      min-height: 100vh;
      padding: 28px;
      background: #ffffff;
      border: 1px solid #dcebe4;
      border-radius: 24px;
    }
    header {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      padding: 28px;
      color: white;
      background: linear-gradient(135deg, #047857 0%, #0f766e 58%, #134e4a 100%);
      border-radius: 22px;
    }
    .brand {
      font-size: 13px;
      letter-spacing: .16em;
      text-transform: uppercase;
      opacity: .86;
    }
    h1 {
      margin: 8px 0 0;
      font-size: 34px;
      line-height: 1.05;
    }
    .meta {
      min-width: 190px;
      align-self: flex-end;
      padding: 14px 16px;
      background: rgba(255,255,255,.14);
      border: 1px solid rgba(255,255,255,.22);
      border-radius: 16px;
      font-size: 13px;
      line-height: 1.45;
      text-align: right;
    }
    .intro {
      margin: 24px 4px 18px;
      color: #4b635b;
      font-size: 14px;
      line-height: 1.6;
    }
    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      overflow: hidden;
      border: 1px solid #dcebe4;
      border-radius: 18px;
      background: white;
    }
    thead th {
      padding: 14px 16px;
      color: #285446;
      background: #eaf7f0;
      font-size: 12px;
      letter-spacing: .08em;
      text-align: left;
      text-transform: uppercase;
    }
    tbody td {
      padding: 15px 16px;
      border-top: 1px solid #e6f0eb;
      color: #173b31;
      font-size: 14px;
    }
    tbody tr:nth-child(even) td { background: #f8fcfa; }
    .price {
      color: #03543f;
      font-size: 16px;
      font-weight: 800;
      text-align: right;
      white-space: nowrap;
    }
    .unit { width: 120px; }
    footer {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin-top: 28px;
      padding-top: 18px;
      border-top: 1px solid #e2eee8;
      color: #6b8077;
      font-size: 12px;
    }
    @media print {
      body { background: #ffffff; }
      .page { min-height: auto; padding: 0; border: 0; border-radius: 0; }
    }
  </style>
</head>
<body>
  <main class="page">
    <header>
      <div>
        <div class="brand">Fazendas UP</div>
        <h1>Tabela de valores</h1>
      </div>
      <div class="meta">
        <strong>${htmlEscape(dataHoje)}</strong><br />
        Lista comercial<br />
        Valores finais ao cliente
      </div>
    </header>
    <p class="intro">
      Produtos FLV não regionais selecionados e higienizados pela Fazendas Up.
    </p>
    <table>
      <thead>
        <tr>
          <th>Produto</th>
          <th class="unit">Unidade</th>
          <th class="price">Valor</th>
        </tr>
      </thead>
      <tbody>${linhasProdutos}</tbody>
    </table>
    <footer>
      <span>Valores sujeitos a disponibilidade e confirmação no pedido.</span>
      <span>Gerado automaticamente</span>
    </footer>
  </main>
</body>
</html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

function precoVendaPorMargem(row: any, margemPct: number): number | null {
  const match = row.resultado.precosVendaPorMargem?.find(
    (p: { margemPct: number; precoVenda: number }) => p.margemPct === margemPct,
  );
  return match?.precoVenda ?? null;
}

function fichaAtiva(row: any): boolean {
  return row.ficha.ativo !== false && row.ficha.ativo !== 0;
}

type ComponenteForm = {
  tipo: TipoComponenteCusto;
  variedadeId: string;
  estoqueItemId: string;
  produtoComercialId: string;
  nomeManual: string;
  quantidadePorUnidade: string;
  unidadeComponente: string;
  custoUnitarioManual: string;
};

type EtapaForm = {
  tipo: TipoEtapaProcesso;
  nome: string;
  custoPorUnidade: string;
  custoPorKgProcessado: string;
  custoPercentual: string;
};

type FichaForm = {
  tipo: TipoFichaCustoProduto;
  categoria: string;
  nome: string;
  produtoComercialId: string;
  unidadeVenda: string;
  precoVendaReferencia: string;
  precoCompraKg: string;
  kgBrutoPorUnidade: string;
  perdaLavagemPct: string;
  perdaDescasquePct: string;
  perdaSelecaoPct: string;
  variedadeId: string;
  kgColhidoPorPlanta: string;
  kgProducaoPorUnidade: string;
  observacoes: string;
  ativo: boolean;
  componentes: ComponenteForm[];
  etapas: EtapaForm[];
};

function emptyComponente(): ComponenteForm {
  return {
    tipo: "manual",
    variedadeId: "",
    estoqueItemId: "",
    produtoComercialId: "",
    nomeManual: "",
    quantidadePorUnidade: "",
    unidadeComponente: "kg",
    custoUnitarioManual: "",
  };
}

function emptyEtapa(tipo: TipoEtapaProcesso = "lavagem"): EtapaForm {
  return {
    tipo,
    nome: LABEL_ETAPA_PROCESSO[tipo],
    custoPorUnidade: "",
    custoPorKgProcessado: "",
    custoPercentual: "",
  };
}

function emptyFicha(tipo: TipoFichaCustoProduto = "revenda_processada"): FichaForm {
  return {
    tipo,
    categoria: tipo === "mix" ? "mix" : tipo === "producao_propria" ? "alface" : "revenda",
    nome: "",
    produtoComercialId: "",
    unidadeVenda: "unidade",
    precoVendaReferencia: "",
    precoCompraKg: "",
    kgBrutoPorUnidade: "",
    perdaLavagemPct: "10",
    perdaDescasquePct: "5",
    perdaSelecaoPct: "0",
    variedadeId: "",
    kgColhidoPorPlanta: "",
    kgProducaoPorUnidade: "",
    observacoes: "",
    ativo: true,
    componentes: tipo === "mix" ? [emptyComponente(), emptyComponente()] : [],
    etapas:
      tipo === "revenda_processada"
        ? [emptyEtapa("lavagem"), emptyEtapa("embalagem"), emptyEtapa("adesivo")]
        : [],
  };
}

function parseOpt(s: string): number | null {
  const t = s.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function buildPayload(form: FichaForm, id?: number) {
  return {
    ...(id ? { id } : {}),
    tipo: form.tipo,
    categoria: form.categoria as (typeof CATEGORIAS_PRODUTO_CUSTO)[number],
    nome: form.nome.trim(),
    produtoComercialId: form.produtoComercialId || null,
    unidadeVenda: form.unidadeVenda as (typeof UNIDADES_VENDA_PRODUTO)[number],
    precoVendaReferencia: parseOpt(form.precoVendaReferencia),
    precoCompraKg: parseOpt(form.precoCompraKg),
    kgBrutoPorUnidade: parseOpt(form.kgBrutoPorUnidade),
    perdaLavagemPct: parseOpt(form.perdaLavagemPct),
    perdaDescasquePct: parseOpt(form.perdaDescasquePct),
    perdaSelecaoPct: parseOpt(form.perdaSelecaoPct),
    variedadeId: form.variedadeId ? Number(form.variedadeId) : null,
    kgColhidoPorPlanta: parseOpt(form.kgColhidoPorPlanta),
    kgProducaoPorUnidade: parseOpt(form.kgProducaoPorUnidade),
    observacoes: form.observacoes.trim() || null,
    ativo: form.ativo,
    componentes: form.componentes
      .filter((c) => parseOpt(c.quantidadePorUnidade))
      .map((c) => ({
        tipo: c.tipo,
        variedadeId: c.variedadeId ? Number(c.variedadeId) : null,
        estoqueItemId: c.estoqueItemId ? Number(c.estoqueItemId) : null,
        produtoComercialId: c.produtoComercialId || null,
        nomeManual: c.nomeManual.trim() || null,
        quantidadePorUnidade: parseOpt(c.quantidadePorUnidade)!,
        unidadeComponente: c.unidadeComponente || "kg",
        custoUnitarioManual: parseOpt(c.custoUnitarioManual),
      })),
    etapas: form.etapas.map((e) => ({
      tipo: e.tipo,
      nome: e.nome.trim() || LABEL_ETAPA_PROCESSO[e.tipo],
      custoPorUnidade: parseOpt(e.custoPorUnidade) ?? 0,
      custoPorKgProcessado: parseOpt(e.custoPorKgProcessado),
      custoPercentual: parseOpt(e.custoPercentual),
    })),
  };
}

function rowToFichaForm(row: any, patch: Partial<FichaForm> = {}): FichaForm {
  return {
    ...emptyFicha(row.ficha.tipo as TipoFichaCustoProduto),
    tipo: row.ficha.tipo as TipoFichaCustoProduto,
    categoria: row.ficha.categoria,
    nome: row.ficha.nome,
    produtoComercialId: row.ficha.produtoComercialId ?? "",
    unidadeVenda: row.ficha.unidadeVenda,
    precoVendaReferencia: fmtDecimalInput(row.ficha.precoVendaReferencia, 2),
    precoCompraKg: fmtDecimalInput(row.ficha.precoCompraKg, 4),
    kgBrutoPorUnidade: fmtDecimalInput(row.ficha.kgBrutoPorUnidade, 4),
    perdaLavagemPct: fmtDecimalInput(row.ficha.perdaLavagemPct, 2),
    perdaDescasquePct: fmtDecimalInput(row.ficha.perdaDescasquePct, 2),
    perdaSelecaoPct: fmtDecimalInput(row.ficha.perdaSelecaoPct, 2),
    variedadeId: row.ficha.variedadeId != null ? String(row.ficha.variedadeId) : "",
    kgColhidoPorPlanta: fmtDecimalInput(row.ficha.kgColhidoPorPlanta, 4),
    kgProducaoPorUnidade: fmtDecimalInput(row.ficha.kgProducaoPorUnidade, 4),
    observacoes: row.ficha.observacoes ?? "",
    ativo: fichaAtiva(row),
    componentes: row.componentes.map((c: any) => ({
      tipo: c.tipo,
      variedadeId: c.variedadeId != null ? String(c.variedadeId) : "",
      estoqueItemId: c.estoqueItemId != null ? String(c.estoqueItemId) : "",
      produtoComercialId: c.produtoComercialId ?? "",
      nomeManual: c.nomeManual ?? "",
      quantidadePorUnidade: fmtDecimalInput(c.quantidadePorUnidade, 4),
      unidadeComponente: c.unidadeComponente,
      custoUnitarioManual: fmtDecimalInput(c.custoUnitarioManual, 4),
    })),
    etapas: row.etapas.map((e: any) => ({
      tipo: e.tipo,
      nome: e.nome,
      custoPorUnidade: fmtDecimalInput(e.custoPorUnidade, 4),
      custoPorKgProcessado: fmtDecimalInput(e.custoPorKgProcessado, 4),
      custoPercentual: fmtDecimalInput(e.custoPercentual, 2),
    })),
    ...patch,
  };
}

function nomeFichaCopia(nome: string): string {
  const base = nome.trim();
  const match = /\(cópia(?:\s+(\d+))?\)$/i.exec(base);
  if (!match) return `${base} (cópia)`;
  const proximo = match[1] ? Number(match[1]) + 1 : 2;
  return base.replace(/\(cópia(?:\s+\d+)?\)$/i, `(cópia ${proximo})`);
}

function duplicarFichaForm(form: FichaForm): FichaForm {
  return {
    ...form,
    nome: nomeFichaCopia(form.nome),
    ativo: true,
  };
}

function abrirCopiaFicha(
  row: any,
  setEditingId: (id: number | null) => void,
  setForm: (form: FichaForm) => void,
  setSimResult: (result: any) => void,
) {
  setEditingId(null);
  setForm(duplicarFichaForm(rowToFichaForm(row)));
  setSimResult(row.resultado);
  toast.success("Ficha copiada — ajuste o que precisar e salve como nova.");
}

function ResultadoCustoCard({ resultado }: { resultado: any }) {
  if (!resultado) return null;
  const vendePorKg = resultado.unidadeVenda === "kg";
  return (
    <Card className="border-emerald-200 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="h-4 w-4" />
          Resultado do cálculo
        </CardTitle>
        <CardDescription>
          {vendePorKg
            ? "Use o custo por kg vendido para formar o preço. As projeções abaixo já usam esse custo como base."
            : "Use o custo por unidade vendida para formar o preço. O custo por kg serve só para comparação operacional."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="grid gap-2 sm:grid-cols-4">
          {vendePorKg ? (
            <div>
              <p className="text-muted-foreground text-xs">Custo calculado / kg vendido</p>
              <p className="text-lg font-bold tabular-nums">{fmtMoney(resultado.custoPorKg)}</p>
            </div>
          ) : (
            <>
              <div>
                <p className="text-muted-foreground text-xs">Custo calculado / unidade vendida</p>
                <p className="text-lg font-bold tabular-nums">{fmtMoney(resultado.custoPorUnidade)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Custo calculado / kg</p>
                <p className="font-semibold tabular-nums">{fmtMoney(resultado.custoPorKg)}</p>
              </div>
            </>
          )}
          <div>
            <p className="text-muted-foreground text-xs">Preço venda referência</p>
            <p className="font-semibold tabular-nums">{fmtMoney(resultado.precoVendaReferencia)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Margem bruta</p>
            <p className="font-semibold tabular-nums">
              {fmtMoney(resultado.margemBruta)}
              {resultado.margemPct != null ? ` (${resultado.margemPct.toFixed(1)}%)` : ""}
            </p>
          </div>
        </div>
        {resultado.precosVendaPorMargem?.length > 0 && (
          <div className="rounded-lg border bg-background/60 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Preço final sugerido por margem desejada
            </p>
            <div className="grid gap-2 sm:grid-cols-4">
              {resultado.precosVendaPorMargem.map((p: { margemPct: number; precoVenda: number }) => (
                <div key={p.margemPct} className="rounded-md bg-muted/40 px-3 py-2">
                  <p className="text-[11px] text-muted-foreground">Margem {p.margemPct}%</p>
                  <p className="font-semibold tabular-nums">{fmtMoney(p.precoVenda)}</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Margem calculada sobre o preço final: preço = custo / (1 - margem).
            </p>
          </div>
        )}
        {resultado.alertas?.length > 0 && (
          <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
            {resultado.alertas.map((a: string, i: number) => (
              <li key={i}>• {a}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function FichaEditor({
  form,
  setForm,
  catalogos,
  onSimular,
  onSalvar,
  simulando,
  salvando,
  editingId,
}: {
  form: FichaForm;
  setForm: React.Dispatch<React.SetStateAction<FichaForm>>;
  catalogos: any;
  onSimular: () => void;
  onSalvar: () => void;
  simulando: boolean;
  salvando: boolean;
  editingId: number | null;
}) {
  const updateComp = (idx: number, patch: Partial<ComponenteForm>) => {
    setForm((f) => {
      const next = [...f.componentes];
      next[idx] = { ...next[idx]!, ...patch };
      return { ...f, componentes: next };
    });
  };
  const updateEtapa = (idx: number, patch: Partial<EtapaForm>) => {
    setForm((f) => {
      const next = [...f.etapas];
      next[idx] = { ...next[idx]!, ...patch };
      return { ...f, etapas: next };
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Tipo de ficha</Label>
          <Select
            value={form.tipo}
            onValueChange={(v) => setForm(emptyFicha(v as TipoFichaCustoProduto))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_FICHA_CUSTO_PRODUTO.map((t) => (
                <SelectItem key={t} value={t}>
                  {LABEL_TIPO_FICHA_CUSTO_PRODUTO[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select value={form.categoria} onValueChange={(v) => setForm((f) => ({ ...f, categoria: v }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIAS_PRODUTO_CUSTO.map((c) => (
                <SelectItem key={c} value={c}>
                  {LABEL_CATEGORIA_PRODUTO_CUSTO[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Nome do produto</Label>
          <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Produto comercial (opcional)</Label>
          <Select
            value={form.produtoComercialId || "__none__"}
            onValueChange={(v) => {
              const id = v === "__none__" ? "" : v;
              const p = catalogos?.produtosComerciais?.find((x: any) => x.id === id);
              setForm((f) => ({
                ...f,
                produtoComercialId: id,
                nome: f.nome || p?.nome || f.nome,
                precoVendaReferencia:
                  f.precoVendaReferencia || (p?.precoBase != null ? String(p.precoBase) : f.precoVendaReferencia),
              }));
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Vincular SKU..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Sem vínculo</SelectItem>
              {(catalogos?.produtosComerciais ?? []).map((p: any) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Unidade de venda</Label>
          <Select
            value={form.unidadeVenda}
            onValueChange={(v) =>
              setForm((f) => ({
                ...f,
                unidadeVenda: v,
                kgBrutoPorUnidade: v === "kg" && !f.kgBrutoPorUnidade ? "1" : f.kgBrutoPorUnidade,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNIDADES_VENDA_PRODUTO.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Preço venda referência (R$)</Label>
          <Input
            inputMode="decimal"
            value={form.precoVendaReferencia}
            onChange={(e) => setForm((f) => ({ ...f, precoVendaReferencia: e.target.value }))}
          />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border p-3 md:col-span-2">
          <div>
            <Label>Ficha ativa</Label>
            <p className="text-xs text-muted-foreground">
              Fichas inativas ficam cadastradas, mas não entram na tabela/PDF para clientes.
            </p>
          </div>
          <Switch checked={form.ativo} onCheckedChange={(ativo) => setForm((f) => ({ ...f, ativo }))} />
        </div>
      </div>

      {(form.tipo === "revenda_processada" || form.tipo === "manual") && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Matéria-prima (revenda)</CardTitle>
            <CardDescription>
              Informe o preço de compra e quanto produto pronto você vende. As perdas calculam automaticamente quanto
              precisa comprar bruto.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Preço compra (R$/kg)</Label>
              <Input
                inputMode="decimal"
                value={form.precoCompraKg}
                onChange={(e) => setForm((f) => ({ ...f, precoCompraKg: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Kg final vendido / unidade</Label>
              <Input
                inputMode="decimal"
                placeholder={form.unidadeVenda === "kg" ? "1" : "Ex.: 0,5 para pacote de 500g"}
                value={form.kgBrutoPorUnidade}
                onChange={(e) => setForm((f) => ({ ...f, kgBrutoPorUnidade: e.target.value }))}
              />
              <p className="text-[10px] text-muted-foreground">
                Ex.: venda por kg = 1. Pacote de 500g = 0,5. Não some perdas aqui; preencha as perdas abaixo.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Perda lavagem (%)</Label>
              <Input
                inputMode="decimal"
                value={form.perdaLavagemPct}
                onChange={(e) => setForm((f) => ({ ...f, perdaLavagemPct: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Perda descasque/corte (%)</Label>
              <Input
                inputMode="decimal"
                value={form.perdaDescasquePct}
                onChange={(e) => setForm((f) => ({ ...f, perdaDescasquePct: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Perda seleção (%)</Label>
              <Input
                inputMode="decimal"
                value={form.perdaSelecaoPct}
                onChange={(e) => setForm((f) => ({ ...f, perdaSelecaoPct: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {form.tipo === "producao_propria" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Produção própria</CardTitle>
            <CardDescription>Usa custo R$/planta da variedade e converte por rendimento.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Variedade</Label>
              <Select value={form.variedadeId || "__none__"} onValueChange={(v) => setForm((f) => ({ ...f, variedadeId: v === "__none__" ? "" : v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {(catalogos?.variedades ?? []).map((v: any) => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      {v.nome}
                      {v.custoPorPlanta != null ? ` · ${fmtMoney(v.custoPorPlanta)}/pl` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Kg colhido / planta</Label>
              <Input
                inputMode="decimal"
                value={form.kgColhidoPorPlanta}
                onChange={(e) => setForm((f) => ({ ...f, kgColhidoPorPlanta: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Kg usado / unidade vendida</Label>
              <Input
                inputMode="decimal"
                value={form.kgProducaoPorUnidade}
                onChange={(e) => setForm((f) => ({ ...f, kgProducaoPorUnidade: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {(form.tipo === "mix" || form.componentes.length > 0) && (
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm">Componentes</CardTitle>
              <CardDescription>Produção própria, revenda do estoque ou manual.</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => setForm((f) => ({ ...f, componentes: [...f.componentes, emptyComponente()] }))}>
              <Plus className="h-4 w-4 mr-1" /> Componente
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {form.componentes.map((c, idx) => (
              <div key={idx} className="grid gap-2 rounded-lg border p-3 md:grid-cols-6">
                <Select value={c.tipo} onValueChange={(v) => updateComp(idx, { tipo: v as TipoComponenteCusto })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="variedade">Variedade</SelectItem>
                    <SelectItem value="estoque">Estoque</SelectItem>
                    <SelectItem value="produto_comercial">Produto comercial</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
                {c.tipo === "variedade" && (
                  <Select value={c.variedadeId || "__none__"} onValueChange={(v) => updateComp(idx, { variedadeId: v === "__none__" ? "" : v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Variedade" />
                    </SelectTrigger>
                    <SelectContent>
                      {(catalogos?.variedades ?? []).map((v: any) => (
                        <SelectItem key={v.id} value={String(v.id)}>
                          {v.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {c.tipo === "estoque" && (
                  <Select value={c.estoqueItemId || "__none__"} onValueChange={(v) => updateComp(idx, { estoqueItemId: v === "__none__" ? "" : v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Estoque" />
                    </SelectTrigger>
                    <SelectContent>
                      {(catalogos?.estoque ?? []).map((e: any) => (
                        <SelectItem key={e.id} value={String(e.id)}>
                          {e.nome} ({e.unidadeTipo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {c.tipo === "manual" && (
                  <Input placeholder="Nome" value={c.nomeManual} onChange={(e) => updateComp(idx, { nomeManual: e.target.value })} />
                )}
                <Input
                  placeholder="Qtd / unidade final"
                  inputMode="decimal"
                  value={c.quantidadePorUnidade}
                  onChange={(e) => updateComp(idx, { quantidadePorUnidade: e.target.value })}
                />
                <Input
                  placeholder="Unidade"
                  value={c.unidadeComponente}
                  onChange={(e) => updateComp(idx, { unidadeComponente: e.target.value })}
                />
                {c.tipo === "manual" && (
                  <Input
                    placeholder="R$/un"
                    inputMode="decimal"
                    value={c.custoUnitarioManual}
                    onChange={(e) => updateComp(idx, { custoUnitarioManual: e.target.value })}
                  />
                )}
                <Button variant="ghost" size="icon" onClick={() => setForm((f) => ({ ...f, componentes: f.componentes.filter((_, i) => i !== idx) }))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm">Processo industrial</CardTitle>
            <CardDescription>
              Lavagem, corte, embalagem, adesivo, mão de obra e logística. Use percentual para custos proporcionais.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => setForm((f) => ({ ...f, etapas: [...f.etapas, emptyEtapa()] }))}>
            <Plus className="h-4 w-4 mr-1" /> Etapa
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {form.etapas.map((e, idx) => (
            <div key={idx} className="grid gap-2 rounded-lg border p-3 md:grid-cols-6">
              <Select
                value={e.tipo}
                onValueChange={(v) => updateEtapa(idx, { tipo: v as TipoEtapaProcesso, nome: LABEL_ETAPA_PROCESSO[v as TipoEtapaProcesso] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_ETAPA_PROCESSO.map((t) => (
                    <SelectItem key={t} value={t}>
                      {LABEL_ETAPA_PROCESSO[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input value={e.nome} onChange={(ev) => updateEtapa(idx, { nome: ev.target.value })} />
              <Input
                placeholder="R$/unidade"
                inputMode="decimal"
                value={e.custoPorUnidade}
                onChange={(ev) => updateEtapa(idx, { custoPorUnidade: ev.target.value })}
              />
              <Input
                placeholder="R$/kg proc."
                inputMode="decimal"
                value={e.custoPorKgProcessado}
                onChange={(ev) => updateEtapa(idx, { custoPorKgProcessado: ev.target.value })}
              />
              <Input
                placeholder="% sobre subtotal"
                inputMode="decimal"
                value={e.custoPercentual}
                onChange={(ev) => updateEtapa(idx, { custoPercentual: ev.target.value })}
              />
              <Button variant="ghost" size="icon" onClick={() => setForm((f) => ({ ...f, etapas: f.etapas.filter((_, i) => i !== idx) }))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Label>Observações</Label>
        <Textarea rows={2} value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={simulando} onClick={onSimular}>
          {simulando ? "Simulando..." : "Simular custo"}
        </Button>
        <Button disabled={salvando} onClick={onSalvar}>
          {salvando ? "Salvando..." : editingId ? "Atualizar ficha" : "Salvar ficha"}
        </Button>
      </div>
    </div>
  );
}

export function CustosProdutosTab({ modo }: { modo: "lista" | "simulador" }) {
  const utils = trpc.useUtils();
  const catalogos = trpc.custosProducao.produtos.catalogos.useQuery();
  const fichas = trpc.custosProducao.produtos.listarFichas.useQuery();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FichaForm>(emptyFicha());
  const [simResult, setSimResult] = useState<any>(null);
  const [compraDraft, setCompraDraft] = useState<Record<number, string>>({});
  const [margemTabelaCliente, setMargemTabelaCliente] = useState<string>("20");

  const simular = trpc.custosProducao.produtos.simularCusto.useMutation({
    onSuccess: (r) => setSimResult(r),
    onError: (e) => toast.error(e.message),
  });
  const salvar = trpc.custosProducao.produtos.salvarFicha.useMutation({
    onSuccess: async (r) => {
      toast.success("Ficha salva");
      setSimResult(r.resultado);
      await utils.custosProducao.produtos.listarFichas.invalidate();
      setEditingId(r.id);
    },
    onError: (e) => toast.error(e.message),
  });
  const salvarFichaRapida = trpc.custosProducao.produtos.salvarFicha.useMutation({
    onSuccess: async () => {
      toast.success("Ficha atualizada");
      setCompraDraft({});
      await utils.custosProducao.produtos.listarFichas.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const excluir = trpc.custosProducao.produtos.excluirFicha.useMutation({
    onSuccess: async () => {
      toast.success("Ficha removida");
      setEditingId(null);
      setForm(emptyFicha());
      await utils.custosProducao.produtos.listarFichas.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const resumoProdutos = useMemo(() => fichas.data ?? [], [fichas.data]);
  const tabelaClienteRows = useMemo(() => {
    const margem = Number(margemTabelaCliente);
    return resumoProdutos
      .filter(fichaAtiva)
      .map((row) => ({
        id: row.ficha.id,
        produto: row.ficha.nome,
        unidade: row.ficha.unidadeVenda,
        preco: precoVendaPorMargem(row, margem),
      }))
      .filter((row) => row.preco != null);
  }, [margemTabelaCliente, resumoProdutos]);

  const tabelaClienteTexto = useMemo(() => {
    const linhas = [`Tabela de valores - margem ${margemTabelaCliente}%`, "Produto\tUnidade\tValor"];
    for (const row of tabelaClienteRows) {
      linhas.push(`${row.produto}\t${row.unidade}\t${fmtMoney(row.preco)}`);
    }
    return linhas.join("\n");
  }, [margemTabelaCliente, tabelaClienteRows]);

  if (modo === "lista") {
    return (
      <div className="space-y-4 mt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground max-w-2xl">
            Fichas por produto vendido: produção própria, revenda processada (lavagem, corte, embalagem) e mix.
          </p>
          <Button
            onClick={() => {
              setEditingId(null);
              setForm(emptyFicha());
              setSimResult(null);
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> Nova ficha
          </Button>
        </div>

        {editingId == null && form.nome === "" && resumoProdutos.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Tabela de valores para clientes</CardTitle>
                  <CardDescription>
                    Gera uma tabela sem custo de compra, custo interno ou margem. Escolha a margem usada para formar o valor final.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="w-36">
                    <Select value={margemTabelaCliente} onValueChange={setMargemTabelaCliente}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {margemTabelaClienteOptions.map((m) => (
                          <SelectItem key={m} value={String(m)}>
                            Margem {m}%
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={tabelaClienteRows.length === 0}
                    onClick={async () => {
                      await navigator.clipboard.writeText(tabelaClienteTexto);
                      toast.success("Tabela copiada");
                    }}
                  >
                    <Copy className="h-4 w-4 mr-1" /> Copiar
                  </Button>
                  <Button
                    size="sm"
                    disabled={tabelaClienteRows.length === 0}
                    onClick={() => gerarTabelaClientePdf(tabelaClienteRows)}
                  >
                    <FileText className="h-4 w-4 mr-1" /> Gerar PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead className="text-right">Valor cliente</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tabelaClienteRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-muted-foreground text-center py-4">
                        Nenhum produto tem valor calculado para essa margem.
                      </TableCell>
                    </TableRow>
                  ) : (
                    tabelaClienteRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.produto}</TableCell>
                        <TableCell>{row.unidade}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{fmtMoney(row.preco)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {editingId == null && form.nome === "" && (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead>Compra R$/kg</TableHead>
                  <TableHead className="text-right">Custo/un</TableHead>
                  <TableHead className="text-right">Venda ref.</TableHead>
                  <TableHead>Venda por margem</TableHead>
                  <TableHead className="text-right">Margem ref.</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumoProdutos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-muted-foreground text-center py-8">
                      Nenhuma ficha cadastrada. Crie uma para alface, microverde, revenda ou mix.
                    </TableCell>
                  </TableRow>
                ) : (
                  resumoProdutos.map((row) => {
                    const precoCompraAtual = fmtDecimalInput(row.ficha.precoCompraKg, 4);
                    const precoCompraValue = compraDraft[row.ficha.id] ?? precoCompraAtual;
                    const podeEditarCompra = row.ficha.tipo === "revenda_processada" || row.ficha.tipo === "manual";
                    const precosMargem = row.resultado.precosVendaPorMargem ?? [];
                    const ativo = fichaAtiva(row);
                    return (
                      <TableRow key={row.ficha.id} className={!ativo ? "opacity-60" : undefined}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col gap-1">
                            <span>{row.ficha.nome}</span>
                            {!ativo && <Badge variant="outline" className="w-fit">Inativo no PDF</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {LABEL_TIPO_FICHA_CUSTO_PRODUTO[row.ficha.tipo as TipoFichaCustoProduto]}
                          </Badge>
                        </TableCell>
                        <TableCell>{LABEL_CATEGORIA_PRODUTO_CUSTO[row.ficha.categoria as keyof typeof LABEL_CATEGORIA_PRODUTO_CUSTO] ?? row.ficha.categoria}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={ativo}
                              disabled={salvarFichaRapida.isPending}
                              onCheckedChange={(nextAtivo) => {
                                const p = buildPayload(rowToFichaForm(row, { ativo: nextAtivo }), row.ficha.id);
                                salvarFichaRapida.mutate(p as any);
                              }}
                            />
                            <span className="text-xs text-muted-foreground">{ativo ? "Sim" : "Não"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {podeEditarCompra ? (
                            <div className="flex min-w-48 items-center gap-2">
                              <Input
                                className="h-8 w-28"
                                inputMode="decimal"
                                value={precoCompraValue}
                                onChange={(e) =>
                                  setCompraDraft((drafts) => ({ ...drafts, [row.ficha.id]: e.target.value }))
                                }
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={salvarFichaRapida.isPending || precoCompraValue === precoCompraAtual}
                                onClick={() => {
                                  const p = buildPayload(
                                    rowToFichaForm(row, { precoCompraKg: precoCompraValue }),
                                    row.ficha.id,
                                  );
                                  salvarFichaRapida.mutate(p as any);
                                }}
                              >
                                Atualizar
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          {fmtMoney(row.resultado.custoPorUnidade)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fmtMoney(row.resultado.precoVendaReferencia)}
                        </TableCell>
                        <TableCell>
                          {precosMargem.length > 0 ? (
                            <div className="flex min-w-56 flex-wrap gap-1">
                              {precosMargem.map((p: { margemPct: number; precoVenda: number }) => (
                                <Badge key={p.margemPct} variant="outline" className="font-normal tabular-nums">
                                  {p.margemPct}%: {fmtMoney(p.precoVenda)}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.resultado.margemPct != null ? `${row.resultado.margemPct.toFixed(1)}%` : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              title="Copiar como nova ficha"
                              onClick={() =>
                                abrirCopiaFicha(row, setEditingId, setForm, setSimResult)
                              }
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingId(row.ficha.id);
                                setForm(rowToFichaForm(row));
                                setSimResult(row.resultado);
                              }}
                            >
                              Editar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {(editingId != null || form.nome !== "") && (
          <>
            {editingId != null && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingId(null);
                    setForm(duplicarFichaForm(form));
                    toast.success("Ficha copiada — ajuste o que precisar e salve como nova.");
                  }}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copiar como nova
                </Button>
                <Button variant="destructive" size="sm" onClick={() => excluir.mutate({ id: editingId })}>
                  Excluir ficha
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setEditingId(null); setForm(emptyFicha()); setSimResult(null); }}>
                  Cancelar
                </Button>
              </div>
            )}
            <FichaEditor
              form={form}
              setForm={setForm}
              catalogos={catalogos.data}
              editingId={editingId}
              simulando={simular.isPending}
              salvando={salvar.isPending}
              onSimular={() => simular.mutate(buildPayload(form) as any)}
              onSalvar={() => {
                const p = buildPayload(form, editingId ?? undefined);
                if (!p.nome) return toast.error("Informe o nome do produto.");
                salvar.mutate(p as any);
              }}
            />
            <ResultadoCustoCard resultado={simResult} />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Simulador rápido</AlertTitle>
        <AlertDescription>
          Teste rendimentos, perdas e margens antes de salvar. Simule quantas vezes quiser; quando estiver satisfeito, use &quot;Salvar ficha&quot; para cadastrar na aba Produtos vendidos.
        </AlertDescription>
      </Alert>
      <FichaEditor
        form={form}
        setForm={setForm}
        catalogos={catalogos.data}
        editingId={editingId}
        simulando={simular.isPending}
        salvando={salvar.isPending}
        onSimular={() => simular.mutate(buildPayload(form) as any)}
        onSalvar={() => {
          const p = buildPayload(form, editingId ?? undefined);
          if (!p.nome) return toast.error("Informe o nome do produto.");
          salvar.mutate(p as any);
        }}
      />
      <ResultadoCustoCard resultado={simResult} />
    </div>
  );
}

export function CustosProdutosPainelResumo() {
  const fichas = trpc.custosProducao.produtos.listarFichas.useQuery();
  const rows = fichas.data ?? [];
  if (rows.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-4 w-4" />
          Custos por produto vendido
        </CardTitle>
        <CardDescription>Resumo das fichas cadastradas (produção, revenda e mix).</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Custo/un</TableHead>
              <TableHead className="text-right">Venda ref.</TableHead>
              <TableHead className="text-right">Margem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, 8).map((r) => (
              <TableRow key={r.ficha.id}>
                <TableCell>{r.ficha.nome}</TableCell>
                <TableCell className="text-xs">{LABEL_TIPO_FICHA_CUSTO_PRODUTO[r.ficha.tipo as TipoFichaCustoProduto]}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtMoney(r.resultado.custoPorUnidade)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtMoney(r.ficha.precoVendaReferencia != null ? Number(r.ficha.precoVendaReferencia) : null)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {r.resultado.margemPct != null ? `${r.resultado.margemPct.toFixed(1)}%` : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
