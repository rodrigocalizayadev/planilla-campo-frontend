import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';
import { TokenStorageService } from './token-storage.service';
import { UsuarioActualService } from './usuario-actual.service';

/**
 * Protege las rutas detrás del `Shell`. Sin token, redirige a login. Con token pero
 * sin usuario cargado (por ejemplo tras refrescar la página), pide `GET /api/auth/me`
 * antes de dejar pasar; si el token venció, el interceptor de errores ya lo limpió y
 * acá se redirige a login sin dejar la app en un estado roto (CLAUDE.md, aceptación).
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const tokenStorage = inject(TokenStorageService);
  const usuarioActual = inject(UsuarioActualService);
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!tokenStorage.token()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }

  if (usuarioActual.usuario()) {
    return true;
  }

  return authService.cargarUsuarioActual().pipe(
    map(() => true),
    catchError(() =>
      of(router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } })),
    ),
  );
};
