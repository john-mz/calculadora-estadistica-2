/** Colores presentes en el system design de Figma, en orden de aparición. */
export const CLASS_COLORS = ["#2c2c2c", "#757575", "#900b09", "#1e1e1e", "#d9d9d9"];

export function classColor(index: number): string {
  return CLASS_COLORS[index % CLASS_COLORS.length];
}
