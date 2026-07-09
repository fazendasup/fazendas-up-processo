import { useEffect, useMemo, useRef, useState } from "react";
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
  LABEL_MODO_COMPRA_MP,
  MODOS_COMPRA_MP,
  type CategoriaProdutoCusto,
  type ModoCompraMp,
  type TipoComponenteCusto,
  type TipoEtapaProcesso,
  type TipoFichaCustoProduto,
  deduplicarEtapasLogistica,
  temEtapaLogistica,
  unidadesMpConsumidasRevenda,
  custoMaterialRevenda,
  parseOrcamentosCompraKg,
  mediaOrcamentosCompraKg,
  precoCompraKgEfetivo,
  FLORES_KG_POR_POTE_PADRAO,
  FLORES_RENDIMENTO_POTES_POR_KG_PADRAO,
  kgLiquidoPorUnidadeDeRendimentoKg,
  rendimentoUnidadesPorKg,
} from "@shared/custosProduto";
import {
  DESCRICAO_PERFIL_PROCESSO,
  LABEL_PERFIL_PROCESSO_PRODUTO,
  PERFIS_PROCESSO_PRODUTO,
  avisosMapeamentoProduto,
  etapasProcessoDeModelo,
  inferirPerfilDeEtapas,
  LOGISTICA_PERCENTUAL_PADRAO,
  mapeamentoEfetivoParaCalculo,
  perfilDefaultParaCategoria,
  perfilUsaLavagemKg,
  sugerirMapeamentoProduto,
  type EtapaProcessoPadrao,
  type PerfilProcessoProduto,
} from "@shared/custosProdutoProcessoPadrao";
import { configFromProcessoModelo, derivarProcessoModelo, type ProcessoModeloRecord } from "@shared/custosLinhaProcessoIndustrial";
import {
  LABEL_REGIME_MO_ETAPA,
  REGIMES_MO_ETAPA,
  type RegimeMoEtapa,
} from "@shared/custosMoEquipe";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Plus,
  Trash2,
  Calculator,
  Package,
  AlertTriangle,
  Copy,
  FileText,
  Save,
  Pencil,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { CustosProdutoProcessoSection } from "./CustosProdutoProcessoSection";

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
  minutosPorUnidade: string;
  regimeMo: RegimeMoEtapa;
  custoPorUnidade: string;
  custoPorKgProcessado: string;
  custoPercentual: string;
};

type PrecoVendaReferenciaModo = "automatico" | "manual";

type FichaForm = {
  tipo: TipoFichaCustoProduto;
  categoria: string;
  nome: string;
  produtoComercialId: string;
  unidadeVenda: string;
  precoVendaReferencia: string;
  precoVendaReferenciaModo: PrecoVendaReferenciaModo;
  /** Até 3 orçamentos R$/kg — precoCompraKg = média automática. */
  orcamentosCompraKg: string[];
  precoCompraKg: string;
  custoCompraUn: string;
  kgPorUnidadeCompra: string;
  unidadesMpPorUnidade: string;
  modoCompraMp: ModoCompraMp;
  kgBrutoPorUnidade: string;
  perdaLavagemPct: string;
  perdaDescasquePct: string;
  perdaSelecaoPct: string;
  variedadeId: string;
  kgColhidoPorPlanta: string;
  kgProducaoPorUnidade: string;
  observacoes: string;
  ativo: boolean;
  /** Modelo industrial salvo — etapas derivadas dele quando etapasModoManual = false. */
  processoModeloId: string;
  perfilProcesso: PerfilProcessoProduto;
  etapasModoManual: boolean;
  componentes: ComponenteForm[];
  etapas: EtapaForm[];
};

function etapaPadraoToForm(e: EtapaProcessoPadrao): EtapaForm {
  return {
    tipo: e.tipo,
    nome: e.nome,
    minutosPorUnidade: fmtDecimalInput(e.minutosPorUnidade, 2),
    regimeMo: e.regimeMo,
    custoPorUnidade: fmtDecimalInput(e.custoPorUnidade, 4),
    custoPorKgProcessado: fmtDecimalInput(e.custoPorKgProcessado, 4),
    custoPercentual: fmtDecimalInput(e.custoPercentual, 2),
  };
}

function etapasFormDeModelo(
  modelo: ProcessoModeloRecord,
  perfil: PerfilProcessoProduto,
  categoria: CategoriaProdutoCusto,
  mapaHora: import("@shared/custosMoEquipe").CustoHoraPorRegime | null,
): EtapaForm[] {
  return etapasProcessoDeModelo(perfil, categoria, modelo, mapaHora).map(etapaPadraoToForm);
}

function etapasFormEquivalentes(a: EtapaForm[], b: EtapaForm[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((e, i) => {
    const o = b[i]!;
    return (
      e.tipo === o.tipo &&
      e.custoPorKgProcessado === o.custoPorKgProcessado &&
      e.custoPorUnidade === o.custoPorUnidade &&
      e.custoPercentual === o.custoPercentual &&
      e.minutosPorUnidade === o.minutosPorUnidade &&
      e.regimeMo === o.regimeMo
    );
  });
}

function resolverModeloEPerfilParaRow(
  row: any,
  modelos: ProcessoModeloRecord[],
  produtosComercial:
    | Array<{
        id: string;
        mapeamento?: {
          perfilProcesso: PerfilProcessoProduto;
          categoriaCusto: CategoriaProdutoCusto;
          processoModeloId: number | null;
        };
      }>
    | undefined,
): { modelo: ProcessoModeloRecord; perfil: PerfilProcessoProduto; categoria: CategoriaProdutoCusto } | null {
  const defaultModelo = modelos.find((m) => m.isDefault) ?? modelos[0] ?? null;
  let perfil: PerfilProcessoProduto = inferirPerfilDeEtapas(row.etapas);
  let categoria = (row.ficha.categoria ?? "outros") as CategoriaProdutoCusto;
  let modelo: ProcessoModeloRecord | null = defaultModelo;

  if (row.ficha.produtoComercialId && produtosComercial) {
    const p = produtosComercial.find((x) => x.id === row.ficha.produtoComercialId);
    const sugerido = sugerirMapeamentoProduto(row.ficha.produtoComercialId, row.ficha.nome, null);
    const mapeado = p?.mapeamento
      ? {
          produtoComercialId: row.ficha.produtoComercialId,
          categoriaCusto: p.mapeamento.categoriaCusto,
          perfilProcesso: p.mapeamento.perfilProcesso,
          kgPorUnidade: null,
          modoCompraMp: "kg" as const,
          processoModeloId: p.mapeamento.processoModeloId,
        }
      : sugerido;
    const m = mapeamentoEfetivoParaCalculo(mapeado, sugerido);
    perfil = m.perfilProcesso;
    categoria = m.categoriaCusto;
    if (m.processoModeloId != null) {
      modelo = modelos.find((mod) => mod.id === m.processoModeloId) ?? defaultModelo;
    }
  }

  if (!modelo) return null;
  return { modelo, perfil, categoria };
}

function inferirEtapasModoManualRow(
  row: any,
  modelos: ProcessoModeloRecord[],
  mapaHora: import("@shared/custosMoEquipe").CustoHoraPorRegime | null,
  produtosComercial: Parameters<typeof resolverModeloEPerfilParaRow>[2],
): boolean {
  const resolved = resolverModeloEPerfilParaRow(row, modelos, produtosComercial);
  if (!resolved) return true;
  const dbEtapas = garantirEtapaLogisticaForm(
    row.etapas.map((e: any) => ({
      tipo: e.tipo,
      nome: e.nome,
      minutosPorUnidade: fmtDecimalInput(e.minutosPorUnidade, 2),
      regimeMo: (e.regimeMo ?? "qualquer") as RegimeMoEtapa,
      custoPorUnidade: fmtDecimalInput(e.custoPorUnidade, 4),
      custoPorKgProcessado: fmtDecimalInput(e.custoPorKgProcessado, 4),
      custoPercentual: fmtDecimalInput(e.custoPercentual, 2),
    })),
  );
  const modelEtapas = etapasFormDeModelo(
    resolved.modelo,
    resolved.perfil,
    resolved.categoria,
    mapaHora,
  );
  return !etapasFormEquivalentes(dbEtapas, modelEtapas);
}

function resumoValorEtapa(e: EtapaForm): string {
  if (e.tipo === "lavagem") {
    const v = parseOpt(e.custoPorKgProcessado);
    return v != null && v > 0 ? `${fmtMoney(v)}/kg` : "R$/kg pendente";
  }
  if (e.tipo === "logistica") {
    const v = parseOpt(e.custoPercentual);
    return v != null ? `${v}% subtotal` : "—";
  }
  if (e.tipo === "embalagem" || e.tipo === "adesivo") {
    const v = parseOpt(e.custoPorUnidade);
    return v != null ? `${fmtMoney(v)}/un` : "—";
  }
  const min = parseOpt(e.minutosPorUnidade);
  const extra = parseOpt(e.custoPorUnidade);
  const parts: string[] = [];
  if (min != null && min > 0) parts.push(`${min} min/un`);
  if (extra != null && extra > 0) parts.push(`${fmtMoney(extra)}/un fixo`);
  return parts.length > 0 ? parts.join(" · ") : "—";
}

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
    minutosPorUnidade: "",
    regimeMo: "qualquer",
    custoPorUnidade: "",
    custoPorKgProcessado: "",
    custoPercentual: tipo === "logistica" ? String(LOGISTICA_PERCENTUAL_PADRAO) : "",
  };
}

