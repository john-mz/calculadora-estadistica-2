/**
 * Identificación del modelo de regresión.
 *
 * X es la posición de cada dato en el orden en que se ingresó (1, 2, …, n) e Y es su valor.
 * Se ajustan cinco modelos por mínimos cuadrados y se elige el de mayor R² ajustado,
 * para no premiar al polinomio solo por tener un coeficiente más.
 */

export type ModelId = "lineal" | "exponencial" | "logaritmico" | "potencial" | "polinomico";

export type RegressionModel = {
  id: ModelId;
  label: string;
  /** Coeficientes en el orden de la ecuación: a, b y, en el polinomio, c. */
  coefficients: number[];
  /** R² medido sobre los valores originales de Y, para comparar modelos en la misma escala. */
  r2: number;
  /** R² penalizado por el número de coeficientes. */
  adjustedR2: number;
  applicable: true;
};

export type SkippedModel = {
  id: ModelId;
  label: string;
  reason: string;
  applicable: false;
};

export type Regression = {
  n: number;
  models: (RegressionModel | SkippedModel)[];
  best: ModelId | null;
  /** Coeficiente de correlación de Pearson entre X e Y. */
  r: number;
};

export const MODEL_LABELS: Record<ModelId, string> = {
  lineal: "Lineal",
  exponencial: "Exponencial",
  logaritmico: "Logarítmico",
  potencial: "Potencial",
  polinomico: "Polinómico (grado 2)",
};

/** Diferencias de R² ajustado menores que esto se consideran empate y gana el modelo más simple. */
const TIE = 1e-4;

export function predict(model: Pick<RegressionModel, "id" | "coefficients">, x: number): number {
  const [a, b, c = 0] = model.coefficients;
  switch (model.id) {
    case "lineal":
      return a + b * x;
    case "exponencial":
      return a * Math.exp(b * x);
    case "logaritmico":
      return a + b * Math.log(x);
    case "potencial":
      return a * x ** b;
    case "polinomico":
      return a + b * x + c * x * x;
  }
}

export function fitRegression(values: number[]): Regression {
  const n = values.length;
  const xs = values.map((_, index) => index + 1);
  const ys = values;
  const allPositive = ys.every((y) => y > 0);
  const notPositive = "Necesita que todos los valores sean mayores que 0.";

  const models: (RegressionModel | SkippedModel)[] = [];
  models.push(complete("lineal", linearFit(xs, ys), xs, ys, 2));
  models.push(
    allPositive
      ? complete("exponencial", expFit(xs, ys), xs, ys, 2)
      : skipped("exponencial", notPositive),
  );
  models.push(complete("logaritmico", linearFit(xs.map(Math.log), ys), xs, ys, 2));
  models.push(
    allPositive
      ? complete("potencial", powerFit(xs, ys), xs, ys, 2)
      : skipped("potencial", notPositive),
  );
  models.push(
    n >= 4
      ? complete("polinomico", quadraticFit(xs, ys), xs, ys, 3)
      : skipped("polinomico", "Necesita al menos 4 datos."),
  );

  return { n, models, best: pickBest(models), r: pearson(xs, ys) };
}

function pickBest(models: (RegressionModel | SkippedModel)[]): ModelId | null {
  let best: RegressionModel | null = null;
  for (const model of models) {
    if (!model.applicable || !Number.isFinite(model.adjustedR2)) continue;
    if (!best || model.adjustedR2 > best.adjustedR2 + TIE) best = model;
  }
  return best?.id ?? null;
}

function complete(
  id: ModelId,
  coefficients: number[],
  xs: number[],
  ys: number[],
  parameters: number,
): RegressionModel | SkippedModel {
  if (!coefficients.every(Number.isFinite)) return skipped(id, "No se pudo ajustar con estos datos.");
  const model = { id, coefficients };
  const mean = average(ys);
  let sse = 0;
  let sst = 0;
  for (let index = 0; index < xs.length; index += 1) {
    const residual = ys[index] - predict(model, xs[index]);
    sse += residual * residual;
    sst += (ys[index] - mean) ** 2;
  }
  const n = xs.length;
  const r2 = sst === 0 ? 1 : 1 - sse / sst;
  const freedom = n - parameters;
  const adjustedR2 = freedom > 0 ? 1 - ((1 - r2) * (n - 1)) / freedom : Number.NaN;
  return { id, label: MODEL_LABELS[id], coefficients, r2, adjustedR2, applicable: true };
}

