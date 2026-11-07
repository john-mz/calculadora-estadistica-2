import { describe, expect, it } from "vitest";
import { calculate } from "./calculate";
import { EXAMPLE_VALUES } from "./example";
import { formatCoefficient, formatEquation } from "./format";
import { parseInput } from "./parse";
import { fitRegression, type RegressionModel } from "./regression";

function model(values: number[], id: string): RegressionModel {
  const found = fitRegression(values).models.find((item) => item.id === id);
  if (!found?.applicable) throw new Error(`${id} no aplica`);
  return found;
}

const xs = (n: number) => Array.from({ length: n }, (_, index) => index + 1);

describe("modelo de regresión", () => {
  it("identifica una recta exacta", () => {
    const values = xs(10).map((x) => 3 + 2 * x);
    const result = fitRegression(values);
    expect(result.best).toBe("lineal");
    const lineal = model(values, "lineal");
    expect(lineal.coefficients[0]).toBeCloseTo(3, 10);
    expect(lineal.coefficients[1]).toBeCloseTo(2, 10);
    expect(lineal.r2).toBeCloseTo(1, 10);
    expect(result.r).toBeCloseTo(1, 10);
  });

  it("identifica un crecimiento exponencial", () => {
    const values = xs(12).map((x) => 5 * Math.exp(0.3 * x));
    expect(fitRegression(values).best).toBe("exponencial");
    const exp = model(values, "exponencial");
    expect(exp.coefficients[0]).toBeCloseTo(5, 8);
    expect(exp.coefficients[1]).toBeCloseTo(0.3, 10);
  });

  it("identifica un modelo logarítmico", () => {
    const values = xs(30).map((x) => 10 + 4 * Math.log(x));
    expect(fitRegression(values).best).toBe("logaritmico");
  });

  it("identifica un modelo potencial", () => {
    const values = xs(20).map((x) => 2 * x ** 1.5);
    expect(fitRegression(values).best).toBe("potencial");
    expect(model(values, "potencial").coefficients[1]).toBeCloseTo(1.5, 10);
  });

  it("identifica una parábola y conserva precisión con muchos datos", () => {
    const values = xs(50_000).map((x) => 7 - 0.002 * x + 0.0000003 * x * x + 1000);
    expect(fitRegression(values).best).toBe("polinomico");
    const [a, b, c] = model(values, "polinomico").coefficients;
    expect(a).toBeCloseTo(1007, 4);
    expect(b).toBeCloseTo(-0.002, 8);
    expect(c).toBeCloseTo(0.0000003, 12);
  });

  it("descarta exponencial y potencial si hay ceros", () => {
    const result = fitRegression([0, 2, 4, 7, 8]);
    expect(result.models.find((item) => item.id === "exponencial")?.applicable).toBe(false);
    expect(result.models.find((item) => item.id === "potencial")?.applicable).toBe(false);
  });

  it("no elige modelo con solo dos datos", () => {
    expect(fitRegression([1, 5]).best).toBeNull();
  });

  it("el ejemplo de la app se identifica como exponencial creciente", () => {
    const result = calculate(parseInput(EXAMPLE_VALUES.join("\n")).values);
    expect(result.regression.n).toBe(100);
    expect(result.regression.best).toBe("exponencial");
    const exp = model(result.values, "exponencial");
    expect(exp.coefficients[1]).toBeGreaterThan(0);
    expect(exp.r2).toBeGreaterThan(0.99);
  });

  it("formatea coeficientes y ecuaciones", () => {
    expect(formatCoefficient(1234.5678)).toBe("1.235");
    expect(formatCoefficient(208.25)).toBe("208,3");
    expect(formatCoefficient(0.0012345)).toBe("0,001235");
    expect(formatCoefficient(0.00001234)).toBe("1,234 × 10⁻⁵");
    expect(formatEquation("lineal", [3, -2])).toBe("y = 3 − 2x");
    expect(formatEquation("polinomico", [1, 0.5, -0.25])).toBe("y = 1 + 0,5x − 0,25x²");
  });
});
