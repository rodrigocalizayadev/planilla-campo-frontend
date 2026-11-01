import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  AplicacionInsumo,
  AplicacionInsumoRequest,
  CobroRequest,
  Cosecha,
  CosechaRequest,
  DesgloseCostos,
  LiquidacionRequest,
  LiquidacionTramoRequest,
  LoteCampania,
  LoteCampaniaRequest,
  Margen,
  Tarea,
  TareaRequest,
  Venta,
  VentaRequest,
} from '../../models';

/**
 * Alta de lote-campaña ("sembrar un lote", docs/plan-frontend.md slice 3):
 * `POST /api/campanias/{id}/lote-campanias`. Slice 4 ("la pantalla central") suma los
 * métodos del detalle: costos, margen, alta de tarea y de aplicación de insumo. Slice 5
 * suma cosecha, venta y liquidación; `actualizarCosecha`/`eliminarCosecha` y
 * `actualizarVenta`/`eliminarVenta` se sumaron después, cuando el backend agregó esos
 * cuatro endpoints a pedido del equipo (`docs/resumen-slices.md`, slice 5, segunda
 * vuelta). Sin método `obtener(id)`: `GET
 * /api/lote-campanias/{id}` no existe (confirmado por bisección contra el backend real,
 * devuelve `401` vacío igual que cualquier ruta no mapeada) — el detalle busca el
 * `LoteCampania` dentro de la lista de la campaña activa (`GET
 * /campanias/{id}/lote-campanias`, ya usada por el tablero), no hay endpoint propio por
 * id.
 */
@Injectable({ providedIn: 'root' })
export class LoteCampaniaService {
  private readonly http = inject(HttpClient);

  crear(campaniaId: number, payload: LoteCampaniaRequest): Observable<LoteCampania> {
    return this.http.post<LoteCampania>(
      `${environment.apiBaseUrl}/campanias/${campaniaId}/lote-campanias`,
      payload,
    );
  }

  costos(loteCampaniaId: number): Observable<DesgloseCostos> {
    return this.http.get<DesgloseCostos>(
      `${environment.apiBaseUrl}/lote-campanias/${loteCampaniaId}/costos`,
    );
  }

  margen(loteCampaniaId: number): Observable<Margen> {
    return this.http.get<Margen>(
      `${environment.apiBaseUrl}/lote-campanias/${loteCampaniaId}/margen`,
    );
  }

  crearTarea(loteCampaniaId: number, payload: TareaRequest): Observable<Tarea> {
    return this.http.post<Tarea>(
      `${environment.apiBaseUrl}/lote-campanias/${loteCampaniaId}/tareas`,
      payload,
    );
  }

  crearAplicacion(
    loteCampaniaId: number,
    payload: AplicacionInsumoRequest,
  ): Observable<AplicacionInsumo> {
    return this.http.post<AplicacionInsumo>(
      `${environment.apiBaseUrl}/lote-campanias/${loteCampaniaId}/aplicaciones`,
      payload,
    );
  }

  crearCosecha(loteCampaniaId: number, payload: CosechaRequest): Observable<Cosecha> {
    return this.http.post<Cosecha>(
      `${environment.apiBaseUrl}/lote-campanias/${loteCampaniaId}/cosechas`,
      payload,
    );
  }

  actualizarCosecha(
    loteCampaniaId: number,
    cosechaId: number,
    payload: CosechaRequest,
  ): Observable<Cosecha> {
    return this.http.put<Cosecha>(
      `${environment.apiBaseUrl}/lote-campanias/${loteCampaniaId}/cosechas/${cosechaId}`,
      payload,
    );
  }

  eliminarCosecha(loteCampaniaId: number, cosechaId: number): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiBaseUrl}/lote-campanias/${loteCampaniaId}/cosechas/${cosechaId}`,
    );
  }

  crearVenta(loteCampaniaId: number, payload: VentaRequest): Observable<Venta> {
    return this.http.post<Venta>(
      `${environment.apiBaseUrl}/lote-campanias/${loteCampaniaId}/ventas`,
      payload,
    );
  }

  // No cuelgan de /lote-campanias/{id}/...: el backend identifica la venta por su
  // propio id, no por el lote-campaña (mismo caso que liquidarVenta abajo).
  actualizarVenta(ventaId: number, payload: VentaRequest): Observable<Venta> {
    return this.http.put<Venta>(`${environment.apiBaseUrl}/ventas/${ventaId}`, payload);
  }

  eliminarVenta(ventaId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiBaseUrl}/ventas/${ventaId}`);
  }

  // No cuelga de /lote-campanias/{id}/...: el backend identifica la venta a liquidar
  // por su propio id (`PATCH /api/ventas/{id}/liquidacion`), no por el lote-campaña.
  liquidarVenta(ventaId: number, payload: LiquidacionRequest): Observable<Venta> {
    return this.http.patch<Venta>(`${environment.apiBaseUrl}/ventas/${ventaId}/liquidacion`, payload);
  }

  // Cobros (`PRECIO_CERRADO`) y tramos de liquidación (`CONSIGNACION`): las cuatro
  // escrituras devuelven la `Venta` actualizada, así que el llamador la usa para
  // refrescar la pantalla sin volver a pedirla. Los DELETE son 200 con `Venta`, no 204.
  // El listado de cobros/tramos lo pide el modal con `httpResource`.
  registrarCobro(ventaId: number, payload: CobroRequest): Observable<Venta> {
    return this.http.post<Venta>(`${environment.apiBaseUrl}/ventas/${ventaId}/cobros`, payload);
  }

  eliminarCobro(cobroId: number): Observable<Venta> {
    return this.http.delete<Venta>(`${environment.apiBaseUrl}/cobros/${cobroId}`);
  }

  registrarTramo(ventaId: number, payload: LiquidacionTramoRequest): Observable<Venta> {
    return this.http.post<Venta>(`${environment.apiBaseUrl}/ventas/${ventaId}/liquidaciones`, payload);
  }

  eliminarTramo(tramoId: number): Observable<Venta> {
    return this.http.delete<Venta>(`${environment.apiBaseUrl}/liquidaciones/${tramoId}`);
  }
}
