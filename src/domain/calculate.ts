import {
  datasetDecimals,
  toUnits,
  unitsToNumber,
  type ParsedValue,
} from "./parse";

export type FrequencyClass = {
  ci: number;
  lower: number;
  upper: number;
  fi: number;
  Fi: number;
  hi: number;
  Hi: number;
  mi: number;
};

export type PositionMeasure = {
  id: string;
  label: string;
  value: number;
  interpolated: boolean;
};

export type Distribution = {
  n: number;
  decimals: number;
  kSturges: number;
  k: number;
  rawK: number;
  lengthRaw: number;
  length: number;
  classes: FrequencyClass[];
  measures: PositionMeasure[];
  minimum: number;
  maximum: number;
  values: number[];
};

export function sturgesRaw(n: number): number {
  return 1 + 3.322 * Math.log10(n);
}

export function sturgesK(n: number): number {
  const raw = sturgesRaw(n);
  const nearest = Math.round(raw);
  if (Math.abs(raw - nearest) < 0.000000001) return nearest;
  return Math.ceil(raw - 1e-12);
}

export function roundHalfAway(value: number, places: number): number {
  const factor = 10 ** places;
  const scaled = value * factor;
  const sign = scaled < 0 ? -1 : 1;
  const rounded = Math.floor(Math.abs(scaled) + 0.5 + 1e-10);
  return (sign * rounded) / factor;
}

export function calculate(values: ParsedValue[]): Distribution {
  const decimals = datasetDecimals(values);
  const units = values.map((value) => toUnits(value, decimals));
  const numbers = units.map((unit) => unitsToNumber(unit, decimals));
  const n = numbers.length;
  const minimum = Math.min(...numbers);
  const maximum = Math.max(...numbers);
  const minUnits = Math.min(...units);
  const maxUnits = Math.max(...units);
  const kSturges = sturgesK(n);
  const rawK = sturgesRaw(n);
  const rangeUnits = maxUnits - minUnits;
  const lengthRaw = unitsToNumber(rangeUnits, decimals) / kSturges;
  const lengthUnits = roundHalfAway(rangeUnits / kSturges, 0);
  const length = unitsToNumber(lengthUnits, decimals);

  const bounds: { lower: number; upper: number }[] = [];
  const factor = 10 ** -decimals;
  const amplitude = decimals === 0 ? length : lengthRaw;
  let cursor = minimum;
  const pushBound = () => {
    const rawUpper = cursor + amplitude - factor;
    bounds.push({
      lower: roundHalfAway(cursor, decimals),
      upper: roundHalfAway(rawUpper, decimals),
    });
    cursor = rawUpper + factor;
  };
  for (let index = 0; index < kSturges; index += 1) pushBound();
  while (maximum > bounds[bounds.length - 1].upper) pushBound();

  const counts = bounds.map(() => 0);
  units.forEach((unit) => {
    const index = bounds.findIndex((bound) => unitsToNumber(unit, decimals) >= bound.lower && unitsToNumber(unit, decimals) <= bound.upper);
    if (index >= 0) counts[index] += 1;
  });

  let accumulated = 0;
  const classes: FrequencyClass[] = bounds.map((bound, index) => {
    const fi = counts[index];
    accumulated += fi;
    const lower = bound.lower;
    const upper = bound.upper;
    return {
      ci: index + 1,
      lower,
      upper,
      fi,
      Fi: accumulated,
      hi: fi / n,
      Hi: accumulated / n,
      mi: (lower + upper) / 2,
    };
  });

  const sorted = [...numbers].sort((a, b) => a - b);
  const measures: PositionMeasure[] = [
    measure("min", "Mínimo", minimum, false),
    percentileMeasure("p10", "Percentil 10 (P10)", sorted, 0.1),
    percentileMeasure("q1", "Cuartil 1 (Q1 / P25)", sorted, 0.25),
    percentileMeasure("median", "Mediana (Q2 / P50)", sorted, 0.5),
    percentileMeasure("q3", "Cuartil 3 (Q3 / P75)", sorted, 0.75),
    percentileMeasure("p90", "Percentil 90 (P90)", sorted, 0.9),
    measure("max", "Máximo", maximum, false),
    measure("mean", "Media aritmética", numbers.reduce((sum, value) => sum + value, 0) / n, true),
  ];

  return {
    n,
    decimals,
    kSturges,
    k: classes.length,
    rawK,
    lengthRaw,
    length,
    classes,
    measures,
    minimum,
    maximum,
    values: numbers,
  };
}

function measure(id: string, label: string, value: number, interpolated: boolean): PositionMeasure {
  return { id, label, value, interpolated };
}

function percentileMeasure(id: string, label: string, sorted: number[], p: number): PositionMeasure {
  const rank = 1 + (sorted.length - 1) * p;
  const nearest = Math.round(rank);
  const exact = Math.abs(rank - nearest) < 1e-9;
  if (exact) {
    return measure(id, label, sorted[nearest - 1], false);
  }
  const lower = Math.floor(rank);
  const fraction = rank - lower;
  const a = sorted[lower - 1];
  const b = sorted[lower];
  return measure(id, label, a + fraction * (b - a), true);
}

export function distinctCount(values: ParsedValue[]): number {
  const decimals = datasetDecimals(values);
  return new Set(values.map((value) => toUnits(value, decimals))).size;
}
