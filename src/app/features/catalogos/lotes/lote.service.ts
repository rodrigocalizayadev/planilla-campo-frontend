import { Injectable } from '@angular/core';
import { CatalogoBaseService } from '../../../shared/data/catalogo-base.service';
import type { Lote, LoteRequest } from '../../../models';

/** CRUD de /api/lotes (docs/api-endpoints.md §Lotes). */
@Injectable({ providedIn: 'root' })
export class LoteService extends CatalogoBaseService<Lote, LoteRequest> {
  protected readonly recurso = 'lotes';
}
