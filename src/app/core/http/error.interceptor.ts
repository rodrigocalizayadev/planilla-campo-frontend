import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { TokenStorageService } from '../auth/token-storage.service';
import type { ErrorResponse } from '../../models';

/**
 * Normaliza cualquier error HTTP al formato `{ timestamp, status, code, message,
 * details[] }` que devuelve el backend (docs/api-endpoints.md), para que el resto
 * de la app trabaje siempre con la misma forma sin importar qué falló. Un 401
 * limpia la sesión; `authGuard` se encarga de redirigir a login.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStorage = inject(TokenStorageService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      if (error.status === 401) {
        tokenStorage.limpiar();
      }

      // status 0 es una falla de red (sin conexión, backend caído, CORS): `error.error`
      // ahí es el `TypeError` nativo del fetch fallido, no el cuerpo JSON del backend.
      // Su `.message` ("Failed to fetch") no debe mostrarse tal cual al usuario.
      const cuerpo = error.status > 0 ? (error.error as Partial<ErrorResponse> | null) : null;
      const normalizado: ErrorResponse = {
        timestamp: cuerpo?.timestamp ?? new Date().toISOString(),
        status: error.status,
        code: cuerpo?.code ?? 'ERROR_DESCONOCIDO',
        message: cuerpo?.message ?? 'No se pudo completar la operación. Probá de nuevo.',
        details: cuerpo?.details ?? [],
      };
      return throwError(() => normalizado);
    }),
  );
};
