/**
 * GET /api/compradores/{id}. Shape confirmado a mano contra el backend real (ver
 * docs/resumen-slices.md, slice 2): es opcional y se omite del JSON si no se cargó, así
 * que puede llegar `undefined` además de `null`. `modalidadHabitual` reusa el enum
 * `modalidadVenta` (PRECIO_CERRADO | CONSIGNACION) que ya expone GET /api/metadata/enums,
 * en vez de inventar un campo booleano aparte.
 *
 * **Nunca mandar `""` en `modalidadHabitual`**: el backend intenta deserializarlo como
 * el enum `ModalidadVenta` y una `HttpMessageNotReadableException` en ese punto responde
 * `401` con cuerpo vacío (no `400` con el `ErrorResponse` habitual) — un bug del backend
 * a evitar mandando siempre `null` cuando el campo queda sin elegir.
 */
export interface Comprador {
  id: number;
  nombre: string;
  cuit: string | null;
  contacto: string | null;
  telefono: string | null;
  localidad: string | null;
  modalidadHabitual: string | null;
  activo: boolean;
}

/** Payload de POST/PUT /api/compradores. */
export interface CompradorRequest {
  nombre: string;
  cuit: string | null;
  contacto: string | null;
  telefono: string | null;
  localidad: string | null;
  modalidadHabitual: string | null;
}
