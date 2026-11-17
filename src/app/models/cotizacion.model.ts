/**
 * `CotizacionResponse` de `GET /api/cotizaciones/dolar` (docs/api-endpoints-v2.md §16):
 * cotización del dólar BCRA (BNA vendedor divisa) **sugerida** para autocompletar un
 * `tipoCambio`. El backend no lo rellena: el front lo sigue mandando en cada request.
 *
 * `valor` es ARS por USD, `BigDecimal` → string JSON con 4 decimales (`"1543.5000"`,
 * confirmado contra el backend real), la misma escala que `tipoCambio` (`DECIMAL(12,4)`):
 * se copia tal cual al formulario, sin pasar por `Number`.
 *
 * `fechaCotizacion` puede ser anterior a `fechaSolicitada` (fin de semana, feriado o
 * cierre del día aún no publicado). Ambas son `LocalDate` ISO: se muestran con
 * `FechaPipe`, nunca con `new Date` (CLAUDE.md regla 2).
 */
export interface CotizacionResponse {
  fechaSolicitada: string;
  fechaCotizacion: string;
  valor: string;
  fuente: string;
}
