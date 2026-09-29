/** Taller cromático: cobalto de marca, caléndula de acento y pigmentos de cada clase. */

export const INK = "#122033";
export const MUTED = "#3E5368";
export const PAPER = "#E7EEF8";
export const SURFACE = "#FFFCFA";
export const LINE = "#C5D2E4";
export const BRAND = "#0C4DDB";
export const ACCENT = "#C47E00";

export const CLASS_COLORS = [
  BRAND,
  ACCENT,
  "#0C9164",
  "#E23B6A",
  "#0F8AAB",
  "#E85D04",
  "#1B4332",
  "#9A3412",
] as const;

export function classColor(index: number): string {
  return CLASS_COLORS[index % CLASS_COLORS.length];
}

export const PDF_INK = [18, 32, 51] as const;
export const PDF_MUTED = [62, 83, 104] as const;
export const PDF_PAPER = [231, 238, 248] as const;
export const PDF_LINE = [197, 210, 228] as const;
export const PDF_BRAND = [12, 77, 219] as const;
