/**
 * Sugerencia de plural en español para autocompletar `Cultivo.nombrePlural` a partir
 * de la etiqueta del enum `unidadProduccion` (ej. "Bolsa" → "Bolsas", "Bin" → "Bines").
 * Es solo un punto de partida editable, no una regla gramatical completa: las
 * abreviaturas cortas ("kg", "tn") son invariantes y se detectan por longitud; una
 * etiqueta que ya termina en "s" (el backend real devuelve "Kilogramos", ya en plural)
 * se deja sin tocar en vez de sumarle "es".
 */
export function pluralizar(singular: string): string {
  const valor = singular.trim();
  if (!valor || valor.length <= 2) {
    return valor;
  }
  const ultima = valor.at(-1)!.toLowerCase();
  if (ultima === 's') {
    return valor;
  }
  if (ultima === 'z') {
    return `${valor.slice(0, -1)}ces`;
  }
  if ('aeiou'.includes(ultima)) {
    return `${valor}s`;
  }
  return `${valor}es`;
}
