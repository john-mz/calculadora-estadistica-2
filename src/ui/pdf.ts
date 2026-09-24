import { jsPDF } from "jspdf";
import type { Distribution } from "../domain/calculate";
import { formatBound, formatInteger, formatMeasure, formatOutput } from "../domain/format";
import { renderChartImage } from "./charts";

export function downloadPdf(result: Distribution, name: string): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = 48;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(16);
  doc.text(name || "Distribución de frecuencias", 40, y);
  y += 18;
  doc.setFontSize(10);
  doc.text(`Generado el ${new Date().toLocaleDateString("es-ES")}`, 40, y);
  y += 22;
  doc.text("Medidas de posición", 40, y);
  y += 16;
  result.measures.forEach((measure) => {
    doc.text(`${measure.label}: ${formatMeasure(measure.value, measure.interpolated, result.decimals)}`, 40, y);
    y += 14;
  });
  y += 10;
  doc.text("Tabla de frecuencias", 40, y);
  y += 16;
  result.classes.forEach((row) => {
    const line = `${row.ci}  ${formatBound(row.lower, result.decimals)}–${formatBound(row.upper, result.decimals)}  fi ${formatInteger(row.fi)}  Fi ${formatInteger(row.Fi)}  hi ${formatOutput(row.hi)}  Hi ${formatOutput(row.Hi)}  Mi ${formatOutput(row.mi)}`;
    doc.text(line, 40, y);
    y += 14;
    if (y > 780) {
      doc.addPage();
      y = 48;
    }
  });

  const images = [
    ["Pastel", renderChartImage(result, name, "pastel")],
    ["Barras", renderChartImage(result, name, "barras")],
    ["Polígono", renderChartImage(result, name, "poligono")],
    ["Ojiva", renderChartImage(result, name, "ojiva")],
  ] as const;
  images.forEach(([label, url], index) => {
    if (index % 2 === 0) doc.addPage();
    const top = index % 2 === 0 ? 40 : 430;
    doc.setFontSize(12);
    doc.text(label, 40, top);
    doc.addImage(url, "PNG", 40, top + 12, 500, 280);
  });
  doc.save(`${fileName(name)}.pdf`);
}

function fileName(name: string): string {
  const base = name.trim() || "distribucion";
  return `${base}-frecuencias`;
}
