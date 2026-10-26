import type { Monto, MontoRequest } from './monto.model';

/**
 * Elemento de GET /api/ventas/{id}/liquidaciones (`Page<LiquidacionTramo>`). Solo existe
 * en ventas `CONSIGNACION`: cada tramo liquida una parte de las unidades entregadas, a
 * su propio precio. `importeNeto` lo calcula el backend; el front no lo recalcula.
 * Los tres gastos son opcionales.
 */
export interface LiquidacionTramo {
  id: number;
  ventaId: number;
  fecha: string;
  cantidad: string;
  precioUnitario: Monto;
  comision: Monto | null;
  flete: Monto | null;
  otrosGastos: Monto | null;
  importeNeto: Monto;
}

/**
 * Payload de POST /api/ventas/{id}/liquidaciones. No confundir con `LiquidacionRequest`
 * (PATCH /api/ventas/{id}/liquidacion), el atajo que liquida de una vez todo lo
 * pendiente. Los gastos se omiten si no se cargan.
 */
export interface LiquidacionTramoRequest {
  fecha: string;
  cantidad: string;
  precioUnitario: MontoRequest;
  comision?: MontoRequest;
  flete?: MontoRequest;
  otrosGastos?: MontoRequest;
}
