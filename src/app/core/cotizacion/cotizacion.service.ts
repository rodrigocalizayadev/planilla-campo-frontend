import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { CotizacionResponse } from '../../models';

/**
 * Tiempo máximo de espera de la cotización. Pasado ese tiempo la consulta cuenta como
 * error: mientras carga, los formularios no dejan guardar un tipo de cambio autocompletado
 * de otra fecha, así que una consulta colgada no puede trabar el guardado.
 */
export const TIEMPO_MAXIMO_COTIZACION_MS = new InjectionToken<number>('TIEMPO_MAXIMO_COTIZACION_MS', {
  providedIn: 'root',
  factory: () => 10_000,
});

/**
 * Cotización del dólar BCRA (BNA vendedor divisa), `GET /api/cotizaciones/dolar`
 * (docs/api-endpoints-v2.md §16). Es solo una **sugerencia**: el backend no rellena
 * `tipoCambio`, el front lo sigue mandando en cada request.
 */
@Injectable({ providedIn: 'root' })
export class CotizacionService {
  private readonly http = inject(HttpClient);

  /**
   * `fecha` es la del movimiento (el tipo de cambio se congela a esa fecha). `null` omite
   * el query param y el backend usa hoy en Argentina — para `cotizacionVigente` de la
   * campaña.
   */
  obtenerDolar(fecha: string | null): Observable<CotizacionResponse> {
    const url = `${environment.apiBaseUrl}/cotizaciones/dolar`;
    return fecha === null
      ? this.http.get<CotizacionResponse>(url)
      : this.http.get<CotizacionResponse>(url, { params: { fecha } });
  }
}
