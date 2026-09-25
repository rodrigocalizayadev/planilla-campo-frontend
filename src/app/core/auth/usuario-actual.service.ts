import { Injectable, signal } from '@angular/core';
import type { Usuario } from '../../models';

/**
 * Usuario autenticado: contexto global de toda la app (CLAUDE.md, Arquitectura).
 * `AuthService` lo puebla desde GET /api/auth/me tras el login y llama
 * `establecer(null)` al salir.
 */
@Injectable({ providedIn: 'root' })
export class UsuarioActualService {
  private readonly _usuario = signal<Usuario | null>(null);
  readonly usuario = this._usuario.asReadonly();

  establecer(usuario: Usuario | null): void {
    this._usuario.set(usuario);
  }
}
