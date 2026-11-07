import { describe, expect, it } from "vitest";
import { calculate, distinctCount, sturgesK } from "./calculate";
import { EXAMPLE_NAME, PRICE_VALUES } from "./example";
import { formatLengthRaw, formatMark, formatMeasure, formatRelative } from "./format";
import { parseInput } from "./parse";

/** Conjunto de referencia original de unidades vendidas (antes era el ejemplo de la app). */
const UNITS_VALUES = [
  150, 80, 210, 95, 340, 120, 450, 60, 175, 230, 110, 290, 140, 310, 75, 190, 420, 130, 260, 85,
  380, 160, 220, 100, 300, 145, 70, 205, 350, 115, 410, 90, 185, 240, 125, 275, 65, 330, 155, 215,
  105, 390, 135, 250, 80, 320, 170, 200, 440, 95, 165, 235, 110, 285, 75, 315, 140, 205, 375, 125,
  430, 85, 190, 260, 100, 345, 150, 225, 70, 295, 120, 360, 180, 210, 90, 400, 130, 245, 105, 325,
  160, 220, 65, 280, 115, 355, 175, 200, 450, 95, 145, 230, 110, 305, 80, 335, 185, 215, 125, 395,
];

const UNITS_FI = [21, 20, 15, 13, 8, 10, 7, 6];
const PRICE_FI = [17, 14, 17, 18, 17, 7, 4, 5, 1];

describe("RF20", () => {
  it("calcula unidades vendidas con encabezado y sin él", () => {
    const withHeader = parseInput(["Unidades Vendidas", ...UNITS_VALUES].join("\n"));
    const withoutHeader = parseInput(UNITS_VALUES.join("\n"));

    expect(withHeader.name).toBe("Unidades Vendidas");
    expect(withHeader.issues).toEqual([]);
    expect(withoutHeader.name).toBe("");
    expect(withoutHeader.values).toHaveLength(100);

    for (const parsed of [withHeader, withoutHeader]) {
      const result = calculate(parsed.values);
      expect(result.n).toBe(100);
      expect(sturgesK(100)).toBe(8);
      expect(result.k).toBe(8);
      expect(result.length).toBe(49);
      expect(result.classes.map((row) => row.fi)).toEqual(UNITS_FI);
      expect(result.classes[0]).toMatchObject({ lower: 60, upper: 108, Fi: 21, mi: 84 });
      expect(result.classes[7]).toMatchObject({ lower: 403, upper: 451, Fi: 100, Hi: 1 });
      expect(result.minimum).toBe(60);
      expect(result.maximum).toBe(450);
      expect(measure(result, "p10")).toBeCloseTo(84.5, 10);
      expect(measure(result, "q1")).toBeCloseTo(115, 10);
      expect(measure(result, "median")).toBeCloseTo(187.5, 10);
      expect(measure(result, "q3")).toBeCloseTo(291.25, 10);
      expect(measure(result, "p90")).toBeCloseTo(375.5, 10);
      expect(measure(result, "mean")).toBeCloseTo(208.25, 10);
      expect(formatRelative(result.classes[0].hi)).toBe("0,2100");
      expect(formatRelative(result.classes[7].Hi)).toBe("1,0000");
      expect(formatMark(result.classes[0].mi, result.decimals)).toBe("84");
      expect(formatMeasure(84.5, true, 0)).toBe("84,5");
      expect(formatMeasure(208.25, true, 0)).toBe("208,25");
      expect(formatMeasure(60, false, 0)).toBe("60");
      expect(formatLengthRaw(result.lengthRaw, result.decimals)).toBe("48,750");
    }
  });

  it("calcula precios con un decimal y una clase extra", () => {
    const withHeader = parseInput(["Precio Unitario Promedio (USD)", ...PRICE_VALUES].join("\n"));
    const withoutHeader = parseInput(PRICE_VALUES.join("\n"));

    expect(withHeader.name).toBe("Precio Unitario Promedio (USD)");
    expect(withoutHeader.name).toBe("");

    for (const parsed of [withHeader, withoutHeader]) {
      const result = calculate(parsed.values);
      expect(result.decimals).toBe(1);
      expect(result.kSturges).toBe(8);
      expect(result.length).toBe(7);
      expect(result.k).toBe(9);
      expect(result.classes.map((row) => row.fi)).toEqual(PRICE_FI);
      expect(result.classes[0]).toMatchObject({ lower: 19.1, upper: 26, mi: 22.55 });
      expect(result.classes.map((row) => row.lower)).toEqual([19.1, 26.1, 33.2, 40.2, 47.2, 54.2, 61.3, 68.3, 75.3]);
      expect(result.classes.map((row) => row.upper)).toEqual([26, 33.1, 40.1, 47.1, 54.1, 61.2, 68.2, 75.2, 82.2]);
      expect(result.classes[8]).toMatchObject({ lower: 75.3, upper: 82.2, fi: 1, Hi: 1 });
      expect(result.minimum).toBeCloseTo(19.1, 10);
      expect(result.maximum).toBeCloseTo(75.3, 10);
      expect(measure(result, "p10")).toBeCloseTo(23.86, 10);
      expect(measure(result, "q1")).toBeCloseTo(30, 10);
      expect(measure(result, "median")).toBeCloseTo(41.05, 10);
      expect(measure(result, "q3")).toBeCloseTo(49.85, 10);
      expect(measure(result, "p90")).toBeCloseTo(60.6, 10);
      expect(measure(result, "mean")).toBeCloseTo(41.537, 10);
      expect(formatRelative(result.classes[0].hi)).toBe("0,1700");
      expect(formatMark(result.classes[0].mi, result.decimals)).toBe("22,55");
      expect(formatMeasure(measure(result, "p10"), true, result.decimals)).toBe("23,86");
      expect(formatMeasure(measure(result, "mean"), true, result.decimals)).toBe("41,537");
      expect(formatLengthRaw(result.lengthRaw, result.decimals)).toBe("7,0250");
    }
  });

  it("lee 38 junto a 45,5 como un decimal y rechaza el punto anglosajón", () => {
    const parsed = parseInput("38\n45,5");
    expect(parsed.issues).toEqual([]);
    const result = calculate(parsed.values);
    expect(result.decimals).toBe(1);
    expect(result.values[0]).toBeCloseTo(38, 10);

    const anglo = parseInput("1234.5");
    expect(anglo.issues[0]?.message).toContain("coma");
    expect(parseInput("1.234,5").values[0]?.units).toBe(12345);
    expect(parseInput("-3").issues[0]?.message).toContain("negativos");
  });

  it("exige dos valores distintos", () => {
    expect(distinctCount(parseInput("4\n4\n4").values)).toBe(1);
    expect(EXAMPLE_NAME).toBe("Unidades vendidas");
  });
});

function measure(result: ReturnType<typeof calculate>, id: string): number {
  return result.measures.find((item) => item.id === id)?.value ?? Number.NaN;
}
