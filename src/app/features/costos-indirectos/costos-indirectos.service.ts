import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { CostoIndirecto, CostoIndirectoRequest } from '../../models';

/**
 * `/api/campanias/{campaniaId}/costos-indirectos` (docs/plan-frontend.md slice 6).
 * Sin `actualizar()`: no hay `PUT` documentado ni encontrado por bisección — solo alta
 * y baja. `eliminar()` solo funciona si la campaña no está cerrada
 * (docs/api-endpoints.md), igual que el resto de los movimientos.
 */
@Injectable({ providedIn: 'root' })
export class CostosIndirectosService {
  private readonly http = inject(HttpClient);

  private url(campaniaId: number, sufijo = ''): string {
    return `${environment.apiBaseUrl}/campanias/${campaniaId}/costos-indirectos${sufijo}`;
  }

  crear(campaniaId: number, payload: CostoIndirectoRequest): Observable<CostoIndirecto> {
    return this.http.post<CostoIndirecto>(this.url(campaniaId), payload);
  }

  eliminar(campaniaId: number, costoId: number): Observable<void> {
    return this.http.delete<void>(this.url(campaniaId, `/${costoId}`));
  }
}
