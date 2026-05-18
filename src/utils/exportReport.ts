import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export interface ReportColumn {
  key: string;
  label: string;
  format?: (val: any) => string;
}

export interface ExportOptions {
  title: string;
  subtitle?: string;
  columns: ReportColumn[];
  data: Record<string, any>[];
  filename: string;
  periodLabel?: string;
}

function formatValue(val: any, col: ReportColumn): string {
  if (col.format) return col.format(val);
  if (val === null || val === undefined) return "-";
  if (typeof val === "number") return val.toLocaleString();
  return String(val);
}

export function exportCSV({ columns, data, filename }: ExportOptions) {
  const header = columns.map(c => c.label).join(",");
  const rows = data.map(row =>
    columns.map(c => {
      const val = formatValue(row[c.key], c);
      return val.includes(",") ? `"${val}"` : val;
    }).join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportExcel({ columns, data, filename, title }: ExportOptions) {
  const wsData = [
    columns.map(c => c.label),
    ...data.map(row => columns.map(c => row[c.key] ?? "")),
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31));
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportPDF({ title, subtitle, columns, data, filename, periodLabel }: ExportOptions) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  if (subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(subtitle, 14, 28);
  }
  if (periodLabel) {
    doc.setFontSize(9);
    doc.text(`Period: ${periodLabel}`, 14, subtitle ? 34 : 28);
  }
  doc.setTextColor(0);

  autoTable(doc, {
    startY: subtitle ? 40 : 34,
    head: [columns.map(c => c.label)],
    body: data.map(row => columns.map(c => formatValue(row[c.key], c))),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 41, 59] },
  });

  doc.save(`${filename}.pdf`);
}

export function exportReport(format: "csv" | "excel" | "pdf", options: ExportOptions) {
  switch (format) {
    case "csv": return exportCSV(options);
    case "excel": return exportExcel(options);
    case "pdf": return exportPDF(options);
  }
}
