import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  type ChartConfiguration,
  type ChartDataset,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { Bar, Line, Pie } from "react-chartjs-2";
import type { Distribution, FrequencyClass } from "../domain/calculate";
import { formatBound, formatCoefficient, formatDecimal, formatMark, formatRelative } from "../domain/format";
import { predict, type RegressionModel } from "../domain/regression";
import { ACCENT, BRAND, INK, LINE, MUTED, SURFACE, classColor } from "./palette";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels,
);

const FONT = 'Outfit, "Segoe UI", sans-serif';

type ChartProps = { result: Distribution; title: string };
type ChartKind = "pastel" | "barras" | "poligono" | "ojiva";

const motion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function PieChart({ result, title }: ChartProps) {
  return (
    <div className="chart-canvas" role="img" aria-label={alt(title, "pastel", result)}>
      <Pie data={pieData(result)} options={pieOptions(title)} />
    </div>
  );
}

export function BarChart({ result, title }: ChartProps) {
  return (
    <div className="chart-canvas" role="img" aria-label={alt(title, "barras", result)}>
      <Bar data={barData(result)} options={barOptions(title, result)} />
    </div>
  );
}

export function PolygonChart({ result, title }: ChartProps) {
  return (
    <div className="chart-canvas" role="img" aria-label={alt(title, "polígono", result)}>
      <Line data={lineData(result, "poligono")} options={lineOptions(title, "poligono", result)} />
    </div>
  );
}

export function OgiveChart({ result, title }: ChartProps) {
  return (
    <div className="chart-canvas" role="img" aria-label={alt(title, "ojiva", result)}>
      <Line data={lineData(result, "ojiva")} options={lineOptions(title, "ojiva", result)} />
    </div>
  );
}

export function renderChartImage(result: Distribution, title: string, kind: ChartKind): string {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 640;
  const config = configuration(result, title, kind);
  config.options = {
    ...config.options,
    responsive: false,
    animation: false,
    devicePixelRatio: 1,
  };
  const chart = new ChartJS(canvas, config);
  const url = chart.toBase64Image("image/png", 1);
  chart.destroy();
  return url;
}

function configuration(result: Distribution, title: string, kind: ChartKind): ChartConfiguration {
  if (kind === "pastel") return { type: "pie", data: pieData(result), options: pieOptions(title) };
  if (kind === "barras") return { type: "bar", data: barData(result), options: barOptions(title, result) };
  return { type: "line", data: lineData(result, kind), options: lineOptions(title, kind, result) };
}

function pieData(result: Distribution) {
  return {
    labels: result.classes.map((row) => intervalLabel(row, result.decimals)),
    datasets: [{ data: result.classes.map((row) => row.hi), backgroundColor: result.classes.map((_, index) => classColor(index)), borderWidth: 2, borderColor: SURFACE }],
  };
}

function barData(result: Distribution) {
  return {
    labels: result.classes.map((row) => formatMark(row.mi, result.decimals)),
    datasets: [{ label: "Frecuencia relativa (hi)", data: result.classes.map((row) => row.hi), backgroundColor: result.classes.map((_, index) => classColor(index)), borderWidth: 0 }],
  };
}

function lineData(result: Distribution, kind: "poligono" | "ojiva") {
  const first = result.classes[0];
  const points = kind === "poligono"
    ? [{ x: first.mi - result.length, y: 0 }, ...result.classes.map((row) => ({ x: row.mi, y: row.hi }))]
    : result.classes.map((row) => ({ x: row.mi, y: row.Hi }));
  // El punto extra en 0 del polígono toma el color de la primera clase.
  const offset = kind === "poligono" ? 1 : 0;
  const colors = points.map((_, index) => classColor(Math.max(0, index - offset)));
  const dataset: ChartDataset<"line", { x: number; y: number }[]> = {
    label: kind === "poligono" ? "Frecuencia relativa" : "Frecuencia relativa acumulada",
    data: points,
    borderColor: INK,
    backgroundColor: colors,
    pointBackgroundColor: colors,
    pointBorderColor: INK,
    pointBorderWidth: 1.5,
    pointRadius: 5,
    pointHoverRadius: 6,
    tension: 0,
    borderWidth: 2.5,
  };
  return { datasets: [dataset] };
}

