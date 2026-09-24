import { jsPDF } from "jspdf";
import type { Distribution } from "../domain/calculate";
import { formatBound, formatInteger, formatMeasure, formatOutput } from "../domain/format";
import { classColor } from "./palette";

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
    ["Pastel", drawPie(result)],
    ["Barras", drawBars(result)],
    ["Polígono", drawLine(result, "polygon")],
    ["Ojiva", drawLine(result, "ogive")],
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

function canvas(): { ctx: CanvasRenderingContext2D; el: HTMLCanvasElement } {
  const el = document.createElement("canvas");
  el.width = 800;
  el.height = 440;
  const ctx = el.getContext("2d");
  if (!ctx) throw new Error("No hay lienzo");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, el.width, el.height);
  ctx.font = "16px sans-serif";
  ctx.fillStyle = "#1e1e1e";
  return { ctx, el };
}

function drawPie(result: Distribution): string {
  const { ctx, el } = canvas();
  let angle = -Math.PI / 2;
  result.classes.forEach((row, index) => {
    const sweep = row.hi * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(220, 220);
    ctx.arc(220, 220, 150, angle, angle + sweep);
    ctx.closePath();
    ctx.fillStyle = classColor(index);
    ctx.fill();
    angle += sweep;
  });
  return el.toDataURL("image/png");
}

function drawBars(result: Distribution): string {
  const { ctx, el } = canvas();
  const max = Math.max(...result.classes.map((row) => row.hi), 0.01);
  result.classes.forEach((row, index) => {
    const height = (row.hi / max) * 300;
    ctx.fillStyle = classColor(index);
    ctx.fillRect(40 + index * 70, 380 - height, 48, height);
  });
  return el.toDataURL("image/png");
}

function drawLine(result: Distribution, kind: "polygon" | "ogive"): string {
  const { ctx, el } = canvas();
  const first = result.classes[0];
  const last = result.classes[result.classes.length - 1];
  const points =
    kind === "polygon"
      ? [
          { x: first.mi - result.length, y: 0 },
          ...result.classes.map((row) => ({ x: row.mi, y: row.hi })),
          { x: last.mi + result.length, y: 0 },
        ]
      : result.classes.map((row) => ({ x: row.mi, y: row.Hi }));
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const maxY = Math.max(...points.map((point) => point.y), 0.01);
  const sx = (value: number) => 40 + ((value - minX) / (maxX - minX || 1)) * 720;
  const sy = (value: number) => 40 + (1 - value / maxY) * 340;
  ctx.beginPath();
  points.forEach((point, index) => {
    const x = sx(point.x);
    const y = sy(point.y);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "#2c2c2c";
  ctx.lineWidth = 3;
  ctx.stroke();
  points.forEach((point, index) => {
    ctx.beginPath();
    ctx.arc(sx(point.x), sy(point.y), 6, 0, Math.PI * 2);
    ctx.fillStyle = index === 0 || index === points.length - 1 ? "#2c2c2c" : classColor(kind === "polygon" ? index - 1 : index);
    ctx.fill();
  });
  return el.toDataURL("image/png");
}
