/**
 * GET/POST /api/lote-campanias/{id}/cosechas. Shape confirmado por bisección directa
 * contra el backend real (docs/plan-frontend.md slice 5), reemplazando los campos
 * inferidos de slice 4:
 *
 * - El campo del número de corte es **`numeroCorte`, no `corte`** (`corte` a secas
 *   devolvía siempre `400 CUERPO_INVALIDO`, el mismo catch-all que malformed JSON —
 *   confirmado que ese código también cubre nombres de campo no reconocidos, no solo
 *   JSON roto).
 * - **`kgEquivalente` no se manda en el alta: lo calcula el backend** a partir de
 *   `cantidad × Cultivo.kgPorUnidad`. Si el cultivo no tiene `kgPorUnidad` configurado,
 *   el alta falla con `422 KG_POR_UNIDAD_NO_CONFIGURADO` — error de negocio real, no de
 *   shape, que el formulario tiene que mostrar tal cual (`error.message`).
 * - La respuesta agrega `unidad` (la `unidadProduccion` del lote-campaña, ej. `"BOLSA"`),
 *   que tampoco se manda en el request.
 *
 * `cantidad` y `kgEquivalente` son string JSON (CLAUDE.md regla 1: todo `BigDecimal`
 * viaja como string, sin excepciones).
 */
export interface Cosecha {
  id: number;
  loteCampaniaId: number;
  fecha: string;
  numeroCorte: number;
  calidad: string;
  cantidad: string;
  unidad: string;
  kgEquivalente: string;
}

/** Payload de POST /api/lote-campanias/{id}/cosechas, shape confirmado por bisección. */
export interface CosechaRequest {
  fecha: string;
  numeroCorte: number;
  calidad: string;
  cantidad: string;
}