function pieOptions(title: string) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: motion ? false as const : undefined,
    plugins: {
      title: titlePlugin(title),
      legend: {
        position: "bottom" as const,
        labels: { boxWidth: 14, padding: 12, color: MUTED, font: { family: FONT, size: 13 } },
        title: { display: true, text: "Rango de valores", color: MUTED, font: { family: FONT, size: 13, weight: "bold" as const }, padding: 6 },
      },
      datalabels: {
        color: SURFACE,
        backgroundColor: INK,
        borderRadius: 4,
        padding: 4,
        font: { family: FONT, weight: "bold" as const, size: 11 },
        formatter: (value: number) => percent(value),
      },
      tooltip: {
        backgroundColor: INK,
        titleColor: SURFACE,
        bodyColor: SURFACE,
        callbacks: { label: (item: { raw: unknown }) => percent(Number(item.raw)) },
      },
    },
  };
}

function barOptions(title: string, result: Distribution) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: motion ? false as const : undefined,
    layout: { padding: { top: 24 } },
    plugins: {
      title: titlePlugin(title),
      legend: {
        position: "bottom" as const,
        labels: {
          boxWidth: 14,
          padding: 12,
          color: MUTED,
          font: { family: FONT, size: 13 },
          generateLabels: () => result.classes.map((row, index) => ({
            text: intervalLabel(row, result.decimals),
            fillStyle: classColor(index),
            strokeStyle: classColor(index),
            lineWidth: 0,
          })),
        },
        title: { display: true, text: "Rango de valores", color: MUTED, font: { family: FONT, size: 13, weight: "bold" as const }, padding: 6 },
      },
      datalabels: {
        anchor: "end" as const,
        align: "end" as const,
        color: INK,
        font: { family: FONT, weight: "bold" as const, size: 12 },
        formatter: (value: number) => percent(value),
      },
      tooltip: {
        backgroundColor: INK,
        titleColor: SURFACE,
        bodyColor: SURFACE,
        callbacks: { label: (item: { raw: unknown }) => percent(Number(item.raw)) },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: MUTED, font: { family: FONT, size: 12 } } },
      y: { display: false, grace: "15%" },
    },
  };
}

function lineOptions(title: string, kind: "poligono" | "ojiva", result: Distribution) {
  const values = kind === "poligono" ? result.classes.map((row) => row.hi) : result.classes.map((row) => row.Hi);
  const max = kind === "ojiva" ? Math.max(1.2, Math.max(...values)) : niceMax(Math.max(...values));
  const step = kind === "ojiva" ? 0.2 : 0.05;
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: motion ? false as const : undefined,
    parsing: false as const,
    plugins: {
      title: titlePlugin(title),
      legend: { display: false },
      datalabels: {
        align: "top" as const,
        anchor: "end" as const,
        clamp: true,
        display: "auto" as const,
        color: INK,
        font: { family: FONT, size: 11 },
        formatter: (value: { y: number }) => percent(value.y),
      },
      tooltip: {
        backgroundColor: INK,
        titleColor: SURFACE,
        bodyColor: SURFACE,
        callbacks: { label: (item: { raw: unknown }) => percent((item.raw as { y: number }).y) },
      },
    },
    scales: {
      x: {
        type: "linear" as const,
        grid: { color: LINE },
        title: { display: true, text: title || "Valores", color: MUTED, font: { family: FONT, size: 12 } },
        ticks: {
          color: MUTED,
          font: { family: FONT, size: 12 },
          callback: (value: string | number) => formatMark(Number(value), result.decimals),
        },
      },
      y: {
        min: 0,
        max,
        grid: { color: LINE },
        title: { display: true, text: kind === "poligono" ? "Frecuencia relativa" : "Frecuencia relativa acumulada", color: MUTED, font: { family: FONT, size: 12 } },
        ticks: {
          color: MUTED,
          font: { family: FONT, size: 12 },
          stepSize: step,
          callback: (value: string | number) => percent(Number(value)),
        },
      },
    },
  };
}

