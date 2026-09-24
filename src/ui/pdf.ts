import { jsPDF } from "jspdf";
import type { Distribution } from "../domain/calculate";
import { formatBound, formatInteger, formatMeasure, formatOutput } from "../domain/format";
import { renderChartImage } from "./charts";

const INK = [30, 30, 30] as const;
const MUTED = [117, 117, 117] as const;
const PAPER = [245, 245, 245] as const;
const LINE = [217, 217, 217] as const;
const BRAND = [44, 44, 44] as const;

export function downloadPdf(result: Distribution, name: string): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const width = pageWidth - margin * 2;
  let y = drawHeader(doc, name, pageWidth);

  y = sectionTitle(doc, "Medidas de posición", margin, y);
  y = drawMeasures(doc, result, margin, y, width);
  y += 18;
  y = sectionTitle(doc, "Tabla de frecuencias", margin, y);
  y = drawFrequencyTable(doc, result, margin, y, width, pageHeight);

  const charts = [
    ["Pastel", renderChartImage(result, name, "pastel")],
    ["Barras", renderChartImage(result, name, "barras")],
    ["Polígono", renderChartImage(result, name, "poligono")],
    ["Ojiva", renderChartImage(result, name, "ojiva")],
  ] as const;
  charts.forEach(([label, url], index) => {
    if (index % 2 === 0) {
      doc.addPage();
      y = margin;
    }
    y = sectionTitle(doc, `Diagrama de ${label.toLowerCase()}`, margin, y);
    const imageHeight = width * (640 / 1200);
    doc.addImage(url, "PNG", margin, y, width, imageHeight);
    y += imageHeight + 22;
  });

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(`${page} / ${pages}`, pageWidth - margin, pageHeight - 20, { align: "right" });
  }
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName(name)}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function drawHeader(doc: jsPDF, name: string, pageWidth: number): number {
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageWidth, 78, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(name.trim() || "Distribución de frecuencias", 36, 36, { maxWidth: pageWidth - 72 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Generado el ${new Date().toLocaleDateString("es-ES")}`, 36, 58);
  return 102;
}

function sectionTitle(doc: jsPDF, title: string, x: number, y: number): number {
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(title, x, y);
  return y + 16;
}

function drawMeasures(doc: jsPDF, result: Distribution, x: number, y: number, width: number): number {
  const columnWidth = width / 2;
  const rowHeight = 22;
  result.measures.forEach((measure, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const left = x + column * columnWidth;
    const top = y + row * rowHeight;
    if (row % 2 === 0) {
      doc.setFillColor(...PAPER);
      doc.rect(left, top, columnWidth, rowHeight, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(measure.label, left + 8, top + 14);
    doc.setTextColor(...INK);
    doc.setFont("helvetica", "bold");
    const value = formatMeasure(measure.value, measure.interpolated, result.decimals);
    doc.text(value, left + columnWidth - 8, top + 14, { align: "right" });
  });
  const rows = Math.ceil(result.measures.length / 2);
  doc.setDrawColor(...LINE);
  doc.rect(x, y, width, rows * rowHeight);
  return y + rows * rowHeight;
}

function drawFrequencyTable(
  doc: jsPDF,
  result: Distribution,
  x: number,
  y: number,
  width: number,
  pageHeight: number,
): number {
  const headers = ["Ci", "Menor", "Mayor", "fi", "Fi", "hi", "Hi", "Mi"];
  const weights = [0.7, 1.2, 1.2, 0.8, 0.8, 1.6, 1.6, 1.6];
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const columns = weights.map((weight) => (weight / total) * width);
  const rowHeight = 18;

  const paintHeader = (top: number) => {
    doc.setFillColor(...BRAND);
    doc.rect(x, top, width, rowHeight, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    let cursor = x;
    headers.forEach((header, index) => {
      doc.text(header, cursor + columns[index] / 2, top + 12, { align: "center" });
      cursor += columns[index];
    });
  };

  paintHeader(y);
  y += rowHeight;
  result.classes.forEach((row, index) => {
    if (y + rowHeight > pageHeight - 36) {
      doc.addPage();
      y = 36;
      paintHeader(y);
      y += rowHeight;
    }
    if (index % 2 === 0) {
      doc.setFillColor(...PAPER);
      doc.rect(x, y, width, rowHeight, "F");
    }
    const cells = [
      String(row.ci),
      formatBound(row.lower, result.decimals),
      formatBound(row.upper, result.decimals),
      formatInteger(row.fi),
      formatInteger(row.Fi),
      formatOutput(row.hi),
      formatOutput(row.Hi),
      formatOutput(row.mi),
    ];
    doc.setTextColor(...INK);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    let cursor = x;
    cells.forEach((cell, cellIndex) => {
      doc.text(cell, cursor + columns[cellIndex] / 2, y + 12, { align: "center" });
      cursor += columns[cellIndex];
    });
    y += rowHeight;
  });
  doc.setDrawColor(...LINE);
  return y;
}

function fileName(name: string): string {
  const base = (name.trim() || "distribucion").replace(/[\\/:*?"<>|]+/g, "").slice(0, 80);
  return `${base}-frecuencias`;
}
