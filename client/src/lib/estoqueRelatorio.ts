// Relatórios e análises de inventário (cliente)

export type LinhaEstoqueExport = {
  id: number;
  categoria: string;
  nome: string;
  quantidadeTotal: number;
  unidadeTipo: string;
  nivelMinimo: number | null;
  usoPorEvento: number;
  frequenciaDias: number;
  prazoEntregaDias: number;
  diasMargemCompra: number;
  precoUnitario: number | null;
  fornecedor: string | null;
  observacoes: string | null;
  diasAteEsgotar: number | null;
  dataCompraSugeridaIso: string | null;
  dataEsgotamentoIso: string | null;
  status: string;
  valorLinha: number;
  consumoMedioDiario: number | null;
  sugestaoCompraQuantidade?: number;
  valorCompraSugerida?: number | null;
};

function csvCell(v: string | number | null | undefined): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const CSV_HEADERS = [
  "Categoria",
  "Nome",
  "Quantidade",
  "Unidade",
  "Nível mínimo",
  "Uso por evento",
  "Frequência (dias)",
  "Prazo entrega (dias)",
  "Margem compra (dias)",
  "Preço unitário (BRL)",
  "Fornecedor",
  "Dias até esgotar",
  "Data compra sugerida",
  "Quantidade sugerida compra",
  "Valor compra sugerida (BRL)",
  "Data esgotamento",
  "Status",
  "Valor linha (BRL)",
  "Consumo médio diário",
  "Observações",
] as const;

export function linhasParaCsv(rows: LinhaEstoqueExport[]): string {
  const lines: string[] = [CSV_HEADERS.join(";")];
  for (const r of rows) {
    lines.push(
      [
        csvCell(r.categoria),
        csvCell(r.nome),
        csvCell(r.quantidadeTotal),
        csvCell(r.unidadeTipo),
        csvCell(r.nivelMinimo),
        csvCell(r.usoPorEvento),
        csvCell(r.frequenciaDias),
        csvCell(r.prazoEntregaDias),
        csvCell(r.diasMargemCompra),
        csvCell(r.precoUnitario),
        csvCell(r.fornecedor),
        csvCell(r.diasAteEsgotar != null ? Math.round(r.diasAteEsgotar) : ""),
        csvCell(r.dataCompraSugeridaIso),
        csvCell(r.sugestaoCompraQuantidade ?? 0),
        csvCell(r.valorCompraSugerida),
        csvCell(r.dataEsgotamentoIso),
        csvCell(r.status),
        csvCell(r.valorLinha),
        csvCell(r.consumoMedioDiario),
        csvCell(r.observacoes),
      ].join(";"),
    );
  }
  return lines.join("\r\n");
}

export function downloadCsvUtf8Bom(content: string, filename: string): void {
  const bom = "\uFEFF";
  const blob = new Blob([bom + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Curva ABC pelo valor em linha (A ≈ 80% do valor acumulado, B ≈ 15%, C resto). */
export function mapaAbcPorValorLinha(
  rows: Array<{ id: number; valorLinha: number }>,
): Record<number, "A" | "B" | "C"> {
  const sorted = [...rows].sort((a, b) => b.valorLinha - a.valorLinha);
  const total = sorted.reduce((s, r) => s + Math.max(0, r.valorLinha), 0);
  const out: Record<number, "A" | "B" | "C"> = {};
  if (total <= 0) {
    for (const r of sorted) out[r.id] = "C";
    return out;
  }
  let cum = 0;
  for (const r of sorted) {
    cum += Math.max(0, r.valorLinha);
    const ratio = cum / total;
    out[r.id] = ratio <= 0.8 ? "A" : ratio <= 0.95 ? "B" : "C";
  }
  return out;
}

export type AgregadoFornecedor = { fornecedor: string; itens: number; valor: number };

export function agregarPorFornecedor(
  rows: Array<{ fornecedor: string | null; valorLinha: number }>,
): AgregadoFornecedor[] {
  const m = new Map<string, { itens: number; valor: number }>();
  for (const r of rows) {
    const key = (r.fornecedor ?? "").trim() || "(sem fornecedor)";
    const cur = m.get(key) ?? { itens: 0, valor: 0 };
    cur.itens += 1;
    cur.valor += r.valorLinha;
    m.set(key, cur);
  }
  return Array.from(m.entries())
    .map(([fornecedor, v]) => ({ fornecedor, itens: v.itens, valor: v.valor }))
    .sort((a, b) => b.valor - a.valor);
}

/** @returns false se o browser bloqueou a janela (pop-up). */
export function abrirImpressaoInventario(
  rows: LinhaEstoqueExport[],
  opts: { titulo: string; geradoEm: string; subtitulo?: string },
): boolean {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const head = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/><title>${esc(opts.titulo)}</title>
<style>
body{font-family:system-ui,sans-serif;font-size:11px;margin:16px;color:#111}
h1{font-size:18px;margin:0 0 4px}
.meta{color:#444;margin-bottom:16px;font-size:11px}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid #ccc;padding:4px 6px;text-align:left}
th{background:#f3f3f3;font-size:10px;text-transform:uppercase}
.num{text-align:right}
@media print{ body{margin:8px} }
</style></head><body>`;
  const bodyTop = `<h1>${esc(opts.titulo)}</h1><div class="meta">${esc(opts.geradoEm)}${opts.subtitulo ? ` · ${esc(opts.subtitulo)}` : ""}</div><table><thead><tr>
<th>Categoria</th><th>Item</th><th class="num">Saldo</th><th>Un</th><th class="num">Mín.</th><th class="num">Dias cob.</th><th>Compra sug.</th><th>Esgot.</th><th class="num">Valor</th><th>Status</th><th>Fornecedor</th>
</tr></thead><tbody>`;
  const bodyRows = rows
    .map((r) => {
      const dias = r.diasAteEsgotar != null ? String(Math.round(r.diasAteEsgotar)) : "—";
      const min = r.nivelMinimo != null ? String(r.nivelMinimo) : "—";
      const compraSug =
        r.dataCompraSugeridaIso || (r.sugestaoCompraQuantidade && r.sugestaoCompraQuantidade > 0)
          ? [
              r.dataCompraSugeridaIso ?? "",
              r.sugestaoCompraQuantidade && r.sugestaoCompraQuantidade > 0
                ? `${r.sugestaoCompraQuantidade} ${r.unidadeTipo}`
                : "",
            ]
              .filter(Boolean)
              .join(" · ")
          : "—";
      return `<tr>
<td>${esc(r.categoria)}</td><td>${esc(r.nome)}</td><td class="num">${esc(String(r.quantidadeTotal))}</td><td>${esc(r.unidadeTipo)}</td>
<td class="num">${esc(min)}</td><td class="num">${esc(dias)}</td><td>${esc(compraSug)}</td><td>${esc(r.dataEsgotamentoIso ?? "—")}</td>
<td class="num">${esc(String(r.valorLinha.toFixed(2)))}</td><td>${esc(r.status)}</td><td>${esc(r.fornecedor ?? "—")}</td>
</tr>`;
    })
    .join("");
  const foot = `</tbody></table><p style="margin-top:20px;font-size:10px;color:#666">Documento gerado pelo sistema — conferir quantidades fisicamente.</p></body></html>`;
  const w = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
  if (!w) return false;
  w.document.open();
  w.document.write(head + bodyTop + bodyRows + foot);
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
  }, 250);
  return true;
}
