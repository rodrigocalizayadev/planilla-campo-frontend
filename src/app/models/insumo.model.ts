import type { Monto, MontoRequest } from './monto.model';

/**
 * GET /api/insumos/{id}. Shape confirmado a mano contra el backend real con usuario
 * ADMIN (ver docs/resumen-slices.md, slice 2): `tipo` es el valor del enum `tipoInsumo`,
 * `unidadMedida` el de `unidadMedida` (GET /api/metadata/enums). No hay un campo
 * `moneda` suelto — la moneda vive adentro de `precioReferencia` (`Monto`).
 * `precioReferencia` es solo para autocompletar el formulario de aplicación
 * (CLAUDE.md regla 1, docs/dominio.md §8): nunca se recalcula un costo histórico
 * leyendo este valor.
 */
export interface Insumo {
  id: number;
  nombre: string;
  tipo: string;
  unidadMedida: string;
  precioReferencia: Monto | null;
  activo: boolean;
}

/** Payload de POST/PUT /api/insumos. */
export interface InsumoRequest {
  nombre: string;
  tipo: string;
  unidadMedida: string;
  precioReferencia: MontoRequest | null;
}
