import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CatalogoBaseService } from '../../../shared/data/catalogo-base.service';
import type { Comprador, CompradorRequest, CompradorSaldo } from '../../../models';

/** CRUD de /api/compradores (docs/api-endpoints.md §Compradores) y su saldo. */
@Injectable({ providedIn: 'root' })
export class CompradorService extends CatalogoBaseService<Comprador, CompradorRequest> {
  protected readonly recurso = 'compradores';

  /** `GET /api/compradores/{id}/saldo`: lo que debe en ARS y las unidades sin liquidar. */
  saldo(compradorId: number): Observable<CompradorSaldo> {
    return this.http.get<CompradorSaldo>(`${environment.apiBaseUrl}/compradores/${compradorId}/saldo`);
  }
}
