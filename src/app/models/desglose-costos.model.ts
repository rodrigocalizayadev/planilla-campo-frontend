/**
 * GET /api/lote-campanias/{id}/costos. **Corrección de shape (docs/plan-frontend.md
 * slice 3, segunda vuelta)**: todos los importes ahora vienen duplicados con sufijo
 * `Ars`/`Usd` — antes solo traía `Usd`. Los campos sin sufijo (`pctInsumos`,
 * `pctManoObra`, `pctLaborYServicios`, `pctIndirectos`, `superficieSembradaHa`,
 * `rendimientoPorHa`, `tasaDescarte`) no son plata, no se duplican. Todos son string
 * JSON (CLAUDE.md regla 1: todo `BigDecimal` viaja como string, sin excepciones).
 *
 * `costoPorUnidadArs`/`Usd`, `rendimientoPorHa` y `tasaDescarte` son `null` (el
 * backend omite la clave) hasta que haya una cosecha registrada. A diferencia de
 * `Margen`, acá los `*Ars` no dependen de `Campania.cotizacionVigente` (confirmado
 * contra la API real con una campaña sin cotización cargada): todo este endpoint son
 * costos ya conocidos —cada movimiento ya tiene su propio tipo de cambio congelado—,
 * no una valorización a estimar con la cotización "de hoy".
 *
 * Invariantes que garantiza el backend, dentro de cada moneda:
 * `costoManoObra + costoLaborYServicios == costoTareas`
 * `costoInsumos + costoTareas + costoIndirectos == costoTotal`
 */
export interface DesgloseCostos {
  costoInsumosArs: string;
  costoInsumosUsd: string;
  costoManoObraArs: string;
  costoManoObraUsd: string;
  costoLaborYServiciosArs: string;
  costoLaborYServiciosUsd: string;
  costoIndirectosArs: string;
  costoIndirectosUsd: string;
  costoTareasArs: string;
  costoTareasUsd: string;
  costoTotalArs: string;
  costoTotalUsd: string;
  costoPorHaArs: string;
  costoPorHaUsd: string;
  superficieSembradaHa: string;
  pctInsumos: string;
  pctManoObra: string;
  pctLaborYServicios: string;
  pctIndirectos: string;
  costoPorUnidadArs: string | null;
  costoPorUnidadUsd: string | null;
  rendimientoPorHa: string | null;
  tasaDescarte: string | null;
}
