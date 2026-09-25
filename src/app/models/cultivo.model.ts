import type { PrecioReferencia } from './monto.model';

/**
 * GET /api/cultivos/{id}. Shape confirmado a mano contra el backend real con usuario
 * ADMIN (ver docs/resumen-slices.md, slice 2): `nombre`, `unidadProduccionDefault`
 * (el enum `unidadProduccion` de GET /api/metadata/enums), `nombreSingular`,
 * `nombrePlural` y `kgPorUnidad`. Los nombres reales difieren de los que sugiere el
 * prototipo/dominio.md — no son `unidadProduccion`, `unidadSingular` ni `unidadPlural`.
 *
 * `precioReferenciaPrimera`/`precioReferenciaSegunda` son `PrecioReferencia`
 * (`monto.model.ts`) — **no** `Monto` completo: confirmado contra la API real
 * (docs/plan-frontend.md slice 3, segunda vuelta) que el backend dejó de aceptar y
 * devolver `tipoCambio`/`importeUsd` para estos dos campos específicamente. **No
 * existe** un campo `fechaActualizacionPrecio`: estaba inferido de
 * docs/reglas-calculo.md sin confirmar y el backend real no lo tiene.
 *
 * Los precios de referencia NO se congelan (excepción a CLAUDE.md regla 1, ver
 * docs/reglas-calculo.md §6): valorizan stock y entregas sin liquidar al momento de
 * calcular el margen estimado, convertidos con `Campania.cotizacionVigente`.
 */
export interface Cultivo {
  id: number;
  nombre: string;
  unidadProduccionDefault: string;
  nombreSingular: string;
  nombrePlural: string;
  kgPorUnidad: string | null;
  precioReferenciaPrimera: PrecioReferencia | null;
  precioReferenciaSegunda: PrecioReferencia | null;
  activo: boolean;
}

/** Payload de POST/PUT /api/cultivos. */
export interface CultivoRequest {
  nombre: string;
  unidadProduccionDefault: string;
  nombreSingular: string;
  nombrePlural: string;
  kgPorUnidad: string | null;
  precioReferenciaPrimera: PrecioReferencia | null;
  precioReferenciaSegunda: PrecioReferencia | null;
}
