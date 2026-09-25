import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Los cuatro catálogos (lote, cultivo, insumo, comprador — docs/plan-frontend.md slice 2)
 * comparten exactamente la misma forma de API: crear, actualizar, baja lógica (DELETE) y
 * reactivar (PATCH .../reactivar), documentada igual para las cuatro entidades en
 * docs/api-endpoints.md. Cada servicio concreto solo define `recurso` (el segmento de
 * URL) y hereda los cuatro métodos.
 */
export abstract class CatalogoBaseService<T, TRequest> {
  protected readonly http = inject(HttpClient);
  protected abstract readonly recurso: string;

  private url(sufijo = ''): string {
    return `${environment.apiBaseUrl}/${this.recurso}${sufijo}`;
  }

  crear(payload: TRequest): Observable<T> {
    return this.http.post<T>(this.url(), payload);
  }

  actualizar(id: number, payload: TRequest): Observable<T> {
    return this.http.put<T>(this.url(`/${id}`), payload);
  }

  darDeBaja(id: number): Observable<void> {
    return this.http.delete<void>(this.url(`/${id}`));
  }

  reactivar(id: number): Observable<T> {
    return this.http.patch<T>(this.url(`/${id}/reactivar`), null);
  }
}
