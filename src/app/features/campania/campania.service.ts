import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { Campania, CampaniaRequest } from '../../models';

/**
 * CRUD de /api/campanias (docs/api-endpoints.md §Campañas). No extiende
 * `CatalogoBaseService`: campaña no tiene baja lógica ni reactivación, su ciclo de
 * vida se gobierna con `estado` (`PATCH .../estado`) y el cierre irreversible-en-la-UI
 * `PATCH .../cerrar` (confirmado que el backend no lo bloquea a nivel de transición,
 * solo a nivel de movimientos — ver el comentario de `Campania`).
 *
 * `actualizar()` (PUT) hoy solo lo usa la edición inline de `cotizacionVigente` en el
 * tablero (docs/plan-frontend.md slice 3, tercera vuelta) — el backend exige el
 * `CampaniaRequest` completo, no un PATCH parcial, así que quien llame tiene que
 * mandar de nuevo nombre/fechas/gastos junto con el campo que cambió.
 */
@Injectable({ providedIn: 'root' })
export class CampaniaService {
  private readonly http = inject(HttpClient);

  private url(sufijo = ''): string {
    return `${environment.apiBaseUrl}/campanias${sufijo}`;
  }

  crear(payload: CampaniaRequest): Observable<Campania> {
    return this.http.post<Campania>(this.url(), payload);
  }

  actualizar(id: number, payload: CampaniaRequest): Observable<Campania> {
    return this.http.put<Campania>(this.url(`/${id}`), payload);
  }

  cambiarEstado(id: number, estado: string): Observable<Campania> {
    return this.http.patch<Campania>(this.url(`/${id}/estado`), { estado });
  }

  cerrar(id: number): Observable<Campania> {
    return this.http.patch<Campania>(this.url(`/${id}/cerrar`), null);
  }
}
