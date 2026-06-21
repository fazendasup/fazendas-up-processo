import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { downloadCsvUtf8Bom } from "@/lib/estoqueRelatorio";

export type TableExportInput = {
  title: string;
  subtitle?: string;
  filename: string;
  headers: string[];
  rows: string[][];
  footers?: string[][];
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
  const lines = [
    input.headers.join(sep),
    ...input.rows.map((row) => row.map((c) => csvCell(c)).join(sep)),
    ...(input.footers?.map((row) => row.map((c) => csvCell(c)).join(sep)) ?? []),
  ];
  const filename = input.filename.endsWith(".csv") ? input.filename : `${input.filename}.csv`;
  downloadCsvUtf8Bom(lines.join("\r\n"), filename);
}

export function downloadTablePdf(input: TableExportInput): void {
  const orientation =
    input.orientation ?? (input.headers.length > 6 ? "landscape" : "portrait");
  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });

  doc.setFontSize(14);
  doc.setTextColor(20);
  doc.text(input.title, 14, 15);

  let startY = 20;
  if (input.subtitle) {
    doc.setFontSize(9);
    doc.setTextColor(90);
    const subtitleLines = doc.splitTextToSize(input.subtitle, orientation === "landscape" ? 260 : 180);
    doc.text(subtitleLines, 14, 21);
    startY = 21 + subtitleLines.length * 4.5;
  }

  autoTable(doc, {
    head: [input.headers],
    body: input.rows,
    foot: input.footers,
    startY,
    styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
    headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: "bold" },
    footStyles: { fillColor: [245, 245, 245], textColor: 30, fontStyle: "bold" },
    theme: "grid",
    margin: { left: 10, right: 10 },
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
  },
): void {
  const { headers, body } = objectRowsToTable(rows);
  if (body.length === 0) return;
  exportTableDocument(
    {
      title: opts.title,
      subtitle: opts.subtitle,
      filename: opts.filename,
      headers,
      rows: body,
      orientation: opts.orientation,
    },
    opts.format,
  );
}