function patchCategoriaFicha(
  f: FichaForm,
  categoria: CategoriaProdutoCusto,
): Partial<FichaForm> {
  const patch: Partial<FichaForm> = {
    categoria,
    ...(f.etapasModoManual ? {} : { perfilProcesso: perfilDefaultParaCategoria(categoria) }),
  };
  if (categoria === "flores") {
    patch.modoCompraMp = "kg";
    patch.unidadeVenda = "unidade";
    if (!parseOpt(f.kgBrutoPorUnidade)) {
      patch.kgBrutoPorUnidade = fmtDecimalInput(FLORES_KG_POR_POTE_PADRAO, 6);
    }
  }
  return patch;
}

function garantirEtapaLogisticaForm(etapas: EtapaForm[]): EtapaForm[] {
  const base = deduplicarEtapasLogistica(etapas);
  if (temEtapaLogistica(base)) return base;
  return [...base, emptyEtapa("logistica")];
}

function emptyFicha(tipo: TipoFichaCustoProduto = "revenda_processada"): FichaForm {
  return {
    tipo,
    categoria: tipo === "mix" ? "mix" : tipo === "producao_propria" ? "alface" : "revenda",
    nome: "",
    produtoComercialId: "",
    unidadeVenda: "unidade",
    precoVendaReferencia: "",
    precoVendaReferenciaModo: "automatico",
    orcamentosCompraKg: emptyOrcamentosCompraSlots(),
    precoCompraKg: "",
    custoCompraUn: "",
    kgPorUnidadeCompra: "",
    unidadesMpPorUnidade: "",
    modoCompraMp: "kg",
    kgBrutoPorUnidade: "",
    perdaLavagemPct: "0",
    perdaDescasquePct: "0",
    perdaSelecaoPct: "0",
    variedadeId: "",
    kgColhidoPorPlanta: "",
    kgProducaoPorUnidade: "",
    observacoes: "",
    ativo: true,
    processoModeloId: "",
    perfilProcesso: perfilDefaultParaCategoria(
      (tipo === "mix" ? "mix" : tipo === "producao_propria" ? "alface" : "revenda") as CategoriaProdutoCusto,
    ),
    etapasModoManual: false,
    componentes: tipo === "mix" ? [emptyComponente(), emptyComponente()] : [],
    etapas: [emptyEtapa("logistica")],
  };
}

