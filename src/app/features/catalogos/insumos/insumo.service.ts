import { Injectable } from '@angular/core';
import { CatalogoBaseService } from '../../../shared/data/catalogo-base.service';
import type { Insumo, InsumoRequest } from '../../../models';

/** CRUD de /api/insumos (docs/api-endpoints.md §Insumos). */
@Injectable({ providedIn: 'root' })
export class InsumoService extends CatalogoBaseService<Insumo, InsumoRequest> {
  protected readonly recurso = 'insumos';
}
