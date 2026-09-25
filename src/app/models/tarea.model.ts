import type { Monto, MontoRequest } from './monto.model';

/**
 * GET (vía movimientos)/POST /api/lote-campanias/{id}/tareas. Shape confirmado por
 * bisección directa contra el backend real (docs/plan-frontend.md slice 4): el campo
 * del tipo de tarea es `tipo` (no `tipoTarea`, a diferencia de lo que sugería el
 * dominio antes de confirmar), y **`valorUnitario` es un `Monto` completo**
 * (`{ importe, moneda, tipoCambio }`), no un string suelto — la mano de obra también
 * puede pagarse en dólares, mismo value object que insumo. `costoTotal` lo calcula el
 * backend según `modoCosto` (docs/reglas-calculo.md §3) y es lo único que se muestra
 * después de guardar; el total en vivo del formulario es solo una previsualización.
 *
 * `cantidad` es `null`/ausente en `TOTAL` y `POR_HA` (el backend no la pide: en
 * `POR_HA` resuelve la superficie leyendo el `LoteCampania`, en `TOTAL` no aplica).
 *
 * **No existe campo de nota/comentario** — confirmado enviando `comentario` y `nota`
 * en el alta: ninguno de los dos se persiste ni se devuelve. El prototipo lo tiene
 * (`f.nota`), pero el backend real no lo soporta.
 */
export interface Tarea {
  id: number;
  loteCampaniaId: number;
  tipo: string;
  fecha: string;
  ejecutor: string;
  modoCosto: string;
  cantidad: string | null;
  valorUnitario: Monto;
  costoTotal: Monto;
  createdAt: string;
  updatedAt: string;
}

/** Payload de POST /api/lote-campanias/{id}/tareas, shape confirmado por bisección. */
export interface TareaRequest {
  tipo: string;
  fecha: string;
  ejecutor: string;
  modoCosto: string;
  cantidad: string | null;
  valorUnitario: MontoRequest;
}
