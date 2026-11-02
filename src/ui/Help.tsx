import { useId, useRef, useState, type ReactNode } from "react";

const TIP_WIDTH = 288;
const MARGIN = 12;

export const HELP = {
  datos: "Son las mediciones que quieres analizar: por ejemplo, las edades de un grupo o las notas de un curso. Escribe un número por línea o sube un archivo CSV.",
  csv: "Un CSV es un archivo de texto con los datos separados por comas o punto y coma. Aquí debe tener una sola columna: un número en cada fila.",
  nombre: "Es el título que verás en los diagramas y en el PDF. Por ejemplo: «Edades del curso». Puedes dejar el que aparece.",
  total: "Cuántos datos escribiste en total. En estadística a esta cantidad se le llama n.",
  minimo: "El dato más pequeño de todo tu conjunto.",
  maximo: "El dato más grande de todo tu conjunto.",
  mediana: "El valor del medio: si ordenas los datos de menor a mayor, la mitad queda por debajo y la otra mitad por encima.",
  media: "El promedio: suma todos los datos y divide entre cuántos son. Resume el «valor típico» del conjunto.",
  medidas: "Son números que resumen tus datos y dicen dónde se ubican: el más pequeño, el más grande, el del medio y el promedio.",
  paso1: "Para organizar muchos datos se agrupan en intervalos (rangos como 10–20, 20–30…). Sturges es una fórmula que sugiere cuántos intervalos usar según cuántos datos tienes. «k» es esa cantidad y «n» el total de datos.",
  paso2: "La longitud (L) es el ancho de cada intervalo. Se obtiene dividiendo el rango de tus datos (el mayor menos el menor) entre el número de intervalos.",
  paso3: "Aquí ves los intervalos ya armados: desde qué valor empieza cada uno (límite inferior) y dónde termina (límite superior).",
  paso4: "Los percentiles dividen los datos ordenados en 100 partes. P10 deja el 10 % de los datos por debajo; el cuartil Q1 el 25 %; la mediana (Q2) el 50 %; Q3 el 75 % y P90 el 90 %.",
  frecuencias: "Esta tabla cuenta cuántos datos caen en cada intervalo. Ci: número del intervalo. fi: cuántos datos hay en él. Fi: cuántos hay hasta ese intervalo (acumulado). hi: la proporción del total (fi ÷ n). Hi: la proporción acumulada. Mi: el valor central del intervalo, llamado marca de clase.",
  diagramas: "Son gráficos que muestran cómo se reparten tus datos entre los intervalos, para entenderlos de un vistazo.",
  pastel: "Cada porción es un intervalo; cuanto más grande, mayor es el porcentaje de datos que contiene.",
  barras: "La altura de cada barra indica cuántos datos (fi) hay en cada intervalo.",
  poligono: "Une con una línea los puntos medios de las barras. Sirve para ver la forma de la distribución: dónde se concentran los datos.",
  ojiva: "Muestra cuántos datos se acumulan al avanzar de intervalo en intervalo. Siempre sube, hasta llegar al total.",
} as const;

export default function Help({ text, label = "Ayuda" }: { text: string; label?: string }) {
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; above: boolean } | null>(null);
  const [pinned, setPinned] = useState(false);

  function show() {
    const rect = button.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(TIP_WIDTH, window.innerWidth - MARGIN * 2);
    const center = rect.left + rect.width / 2 - width / 2;
    const left = Math.max(MARGIN, Math.min(center, window.innerWidth - width - MARGIN));
    const above = rect.bottom + 160 > window.innerHeight && rect.top > 160;
    setPos({ left, top: above ? rect.top - 8 : rect.bottom + 8, above });
  }

  function hide() {
    setPos(null);
    setPinned(false);
  }

  const tip: ReactNode = pos ? (
    <span
      id={id}
      role="tooltip"
      className={pos.above ? "tip above" : "tip"}
      style={{ left: pos.left, top: pos.top, width: Math.min(TIP_WIDTH, window.innerWidth - MARGIN * 2) }}
    >
      {text}
    </span>
  ) : null;

  return (
    <span className="help" onMouseEnter={show} onMouseLeave={() => !pinned && hide()}>
      <button
        ref={button}
        type="button"
        className="help-btn"
        aria-label={label}
        aria-describedby={pos ? id : undefined}
        onFocus={show}
        onBlur={hide}
        onKeyDown={(event) => event.key === "Escape" && hide()}
        onClick={(event) => {
          // Evita que el clic abra/cierre un <details> o active un <label> contenedor.
          event.preventDefault();
          event.stopPropagation();
          if (pinned) hide();
          else {
            show();
            setPinned(true);
          }
        }}
      >
        ?
      </button>
      {tip}
    </span>
  );
}
