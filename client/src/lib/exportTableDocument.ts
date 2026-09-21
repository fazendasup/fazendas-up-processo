import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { downloadCsvUtf8Bom } from "@/lib/estoqueRelatorio";

export type ExportKpi = {
  label: string;
  value: string;
};

export type TableExportInput = {
  title: string;
  subtitle?: string;
  filename: string;
  headers: string[];
  rows: string[][];
  footers?: string[][];
  kpis?: ExportKpi[];
  orientation?: "portrait" | "landscape";
  separator?: ";" | ",";
};

function csvCell(v: string | number | null | undefined): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n\r;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function cellText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return String(v);
}

export function objectRowsToTable(
  rows: Record<string, unknown>[],
): { headers: string[]; body: string[][] } {
  if (rows.length === 0) return { headers: [], body: [] };
  const headers = Object.keys(rows[0] ?? {});
  const body = rows.map((row) => headers.map((h) => cellText(row[h])));
  return { headers, body };
}

export function downloadTableCsv(input: TableExportInput): void {
  const sep = input.separator ?? ";";
  const lines: string[] = [];
  if (input.kpis?.length) {
    lines.push(["KPI", "Valor"].map((c) => csvCell(c)).join(sep));
    for (const kpi of input.kpis) {
      lines.push([kpi.label, kpi.value].map((c) => csvCell(c)).join(sep));
    }
    lines.push("");
  }
  lines.push(input.headers.join(sep));
  lines.push(...input.rows.map((row) => row.map((c) => csvCell(c)).join(sep)));
  if (input.footers?.length) {
    lines.push(
      ...input.footers.map((row) => row.map((c) => csvCell(c)).join(sep)),
    );
  }
  const filename = input.filename.endsWith(".csv") ? input.filename : `${input.filename}.csv`;
  downloadCsvUtf8Bom(lines.join("\r\n"), filename);
}

function drawKpiCards(
  doc: jsPDF,
  kpis: ExportKpi[],
  startY: number,
  pageWidth: number,
): number {
  const marginX = 10;
  const gap = 3;
  const usable = pageWidth - marginX * 2;
  const n = Math.min(kpis.length, 4);
  if (n <= 0) return startY;
  const cardW = (usable - gap * (n - 1)) / n;
  const cardH = 18;
  let x = marginX;
  for (let i = 0; i < n; i++) {
    const kpi = kpis[i]!;
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(167, 243, 208);
    doc.roundedRect(x, startY, cardW, cardH, 2, 2, "FD");
    doc.setFontSize(6.5);
    doc.setTextColor(6, 95, 70);
    doc.setFont("helvetica", "bold");
    const labelLines = doc.splitTextToSize(kpi.label.toUpperCase(), cardW - 4);
    doc.text(labelLines.slice(0, 2), x + 2, startY + 4);
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.value, x + 2, startY + 14);
    x += cardW + gap;
  }
  return startY + cardH + 6;
}

export function downloadTablePdf(input: TableExportInput): void {
  const orientation =
    input.orientation ?? (input.headers.length > 6 ? "landscape" : "portrait");
  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20);
  doc.text(input.title, 14, 15);

  let startY = 20;
  if (input.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(90);
    const subtitleLines = doc.splitTextToSize(
      input.subtitle,
      orientation === "landscape" ? 260 : 180,
    );
    doc.text(subtitleLines, 14, 21);
    startY = 21 + subtitleLines.length * 4.5 + 2;
  }

  if (input.kpis?.length) {
    startY = drawKpiCards(doc, input.kpis, startY, pageWidth);
  }

  autoTable(doc, {
    head: [input.headers],
    body: input.rows,
    foot: input.footers,
    showFoot: input.footers?.length ? "lastPage" : "never",
    startY,
    styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
    headStyles: { fillColor: [241, 245, 249], textColor: 30, fontStyle: "bold" },
    footStyles: { fillColor: [236, 253, 245], textColor: 30, fontStyle: "bold" },
    theme: "grid",
    margin: { left: 10, right: 10 },
    columnStyles: {
      0: { cellWidth: "auto", halign: "left" },
    },
  });

  const filename = input.filename.endsWith(".pdf") ? input.filename : `${input.filename}.pdf`;
  doc.save(filename);
}

export function exportTableDocument(input: TableExportInput, format: "csv" | "pdf"): void {
  if (format === "csv") downloadTableCsv(input);
  else downloadTablePdf(input);
}

export function exportObjectRows(
  rows: Record<string, unknown>[],
  opts: {
    title: string;
    subtitle?: string;
    filename: string;
    format: "csv" | "pdf";
    orientation?: "portrait" | "landscape";
    /** Linhas de rodapé (ex.: totais), alinhadas às mesmas chaves do header. */
    footers?: Record<string, unknown>[];
    /** Cards de KPI no topo (espelha o layout da página no PDF/CSV). */
    kpis?: ExportKpi[];
  },
): void {
  const { headers, body } = objectRowsToTable(rows);
  if (body.length === 0) return;
  const footers = (opts.footers ?? []).map((row) =>
    headers.map((h) => cellText(row[h])),
  );
  exportTableDocument(
    {
      title: opts.title,
      subtitle: opts.subtitle,
      filename: opts.filename,
      headers,
      rows: body,
      footers: footers.length ? footers : undefined,
      kpis: opts.kpis,
      orientation: opts.orientation,
    },
    opts.format,
  );
}