function titlePlugin(title: string) {
  return {
    display: title.length > 0,
    text: title,
    color: INK,
    font: { family: FONT, size: title.length > 40 ? 16 : 22, weight: "normal" as const },
    padding: { bottom: 12 },
  };
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function niceMax(peak: number): number {
  const step = 0.05;
  const snapped = Math.ceil((peak - 1e-9) / step) * step;
  return Math.abs(peak - snapped) < 1e-9 ? snapped + step : snapped;
}

function intervalLabel(row: FrequencyClass, decimals: number): string {
  return `${formatBound(row.lower, decimals)} – ${formatBound(row.upper, decimals)}`;
}

function alt(title: string, kind: string, result: Distribution): string {
  const name = title ? `${title}. ` : "";
  return `${name}Diagrama de ${kind}. Los valores están en la tabla de frecuencias, ${result.k} intervalos.`;
}

/** Más puntos que esto vuelven lento el lienzo; se muestra una muestra uniforme. */
const MAX_SCATTER = 1500;
const CURVE_STEPS = 120;

export function RegressionChart({ values, model, title }: { values: number[]; model: RegressionModel; title: string }) {
  return (
    <div className="chart-canvas" role="img" aria-label={`${title ? `${title}. ` : ""}Diagrama de dispersión con el modelo ${model.label.toLowerCase()}.`}>
      <Line data={regressionData(values, model)} options={regressionOptions(title, values.length)} />
    </div>
  );
}

export function renderRegressionImage(values: number[], model: RegressionModel, title: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 640;
  const chart = new ChartJS(canvas, {
    type: "line",
    data: regressionData(values, model),
    options: { ...regressionOptions(title, values.length), responsive: false, animation: false, devicePixelRatio: 1 },
  });
  const url = chart.toBase64Image("image/png", 1);
  chart.destroy();
  return url;
}

function regressionData(values: number[], model: RegressionModel) {
  const stride = Math.max(1, Math.ceil(values.length / MAX_SCATTER));
  const points: { x: number; y: number }[] = [];
  for (let index = 0; index < values.length; index += stride) points.push({ x: index + 1, y: values[index] });
  const n = values.length;
  const curve = Array.from({ length: CURVE_STEPS + 1 }, (_, step) => {
    const x = 1 + ((n - 1) * step) / CURVE_STEPS;
    return { x, y: predict(model, x) };
  });
  const datasets: ChartDataset<"line", { x: number; y: number }[]>[] = [
    {
      label: "Datos",
      data: points,
      showLine: false,
      pointRadius: points.length > 300 ? 2 : 4,
      pointHoverRadius: 5,
      pointBackgroundColor: `${BRAND}99`,
      pointBorderColor: BRAND,
      pointBorderWidth: 1,
      backgroundColor: BRAND,
      borderColor: BRAND,
    },
    {
      label: `Modelo ${model.label.toLowerCase()}`,
      data: curve,
      pointRadius: 0,
      pointHoverRadius: 0,
      borderColor: ACCENT,
      backgroundColor: ACCENT,
      borderWidth: 3,
      tension: 0,
    },
  ];
  return { datasets };
}

function regressionOptions(title: string, n: number) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: motion ? false as const : undefined,
    parsing: false as const,
    interaction: { mode: "nearest" as const, intersect: false },
    plugins: {
      title: titlePlugin(title),
      datalabels: { display: false },
      legend: {
        position: "bottom" as const,
        labels: { boxWidth: 14, padding: 12, color: MUTED, font: { family: FONT, size: 13 } },
      },
      tooltip: {
        backgroundColor: INK,
        titleColor: SURFACE,
        bodyColor: SURFACE,
        callbacks: {
          title: (items: { raw: unknown }[]) => `Posición ${formatDecimal((items[0].raw as { x: number }).x, 1, true)}`,
          label: (item: { raw: unknown; dataset: { label?: string } }) => `${item.dataset.label}: ${formatCoefficient((item.raw as { y: number }).y)}`,
        },
      },
    },
    scales: {
      x: {
        type: "linear" as const,
        min: 1,
        max: Math.max(2, n),
        grid: { color: LINE },
        title: { display: true, text: "X · posición del dato", color: MUTED, font: { family: FONT, size: 12 } },
        ticks: { color: MUTED, font: { family: FONT, size: 12 }, callback: (value: string | number) => formatDecimal(Number(value), 0) },
      },
      y: {
        grid: { color: LINE },
        title: { display: true, text: title ? `Y · ${title}` : "Y · valor", color: MUTED, font: { family: FONT, size: 12 } },
        ticks: { color: MUTED, font: { family: FONT, size: 12 }, callback: (value: string | number) => formatCoefficient(Number(value)) },
      },
    },
  };
}

export function chartDataRows(result: Distribution, kind: ChartKind) {
  return result.classes.map((row) => ({
    ci: row.ci,
    label: intervalLabel(row, result.decimals),
    value: kind === "pastel" || kind === "barras" ? formatRelative(row.hi) : kind === "poligono" ? `${formatMark(row.mi, result.decimals)} · ${formatRelative(row.hi)}` : `${formatMark(row.mi, result.decimals)} · ${formatRelative(row.Hi)}`,
  }));
}