function parseOpt(s: string): number | null {
  const t = s.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

const ORCAMENTOS_COMPRA_SLOTS = 3;

function emptyOrcamentosCompraSlots(): string[] {
  return Array(ORCAMENTOS_COMPRA_SLOTS).fill("");
}

function orcamentosCompraSlotsFromRow(row: any): string[] {
  const parsed = parseOrcamentosCompraKg(row.ficha?.orcamentosCompraKg);
  const slots = emptyOrcamentosCompraSlots();
  parsed.forEach((n, i) => {
    if (i < ORCAMENTOS_COMPRA_SLOTS) slots[i] = fmtDecimalInput(n, 4);
  });
  if (parsed.length === 0 && row.ficha?.precoCompraKg != null) {
    slots[0] = fmtDecimalInput(row.ficha.precoCompraKg, 4);
  }
  return slots;
}

function orcamentosCompraNumsFromSlots(slots: string[]): number[] {
  return slots.map((s) => parseOpt(s)).filter((n): n is number => n != null && n > 0);
}

function precoCompraKgMedioFromSlots(slots: string[], fallbackPreco = ""): string {
  const media = mediaOrcamentosCompraKg(orcamentosCompraNumsFromSlots(slots));
  if (media != null) return fmtDecimalInput(media, 4);
  return fallbackPreco;
}

function numFichaDecimal(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function orcamentosCompraSlotsIguais(a: string[], b: string[]): boolean {
  return a.every((v, i) => v === (b[i] ?? ""));
}

function precoCompraKgEfetivoRow(ficha: {
  orcamentosCompraKg?: unknown;
  precoCompraKg?: unknown;
}): number | null {
  return precoCompraKgEfetivo({
    orcamentosCompraKg: ficha.orcamentosCompraKg,
    precoCompraKg: numFichaDecimal(ficha.precoCompraKg),
  });
}

function precoCompraKgEfetivoForm(form: FichaForm): number | null {
  return precoCompraKgEfetivo({
    orcamentosCompraKg: orcamentosCompraNumsFromSlots(form.orcamentosCompraKg),
    precoCompraKg: parseOpt(form.precoCompraKg),
  });
}

function periodoMesCorrente() {
  const d = new Date();
  return {
    inicio: new Date(d.getFullYear(), d.getMonth(), 1),
    fim: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999),
  };
}

function rotuloLucroPrejuizo(margemBruta: number | null | undefined): string {
  if (margemBruta == null) return "Margem";
  if (margemBruta < 0) return "Prejuízo";
  if (margemBruta > 0) return "Lucro";
  return "Margem";
}

function classeLucroPrejuizo(margemBruta: number | null | undefined): string {
  if (margemBruta == null) return "";
  if (margemBruta < 0) return "text-destructive font-semibold";
  if (margemBruta > 0) return "text-emerald-600 dark:text-emerald-400 font-semibold";
  return "";
}

function parseTrpcErrorMessage(message: string): string {
  try {
    const parsed = JSON.parse(message) as unknown;
    if (Array.isArray(parsed) && parsed.length > 0) {
      const issues = parsed as Array<{ path?: unknown[]; message?: string; code?: string }>;
      const nomeIssue = issues.find((i) => i.path?.[0] === "nome");
      if (nomeIssue?.code === "too_small") {
        return "Informe o nome do produto (ou vincule um SKU do Conta Azul).";
      }
      const first = issues[0];
      if (typeof first.message === "string" && first.message.trim()) {
        if (first.message.startsWith("Too small")) {
          const field = first.path?.[0];
          if (field === "nome") return "Informe o nome do produto.";
        }
        return first.message;
      }
    }
  } catch {
    /* mensagem já legível */
  }
  return message;
}

function resolveNomeFicha(
  form: FichaForm,
  produtosComerciais?: ReadonlyArray<{ id: string; nome: string }>,
): string {
  const direto = form.nome.trim();
  if (direto) return direto;
  if (form.produtoComercialId && produtosComerciais) {
    const p = produtosComerciais.find((x) => x.id === form.produtoComercialId);
    return p?.nome?.trim() ?? "";
  }
  return "";
}

/** Espelha validação do servidor ao salvar ficha ativa. */
function mensagemErroAtivacaoFicha(form: FichaForm): string | null {
  if (!form.ativo) return null;
  if (form.tipo === "mix") {
    const qtd = form.componentes.filter((c) => parseOpt(c.quantidadePorUnidade)).length;
    if (qtd < 2) return "Mix exige ao menos 2 componentes antes de ativar.";
  }
  const precisaMp =
    form.tipo === "revenda_processada" || (form.tipo === "manual" && !!form.produtoComercialId);
  if (precisaMp) {
    const modo = form.modoCompraMp ?? "kg";
    if (modo === "unidade") {
      const v = parseOpt(form.custoCompraUn);
      if (v == null || v <= 0) {
        return "Informe o preço por unidade de matéria-prima (coluna Compra MP ou editor) antes de ativar.";
      }
    } else {
      const preco = precoCompraKgEfetivoForm(form);
      const kg = parseOpt(form.kgBrutoPorUnidade);
      if (preco == null || preco <= 0 || kg == null) {
        return form.categoria === "flores"
          ? "Para ativar: informe preço R$/kg (> 0) e rendimento (potes/kg)."
          : "Para ativar: informe preço R$/kg (> 0) e kg final vendido/unidade (coluna Compra MP ou botão Editar).";
      }
    }
  }
  if (form.tipo === "producao_propria") {
    if (
      !form.variedadeId ||
      parseOpt(form.kgColhidoPorPlanta) == null ||
      parseOpt(form.kgProducaoPorUnidade) == null
    ) {
      return "Produção própria exige variedade, kg colhido/planta e kg usado por unidade antes de ativar.";
    }
  }
  return null;
}

function rowToFichaFormComDraft(
  row: any,
  patch: Partial<FichaForm>,
  compraDraft: Record<number, string>,
  orcamentosDraft: Record<number, string[]>,
  produtosComercial?: Parameters<typeof resolverModeloEPerfilParaRow>[2],
): FichaForm {
  const form = rowToFichaForm(row, patch, produtosComercial);
  const modo = (patch.modoCompraMp ?? row.ficha.modoCompraMp ?? "kg") as ModoCompraMp;
  if (modo === "unidade") {
    const draft = compraDraft[row.ficha.id];
    if (draft != null) form.custoCompraUn = draft;
  } else {
    const draft = orcamentosDraft[row.ficha.id];
    if (draft != null) {
      form.orcamentosCompraKg = draft;
      form.precoCompraKg = precoCompraKgMedioFromSlots(draft);
    }
  }
  return form;
}

function buildPayload(
  form: FichaForm,
  id?: number,
  produtosComerciais?: ReadonlyArray<{ id: string; nome: string }>,
) {
  const orcamentos = orcamentosCompraNumsFromSlots(form.orcamentosCompraKg);
  const precoCompraKg =
    mediaOrcamentosCompraKg(orcamentos) ?? parseOpt(form.precoCompraKg);
  return {
    ...(id ? { id } : {}),
    tipo: form.tipo,
    categoria: form.categoria as (typeof CATEGORIAS_PRODUTO_CUSTO)[number],
    nome: resolveNomeFicha(form, produtosComerciais),
    produtoComercialId: form.produtoComercialId || null,
    unidadeVenda: form.unidadeVenda as (typeof UNIDADES_VENDA_PRODUTO)[number],
    precoVendaReferencia: parseOpt(form.precoVendaReferencia),
    precoVendaReferenciaModo: form.precoVendaReferenciaModo,
    orcamentosCompraKg: orcamentos.length > 0 ? orcamentos : undefined,
    precoCompraKg,
    custoCompraUn: parseOpt(form.custoCompraUn),
    kgPorUnidadeCompra: parseOpt(form.kgPorUnidadeCompra),
    unidadesMpPorUnidade: parseOpt(form.unidadesMpPorUnidade),
    modoCompraMp: form.modoCompraMp,
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
    etapas: deduplicarEtapasLogistica(
      form.etapas.map((e) => ({
        tipo: e.tipo,
        nome: e.nome.trim() || LABEL_ETAPA_PROCESSO[e.tipo],
        minutosPorUnidade: parseOpt(e.minutosPorUnidade),
        regimeMo: e.regimeMo,
        custoPorUnidade: parseOpt(e.custoPorUnidade) ?? 0,
        custoPorKgProcessado: parseOpt(e.custoPorKgProcessado),
        custoPercentual: parseOpt(e.custoPercentual),
      })),
    ),
    etapasModoManual: form.etapasModoManual,
    processoModeloId: form.processoModeloId ? Number(form.processoModeloId) : null,
    perfilProcesso: form.perfilProcesso,
  };
}

function rowToFichaForm(
  row: any,
  patch: Partial<FichaForm> = {},
  produtosComercial?: Parameters<typeof resolverModeloEPerfilParaRow>[2],
): FichaForm {
  const resolved = produtosComercial
    ? resolverModeloEPerfilParaRow(row, [], produtosComercial)
    : null;
  return {
    ...emptyFicha(row.ficha.tipo as TipoFichaCustoProduto),
    tipo: row.ficha.tipo as TipoFichaCustoProduto,
    categoria: resolved?.categoria ?? row.ficha.categoria,
    nome: row.ficha.nome,
    produtoComercialId: row.ficha.produtoComercialId ?? "",
    unidadeVenda: row.ficha.unidadeVenda,
    precoVendaReferencia: fmtDecimalInput(row.ficha.precoVendaReferencia, 2),
    precoVendaReferenciaModo:
      row.ficha.precoVendaReferenciaModo === "manual" ? "manual" : "automatico",
    orcamentosCompraKg: orcamentosCompraSlotsFromRow(row),
    precoCompraKg: fmtDecimalInput(precoCompraKgEfetivoRow(row.ficha), 4),
    custoCompraUn: fmtDecimalInput(row.ficha.custoCompraUn, 4),
    kgPorUnidadeCompra: fmtDecimalInput(row.ficha.kgPorUnidadeCompra, 4),
    unidadesMpPorUnidade: fmtDecimalInput(row.ficha.unidadesMpPorUnidade, 2),
    modoCompraMp: (row.ficha.modoCompraMp ?? "kg") as ModoCompraMp,
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
    etapas: garantirEtapaLogisticaForm(
      row.etapas.map((e: any) => ({
        tipo: e.tipo,
        nome: e.nome,
        minutosPorUnidade: fmtDecimalInput(e.minutosPorUnidade, 2),
        regimeMo: (e.regimeMo ?? "qualquer") as RegimeMoEtapa,
        custoPorUnidade: fmtDecimalInput(e.custoPorUnidade, 4),
        custoPorKgProcessado: fmtDecimalInput(e.custoPorKgProcessado, 4),
        custoPercentual: fmtDecimalInput(e.custoPercentual, 2),
      })),
    ),
    processoModeloId:
      resolved && produtosComercial
        ? (() => {
            const p = produtosComercial.find((x) => x.id === row.ficha.produtoComercialId);
            return p?.mapeamento?.processoModeloId != null
              ? String(p.mapeamento.processoModeloId)
              : "";
          })()
        : "",
    perfilProcesso: resolved?.perfil ?? inferirPerfilDeEtapas(row.etapas),
    etapasModoManual: false,
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
            <p className="text-[10px] text-muted-foreground">Média CA (receita ÷ qtd, mês atual)</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">{rotuloLucroPrejuizo(resultado.margemBruta)} bruto</p>
            <p className={`font-semibold tabular-nums ${classeLucroPrejuizo(resultado.margemBruta)}`}>
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

function EtapaProcessoEditor({
  etapa,
  idx,
  kgVendidoPorUn,
  lavagemModeloKg,
  updateEtapa,
  onRemove,
}: {
  etapa: EtapaForm;
  idx: number;
  kgVendidoPorUn: number | null;
  lavagemModeloKg: number | null;
  updateEtapa: (idx: number, patch: Partial<EtapaForm>) => void;
  onRemove: () => void;
}) {
  const isLavagem = etapa.tipo === "lavagem";
  const isLogistica = etapa.tipo === "logistica";
  const isInsumoFixo = etapa.tipo === "embalagem" || etapa.tipo === "adesivo";
  const rKg = parseOpt(etapa.custoPorKgProcessado);
  const previewLavagem =
    isLavagem && rKg != null && rKg > 0 && kgVendidoPorUn != null && kgVendidoPorUn > 0
      ? rKg * kgVendidoPorUn
      : null;

  return (
    <div className="rounded-lg border p-3 space-y-3">
      <div className="flex flex-wrap items-start gap-2">
        <div className="space-y-1 w-full sm:w-[190px]">
          <Label className="text-xs text-muted-foreground">Tipo</Label>
          <Select
            value={etapa.tipo}
            onValueChange={(v) =>
              updateEtapa(idx, {
                tipo: v as TipoEtapaProcesso,
                nome: LABEL_ETAPA_PROCESSO[v as TipoEtapaProcesso],
              })
            }
          >
            <SelectTrigger className="h-9">
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
        </div>
        <div className="space-y-1 flex-1 min-w-[140px]">
          <Label className="text-xs text-muted-foreground">Nome</Label>
          <Input className="h-9" value={etapa.nome} onChange={(ev) => updateEtapa(idx, { nome: ev.target.value })} />
        </div>
        <Button variant="ghost" size="icon" className="mt-6 shrink-0" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {isLavagem ? (
        <div className="rounded-md border border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20 p-3 space-y-3">
          <p className="text-xs leading-relaxed text-muted-foreground">
            A lavagem industrial é rateada por <strong>peso</strong>, não por min/un por produto. Informe o{" "}
            <strong>R$/kg médio do lote</strong> (calculado em{" "}
            <em>Valores comuns de processo → Lavagem industrial</em>). O custo desta ficha será:
          </p>
          <p className="text-xs font-medium">
            Custo lavagem/un = R$/kg do lote × kg vendido/un (campo Matéria-prima)
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs">R$/kg lavagem (média do lote)</Label>
              <Input
                className="h-9 w-32"
                inputMode="decimal"
                placeholder="0,25"
                value={etapa.custoPorKgProcessado}
                onChange={(ev) => updateEtapa(idx, { custoPorKgProcessado: ev.target.value })}
              />
            </div>
            {lavagemModeloKg != null && lavagemModeloKg > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  updateEtapa(idx, { custoPorKgProcessado: fmtDecimalInput(lavagemModeloKg, 4) })
                }
              >
                Usar do modelo ({fmtMoney(lavagemModeloKg)}/kg)
              </Button>
            ) : (
              <p className="text-[11px] text-amber-700 dark:text-amber-400 pb-2">
                Modelo comum ainda sem R$/kg — calcule na seção de processo acima.
              </p>
            )}
          </div>
          {previewLavagem != null ? (
            <p className="text-xs text-emerald-800 dark:text-emerald-300">
              Prévia: {fmtMoney(previewLavagem)}/un vendida ({fmtMoney(rKg!)}/kg × {kgVendidoPorUn} kg)
            </p>
          ) : kgVendidoPorUn == null || kgVendidoPorUn <= 0 ? (
            <p className="text-[11px] text-amber-700 dark:text-amber-400">
              Informe kg vendido/un em Matéria-prima para ver o custo de lavagem desta ficha.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {isInsumoFixo ? (
            <div className="space-y-1">
              <Label className="text-xs">Insumo (R$/un)</Label>
              <Input
                className="h-9"
                inputMode="decimal"
                placeholder="0,60"
                value={etapa.custoPorUnidade}
                onChange={(ev) => updateEtapa(idx, { custoPorUnidade: ev.target.value })}
              />
            </div>
          ) : null}
          {!isLogistica ? (
            <>
              <div className="space-y-1">
                <Label className="text-xs">MO — min/un</Label>
                <Input
                  className="h-9"
                  inputMode="decimal"
                  placeholder="opcional"
                  value={etapa.minutosPorUnidade}
                  onChange={(ev) => updateEtapa(idx, { minutosPorUnidade: ev.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Regime MO</Label>
                <Select
                  value={etapa.regimeMo}
                  onValueChange={(v) => updateEtapa(idx, { regimeMo: v as RegimeMoEtapa })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIMES_MO_ETAPA.map((r) => (
                      <SelectItem key={r} value={r}>
                        {LABEL_REGIME_MO_ETAPA[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : null}
          {!isInsumoFixo && !isLogistica ? (
            <div className="space-y-1">
              <Label className="text-xs">Extra fixo (R$/un)</Label>
              <Input
                className="h-9"
                inputMode="decimal"
                placeholder="0"
                value={etapa.custoPorUnidade}
                onChange={(ev) => updateEtapa(idx, { custoPorUnidade: ev.target.value })}
              />
            </div>
          ) : null}
          {isLogistica ? (
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Percentual sobre subtotal (%)</Label>
              <Input
                className="h-9 w-28"
                inputMode="decimal"
                placeholder="10"
                value={etapa.custoPercentual}
                onChange={(ev) => updateEtapa(idx, { custoPercentual: ev.target.value })}
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
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
  const modelosQuery = trpc.custosProducao.produtos.listarProcessoModelos.useQuery();
  const produtosComercialQuery = trpc.custosProducao.produtos.listarProdutosComercial.useQuery();
  const modelos = modelosQuery.data?.modelos ?? [];
  const mapaHora = modelosQuery.data?.mapaHora ?? null;

  const modeloAtivo = useMemo(() => {
    if (form.processoModeloId) {
      return modelos.find((m) => String(m.id) === form.processoModeloId) ?? null;
    }
    return modelos.find((m) => m.isDefault) ?? modelos[0] ?? null;
  }, [modelos, form.processoModeloId]);

  const configModelo = useMemo(() => {
    if (!modeloAtivo) return null;
    return configFromProcessoModelo(derivarProcessoModelo(modeloAtivo, mapaHora));
  }, [modeloAtivo, mapaHora]);

  const lavagemModeloKg = configModelo?.lavagemReaisKg ?? null;
  const kgVendidoPorUn = parseOpt(form.kgBrutoPorUnidade);
  const categoriaCusto = form.categoria as CategoriaProdutoCusto;
  const isFloresCategoria = categoriaCusto === "flores";

  const avisosModelo = useMemo(() => {
    if (!configModelo) return [];
    return avisosMapeamentoProduto(
      {
        perfilProcesso: form.perfilProcesso,
        kgPorUnidade: kgVendidoPorUn,
        modoCompraMp: form.modoCompraMp,
      },
      configModelo,
    );
  }, [configModelo, form.perfilProcesso, form.modoCompraMp, kgVendidoPorUn]);

  useEffect(() => {
    if (!form.produtoComercialId || !produtosComercialQuery.data) return;
    const p = produtosComercialQuery.data.find((x) => x.id === form.produtoComercialId);
    if (!p) return;
    setForm((f) => {
      let next = f;
      if (!f.nome.trim() && p.nome?.trim()) {
        next = { ...next, nome: p.nome.trim() };
      }
      if (f.processoModeloId || !p.mapeamento) return next === f ? f : next;
      return {
        ...next,
        perfilProcesso: p.mapeamento.perfilProcesso,
        processoModeloId:
          p.mapeamento.processoModeloId != null ? String(p.mapeamento.processoModeloId) : next.processoModeloId,
      };
    });
  }, [form.produtoComercialId, produtosComercialQuery.data, setForm]);

  useEffect(() => {
    if (form.etapasModoManual || !modeloAtivo) return;
    const next = etapasFormDeModelo(modeloAtivo, form.perfilProcesso, categoriaCusto, mapaHora);
    setForm((f) => {
      if (f.etapasModoManual) return f;
      const same =
        f.etapas.length === next.length &&
        f.etapas.every(
          (e, i) =>
            e.tipo === next[i]?.tipo &&
            e.custoPorKgProcessado === next[i]?.custoPorKgProcessado &&
            e.custoPorUnidade === next[i]?.custoPorUnidade &&
            e.minutosPorUnidade === next[i]?.minutosPorUnidade,
        );
      return same ? f : { ...f, etapas: next };
    });
  }, [
    form.etapasModoManual,
    form.processoModeloId,
    form.perfilProcesso,
    form.categoria,
    modeloAtivo,
    mapaHora,
    categoriaCusto,
    setForm,
  ]);

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
          <Select
            value={form.categoria}
            onValueChange={(v) =>
              setForm((f) => ({
                ...f,
                ...patchCategoriaFicha(f, v as CategoriaProdutoCusto),
              }))
            }
          >
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
          <Label>Nome do produto (obrigatório)</Label>
          <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
          {!form.nome.trim() && form.produtoComercialId ? (
            <p className="text-[10px] text-amber-700">
              Vazio — ao salvar/simular usamos o nome do SKU vinculado, se houver.
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label>Produto comercial (opcional)</Label>
          <Select
            value={form.produtoComercialId || "__none__"}
            onValueChange={(v) => {
              const id = v === "__none__" ? "" : v;
              const p = produtosComercialQuery.data?.find((x) => x.id === id);
              const m = p?.mapeamento;
              setForm((f) => ({
                ...f,
                produtoComercialId: id,
                nome: f.nome.trim() || p?.nome?.trim() || "",
                ...(m
                  ? {
                      ...patchCategoriaFicha(f, m.categoriaCusto as CategoriaProdutoCusto),
                      perfilProcesso: m.perfilProcesso,
                      processoModeloId:
                        m.processoModeloId != null ? String(m.processoModeloId) : f.processoModeloId,
                      modoCompraMp:
                        m.categoriaCusto === "flores"
                          ? "kg"
                          : (m.modoCompraMp ?? f.modoCompraMp),
                      kgBrutoPorUnidade:
                        m.kgPorUnidade != null
                          ? fmtDecimalInput(m.kgPorUnidade, 6)
                          : m.categoriaCusto === "flores"
                            ? fmtDecimalInput(FLORES_KG_POR_POTE_PADRAO, 6)
                            : f.kgBrutoPorUnidade,
                      etapasModoManual: false,
                    }
                  : {}),
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
        <div className="space-y-2 md:col-span-2">
          <Label>Preço venda referência (R$)</Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="space-y-1 shrink-0 sm:w-56">
              <p className="text-[10px] text-muted-foreground">Origem do preço</p>
              <Select
                value={form.precoVendaReferenciaModo}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    precoVendaReferenciaModo: v as PrecoVendaReferenciaModo,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="automatico">Automático (vendas CA)</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-[10px] text-muted-foreground">
                {form.precoVendaReferenciaModo === "automatico"
                  ? "Média do mês (receita ÷ quantidade, Conta Azul). Atualiza a cada ~2 min."
                  : "Informe o preço de referência para margem e simulação."}
              </p>
              <Input
                type="text"
                inputMode="decimal"
                readOnly={form.precoVendaReferenciaModo === "automatico"}
                tabIndex={form.precoVendaReferenciaModo === "automatico" ? -1 : 0}
                className={
                  form.precoVendaReferenciaModo === "automatico"
                    ? "bg-muted/50 cursor-default"
                    : undefined
                }
                placeholder={form.precoVendaReferenciaModo === "manual" ? "Ex.: 12,50" : undefined}
                value={form.precoVendaReferencia}
                onChange={(e) =>
                  setForm((f) => ({ ...f, precoVendaReferencia: e.target.value }))
                }
              />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border p-3 md:col-span-2">
          <div>
            <Label>Ficha ativa</Label>
            <p className="text-xs text-muted-foreground">
              Fichas inativas ficam cadastradas, mas não entram na tabela/PDF para clientes.
            </p>
          </div>
          <Switch
            checked={form.ativo}
            onCheckedChange={(ativo) => {
              if (ativo) {
                const msg = mensagemErroAtivacaoFicha({ ...form, ativo: true });
                if (msg) return toast.error(msg);
              }
              setForm((f) => ({ ...f, ativo }));
            }}
          />
        </div>
      </div>

      {(form.tipo === "revenda_processada" || form.tipo === "manual") && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Matéria-prima — específico desta variedade/SKU</CardTitle>
            <CardDescription>
              {isFloresCategoria && form.modoCompraMp === "kg"
                ? "Compra por kg e vende por pote/unidade — informe o preço R$/kg e quantos potes você monta com 1 kg. O sistema calcula o kg por pote e o custo de MP."
                : form.modoCompraMp === "unidade"
                  ? "Informe o preço por unidade de compra (cabeça, caixa, bandeja…). Consumo e perdas definem quantas unidades de MP entram em cada produto vendido."
                  : "Informe de 1 a 3 orçamentos R$/kg recebidos — o preço de compra será a média. Informe também quanto produto pronto você vende; as perdas calculam a compra bruta."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {isFloresCategoria ? (
              <Alert className="md:col-span-3 border-pink-200 bg-pink-50/50 dark:border-pink-900 dark:bg-pink-950/20">
                <AlertTitle className="text-sm">Flores — compra kg, vende pote</AlertTitle>
                <AlertDescription className="text-xs">
                  Informe o preço da matéria-prima por kg, quantos potes saem de 1 kg e o preço de venda do pote
                  (campo acima). Ex.: R$ 200/kg → 17 potes → venda R$ 27/pote.
                </AlertDescription>
              </Alert>
            ) : null}
            {!isFloresCategoria ? (
              <div className="space-y-2 md:col-span-3">
                <Label>Como você compra esta matéria-prima?</Label>
                <Select
                  value={form.modoCompraMp}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      modoCompraMp: v as ModoCompraMp,
                    }))
                  }
                >
                  <SelectTrigger className="max-w-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODOS_COMPRA_MP.map((m) => (
                      <SelectItem key={m} value={m}>
                        {LABEL_MODO_COMPRA_MP[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  O mesmo produto pode ter fornecedores diferentes — escolha o modo que reflete o custo padrão desta
                  ficha.
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground md:col-span-3">
                Compra: <strong>por kg (a granel)</strong> · Venda: <strong>por pote/unidade</strong>
              </p>
            )}
            {form.modoCompraMp === "kg" || isFloresCategoria ? (
              <>
                <div className="space-y-2 md:col-span-2">
                  <Label>Orçamentos recebidos (R$/kg)</Label>
                  <p className="text-[10px] text-muted-foreground">
                    Informe de 1 a 3 valores de orçamento de fornecedores — o preço de compra será a média
                    automaticamente.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {form.orcamentosCompraKg.map((val, i) => (
                      <Input
                        key={i}
                        inputMode="decimal"
                        placeholder={i === 0 ? "Orçamento 1" : `Orçamento ${i + 1} (opc.)`}
                        value={val}
                        onChange={(e) => {
                          const next = [...form.orcamentosCompraKg];
                          next[i] = e.target.value;
                          setForm((f) => ({
                            ...f,
                            orcamentosCompraKg: next,
                            precoCompraKg: precoCompraKgMedioFromSlots(next),
                          }));
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Preço compra (R$/kg) — média</Label>
                  <Input
                    inputMode="decimal"
                    readOnly
                    className="bg-muted/40"
                    value={form.precoCompraKg}
                  />
                </div>
                {isFloresCategoria ? (
                  <>
                    <div className="space-y-2">
                      <Label>Rendimento (potes por kg comprado)</Label>
                      <Input
                        inputMode="decimal"
                        placeholder="Ex.: 17"
                        value={(() => {
                          const kg = parseOpt(form.kgBrutoPorUnidade);
                          const rend = kg != null && kg > 0 ? rendimentoUnidadesPorKg(kg) : null;
                          return rend != null ? fmtDecimalInput(rend, 2) : "";
                        })()}
                        onChange={(e) => {
                          const rend = parseOpt(e.target.value);
                          setForm((f) => ({
                            ...f,
                            kgBrutoPorUnidade:
                              rend != null && rend > 0
                                ? fmtDecimalInput(kgLiquidoPorUnidadeDeRendimentoKg(rend), 6)
                                : "",
                          }));
                        }}
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Ex.: com <strong>1 kg</strong> a R$ 200 você monta <strong>17 potes</strong> de 25 flores — informe{" "}
                        <strong>17</strong>. O sistema usa ≈{" "}
                        {(() => {
                          const kg = parseOpt(form.kgBrutoPorUnidade);
                          return kg != null && kg > 0
                            ? `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(kg)} kg/pote`
                            : "0,059 kg/pote";
                        })()}{" "}
                        antes do desperdício na seleção.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Kg por pote (calculado)</Label>
                      <Input
                        inputMode="decimal"
                        readOnly
                        className="bg-muted/40"
                        value={(() => {
                          const kg = parseOpt(form.kgBrutoPorUnidade);
                          return kg != null && kg > 0
                            ? fmtDecimalInput(kg, 4)
                            : "";
                        })()}
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Label>Kg final vendido / unidade</Label>
                    <Input
                      inputMode="decimal"
                      placeholder={form.unidadeVenda === "kg" ? "1" : "Ex.: 0,5 para pacote de 500g"}
                      value={form.kgBrutoPorUnidade}
                      onChange={(e) => setForm((f) => ({ ...f, kgBrutoPorUnidade: e.target.value }))}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Peso <strong>líquido</strong> que o cliente recebe — o sistema calcula a compra bruta pelas perdas.
                    </p>
                  </div>
                )}
                {isFloresCategoria ? (
                  <div className="space-y-2 md:col-span-2">
                    <Label>Desperdício na seleção (%)</Label>
                    <Input
                      inputMode="decimal"
                      value={form.perdaSelecaoPct}
                      onChange={(e) => setForm((f) => ({ ...f, perdaSelecaoPct: e.target.value }))}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Flores: só triagem/seleção — sem perda de lavagem ou corte.
                    </p>
                    {(() => {
                      const precoKg = precoCompraKgEfetivoForm(form);
                      const kgPote = parseOpt(form.kgBrutoPorUnidade);
                      const precoVenda = parseOpt(form.precoVendaReferencia);
                      if (precoKg == null || kgPote == null || precoKg <= 0 || kgPote <= 0) return null;
                      const rev = custoMaterialRevenda({
                        precoCompraKg: precoKg,
                        kgBrutoPorUnidade: kgPote,
                        perdasPct: [0, 0, parseOpt(form.perdaSelecaoPct) ?? 0],
                      });
                      if (rev.custo <= 0) return null;
                      const rend = rendimentoUnidadesPorKg(kgPote);
                      const margemMp =
                        precoVenda != null && precoVenda > rev.custo ? precoVenda - rev.custo : null;
                      return (
                        <div className="rounded-md border border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30 p-2 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                          <p>
                            Matéria-prima por pote: <strong>{fmtMoney(rev.custo)}</strong>
                            {rend != null ? (
                              <>
                                {" "}
                                ({fmtMoney(precoKg)}/kg ÷ {fmtDecimalInput(rend, 1)} potes
                                {parseOpt(form.perdaSelecaoPct) ? ", c/ desperdício" : ""})
                              </>
                            ) : null}
                          </p>
                          {precoVenda != null && precoVenda > 0 ? (
                            <p>
                              Venda referência: <strong>{fmtMoney(precoVenda)}</strong>/pote
                              {margemMp != null ? (
                                <>
                                  {" "}
                                  · margem bruta só MP:{" "}
                                  <strong>{fmtMoney(margemMp)}</strong>
                                </>
                              ) : null}
                            </p>
                          ) : (
                            <p className="text-muted-foreground">
                              Preencha o preço de venda referência acima (ex.: 27) para ver a margem bruta de MP.
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ) : form.etapas.some((e) => e.tipo === "lavagem" || e.tipo === "descasque_corte") ? (
                  <>
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
                  </>
                ) : (
                  <p className="text-[10px] text-muted-foreground md:col-span-2">
                    Perdas de kg só aparecem quando a ficha tem etapa de lavagem ou corte.
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Preço compra (R$/un)</Label>
                  <Input
                    inputMode="decimal"
                    value={form.custoCompraUn}
                    onChange={(e) => setForm((f) => ({ ...f, custoCompraUn: e.target.value }))}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Ex.: alface americana a R$ 3,00 por cabeça.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Peso médio da unidade de compra (kg)</Label>
                  <Input
                    inputMode="decimal"
                    placeholder="Ex.: 0,35 kg por cabeça"
                    value={form.kgPorUnidadeCompra}
                    onChange={(e) => setForm((f) => ({ ...f, kgPorUnidadeCompra: e.target.value }))}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Quanto pesa (ou quanto você usa) de cada cabeça/caixa comprada — base para calcular quantas unidades
                    entram no produto.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Peso líquido do pacote vendido (kg)</Label>
                  <Input
                    inputMode="decimal"
                    placeholder="Ex.: 0,12 para pacote de 120 g"
                    value={form.kgBrutoPorUnidade}
                    onChange={(e) => setForm((f) => ({ ...f, kgBrutoPorUnidade: e.target.value }))}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Peso pronto que o cliente recebe — também usado para lavagem (R$/kg × kg).
                  </p>
                </div>
                {isFloresCategoria ? (
                  <div className="space-y-2 md:col-span-2">
                    <Label>Desperdício na seleção (%)</Label>
                    <Input
                      inputMode="decimal"
                      value={form.perdaSelecaoPct}
                      onChange={(e) => setForm((f) => ({ ...f, perdaSelecaoPct: e.target.value }))}
                    />
                  </div>
                ) : form.etapas.some((e) => e.tipo === "lavagem" || e.tipo === "descasque_corte") ||
                parseOpt(form.kgPorUnidadeCompra) != null ? (
                  <>
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
                  </>
                ) : null}
                {(() => {
                  const prev = unidadesMpConsumidasRevenda({
                    kgPorUnidadeVendida: parseOpt(form.kgBrutoPorUnidade),
                    kgPorUnidadeCompra: parseOpt(form.kgPorUnidadeCompra),
                    unidadesMpPorUnidade: parseOpt(form.unidadesMpPorUnidade),
                    perdasPct: [
                      parseOpt(form.perdaLavagemPct) ?? 0,
                      parseOpt(form.perdaDescasquePct) ?? 0,
                      parseOpt(form.perdaSelecaoPct) ?? 0,
                    ],
                  });
                  if (prev.unidades <= 0) return null;
                  const preco = parseOpt(form.custoCompraUn);
                  return (
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 md:col-span-3">
                      Consumo estimado:{" "}
                      <strong>
                        {new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(prev.unidades)} un
                      </strong>{" "}
                      de MP por produto
                      {prev.kgBrutoNecessario != null
                        ? ` (${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(prev.kgBrutoNecessario)} kg bruto antes das perdas)`
                        : ""}
                      {preco != null && preco > 0
                        ? ` → MP ≈ ${fmtMoney(preco * prev.unidades)}/produto`
                        : ""}
                    </p>
                  );
                })()}
              </>
            )}
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
                {c.tipo === "produto_comercial" && (
                  <Select
                    value={c.produtoComercialId || "__none__"}
                    onValueChange={(v) =>
                      updateComp(idx, { produtoComercialId: v === "__none__" ? "" : v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Produto CA" />
                    </SelectTrigger>
                    <SelectContent>
                      {(catalogos?.produtosComerciais ?? []).map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome}
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
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Modelo de processo industrial</CardTitle>
          <CardDescription>
            Escolha o modelo salvo no wizard e o perfil da rota. Processo (lavagem, MO, insumo de embalagem) vem do
            modelo — nesta ficha você informa matéria-prima, pesos e perdas da variedade.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {modelos.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Nenhum modelo salvo</AlertTitle>
              <AlertDescription>
                Cadastre um modelo em <em>Valores comuns de processo → Modelos de linha</em> antes de montar a ficha.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Modelo de linha</Label>
                  <Select
                    value={form.processoModeloId || "__padrao__"}
                    onValueChange={(v) =>
                      setForm((f) => {
                        const modelo =
                          v === "__padrao__" ? null : modelos.find((m) => String(m.id) === v) ?? null;
                        const patch: Partial<FichaForm> = {
                          processoModeloId: v === "__padrao__" ? "" : v,
                          etapasModoManual: false,
                        };
                        if (
                          f.categoria === "revenda" &&
                          (modelo?.familia === "legumes" || modelo?.familia === "folhosas")
                        ) {
                          patch.categoria = "outros";
                        }
                        if (
                          modelo?.familia === "legumes" &&
                          !perfilUsaLavagemKg(f.perfilProcesso)
                        ) {
                          patch.perfilProcesso = "lavagem_corte_embalagem";
                        }
                        return { ...f, ...patch };
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__padrao__">
                        Padrão do projeto
                        {modelos.find((m) => m.isDefault)
                          ? ` (${modelos.find((m) => m.isDefault)!.nome})`
                          : ""}
                      </SelectItem>
                      {modelos.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>
                          {m.nome}
                          {m.isDefault ? " · padrão" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Perfil da rota</Label>
                  <Select
                    value={form.perfilProcesso}
                    onValueChange={(v) =>
                      setForm((f) => {
                        const perfil = v as PerfilProcessoProduto;
                        const patch: Partial<FichaForm> = {
                          perfilProcesso: perfil,
                          etapasModoManual: false,
                        };
                        if (f.categoria === "revenda" && perfilUsaLavagemKg(perfil)) {
                          patch.categoria = "outros";
                        }
                        return { ...f, ...patch };
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERFIS_PROCESSO_PRODUTO.map((p) => (
                        <SelectItem key={p} value={p}>
                          {LABEL_PERFIL_PROCESSO_PRODUTO[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">{DESCRICAO_PERFIL_PROCESSO[form.perfilProcesso]}</p>
                </div>
              </div>

              {modeloAtivo && configModelo ? (
                <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
                  <p>
                    <strong>{modeloAtivo.nome}</strong>
                    {configModelo.lavagemReaisKg != null && configModelo.lavagemReaisKg > 0
                      ? ` · lavagem ${fmtMoney(configModelo.lavagemReaisKg)}/kg`
                      : perfilUsaLavagemKg(form.perfilProcesso)
                        ? " · lavagem R$/kg pendente no modelo"
                        : ""}
                    {configModelo.corteMinutosUn != null && configModelo.corteMinutosUn > 0
                      ? ` · desfolhagem ${configModelo.corteMinutosUn} min/un`
                      : ""}
                    {configModelo.embalagemMinutosUn != null && configModelo.embalagemMinutosUn > 0
                      ? ` · MO emb+sel ${configModelo.embalagemMinutosUn} min/un (detalhado nas etapas)`
                      : ""}
                  </p>
                </div>
              ) : null}

              {avisosModelo.length > 0 ? (
                <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
                  {avisosModelo.map((a, i) => (
                    <li key={i}>• {a}</li>
                  ))}
                </ul>
              ) : null}

              {!form.etapasModoManual ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">Etapas derivadas do modelo</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!modeloAtivo}
                        onClick={() => {
                          if (!modeloAtivo) return;
                          setForm((f) => ({
                            ...f,
                            etapas: etapasFormDeModelo(modeloAtivo, f.perfilProcesso, categoriaCusto, mapaHora),
                          }));
                          toast.success("Etapas recarregadas do modelo");
                        }}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" /> Recarregar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setForm((f) => ({ ...f, etapasModoManual: true }))}
                      >
                        <Pencil className="h-4 w-4 mr-1" /> Editar manualmente
                      </Button>
                    </div>
                  </div>
                  {form.etapas.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Selecione modelo e perfil para gerar as etapas.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Etapa</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Parâmetro</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {form.etapas.map((e, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{e.nome}</TableCell>
                            <TableCell>{LABEL_ETAPA_PROCESSO[e.tipo]}</TableCell>
                            <TableCell className="tabular-nums">{resumoValorEtapa(e)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  {(() => {
                    const lavagemEtapa = form.etapas.find((e) => e.tipo === "lavagem");
                    const rKgLavagem = parseOpt(lavagemEtapa?.custoPorKgProcessado ?? "");
                    if (!lavagemEtapa || rKgLavagem == null || kgVendidoPorUn == null || kgVendidoPorUn <= 0) {
                      return null;
                    }
                    return (
                      <p className="text-xs text-muted-foreground">
                        Lavagem/un ≈ {fmtMoney(rKgLavagem * kgVendidoPorUn)} ({fmtMoney(rKgLavagem)}/kg ×{" "}
                        {kgVendidoPorUn} kg)
                      </p>
                    );
                  })()}
                </div>
              ) : (
                <Collapsible defaultOpen>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CollapsibleTrigger asChild>
                      <Button type="button" size="sm" variant="outline" className="gap-1">
                        <ChevronDown className="h-4 w-4" /> Edição manual de etapas
                      </Button>
                    </CollapsibleTrigger>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={!modeloAtivo}
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          etapasModoManual: false,
                          etapas: modeloAtivo
                            ? etapasFormDeModelo(modeloAtivo, f.perfilProcesso, categoriaCusto, mapaHora)
                            : f.etapas,
                        }))
                      }
                    >
                      Voltar ao modelo
                    </Button>
                  </div>
                  <CollapsibleContent className="space-y-3 pt-3">
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setForm((f) => ({ ...f, etapas: [...f.etapas, emptyEtapa()] }))}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Etapa
                      </Button>
                    </div>
                    {form.etapas.map((e, idx) => (
                      <EtapaProcessoEditor
                        key={idx}
                        etapa={e}
                        idx={idx}
                        kgVendidoPorUn={kgVendidoPorUn}
                        lavagemModeloKg={lavagemModeloKg}
                        updateEtapa={updateEtapa}
                        onRemove={() => setForm((f) => ({ ...f, etapas: f.etapas.filter((_, i) => i !== idx) }))}
                      />
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </>
          )}
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
  const produtosComercialQuery = trpc.custosProducao.produtos.listarProdutosComercial.useQuery();
  const produtosParaNome = useMemo(
    () =>
      (produtosComercialQuery.data ?? catalogos.data?.produtosComerciais ?? []).map(
        (p: { id: string; nome: string }) => ({ id: p.id, nome: p.nome }),
      ),
    [produtosComercialQuery.data, catalogos.data],
  );
  const fichas = trpc.custosProducao.produtos.listarFichas.useQuery(undefined, {
    refetchInterval: 120_000,
  });
  const vendasSemFicha = trpc.custosProducao.produtos.listarVendasSemFicha.useQuery(
    { dias: 90 },
    { staleTime: 60_000 },
  );
  const modelosQuery = trpc.custosProducao.produtos.listarProcessoModelos.useQuery();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FichaForm>(emptyFicha());
  const [simResult, setSimResult] = useState<any>(null);
  const simResultFichaId = useRef<number | null>(null);
  const [compraDraft, setCompraDraft] = useState<Record<number, string>>({});
  const [orcamentosDraft, setOrcamentosDraft] = useState<Record<number, string[]>>({});
  const [margemTabelaCliente, setMargemTabelaCliente] = useState<string>("20");

  const sincronizarPrecoVenda = trpc.custosProducao.produtos.sincronizarPrecoVendaReferencia.useMutation({
    onSuccess: async (r) => {
      if (r.atualizados > 0) {
        await utils.custosProducao.produtos.listarFichas.invalidate();
      }
    },
  });

  useEffect(() => {
    const tick = () => sincronizarPrecoVenda.mutate(periodoMesCorrente());
    tick();
    const id = window.setInterval(tick, 120_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (editingId == null) {
      simResultFichaId.current = null;
      return;
    }
    if (!fichas.data) return;
    const row = fichas.data.find((r) => r.ficha.id === editingId);
    if (!row) return;
    const modoServidor =
      row.ficha.precoVendaReferenciaModo === "manual" ? "manual" : "automatico";
    setForm((f) => {
      let changed = false;
      const next = { ...f };
      if (f.precoVendaReferenciaModo !== modoServidor) {
        next.precoVendaReferenciaModo = modoServidor;
        changed = true;
      }
      if (
        modoServidor === "automatico" &&
        f.precoVendaReferenciaModo === "automatico"
      ) {
        const preco = fmtDecimalInput(row.ficha.precoVendaReferencia, 2);
        if (f.precoVendaReferencia !== preco) {
          next.precoVendaReferencia = preco;
          changed = true;
        }
      }
      return changed ? next : f;
    });
    if (simResultFichaId.current !== editingId) {
      simResultFichaId.current = editingId;
      setSimResult(row.resultado);
    }
  }, [editingId, fichas.data]);

  const simular = trpc.custosProducao.produtos.simularCusto.useMutation({
    onSuccess: (r) => setSimResult(r),
    onError: (e) => toast.error(parseTrpcErrorMessage(e.message)),
  });
  const salvar = trpc.custosProducao.produtos.salvarFicha.useMutation({
    onSuccess: async (r) => {
      toast.success("Ficha salva");
      setSimResult(r.resultado);
      await utils.custosProducao.produtos.listarFichas.invalidate();
      await utils.custosProducao.produtos.listarVendasSemFicha.invalidate();
      setEditingId(r.id);
    },
    onError: (e) => toast.error(parseTrpcErrorMessage(e.message)),
  });
  const salvarFichaRapida = trpc.custosProducao.produtos.salvarFicha.useMutation({
    onSuccess: async (_r, variables) => {
      toast.success("Ficha atualizada");
      if (variables?.id != null) {
        setCompraDraft((draft) => {
          const next = { ...draft };
          delete next[variables.id!];
          return next;
        });
        setOrcamentosDraft((draft) => {
          const next = { ...draft };
          delete next[variables.id!];
          return next;
        });
      } else {
        setCompraDraft({});
        setOrcamentosDraft({});
      }
      await utils.custosProducao.produtos.listarFichas.invalidate();
      await utils.custosProducao.produtos.listarVendasSemFicha.invalidate();
    },
    onError: (e) => toast.error(parseTrpcErrorMessage(e.message)),
  });
  const excluir = trpc.custosProducao.produtos.excluirFicha.useMutation({
    onSuccess: async () => {
      toast.success("Ficha removida");
      setEditingId(null);
      setForm(emptyFicha());
      await utils.custosProducao.produtos.listarFichas.invalidate();
    },
    onError: (e) => toast.error(parseTrpcErrorMessage(e.message)),
  });
  const alterarAtivoTodasFichas = trpc.custosProducao.produtos.alterarAtivoTodasFichas.useMutation({
    onSuccess: async (r, variables) => {
      if (variables.ativo) {
        if (r.ignoradas > 0) {
          toast.success(
            `${r.atualizadas} ficha(s) ativada(s). ${r.ignoradas} incompleta(s) não foram alteradas.`,
          );
        } else {
          toast.success(`${r.atualizadas} ficha(s) ativada(s).`);
        }
      } else {
        toast.success(`${r.atualizadas} ficha(s) desativada(s).`);
      }
      await utils.custosProducao.produtos.listarFichas.invalidate();
      await utils.custosProducao.produtos.listarVendasSemFicha.invalidate();
    },
    onError: (e) => toast.error(parseTrpcErrorMessage(e.message)),
  });
  const gerarFichasContaAzul = trpc.custosProducao.produtos.gerarFichasContaAzul.useMutation({
    onSuccess: async (r) => {
      const n = r.inseridos + r.atualizados;
      toast.success(
        n > 0
          ? `${n} ficha(s) gerada(s) do catálogo comercial`
          : "Nenhuma ficha nova gerada",
      );
      await Promise.all([
        utils.custosProducao.produtos.listarFichas.invalidate(),
        utils.custosProducao.produtos.listarVendasSemFicha.invalidate(),
        utils.custosProducao.produtos.listarProdutosComercial.invalidate(),
      ]);
    },
    onError: (e) => toast.error(parseTrpcErrorMessage(e.message)),
  });

  const abrirFichaDeVenda = (
    item: NonNullable<typeof vendasSemFicha.data>[number],
  ) => {
    const produto = item.produtoComercialId
      ? produtosComercialQuery.data?.find((p) => p.id === item.produtoComercialId)
      : undefined;
    const categoria = (produto?.categoriaSugerida ??
      produto?.mapeamento?.categoriaCusto ??
      "revenda") as CategoriaProdutoCusto;
    setEditingId(null);
    setSimResult(null);
    setForm({
      ...emptyFicha(item.produtoComercialId ? "revenda_processada" : "manual"),
      nome: item.nome,
      produtoComercialId: item.produtoComercialId ?? "",
      categoria,
      perfilProcesso:
        produto?.perfilSugerido ?? perfilDefaultParaCategoria(categoria),
    });
  };

  const idsVendasGeraveis = useMemo(
    () =>
      (vendasSemFicha.data ?? [])
        .map((v) => v.produtoComercialId)
        .filter((id): id is string => Boolean(id)),
    [vendasSemFicha.data],
  );

  const resumoProdutos = useMemo(() => fichas.data ?? [], [fichas.data]);
  const contagemAtivoFichas = useMemo(() => {
    let ativas = 0;
    for (const row of resumoProdutos) {
      if (fichaAtiva(row)) ativas += 1;
    }
    return { ativas, total: resumoProdutos.length };
  }, [resumoProdutos]);
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
        <CustosProdutoProcessoSection />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground max-w-2xl">
            Fichas por produto vendido: produção própria, revenda processada (lavagem, corte, embalagem) e mix.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {resumoProdutos.length > 0 && editingId == null && form.nome === "" ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={
                    alterarAtivoTodasFichas.isPending ||
                    contagemAtivoFichas.ativas === contagemAtivoFichas.total
                  }
                  onClick={() => alterarAtivoTodasFichas.mutate({ ativo: true })}
                >
                  Ativar todos
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={
                    alterarAtivoTodasFichas.isPending || contagemAtivoFichas.ativas === 0
                  }
                  onClick={() => alterarAtivoTodasFichas.mutate({ ativo: false })}
                >
                  Desativar todos
                </Button>
              </>
            ) : null}
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
        </div>

        {(vendasSemFicha.data?.length ?? 0) > 0 && editingId == null && form.nome === "" && (
          <Card className="border-amber-200 bg-amber-50/40 dark:border-amber-900 dark:bg-amber-950/20">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Vendidos sem ficha (Conta Azul)
                  </CardTitle>
                  <CardDescription>
                    Produtos que apareceram em vendas nos últimos 3 meses e ainda não têm ficha de
                    custo — por isso ficam &quot;incompletos&quot; na rentabilidade.
                  </CardDescription>
                </div>
                {idsVendasGeraveis.length > 0 ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={gerarFichasContaAzul.isPending}
                    onClick={() =>
                      gerarFichasContaAzul.mutate({ produtoIds: idsVendasGeraveis })
                    }
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Gerar fichas do catálogo ({idsVendasGeraveis.length})
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto vendido</TableHead>
                    <TableHead className="text-right">Qtd. (período)</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                    <TableHead>Catálogo</TableHead>
                    <TableHead className="w-[10rem]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendasSemFicha.data!.map((item) => (
                    <TableRow key={item.chave}>
                      <TableCell>
                        <div className="font-medium">{item.nome}</div>
                        {item.sku ? (
                          <span className="text-[11px] text-muted-foreground">SKU {item.sku}</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{item.quantidade}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtMoney(item.receitaTotal)}
                      </TableCell>
                      <TableCell>
                        {item.produtoComercialId ? (
                          <Badge variant="secondary" className="font-normal">
                            Vinculado ao catálogo
                          </Badge>
                        ) : (
                          <Badge variant="outline">Só no pedido CA</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-1">
                          {item.produtoComercialId ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={gerarFichasContaAzul.isPending}
                              onClick={() =>
                                gerarFichasContaAzul.mutate({
                                  produtoIds: [item.produtoComercialId!],
                                })
                              }
                            >
                              Gerar ficha
                            </Button>
                          ) : null}
                          <Button size="sm" onClick={() => abrirFichaDeVenda(item)}>
                            {item.produtoComercialId ? "Editar" : "Criar ficha"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

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
          <div className="rounded-md border [&_[data-slot=table-container]]:overflow-x-hidden">
            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[34%] whitespace-normal">Produto</TableHead>
                  <TableHead className="w-[16%] whitespace-normal">Compra MP</TableHead>
                  <TableHead className="w-[16%] whitespace-normal text-right">Custos e venda</TableHead>
                  <TableHead className="w-[26%] whitespace-normal">Venda por margem</TableHead>
                  <TableHead className="w-[8%]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumoProdutos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground text-center py-8">
                      Nenhuma ficha cadastrada. Crie uma para alface, microverde, flores, revenda ou mix.
                    </TableCell>
                  </TableRow>
                ) : (
                  resumoProdutos.map((row) => {
                    const modoCompra = (row.ficha.modoCompraMp ?? "kg") as ModoCompraMp;
                    const precoCompraAtual =
                      modoCompra === "unidade"
                        ? fmtDecimalInput(row.ficha.custoCompraUn, 4)
                        : fmtDecimalInput(precoCompraKgEfetivoRow(row.ficha), 4);
                    const precoCompraValue = compraDraft[row.ficha.id] ?? precoCompraAtual;
                    const orcamentosAtuais =
                      orcamentosDraft[row.ficha.id] ?? orcamentosCompraSlotsFromRow(row);
                    const orcamentosSalvos = orcamentosCompraSlotsFromRow(row);
                    const podeEditarCompra = row.ficha.tipo === "revenda_processada" || row.ficha.tipo === "manual";
                    const precosMargem = row.resultado.precosVendaPorMargem ?? [];
                    const ativo = fichaAtiva(row);
                    const incompleta = (row.resultado.alertas?.length ?? 0) > 0;
                    const categoriaLabel =
                      LABEL_CATEGORIA_PRODUTO_CUSTO[row.ficha.categoria as keyof typeof LABEL_CATEGORIA_PRODUTO_CUSTO] ??
                      row.ficha.categoria;
                    return (
                      <TableRow key={row.ficha.id} className={!ativo ? "opacity-60" : undefined}>
                        <TableCell className="align-top whitespace-normal">
                          <div className="space-y-1.5">
                            <p className="font-medium leading-snug break-words">{row.ficha.nome}</p>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge variant="secondary" className="text-[10px] font-normal">
                                {LABEL_TIPO_FICHA_CUSTO_PRODUTO[row.ficha.tipo as TipoFichaCustoProduto]}
                              </Badge>
                              <span className="text-[11px] text-muted-foreground">{categoriaLabel}</span>
                              {!ativo && (
                                <Badge variant="outline" className="text-[10px]">
                                  Inativo
                                </Badge>
                              )}
                              {incompleta && (
                                <Badge variant="destructive" className="text-[10px]">
                                  Incompleta
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={ativo}
                                disabled={salvarFichaRapida.isPending || alterarAtivoTodasFichas.isPending}
                                onCheckedChange={(nextAtivo) => {
                                  const formAtual = rowToFichaFormComDraft(
                                    row,
                                    { ativo: nextAtivo },
                                    compraDraft,
                                    orcamentosDraft,
                                    produtosParaNome,
                                  );
                                  if (nextAtivo) {
                                    const msg = mensagemErroAtivacaoFicha(formAtual);
                                    if (msg) return toast.error(msg);
                                  }
                                  salvarFichaRapida.mutate(
                                    buildPayload(formAtual, row.ficha.id, produtosParaNome) as any,
                                  );
                                }}
                              />
                              <span className="text-[11px] text-muted-foreground">Ativo</span>
                            </div>
                            {incompleta && !ativo && (
                              <p className="text-[10px] text-destructive leading-snug">
                                Preencha compra MP (e kg/un se faltar) antes de ativar.
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="align-top whitespace-normal">
                          {podeEditarCompra ? (
                            <div className="space-y-1">
                              <Select
                                value={modoCompra}
                                disabled={salvarFichaRapida.isPending}
                                onValueChange={(v) => {
                                  const p = buildPayload(
                                    rowToFichaForm(row, { modoCompraMp: v as ModoCompraMp }, produtosParaNome),
                                    row.ficha.id,
                                    produtosParaNome,
                                  );
                                  salvarFichaRapida.mutate(p as any);
                                }}
                              >
                                <SelectTrigger className="h-7 text-[10px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {MODOS_COMPRA_MP.map((m) => (
                                    <SelectItem key={m} value={m}>
                                      {LABEL_MODO_COMPRA_MP[m]}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <span className="text-[10px] text-muted-foreground">
                                {modoCompra === "unidade" ? "R$/un" : "R$/kg"}
                              </span>
                              {modoCompra === "kg" ? (
                                <>
                                  {orcamentosAtuais.map((val, i) => (
                                    <Input
                                      key={i}
                                      className="h-7 min-w-0 flex-1 px-2 text-xs"
                                      inputMode="decimal"
                                      placeholder={i === 0 ? "Orç. 1" : `Orç. ${i + 1}`}
                                      value={val}
                                      onChange={(e) => {
                                        const next = [...orcamentosAtuais];
                                        next[i] = e.target.value;
                                        setOrcamentosDraft((drafts) => ({
                                          ...drafts,
                                          [row.ficha.id]: next,
                                        }));
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key !== "Enter") return;
                                        if (orcamentosCompraSlotsIguais(orcamentosAtuais, orcamentosSalvos)) return;
                                        const patch = {
                                          orcamentosCompraKg: orcamentosAtuais,
                                          precoCompraKg: precoCompraKgMedioFromSlots(orcamentosAtuais),
                                        };
                                        const p = buildPayload(
                                          rowToFichaForm(row, patch, produtosParaNome),
                                          row.ficha.id,
                                          produtosParaNome,
                                        );
                                        salvarFichaRapida.mutate(p as any);
                                      }}
                                    />
                                  ))}
                                  <p className="text-[10px] text-muted-foreground tabular-nums">
                                    Média:{" "}
                                    {precoCompraKgMedioFromSlots(orcamentosAtuais) || "—"}
                                  </p>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 w-full text-[10px]"
                                    title="Atualizar orçamentos"
                                    disabled={
                                      salvarFichaRapida.isPending ||
                                      orcamentosCompraSlotsIguais(orcamentosAtuais, orcamentosSalvos)
                                    }
                                    onClick={() => {
                                      const patch = {
                                        orcamentosCompraKg: orcamentosAtuais,
                                        precoCompraKg: precoCompraKgMedioFromSlots(orcamentosAtuais),
                                      };
                                      const p = buildPayload(
                                        rowToFichaForm(row, patch, produtosParaNome),
                                        row.ficha.id,
                                        produtosParaNome,
                                      );
                                      salvarFichaRapida.mutate(p as any);
                                    }}
                                  >
                                    <Save className="h-3 w-3 mr-1" />
                                    Salvar média
                                  </Button>
                                </>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <Input
                                    className="h-8 min-w-0 flex-1 px-2 text-xs"
                                    inputMode="decimal"
                                    value={precoCompraValue}
                                    onChange={(e) =>
                                      setCompraDraft((drafts) => ({ ...drafts, [row.ficha.id]: e.target.value }))
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key !== "Enter") return;
                                      if (precoCompraValue === precoCompraAtual) return;
                                      const patch = { custoCompraUn: precoCompraValue };
                                      const p = buildPayload(
                                        rowToFichaForm(row, patch, produtosParaNome),
                                        row.ficha.id,
                                        produtosParaNome,
                                      );
                                      salvarFichaRapida.mutate(p as any);
                                    }}
                                  />
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-8 w-8 shrink-0"
                                    title="Atualizar compra"
                                    disabled={salvarFichaRapida.isPending || precoCompraValue === precoCompraAtual}
                                    onClick={() => {
                                      const patch = { custoCompraUn: precoCompraValue };
                                      const p = buildPayload(
                                        rowToFichaForm(row, patch, produtosParaNome),
                                        row.ficha.id,
                                        produtosParaNome,
                                      );
                                      salvarFichaRapida.mutate(p as any);
                                    }}
                                  >
                                    <Save className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="align-top text-right whitespace-normal">
                          <div className="space-y-0.5 text-xs tabular-nums">
                            <p>
                              <span className="text-muted-foreground">Custo </span>
                              <span className="font-semibold">
                                {fmtMoney(
                                  row.ficha.unidadeVenda === "kg" && row.resultado.custoPorKg != null
                                    ? row.resultado.custoPorKg
                                    : row.resultado.custoPorUnidade,
                                )}
                              </span>
                              {row.ficha.unidadeVenda === "kg" ? (
                                <span className="text-[10px] text-muted-foreground"> /kg</span>
                              ) : null}
                            </p>
                            <p>
                              <span className="text-muted-foreground">Venda </span>
                              {fmtMoney(row.resultado.precoVendaReferencia)}
                              <span className="block text-[10px] text-muted-foreground font-normal">
                                média CA
                              </span>
                            </p>
                            <p>
                              <span className="text-muted-foreground">
                                {rotuloLucroPrejuizo(row.resultado.margemBruta)}{" "}
                              </span>
                              <span className={classeLucroPrejuizo(row.resultado.margemBruta)}>
                                {row.resultado.margemPct != null
                                  ? `${row.resultado.margemPct.toFixed(1)}%`
                                  : "—"}
                              </span>
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="align-top whitespace-normal">
                          {precosMargem.length > 0 ? (
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] leading-tight tabular-nums">
                              {precosMargem.map((p: { margemPct: number; precoVenda: number }) => (
                                <span key={p.margemPct} className="text-muted-foreground">
                                  <span className="font-medium text-foreground">{p.margemPct}%</span>{" "}
                                  {fmtMoney(p.precoVenda)}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="align-top text-right whitespace-normal">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              title="Copiar como nova ficha"
                              onClick={() =>
                                abrirCopiaFicha(row, setEditingId, setForm, setSimResult)
                              }
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              title="Editar ficha"
                              onClick={() => {
                                setEditingId(row.ficha.id);
                                setForm(
                                  rowToFichaForm(
                                    row,
                                    {
                                      etapasModoManual: inferirEtapasModoManualRow(
                                        row,
                                        modelosQuery.data?.modelos ?? [],
                                        modelosQuery.data?.mapaHora ?? null,
                                        produtosComercialQuery.data,
                                      ),
                                    },
                                    produtosComercialQuery.data,
                                  ),
                                );
                                setSimResult(row.resultado);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
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
              onSimular={() => {
                const p = buildPayload(form, undefined, produtosParaNome);
                if (!p.nome) {
                  toast.error("Informe o nome do produto ou vincule um SKU do Conta Azul.");
                  return;
                }
                simular.mutate(p as any);
              }}
              onSalvar={() => {
                const p = buildPayload(form, editingId ?? undefined, produtosParaNome);
                if (!p.nome) return toast.error("Informe o nome do produto ou vincule um SKU do Conta Azul.");
                const msg = mensagemErroAtivacaoFicha(form);
                if (msg) return toast.error(msg);
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
        onSimular={() => {
          const p = buildPayload(form, undefined, produtosParaNome);
          if (!p.nome) {
            toast.error("Informe o nome do produto ou vincule um SKU do Conta Azul.");
            return;
          }
          simular.mutate(p as any);
        }}
        onSalvar={() => {
          const p = buildPayload(form, editingId ?? undefined, produtosParaNome);
          if (!p.nome) return toast.error("Informe o nome do produto ou vincule um SKU do Conta Azul.");
          const msg = mensagemErroAtivacaoFicha(form);
          if (msg) return toast.error(msg);
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
              <TableHead className="text-right">Lucro / prejuízo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, 8).map((r) => (
              <TableRow key={r.ficha.id}>
                <TableCell>{r.ficha.nome}</TableCell>
                <TableCell className="text-xs">{LABEL_TIPO_FICHA_CUSTO_PRODUTO[r.ficha.tipo as TipoFichaCustoProduto]}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtMoney(r.resultado.custoPorUnidade)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtMoney(r.resultado.precoVendaReferencia)}
                </TableCell>
                <TableCell className={`text-right tabular-nums ${classeLucroPrejuizo(r.resultado.margemBruta)}`}>
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
