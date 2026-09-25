/**
 * Clase CSS para un importe según su signo, usando los tres estados semánticos
 * reservados en shared/styles/_tokens.scss (docs/design-brief.md §4, §6.1).
 * `monto` es el resultado ya parseado solo para elegir color, nunca para recalcularlo.
 */
export function claseSigno(monto: number): 'valor-positivo' | 'valor-negativo' {
  return monto >= 0 ? 'valor-positivo' : 'valor-negativo';
}
