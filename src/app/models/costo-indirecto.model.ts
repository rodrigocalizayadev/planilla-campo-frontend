import type { Monto, MontoRequest } from './monto.model';

/**
 * `POST/GET /api/campanias/{campaniaId}/costos-indirectos` (docs/plan-frontend.md
 * slice 6, docs/reglas-calculo.md §4). Shape confirmado por bisección directa contra el
 * backend real (usuario ADMIN), mismo método que todos los slices anteriores —
 * `docs/api-endpoints.md` solo documentaba los tres endpoints a alto nivel, sin JSON.
 *
 * Dos formas de imputación (docs/reglas-calculo.md §4.1), confirmadas contra la API:
 * - **Directa**: el request lleva `loteCampaniaId`. La respuesta la refleja en la raíz
 *   y `partes` viene vacío — el importe completo cae en ese lote-campaña, sin repartir.
 * - **A prorratear**: sin `loteCampaniaId`. `criterioProrrateo` define cómo:
 *   - `POR_HA`: el backend reparte solo, `partes` vuelve poblado con una fila por cada
 *     lote-campaña de la campaña.
 *   - `MANUAL`: el request tiene que mandar `partes` con el importe que el usuario
 *     cargó por lote (no hace falta cubrir los cinco lotes, solo los que reciben algo);
 *     el backend valida server-side que sumen exacto el importe total
 *     (`422 PARTES_NO_SUMAN` si no) — la validación del front es solo UX, la del
 *     servidor es la que manda.
 *
 * **`criterioProrrateo` es obligatorio siempre**, incluso con imputación directa
 * (`400 VALIDACION` si falta) — confirmado que el backend simplemente lo ignora en ese
 * caso (no afecta el resultado, `partes` igual vuelve vacío). El front manda `POR_HA`
 * por defecto cuando el usuario elige "a un lote específico", sin mostrarle el selector
 * de criterio en ese caso.
 *
 * `importe` (y el de cada parte) es un `Monto` completo, no un número/string suelto —
 * mismo patrón que terminó teniendo `Tarea.valorUnitario`/`AplicacionInsumo.precioUnitario`
 * pese a no parecerlo al principio. No hay `PUT` documentado ni encontrado: sin edición,
 * solo alta y baja (`DELETE .../costos-indirectos/{id}`, sólo si la campaña no está
 * cerrada).
 */
export interface CostoIndirectoParte {
  id: number;
  loteCampaniaId: number;
  importe: Monto;
}

export interface CostoIndirecto {
  id: number;
  campaniaId: number;
  loteCampaniaId?: number;
  concepto: string;
  fecha: string;
  criterioProrrateo: string;
  importe: Monto;
  partes: CostoIndirectoParte[];
}

export interface CostoIndirectoParteRequest {
  loteCampaniaId: number;
  importe: MontoRequest;
}

export interface CostoIndirectoRequest {
  concepto: string;
  fecha: string;
  importe: MontoRequest;
  criterioProrrateo: string;
  loteCampaniaId?: number;
  partes?: CostoIndirectoParteRequest[];
}
