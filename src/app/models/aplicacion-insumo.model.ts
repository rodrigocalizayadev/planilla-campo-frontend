import type { Monto, MontoRequest } from './monto.model';

/**
 * GET (vía movimientos)/POST /api/lote-campanias/{id}/aplicaciones. Shape confirmado
 * por bisección directa contra el backend real (docs/plan-frontend.md slice 4):
 * `precioUnitario` es un `Monto` completo, igual que `Insumo.precioReferencia` —
 * congelado en la aplicación (docs/dominio.md §8), nunca se recalcula leyendo el
 * catálogo después. `unidadMedida` es un campo propio de la aplicación (el enum
 * `unidadMedida`, no el del insumo): permite cargar en una unidad distinta a la que
 * el insumo usa por defecto (ej. aplicar en toneladas un insumo cuyo catálogo lo
 * referencia en kg). `costoTotal` lo calcula el backend (`cantidad × precioUnitario`,
 * docs/reglas-calculo.md §2) y es lo único que se persiste; el total en vivo del
 * formulario es solo una previsualización.
 */
export interface AplicacionInsumo {
  id: number;
  loteCampaniaId: number;
  insumoId: number;
  insumoNombre: string;
  fecha: string;
  cantidad: string;
  unidadMedida: string;
  precioUnitario: Monto;
  costoTotal: Monto;
  createdAt: string;
  updatedAt: string;
}

/** Payload de POST /api/lote-campanias/{id}/aplicaciones, shape confirmado por bisección. */
export interface AplicacionInsumoRequest {
  insumoId: number;
  fecha: string;
  cantidad: string;
  unidadMedida: string;
  precioUnitario: MontoRequest;
}
