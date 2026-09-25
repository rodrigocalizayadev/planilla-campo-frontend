/**
 * GET /api/lote-campanias/{id}/margen. **Corrección de shape (docs/plan-frontend.md
 * slice 3, segunda vuelta)**: todos los importes ahora vienen duplicados con sufijo
 * `Ars`/`Usd` — antes solo traía `Usd`. Todos string JSON (CLAUDE.md regla 1: todo
 * `BigDecimal` viaja como string, sin excepciones).
 *
 * `margenRealizadoUsd`/`Ars` y `margenEstimadoUsd`/`Ars` se muestran siempre los dos
 * (docs/design-brief.md §6.1); nunca ocultar el estimado ni darle el mismo tratamiento
 * visual que el realizado.
 *
 * Reglas de nulabilidad confirmadas contra el backend real (el campo se omite, no
 * llega como `0`):
 * - `margenEstimadoUsd` es `null` si el cultivo no tiene `precioReferencia` cargado
 *   (no se puede valorizar el stock/pendiente en ninguna moneda).
 * - `valorPendienteLiqArs`, `valorStockArs` y `margenEstimadoArs` son `null` si la
 *   campaña no tiene `cotizacionVigente` cargada — aunque el cultivo sí tenga precio
 *   de referencia, sin cotización no hay forma de expresar la valorización en pesos.
 *   `margenEstimadoUsd` sigue calculándose igual en ese caso (no depende de la
 *   cotización, ya está en dólares).
 *
 * `GET .../margen?cotizacionActual=1200` acepta un query param opcional que pisa
 * `Campania.cotizacionVigente` sin persistir nada, para simular "¿y si la cotización
 * estuviera a X?" sin editar la campaña.
 */
export interface Margen {
  ingresoRealizadoUsd: string;
  ingresoRealizadoArs: string;
  valorPendienteLiqUsd: string;
  valorPendienteLiqArs: string | null;
  valorStockUsd: string;
  valorStockArs: string | null;
  costoTotalUsd: string;
  costoTotalArs: string;
  margenRealizadoUsd: string;
  margenRealizadoArs: string;
  margenEstimadoUsd: string | null;
  margenEstimadoArs: string | null;
  tieneEstimaciones: boolean;
}
