/**
 * GET /api/campanias/{id}/resumen. **Corrección de shape (docs/plan-frontend.md
 * slice 3, segunda vuelta)**: todos los importes ahora vienen duplicados con sufijo
 * `Ars`/`Usd` — antes solo traía `Usd`. String JSON (CLAUDE.md regla 1: todo
 * `BigDecimal` viaja como string, sin excepciones).
 *
 * Los campos `*Ars` de este endpoint no dependen de `cotizacionVigente` de la misma
 * forma que los de `Margen`/`DesgloseCostos`: acá son costos e ingresos ya conocidos
 * (no estimaciones a valorizar), así que siempre vienen presentes en las dos monedas.
 *
 * **Sigue sin traer margen estimado**, ni a nivel campaña ni por lote (solo
 * `margenRealizado*`) — a diferencia de `GET /lote-campanias/{id}/margen`, que sí
 * expone los dos. El tablero lo etiqueta siempre como "Margen realizado" (nunca solo
 * "Margen") para no insinuar que es el único margen del sistema.
 *
 * No incluye `costoPorUnidad` (por bolsa) por lote: solo existe en
 * `GET /lote-campanias/{id}/costos`.
 *
 * `costoPorHaCampaniaArs`/`Usd` ya vienen calculados por el backend sobre los totales
 * de la campaña (docs/reglas-calculo.md §7.1), no promediando el `costoPorHa` de cada
 * lote: el front solo los muestra.
 */
export interface ResumenCampaniaLote {
  loteCampaniaId: number;
  nombreLote: string;
  nombreCultivo: string;
  superficieSembradaHa: string;
  costoInsumosArs: string;
  costoInsumosUsd: string;
  costoTareasArs: string;
  costoTareasUsd: string;
  costoIndirectosArs: string;
  costoIndirectosUsd: string;
  costoTotalArs: string;
  costoTotalUsd: string;
  costoPorHaArs: string;
  costoPorHaUsd: string;
  ingresoRealizadoArs: string;
  ingresoRealizadoUsd: string;
  margenRealizadoArs: string;
  margenRealizadoUsd: string;
}

export interface ResumenCampania {
  campaniaId: number;
  nombreCampania: string;
  lotes: ResumenCampaniaLote[];
  costoTotalCampaniaArs: string;
  costoTotalCampaniaUsd: string;
  superficieTotalHa: string;
  costoPorHaCampaniaArs: string;
  costoPorHaCampaniaUsd: string;
  ingresoRealizadoCampaniaArs: string;
  ingresoRealizadoCampaniaUsd: string;
  margenRealizadoCampaniaArs: string;
  margenRealizadoCampaniaUsd: string;
}
