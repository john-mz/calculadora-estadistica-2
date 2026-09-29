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