function skipped(id: ModelId, reason: string): SkippedModel {
  return { id, label: MODEL_LABELS[id], reason, applicable: false };
}

/** Recta y = a + b·u por mínimos cuadrados. */
function linearFit(us: number[], ys: number[]): number[] {
  const mu = average(us);
  const my = average(ys);
  let sxy = 0;
  let sxx = 0;
  for (let index = 0; index < us.length; index += 1) {
    const du = us[index] - mu;
    sxy += du * (ys[index] - my);
    sxx += du * du;
  }
  const b = sxy / sxx;
  return [my - b * mu, b];
}

/** y = a·e^(b·x), linealizado como ln y = ln a + b·x. */
function expFit(xs: number[], ys: number[]): number[] {
  const [lnA, b] = linearFit(xs, ys.map(Math.log));
  return [Math.exp(lnA), b];
}

/** y = a·x^b, linealizado como ln y = ln a + b·ln x. */
function powerFit(xs: number[], ys: number[]): number[] {
  const [lnA, b] = linearFit(xs.map(Math.log), ys.map(Math.log));
  return [Math.exp(lnA), b];
}

/**
 * y = a + b·x + c·x². Se resuelve sobre x centrado y escalado (u = (x − m) / h)
 * para que las sumas de x⁴ no pierdan precisión con muchos datos, y luego se
 * devuelven los coeficientes en términos de x.
 */
function quadraticFit(xs: number[], ys: number[]): number[] {
  const m = average(xs);
  const h = Math.max(1, (xs[xs.length - 1] - xs[0]) / 2);
  const s = [0, 0, 0, 0, 0];
  const t = [0, 0, 0];
  for (let index = 0; index < xs.length; index += 1) {
    const u = (xs[index] - m) / h;
    let power = 1;
    for (let k = 0; k <= 4; k += 1) {
      s[k] += power;
      if (k <= 2) t[k] += power * ys[index];
      power *= u;
    }
  }
  const [c0, c1, c2] = solve3(
    [
      [s[0], s[1], s[2]],
      [s[1], s[2], s[3]],
      [s[2], s[3], s[4]],
    ],
    t,
  );
  // y = c0 + c1·(x − m)/h + c2·(x − m)²/h²
  const p = c1 / h;
  const q = c2 / (h * h);
  return [c0 - p * m + q * m * m, p - 2 * q * m, q];
}

/** Eliminación gaussiana con pivoteo parcial para un sistema 3×3. */
function solve3(matrix: number[][], vector: number[]): number[] {
  const a = matrix.map((row, index) => [...row, vector[index]]);
  for (let col = 0; col < 3; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < 3; row += 1) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    }
    [a[col], a[pivot]] = [a[pivot], a[col]];
    for (let row = col + 1; row < 3; row += 1) {
      const factor = a[row][col] / a[col][col];
      for (let k = col; k < 4; k += 1) a[row][k] -= factor * a[col][k];
    }
  }
  const result = [0, 0, 0];
  for (let row = 2; row >= 0; row -= 1) {
    let sum = a[row][3];
    for (let k = row + 1; k < 3; k += 1) sum -= a[row][k] * result[k];
    result[row] = sum / a[row][row];
  }
  return result;
}

function pearson(xs: number[], ys: number[]): number {
  const mx = average(xs);
  const my = average(ys);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let index = 0; index < xs.length; index += 1) {
    const dx = xs[index] - mx;
    const dy = ys[index] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  return syy === 0 ? 0 : sxy / Math.sqrt(sxx * syy);
}

function average(values: number[]): number {
  let sum = 0;
  for (const value of values) sum += value;
  return sum / values.length;
}

/** Califica la fuerza del ajuste según R². */
export function fitStrength(r2: number): string {
  if (r2 >= 0.9) return "Muy fuerte";
  if (r2 >= 0.7) return "Fuerte";
  if (r2 >= 0.5) return "Moderado";
  if (r2 >= 0.3) return "Débil";
  return "Muy débil";
}
