import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TokenStorageService } from './token-storage.service';
import { UsuarioActualService } from './usuario-actual.service';
import { CampaniaActivaService } from '../campania/campania-activa.service';
import type { JwtResponse, LoginRequest, Usuario } from '../../models';

/**
 * Login, sesión (`GET /api/auth/me`) y logout (docs/api-endpoints.md §Autenticación).
 * Guarda el JWT vía `TokenStorageService` y puebla el signal de `UsuarioActualService`
 * que lee el resto de la app (layout, guard).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly usuarioActual = inject(UsuarioActualService);
  private readonly campaniaActiva = inject(CampaniaActivaService);

  login(credenciales: LoginRequest): Observable<Usuario> {
    return this.http
      .post<JwtResponse>(`${environment.apiBaseUrl}/auth/login`, credenciales)
      .pipe(
        switchMap(({ token }) => {
          this.tokenStorage.guardar(token);
          return this.cargarUsuarioActual();
        }),
      );
  }

  cargarUsuarioActual(): Observable<Usuario> {
    return this.http
      .get<Usuario>(`${environment.apiBaseUrl}/auth/me`)
      .pipe(tap((usuario) => this.usuarioActual.establecer(usuario)));
  }

  salir(): void {
    this.tokenStorage.limpiar();
    this.usuarioActual.establecer(null);
    this.campaniaActiva.limpiar();
  }
}
