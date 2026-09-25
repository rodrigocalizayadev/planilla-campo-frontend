import { Injectable } from '@angular/core';
import { CatalogoBaseService } from '../../../shared/data/catalogo-base.service';
import type { Comprador, CompradorRequest } from '../../../models';

/** CRUD de /api/compradores (docs/api-endpoints.md §Compradores). */
@Injectable({ providedIn: 'root' })
export class CompradorService extends CatalogoBaseService<Comprador, CompradorRequest> {
  protected readonly recurso = 'compradores';
}
