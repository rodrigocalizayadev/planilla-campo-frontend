import type { Monto, MontoRequest } from './monto.model';

/**
 * GET/POST /api/lote-campanias/{id}/ventas y PATCH /api/ventas/{id}/liquidacion. Shape
 * confirmado por bisección directa contra el backend real (docs/plan-frontend.md
 * slice 5), reemplazando los campos inferidos de slice 4:
 *
 * - La modalidad viaja en el campo **`modalidad`, no `modalidadVenta`**, y la fecha de
 *   entrega en **`fechaEntrega`, no `fecha`** (`docs/dominio.md` §10). Ambos nombres
 *   "razonables" devolvían `400 CUERPO_INVALIDO` hasta encontrar el real, mismo patrón
 *   de bisección por nombre de campo que `Cosecha.numeroCorte`.
 * - **`precioUnitario`, `comision`, `flete` y `otrosGastos` son `Monto` completo**
 *   (`{ importe, moneda, tipoCambio }`), no números sueltos — mismo value object que
 *   `Tarea.valorUnitario`/`AplicacionInsumo.precioUnitario`. Los cuatro son opcionales:
 *   `precioUnitario` es obligatorio en el alta solo si `modalidad = PRECIO_CERRADO`
 *   (`422 PRECIO_UNITARIO_REQUERIDO` si falta) y se persiste `null`/se omite en
 *   consignación hasta la liquidación; `comision`/`flete`/`otrosGastos` son opcionales
 *   siempre, en el alta y en la liquidación por igual (confirmado que el backend los
 *   acepta en ambos endpoints).
 * - El backend rechaza vender `DESCARTE` (`422 CALIDAD_DESCARTE_NO_VENDIBLE`,
 *   `docs/dominio.md` §9) y vender más que el stock disponible de la calidad
 *   (`422 STOCK_INSUFICIENTE`, `docs/dominio.md` invariante 5) — el frontend valida los
 *   dos casos también en el cliente (mejor UX a pie de lote), pero el backend es la
 *   fuente de verdad final.
 * - `importeNeto` (`docs/reglas-calculo.md` §6.1) lo calcula el backend
 *   (`importeBruto − comision − flete − otrosGastos`); el front nunca lo recalcula.
 *
 * **Cobros y tramos** (`docs/api-endpoints-v2.md`, sumado cuando el backend agregó
 * `POST /api/ventas/{id}/cobros` y `/liquidaciones`): el mecanismo de pago lo define
 * `modalidad`, nunca el cultivo.
 * - `PRECIO_CERRADO` se paga con **cobros**: `estadoCobro` (`PENDIENTE`/`PARCIAL`/
 *   `COBRADA`) y `saldoArs` (`importeNeto.importeArs − cobradoArs`). Ambos vienen
 *   ausentes o `null` en consignación.
 * - `CONSIGNACION` se paga con **tramos de liquidación**: `cantidadPendiente`
 *   (`cantidad − cantidadLiquidada`), ausente en precio cerrado. `estado` suma `PARCIAL`
 *   (liquidada en parte); ahí `importeNeto` es un **acumulado parcial**, no un valor
 *   final, y `precioUnitario`/`comision`/`flete`/`otrosGastos` vienen ausentes cuando
 *   los liquidaron varios tramos (el precio vive en cada tramo).
 * - `cobradoArs` y `cantidadLiquidada` vienen siempre. Los cobros no mueven el margen.
 */
export interface Venta {
  id: number;
  loteCampaniaId: number;
  compradorId: number;
  compradorNombre: string;
  calidad: string;
  modalidad: string;
  estado: string;
  fechaEntrega: string;
  cantidad: string;
  unidad: string;
  fechaLiquidacion: string | null;
  precioUnitario: Monto | null;
  comision: Monto | null;
  flete: Monto | null;
  otrosGastos: Monto | null;
  importeNeto: Monto | null;
  estadoCobro?: string | null;
  cobradoArs: string;
  saldoArs?: string | null;
  cantidadLiquidada: string;
  cantidadPendiente?: string | null;
}

/**
 * Payload de POST /api/lote-campanias/{id}/ventas. `precioUnitario` solo se manda en
 * `PRECIO_CERRADO` (docs/design-brief.md §6.5: en consignación se entrega sin precio).
 * El backend también acepta `comision`/`flete`/`otrosGastos` en el alta, pero
 * docs/design-brief.md los ubica en el flujo de completar la liquidación, no en la
 * entrega — el formulario de venta no los pide.
 */
export interface VentaRequest {
  compradorId: number;
  fechaEntrega: string;
  calidad: string;
  cantidad: string;
  modalidad: string;
  precioUnitario?: MontoRequest;
}

/** Payload de PATCH /api/ventas/{id}/liquidacion, shape confirmado por bisección. */
export interface LiquidacionRequest {
  precioUnitario: MontoRequest;
  fechaLiquidacion: string;
  comision?: MontoRequest;
  flete?: MontoRequest;
  otrosGastos?: MontoRequest;
}
