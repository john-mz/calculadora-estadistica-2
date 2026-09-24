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
import { formatBound, formatOutput } from "../domain/format";

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

const SLICE_COLORS = ["#5B9BD5", "#C0504D", "#9BBB59", "#8064A2", "#4BACC6", "#F79646", "#1F4E79", "#833C0C"];
const SERIES = "#5B9BD5";

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
      <Bar data={barData(result)} options={barOptions(title)} />
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
  canvas.width = 900;
  canvas.height = 480;
  const chart = new ChartJS(canvas, configuration(result, title, kind));
  const url = chart.toBase64Image();
  chart.destroy();
  return url;
}

function configuration(result: Distribution, title: string, kind: ChartKind): ChartConfiguration {
  if (kind === "pastel") return { type: "pie", data: pieData(result), options: pieOptions(title) };
  if (kind === "barras") return { type: "bar", data: barData(result), options: barOptions(title) };
  return { type: "line", data: lineData(result, kind), options: lineOptions(title, kind, result) };
}

function pieData(result: Distribution) {
  return {
    labels: result.classes.map((row) => String(row.ci)),
    datasets: [{ data: result.classes.map((row) => row.hi), backgroundColor: result.classes.map((_, index) => sliceColor(index)), borderWidth: 1, borderColor: "#ffffff" }],
  };
}

function barData(result: Distribution) {
  return {
    labels: result.classes.map((row) => formatBound(row.mi, result.decimals)),
    datasets: [{ data: result.classes.map((row) => row.hi), backgroundColor: SERIES, borderWidth: 0 }],
  };
}

function lineData(result: Distribution, kind: "poligono" | "ojiva") {
  const first = result.classes[0];
  const points = kind === "poligono"
    ? [{ x: first.mi - result.length, y: 0 }, ...result.classes.map((row) => ({ x: row.mi, y: row.hi }))]
    : result.classes.map((row) => ({ x: row.mi, y: row.Hi }));
  const dataset: ChartDataset<"line", { x: number; y: number }[]> = {
    data: points,
    borderColor: SERIES,
    backgroundColor: SERIES,
    pointRadius: 4,
    pointHoverRadius: 5,
    tension: 0,
    borderWidth: 2,
  };
  return { datasets: [dataset] };
}

function pieOptions(title: string) {
  return {
    animation: motion ? false as const : undefined,
    plugins: {
      title: titlePlugin(title),
      legend: { position: "right" as const, labels: { boxWidth: 14, color: "#595959", font: { size: 13 } } },
      datalabels: {
        color: "#ffffff",
        backgroundColor: "#3a3a3a",
        borderRadius: 2,
        padding: 4,
        font: { weight: "bold" as const, size: 11 },
        formatter: (value: number) => percent(value),
      },
      tooltip: { callbacks: { label: (item: { raw: unknown }) => percent(Number(item.raw)) } },
    },
  };
}

function barOptions(title: string) {
  return {
    animation: motion ? false as const : undefined,
    layout: { padding: { top: 24 } },
    plugins: {
      title: titlePlugin(title),
      legend: { display: false },
      datalabels: {
        anchor: "end" as const,
        align: "end" as const,
        color: "#404040",
        font: { weight: "bold" as const, size: 12 },
        formatter: (value: number) => percent(value),
      },
      tooltip: { callbacks: { label: (item: { raw: unknown }) => percent(Number(item.raw)) } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: "#595959" } },
      y: { display: false, grace: "15%" },
    },
  };
}

function lineOptions(title: string, kind: "poligono" | "ojiva", result: Distribution) {
  const values = kind === "poligono" ? result.classes.map((row) => row.hi) : result.classes.map((row) => row.Hi);
  const max = kind === "ojiva" ? Math.max(1.2, Math.max(...values)) : niceMax(Math.max(...values));
  const step = kind === "ojiva" ? 0.2 : 0.05;
  return {
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
        color: "#404040",
        font: { size: 11 },
        formatter: (value: { y: number }) => percent(value.y),
      },
      tooltip: { callbacks: { label: (item: { raw: unknown }) => percent((item.raw as { y: number }).y) } },
    },
    scales: {
      x: { type: "linear" as const, grid: { color: "#d9d9d9" }, ticks: { color: "#595959" } },
      y: {
        min: 0,
        max,
        grid: { color: "#d9d9d9" },
        ticks: { color: "#595959", stepSize: step, callback: (value: string | number) => percent(Number(value)) },
      },
    },
  };
}

function titlePlugin(title: string) {
  return {
    display: title.length > 0,
    text: title,
    color: "#595959",
    font: { size: title.length > 40 ? 16 : 22, weight: "normal" as const },
    padding: { bottom: 12 },
  };
}

function sliceColor(index: number): string {
  return SLICE_COLORS[index % SLICE_COLORS.length];
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

export function chartDataRows(result: Distribution, kind: ChartKind) {
  return result.classes.map((row) => ({
    ci: row.ci,
    label: intervalLabel(row, result.decimals),
    value: kind === "pastel" || kind === "barras" ? formatOutput(row.hi) : kind === "poligono" ? `${formatOutput(row.mi)} · ${formatOutput(row.hi)}` : `${formatOutput(row.mi)} · ${formatOutput(row.Hi)}`,
  }));
}
