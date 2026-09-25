/**
 * GET /api/campanias/{id}. Shape confirmado por bisección contra el backend real con
 * usuario ADMIN (docs/plan-frontend.md slice 3): `fechaInicio`/`fechaFin` (`LocalDate`
 * ISO) y `gastosComercializacionEstimados` son obligatorios en el alta — este último es
 * el parámetro de docs/reglas-calculo.md §6 (fracción 0–1, no porcentaje 0–100; el
 * backend rechaza `> 1.0000`) que valoriza stock y entregas sin liquidar al calcular el
 * margen estimado de cada lote-campaña. Viaja como string JSON (CLAUDE.md regla 1:
 * todo `BigDecimal` viaja como string, sin excepciones).
 *
 * No existe baja lógica para campaña (no hay campo `activo`): el ciclo de vida se
 * gobierna con `estado` (`EstadoCampania`: PLANIFICADA → EN_CURSO → CERRADA).
 * `PATCH /{id}/cerrar` fuerza CERRADA sin importar el estado previo, y (confirmado
 * contra el backend real) `PATCH /{id}/estado` no bloquea volver de CERRADA a EN_CURSO
 * — el invariante de docs/dominio.md §14 ("CERRADA no admite nuevos movimientos") lo
 * garantiza el backend en los endpoints de movimientos, no en la transición de estado.
 *
 * **`cotizacionVigente`** (sumado en docs/plan-frontend.md slice 3, segunda vuelta,
 * a pedido del equipo de backend): el tipo de cambio que la campaña usa para convertir
 * a pesos los importes en dólares de `DesgloseCostos`/`Margen`/`ResumenCampania`
 * (los campos `*Ars`). Se omite (no `null`) cuando no se cargó — confirmado contra la
 * API real. `GET /lote-campanias/{id}/margen` acepta además un query param
 * `cotizacionActual` que pisa este valor sin persistir nada, para cotizar "¿y si hoy
 * estuviera a X?" sin tener que editar la campaña.
 */
export interface Campania {
  id: number;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  estado: string;
  gastosComercializacionEstimados: string;
  cotizacionVigente?: string;
  createdAt: string;
  updatedAt: string;
}

/** Payload de POST/PUT /api/campanias. `gastosComercializacionEstimados` y `cotizacionVigente` viajan como string decimal (ej. "0.12", "1200.50"), igual que el resto de los campos numéricos de request en la app. `cotizacionVigente` es opcional: `null`/omitido para no cargar cotización todavía. */
export interface CampaniaRequest {
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  gastosComercializacionEstimados: string;
  cotizacionVigente: string | null;
}

/** Payload de PATCH /api/campanias/{id}/estado. */
export interface CambioEstadoRequest {
  estado: string;
}
