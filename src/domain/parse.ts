import { MAX_BYTES, MAX_ROWS } from "./limits";

export type LineIssue = {
  line: number;
  message: string;
};

export type ParsedValue = {
  units: number;
  decimals: number;
};

export type ParsedInput = {
  name: string;
  values: ParsedValue[];
  issues: LineIssue[];
  tooBig: string | null;
};

const TOKEN =
  /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))?$/;

export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

export function parseInput(text: string): ParsedInput {
  if (byteLength(text) > MAX_BYTES) {
    return {
      name: "",
      values: [],
      issues: [],
      tooBig: "El archivo supera 5 MB. No se procesa.",
    };
  }

  const lines = text.split(/\r?\n/);
  const issues: LineIssue[] = [];
  const values: ParsedValue[] = [];
  let name = "";
  let sawContent = false;

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) return;
    const lineNumber = index + 1;
    const cells = line.split(";").map((cell) => cell.trim()).filter((cell) => cell.length > 0);
    if (cells.length > 1 && cells.some((cell) => !isNumericToken(cell))) {
      issues.push({
        line: lineNumber,
        message: `La fila ${lineNumber} tiene más de una columna.`,
      });
      return;
    }

    cells.forEach((cell) => {
      const parsed = parseCell(cell);
      if (parsed.kind === "number") {
        sawContent = true;
        values.push(parsed.value);
        return;
      }
      if (!sawContent && values.length === 0 && cells.length === 1 && parsed.kind === "text") {
        name = cell.trim();
        sawContent = true;
        return;
      }
      issues.push({
        line: lineNumber,
        message: parsed.kind === "bad-number" ? parsed.message : "Este valor no es un número.",
      });
    });
  });

  if (values.length > MAX_ROWS) {
    return {
      name,
      values: [],
      issues: [],
      tooBig: "Hay más de 100.000 números. No se procesa.",
    };
  }

  return { name, values, issues, tooBig: null };
}

function isNumericToken(cell: string): boolean {
  return parseCell(cell).kind === "number" || parseCell(cell).kind === "bad-number";
}

function parseCell(
  cell: string,
): { kind: "number"; value: ParsedValue } | { kind: "text" } | { kind: "bad-number"; message: string } {
  if (cell.startsWith("-") || cell.startsWith("−")) {
    return { kind: "bad-number", message: "Los negativos no se aceptan." };
  }
  if (TOKEN.test(cell)) {
    const match = TOKEN.exec(cell);
    const fraction = match?.[2] ?? "";
    const digits = cell.replace(/\./g, "").replace(",", "");
    return {
      kind: "number",
      value: { units: Number(digits), decimals: fraction.length },
    };
  }
  if (/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(cell)) {
    return { kind: "text" };
  }
  if (cell.includes(".") && !cell.includes(",")) {
    return {
      kind: "bad-number",
      message: "El decimal es la coma. Ejemplo: 1.234,5.",
    };
  }
  return {
    kind: "bad-number",
    message: "El punto de miles va en grupos de tres. Ejemplo: 1.234,5.",
  };
}

export function datasetDecimals(values: ParsedValue[]): number {
  return values.reduce((max, value) => Math.max(max, value.decimals), 0);
}

export function toUnits(value: ParsedValue, decimals: number): number {
  return value.units * 10 ** (decimals - value.decimals);
}

export function unitsToNumber(units: number, decimals: number): number {
  return units / 10 ** decimals;
}
