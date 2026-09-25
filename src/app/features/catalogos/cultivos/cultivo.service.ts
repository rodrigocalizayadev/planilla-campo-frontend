import { Injectable } from '@angular/core';
import { CatalogoBaseService } from '../../../shared/data/catalogo-base.service';
import type { Cultivo, CultivoRequest } from '../../../models';

/** CRUD de /api/cultivos (docs/api-endpoints.md §Cultivos). */
@Injectable({ providedIn: 'root' })
export class CultivoService extends CatalogoBaseService<Cultivo, CultivoRequest> {
  protected readonly recurso = 'cultivos';
}
