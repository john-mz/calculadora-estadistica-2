import { distinctCount, type Distribution } from "../domain/calculate";
import { EXAMPLE_NAME, exampleText } from "../domain/example";
import { formatBound, formatInteger, formatMeasure, formatOutput } from "../domain/format";
import { byteLength, parseInput, type ParsedInput } from "../domain/parse";
import { MAX_BYTES } from "../domain/limits";
import indicador from "../assets/indicador.svg";
import { BarChart, chartDataRows, OgiveChart, PieChart, PolygonChart } from "./charts";
import { downloadPdf } from "./pdf";
import { loadSession, saveSession } from "./session";
import { useEffect, useMemo, useState } from "react";

type Step = "input" | "preview" | "processing" | "results";
type ChartKind = "pastel" | "barras" | "poligono" | "ojiva";

const initial = loadSession();

export default function App() {
  const [text, setText] = useState(initial?.text ?? "");
  const [nameOverride, setNameOverride] = useState<string | null>(initial?.nameOverride ?? null);
  const [step, setStep] = useState<Step>(initial?.step === "results" ? "processing" : initial?.step === "preview" ? "preview" : "input");
  const [result, setResult] = useState<Distribution | null>(null);
  const [openSteps, setOpenSteps] = useState(() => window.matchMedia("(min-width: 801px)").matches);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 801px)");
    const sync = () => setOpenSteps(query.matches);
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  const [showAll, setShowAll] = useState(false);
  const [chart, setChart] = useState<ChartKind>("pastel");
  const [openData, setOpenData] = useState<ChartKind | null>("pastel");
  const [fileError, setFileError] = useState<string | null>(null);

  const parsed = useMemo(() => parseInput(text), [text]);
  const name = nameOverride ?? parsed.name;
  const blocked = blockReason(parsed);

  useEffect(() => {
    saveSession({ text, nameOverride, step: step === "processing" ? "results" : step });
  }, [text, nameOverride, step]);

  useEffect(() => {
    if (step !== "processing") return;
    const worker = new Worker(new URL("../worker/calc.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<Distribution>) => {
      setResult(event.data);
      setStep("results");
      worker.terminate();
    };
    worker.postMessage(parsed.values);
    return () => worker.terminate();
  }, [step, parsed.values]);

  function review() {
    if (blocked) return;
    setStep("preview");
  }

  return (
    <main className="app">
      <header>
        {step !== "input" ? (
          <button className="back" type="button" onClick={() => setStep(step === "results" ? "preview" : "input")}>
            <ChevronLeft />
            Volver
          </button>
        ) : null}
        <p className="product">Calculadora de distribución de frecuencias</p>
        <div className="progress">
          <p>{progressLabel(step)}</p>
          <span className="bar filled" />
          <span className={step === "input" ? "bar" : "bar filled"} />
        </div>
        <h1>{title(step)}</h1>
        {step === "processing" ? <p className="intro">Calculamos automáticamente los intervalos y las frecuencias.</p> : null}
      </header>

      {step === "input" ? (
        <InputScreen
          text={text}
          parsed={parsed}
          blocked={blocked}
          onText={(value) => {
            setText(value);
            setNameOverride(null);
            setFileError(null);
          }}
          fileError={fileError}
          onFileError={setFileError}
          onExample={() => {
            setText(exampleText());
            setNameOverride(EXAMPLE_NAME);
          }}
          onReview={review}
        />
      ) : null}

      {step === "preview" ? (
        <section className="section">
          <div className="table-card">
            <header>{name ? `${name} · primeras 5 filas` : "Primeras 5 filas"}</header>
            {parsed.values.slice(0, 5).map((value, index) => (
              <div className="preview-row" key={index}>
                <span>Fila {index + 1}</span>
                <strong>{formatBound(value.units / 10 ** value.decimals, value.decimals)}</strong>
              </div>
            ))}
          </div>
          <div className="row-actions">
            <button className="neutral" type="button" onClick={() => setStep("input")}>Corregir datos</button>
            <button className="primary" type="button" onClick={() => setStep("processing")}>Procesar datos</button>
          </div>
        </section>
      ) : null}

      {step === "processing" ? (
        <section className="status" aria-live="polite">
          <img src={indicador} width={64} height={64} alt="" />
          <strong>Calculando...</strong>
          <button className="primary" type="button" disabled>Procesando...</button>
        </section>
      ) : null}

      {step === "results" && result ? (
        <Results
          result={result}
          name={name}
          openSteps={openSteps}
          showAll={showAll}
          chart={chart}
          openData={openData}
          onToggleAll={() => setShowAll((value) => !value)}
          onChart={setChart}
          onToggleData={(kind) => setOpenData((current) => (current === kind ? null : kind))}
        />
      ) : null}
    </main>
  );
}

