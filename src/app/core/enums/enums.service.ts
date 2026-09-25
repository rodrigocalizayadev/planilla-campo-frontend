import { Injectable, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { TokenStorageService } from '../auth/token-storage.service';
import type { MetadataEnums, ValorEnum } from '../../models';

/**
 * Pobla los desplegables desde GET /api/metadata/enums (CLAUDE.md, regla 3): nunca
 * hardcodear listas de enums, se desincronizan cuando el backend agrega un valor.
 * `providedIn: 'root'` + `httpResource` hace que se pida una sola vez por sesión de
 * app y quede cacheado en el signal `enums`.
 *
 * La URL depende del signal de `TokenStorageService.token()`: sin él, `httpResource`
 * no dispara nada (recurso `undefined`). Es necesario porque este servicio se
 * precarga con `provideAppInitializer` (app.config.ts) antes de que exista sesión —
 * sin este guard, la primera solicitud sale sin JWT, el backend responde 401 y el
 * recurso queda en estado de error para siempre: ningún desplegable de la app vuelve
 * a poblarse después del login, porque la función de la URL nunca cambiaba y
 * `httpResource` no reintentaba solo. Atado al signal, se recalcula solo al loguearse.
 */
@Injectable({ providedIn: 'root' })
export class EnumsService {
  private readonly tokenStorage = inject(TokenStorageService);

  private readonly recurso = httpResource<MetadataEnums>(() =>
    this.tokenStorage.token() ? `${environment.apiBaseUrl}/metadata/enums` : undefined,
  );

  readonly enums = this.recurso.value;
  readonly cargando = this.recurso.isLoading;
  readonly error = this.recurso.error;

  opciones(clave: keyof MetadataEnums): ValorEnum[] {
    return this.enums()?.[clave] ?? [];
  }

  etiqueta(clave: keyof MetadataEnums, valor: string): string {
    return this.opciones(clave).find((opcion) => opcion.valor === valor)?.etiqueta ?? valor;
  }
}
