import type { Distribution, FrequencyClass } from "../domain/calculate";
import { formatBound, formatOutput } from "../domain/format";
import { classColor } from "./palette";

type ChartProps = {
  result: Distribution;
  title: string;
};

export function PieChart({ result, title }: ChartProps) {
  const radius = 64;
  const cx = 160;
  const cy = title ? 108 : 88;
  let angle = -Math.PI / 2;
  const slices = result.classes.map((row) => {
    const sweep = row.hi * Math.PI * 2;
    const start = angle;
    angle += sweep;
    const large = sweep > Math.PI ? 1 : 0;
    const x1 = cx + radius * Math.cos(start);
    const y1 = cy + radius * Math.sin(start);
    const x2 = cx + radius * Math.cos(angle);
    const y2 = cy + radius * Math.sin(angle);
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`;
    return { path, color: classColor(row.ci - 1), row };
  });
  const legendTop = title ? 196 : 176;
  const height = legendTop + result.classes.length * 18 + 8;
  return (
    <svg viewBox={`0 0 320 ${height}`} role="img" aria-label={alt(title, "pastel", result)}>
      {title ? <text x="160" y="18" textAnchor="middle" fontSize={titleSize(title)}>{title}</text> : null}
      {slices.map((slice) => (
        <path key={slice.row.ci} d={slice.path} fill={slice.color} />
      ))}
      {result.classes.map((row, index) => (
        <g key={row.ci} transform={`translate(16,${legendTop + index * 18})`}>
          <rect width="12" height="12" fill={classColor(row.ci - 1)} />
          <text x="20" y="11" fontSize="12">{intervalLabel(row, result.decimals)} · {formatOutput(row.hi * 100, 2)} %</text>
        </g>
      ))}
    </svg>
  );
}

export function BarChart({ result, title }: ChartProps) {
  const width = 460;
  const height = 180;
  const max = Math.max(...result.classes.map((row) => row.hi), 0.01);
  const gap = 8;
  const barWidth = (width - 40) / result.classes.length - gap;
  return (
    <svg viewBox={`0 0 ${width + 20} ${height + 96}`} role="img" aria-label={alt(title, "barras", result)}>
      {title ? <text x={(width + 20) / 2} y="16" textAnchor="middle" fontSize={titleSize(title)}>{title}</text> : null}
      {result.classes.map((row, index) => {
        const barHeight = (row.hi / max) * (height - 36);
        const x = 24 + index * (barWidth + gap);
        const y = 28 + (height - 36 - barHeight);
        const label = intervalLabel(row, result.decimals);
        const lx = x + barWidth / 2;
        const ly = height + 12;
        return (
          <g key={row.ci}>
            <rect x={x} y={y} width={barWidth} height={barHeight} fill={classColor(index)} />
            <text x={lx} y={ly} textAnchor="end" fontSize="10" transform={`rotate(-55 ${lx} ${ly})`}>
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function PolygonChart({ result, title }: ChartProps) {
  const points = polygonPoints(result);
  return <LineChart title={title} result={result} points={points} kind="polígono" />;
}

export function OgiveChart({ result, title }: ChartProps) {
  const points = result.classes.map((row) => ({ x: row.mi, y: row.Hi, color: classColor(row.ci - 1) }));
  return <LineChart title={title} result={result} points={points} kind="ojiva" />;
}

function polygonPoints(result: Distribution) {
  const first = result.classes[0];
  const last = result.classes[result.classes.length - 1];
  const line = "#2c2c2c";
  return [
    { x: first.mi - result.length, y: 0, color: line },
    ...result.classes.map((row) => ({ x: row.mi, y: row.hi, color: classColor(row.ci - 1) })),
    { x: last.mi + result.length, y: 0, color: line },
  ];
}

function LineChart({
  title,
  result,
  points,
  kind,
}: {
  title: string;
  result: Distribution;
  points: { x: number; y: number; color: string }[];
  kind: string;
}) {
  const width = 460;
  const height = 180;
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const maxY = Math.max(...points.map((point) => point.y), 0.01);
  const sx = (value: number) => 36 + ((value - minX) / (maxX - minX || 1)) * (width - 48);
  const sy = (value: number) => 24 + (1 - value / maxY) * (height - 40);
  const d = points.map((point, index) => `${index === 0 ? "M" : "L"} ${sx(point.x)} ${sy(point.y)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={alt(title, kind, result)}>
      {title ? <text x={width / 2} y="14" textAnchor="middle" fontSize={titleSize(title)}>{title}</text> : null}
      <path d={d} fill="none" stroke="#2c2c2c" strokeWidth="2" />
      {points.map((point, index) => (
        <circle key={`${point.x}-${index}`} cx={sx(point.x)} cy={sy(point.y)} r="4" fill={point.color} />
      ))}
    </svg>
  );
}

function intervalLabel(row: FrequencyClass, decimals: number): string {
  return `${formatBound(row.lower, decimals)} – ${formatBound(row.upper, decimals)}`;
}

function titleSize(title: string): number {
  if (title.length > 60) return 11;
  if (title.length > 40) return 13;
  return 16;
}

function alt(title: string, kind: string, result: Distribution): string {
  const name = title ? `${title}. ` : "";
  return `${name}Diagrama de ${kind}. Los valores están en la tabla de frecuencias, ${result.k} intervalos.`;
}

export function chartDataRows(result: Distribution, kind: "pastel" | "barras" | "poligono" | "ojiva") {
  return result.classes.map((row) => ({
    ci: row.ci,
    label: intervalLabel(row, result.decimals),
    value:
      kind === "pastel" || kind === "barras"
        ? formatOutput(row.hi)
        : kind === "poligono"
          ? `${formatOutput(row.mi)} · ${formatOutput(row.hi)}`
          : `${formatOutput(row.mi)} · ${formatOutput(row.Hi)}`,
  }));
}