function InputScreen({
  text,
  parsed,
  blocked,
  onText,
  onExample,
  onReview,
  fileError,
  onFileError,
}: {
  text: string;
  parsed: ParsedInput;
  blocked: string | null;
  onText: (value: string) => void;
  onExample: () => void;
  onReview: () => void;
  fileError: string | null;
  onFileError: (message: string | null) => void;
}) {
  const messages = fileError ? [fileError] : errorMessages(parsed, blocked);
  return (
    <>
      <div className="field">
        <label htmlFor="datos">Datos numéricos</label>
        <p className="hint">Un número por línea. Para decimales, usa coma: 187,5</p>
        <textarea
          id="datos"
          className={messages.length ? "invalid" : undefined}
          value={text}
          aria-invalid={messages.length > 0}
          aria-describedby={messages.length ? "errores" : undefined}
          onChange={(event) => onText(event.target.value)}
        />
      </div>
      {messages.length ? (
        <p className="error" id="errores" role="alert">
          {messages.join(" ")}
        </p>
      ) : null}
      <label
        className="drop"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files[0];
          if (file) readFile(file, onText, onFileError);
        }}
      >
        <FileIcon />
        <strong>Arrastra aquí un CSV o selecciónalo</strong>
        <span>Una sola columna · separado por punto y coma · máximo 5 MB</span>
        <input
          className="file-input"
          type="file"
          accept=".csv,text/csv,text/plain"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            readFile(file, onText, onFileError);
          }}
        />
      </label>
      <div className="actions">
        <button className="link" type="button" onClick={onExample}>Usar ejemplo</button>
        <button className="primary" type="button" disabled={Boolean(blocked)} onClick={onReview}>Revisar datos</button>
      </div>
    </>
  );
}

