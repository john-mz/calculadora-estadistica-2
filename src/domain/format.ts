import { roundHalfAway } from "./calculate";

export function formatInteger(value: number): string {
  const sign = value < 0 ? "-" : "";
  const digits = Math.abs(Math.trunc(value)).toString();
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function formatDecimal(value: number, places: number, trim = false): string {
  const rounded = roundHalfAway(value, places);
  const sign = rounded < 0 ? "-" : "";
  const absolute = Math.abs(rounded);
  const factor = 10 ** places;
  const scaled = Math.round(absolute * factor + 1e-8);
  const whole = Math.floor(scaled / factor);
  const padded = places === 0 ? "" : (scaled % factor).toString().padStart(places, "0");
  const fraction = trim ? padded.replace(/0+$/, "") : padded;
  const body = fraction.length === 0 ? formatInteger(whole) : `${formatInteger(whole)},${fraction}`;
  return sign + body;
}

export function formatBound(value: number, decimals: number): string {
  return formatDecimal(value, decimals);
}

export function formatOutput(value: number, places = 4): string {
  return formatDecimal(value, places);
}

export function formatRelative(value: number): string {
  return formatDecimal(value, 4);
}

export function formatMark(value: number, decimals: number): string {
  return formatDecimal(value, decimals + 1, true);
}

export function formatLengthRaw(value: number, decimals: number): string {
  return formatDecimal(value, Math.min(4, Math.max(decimals + 3, 3)));
}

export function formatMeasure(value: number, interpolated: boolean, decimals: number): string {
  if (!interpolated) return formatBound(value, decimals);
  return formatDecimal(value, Math.min(decimals + 2, 4), true);
}

const SUPERSCRIPT: Record<string, string> = {
  "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
};

/** Coeficiente con 4 cifras significativas; notación científica si es muy pequeño o muy grande. */
export function formatCoefficient(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return "0";
  const absolute = Math.abs(value);
  const exponent = Math.floor(Math.log10(absolute));
  if (exponent < -4 || exponent >= 9) {
    const mantissa = value / 10 ** exponent;
    const power = String(exponent).split("").map((char) => SUPERSCRIPT[char]).join("");
    return `${formatDecimal(mantissa, 3, true)} × 10${power}`;
  }
  return formatDecimal(value, Math.max(0, 3 - exponent), true);
}

/** Término con signo para encadenar en una ecuación: « + 2,5x» o « − 2,5x». */
function signed(value: number, suffix: string): string {
  const sign = value < 0 ? "−" : "+";
  return ` ${sign} ${formatCoefficient(Math.abs(value))}${suffix}`;
}

export function formatEquation(id: string, coefficients: number[]): string {
  const [a, b, c = 0] = coefficients;
  const A = formatCoefficient(a);
  const B = formatCoefficient(b);
  if (id === "lineal") return `y = ${A}${signed(b, "x")}`;
  if (id === "exponencial") return `y = ${A} · e^(${B}x)`;
  if (id === "logaritmico") return `y = ${A}${signed(b, " · ln(x)")}`;
  if (id === "potencial") return `y = ${A} · x^(${B})`;
  return `y = ${A}${signed(b, "x")}${signed(c, "x²")}`;
}
