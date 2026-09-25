import { Injectable, signal } from '@angular/core';

const CLAVE_STORAGE = 'planilla-campo:jwt';

/**
 * Guarda el JWT en localStorage y lo expone como signal para que el interceptor
 * y el guard de rutas lo lean sin volver a tocar el DOM.
 */
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private readonly _token = signal<string | null>(localStorage.getItem(CLAVE_STORAGE));
  readonly token = this._token.asReadonly();

  guardar(token: string): void {
    localStorage.setItem(CLAVE_STORAGE, token);
    this._token.set(token);
  }

  limpiar(): void {
    localStorage.removeItem(CLAVE_STORAGE);
    this._token.set(null);
  }
}