function Results({
  result,
  name,
  openSteps,
  showAll,
  chart,
  openData,
  onToggleAll,
  onChart,
  onToggleData,
}: {
  result: Distribution;
  name: string;
  openSteps: boolean;
  showAll: boolean;
  chart: ChartKind;
  openData: ChartKind | null;
  onToggleAll: () => void;
  onChart: (kind: ChartKind) => void;
  onToggleData: (kind: ChartKind) => void;
}) {
  const visible = showAll ? result.classes : result.classes.slice(0, 3);
  const measure = (id: string) => result.measures.find((item) => item.id === id);
  const cards = [
    ["N", formatInteger(result.n)],
    ["Mínimo", formatMeasure(result.minimum, false, result.decimals)],
    ["Máximo", formatMeasure(result.maximum, false, result.decimals)],
    ["Mediana", formatMeasure(measure("median")?.value ?? 0, measure("median")?.interpolated ?? true, result.decimals)],
    ["Media", formatMeasure(measure("mean")?.value ?? 0, true, result.decimals)],
  ];
  return (
    <>
      <section className="section">
        <h2 className="only-desktop">Medidas de posición</h2>
        <h2 className="only-mobile">Resumen principal</h2>
        <div className="summary">
          {cards.map(([label, value]) => (
            <article className="measure" key={label}><span>{label}</span><strong>{value}</strong></article>
          ))}
        </div>
      </section>
      <section className="section">
        <h2 className="only-desktop">Cálculo paso a paso</h2>
        <h2 className="only-mobile">Cómo se calculó</h2>
        <details className="step" key={`sturges-${openSteps}`} open={openSteps}>
          <summary>Paso 1 · Teorema de Sturges — número de clases (k)</summary>
          <p className="note">El teorema de Sturges indica cuántos intervalos usar según el total de datos.</p>
          <div className="formula"><span>Fórmula</span><span>k = 1 + 3,322 × log10(n)</span></div>
          <div className="formula"><span>Con los valores</span><span>k = 1 + 3,322 × log10({formatInteger(result.n)})</span></div>
          <div className="formula"><span>Resultado</span><span>k = {formatOutput(result.rawK, 3)}</span></div>
          <div className="formula"><span>Redondeado al techo</span><span className="pill">k = {result.kSturges} intervalos</span></div>
        </details>
        <details className="step" key={`longitud-${openSteps}`} open={openSteps}>
          <summary>Paso 2 · Longitud del intervalo (L)</summary>
          <div className="formula"><span>Fórmula</span><span>L = (dato mayor − dato menor) / k</span></div>
          <div className="formula"><span>Resultado</span><span>L = {formatOutput(result.lengthRaw, Math.max(result.decimals + 3, 3))}</span></div>
          <div className="formula"><span>Redondeado</span><span className="pill">L = {formatBound(result.length, result.decimals)}</span></div>
        </details>
        <details className="step" key={`intervalos-${openSteps}`} open={openSteps}>
          <summary>Paso 3 · Cantidad de intervalos</summary>
          <table className="data-table">
            <thead><tr><th>Intervalo</th><th>Límite inferior</th><th>Límite superior</th></tr></thead>
            <tbody>
              {result.classes.map((row) => (
                <tr key={row.ci}>
                  <td>{row.ci}</td>
                  <td>{formatBound(row.lower, result.decimals)}</td>
                  <td>{formatBound(row.upper, result.decimals)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="note">Si el número máximo no aparece en el intervalo número k, se agrega otro intervalo.</p>
        </details>
        <details className="step" key={`medidas-${openSteps}`} open={openSteps}>
          <summary>Paso 4 · Medidas de posición y percentiles</summary>
          <table className="data-table">
            <thead><tr><th>Medida</th><th>Valor</th></tr></thead>
            <tbody>
              {result.measures.map((item) => (
                <tr key={item.id}>
                  <td>{item.label}</td>
                  <td>{formatMeasure(item.value, item.interpolated, result.decimals)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>
      <section className="section">
        <h2>Frecuencias</h2>
        <table className="data-table desktop-table">
          <thead>
            <tr><th>Ci</th><th>menor</th><th>mayor</th><th>fi</th><th>Fi</th><th>hi</th><th>Hi</th><th>Mi</th></tr>
          </thead>
          <tbody>
            {result.classes.map((row) => (
              <tr key={row.ci}>
                <td>{row.ci}</td>
                <td>{formatBound(row.lower, result.decimals)}</td>
                <td>{formatBound(row.upper, result.decimals)}</td>
                <td>{formatInteger(row.fi)}</td>
                <td>{formatInteger(row.Fi)}</td>
                <td>{formatOutput(row.hi)}</td>
                <td>{formatOutput(row.Hi)}</td>
                <td>{formatOutput(row.mi)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="freq-cards">
          {visible.map((row) => (
            <article className="freq-card" key={row.ci}>
              <strong>{formatBound(row.lower, result.decimals)}–{formatBound(row.upper, result.decimals)}</strong>
              <p>
                <span>fi {formatInteger(row.fi)}</span>
                <span>Fi {formatInteger(row.Fi)}</span>
                <span>hi {formatOutput(row.hi)}</span>
                <span>Hi {formatOutput(row.Hi)}</span>
              </p>
              <p className="mi">Mi {formatOutput(row.mi)}</p>
            </article>
          ))}
          {result.classes.length > 3 ? (
            <button className="neutral" type="button" onClick={onToggleAll}>
              {showAll ? "Ver menos" : `Ver los ${result.classes.length} intervalos`}
            </button>
          ) : null}
        </div>
      </section>
      <section className="section">
        <h2>Diagramas</h2>
        <div className="chart-switch">
          {(["pastel", "barras", "poligono", "ojiva"] as ChartKind[]).map((kind) => (
            <button key={kind} className="neutral" type="button" aria-pressed={chart === kind} onClick={() => onChart(kind)}>
              {chartLabel(kind)}
            </button>
          ))}
        </div>
        <div className="chart-grid">
          <ChartCard kind="pastel" active={chart === "pastel"} name={name} result={result} open={openData === "pastel"} onToggle={() => onToggleData("pastel")} />
          <ChartCard kind="barras" active={chart === "barras"} name={name} result={result} open={openData === "barras"} onToggle={() => onToggleData("barras")} />
          <ChartCard kind="poligono" active={chart === "poligono"} name={name} result={result} open={openData === "poligono"} onToggle={() => onToggleData("poligono")} />
          <ChartCard kind="ojiva" active={chart === "ojiva"} name={name} result={result} open={openData === "ojiva"} onToggle={() => onToggleData("ojiva")} />
        </div>
      </section>
      <button className="primary pdf-action" type="button" onClick={() => downloadPdf(result, name)}>Generar PDF</button>
    </>
  );
}

function ChartCard({
  kind,
  active,
  name,
  result,
  open,
  onToggle,
}: {
  kind: ChartKind;
  active: boolean;
  name: string;
  result: Distribution;
  open: boolean;
  onToggle: () => void;
}) {
  const rows = chartDataRows(result, kind);
  return (
    <article className={active ? "chart-card active" : "chart-card"}>
      <h3>Diagrama de {chartLabel(kind).toLowerCase()}</h3>
      {kind === "pastel" ? <PieChart result={result} title={name} /> : null}
      {kind === "barras" ? <BarChart result={result} title={name} /> : null}
      {kind === "poligono" ? <PolygonChart result={result} title={name} /> : null}
      {kind === "ojiva" ? <OgiveChart result={result} title={name} /> : null}
      <button className="link" type="button" aria-expanded={open} onClick={onToggle}>Ver datos</button>
      {open ? (
        <table className="data-table">
          <thead><tr><th>Ci</th><th>Valor</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.ci}><td>{row.ci} · {row.label}</td><td>{row.value}</td></tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </article>
  );
}

function ChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M10 12.5 5.5 8 10 3.5" fill="none" stroke="#1e1e1e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M8 4h10l6 6v18H8V4z" fill="none" stroke="#1e1e1e" strokeWidth="1.5" />
      <path d="M18 4v6h6" fill="none" stroke="#1e1e1e" strokeWidth="1.5" />
    </svg>
  );
}

function readFile(file: File, onText: (value: string) => void, onFileError: (message: string | null) => void) {
  if (file.size > MAX_BYTES) {
    onFileError("El archivo supera 5 MB. No se procesa.");
    return;
  }
  file.text().then((content) => {
    if (byteLength(content) > MAX_BYTES) {
      onFileError("El archivo supera 5 MB. No se procesa.");
      return;
    }
    onFileError(null);
    onText(content);
  });
}

function blockReason(parsed: ParsedInput): string | null {
  if (parsed.tooBig) return parsed.tooBig;
  if (parsed.issues.length) return parsed.issues.map((issue) => `Línea ${issue.line}: ${issue.message}`).join(" ");
  if (parsed.values.length < 2) return "Hacen falta al menos dos números.";
  if (distinctCount(parsed.values) < 2) return "El rango es cero y no se puede dividir la longitud entre un rango nulo.";
  return null;
}

function errorMessages(parsed: ParsedInput, blocked: string | null): string[] {
  if (parsed.tooBig) return [parsed.tooBig];
  if (parsed.issues.length) return parsed.issues.map((issue) => `Error en la línea ${issue.line}: ${issue.message}`);
  if (parsed.values.length > 0 && blocked) return [blocked];
  return [];
}

function progressLabel(step: Step): string {
  if (step === "input") return "Paso 1 de 3 · Introduce tus datos";
  if (step === "preview") return "Paso 2 de 3 · Confirma";
  if (step === "processing") return "Paso 3 de 3 · Calculando";
  return "Paso 3 de 3 · Resultados";
}

function title(step: Step): string {
  if (step === "input") return "Introduce tus datos";
  if (step === "preview") return "Confirma tus datos antes de calcular";
  if (step === "processing") return "Estamos organizando tus datos";
  return "Resultados";
}

function chartLabel(kind: ChartKind): string {
  if (kind === "pastel") return "Pastel";
  if (kind === "barras") return "Barras";
  if (kind === "poligono") return "Polígono";
  return "Ojiva";
}
