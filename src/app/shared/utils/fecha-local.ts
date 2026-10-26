/**
 * Fecha de hoy como `LocalDate` ISO (`"2026-03-15"`) según la hora **local** del
 * navegador. `new Date().toISOString().slice(0, 10)` devuelve el día en UTC: en
 * Argentina (UTC−3), desde las 21:00 ya sería "mañana" (CLAUDE.md, regla 2).
 */
export function hoyIso(): string {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}
