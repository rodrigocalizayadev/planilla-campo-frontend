/**
 * Value object `Monto` (docs/dominio.md §11): todo importe multimoneda que se congela
 * en un movimiento (hoy, el precio de referencia de insumo; más adelante aplicaciones y
 * ventas) viaja envuelto en este objeto, no como un número/string suelto.
 *
 * `importe` y `tipoCambio` son **string JSON** (regla general de CLAUDE.md §1: todo
 * `BigDecimal` del backend viaja como string, request y response, sin excepciones —
 * el backend unificó esto vía configuración global de Jackson). No hacer aritmética
 * sobre estos valores en el front más allá de mostrarlos: siguen siendo valores que
 * persiste y calcula el backend.
 *
 * `tipoCambio` es **obligatorio siempre**, incluso en `ARS` (el backend lo rechaza si
 * falta, sin importar la moneda) — no hay forma de omitirlo ni de mandar `null`.
 * `importeUsd`/`importeArs` solo vienen en las respuestas, ya calculados por el
 * backend; nunca se mandan en un request.
 *
 * **No es el mismo shape que `Cultivo.precioReferenciaPrimera`/`Segunda`** — ver
 * `PrecioReferencia` más abajo. La diferencia es real, no un simple recorte de campos:
 * el precio de insumo se congela con `tipoCambio` en el momento de la aplicación (no se
 * recalcula nunca más), mientras que el precio de referencia de cultivo se convierte a
 * dólares en el momento de calcular el margen estimado, usando la cotización vigente de
 * la campaña — por eso no necesita (ni acepta) un `tipoCambio` propio.
 */
export interface Monto {
  importe: string;
  moneda: 'ARS' | 'USD';
  tipoCambio: string;
  importeUsd?: string;
  /** Confirmado contra la API real (docs/plan-frontend.md slice 3, segunda vuelta):
   * el backend ahora también devuelve el equivalente en pesos junto al de dólares. */
  importeArs?: string;
}

/** Payload al mandar un `Monto` en un request: sin `importeUsd`/`importeArs`, los calcula el backend. */
export interface MontoRequest {
  importe: string;
  moneda: 'ARS' | 'USD';
  tipoCambio: string;
}

/**
 * `Cultivo.precioReferenciaPrimera`/`Segunda` (docs/dominio.md §11): confirmado contra
 * la API real que **dejó de ser un `Monto` completo** — el backend ya no acepta ni
 * devuelve `tipoCambio` ni `importeUsd`/`importeArs` para estos dos campos
 * específicamente (mandarlos no rompe el request, pero se ignoran en silencio).
 *
 * La razón es de dominio, no un simple recorte de shape: este precio nunca se congela
 * (docs/reglas-calculo.md §6), se usa para valorizar stock y entregas sin liquidar
 * en el momento de calcular el margen estimado, convertido con
 * `Campania.cotizacionVigente` — no con un tipo de cambio propio del cultivo. Mismo
 * shape para mandar que para recibir: no hace falta un tipo `*Request` separado.
 */
export interface PrecioReferencia {
  importe: string;
  moneda: 'ARS' | 'USD';
}
